import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentValidator } from '../validator';
import type { Field } from '@/agents/core/types';

describe('DocumentValidator', () => {
  let validator: DocumentValidator;

  beforeEach(() => {
    validator = new DocumentValidator();
  });

  describe('Required Fields Validation', () => {
    it('should fail when required field is missing', () => {
      const fields: Field[] = [
        {
          id: '1',
          placeholder: 'Company Name',
          type: 'text',
          required: true,
          order: 0,
        },
      ];

      const result = validator.validate(fields, {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING');
      expect(result.errors[0].field).toBe('Company Name');
    });

    it('should pass when required field is provided', () => {
      const fields: Field[] = [
        {
          id: '1',
          placeholder: 'Company Name',
          type: 'text',
          required: true,
          order: 0,
        },
      ];

      const result = validator.validate(fields, {
        '1': 'Acme Inc.',
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should skip validation for optional empty fields', () => {
      const fields: Field[] = [
        {
          id: '1',
          placeholder: 'Optional Field',
          type: 'text',
          required: false,
          order: 0,
        },
      ];

      const result = validator.validate(fields, {});

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Currency Validation', () => {
    const currencyField: Field = {
      id: '1',
      placeholder: 'Purchase Amount',
      type: 'currency',
      required: true,
      order: 0,
    };

    it('should accept valid currency formats', () => {
      const validFormats = [
        '$100,000',
        '100000',
        '$1,000,000',
        '50000.00',
      ];

      validFormats.forEach(format => {
        const result = validator.validate([currencyField], {
          '1': format,
        });

        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid currency format', () => {
      const result = validator.validate([currencyField], {
        '1': 'not a number',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CURRENCY');
    });

    it('should reject negative amounts', () => {
      const result = validator.validate([currencyField], {
        '1': '-100',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_AMOUNT');
    });

    it('should reject zero amounts', () => {
      const result = validator.validate([currencyField], {
        '1': '0',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_AMOUNT');
    });

    it('should warn for unusually small investments', () => {
      const investmentField: Field = {
        ...currencyField,
        placeholder: 'Investment Amount',
      };

      const result = validator.validate([investmentField], {
        '1': '500',
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should warn for very large amounts', () => {
      const result = validator.validate([currencyField], {
        '1': '500000000', // $500M
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('Date Validation', () => {
    const dateField: Field = {
      id: '1',
      placeholder: 'Date of Safe',
      type: 'date',
      required: true,
      order: 0,
    };

    it('should accept valid date formats', () => {
      const validDates = [
        'January 1, 2024',
        '1/1/2024',
        '01/01/2024',
        'Jan 1, 2024',
        '2024-01-01',
      ];

      validDates.forEach(date => {
        const result = validator.validate([dateField], {
          '1': date,
        });

        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid date format', () => {
      const result = validator.validate([dateField], {
        '1': 'not a date',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DATE');
    });

    it('should warn for dates far in the past', () => {
      const result = validator.validate([dateField], {
        '1': 'January 1, 2020', // >1 year ago
      });

      expect(result.warnings).toBeDefined();
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should warn for dates far in the future', () => {
      const result = validator.validate([dateField], {
        '1': 'January 1, 2030', // >1 year ahead
      });

      expect(result.warnings).toBeDefined();
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Text Validation', () => {
    const textField: Field = {
      id: '1',
      placeholder: 'Company Name',
      type: 'text',
      required: true,
      order: 0,
    };

    it('should reject very short values', () => {
      const result = validator.validate([textField], {
        '1': 'A',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('VALUE_TOO_SHORT');
    });

    it('should warn for very long values', () => {
      const longValue = 'A'.repeat(600);
      
      const result = validator.validate([textField], {
        '1': longValue,
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should validate email format', () => {
      const emailField: Field = {
        ...textField,
        placeholder: 'Investor Email',
      };

      const result = validator.validate([emailField], {
        '1': 'invalid-email',
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_EMAIL');
    });

    it('should accept valid email format', () => {
      const emailField: Field = {
        ...textField,
        placeholder: 'Investor Email',
      };

      const result = validator.validate([emailField], {
        '1': 'investor@example.com',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Special Field Validation', () => {
    it('should warn for uncommon state of incorporation', () => {
      const stateField: Field = {
        id: '1',
        placeholder: 'State of Incorporation',
        type: 'text',
        required: true,
        order: 0,
      };

      const result = validator.validate([stateField], {
        '1': 'Montana', // Uncommon
      });

      expect(result.warnings).toBeDefined();
      if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it('should accept common states of incorporation', () => {
      const stateField: Field = {
        id: '1',
        placeholder: 'State of Incorporation',
        type: 'text',
        required: true,
        order: 0,
      };

      const commonStates = ['Delaware', 'California', 'New York'];

      commonStates.forEach(state => {
        const result = validator.validate([stateField], {
          '1': state,
        });

        expect(result.valid).toBe(true);
      });
    });

    it('should warn for low valuation cap', () => {
      const valuationField: Field = {
        id: '1',
        placeholder: 'Post-Money Valuation Cap',
        type: 'currency',
        required: true,
        order: 0,
      };

      const result = validator.validate([valuationField], {
        '1': '$500,000', // Low for typical SAFE
      });

      // Validation should pass (valid data)
      expect(result.valid).toBe(true);
      
      // But should have warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings!.some(w => w.message.toLowerCase().includes('valuation'))).toBe(true);
    });

    it('should reject placeholder values', () => {
      const companyField: Field = {
        id: '1',
        placeholder: 'Company Name',
        type: 'text',
        required: true,
        order: 0,
      };

      const placeholderValues = [
        '[Company Name]',
        '________',
        'company',
        'name',
      ];

      placeholderValues.forEach(value => {
        const result = validator.validate([companyField], {
          '1': value,
        });

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('PLACEHOLDER_VALUE');
      });
    });
  });

  describe('Multiple Fields Validation', () => {
    it('should validate all fields', () => {
      const fields: Field[] = [
        {
          id: '1',
          placeholder: 'Company Name',
          type: 'text',
          required: true,
          order: 0,
        },
        {
          id: '2',
          placeholder: 'Purchase Amount',
          type: 'currency',
          required: true,
          order: 1,
        },
        {
          id: '3',
          placeholder: 'Date of Safe',
          type: 'date',
          required: true,
          order: 2,
        },
      ];

      const result = validator.validate(fields, {
        '1': 'Acme Inc.',
        '2': '$100,000',
        '3': 'January 1, 2024',
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should collect all errors', () => {
      const fields: Field[] = [
        {
          id: '1',
          placeholder: 'Company Name',
          type: 'text',
          required: true,
          order: 0,
        },
        {
          id: '2',
          placeholder: 'Purchase Amount',
          type: 'currency',
          required: true,
          order: 1,
        },
      ];

      const result = validator.validate(fields, {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('Single Field Validation', () => {
    it('should validate single field', () => {
      const field: Field = {
        id: '1',
        placeholder: 'Company Name',
        type: 'text',
        required: true,
        order: 0,
      };

      const result = validator.validateField(field, 'Acme Inc.');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid single field', () => {
      const field: Field = {
        id: '1',
        placeholder: 'Purchase Amount',
        type: 'currency',
        required: true,
        order: 0,
      };

      const result = validator.validateField(field, 'invalid');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });
  });
});
