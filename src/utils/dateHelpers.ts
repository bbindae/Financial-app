import { format, getYear } from 'date-fns';

/**
 * Parse YYYY-MM-DD string to local Date object
 * Avoids timezone issues by parsing components directly
 * All dates are in Los Angeles timezone and stored as YYYY-MM-DD strings
 */
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDate = (date: string): string => {
  // Already in YYYY-MM-DD format, return as is (no timezone conversion)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return format(parseLocalDate(date), 'yyyy-MM-dd');
};

export const getMonthKey = (date: string): string => {
  // Handle ISO timestamp format (e.g., "2026-01-02T00:00:00.000Z")
  const dateStr = date.includes('T') ? date.split('T')[0] : date;
  // Extract YYYY-MM directly from YYYY-MM-DD (no timezone conversion)
  return dateStr.substring(0, 7);
};

export const getWeekKey = (date: string): string => {
  const parsedDate = parseLocalDate(date);
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
