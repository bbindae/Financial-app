import React, { useState, useMemo } from 'react';
import { TransactionForm } from './components/TransactionForm';
import { TransactionTable } from './components/TransactionTable';
import { SummaryStats } from './components/SummaryStats';
import { MonthlyChart } from './components/MonthlyChart';
import { Modal } from './components/Modal';
import { ImportFromSheets } from './components/ImportFromSheets';
import { useTransactions } from './hooks/useTransactions';
import { Transaction } from './types/Transaction';

/**
 * Main application component for the Option Trading Tracker
 * Manages transaction data and provides UI for adding, importing, and viewing trades
 */
function App() {
  // Fetch transactions data and CRUD operations from custom hook
  const { transactions, loading, addTransaction, bulkImportTransactions, deleteTransaction } = useTransactions();
  
  // State for controlling the "Add Transaction" modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for controlling the "Import from Sheets" modal visibility
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Memoized set of existing symbols to prevent duplicate imports
  // Recalculates only when transactions array changes
  const existingSymbols = useMemo(() => {
    return new Set(transactions.map(t => t.symbol));
  }, [transactions]);

  /**
   * Handles adding a new transaction
   * Closes the modal after successful addition
   */
  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await addTransaction(transaction);
    setIsModalOpen(false);
  };

  /**
   * Handles bulk import of transactions from Google Sheets
   * Returns count of imported and skipped transactions
   */
  const handleImport = async (transactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }> => {
    return await bulkImportTransactions(transactions);
  };

  // Show loading spinner while fetching initial transaction data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header section with title and action buttons */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Option Trading Tracker</h1>
            <p className="text-gray-600 mt-2">Track and analyze your option trading performance</p>
          </div>
          {/* Action buttons for importing and adding transactions */}
          <div className="flex gap-3">
            {/* Import from Google Sheets button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import from Sheets
            </button>
            {/* Manual transaction entry button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Transaction
            </button>
          </div>
        </header>

        {/* Main content area with transaction table and analytics */}
        <div className="mb-6">
          <TransactionTable transactions={transactions} onDelete={deleteTransaction} />
        </div>
        
        {/* Summary statistics section */}
        <SummaryStats transactions={transactions} />
        
        {/* Monthly performance chart */}
        <MonthlyChart transactions={transactions} />

        {/* Modal for adding individual transactions manually */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <TransactionForm onSubmit={handleAddTransaction} onClose={() => setIsModalOpen(false)} />
        </Modal>

        {/* Modal for bulk importing transactions from Google Sheets */}
        <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
          <ImportFromSheets 
            onImport={handleImport} 
            onClose={() => setIsImportModalOpen(false)}
            existingSymbols={existingSymbols}
          />
        </Modal>
      </div>
    </div>
  );
}

export default App;
