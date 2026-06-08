import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const upstreamUrl = process.env.STOCK_NEWS_API_URL;
  if (!upstreamUrl) {
    return res.status(500).json({ error: 'STOCK_NEWS_API_URL is not configured' });
  }

  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const payload = await response.text();

    return res.status(response.status).setHeader('Content-Type', contentType).send(payload);
  } catch (error) {
    console.error('[Stock News Proxy] Request failed:', error);
    return res.status(502).json({ error: 'Stock news proxy request failed' });
  }
}
