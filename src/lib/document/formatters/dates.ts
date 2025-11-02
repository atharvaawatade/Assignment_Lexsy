import { format, parse, isValid } from 'date-fns';

/**
 * Format date for legal documents
 * Example: 2024-01-01 → "January 1, 2024"
 */
export function formatLegalDate(
  date: Date | string | number,
  options: {
    includeTime?: boolean;
  } = {}
): string {
  const { includeTime = false } = options;

  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    throw new Error(`Invalid date: ${date}`);
  }

  if (includeTime) {
    return format(dateObj, 'MMMM d, yyyy \'at\' h:mm a');
  }

  return format(dateObj, 'MMMM d, yyyy');
}

/**
 * Parse various date formats
 * Supports: "1/1/2024", "January 1, 2024", "jan 1 2024", etc.
 */
export function parseFlexibleDate(dateString: string): Date {
  // Common date formats
  const formats = [
    'M/d/yyyy',
    'MM/dd/yyyy',
    'MMMM d, yyyy',
    'MMM d, yyyy',
    'yyyy-MM-dd',
    'MMM d yyyy',
    'MMMM d yyyy',
  ];

  // Try each format
  for (const formatStr of formats) {
    try {
      const parsed = parse(dateString.trim(), formatStr, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Fallback to native Date parsing
  const fallback = new Date(dateString);
  if (isValid(fallback)) {
    return fallback;
  }

  throw new Error(`Unable to parse date: ${dateString}`);
}

/**
 * Format date range
 * Example: "January 1, 2024 to December 31, 2024"
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string
): string {
  const start = formatLegalDate(startDate);
  const end = formatLegalDate(endDate);
  return `${start} to ${end}`;
}

/**
 * Get current date in legal format
 */
export function getCurrentLegalDate(): string {
  return formatLegalDate(new Date());
}
