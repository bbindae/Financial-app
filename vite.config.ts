import { defineConfig, Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import react from '@vitejs/plugin-react'

/**
 * Custom Vite plugin to proxy Yahoo Finance API requests
 * Yahoo Finance requires cookie + crumb authentication
 */
function yahooFinanceProxy(): Plugin {
  let cookie: string | null = null
  let crumb: string | null = null
  let lastAuthTime = 0
  const AUTH_TTL = 60 * 60 * 1000 // Re-auth every 1 hour

  async function ensureAuth(): Promise<boolean> {
    const now = Date.now()
    if (cookie && crumb && now - lastAuthTime < AUTH_TTL) {
      return true
    }

    try {
      // Step 1: Get session cookies from Yahoo
      const cookieRes = await fetch('https://fc.yahoo.com/', { redirect: 'manual' })
      const setCookieHeader = cookieRes.headers.get('set-cookie') || ''
      cookie = setCookieHeader

      // Step 2: Get crumb using the cookie
      const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      if (!crumbRes.ok) {
        console.error(`[Yahoo Auth] Failed to get crumb: ${crumbRes.status}`)
        return false
      }

      crumb = await crumbRes.text()
      lastAuthTime = now
      console.log('[Yahoo Auth] Successfully obtained cookie + crumb')
      return true
    } catch (error) {
      console.error('[Yahoo Auth] Authentication failed:', error)
      return false
    }
  }

  async function proxyRequest(
    baseUrl: string,
    req: IncomingMessage,
    res: ServerResponse
  ) {
    const authed = await ensureAuth()
    if (!authed) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Yahoo Finance authentication failed' }))
      return
    }

    // Parse query params from the request URL
    const parsedUrl = new URL(req.url || '', 'http://localhost')
    const symbol = parsedUrl.searchParams.get('symbol') || ''
    
    // Build Yahoo Finance URL with remaining params
    const yahooParams = new URLSearchParams()
    parsedUrl.searchParams.forEach((value, key) => {
      if (key !== 'symbol') {
        yahooParams.append(key, value)
      }
    })
    yahooParams.append('crumb', encodeURIComponent(crumb!))
    
    const url = `${baseUrl}/${symbol}?${yahooParams.toString()}`

    try {
      const response = await fetch(url, {
        headers: {
          'Cookie': cookie!,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      // If 401, invalidate auth and retry once
      if (response.status === 401) {
        console.log('[Yahoo Proxy] Got 401, re-authenticating...')
        cookie = null
        crumb = null
        lastAuthTime = 0
        const retryAuthed = await ensureAuth()
        if (retryAuthed) {
          const retryUrl = `${baseUrl}${path}${separator}crumb=${encodeURIComponent(crumb!)}`
          const retryRes = await fetch(retryUrl, {
            headers: {
              'Cookie': cookie!,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          })
          const retryData = await retryRes.text()
          res.writeHead(retryRes.status, { 'Content-Type': 'application/json' })
          res.end(retryData)
          return
        }
      }

      const data = await response.text()
      res.writeHead(response.status, { 'Content-Type': 'application/json' })
      res.end(data)
    } catch (error) {
      console.error('[Yahoo Proxy] Request failed:', error)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Yahoo Finance proxy request failed' }))
    }
  }

  return {
    name: 'yahoo-finance-proxy',
    configureServer(server) {
      // Option chain data
      server.middlewares.use('/api/yahoo-options', (req, res) => {
        const path = req.url || ''
        proxyRequest('https://query2.finance.yahoo.com/v7/finance/options', req, res)
      })

      // Chart / closing price data
      server.middlewares.use('/api/yahoo-chart', (req, res) => {
        proxyRequest('https://query2.finance.yahoo.com/v8/finance/chart', req, res)
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), yahooFinanceProxy()],
})
