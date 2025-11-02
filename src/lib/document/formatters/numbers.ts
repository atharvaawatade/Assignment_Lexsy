import { toWords } from 'number-to-words';

/**
 * Convert number to words for legal documents
 * Example: 100000 → "One Hundred Thousand"
 */
export function numberToWords(num: number | string): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(numValue)) {
    throw new Error(`Invalid number: ${num}`);
  }

  // Convert to words and capitalize first letter
  const words = toWords(numValue);
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Convert currency amount to words
 * Example: 100000 → "One Hundred Thousand Dollars"
 */
export function currencyToWords(
  amount: number | string,
  currency: string = 'Dollars'
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  // Handle decimal places (cents)
  const dollars = Math.floor(numAmount);
  const cents = Math.round((numAmount - dollars) * 100);

  let result = numberToWords(dollars) + ` ${currency}`;

  if (cents > 0) {
    result += ` and ${numberToWords(cents)} Cents`;
  }

  return result;
}

/**
 * Format ordinal numbers
 * Example: 1 → "First", 2 → "Second", etc.
 */
export function numberToOrdinal(num: number): string {
  const words = toWords(num);
  
  // Convert "one" → "first", "two" → "second", etc.
  const ordinalMap: Record<string, string> = {
    'one': 'first',
    'two': 'second',
    'three': 'third',
    'four': 'fourth',
    'five': 'fifth',
    'six': 'sixth',
    'seven': 'seventh',
    'eight': 'eighth',
    'nine': 'ninth',
    'ten': 'tenth',
  };

  const lower = words.toLowerCase();
  const ordinal = ordinalMap[lower] || words + 'th';
  
  return ordinal.charAt(0).toUpperCase() + ordinal.slice(1);
}
