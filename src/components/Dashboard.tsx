import React, { useState, useEffect } from 'react';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';
import { SummaryStats } from './SummaryStats';
import { MonthlyChart } from './MonthlyChart';
import { Modal } from './Modal';
import { ImportFromSheets } from './ImportFromSheets';
import { OptionForm } from './OptionForm';
import WatchList from './WatchList';
import { useTransactions } from '../hooks/useTransactions';
import { useOptions } from '../hooks/useOptions';
import { useWatchList } from '../hooks/useWatchList';
import { useAuth } from '../hooks/useAuth';
import { Transaction } from '../types/Transaction';
import { Option } from '../types/Option';
import { 
  hasLocalStorageData, 
  isMigrationCompleted, 
  migrateFromLocalStorage 
} from '../utils/dataMigration';

/**
 * Main Dashboard component for the Option Trading Tracker
 * Manages transaction data and provides UI for adding, importing, and viewing trades
 */
const Dashboard: React.FC = () => {
  // Fetch transactions data and CRUD operations from custom hook
  const { transactions, loading, addTransaction, bulkImportTransactions, deleteTransaction } = useTransactions();
  
  // Fetch options data and CRUD operations
  const { currentUser } = useAuth();
  const { options, loading: optionsLoading, addOption, deleteOption } = useOptions(currentUser?.uid);
  
  // Fetch watchlist for option symbol dropdown
  const { items: watchListItems } = useWatchList(currentUser?.uid);
  
  // Authentication context for logout functionality
  const { signOut } = useAuth();
  
  // State for controlling the "Add Transaction" modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for controlling the "Add Option" modal visibility
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  
  // State for controlling the "Import from Sheets" modal visibility
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Migration state
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Check if migration is needed
  useEffect(() => {
    if (currentUser && hasLocalStorageData() && !isMigrationCompleted()) {
      console.log('LocalStorage data detected, showing migration banner');
      setShowMigrationBanner(true);
    }
  }, [currentUser]);

  /**
   * Handles adding a new transaction
   * Closes the modal after successful addition
   */
  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await addTransaction(transaction);
    setIsModalOpen(false);
  };

  /**
   * Handles adding a new option
   * Closes the modal after successful addition
   */
  const handleAddOption = async (option: Omit<Option, 'id' | 'userId' | 'createdAt'>) => {
    await addOption(option);
    setIsOptionModalOpen(false);
  };

  /**
   * Handles bulk import of transactions from Google Sheets
   * Returns count of imported and skipped transactions
   */
  const handleImport = async (transactions: Omit<Transaction, 'id'>[]): Promise<{ imported: number; skipped: number }> => {
    return await bulkImportTransactions(transactions);
  };

  /**
   * Handles user logout
   */
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * Handles migration from LocalStorage to Firestore
   */
  const handleMigrate = async () => {
    if (!currentUser) return;

    setMigrationInProgress(true);
    setMigrationError(null);

    try {
      const result = await migrateFromLocalStorage(
        currentUser.uid,
        (current, total) => {
          setMigrationProgress({ current, total });
        }
      );

      if (result.success) {
        console.log(`Migration completed: ${result.count} transactions migrated`);
        setMigrationComplete(true);
        setShowMigrationBanner(false);
        // Refresh to load Firestore data
        window.location.reload();
      } else {
        setMigrationError(result.error || 'Migration failed');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      setMigrationError(error.message || 'Unknown error occurred');
    } finally {
      setMigrationInProgress(false);
    }
  };

  // Show loading spinner while fetching initial transaction data
  if (loading || optionsLoading) {
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
        <header className="mb-8">
          {/* Top bar with logout button */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-4">
              {currentUser && (
                <span className="text-sm text-gray-600">
                  {currentUser.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Option Trading Tracker</h1>
            <p className="text-gray-600 mt-2">Track and analyze your option trading performance</p>
          </div>
        </header>

        {/* Migration Banner */}
        {showMigrationBanner && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-md">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Migrate to Firebase Cloud Storage
                </h3>
                <p className="text-blue-800 mb-4">
                  We detected transactions stored locally in your browser. 
                  Migrate them to Firebase Cloud Storage for better reliability, 
                  multi-device sync, and automatic backups.
                </p>
                
                {migrationInProgress && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-blue-700 mb-2">
                      <span>Migrating transactions...</span>
                      <span>{migrationProgress.current} / {migrationProgress.total}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${migrationProgress.total > 0 ? (migrationProgress.current / migrationProgress.total) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {migrationError && (
                  <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
                    <strong>Error:</strong> {migrationError}
                  </div>
                )}

                {migrationComplete && (
                  <div className="mb-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded">
                    Migration completed successfully! Reloading...
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleMigrate}
                    disabled={migrationInProgress}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed font-semibold"
                  >
                    {migrationInProgress ? 'Migrating...' : 'Migrate Now'}
                  </button>
                  <button
                    onClick={() => setShowMigrationBanner(false)}
                    disabled={migrationInProgress}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
                  >
                    Remind Me Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Watch List section - Real-time stock prices */}
        <div className="mb-6">
          <WatchList 
            userId={currentUser?.uid}
            options={options}
            onDeleteOption={deleteOption}
            onAddOption={() => setIsOptionModalOpen(true)}
          />
        </div>

        {/* Transaction History Panel */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Transaction History</h2>
          <TransactionTable 
            transactions={transactions}
            onDelete={deleteTransaction}
            onImport={() => setIsImportModalOpen(true)}
            onAddTransaction={() => setIsModalOpen(true)}
          />
        </div>
        
        {/* Summary statistics section */}
        <SummaryStats transactions={transactions} />
        
        {/* Monthly performance chart */}
        <MonthlyChart transactions={transactions} />

        {/* Modal for adding individual transactions manually */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <TransactionForm onSubmit={handleAddTransaction} onClose={() => setIsModalOpen(false)} />
        </Modal>

        {/* Modal for adding option trades */}
        <Modal isOpen={isOptionModalOpen} onClose={() => setIsOptionModalOpen(false)}>
          <OptionForm 
            onSubmit={handleAddOption} 
            onClose={() => setIsOptionModalOpen(false)}
            watchListItems={watchListItems}
          />
        </Modal>

        {/* Modal for bulk importing transactions from Google Sheets */}
        <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
          <ImportFromSheets 
            onImport={handleImport} 
            onClose={() => setIsImportModalOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;