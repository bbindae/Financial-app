import { useState, useEffect, useRef } from 'react';
import { Transaction } from '../types/Transaction';
import { FirestoreTransactionService } from '../services/FirestoreTransactionService';
import { useAuth } from './useAuth';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const serviceRef = useRef<FirestoreTransactionService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize Firestore service when user is available
  useEffect(() => {
    if (currentUser) {
      console.log('Initializing FirestoreTransactionService for user:', currentUser.uid);
      serviceRef.current = new FirestoreTransactionService(currentUser.uid);
      
      // Subscribe to real-time updates
      unsubscribeRef.current = serviceRef.current.subscribeToChanges((updatedTransactions) => {
        console.log('Firestore transactions updated:', updatedTransactions.length);
        setTransactions(updatedTransactions);
        setLoading(false);
      });
    }

    // Cleanup subscription on unmount or user change
    return () => {
      if (unsubscribeRef.current) {
        console.log('Cleaning up Firestore subscription');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (serviceRef.current) {
        serviceRef.current.cleanup();
        serviceRef.current = null;
      }
    };
  }, [currentUser]);

  const loadTransactions = async () => {
    if (!serviceRef.current) {
      console.warn('TransactionService not initialized');
      return;
    }

    setLoading(true);
    try {
      const data = await serviceRef.current.getAll();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!serviceRef.current) {
      throw new Error('TransactionService not initialized');
    }

    try {
      await serviceRef.current.add(transaction);
      // Real-time subscription will update the state automatically
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  };

  const bulkImportTransactions = async (transactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }> => {
    if (!serviceRef.current) {
      throw new Error('TransactionService not initialized');
    }

    try {
      const result = await serviceRef.current.bulkAdd(transactions);
      // Real-time subscription will update the state automatically
      return result;
    } catch (error) {
      console.error('Failed to import transactions:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!serviceRef.current) {
      throw new Error('TransactionService not initialized');
    }

    try {
      await serviceRef.current.delete(id);
      // Real-time subscription will update the state automatically
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    bulkImportTransactions,
    deleteTransaction,
    refreshTransactions: loadTransactions,
  };
};
