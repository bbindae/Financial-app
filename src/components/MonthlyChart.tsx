import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Transaction } from '../types/Transaction';
import { groupByMonth, formatCurrency } from '../utils/calculations';
import { formatMonthDisplay } from '../utils/dateHelpers';

interface MonthlyChartProps {
  transactions: Transaction[];
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ transactions }) => {
  const monthlySummaries = groupByMonth(transactions);

  const chartData = monthlySummaries.map(({ month, totalGainLoss }) => ({
    month: formatMonthDisplay(month),
    value: totalGainLoss,
    displayValue: formatCurrency(totalGainLoss),
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Monthly Gain/Loss Chart</h2>
      
      {chartData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No data available for chart
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#3B82F6' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Display values below chart */}
      {chartData.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {chartData.map((data, index) => (
            <div key={index} className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600 mb-1">{data.month}</div>
              <div className={`text-sm font-semibold ${parseFloat(data.displayValue.replace(/[^0-9.-]/g, '')) < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {data.displayValue}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
