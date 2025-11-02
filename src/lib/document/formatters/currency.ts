/**
 * Format currency for legal documents
 * Example: 100000 → "$100,000" or "$100,000.00"
 */
export function formatCurrency(
  amount: number | string,
  options: {
    includeCents?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    includeCents = false,
    locale = 'en-US',
  } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    throw new Error(`Invalid currency amount: ${amount}`);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeCents ? 2 : 0,
    maximumFractionDigits: includeCents ? 2 : 0,
  }).format(numAmount);
}

/**
 * Parse currency string to number
 * Example: "$100,000" → 100000
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = currencyString.replace(/[$,\s]/g, '');
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    throw new Error(`Invalid currency string: ${currencyString}`);
  }

  return amount;
}

/**
 * Format percentage
 * Example: 0.20 → "20%"
 */
export function formatPercentage(
  value: number,
  decimals: number = 0
): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
