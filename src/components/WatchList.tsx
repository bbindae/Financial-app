import React, { useState, useMemo } from 'react';
import { useWatchList } from '../hooks/useWatchList';
import { OptionWithPricing } from '../types/Option';
import { formatOptionSymbol } from '../utils/optionCalculations';
import { isMarketOpen } from '../utils/marketHours';

/**
 * Check if an expiration date falls within the current week (Mon-Fri)
 */
function isExpiringThisWeek(expirationDate: string): boolean {
  const now = new Date();
  const expDate = new Date(expirationDate + 'T00:00:00');
  
  // Get Monday of current week
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  // Get Friday of current week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  
  return expDate >= monday && expDate <= friday;
}

interface WatchListProps {
  userId: string | undefined;
  options?: OptionWithPricing[];
  onDeleteOption?: (optionId: string) => void;
  onAddOption?: () => void;
}

const EXPANDED_STORAGE_KEY = 'watchlist-expanded-symbols';
const COLLAPSED_STORAGE_KEY = 'watchlist-collapsed-symbols';

const loadSetFromStorage = (key: string): Set<string> => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage:`, e);
  }
  return new Set();
};

const saveSetToStorage = (key: string, set: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
};

const WatchList: React.FC<WatchListProps> = ({ userId, options = [], onDeleteOption, onAddOption }) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(() => loadSetFromStorage(EXPANDED_STORAGE_KEY));
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(() => loadSetFromStorage(COLLAPSED_STORAGE_KEY));
  const { items, quotes, loading, error, addSymbol, removeSymbol } = useWatchList(userId);

  // Group options by symbol
  const optionsBySymbol = useMemo(() => {
    const map = new Map<string, OptionWithPricing[]>();
    options.forEach(option => {
      const existing = map.get(option.symbol) || [];
      map.set(option.symbol, [...existing, option]);
    });
    return map;
  }, [options, items]);

  // Auto-expand symbols that have options, unless manually collapsed
  const expandedSymbolsState = useMemo(() => {
    const autoExpanded = new Set(expandedSymbols);
    optionsBySymbol.forEach((_, symbol) => {
      if (!manuallyCollapsed.has(symbol)) {
        autoExpanded.add(symbol);
      }
    });
    return autoExpanded;
  }, [optionsBySymbol, expandedSymbols, manuallyCollapsed]);

  // Toggle symbol expansion (persisted to localStorage)
  const toggleSymbolExpansion = (symbol: string) => {
    const isCurrentlyExpanded = expandedSymbolsState.has(symbol);
    if (isCurrentlyExpanded) {
      // Collapse: add to manually collapsed, remove from expanded
      setManuallyCollapsed(prev => {
        const next = new Set(prev).add(symbol);
        saveSetToStorage(COLLAPSED_STORAGE_KEY, next);
        return next;
      });
      setExpandedSymbols(prev => {
        const next = new Set(prev);
        next.delete(symbol);
        saveSetToStorage(EXPANDED_STORAGE_KEY, next);
        return next;
      });
    } else {
      // Expand: remove from manually collapsed, add to expanded
      setManuallyCollapsed(prev => {
        const next = new Set(prev);
        next.delete(symbol);
        saveSetToStorage(COLLAPSED_STORAGE_KEY, next);
        return next;
      });
      setExpandedSymbols(prev => {
        const next = new Set(prev).add(symbol);
        saveSetToStorage(EXPANDED_STORAGE_KEY, next);
        return next;
      });
    }
  };

  // Sort items by symbol
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.symbol.localeCompare(b.symbol);
      } else {
        return b.symbol.localeCompare(a.symbol);
      }
    });
  }, [items, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    
    // Duplicate check
    const isDuplicate = items.some(item => item.symbol === symbol);
    if (isDuplicate) {
      setAddError(`Symbol "${symbol}" is already in your watch list.`);
      return;
    }
    
    setAddError(null);
    setIsAdding(true);
    try {
      await addSymbol(symbol);
      setNewSymbol('');
    } catch (err) {
      console.error('Error adding symbol:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSymbol = async (itemId: string, symbol: string) => {
    try {
      // Delete all options associated with this symbol
      const symbolOptions = optionsBySymbol.get(symbol) || [];
      if (symbolOptions.length > 0 && onDeleteOption) {
        for (const option of symbolOptions) {
          await onDeleteOption(option.id);
        }
      }
      await removeSymbol(itemId);
    } catch (err) {
      console.error('Error removing symbol:', err);
    }
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined) return '--';
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number | undefined, changePercent: number | undefined): string => {
    if (change === undefined || changePercent === undefined) return '--';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getChangeColor = (change: number | undefined): string => {
    if (change === undefined) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Show loading only while fetching initial data
  if (!userId) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Watch List</h2>
        <p className="text-gray-600">Please log in to view your watch list.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Watch List</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Watch List</h2>
      </div>
      
      {(error || addError) && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error || addError}
        </div>
      )}

      {/* Add Symbol Form + Add Option + Real-time prices on same line */}
      <div className="flex items-center gap-2 mb-4">
        <form onSubmit={handleAddSymbol} className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => { setNewSymbol(e.target.value.toUpperCase()); setAddError(null); }}
            placeholder="Symbol (e.g., AAPL)"
            className="w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAdding}
            maxLength={10}
          />
          <button
            type="submit"
            disabled={isAdding || !newSymbol.trim()}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </form>
        {onAddOption && (
          <button
            onClick={onAddOption}
            className="bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1 text-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Option
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">Real-time prices</span>
      </div>

      {/* Watch List Table */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No symbols in your watch list</p>
          <p className="text-sm">Add a stock symbol above to start tracking prices</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={toggleSort}
                  title="Click to sort"
                >
                  <div className="flex items-center gap-1">
                    <span>Symbol</span>
                    <span className="text-gray-400">
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  High
                </th>
                <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Low
                </th>
                <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedItems.map((item) => {
                const quote = quotes.get(item.symbol);
                const hasOptions = optionsBySymbol.has(item.symbol);
                const isExpanded = expandedSymbolsState.has(item.symbol);
                const symbolOptions = optionsBySymbol.get(item.symbol) || [];
                const stockPrice = quote?.price;
                
                return (
                  <React.Fragment key={item.id}>
                    {/* Stock Row */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasOptions && (
                            <button
                              onClick={() => toggleSymbolExpansion(item.symbol)}
                              className="text-gray-600 hover:text-gray-800 focus:outline-none"
                              title={isExpanded ? 'Collapse options' : 'Expand options'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                          <div className="text-sm font-medium text-gray-900">
                            {item.symbol}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatPrice(quote?.price)}
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${getChangeColor(quote?.change)}`}>
                          {formatChange(quote?.change, quote?.changePercent)}
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-600">
                          {formatPrice(quote?.high)}
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-600">
                          {formatPrice(quote?.low)}
                        </div>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleRemoveSymbol(item.id!, item.symbol)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium transition-colors"
                          title="Remove from watch list"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>

                    {/* Options Rows (if expanded) */}
                    {hasOptions && isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="ml-8 border-l-2 border-blue-300 pl-4">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-[20%]">Option</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-[13%]">Cost</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-[10%]">Qty</th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-[17%]">
                                    <div>{!isMarketOpen() ? "Last Day's" : "Today's"}</div>
                                    <div>Gain/Loss</div>
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-[17%]"><div>Total</div><div>Gain/Loss</div></th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-[15%]">Current</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-[8%]">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {symbolOptions.map((option, optIdx) => {
                                  const optionSymbol = formatOptionSymbol(
                                    option.symbol,
                                    option.strikePrice,
                                    option.expirationDate,
                                    option.optionType
                                  );
                                  const optionTypeLabel = 
                                    option.optionType === 'SELL_PUT' ? 'Sell Put' :
                                    option.optionType === 'BUY_CALL' ? 'Buy Call' : 'Buy Put';
                                  const nearExpiration = isExpiringThisWeek(option.expirationDate);
                                  const isNearStrike = stockPrice !== undefined && stockPrice < option.strikePrice * 1.05;
                                  const qtySigned = option.optionType === 'SELL_PUT' ? -option.quantity : option.quantity;
                                  const todayAmount = option.todayGainLoss?.amount || 0;
                                  const todayPercent = option.todayGainLoss?.percent || 0;
                                  const totalAmount = option.totalGainLoss?.amount || 0;
                                  const totalPercent = option.totalGainLoss?.percent || 0;
                                  const formatCurrency = (value: number) => {
                                    return `$${value.toFixed(2)}`;
                                  };
                                  
                                  return (
                                    <tr key={option.id} className={optIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-3 py-2 text-xs">
                                        <div>
                                          <div className={`font-medium flex items-center gap-1 ${isNearStrike ? 'text-red-600' : 'text-gray-900'}`}>
                                            {optionSymbol}
                                            {nearExpiration && (
                                              <img
                                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f97316' width='16' height='16'%3E%3Crect x='2' y='2' width='20' height='20' rx='3' /%3E%3Ctext x='12' y='16' text-anchor='middle' font-size='11' font-weight='bold' fill='white' font-family='Arial'%3ENE%3C/text%3E%3C/svg%3E"
                                                alt="Near Expiration"
                                                title="Expires this week"
                                                className="w-5 h-5 inline-block"
                                              />
                                            )}
                                          </div>
                                          <div className="text-gray-600 mt-1">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                              option.optionType === 'SELL_PUT' 
                                                ? 'bg-orange-100 text-orange-800' 
                                                : option.optionType === 'BUY_CALL'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {optionTypeLabel}
                                            </span>
                                            <span className="text-xs ml-1">Exp: {option.expirationDate}</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-900">
                                        <div>{formatCurrency(option.cost)}</div>
                                        <div className="text-gray-500 font-normal">${option.optionPrice.toFixed(2)} / Share</div>
                                      </td>
                                      <td className="px-3 py-2 text-xs text-right font-bold text-gray-900">
                                        {qtySigned}
                                      </td>
                                      <td className={`px-3 py-2 text-xs text-right font-medium ${
                                        todayAmount >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        <div>{formatCurrency(todayAmount)}</div>
                                        <div className="text-xs opacity-75">({todayPercent.toFixed(2)}%)</div>
                                        {option.isLastTradingDay && (
                                          <div className="text-xs text-gray-400 italic">Last trading day</div>
                                        )}
                                      </td>
                                      <td className={`px-3 py-2 text-xs text-right font-semibold ${
                                        totalAmount >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        <div>{formatCurrency(totalAmount)}</div>
                                        <div className="text-xs opacity-75">({totalPercent.toFixed(2)}%)</div>
                                      </td>
                                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-900">
                                        {formatCurrency(option.currentValue)}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {onDeleteOption && (
                                          <button
                                            onClick={() => onDeleteOption(option.id)}
                                            className="text-red-600 hover:text-red-900 text-xs font-medium transition-colors"
                                            title="Delete option"
                                          >
                                            ×
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default WatchList;
