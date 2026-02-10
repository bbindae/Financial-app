import { format, parseISO, startOfWeek, getYear, getWeek } from 'date-fns';

export const formatDate = (date: string): string => {
  return format(parseISO(date), 'yyyy-MM-dd');
};

export const getMonthKey = (date: string): string => {
  return format(parseISO(date), 'yyyy-MM');
};

export const getWeekKey = (date: string): string => {
  const parsedDate = parseISO(date);
  const year = getYear(parsedDate);
  const week = getWeek(parsedDate);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

export const formatMonthDisplay = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy');
};

export const formatWeekDisplay = (weekKey: string): string => {
  // weekKey format: "YYYY-Www" (e.g., "2026-W01")
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr);
  const weekNum = parseInt(weekStr);
  
  // Calculate the first day of the year
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToFirstMonday = (8 - firstDayOfYear.getDay()) % 7;
  
  // Calculate the date for this week
  const weekDate = new Date(year, 0, 1 + daysToFirstMonday + (weekNum - 1) * 7);
  
  // Get the month name (short form)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[weekDate.getMonth()];
  
  // Get week of month
  const firstDayOfMonth = new Date(weekDate.getFullYear(), weekDate.getMonth(), 1);
  const dayOfMonth = weekDate.getDate();
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const weekOfMonth = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  
  // Add suffix
  const suffix = weekOfMonth === 1 ? 'st' : weekOfMonth === 2 ? 'nd' : weekOfMonth === 3 ? 'rd' : 'th';
  
  return `${year}-${month}-${weekOfMonth}${suffix} week`;
};
