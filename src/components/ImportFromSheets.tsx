import React, { useState } from 'react';
import { Transaction } from '../types/Transaction';

interface ImportFromSheetsProps {
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ imported: number; skipped: number }>;
  onClose?: () => void;
}

export const ImportFromSheets: React.FC<ImportFromSheetsProps> = ({ onImport, onClose }) => {
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importMethod, setImportMethod] = useState<'url' | 'file'>('url');

  const convertSheetsUrlToCsv = (url: string): string => {
    // Convert Google Sheets URL to CSV export URL
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    
    if (!sheetIdMatch) {
      throw new Error('Invalid Google Sheets URL');
    }
    
    const sheetId = sheetIdMatch[1];
    const gid = gidMatch ? gidMatch[1] : '0';
    
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  };

  const parseCsvToTransactions = (csvText: string): Omit<Transaction, 'id'>[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const transactions: Omit<Transaction, 'id'>[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Parse CSV line (handle quoted values)
      const values = parseCsvLine(line);
      
      if (values.length < 7) continue;

      const [symbol, securityDescription, quantity, dateAcquired, dateSold, proceeds, costBasis] = values;

      const proceedsNum = parseFloat(proceeds.replace(/[,$]/g, ''));
      const costBasisNum = parseFloat(costBasis.replace(/[,$]/g, ''));

      if (isNaN(proceedsNum) || isNaN(costBasisNum)) {
        continue;
      }

      transactions.push({
        symbol: symbol.trim(),
        securityDescription: securityDescription.trim(),
        quantity: parseFloat(quantity) || 0,
        dateAcquired: formatDate(dateAcquired.trim()),
        dateSold: formatDate(dateSold.trim()),
        proceeds: proceedsNum,
        costBasis: costBasisNum,
        gainLoss: proceedsNum - costBasisNum,
      });
    }

    return transactions;
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const formatDate = (dateStr: string): string => {
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toISOString().split('T')[0];
  };

  const handleImportFromUrl = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const csvUrl = convertSheetsUrlToCsv(sheetsUrl);
      
      // Use a CORS proxy or fetch directly if sheets is public
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data. Make sure the sheet is publicly accessible.');
      }

      const csvText = await response.text();
      const transactions = parseCsvToTransactions(csvText);
      
      if (transactions.length === 0) {
        setError('No valid transactions found');
        setLoading(false);
        return;
      }

      const importResult = await onImport(transactions);
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setLoading(true);

    try {
      const text = await file.text();
      const transactions = parseCsvToTransactions(text);
      
      if (transactions.length === 0) {
        setError('No valid transactions found');
        setLoading(false);
        return;
      }

      const importResult = await onImport(transactions);
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Import from Google Sheets</h2>
      
      {/* Import Method Selection */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setImportMethod('url')}
            className={`px-4 py-2 rounded-md transition-colors ${
              importMethod === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Import from URL
          </button>
          <button
            onClick={() => setImportMethod('file')}
            className={`px-4 py-2 rounded-md transition-colors ${
              importMethod === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upload CSV File
          </button>
        </div>
      </div>

      {importMethod === 'url' ? (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Google Sheets URL</label>
            <input
              type="text"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-2">
              Note: The Google Sheet must be publicly accessible (Share → Anyone with the link can view)
            </p>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-sm mb-2">Expected CSV Format:</h3>
            <code className="text-xs block bg-white p-2 rounded">
              Symbol, Security Description, Quantity, Date Acquired, Date Sold, Proceeds, Cost Basis
            </code>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
              <p className="font-semibold">Import completed!</p>
              <p className="text-sm">Imported: {result.imported} transactions</p>
              <p className="text-sm">Skipped (duplicates): {result.skipped} transactions</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImportFromUrl}
              disabled={loading || !sheetsUrl}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import Transactions'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportFromFile}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-sm mb-2">Expected CSV Format:</h3>
            <code className="text-xs block bg-white p-2 rounded">
              Symbol, Security Description, Quantity, Date Acquired, Date Sold, Proceeds, Cost Basis
            </code>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
              <p className="font-semibold">Import completed!</p>
              <p className="text-sm">Imported: {result.imported} transactions</p>
              <p className="text-sm">Skipped (duplicates): {result.skipped} transactions</p>
            </div>
          )}

          {onClose && (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
