/**
 * US Stock Market hours utility
 * Market hours: 9:30 AM - 4:00 PM ET (Eastern Time)
 * Pre-market: 4:00 AM - 9:30 AM ET
 * After-hours: 4:00 PM - 8:00 PM ET
 * 
 * Market holidays for 2026 (NYSE/NASDAQ):
 */

// US market holidays for 2025-2027 (MM-DD format for recurring, YYYY-MM-DD for specific)
const MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

const MARKET_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
];

const MARKET_HOLIDAYS_2027 = [
  '2027-01-01', // New Year's Day
  '2027-01-18', // MLK Day
  '2027-02-15', // Presidents' Day
  '2027-03-26', // Good Friday
  '2027-05-31', // Memorial Day
  '2027-06-18', // Juneteenth (observed)
  '2027-07-05', // Independence Day (observed)
  '2027-09-06', // Labor Day
  '2027-11-25', // Thanksgiving
  '2027-12-24', // Christmas (observed)
];

const ALL_HOLIDAYS = new Set([
  ...MARKET_HOLIDAYS_2025,
  ...MARKET_HOLIDAYS_2026,
  ...MARKET_HOLIDAYS_2027,
]);

/**
 * Get current date string in YYYY-MM-DD format in US Eastern timezone
 * Uses Intl.DateTimeFormat for reliable timezone conversion
 */
function getEasternDateStr(date?: Date): string {
  const d = date || new Date();
  // en-CA locale gives YYYY-MM-DD format natively
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(d);
}

/**
 * Get current time components in US Eastern timezone
 */
function getEasternTimeComponents(date?: Date): { hours: number; minutes: number } {
  const d = date || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  return { hours, minutes };
}

/**
 * Check if a date string (YYYY-MM-DD) is a US market holiday
 */
function isMarketHoliday(dateStr: string): boolean {
  return ALL_HOLIDAYS.has(dateStr);
}

/**
 * Check if a date string (YYYY-MM-DD) falls on a weekend
 * Parse it to get the day of the week
 */
function isWeekend(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

/**
 * Check if the US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET, weekdays, non-holidays
 */
export function isMarketOpen(now?: Date): boolean {
  const dateStr = getEasternDateStr(now);

  if (isWeekend(dateStr) || isMarketHoliday(dateStr)) {
    return false;
  }

  const { hours, minutes } = getEasternTimeComponents(now);
  const timeInMinutes = hours * 60 + minutes;

  // Market open: 9:30 AM (570 min) to 4:00 PM (960 min)
  return timeInMinutes >= 570 && timeInMinutes < 960;
}

/**
 * Check if today is a trading day (weekday + not a holiday)
 * This is different from isMarketOpen - a trading day can be outside market hours
 */
export function isTradingDay(date?: Date): boolean {
  const dateStr = getEasternDateStr(date);
  return !isWeekend(dateStr) && !isMarketHoliday(dateStr);
}

/**
 * Check if the market is closed for the entire day (weekend or holiday)
 * Returns true on weekends and holidays, false on trading days even if outside market hours
 */
export function isMarketClosedAllDay(date?: Date): boolean {
  const dateStr = getEasternDateStr(date);
  const closed = isWeekend(dateStr) || isMarketHoliday(dateStr);
  console.log(`[MarketHours] Date: ${dateStr}, isWeekend: ${isWeekend(dateStr)}, isHoliday: ${isMarketHoliday(dateStr)}, closedAllDay: ${closed}`);
  return closed;
}

/**
 * Get the last trading day before the given date
 * Goes backwards to find the most recent trading day
 */
export function getLastTradingDay(date?: Date): string {
  const dateStr = getEasternDateStr(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  
  // Go back at least 1 day
  d.setDate(d.getDate() - 1);
  
  // Keep going back until we find a trading day
  let str = formatLocalDate(d);
  while (isWeekend(str) || isMarketHoliday(str)) {
    d.setDate(d.getDate() - 1);
    str = formatLocalDate(d);
  }
  
  return str;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get formatted string of last trading day
 */
export function getLastTradingDayStr(date?: Date): string {
  return getLastTradingDay(date);
}
