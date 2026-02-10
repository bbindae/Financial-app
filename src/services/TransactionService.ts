import { Transaction } from '../types/Transaction';

export interface ITransactionService {
  getAll(): Promise<Transaction[]>;
  add(transaction: Omit<Transaction, 'id'>): Promise<Transaction>;
  bulkAdd(transactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }>;
  update(id: string, transaction: Partial<Transaction>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

// LocalStorage implementation
export class LocalStorageTransactionService implements ITransactionService {
  private readonly STORAGE_KEY = 'option_transactions';

  async getAll(): Promise<Transaction[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  async add(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const transactions = await this.getAll();
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    transactions.push(newTransaction);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    return newTransaction;
  }

  async bulkAdd(newTransactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }> {
    const existingTransactions = await this.getAll();
    const existingSymbols = new Set(existingTransactions.map(t => t.symbol));
    
    let imported = 0;
    let skipped = 0;
    
    const transactionsToAdd: Transaction[] = [];
    
    for (const transaction of newTransactions) {
      if (existingSymbols.has(transaction.symbol)) {
        skipped++;
      } else {
        transactionsToAdd.push({
          ...transaction,
          id: crypto.randomUUID(),
        });
        existingSymbols.add(transaction.symbol);
        imported++;
      }
    }
    
    if (transactionsToAdd.length > 0) {
      const allTransactions = [...existingTransactions, ...transactionsToAdd];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allTransactions));
    }
    
    return { imported, skipped };
  }

  async update(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    const transactions = await this.getAll();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaction not found');
    
    transactions[index] = { ...transactions[index], ...transaction };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    return transactions[index];
  }

  async delete(id: string): Promise<void> {
    const transactions = await this.getAll();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }
}

export const transactionService = new LocalStorageTransactionService();
