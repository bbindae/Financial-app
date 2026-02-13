import { format, parseISO, getYear } from 'date-fns';

export const formatDate = (date: string): string => {
  return format(parseISO(date), 'yyyy-MM-dd');
};

export const getMonthKey = (date: string): string => {
  return format(parseISO(date), 'yyyy-MM');
};

export const getWeekKey = (date: string): string => {
  const parsedDate = parseISO(date);
  const year = getYear(parsedDate);
  const month = parsedDate.getMonth(); // 0-indexed
  const dayOfMonth = parsedDate.getDate();
  
  // Calculate week of month (1-based)
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const weekOfMonth = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  
  // Format: "YYYY-MM-Wn" (e.g., "2026-02-W1")
  return `${year}-${String(month + 1).padStart(2, '0')}-W${weekOfMonth}`;
};

export const formatMonthDisplay = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yyyy');
};

export const formatWeekDisplay = (weekKey: string): string => {
  // weekKey format: "YYYY-MM-Wn" (e.g., "2026-02-W1")
  const parts = weekKey.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Convert to 0-indexed
  const weekNum = parseInt(parts[2].substring(1)); // Remove 'W' prefix
  
  // Get month name (short form)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[month];
  
  // Add suffix
  const suffix = weekNum === 1 ? 'st' : weekNum === 2 ? 'nd' : weekNum === 3 ? 'rd' : 'th';
  
  return `${year}-${monthName}-${weekNum}${suffix} week`;
};
