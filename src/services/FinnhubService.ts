import { StockTrade } from '../types/WatchList';

type TradeCallback = (trade: StockTrade) => void;

class FinnhubService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private subscribers: Map<string, Set<TradeCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 60000; // 1 minute between reconnect attempts
  private isConnecting = false;
  private lastConnectTime = 0;
  private readonly MIN_STABLE_DURATION = 10000; // Connection must last 10s to be considered stable

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

        this.ws.onopen = () => {
          console.log('Finnhub WebSocket connected');
          this.isConnecting = false;
          this.lastConnectTime = Date.now();
          
          // Re-subscribe to all symbols
          this.subscribers.forEach((_, symbol) => {
            this.sendSubscribe(symbol);
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'trade' && message.data) {
              message.data.forEach((trade: any) => {
                const stockTrade: StockTrade = {
                  symbol: trade.s,
                  price: trade.p,
                  timestamp: trade.t,
                  volume: trade.v,
                };
                
                const callbacks = this.subscribers.get(trade.s);
                if (callbacks) {
                  callbacks.forEach(callback => callback(stockTrade));
                }
              });
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Finnhub WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Finnhub WebSocket closed');
          this.isConnecting = false;
          
          // Only reset reconnect counter if connection was stable (lasted > 10s)
          const connectionDuration = Date.now() - this.lastConnectTime;
          if (this.lastConnectTime > 0 && connectionDuration > this.MIN_STABLE_DURATION) {
            this.reconnectAttempts = 0;
          }
          
          this.ws = null;
          
          // Attempt to reconnect if there are active subscribers
          if (this.subscribers.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Exponential backoff: 5s, 10s, 20s, 40s, 80s
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            setTimeout(() => {
              console.log(`Reconnecting... Attempt ${this.reconnectAttempts} (delay: ${delay}ms)`);
              this.connect();
            }, delay);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Finnhub WebSocket: Max reconnect attempts reached. Giving up.');
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private sendSubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  private sendUnsubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  subscribe(symbol: string, callback: TradeCallback): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      this.sendSubscribe(symbol);
    }
    
    this.subscribers.get(symbol)!.add(callback);

    // Ensure connection is established
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        
        // If no more callbacks for this symbol, unsubscribe
        if (callbacks.size === 0) {
          this.subscribers.delete(symbol);
          this.sendUnsubscribe(symbol);
          
          // If no more subscribers, close connection
          if (this.subscribers.size === 0) {
            this.disconnect();
          }
        }
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
  }

  // REST API fallback for initial quote
  async getQuote(symbol: string): Promise<any> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quote for ${symbol}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching quote:', error);
      throw error;
    }
  }

  /**
   * Get option chain data for a specific symbol and expiration date
   * @param symbol - Stock symbol (e.g., "AMD")
   * @param expirationDate - Expiration date in YYYY-MM-DD format
   * @returns Option chain data with strikes and prices
   */
  async getOptionChain(symbol: string, expirationDate: string): Promise<any> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/option-chain?symbol=${symbol}&date=${expirationDate}&token=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch option chain for ${symbol} on ${expirationDate}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching option chain:', error);
      throw error;
    }
  }

  /**
   * Get quote data for a specific option symbol
   * Returns bid, ask, lastPrice, etc.
   * @param optionSymbol - Option symbol (e.g., "AMD260320P00160000")
   * @returns Quote data with bid, ask, lastPrice, change, volume
   */
  async getOptionQuote(optionSymbol: string): Promise<{
    bid?: number;
    ask?: number;
    lastPrice?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
  }> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${optionSymbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        console.warn(`Failed to fetch option quote for ${optionSymbol}`);
        return {};
      }

      const data = await response.json();

      // Finnhub returns: c (current price), h (high), l (low), o (open), pc (previous close), d (change), dp (change percent), t (timestamp)
      return {
        lastPrice: data.c || undefined,
        change: data.d || undefined,
        changePercent: data.dp || undefined,
        // Note: Finnhub free tier may not provide bid/ask for options
        // These might need to be fetched from option chain instead
      };
    } catch (error) {
      console.error('Error fetching option quote:', error);
      return {};
    }
  }

  /**
   * Get detailed option data including bid/ask from option chain
   * This is more reliable than getOptionQuote for bid/ask prices
   */
  async getOptionDataFromChain(
    symbol: string,
    expirationDate: string,
    strikePrice: number,
    optionType: 'call' | 'put'
  ): Promise<{
    bid?: number;
    ask?: number;
    lastPrice?: number;
    volume?: number;
  }> {
    try {
      const chain = await this.getOptionChain(symbol, expirationDate);

      if (!chain || !chain.data) {
        return {};
      }

      // The API structure may vary, adjust based on actual response
      // Typically: { data: [{ strike, calls: {...}, puts: {...} }] }
      if (Array.isArray(chain.data)) {
        const matchingStrike = chain.data.find((item: any) => 
          Math.abs(item.strike - strikePrice) < 0.01
        );

        if (matchingStrike) {
          const optionData = optionType === 'call' ? matchingStrike.calls : matchingStrike.puts;
          return {
            bid: optionData?.bid,
            ask: optionData?.ask,
            lastPrice: optionData?.lastPrice || optionData?.last,
            volume: optionData?.volume,
          };
        }
      }

      return {};
    } catch (error) {
      console.error('Error fetching option data from chain:', error);
      return {};
    }
  }
}

export default FinnhubService;
