export type OptionType = 'SELL_PUT' | 'BUY_CALL' | 'BUY_PUT';

export interface Option {
  id: string;
  userId: string;
  symbol: string;
  optionType: OptionType;
  quantity: number;
  optionPrice: number;
  strikePrice: number;
  expirationDate: string; // YYYY-MM-DD format
  createdAt: string; // ISO string
}

export interface OptionWithPricing extends Option {
  closingPrice?: number;
  currentPrice?: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
  lastUpdated?: number; // timestamp
  todayGainLoss?: {
    amount: number;
    percent: number;
  };
  totalGainLoss?: {
    amount: number;
    percent: number;
  };
  cost: number;
  currentValue: number;
  isLastTradingDay?: boolean; // true when showing last trading day's gain/loss (market closed)
}

export interface OptionChainData {
  strike: number;
  expiration: string;
  bid: number;
  ask: number;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
}
