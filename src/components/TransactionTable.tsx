import React, { useState } from 'react';
import { Transaction } from '../types/Transaction';
import { formatCurrency } from '../utils/calculations';

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onDelete }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null);

  const sortedTransactions = React.useMemo(() => {
    let sortable = [...transactions];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortable;
  }, [transactions, sortConfig]);

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortArrow = (key: keyof Transaction) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <h2 className="text-2xl font-bold p-6 pb-4">Transaction History</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('symbol')}>
                Symbol{getSortArrow('symbol')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Security Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('quantity')}>
                Quantity{getSortArrow('quantity')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('dateAcquired')}>
                Date Acquired{getSortArrow('dateAcquired')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('dateSold')}>
                Date Sold{getSortArrow('dateSold')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('proceeds')}>
                Proceeds{getSortArrow('proceeds')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('costBasis')}>
                Cost Basis{getSortArrow('costBasis')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap" onClick={() => requestSort('gainLoss')}>
                Gain/Loss{getSortArrow('gainLoss')}
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction, index) => (
              <tr key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 text-sm font-medium">{transaction.symbol}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate" title={transaction.securityDescription}>
                  {transaction.securityDescription}
                </td>
                <td className="px-4 py-3 text-sm">{transaction.quantity}</td>
                <td className="px-4 py-3 text-sm">{transaction.dateAcquired}</td>
                <td className="px-4 py-3 text-sm">{transaction.dateSold}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(transaction.proceeds)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(transaction.costBasis)}</td>
                <td className={`px-4 py-3 text-sm text-right font-semibold ${transaction.gainLoss < 0 ? 'text-red-600' : 'text-black'}`}>
                  {formatCurrency(transaction.gainLoss)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {transactions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No transactions yet. Add your first transaction above.
        </div>
      )}
    </div>
  );
};
