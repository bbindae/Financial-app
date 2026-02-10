import { Transaction, MonthlySummary, WeeklySummary } from '../types/Transaction';
import { getMonthKey, getWeekKey } from './dateHelpers';

export const calculateGainLoss = (proceeds: number, costBasis: number): number => {
  return proceeds - costBasis;
};

export const groupByMonth = (transactions: Transaction[]): MonthlySummary[] => {
  const monthMap = new Map<string, number>();

  transactions.forEach(transaction => {
    const monthKey = getMonthKey(transaction.dateAcquired);
    const current = monthMap.get(monthKey) || 0;
    monthMap.set(monthKey, current + transaction.gainLoss);
  });

  return Array.from(monthMap.entries())
    .map(([month, totalGainLoss]) => ({ month, totalGainLoss }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export const groupByWeek = (transactions: Transaction[]): WeeklySummary[] => {
  const weekMap = new Map<string, number>();

  transactions.forEach(transaction => {
    const weekKey = getWeekKey(transaction.dateAcquired);
    const current = weekMap.get(weekKey) || 0;
    weekMap.set(weekKey, current + transaction.gainLoss);
  });

  return Array.from(weekMap.entries())
    .map(([week, totalGainLoss]) => ({ week, totalGainLoss }))
    .sort((a, b) => a.week.localeCompare(b.week));
};

export const calculateTotal = (transactions: Transaction[]): number => {
  return transactions.reduce((sum, t) => sum + t.gainLoss, 0);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};
