import React, { useState } from 'react';
import { useWatchList } from '../hooks/useWatchList';

interface WatchListProps {
  userId: string | undefined;
}

const WatchList: React.FC<WatchListProps> = ({ userId }) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { items, quotes, loading, error, addSymbol, removeSymbol } = useWatchList(userId);

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSymbol.trim()) return;
    
    setIsAdding(true);
    try {
      await addSymbol(newSymbol.trim().toUpperCase());
      setNewSymbol('');
    } catch (err) {
      console.error('Error adding symbol:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSymbol = async (itemId: string) => {
    try {
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
        <span className="text-sm text-gray-500">Real-time prices</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Add Symbol Form */}
      <form onSubmit={handleAddSymbol} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Enter symbol (e.g., AAPL)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isAdding}
            maxLength={10}
          />
          <button
            type="submit"
            disabled={isAdding || !newSymbol.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

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
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
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
              {items.map((item) => {
                const quote = quotes.get(item.symbol);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.symbol}
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
                        onClick={() => handleRemoveSymbol(item.id!)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium transition-colors"
                        title="Remove from watch list"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Footer */}
      {items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Prices update in real-time via WebSocket • Data provided by Finnhub
          </p>
        </div>
      )}
    </div>
  );
};

export default WatchList;
