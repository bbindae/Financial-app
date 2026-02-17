import { OptionType } from '../types/Option';

/**
 * Calculate the initial cost basis for an option position
 * Cost = Option Price × Quantity × 100 (contracts to shares)
 */
export function calculateCost(optionPrice: number, quantity: number): number {
  return optionPrice * quantity * 100;
}

/**
 * Calculate current value of option position
 * Sell Put (sell to open): ask price → lastPrice → closingPrice
 * Buy Call/Put (buy to open): bid price → lastPrice → closingPrice
 * Apply sign based on option type
 */
export function calculateCurrent(
  bid: number | undefined,
  ask: number | undefined,
  lastPrice: number | undefined,
  closingPrice: number | undefined,
  quantity: number,
  optionType: OptionType
): number {
  let price = 0;

  if (optionType === 'SELL_PUT') {
    // Sell to open / Put: use ask price (cost to buy back)
    if (ask !== undefined && ask > 0) {
      price = ask;
    } else if (lastPrice !== undefined && lastPrice > 0) {
      price = lastPrice;
    } else if (closingPrice !== undefined && closingPrice > 0) {
      price = closingPrice;
    }
  } else {
    // Buy to open / Call, Put: use bid price (what you can sell for)
    if (bid !== undefined && bid > 0) {
      price = bid;
    } else if (lastPrice !== undefined && lastPrice > 0) {
      price = lastPrice;
    } else if (closingPrice !== undefined && closingPrice > 0) {
      price = closingPrice;
    }
  }

  const value = price * quantity * 100;

  // Sell Put is a credit (negative position), Buy Call/Put are debits (positive positions)
  return optionType === 'SELL_PUT' ? -value : value;
}

/**
 * Calculate today's gain/loss
 * Buy Call/Put: (current - closingPrice) × quantity × 100
 * Sell Put: (closingPrice - current) × quantity × 100
 */
export function calculateTodayGainLoss(
  currentPrice: number,
  closingPrice: number,
  quantity: number,
  optionType: OptionType
): { amount: number; percent: number } {
  const closingValue = closingPrice * quantity * 100;
  const currentValue = currentPrice * quantity * 100;

  let amount = 0;
  if (optionType === 'SELL_PUT') {
    amount = (closingValue - currentValue);
  } else {
    // BUY_CALL or BUY_PUT
    amount = (currentValue - closingValue);
  }

  const percent = closingValue !== 0 ? (amount / closingValue) * 100 : 0;

  return { amount, percent };
}

/**
 * Calculate total gain/loss since position opened
 * Buy Call/Put: (current - cost)
 * Sell Put: premium received - buyback cost = cost + currentValue (currentValue is already negative)
 */
export function calculateTotalGainLoss(
  currentValue: number,
  cost: number,
  optionType: OptionType
): { amount: number; percent: number } {
  let amount = 0;
  if (optionType === 'SELL_PUT') {
    // currentValue is already negative for SELL_PUT
    // P&L = premium received + current position value
    amount = cost + currentValue;
  } else {
    // BUY_CALL or BUY_PUT
    amount = currentValue - cost;
  }

  const percent = cost !== 0 ? (amount / cost) * 100 : 0;

  return { amount, percent };
}

/**
 * Format option symbol for display
 * Example: "AMD 160 PUT"
 */
export function formatOptionSymbol(
  symbol: string,
  strike: number,
  _expiration: string,
  optionType: OptionType
): string {
  const type = optionType === 'SELL_PUT' ? 'PUT' :
               optionType === 'BUY_CALL' ? 'CALL' : 'PUT';

  return `${symbol} ${strike} ${type}`;
}

/**
 * Build Yahoo Finance option symbol
 * Format: SYMBOL(YY)(MM)(DD)(C/P)(STRIKE * 1000 padded to 8 digits)
 * Example: AMD260320P00160000 = AMD Put expiring 2026-03-20 strike 160
 */
export function buildYahooOptionSymbol(
  symbol: string,
  strike: number,
  expiration: string,
  optionType: OptionType
): string {
  const [year, month, day] = expiration.split('-');
  const shortYear = year.slice(2);
  const putOrCall = optionType === 'BUY_CALL' ? 'C' : 'P';
  const strikeFormatted = Math.round(strike * 1000).toString().padStart(8, '0');

  return `${symbol}${shortYear}${month}${day}${putOrCall}${strikeFormatted}`;
}

/**
 * Get the appropriate price source for current value calculation
 * Sell Put: ask → lastPrice → closingPrice
 * Buy Call/Put: bid → lastPrice → closingPrice
 */
export function getCurrentPriceForCalculation(
  bid?: number,
  ask?: number,
  lastPrice?: number,
  closingPrice?: number,
  optionType?: OptionType
): number {
  if (optionType === 'SELL_PUT') {
    // Sell to open / Put: use ask price
    if (ask !== undefined && ask > 0) return ask;
  } else {
    // Buy to open / Call, Put: use bid price
    if (bid !== undefined && bid > 0) return bid;
  }
  // Fallback: lastPrice
  if (lastPrice !== undefined && lastPrice > 0) {
    return lastPrice;
  }
  // Fallback: closingPrice
  if (closingPrice !== undefined && closingPrice > 0) {
    return closingPrice;
  }
  return 0;
}
