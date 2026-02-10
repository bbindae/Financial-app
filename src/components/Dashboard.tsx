import React, { useMemo } from 'react';
import { formatWeekLabel, getWeekStart } from '../utils/dateUtils';
import { Transaction } from '../types/Transaction';

interface DashboardProps {
  transactions: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const weeklySummary = useMemo(() => {
    const summary: { [key: string]: { totalProceeds: number; totalCostBasis: number; totalGain: number } } = {};
    
    transactions.forEach(transaction => {
      if (transaction.dateAcquired) {
        const weekStart = getWeekStart(new Date(transaction.dateAcquired));
        const weekLabel = formatWeekLabel(weekStart);
        
        if (!summary[weekLabel]) {
          summary[weekLabel] = { totalProceeds: 0, totalCostBasis: 0, totalGain: 0 };
        }
        
        summary[weekLabel].totalProceeds += transaction.proceeds;
        summary[weekLabel].totalCostBasis += transaction.costBasis;
        summary[weekLabel].totalGain += transaction.proceeds - transaction.costBasis;
      }
    });
    
    return Object.entries(summary)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => b.week.localeCompare(a.week));
  }, [transactions]);

  return (
    <div>
      <h2>Weekly Summary</h2>
      {weeklySummary.map((item) => (
        <div key={item.week}>
          <h3>{item.week}</h3>
          <p>Total Proceeds: {item.totalProceeds}</p>
          <p>Total Cost Basis: {item.totalCostBasis}</p>
          <p>Total Gain: {item.totalGain}</p>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;