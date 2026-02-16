import { StockTrade } from '../types/WatchList';

type TradeCallback = (trade: StockTrade) => void;

class FinnhubService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private subscribers: Map<string, Set<TradeCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;

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
          this.reconnectAttempts = 0;
          
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
          this.ws = null;
          
          // Attempt to reconnect if there are active subscribers
          if (this.subscribers.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
              this.connect();
            }, this.reconnectDelay);
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
}

export default FinnhubService;
