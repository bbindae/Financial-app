import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchListItem, StockQuote } from '../types/WatchList';
import WatchListService from '../services/WatchListService';
import FinnhubService from '../services/FinnhubService';

// Finnhub API key - this should be set in .env file as VITE_FINNHUB_API_KEY
const FINNHUB_API_KEY = (import.meta as any).env?.VITE_FINNHUB_API_KEY || 'YOUR_API_KEY_HERE';

interface UseWatchListReturn {
  items: WatchListItem[];
  quotes: Map<string, StockQuote>;
  loading: boolean;
  error: string | null;
  addSymbol: (symbol: string) => Promise<void>;
  removeSymbol: (itemId: string) => Promise<void>;
}

export const useWatchList = (userId: string | undefined): UseWatchListReturn => {
  const [items, setItems] = useState<WatchListItem[]>([]);
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const finnhubServiceRef = useRef<FinnhubService | null>(null);
  const unsubscribeFunctionsRef = useRef<Map<string, () => void>>(new Map());

  // Initialize Finnhub service and connect immediately
  useEffect(() => {
    if (!finnhubServiceRef.current) {
      console.log('WatchList: Initializing Finnhub service with API key:', FINNHUB_API_KEY ? 'Present' : 'Missing');
      finnhubServiceRef.current = new FinnhubService(FINNHUB_API_KEY);
    }

    // Eagerly connect WebSocket so it's ready when items load
    finnhubServiceRef.current.connect().catch(err => {
      console.warn('WatchList: Eager Finnhub connection failed, will retry on subscribe:', err);
    });

    return () => {
      // Cleanup on unmount
      if (finnhubServiceRef.current) {
        console.log('WatchList: Disconnecting Finnhub service');
        finnhubServiceRef.current.disconnect();
      }
    };
  }, []);

  // Subscribe to Firestore watchlist
  useEffect(() => {
    if (!userId) {
      console.log('WatchList: No userId provided');
      setLoading(false);
      return;
    }

    console.log('WatchList: Subscribing to Firestore for userId:', userId);

    try {
      const unsubscribe = WatchListService.subscribeToWatchList(userId, (newItems) => {
        console.log('WatchList: Received items from Firestore:', newItems.length);
        setItems(newItems);
        setLoading(false);
      });

      return () => {
        console.log('WatchList: Unsubscribing from Firestore');
        unsubscribe();
      };
    } catch (error) {
      console.error('WatchList: Error subscribing to Firestore:', error);
      setError('Failed to connect to database');
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to WebSocket for real-time prices
  useEffect(() => {
    if (!finnhubServiceRef.current || items.length === 0) {
      return;
    }

    const service = finnhubServiceRef.current;
    
    // Get current symbols
    const currentSymbols = new Set(items.map(item => item.symbol));
    const subscribedSymbols = new Set(unsubscribeFunctionsRef.current.keys());

    // Unsubscribe from symbols no longer in the list
    subscribedSymbols.forEach(symbol => {
      if (!currentSymbols.has(symbol)) {
        const unsubscribe = unsubscribeFunctionsRef.current.get(symbol);
        if (unsubscribe) {
          unsubscribe();
          unsubscribeFunctionsRef.current.delete(symbol);
        }
      }
    });

    // Always fetch fresh quotes via REST API for all items on mount/reload
    items.forEach(item => {
      service.getQuote(item.symbol)
        .then(data => {
          console.log('WatchList: Received quote for', item.symbol, data);
          if (data.c) {
            setQuotes(prev => new Map(prev).set(item.symbol, {
              symbol: item.symbol,
              price: data.c,
              change: data.d,
              changePercent: data.dp,
              high: data.h,
              low: data.l,
              open: data.o,
              previousClose: data.pc,
            }));
          }
        })
        .catch(err => console.error(`WatchList: Error fetching quote for ${item.symbol}:`, err));
    });

    // Subscribe to WebSocket for new symbols
    items.forEach(item => {
      if (!unsubscribeFunctionsRef.current.has(item.symbol)) {
        console.log('WatchList: Subscribing to symbol:', item.symbol);

        // Subscribe to WebSocket for real-time updates
        const unsubscribe = service.subscribe(item.symbol, (trade) => {
          console.log('WatchList: Received trade update for', trade.symbol, trade.price);
          setQuotes(prev => {
            const newQuotes = new Map(prev);
            const existingQuote = newQuotes.get(trade.symbol);
            
            if (existingQuote) {
              // Update only the price and timestamp, keep other data
              newQuotes.set(trade.symbol, {
                ...existingQuote,
                price: trade.price,
                timestamp: trade.timestamp,
              });
            } else {
              // Create a minimal quote if it doesn't exist
              newQuotes.set(trade.symbol, {
                symbol: trade.symbol,
                price: trade.price,
                change: 0,
                changePercent: 0,
                high: trade.price,
                low: trade.price,
                open: trade.price,
                previousClose: trade.price,
                timestamp: trade.timestamp,
              });
            }
            
            return newQuotes;
          });
        });

        unsubscribeFunctionsRef.current.set(item.symbol, unsubscribe);
      }
    });

    return () => {
      // Cleanup subscriptions when items change
      unsubscribeFunctionsRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctionsRef.current.clear();
    };
  }, [items]);

  const addSymbol = useCallback(async (symbol: string) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      setError(null);
      await WatchListService.addSymbol(userId, symbol);
    } catch (err) {
      setError('Failed to add symbol to watchlist');
      throw err;
    }
  }, [userId]);

  const removeSymbol = useCallback(async (itemId: string) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      setError(null);
      await WatchListService.removeSymbol(userId, itemId);
    } catch (err) {
      setError('Failed to remove symbol from watchlist');
      throw err;
    }
  }, [userId]);

  return {
    items,
    quotes,
    loading,
    error,
    addSymbol,
    removeSymbol,
  };
};
