/**
 * Yahoo Finance Service
 * Uses Yahoo Finance REST API to fetch option prices and historical data
 */

const YAHOO_BASE_URL = '/api/yahoo-chart';
const YAHOO_OPTIONS_URL = '/api/yahoo-options';

interface YahooQuoteResponse {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

class YahooFinanceService {
  private closePriceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
  private optionQuoteCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly OPTION_QUOTE_CACHE_DURATION = 30 * 1000; // 30 seconds

  /**
   * Get the previous closing price for an option symbol
   * @param optionSymbol - Yahoo format option symbol (e.g., "AMD260320P00160000")
   * @returns Previous closing price or null if not available
   */
  async getPreviousClose(optionSymbol: string): Promise<number | null> {
    // Check cache first
    const cached = this.closePriceCache.get(optionSymbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const url = `${YAHOO_BASE_URL}?symbol=${encodeURIComponent(optionSymbol)}&interval=1d&range=5d`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Yahoo Finance API error for ${optionSymbol}: ${response.status}`);
        return null;
      }

      const data: YahooQuoteResponse = await response.json();

      if (data.chart.error) {
        console.warn(`Yahoo Finance error: ${data.chart.error.description}`);
        return null;
      }

      const result = data.chart.result?.[0];
      if (!result) {
        return null;
      }

      // Try to get previous close from meta
      let previousClose = result.meta.previousClose || result.meta.chartPreviousClose;

      // If not in meta, try to get from historical data (second to last close)
      if (!previousClose && result.indicators?.quote?.[0]?.close) {
        const closes = result.indicators.quote[0].close.filter(c => c !== null) as number[];
        if (closes.length >= 2) {
          // Get second to last close (yesterday's close)
          previousClose = closes[closes.length - 2];
        } else if (closes.length === 1) {
          previousClose = closes[0];
        }
      }

      if (previousClose && previousClose > 0) {
        // Cache the result
        this.closePriceCache.set(optionSymbol, {
          price: previousClose,
          timestamp: Date.now()
        });
        return previousClose;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch previous close for ${optionSymbol}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch closing prices for multiple option symbols
   * @param optionSymbols - Array of Yahoo format option symbols
   * @returns Map of symbol to closing price
   */
  async batchGetPreviousClose(optionSymbols: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const uncached: string[] = [];

    // Separate cached vs uncached
    for (const symbol of optionSymbols) {
      const cached = this.closePriceCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        results.set(symbol, cached.price);
      } else {
        uncached.push(symbol);
      }
    }

    // Fetch all uncached in parallel (no artificial delay)
    if (uncached.length > 0) {
      const promises = uncached.map(async (symbol) => {
        const price = await this.getPreviousClose(symbol);
        if (price !== null) {
          results.set(symbol, price);
        }
      });
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get the last trading day's price change for an option symbol
   * Uses chart API to get last 2 trading days' closing prices and calculates change
   * Useful when market is closed (weekends/holidays)
   * @returns { change, percentChange, lastClose, previousClose } or null
   */
  async getLastTradingDayChange(optionSymbol: string): Promise<{
    change: number;
    percentChange: number;
    lastClose: number;
    previousClose: number;
  } | null> {
    try {
      const url = `${YAHOO_BASE_URL}?symbol=${encodeURIComponent(optionSymbol)}&interval=1d&range=10d`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data: YahooQuoteResponse = await response.json();
      if (data.chart.error) return null;

      const result = data.chart.result?.[0];
      if (!result?.indicators?.quote?.[0]?.close) return null;

      const closes = result.indicators.quote[0].close.filter(c => c !== null) as number[];
      if (closes.length < 2) return null;

      const lastClose = closes[closes.length - 1];
      const previousClose = closes[closes.length - 2];

      if (lastClose <= 0 || previousClose <= 0) return null;

      const change = lastClose - previousClose;
      const percentChange = (change / previousClose) * 100;

      return { change, percentChange, lastClose, previousClose };
    } catch (error) {
      console.error(`Failed to get last trading day change for ${optionSymbol}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch last trading day changes for multiple option symbols
   */
  async batchGetLastTradingDayChange(optionSymbols: string[]): Promise<Map<string, {
    change: number;
    percentChange: number;
    lastClose: number;
    previousClose: number;
  }>> {
    const results = new Map();

    const promises = optionSymbols.map(async (symbol) => {
      const data = await this.getLastTradingDayChange(symbol);
      if (data) {
        results.set(symbol, data);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.closePriceCache.clear();
  }

  /**
   * Check if we need to refresh closing prices (once per day)
   * @returns true if we should fetch new closing prices
   */
  shouldRefreshClosingPrices(lastFetchKey: string = 'lastClosingPriceFetch'): boolean {
    const lastFetch = localStorage.getItem(lastFetchKey);
    if (!lastFetch) return true;

    const lastFetchTime = parseInt(lastFetch, 10);
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    // Refresh if more than 20 hours have passed (to catch market open)
    return timeSinceLastFetch > 20 * 60 * 60 * 1000;
  }

  /**
   * Mark closing prices as fetched
   */
  markClosingPricesFetched(lastFetchKey: string = 'lastClosingPriceFetch'): void {
    localStorage.setItem(lastFetchKey, Date.now().toString());
  }

  /**
   * Get real-time option quote (bid/ask/lastPrice) from Yahoo Finance option chain
   * @param symbol - Stock symbol (e.g., "RCL")
   * @param expirationDate - Expiration date in YYYY-MM-DD format
   * @param strikePrice - Strike price
   * @param optionType - 'call' or 'put'
   * @returns Option quote with bid, ask, lastPrice
   */
  async getOptionQuote(
    symbol: string,
    expirationDate: string,
    strikePrice: number,
    optionType: 'call' | 'put'
  ): Promise<{
    bid?: number;
    ask?: number;
    lastPrice?: number;
    change?: number;
    percentChange?: number;
    volume?: number;
    openInterest?: number;
  }> {
    // Check option quote cache (30s throttle)
    const cacheKey = `${symbol}|${expirationDate}|${strikePrice}|${optionType}`;
    const cached = this.optionQuoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.OPTION_QUOTE_CACHE_DURATION) {
      console.log(`Yahoo Finance: Using cached option quote for ${cacheKey}`);
      return cached.data;
    }

    try {
      // Convert expiration date to Unix timestamp (UTC midnight to match Yahoo's format)
      const expirationTimestamp = Math.floor(new Date(expirationDate + 'T00:00:00Z').getTime() / 1000);
      
      const url = `${YAHOO_OPTIONS_URL}?symbol=${encodeURIComponent(symbol)}&date=${expirationTimestamp}`;
      console.log('Yahoo Finance: Fetching option chain from:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Yahoo Finance API error for ${symbol}: ${response.status}`);
        return {};
      }

      const data = await response.json();
      console.log('Yahoo Finance: Received option chain data:', data);

      const result = data.optionChain?.result?.[0];
      if (!result || !result.options || result.options.length === 0) {
        console.warn('Yahoo Finance: No option data found');
        return {};
      }

      // Get the appropriate option type array (calls or puts)
      const options = result.options[0];
      const optionArray = optionType === 'call' ? options.calls : options.puts;

      if (!optionArray || !Array.isArray(optionArray)) {
        console.warn('Yahoo Finance: No options found for type:', optionType);
        return {};
      }

      // Find the option with matching strike price (exact first, then nearest within $2.50)
      let matchingOption = optionArray.find((opt: any) => 
        Math.abs(opt.strike - strikePrice) < 0.01
      );

      // If no exact match, find nearest strike within $2.50
      if (!matchingOption) {
        let minDiff = Infinity;
        for (const opt of optionArray) {
          const diff = Math.abs(opt.strike - strikePrice);
          if (diff < minDiff && diff <= 2.5) {
            minDiff = diff;
            matchingOption = opt;
          }
        }
      }

      if (!matchingOption) {
        console.warn(`Yahoo Finance: No option found near strike ${strikePrice}`);
        return {};
      }

      console.log('Yahoo Finance: Found matching option:', matchingOption);

      const quoteResult = {
        bid: matchingOption.bid || undefined,
        ask: matchingOption.ask || undefined,
        lastPrice: matchingOption.lastPrice || undefined,
        change: matchingOption.change,
        percentChange: matchingOption.percentChange,
        volume: matchingOption.volume || undefined,
        openInterest: matchingOption.openInterest || undefined
      };
      this.optionQuoteCache.set(cacheKey, { data: quoteResult, timestamp: Date.now() });
      return quoteResult;
    } catch (error) {
      console.error(`Failed to fetch option quote for ${symbol}:`, error);
      return {};
    }
  }

  /**
   * Batch fetch option quotes for multiple options
   * Groups by symbol+expiration to minimize API calls, fetches groups in parallel
   * @param options - Array of option details
   * @returns Map of option ID to quote data
   */
  async batchGetOptionQuotes(
    options: Array<{
      id: string;
      symbol: string;
      expirationDate: string;
      strikePrice: number;
      optionType: 'call' | 'put';
    }>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Group options by symbol and expiration date to minimize API calls
    const grouped = new Map<string, typeof options>();
    options.forEach(opt => {
      const key = `${opt.symbol}|${opt.expirationDate}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(opt);
    });

    // Fetch all groups in parallel — each group = 1 API call
    // Response cache: avoid duplicate fetch for same symbol+expiration (30s throttle)
    const chainCache = new Map<string, any>();

    const groupPromises = Array.from(grouped.entries()).map(async ([key, groupOptions]) => {
      const [symbol, expirationDate] = key.split('|');

      // Check instance-level cache first (30s throttle)
      const chainCacheKey = `chain|${key}`;
      const cachedChain = this.optionQuoteCache.get(chainCacheKey);
      let chainData: any = chainCache.get(key);
      if (!chainData && cachedChain && Date.now() - cachedChain.timestamp < this.OPTION_QUOTE_CACHE_DURATION) {
        chainData = cachedChain.data;
        chainCache.set(key, chainData);
        console.log(`Yahoo Finance: Using cached chain for ${key}`);
      }
      if (!chainData) {
        const expirationTimestamp = Math.floor(new Date(expirationDate + 'T00:00:00Z').getTime() / 1000);
        const url = `${YAHOO_OPTIONS_URL}?symbol=${encodeURIComponent(symbol)}&date=${expirationTimestamp}`;
        try {
          const response = await fetch(url);
          if (response.ok) {
            chainData = await response.json();
            chainCache.set(key, chainData);
            this.optionQuoteCache.set(chainCacheKey, { data: chainData, timestamp: Date.now() });
          }
        } catch (error) {
          console.error(`Failed to fetch option chain for ${key}:`, error);
        }
      }

      if (!chainData) return;

      const result = chainData.optionChain?.result?.[0];
      if (!result?.options?.[0]) return;

      const optionChain = result.options[0];

      // Match each option in the group from the single chain response
      for (const opt of groupOptions) {
        const optionArray = opt.optionType === 'call' ? optionChain.calls : optionChain.puts;
        if (!optionArray || !Array.isArray(optionArray)) {
          results.set(opt.id, {});
          continue;
        }

        let matchingOption = optionArray.find((o: any) => Math.abs(o.strike - opt.strikePrice) < 0.01);
        if (!matchingOption) {
          let minDiff = Infinity;
          for (const o of optionArray) {
            const diff = Math.abs(o.strike - opt.strikePrice);
            if (diff < minDiff && diff <= 2.5) {
              minDiff = diff;
              matchingOption = o;
            }
          }
        }

        if (matchingOption) {
          results.set(opt.id, {
            bid: matchingOption.bid || undefined,
            ask: matchingOption.ask || undefined,
            lastPrice: matchingOption.lastPrice || undefined,
            change: matchingOption.change,
            percentChange: matchingOption.percentChange,
            volume: matchingOption.volume || undefined,
            openInterest: matchingOption.openInterest || undefined
          });
        } else {
          results.set(opt.id, {});
        }
      }
    });

    await Promise.all(groupPromises);
    return results;
  }
}

export default new YahooFinanceService();
