export interface WatchListItem {
  id?: string;
  symbol: string;
  addedAt: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp?: number;
}

export interface StockTrade {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
}
