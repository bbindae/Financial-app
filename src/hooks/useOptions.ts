import { useState, useEffect, useCallback, useRef } from 'react';
import { Option, OptionWithPricing } from '../types/Option';
import { OptionService } from '../services/OptionService';
import YahooFinanceService from '../services/YahooFinanceService';
import {
  calculateCost,
  calculateCurrent,
  calculateTodayGainLoss,
  calculateTotalGainLoss,
  buildYahooOptionSymbol,
  getCurrentPriceForCalculation
} from '../utils/optionCalculations';
import { isMarketOpen } from '../utils/marketHours';

const OPTION_PRICE_INTERVAL = 60 * 1000; // 60 seconds (1 minute)

interface UseOptionsReturn {
  options: OptionWithPricing[];
  loading: boolean;
  error: string | null;
  addOption: (option: Omit<Option, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteOption: (optionId: string) => Promise<void>;
  refreshPrices: () => Promise<void>;
}

export const useOptions = (userId: string | undefined): UseOptionsReturn => {
  const [options, setOptions] = useState<OptionWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  console.log('useOptions: render, options.length:', options.length);

  const optionServiceRef = useRef<OptionService | null>(null);
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const closingPricesRef = useRef<Map<string, number>>(new Map());

  // Initialize services
  useEffect(() => {
    if (userId && !optionServiceRef.current) {
      optionServiceRef.current = new OptionService(userId);
    }
  }, [userId]);

  // Log when options change
  useEffect(() => {
    console.log('useOptions: options count:', options.length);
  }, [options]);

  // Fetch closing prices for all options
  const fetchClosingPrices = useCallback(async (optionsList: Option[]) => {
    if (!optionServiceRef.current) return;

    const service = optionServiceRef.current;

    // Always load cached prices from Firestore first
    const cachedPrices = await service.getAllClosingPrices();
    closingPricesRef.current = cachedPrices;
    console.log('Loaded closing prices from cache:', cachedPrices.size);

    // Check if we need to refresh from Yahoo (once per day)
    if (!YahooFinanceService.shouldRefreshClosingPrices('optionsClosingPriceFetch')) {
      console.log('Using cached closing prices (within refresh window)');
      return;
    }

    console.log('Fetching fresh closing prices from Yahoo Finance...');
    
    // Build option symbols for Yahoo Finance
    const yahooSymbols = optionsList.map(opt =>
      buildYahooOptionSymbol(opt.symbol, opt.strikePrice, opt.expirationDate, opt.optionType)
    );

    // Fetch from Yahoo Finance
    const prices = await YahooFinanceService.batchGetPreviousClose(yahooSymbols);

    // Save to Firestore and update local cache
    for (const [symbol, price] of prices.entries()) {
      closingPricesRef.current.set(symbol, price);
      await service.saveClosingPrice(symbol, price);
    }

    // Mark as fetched
    YahooFinanceService.markClosingPricesFetched('optionsClosingPriceFetch');
    console.log('Fetched and cached closing prices:', prices.size);
  }, []);

  // Fetch current option prices from Yahoo Finance
  const fetchOptionPrices = useCallback(async (optionsList: Option[]): Promise<Map<string, any>> => {
    console.log('useOptions: Fetching option prices from Yahoo Finance for', optionsList.length, 'options');

    const optionsData = optionsList.map(option => ({
      id: option.id,
      symbol: option.symbol,
      expirationDate: option.expirationDate,
      strikePrice: option.strikePrice,
      optionType: (option.optionType === 'BUY_CALL' ? 'call' : 'put') as 'call' | 'put'
    }));

    const priceData = await YahooFinanceService.batchGetOptionQuotes(optionsData);
    console.log('useOptions: Received price data for', priceData.size, 'options');
    
    return priceData;
  }, []);

  // Calculate option with pricing data
  const calculateOptionWithPricing = useCallback((
    option: Option,
    priceData: any,
    closingPrice: number | undefined,
    marketClosed: boolean = false
  ): OptionWithPricing => {
    const cost = calculateCost(option.optionPrice, option.quantity);
    
    // Use cached closing price (from Yahoo's previous close API) as primary source
    // Fall back to lastPrice - change from option chain data
    let effectiveClosingPrice: number | undefined;
    if (closingPrice && closingPrice > 0) {
      effectiveClosingPrice = closingPrice;
    } else if (priceData?.lastPrice !== undefined && priceData?.change !== undefined) {
      effectiveClosingPrice = priceData.lastPrice - priceData.change;
      if (effectiveClosingPrice <= 0) effectiveClosingPrice = undefined;
    }

    // Use original option price as ultimate fallback
    const currentPrice = getCurrentPriceForCalculation(
      priceData?.bid,
      priceData?.ask,
      priceData?.lastPrice,
      effectiveClosingPrice || option.optionPrice
    );

    const currentValue = calculateCurrent(
      priceData?.bid,
      priceData?.ask,
      priceData?.lastPrice,
      effectiveClosingPrice || option.optionPrice,
      option.quantity,
      option.optionType
    );

    let todayGainLoss = { amount: 0, percent: 0 };
    let isLastTradingDay = false;

    if (marketClosed) {
      // Market is closed (weekend/holiday/pre-market/post-market)
      isLastTradingDay = true;

      if (priceData?.change !== undefined && priceData?.change !== null && priceData.change !== 0) {
        // Yahoo option chain returned a non-zero change (last trading day's change)
        const changePerContract = priceData.change * option.quantity * 100;
        const amount = option.optionType === 'SELL_PUT' ? -changePerContract : changePerContract;
        const percent = priceData.percentChange !== undefined
          ? (option.optionType === 'SELL_PUT' ? -priceData.percentChange : priceData.percentChange) : 0;
        todayGainLoss = { amount, percent };
      } else if (priceData?.lastPrice && effectiveClosingPrice && effectiveClosingPrice > 0
                 && Math.abs(priceData.lastPrice - effectiveClosingPrice) > 0.001) {
        // Yahoo returned change=0 but we have a cached closing price that differs from lastPrice
        todayGainLoss = calculateTodayGainLoss(
          priceData.lastPrice,
          effectiveClosingPrice,
          option.quantity,
          option.optionType
        );
      }
      // else: no prior data or prices are identical → $0 (genuinely no change or no data)
    } else {
      // Market is open or it's a regular trading day
      // Priority 1: Use Yahoo's change/percentChange directly from option chain
      if (priceData?.change !== undefined && priceData?.change !== null && currentPrice > 0) {
        const changePerContract = priceData.change * option.quantity * 100;
        const amount = option.optionType === 'SELL_PUT' ? -changePerContract : changePerContract;
        const percent = priceData.percentChange !== undefined
          ? (option.optionType === 'SELL_PUT' ? -priceData.percentChange : priceData.percentChange) : 0;
        todayGainLoss = { amount, percent };
      }
      // Priority 2: Calculate from cached closing price vs current price
      else if (effectiveClosingPrice && effectiveClosingPrice > 0 && currentPrice > 0) {
        todayGainLoss = calculateTodayGainLoss(
          currentPrice,
          effectiveClosingPrice,
          option.quantity,
          option.optionType
        );
      }
    }

    console.log(`[Option ${option.symbol} ${option.strikePrice}] marketClosed=${marketClosed}, isLastTradingDay=${isLastTradingDay}, yahoo.change=${priceData?.change}, yahoo.lastPrice=${priceData?.lastPrice}, closingPrice=${effectiveClosingPrice}, currentPrice=${currentPrice}, todayGainLoss=${todayGainLoss.amount}`);

    const totalGainLoss = calculateTotalGainLoss(
      currentValue,
      cost,
      option.optionType
    );

    return {
      ...option,
      closingPrice: effectiveClosingPrice,
      currentPrice,
      bid: priceData?.bid,
      ask: priceData?.ask,
      lastPrice: priceData?.lastPrice,
      lastUpdated: Date.now(),
      cost,
      currentValue,
      todayGainLoss,
      totalGainLoss,
      isLastTradingDay
    };
  }, []);

  // Update options with pricing
  const updateOptionsWithPricing = useCallback(async (optionsList: Option[]) => {
    if (optionsList.length === 0) {
      setOptions([]);
      return;
    }

    // Fetch current prices from Yahoo Finance option chain
    const priceData = await fetchOptionPrices(optionsList);

    // Check if market is currently open
    const marketOpen = isMarketOpen();
    const marketClosed = !marketOpen;
    if (marketClosed) {
      console.log('Market is currently closed. Showing last trading day data.');
    }

    // For each option, save derived closing price to Firestore if we don't have one
    // This ensures we have data for future sessions
    const service = optionServiceRef.current;
    for (const option of optionsList) {
      const yahooSymbol = buildYahooOptionSymbol(
        option.symbol,
        option.strikePrice,
        option.expirationDate,
        option.optionType
      );
      const prices = priceData.get(option.id);
      const cachedClosing = closingPricesRef.current.get(yahooSymbol);

      if (prices?.lastPrice && prices.lastPrice > 0 && service) {
        if (prices.change !== undefined && prices.change !== null && prices.change !== 0) {
          // Yahoo has active change data - derive and save the previous close
          const previousClose = prices.lastPrice - prices.change;
          if (previousClose > 0 && previousClose !== cachedClosing) {
            closingPricesRef.current.set(yahooSymbol, previousClose);
            service.saveClosingPrice(yahooSymbol, previousClose).catch(e =>
              console.warn('Failed to save derived closing price:', e)
            );
            console.log(`Saved derived closing price for ${yahooSymbol}: $${previousClose.toFixed(2)}`);
          }
        } else if (!cachedClosing) {
          // No cached closing price at all - save current lastPrice as baseline to Firestore
          // DON'T update closingPricesRef.current here! If we do, calculateOptionWithPricing
          // will compare lastPrice against itself (the baseline we just saved) and always get $0.
          // The baseline will be loaded from Firestore on the NEXT session.
          service.saveClosingPrice(yahooSymbol, prices.lastPrice).catch(e =>
            console.warn('Failed to save baseline closing price:', e)
          );
          console.log(`Saved baseline closing price for ${yahooSymbol}: $${prices.lastPrice.toFixed(2)} (for next session)`);
        }
      }
    }

    // Calculate options with pricing
    let optionsWithPricing = optionsList.map(option => {
      const yahooSymbol = buildYahooOptionSymbol(
        option.symbol,
        option.strikePrice,
        option.expirationDate,
        option.optionType
      );
      const closingPrice = closingPricesRef.current.get(yahooSymbol);
      const prices = priceData.get(option.id);

      return calculateOptionWithPricing(option, prices, closingPrice, marketClosed);
    });

    // Fallback: For options still showing $0 during closed market, try chart API with longer range
    if (marketClosed) {
      const zeroGainOptions = optionsWithPricing.filter(
        opt => (opt.todayGainLoss?.amount ?? 0) === 0 && opt.lastPrice && opt.lastPrice > 0
      );

      if (zeroGainOptions.length > 0) {
        console.log(`Trying chart API fallback for ${zeroGainOptions.length} options with $0 gain/loss...`);
        const symbolMap = new Map<string, OptionWithPricing>();
        const yahooSymbols: string[] = [];
        for (const opt of zeroGainOptions) {
          const sym = buildYahooOptionSymbol(opt.symbol, opt.strikePrice, opt.expirationDate, opt.optionType);
          symbolMap.set(sym, opt);
          yahooSymbols.push(sym);
        }

        const chartChanges = await YahooFinanceService.batchGetLastTradingDayChange(yahooSymbols);
        if (chartChanges.size > 0) {
          console.log(`Chart API returned data for ${chartChanges.size} options`);
          optionsWithPricing = optionsWithPricing.map(opt => {
            const sym = buildYahooOptionSymbol(opt.symbol, opt.strikePrice, opt.expirationDate, opt.optionType);
            const chartData = chartChanges.get(sym);
            if (chartData && (opt.todayGainLoss?.amount ?? 0) === 0) {
              const changePerContract = chartData.change * opt.quantity * 100;
              const amount = opt.optionType === 'SELL_PUT' ? -changePerContract : changePerContract;
              const percent = opt.optionType === 'SELL_PUT' ? -chartData.percentChange : chartData.percentChange;
              // Also save the previousClose to cache for future use
              if (service && chartData.previousClose > 0) {
                closingPricesRef.current.set(sym, chartData.previousClose);
                service.saveClosingPrice(sym, chartData.previousClose).catch(e =>
                  console.warn('Failed to save chart-derived closing price:', e)
                );
              }
              return {
                ...opt,
                todayGainLoss: { amount, percent },
                isLastTradingDay: true
              };
            }
            return opt;
          });
        }
      }
    }

    setOptions(optionsWithPricing);
  }, [fetchOptionPrices, calculateOptionWithPricing]);

  // Subscribe to Firestore options
  useEffect(() => {
    if (!userId || !optionServiceRef.current) {
      setLoading(false);
      return;
    }

    const service = optionServiceRef.current;

    // Force clear local closing price cache on mount so we always reload from Firestore
    closingPricesRef.current = new Map();

    const unsubscribe = service.subscribeToChanges(async (newOptions) => {
      console.log('Options: Received options from Firestore:', newOptions.length);
      
      // Always fetch closing prices (loads from Firestore cache, refreshes from Yahoo if stale)
      await fetchClosingPrices(newOptions);

      // Always fetch fresh current prices from Yahoo Finance
      await updateOptionsWithPricing(newOptions);
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId, fetchClosingPrices, updateOptionsWithPricing]);

  // Set up 2-minute polling for option prices (reduced from 30s to avoid rate limits)
  useEffect(() => {
    if (options.length === 0) return;

    // Clear existing interval
    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
    }

    // Start new interval
    priceIntervalRef.current = setInterval(async () => {
      console.log('Polling option prices (2-minute interval)...');
      const basicOptions: Option[] = options.map(opt => ({
        id: opt.id,
        userId: opt.userId,
        symbol: opt.symbol,
        optionType: opt.optionType,
        quantity: opt.quantity,
        optionPrice: opt.optionPrice,
        strikePrice: opt.strikePrice,
        expirationDate: opt.expirationDate,
        createdAt: opt.createdAt
      }));
      await updateOptionsWithPricing(basicOptions);
    }, OPTION_PRICE_INTERVAL);

    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
      }
    };
  }, [options.length, updateOptionsWithPricing]);

  // Add option
  const addOption = useCallback(async (option: Omit<Option, 'id' | 'userId' | 'createdAt'>) => {
    if (!optionServiceRef.current) {
      throw new Error('Option service not initialized');
    }

    await optionServiceRef.current.add(option);
  }, []);

  // Delete option
  const deleteOption = useCallback(async (optionId: string) => {
    if (!optionServiceRef.current) {
      throw new Error('Option service not initialized');
    }

    await optionServiceRef.current.delete(optionId);
  }, []);

  // Manual refresh
  const refreshPrices = useCallback(async () => {
    const basicOptions: Option[] = options.map(opt => ({
      id: opt.id,
      userId: opt.userId,
      symbol: opt.symbol,
      optionType: opt.optionType,
      quantity: opt.quantity,
      optionPrice: opt.optionPrice,
      strikePrice: opt.strikePrice,
      expirationDate: opt.expirationDate,
      createdAt: opt.createdAt
    }));
    await updateOptionsWithPricing(basicOptions);
  }, [options, updateOptionsWithPricing]);

  return {
    options,
    loading,
    error,
    addOption,
    deleteOption,
    refreshPrices
  };
};
