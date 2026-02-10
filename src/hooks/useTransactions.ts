import { useState, useEffect } from 'react';
import { Transaction } from '../types/Transaction';
import { transactionService } from '../services/TransactionService';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await transactionService.getAll();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      await transactionService.add(transaction);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await transactionService.delete(id);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions,
  };
};
