import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/Transaction';
import { formatCurrency } from '../utils/calculations';

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

/**
 * Format date to yyyy-mm-dd
 */
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onDelete }) => {
  // Get current year and month for default filter
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  
  // Default sort by Date Acquired descending
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({ 
    key: 'dateAcquired', 
    direction: 'desc' 
  });
  
  // Year/Month filter states - default to current year and month
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Extract unique years and months from transactions
  const { years, months } = useMemo(() => {
    const yearSet = new Set<string>();
    const monthSet = new Set<string>();
    
    transactions.forEach(t => {
      const date = new Date(t.dateAcquired);
      yearSet.add(date.getFullYear().toString());
      monthSet.add((date.getMonth() + 1).toString().padStart(2, '0'));
    });
    
    return {
      years: Array.from(yearSet).sort((a, b) => b.localeCompare(a)),
      months: Array.from(monthSet).sort()
    };
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const date = new Date(transaction.dateAcquired);
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      if (selectedYear && year !== selectedYear) return false;
      if (selectedMonth && month !== selectedMonth) return false;
      
      return true;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Apply sorting
  const sortedTransactions = useMemo(() => {
    let sortable = [...filteredTransactions];
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
    return sortable;
  }, [filteredTransactions, sortConfig]);

  // Apply pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedTransactions.slice(startIndex, endIndex);
  }, [sortedTransactions, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth]);

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortArrow = (key: keyof Transaction) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
  };

  const clearFilters = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const hasNonDefaultFilters = selectedYear !== currentYear || selectedMonth !== currentMonth;

  // Extract only the leading alphabetic characters from symbol (before first number)
  const getSymbolDisplay = (symbol: string): string => {
    const match = symbol.match(/^[A-Za-z]+/);
    return match ? match[0] : symbol;
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 pb-4">
        <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
        
        {/* Filters */}
        <div className="flex gap-4 items-center mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <select 
              value={selectedYear} 
              onChange={handleYearChange}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Month</label>
            <select 
              value={selectedMonth} 
              onChange={handleMonthChange}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>
                  {monthNames[parseInt(month) - 1]}
                </option>
              ))}
            </select>
          </div>
          
          {hasNonDefaultFilters && (
            <button
              onClick={clearFilters}
              className="mt-6 px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              Reset to This Month
            </button>
          )}
          
          <div className="ml-auto text-sm text-gray-600 mt-6">
            Showing {paginatedTransactions.length} of {sortedTransactions.length} transactions
          </div>
        </div>
      </div>
      
      <div className="overflow-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[6%]" onClick={() => requestSort('symbol')}>
                Symbol{getSortArrow('symbol')}
              </th>
              <th className="px-2 py-3 text-left text-xs font-semibold w-[32%]">Security Desc.</th>
              <th className="px-2 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[5%]" onClick={() => requestSort('quantity')}>
                Qty{getSortArrow('quantity')}
              </th>
              <th className="px-2 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[10%]" onClick={() => requestSort('dateAcquired')}>
                Acquired{getSortArrow('dateAcquired')}
              </th>
              <th className="px-2 py-3 text-left text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[10%]" onClick={() => requestSort('dateSold')}>
                Sold{getSortArrow('dateSold')}
              </th>
              <th className="px-2 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[9%]" onClick={() => requestSort('proceeds')}>
                Proceeds{getSortArrow('proceeds')}
              </th>
              <th className="px-2 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[9%]" onClick={() => requestSort('costBasis')}>
                Cost{getSortArrow('costBasis')}
              </th>
              <th className="px-2 py-3 text-right text-xs font-semibold cursor-pointer hover:bg-gray-200 w-[10%]" onClick={() => requestSort('gainLoss')}>
                Gain/Loss{getSortArrow('gainLoss')}
              </th>
              <th className="px-2 py-3 text-center text-xs font-semibold w-[9%]">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((transaction, index) => (
              <tr key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-2 py-2 text-sm font-medium truncate" title={transaction.symbol}>
                  {getSymbolDisplay(transaction.symbol)}
                </td>
                <td className="px-2 py-2 text-sm truncate" title={transaction.securityDescription}>
                  {transaction.securityDescription}
                </td>
                <td className="px-2 py-2 text-sm">{transaction.quantity}</td>
                <td className="px-2 py-2 text-sm">{formatDate(transaction.dateAcquired)}</td>
                <td className="px-2 py-2 text-sm">{formatDate(transaction.dateSold)}</td>
                <td className="px-2 py-2 text-sm text-right">{formatCurrency(transaction.proceeds)}</td>
                <td className="px-2 py-2 text-sm text-right">{formatCurrency(transaction.costBasis)}</td>
                <td className={`px-2 py-2 text-sm text-right font-semibold ${transaction.gainLoss < 0 ? 'text-red-600' : 'text-black'}`}>
                  {formatCurrency(transaction.gainLoss)}
                </td>
                <td className="px-2 py-2 text-center">
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
      
      {sortedTransactions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {transactions.length === 0 
            ? 'No transactions yet. Add your first transaction above.' 
            : 'No transactions match the selected filters.'}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-4 border-t">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded text-sm ${
              currentPage === 1 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded text-sm ${
              currentPage === totalPages 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
