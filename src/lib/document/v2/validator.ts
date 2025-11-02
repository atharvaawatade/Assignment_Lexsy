import type { Field, FieldType } from '@/agents/core/types';
import type { ValidationResult, ValidationError, ValidationWarning } from './types';
import { parseCurrency } from '../formatters/currency';
import { parseFlexibleDate } from '../formatters/dates';

/**
 * Legal-grade field validator
 * Ensures data meets requirements before document generation
 */
export class DocumentValidator {
  /**
   * Validate all fields before document generation
   */
  validate(
    fields: Field[],
    filledFields: Record<string, string>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    console.log('\n=== VALIDATING FIELDS ===');

    fields.forEach(field => {
      const value = filledFields[field.id];

      // Check required fields
      if (field.required && (!value || value.trim() === '')) {
        errors.push({
          field: field.placeholder,
          message: `${field.placeholder} is required`,
          code: 'REQUIRED_FIELD_MISSING',
          suggestion: `Please provide a value for ${field.placeholder}`,
        });
        return;
      }

      // Skip validation if field is optional and empty
      if (!value || value.trim() === '') {
        return;
      }

      // Type-specific validation
      switch (field.type) {
        case 'currency':
          this.validateCurrency(field, value, errors, warnings);
          break;
        case 'date':
          this.validateDate(field, value, errors, warnings);
          break;
        case 'text':
          this.validateText(field, value, errors, warnings);
          break;
      }

      // Check field-specific rules
      this.validateSpecialFields(field, value, errors, warnings);
    });

    const valid = errors.length === 0;
    
    console.log(`Validation ${valid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);
    console.log('========================\n');

    return {
      valid,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate currency field
   */
  private validateCurrency(
    field: Field,
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    try {
      const amount = parseCurrency(value);

      // Check if amount is positive
      if (amount <= 0) {
        errors.push({
          field: field.placeholder,
          message: 'Amount must be positive',
          code: 'INVALID_AMOUNT',
          suggestion: 'Please enter a positive dollar amount',
        });
        return;
      }

      // Warning for unusually small amounts
      if (amount < 1000 && field.placeholder.toLowerCase().includes('investment')) {
        warnings.push({
          field: field.placeholder,
          message: 'Investment amount seems unusually low',
          severity: 'medium',
        });
      }

      // Warning for unusually large amounts
      if (amount > 100000000) {
        warnings.push({
          field: field.placeholder,
          message: 'Amount is very large, please double-check',
          severity: 'medium',
        });
      }
    } catch (error) {
      errors.push({
        field: field.placeholder,
        message: 'Invalid currency format',
        code: 'INVALID_CURRENCY',
        suggestion: 'Please enter a valid dollar amount (e.g., $100,000 or 100000)',
      });
    }
  }

  /**
   * Validate date field
   */
  private validateDate(
    field: Field,
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    try {
      const date = parseFlexibleDate(value);

      // Check if date is too far in the past
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (date < oneYearAgo) {
        warnings.push({
          field: field.placeholder,
          message: 'Date is more than a year in the past',
          severity: 'low',
        });
      }

      // Check if date is too far in the future
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (date > oneYearFromNow) {
        warnings.push({
          field: field.placeholder,
          message: 'Date is more than a year in the future',
          severity: 'low',
        });
      }
    } catch (error) {
      errors.push({
        field: field.placeholder,
        message: 'Invalid date format',
        code: 'INVALID_DATE',
        suggestion: 'Please enter a valid date (e.g., January 1, 2024 or 1/1/2024)',
      });
    }
  }

  /**
   * Validate text field
   */
  private validateText(
    field: Field,
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check minimum length
    if (value.trim().length < 2) {
      errors.push({
        field: field.placeholder,
        message: 'Value is too short',
        code: 'VALUE_TOO_SHORT',
        suggestion: 'Please provide a more complete value',
      });
      return;
    }

    // Check maximum length
    if (value.length > 500) {
      warnings.push({
        field: field.placeholder,
        message: 'Value is very long',
        severity: 'low',
      });
    }

    // Email-like fields
    if (field.placeholder.toLowerCase().includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push({
          field: field.placeholder,
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
          suggestion: 'Please enter a valid email address',
        });
      }
    }
  }

  /**
   * Validate special fields with domain-specific rules
   */
  private validateSpecialFields(
    field: Field,
    value: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const lower = field.placeholder.toLowerCase();

    // State validation
    if (lower.includes('state') && lower.includes('incorporation')) {
      const validStates = [
        'delaware', 'california', 'new york', 'texas', 'florida',
        'nevada', 'wyoming', 'de', 'ca', 'ny', 'tx', 'fl', 'nv', 'wy'
      ];
      
      if (!validStates.some(state => value.toLowerCase().includes(state))) {
        warnings.push({
          field: field.placeholder,
          message: 'Uncommon state of incorporation',
          severity: 'low',
        });
      }
    }

    // Valuation cap validation
    if (lower.includes('valuation') && lower.includes('cap')) {
      try {
        const amount = parseCurrency(value);
        if (amount < 1000000) {
          warnings.push({
            field: field.placeholder,
            message: 'Valuation cap seems low for a typical SAFE',
            severity: 'medium',
          });
        }
      } catch {
        // Currency validation will catch this
      }
    }

    // Company/Investor name validation
    if (lower.includes('company') || lower.includes('investor')) {
      if (lower.includes('name')) {
        // Check for placeholder-like values
        const placeholderPatterns = [
          /^\[.*\]$/,
          /^___+$/,
          /^company$/i,
          /^investor$/i,
          /^name$/i,
        ];

        if (placeholderPatterns.some(pattern => pattern.test(value.trim()))) {
          errors.push({
            field: field.placeholder,
            message: 'Please replace placeholder with actual name',
            code: 'PLACEHOLDER_VALUE',
            suggestion: 'Enter the actual company or investor name',
          });
        }
      }
    }
  }

  /**
   * Validate specific field by ID
   */
  validateField(
    field: Field,
    value: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required
    if (field.required && (!value || value.trim() === '')) {
      errors.push({
        field: field.placeholder,
        message: `${field.placeholder} is required`,
        code: 'REQUIRED_FIELD_MISSING',
        suggestion: `Please provide a value for ${field.placeholder}`,
      });
    } else if (value && value.trim() !== '') {
      // Type-specific validation
      switch (field.type) {
        case 'currency':
          this.validateCurrency(field, value, errors, warnings);
          break;
        case 'date':
          this.validateDate(field, value, errors, warnings);
          break;
        case 'text':
          this.validateText(field, value, errors, warnings);
          break;
      }

      this.validateSpecialFields(field, value, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Create validator instance
 */
export function createValidator(): DocumentValidator {
  return new DocumentValidator();
}
