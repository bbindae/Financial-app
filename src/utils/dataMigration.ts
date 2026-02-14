import { LocalStorageTransactionService } from '../services/TransactionService';
import { FirestoreTransactionService } from '../services/FirestoreTransactionService';

const MIGRATION_STATUS_KEY = 'firestore_migration_status';
const LOCAL_STORAGE_BACKUP_KEY = 'option_transactions_backup';

export interface MigrationStatus {
  completed: boolean;
  date?: string;
  transactionCount?: number;
}

/**
 * Check if migration has been completed
 */
export const isMigrationCompleted = (): boolean => {
  const status = localStorage.getItem(MIGRATION_STATUS_KEY);
  if (!status) return false;
  const parsed: MigrationStatus = JSON.parse(status);
  return parsed.completed === true;
};

/**
 * Mark migration as completed
 */
export const setMigrationCompleted = (transactionCount: number): void => {
  const status: MigrationStatus = {
    completed: true,
    date: new Date().toISOString(),
    transactionCount
  };
  localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
};

/**
 * Check if there is data in localStorage to migrate
 */
export const hasLocalStorageData = (): boolean => {
  const data = localStorage.getItem('option_transactions');
  return data !== null && data !== '[]';
};

/**
 * Migrate data from LocalStorage to Firestore
 */
export const migrateFromLocalStorage = async (
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    console.log('Starting migration from LocalStorage to Firestore...');
    
    // Get data fromLocalStorage
    const localService = new LocalStorageTransactionService();
    const transactions = await localService.getAll();
    
    if (transactions.length === 0) {
      console.log('No transactions to migrate');
      setMigrationCompleted(0);
      return { success: true, count: 0 };
    }

    console.log(`Found ${transactions.length} transactions to migrate`);

    // Create Firestore service
    const firestoreService = new FirestoreTransactionService(userId);

    // Backup localStorage data before migration
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(transactions));
    console.log('localStorage data backed up');

    // Migrate transactions
    const transactionsWithoutId = transactions.map(({ id, ...rest }) => rest);
    
    if (onProgress) onProgress(0, transactions.length);
    
    const result = await firestoreService.bulkAdd(transactionsWithoutId);
    
    if (onProgress) onProgress(result.imported, transactions.length);

    console.log(`Migration completed: ${result.imported} imported, ${result.skipped} skipped`);

    // Mark migration as completed
    setMigrationCompleted(result.imported);

    // Optionally clear localStorage (keeping backup)
    // localStorage.removeItem('option_transactions');

    return { success: true, count: result.imported };
  } catch (error: any) {
    console.error('Migration failed:', error);
    return { success: false, count: 0, error: error.message };
  }
};

/**
 * Export Firestore data back to localStorage (for backup)
 */
export const exportToLocalStorage = async (userId: string): Promise<boolean> => {
  try {
    const firestoreService = new FirestoreTransactionService(userId);
    const transactions = await firestoreService.getAll();
    
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(transactions));
    console.log(`Exported ${transactions.length} transactions to localStorage backup`);
    
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    return false;
  }
};

/**
 * Get migration status
 */
export const getMigrationStatus = (): MigrationStatus | null => {
  const status = localStorage.getItem(MIGRATION_STATUS_KEY);
  if (!status) return null;
  return JSON.parse(status);
};

/**
 * Reset migration status (for testing)
 */
export const resetMigrationStatus = (): void => {
  localStorage.removeItem(MIGRATION_STATUS_KEY);
};
