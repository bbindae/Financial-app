import React, { useState } from 'react';
import { TransactionForm } from './components/TransactionForm';
import { TransactionTable } from './components/TransactionTable';
import { SummaryStats } from './components/SummaryStats';
import { MonthlyChart } from './components/MonthlyChart';
import { Modal } from './components/Modal';
import { useTransactions } from './hooks/useTransactions';
import { Transaction } from './types/Transaction';

function App() {
  const { transactions, loading, addTransaction, deleteTransaction } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await addTransaction(transaction);
    setIsModalOpen(false);
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
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Option Trading Tracker</h1>
            <p className="text-gray-600 mt-2">Track and analyze your option trading performance</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Transaction
          </button>
        </header>

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
