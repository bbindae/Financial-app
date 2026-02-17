import type { VercelRequest, VercelResponse } from '@vercel/node';

let cookie: string | null = null;
let crumb: string | null = null;
let lastAuthTime = 0;
let authPromise: Promise<boolean> | null = null;
const AUTH_TTL = 60 * 60 * 1000; // 1 hour

async function ensureAuth(): Promise<boolean> {
  const now = Date.now();
  if (cookie && crumb && now - lastAuthTime < AUTH_TTL) {
    return true;
  }

  // If another request is already authenticating, wait for it
  if (authPromise) {
    return authPromise;
  }

  authPromise = doAuth();
  try {
    return await authPromise;
  } finally {
    authPromise = null;
  }
}

// Force re-auth (for 401 retries) — mutex-protected, skips if already refreshed
async function forceReauth(failedAuthTime: number): Promise<boolean> {
  // Another request already re-authed since our request was made
  if (lastAuthTime > failedAuthTime) {
    return true;
  }

  // If another request is already re-authenticating, wait for it
  if (authPromise) {
    return authPromise;
  }

  cookie = null;
  crumb = null;
  lastAuthTime = 0;

  authPromise = doAuth();
  try {
    return await authPromise;
  } finally {
    authPromise = null;
  }
}

async function doAuth(): Promise<boolean> {
  try {
    const cookieRes = await fetch('https://fc.yahoo.com/', { redirect: 'manual' });
    const setCookieHeader = cookieRes.headers.get('set-cookie') || '';
    cookie = setCookieHeader;

    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!crumbRes.ok) {
      console.error(`[Yahoo Auth] Failed to get crumb: ${crumbRes.status}`);
      return false;
    }

    crumb = await crumbRes.text();
    lastAuthTime = Date.now();
    console.log('[Yahoo Auth] Successfully obtained cookie + crumb');
    return true;
  } catch (error) {
    console.error('[Yahoo Auth] Authentication failed:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authed = await ensureAuth();
  if (!authed) {
    return res.status(503).json({ error: 'Yahoo Finance authentication failed' });
  }

  // Capture auth time before request so 401 handler can detect if another request already refreshed
  const authTimeBeforeRequest = lastAuthTime;

  // Get symbol from query parameter
  const symbol = req.query.symbol;
  if (!symbol || Array.isArray(symbol)) {
    return res.status(400).json({ error: 'Missing or invalid symbol parameter' });
  }

  // Build query string from remaining query params (exclude 'symbol')
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'symbol') continue;
    if (Array.isArray(value)) {
      value.forEach(v => queryParams.append(key, v));
    } else if (value) {
      queryParams.append(key, value);
    }
  }
  queryParams.append('crumb', crumb!);

  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': cookie!,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // If 401, re-auth once via mutex (deduplicates across parallel requests)
    if (response.status === 401) {
      console.log('[Yahoo Proxy] Got 401, re-authenticating...');
      const retryAuthed = await forceReauth(authTimeBeforeRequest);
      if (retryAuthed) {
        queryParams.set('crumb', crumb!);
        const retryUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?${queryParams.toString()}`;
        const retryRes = await fetch(retryUrl, {
          headers: {
            'Cookie': cookie!,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const retryData = await retryRes.text();
        return res.status(retryRes.status).setHeader('Content-Type', 'application/json').send(retryData);
      }
    }

    const data = await response.text();
    return res.status(response.status).setHeader('Content-Type', 'application/json').send(data);
  } catch (error) {
    console.error('[Yahoo Proxy] Request failed:', error);
    return res.status(502).json({ error: 'Yahoo Finance proxy request failed' });
  }
}
