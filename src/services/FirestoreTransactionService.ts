import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction } from '../types/Transaction';
import { ITransactionService } from './TransactionService';

/**
 * Firestore implementation of ITransactionService
 * Stores transactions in Firestore under users/{userId}/transactions
 */
export class FirestoreTransactionService implements ITransactionService {
  private userId: string;
  private unsubscribe: (() => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get collection reference for user's transactions
   */
  private getCollectionRef() {
    return collection(db, 'users', this.userId, 'transactions');
  }

  /**
   * Convert Firestore Timestamp to Date string (ISO format)
   */
  private convertTimestampToDate(timestamp: any): string {
    if (!timestamp) return '';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    return '';
  }

  /**
   * Convert Date to Firestore Timestamp
   */
  private convertDateToTimestamp(dateString: string): Timestamp {
    if (!dateString) return Timestamp.now();
    return Timestamp.fromDate(new Date(dateString));
  }

  /**
   * Convert Firestore document to Transaction object
   */
  private docToTransaction(docSnapshot: any): Transaction {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      symbol: data.symbol,
      securityDescription: data.securityDescription || '',
      dateAcquired: this.convertTimestampToDate(data.dateAcquired),
      dateSold: this.convertTimestampToDate(data.dateSold),
      proceeds: data.proceeds,
      costBasis: data.costBasis,
      quantity: data.quantity || 0,
      gainLoss: data.proceeds - data.costBasis
    };
  }

  /**
   * Get all transactions for the user
   */
  async getAll(): Promise<Transaction[]> {
    try {
      const q = query(this.getCollectionRef(), orderBy('dateAcquired', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.docToTransaction(doc));
    } catch (error) {
      console.error('Error getting transactions from Firestore:', error);
      throw error;
    }
  }

  /**
   * Add a new transaction
   */
  async add(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    try {
      const docData = {
        symbol: transaction.symbol,
        securityDescription: transaction.securityDescription || '',
        dateAcquired: this.convertDateToTimestamp(transaction.dateAcquired),
        dateSold: this.convertDateToTimestamp(transaction.dateSold),
        proceeds: transaction.proceeds,
        costBasis: transaction.costBasis,
        quantity: transaction.quantity || 0
      };

      const docRef = await addDoc(this.getCollectionRef(), docData);
      return {
        ...transaction,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error adding transaction to Firestore:', error);
      throw error;
    }
  }

  /**
   * Bulk add transactions (for import)
   */
  async bulkAdd(transactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }> {
    try {
      const batch = writeBatch(db);
      let imported = 0;

      for (const transaction of transactions) {
        const docRef = doc(this.getCollectionRef());
        const docData = {
          symbol: transaction.symbol,
          securityDescription: transaction.securityDescription || '',
          dateAcquired: this.convertDateToTimestamp(transaction.dateAcquired),
          dateSold: this.convertDateToTimestamp(transaction.dateSold),
          proceeds: transaction.proceeds,
          costBasis: transaction.costBasis,
          quantity: transaction.quantity || 0
        };
        batch.set(docRef, docData);
        imported++;
      }

      await batch.commit();
      return { imported, skipped: 0 };
    } catch (error) {
      console.error('Error bulk adding transactions to Firestore:', error);
      throw error;
    }
  }

  /**
   * Update an existing transaction
   */
  async update(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    try {
      const docRef = doc(this.getCollectionRef(), id);
      const updateData: any = {};

      if (transaction.symbol !== undefined) updateData.symbol = transaction.symbol;
      if (transaction.securityDescription !== undefined) updateData.securityDescription = transaction.securityDescription;
      if (transaction.dateAcquired !== undefined) {
        updateData.dateAcquired = this.convertDateToTimestamp(transaction.dateAcquired);
      }
      if (transaction.dateSold !== undefined) {
        updateData.dateSold = this.convertDateToTimestamp(transaction.dateSold);
      }
      if (transaction.proceeds !== undefined) updateData.proceeds = transaction.proceeds;
      if (transaction.costBasis !== undefined) updateData.costBasis = transaction.costBasis;
      if (transaction.quantity !== undefined) updateData.quantity = transaction.quantity;

      await updateDoc(docRef, updateData);

      // Return updated transaction (merge with existing data)
      const allTransactions = await this.getAll();
      const updated = allTransactions.find(t => t.id === id);
      if (!updated) throw new Error('Transaction not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating transaction in Firestore:', error);
      throw error;
    }
  }

  /**
   * Delete a transaction
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(), id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting transaction from Firestore:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates
   * @param callback Function to call when transactions change
   * @returns Unsubscribe function
   */
  subscribeToChanges(callback: (transactions: Transaction[]) => void): () => void {
    const q = query(this.getCollectionRef(), orderBy('dateAcquired', 'desc'));
    
    this.unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactions = querySnapshot.docs.map(doc => this.docToTransaction(doc));
      callback(transactions);
    }, (error) => {
      console.error('Error in Firestore subscription:', error);
    });

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
