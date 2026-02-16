import React, { useState } from 'react';
import { Transaction } from '../types/Transaction';
import { calculateGainLoss } from '../utils/calculations';

interface TransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onClose?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, onClose }) => {
  // Dates are in Los Angeles timezone - HTML input type="date" uses local timezone
  // Values are stored as YYYY-MM-DD strings without timezone conversion
  const [formData, setFormData] = useState({
    symbol: '',
    securityDescription: '',
    quantity: 0,
    dateAcquired: '',
    dateSold: '',
  });
  const [proceeds, setProceeds] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [errors, setErrors] = useState<{
    proceeds?: string;
    costBasis?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate amounts
    const proceedsValid = validateAmount(proceeds);
    const costBasisValid = validateAmount(costBasis);
    
    if (!proceedsValid || !costBasisValid) {
      setErrors({
        proceeds: !proceedsValid ? 'Please enter a valid amount' : undefined,
        costBasis: !costBasisValid ? 'Please enter a valid amount' : undefined,
      });
      return;
    }

    const proceedsNum = parseFloat(proceeds.replace(/,/g, ''));
    const costBasisNum = parseFloat(costBasis.replace(/,/g, ''));

    const newTransaction: Omit<Transaction, 'id'> = {
      ...formData,
      proceeds: proceedsNum,
      costBasis: costBasisNum,
      gainLoss: calculateGainLoss(proceedsNum, costBasisNum),
    };

    await onSubmit(newTransaction);
    
    // Reset form
    setFormData({
      symbol: '',
      securityDescription: '',
      quantity: 0,
      dateAcquired: '',
      dateSold: '',
    });
    setProceeds('');
    setCostBasis('');
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const validateAmount = (value: string): boolean => {
    if (!value || value.trim() === '') return false;
    const num = parseFloat(value.replace(/,/g, ''));
    return !isNaN(num) && num >= 0;
  };

  const handleProceedsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProceeds(value);
    
    if (value && !validateAmount(value)) {
      setErrors(prev => ({ ...prev, proceeds: 'Please enter a valid amount' }));
    } else {
      setErrors(prev => ({ ...prev, proceeds: undefined }));
    }
  };

  const handleCostBasisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCostBasis(value);
    
    if (value && !validateAmount(value)) {
      setErrors(prev => ({ ...prev, costBasis: 'Please enter a valid amount' }));
    } else {
      setErrors(prev => ({ ...prev, costBasis: undefined }));
    }
  };

  const getCalculatedGainLoss = (): number => {
    const proceedsNum = proceeds && validateAmount(proceeds) ? parseFloat(proceeds.replace(/,/g, '')) : 0;
    const costBasisNum = costBasis && validateAmount(costBasis) ? parseFloat(costBasis.replace(/,/g, '')) : 0;
    return calculateGainLoss(proceedsNum, costBasisNum);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-2xl font-bold mb-6">New Transaction</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol (CUSIP)</label>
          <input
            type="text"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Security Description</label>
          <textarea
            name="securityDescription"
            value={formData.securityDescription}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date Acquired</label>
          <input
            type="date"
            name="dateAcquired"
            value={formData.dateAcquired}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date Sold</label>
          <input
            type="date"
            name="dateSold"
            value={formData.dateSold}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Proceeds ($)</label>
          <input
            type="text"
            id="proceeds"
            value={proceeds}
            onChange={handleProceedsChange}
            placeholder=""
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.proceeds && <span className="text-red-600 text-sm mt-1 block">{errors.proceeds}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cost Basis ($)</label>
          <input
            type="text"
            id="costBasis"
            value={costBasis}
            onChange={handleCostBasisChange}
            placeholder=""
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.costBasis && <span className="text-red-600 text-sm mt-1 block">{errors.costBasis}</span>}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded">
        <span className="font-medium">Calculated Gain/Loss: </span>
        <span className={getCalculatedGainLoss() < 0 ? 'text-red-600' : 'text-black'}>
          {formatCurrency(getCalculatedGainLoss())}
        </span>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Transaction
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};
