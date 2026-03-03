export type TransactionType = 'Option' | 'Stock';

export interface Transaction {
  id: string;
  type: TransactionType;
  symbol: string;
  securityDescription: string;
  quantity: number;
  dateAcquired: string; // ISO string format
  dateSold: string; // ISO string format
  dateRealized: string; // ISO string format — the date gain/loss is realized
  proceeds: number;
  costBasis: number;
  gainLoss: number; // proceeds - costBasis
}

export interface MonthlySummary {
  month: string; // YYYY-MM format
  totalGainLoss: number;
}

export interface WeeklySummary {
  week: string; // YYYY-Www format
  totalGainLoss: number;
}
