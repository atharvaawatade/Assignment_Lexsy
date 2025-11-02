import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseCurrency,
  formatPercentage,
} from '../currency';
import {
  formatLegalDate,
  parseFlexibleDate,
  getCurrentLegalDate,
} from '../dates';
import {
  numberToWords,
  currencyToWords,
} from '../numbers';

describe('Currency Formatters', () => {
  describe('formatCurrency', () => {
    it('should format number as currency', () => {
      expect(formatCurrency(100000)).toBe('$100,000');
    });

    it('should handle decimal values', () => {
      expect(formatCurrency(100000, { includeCents: true })).toBe('$100,000.00');
    });

    it('should handle string input', () => {
      expect(formatCurrency('50000')).toBe('$50,000');
    });

    it('should throw error for invalid input', () => {
      expect(() => formatCurrency('invalid')).toThrow();
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should format large numbers', () => {
      expect(formatCurrency(10000000)).toBe('$10,000,000');
    });
  });

  describe('parseCurrency', () => {
    it('should parse currency string to number', () => {
      expect(parseCurrency('$100,000')).toBe(100000);
    });

    it('should handle various formats', () => {
      expect(parseCurrency('100,000')).toBe(100000);
      expect(parseCurrency('$100000')).toBe(100000);
      expect(parseCurrency('100000.00')).toBe(100000);
    });

    it('should handle decimals', () => {
      expect(parseCurrency('$100,000.50')).toBe(100000.50);
    });

    it('should throw error for invalid string', () => {
      expect(() => parseCurrency('not a number')).toThrow();
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercentage(0.20)).toBe('20%');
    });

    it('should handle decimals', () => {
      expect(formatPercentage(0.255, 2)).toBe('25.50%');
    });

    it('should handle whole numbers', () => {
      expect(formatPercentage(1)).toBe('100%');
    });
  });
});

describe('Date Formatters', () => {
  describe('formatLegalDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-01');
      const formatted = formatLegalDate(date);
      
      expect(formatted).toBe('January 1, 2024');
    });

    it('should format string date', () => {
      const formatted = formatLegalDate('2024-01-15');
      
      expect(formatted).toContain('January');
      expect(formatted).toContain('2024');
    });

    it('should format timestamp', () => {
      const timestamp = new Date('2024-03-15').getTime();
      const formatted = formatLegalDate(timestamp);
      
      expect(formatted).toContain('March');
      expect(formatted).toContain('2024');
    });

    it('should include time if requested', () => {
      const date = new Date('2024-01-01T14:30:00');
      const formatted = formatLegalDate(date, { includeTime: true });
      
      expect(formatted).toContain('at');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatLegalDate('invalid')).toThrow();
    });
  });

  describe('parseFlexibleDate', () => {
    it('should parse M/D/YYYY format', () => {
      const date = parseFlexibleDate('1/15/2024');
      
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should parse "Month D, YYYY" format', () => {
      const date = parseFlexibleDate('January 15, 2024');
      
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse YYYY-MM-DD format', () => {
      const date = parseFlexibleDate('2024-01-15');
      
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse short month format', () => {
      const date = parseFlexibleDate('Jan 15, 2024');
      
      expect(date.getMonth()).toBe(0);
    });

    it('should throw error for invalid date', () => {
      expect(() => parseFlexibleDate('not a date')).toThrow();
    });
  });

  describe('getCurrentLegalDate', () => {
    it('should return current date in legal format', () => {
      const formatted = getCurrentLegalDate();
      
      expect(formatted).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });
  });
});

describe('Number Formatters', () => {
  describe('numberToWords', () => {
    it('should convert number to words', () => {
      expect(numberToWords(100)).toBe('One hundred');
    });

    it('should handle thousands', () => {
      expect(numberToWords(1000)).toBe('One thousand');
    });

    it('should handle millions', () => {
      const result = numberToWords(1000000);
      expect(result.toLowerCase()).toContain('million');
    });

    it('should capitalize first letter', () => {
      const result = numberToWords(5);
      expect(result[0]).toBe(result[0].toUpperCase());
    });

    it('should handle string input', () => {
      expect(numberToWords('25')).toBe('Twenty-five');
    });

    it('should throw error for invalid input', () => {
      expect(() => numberToWords('invalid')).toThrow();
    });
  });

  describe('currencyToWords', () => {
    it('should convert amount to words with currency', () => {
      const result = currencyToWords(100);
      expect(result.toLowerCase()).toContain('hundred');
      expect(result).toContain('Dollars');
    });

    it('should handle large amounts', () => {
      const result = currencyToWords(1000000);
      expect(result.toLowerCase()).toContain('million');
      expect(result).toContain('Dollars');
    });

    it('should handle cents', () => {
      const result = currencyToWords(100.50);
      expect(result).toContain('Cents');
    });

    it('should handle string input', () => {
      const result = currencyToWords('500');
      expect(result).toContain('Dollars');
    });

    it('should allow custom currency', () => {
      const result = currencyToWords(100, 'Euros');
      expect(result).toContain('Euros');
    });
  });
});

describe('Integration: Formatting Pipeline', () => {
  it('should format complete SAFE document data', () => {
    const data = {
      purchaseAmount: 100000,
      dateOfSafe: '2024-01-15',
      valuationCap: 5000000,
    };

    // Format all data
    const formatted = {
      purchaseAmountFormatted: formatCurrency(data.purchaseAmount),
      purchaseAmountWords: currencyToWords(data.purchaseAmount),
      dateFormatted: formatLegalDate(data.dateOfSafe),
      valuationCapFormatted: formatCurrency(data.valuationCap),
    };

    expect(formatted.purchaseAmountFormatted).toBe('$100,000');
    expect(formatted.purchaseAmountWords.toLowerCase()).toContain('hundred thousand');
    expect(formatted.dateFormatted).toContain('January');
    expect(formatted.valuationCapFormatted).toBe('$5,000,000');
  });

  it('should parse and reformat user input', () => {
    const userInput = '$100,000';
    
    // Parse
    const parsed = parseCurrency(userInput);
    
    // Reformat
    const formatted = formatCurrency(parsed);
    const words = currencyToWords(parsed);

    expect(formatted).toBe('$100,000');
    expect(words.toLowerCase()).toContain('hundred thousand dollars');
  });

  it('should handle date parsing and formatting', () => {
    const userInput = '1/15/2024';
    
    // Parse
    const parsed = parseFlexibleDate(userInput);
    
    // Reformat
    const formatted = formatLegalDate(parsed);

    expect(formatted).toBe('January 15, 2024');
  });
});
