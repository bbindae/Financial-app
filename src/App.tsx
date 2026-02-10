import React, { useState, useMemo } from 'react';
import { TransactionForm } from './components/TransactionForm';
import { TransactionTable } from './components/TransactionTable';
import { SummaryStats } from './components/SummaryStats';
import { MonthlyChart } from './components/MonthlyChart';
import { Modal } from './components/Modal';
import { ImportFromSheets } from './components/ImportFromSheets';
import { useTransactions } from './hooks/useTransactions';
import { Transaction } from './types/Transaction';

function App() {
  const { transactions, loading, addTransaction, bulkImportTransactions, deleteTransaction } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const existingSymbols = useMemo(() => {
    return new Set(transactions.map(t => t.symbol));
  }, [transactions]);

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await addTransaction(transaction);
    setIsModalOpen(false);
  };

  const handleImport = async (transactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }> => {
    return await bulkImportTransactions(transactions);
  };

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
        <header className="mb-8 flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import from Sheets
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Transaction
            </button>
          </divlassName="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Transaction
          </button>
        </header>


        <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
          <ImportFromSheets 
            onImport={handleImport} 
            onClose={() => setIsImportModalOpen(false)}
            existingSymbols={existingSymbols}
          />
        </Modal>
        <div className="mb-6">
          <TransactionTable transactions={transactions} onDelete={deleteTransaction} />
        </div>
        
        <SummaryStats transactions={transactions} />
        
        <MonthlyChart transactions={transactions} />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <TransactionForm onSubmit={handleAddTransaction} onClose={() => setIsModalOpen(false)} />
        </Modal>
      </div>
    </div>
  );
}

export default App;
