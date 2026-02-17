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

    // Check if we need to refresh (once per day)
    if (!YahooFinanceService.shouldRefreshClosingPrices('optionsClosingPriceFetch')) {
      // Load from Firestore cache
      const cachedPrices = await service.getAllClosingPrices();
      closingPricesRef.current = cachedPrices;
      console.log('Loaded closing prices from cache:', cachedPrices.size);
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
    closingPrice: number | undefined
  ): OptionWithPricing => {
    const cost = calculateCost(option.optionPrice, option.quantity);
    
    // Derive closingPrice from Yahoo's lastPrice - change if not available from cache
    let effectiveClosingPrice = closingPrice;
    if (!effectiveClosingPrice && priceData?.lastPrice && priceData?.change !== undefined) {
      effectiveClosingPrice = priceData.lastPrice - priceData.change;
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
    if (effectiveClosingPrice && effectiveClosingPrice > 0 && currentPrice > 0) {
      todayGainLoss = calculateTodayGainLoss(
        currentPrice,
        effectiveClosingPrice,
        option.quantity,
        option.optionType
      );
    }

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
      totalGainLoss
    };
  }, []);

  // Update options with pricing
  const updateOptionsWithPricing = useCallback(async (optionsList: Option[]) => {
    if (optionsList.length === 0) {
      setOptions([]);
      return;
    }

    // Fetch current prices from Yahoo Finance
    const priceData = await fetchOptionPrices(optionsList);

    // Calculate options with pricing
    const optionsWithPricing = optionsList.map(option => {
      const yahooSymbol = buildYahooOptionSymbol(
        option.symbol,
        option.strikePrice,
        option.expirationDate,
        option.optionType
      );
      const closingPrice = closingPricesRef.current.get(yahooSymbol);
      const prices = priceData.get(option.id);

      return calculateOptionWithPricing(option, prices, closingPrice);
    });

    setOptions(optionsWithPricing);
  }, [fetchOptionPrices, calculateOptionWithPricing]);

  // Subscribe to Firestore options
  useEffect(() => {
    if (!userId || !optionServiceRef.current) {
      setLoading(false);
      return;
    }

    const service = optionServiceRef.current;

    const unsubscribe = service.subscribeToChanges(async (newOptions) => {
      console.log('Options: Received options from Firestore:', newOptions.length);
      
      // Fetch closing prices if needed
      await fetchClosingPrices(newOptions);

      // Update with pricing
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
