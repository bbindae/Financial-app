import React, { useMemo, useState } from 'react';
import { Transaction } from '../types/Transaction';
import { formatCurrency } from '../utils/calculations';

const LS_KEY = 'symbolGainLoss_prefs';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      sortField: SortField;
      sortDirection: SortDirection;
      selectedYear: string;
      selectedMonth: string;
    };
  } catch {
    return null;
  }
}

function savePrefs(prefs: {
  sortField: SortField;
  sortDirection: SortDirection;
  selectedYear: string;
  selectedMonth: string;
}) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

interface SymbolGainLossProps {
  transactions: Transaction[];
}

type SortField = 'symbol' | 'gainLoss';
type SortDirection = 'asc' | 'desc';

interface SymbolRow {
  symbol: string;
  gainLoss: number;
  qty: number;
  tradeCount: number;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const SortIcon: React.FC<{ field: SortField; sortField: SortField; sortDirection: SortDirection }> = ({
  field,
  sortField,
  sortDirection,
}) => {
  const isActive = field === sortField;
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <span className={`text-[10px] ${isActive && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-300'}`}>▲</span>
      <span className={`text-[10px] ${isActive && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-300'}`}>▼</span>
    </span>
  );
};

export const SymbolGainLoss: React.FC<SymbolGainLossProps> = ({ transactions }) => {
  const savedPrefs = useMemo(() => loadPrefs(), []);
  const [sortField, setSortField] = useState<SortField>(savedPrefs?.sortField ?? 'gainLoss');
  const [sortDirection, setSortDirection] = useState<SortDirection>(savedPrefs?.sortDirection ?? 'desc');
  const [selectedYear, setSelectedYear] = useState<string>(savedPrefs?.selectedYear ?? 'all');
  const [selectedMonth, setSelectedMonth] = useState<string>(savedPrefs?.selectedMonth ?? 'all');

  // Derive unique years from transactions
  const years = useMemo(() => {
    const yearSet = new Set<string>();
    transactions.forEach((t) => {
      const dateField = t.dateRealized || t.dateAcquired;
      if (dateField) {
        const year = new Date(dateField).getFullYear().toString();
        if (!isNaN(Number(year))) yearSet.add(year);
      }
    });
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  // Filter transactions by selected year/month
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const dateField = t.dateRealized || t.dateAcquired;
      if (!dateField) return false;
      const date = new Date(dateField);
      if (isNaN(date.getTime())) return false;
      const year = date.getFullYear().toString();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      return true;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Extract the leading alphabetic ticker from a symbol string
  // e.g. "SNDK260213P490(8396109QM)" → "SNDK", "XOM" → "XOM"
  const extractTicker = (symbol: string): string => {
    const match = symbol.match(/^[A-Za-z]+/);
    return match ? match[0].toUpperCase() : symbol.toUpperCase();
  };

  // Group by symbol
  const symbolRows = useMemo((): SymbolRow[] => {
    const map = new Map<string, { gainLoss: number; qty: number; tradeCount: number }>();
    filteredTransactions.forEach((t) => {
      const raw = t.symbol || 'UNKNOWN';
      const sym = extractTicker(raw);
      const existing = map.get(sym) || { gainLoss: 0, qty: 0, tradeCount: 0 };
      map.set(sym, {
        gainLoss: existing.gainLoss + t.gainLoss,
        qty: existing.qty + (t.quantity ?? 0),
        tradeCount: existing.tradeCount + 1,
      });
    });
    return Array.from(map.entries()).map(([symbol, data]) => ({
      symbol,
      ...data,
    }));
  }, [filteredTransactions]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...symbolRows].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      } else {
        comparison = a.gainLoss - b.gainLoss;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [symbolRows, sortField, sortDirection]);

  const totalGainLoss = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.gainLoss, 0),
    [filteredTransactions]
  );

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection;
    let newField: SortField;
    if (field === sortField) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      newField = sortField;
    } else {
      newField = field;
      newDirection = 'desc';
    }
    setSortField(newField);
    setSortDirection(newDirection);
    savePrefs({ sortField: newField, sortDirection: newDirection, selectedYear, selectedMonth });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('all');
    savePrefs({ sortField, sortDirection, selectedYear: year, selectedMonth: 'all' });
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    savePrefs({ sortField, sortDirection, selectedYear, selectedMonth: month });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gain / Loss by Symbol</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Year dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Month dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sortedRows.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No data available for the selected period</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 w-12">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    <button
                      onClick={() => handleSort('symbol')}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Symbol
                      <SortIcon field="symbol" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">
                    <button
                      onClick={() => handleSort('gainLoss')}
                      className="flex items-center gap-1 ml-auto hover:text-blue-600 transition-colors"
                    >
                      Gain / Loss
                      <SortIcon field="gainLoss" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Trades</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr
                    key={row.symbol}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-400 text-xs">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{row.symbol}</td>
                    <td
                      className={`py-3 px-4 text-right font-semibold tabular-nums ${
                        row.gainLoss >= 0 ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      {row.gainLoss >= 0 ? '+' : ''}
                      {formatCurrency(row.gainLoss)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 tabular-nums">{row.qty}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{row.tradeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total row */}
          <div className="mt-4 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
            <span className="font-bold text-gray-700">
              Total ({sortedRows.length} symbol{sortedRows.length !== 1 ? 's' : ''},{' '}
              {filteredTransactions.length} trade{filteredTransactions.length !== 1 ? 's' : ''})
            </span>
            <span
              className={`text-lg font-bold tabular-nums ${
                totalGainLoss >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {totalGainLoss >= 0 ? '+' : ''}
              {formatCurrency(totalGainLoss)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
