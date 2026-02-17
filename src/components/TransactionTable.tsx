import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/Transaction';
import { formatCurrency } from '../utils/calculations';

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onImport?: () => void;
  onAddTransaction?: () => void;
}

/**
 * Format date to yyyy-mm-dd
 * Dates are stored as YYYY-MM-DD strings in Los Angeles timezone
 * Display without UTC conversion to preserve the original date
 */
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // If already in YYYY-MM-DD format, return as is (no timezone conversion)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle ISO timestamp format (e.g., "2026-01-02T00:00:00.000Z")
  // Extract just the date part (YYYY-MM-DD)
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  // Parse other formats
  const [year, month, day] = dateString.includes('-') 
    ? dateString.split('-') 
    : dateString.split('/').reverse();
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  onDelete, 
  onImport, 
  onAddTransaction
}) => {
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

  // Extract only the leading alphabetic characters from symbol (before first number)
  const getSymbolDisplay = (symbol: string): string => {
    const match = symbol.match(/^[A-Za-z]+/);
    return match ? match[0] : symbol;
  };

  // Extract unique years and months from transactions
  const { years, months } = useMemo(() => {
    const yearSet = new Set<string>();
    const monthSet = new Set<string>();
    
    transactions.forEach(t => {
      // Extract date from YYYY-MM-DD or ISO timestamp format
      const dateStr = t.dateAcquired.includes('T') 
        ? t.dateAcquired.split('T')[0] 
        : t.dateAcquired;
      const [year, month] = dateStr.split('-');
      yearSet.add(year);
      monthSet.add(month);
    });
    
    return {
      years: Array.from(yearSet).sort((a, b) => b.localeCompare(a)),
      months: Array.from(monthSet).sort()
    };
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Extract date from YYYY-MM-DD or ISO timestamp format
      const dateStr = transaction.dateAcquired.includes('T') 
        ? transaction.dateAcquired.split('T')[0] 
        : transaction.dateAcquired;
      const [year, month] = dateStr.split('-');
      
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

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <>
      {/* Filters and Action Buttons */}
      <div className="flex justify-between items-end mb-4 gap-4">
        {/* Left side - Filters */}
        <div className="flex gap-4 items-end">
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
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
            >
              Reset to This Month
            </button>
          )}
          
          <div className="text-sm text-gray-600">
            Showing {paginatedTransactions.length} of {sortedTransactions.length} transactions
          </div>
        </div>
        
        {/* Right side - Action Buttons */}
        {(onImport || onAddTransaction) && (
          <div className="flex gap-3">
            {onImport && (
              <button
                onClick={onImport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import from Sheets
              </button>
            )}
            {onAddTransaction && (
              <button
                onClick={onAddTransaction}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Transaction
              </button>
            )}
          </div>
        )}
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
    </>
  );
};
