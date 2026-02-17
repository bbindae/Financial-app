import React, { useState } from 'react';
import { Option, OptionType } from '../types/Option';
import { WatchListItem } from '../types/WatchList';

interface OptionFormProps {
  onSubmit: (option: Omit<Option, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onClose?: () => void;
  watchListItems: WatchListItem[];
}

export const OptionForm: React.FC<OptionFormProps> = ({ onSubmit, onClose, watchListItems }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    optionType: 'SELL_PUT' as OptionType,
    quantity: 1,
    strikePrice: 0,
    expirationDate: '',
  });
  const [optionPrice, setOptionPrice] = useState('');
  const [errors, setErrors] = useState<{
    optionPrice?: string;
    strikePrice?: string;
    expirationDate?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate amounts
    const optionPriceValid = validateAmount(optionPrice);
    const strikePriceValid = formData.strikePrice > 0;
    const expirationValid = validateExpirationDate(formData.expirationDate);
    
    if (!optionPriceValid || !strikePriceValid || !expirationValid) {
      setErrors({
        optionPrice: !optionPriceValid ? 'Please enter a valid option price' : undefined,
        strikePrice: !strikePriceValid ? 'Please enter a valid strike price' : undefined,
        expirationDate: !expirationValid ? 'Expiration date must be in the future' : undefined,
      });
      return;
    }

    const optionPriceNum = parseFloat(optionPrice.replace(/,/g, ''));

    const newOption: Omit<Option, 'id' | 'userId' | 'createdAt'> = {
      ...formData,
      optionPrice: optionPriceNum,
    };

    await onSubmit(newOption);
    
    // Reset form
    setFormData({
      symbol: '',
      optionType: 'SELL_PUT',
      quantity: 1,
      strikePrice: 0,
      expirationDate: '',
    });
    setOptionPrice('');
    setErrors({});
  };

  const validateAmount = (value: string): boolean => {
    if (!value || value.trim() === '') return false;
    const num = parseFloat(value.replace(/,/g, ''));
    return !isNaN(num) && num >= 0;
  };

  const validateExpirationDate = (date: string): boolean => {
    if (!date) return false;
    const expDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expDate >= today;
  };

  const handleOptionPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOptionPrice(value);
    
    if (value && !validateAmount(value)) {
      setErrors(prev => ({ ...prev, optionPrice: 'Please enter a valid amount' }));
    } else {
      setErrors(prev => ({ ...prev, optionPrice: undefined }));
    }
  };

  const handleStrikePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({ ...prev, strikePrice: value }));
    
    if (value <= 0) {
      setErrors(prev => ({ ...prev, strikePrice: 'Please enter a valid strike price' }));
    } else {
      setErrors(prev => ({ ...prev, strikePrice: undefined }));
    }
  };

  const handleExpirationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, expirationDate: value }));
    
    if (!validateExpirationDate(value)) {
      setErrors(prev => ({ ...prev, expirationDate: 'Expiration date must be in the future' }));
    } else {
      setErrors(prev => ({ ...prev, expirationDate: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-2xl font-bold mb-6">New Option Trade</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Symbol</label>
          <select
            name="symbol"
            value={formData.symbol}
            onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a symbol</option>
            {watchListItems.map(item => (
              <option key={item.id} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Option Type</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="optionType"
                value="SELL_PUT"
                checked={formData.optionType === 'SELL_PUT'}
                onChange={(e) => setFormData(prev => ({ ...prev, optionType: e.target.value as OptionType }))}
                className="mr-2"
              />
              Sell Put
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="optionType"
                value="BUY_CALL"
                checked={formData.optionType === 'BUY_CALL'}
                onChange={(e) => setFormData(prev => ({ ...prev, optionType: e.target.value as OptionType }))}
                className="mr-2"
              />
              Buy Call
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="optionType"
                value="BUY_PUT"
                checked={formData.optionType === 'BUY_PUT'}
                onChange={(e) => setFormData(prev => ({ ...prev, optionType: e.target.value as OptionType }))}
                className="mr-2"
              />
              Buy Put
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Quantity (Contracts)</label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
            required
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Option Price (per contract)</label>
          <input
            type="text"
            name="optionPrice"
            value={optionPrice}
            onChange={handleOptionPriceChange}
            onBlur={handleOptionPriceChange}
            required
            placeholder="0.00"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.optionPrice ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.optionPrice && (
            <p className="text-red-500 text-sm mt-1">{errors.optionPrice}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Strike Price</label>
          <input
            type="number"
            name="strikePrice"
            value={formData.strikePrice || ''}
            onChange={handleStrikePriceChange}
            onBlur={handleStrikePriceChange}
            required
            step="0.01"
            min="0.01"
            placeholder="0.00"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.strikePrice ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.strikePrice && (
            <p className="text-red-500 text-sm mt-1">{errors.strikePrice}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Expiration Date</label>
          <input
            type="date"
            name="expirationDate"
            value={formData.expirationDate}
            onChange={handleExpirationChange}
            onBlur={handleExpirationChange}
            required
            min={new Date().toISOString().split('T')[0]}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.expirationDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.expirationDate && (
            <p className="text-red-500 text-sm mt-1">{errors.expirationDate}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3 justify-end">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Option
        </button>
      </div>
    </form>
  );
};
