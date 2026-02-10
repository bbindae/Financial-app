import React from 'react';
import { Transaction } from '../types/Transaction';
import { groupByWeek, groupByMonth, calculateTotal, formatCurrency } from '../utils/calculations';
import { formatWeekDisplay, formatMonthDisplay } from '../utils/dateHelpers';

interface SummaryStatsProps {
  transactions: Transaction[];
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ transactions }) => {
  const weeklySummaries = groupByWeek(transactions);
  const monthlySummaries = groupByMonth(transactions);
  const total = calculateTotal(transactions);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Weekly Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-4">Weekly Summary</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {weeklySummaries.map(({ week, totalGainLoss }) => (
            <div key={week} className="flex justify-between items-center py-1 border-b">
              <span className="text-sm">{formatWeekDisplay(week)}</span>
              <span className={`text-sm font-semibold ${totalGainLoss < 0 ? 'text-red-600' : 'text-black'}`}>
                {formatCurrency(totalGainLoss)}
              </span>
            </div>
          ))}
          {weeklySummaries.length === 0 && (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-4">Monthly Summary</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {monthlySummaries.map(({ month, totalGainLoss }) => (
            <div key={month} className="flex justify-between items-center py-1 border-b">
              <span className="text-sm">{formatMonthDisplay(month)}</span>
              <span className={`text-sm font-semibold ${totalGainLoss < 0 ? 'text-red-600' : 'text-black'}`}>
                {formatCurrency(totalGainLoss)}
              </span>
            </div>
          ))}
          {monthlySummaries.length === 0 && (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-4">Total Summary</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-3xl font-bold">{transactions.length}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Overall Gain/Loss</p>
            <p className={`text-3xl font-bold ${total < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
