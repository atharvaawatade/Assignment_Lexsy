import { BaseAgent } from "../core/base-agent";
import type {
  AgentInput,
  AgentOutput,
  FieldType,
  A2AMessage,
} from "../core/types";

export class ValidationAgent extends BaseAgent {
  constructor() {
    super("validation");
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { type, data } = input;

    try {
      switch (type) {
        case "validate":
          return await this.validateField(data);
        default:
          throw new Error(`Unknown validation action: ${type}`);
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async validateField(
    data: Record<string, any>
  ): Promise<AgentOutput> {
    const { fieldId, value, fieldType, fieldName } = data;

    if (!value || typeof value !== "string") {
      return {
        success: true,
        data: {
          valid: false,
          error: "Please provide a value.",
        },
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return {
        success: true,
        data: {
          valid: false,
          error: "This field cannot be empty.",
        },
      };
    }

    // Context-aware validation based on field name
    const fieldNameLower = (fieldName || '').toLowerCase();
    
    // Check if this is a state/jurisdiction field
    if (fieldNameLower.includes('state') || fieldNameLower.includes('jurisdiction')) {
      return {
        success: true,
        data: this.validateUSState(trimmedValue),
      };
    }

    // Type-specific validation
    let validationResult: { valid: boolean; error?: string; suggestion?: string };

    switch (fieldType) {
      case "text":
        validationResult = this.validateText(trimmedValue);
        break;
      case "date":
        validationResult = this.validateDate(trimmedValue);
        break;
      case "currency":
        validationResult = this.validateCurrency(trimmedValue);
        break;
      case "enum":
        validationResult = this.validateEnum(trimmedValue, data.options || []);
        break;
      default:
        validationResult = { valid: true };
    }

    return {
      success: true,
      data: validationResult,
    };
  }

  private validateText(value: string): { valid: boolean; error?: string; suggestion?: string } {
    // Basic text validation
    if (value.length < 3) {
      return {
        valid: false,
        error: "Please provide at least 3 characters.",
      };
    }

    if (value.length > 500) {
      return {
        valid: false,
        error: "Please keep it under 500 characters.",
      };
    }

    // Check if it's just repeated characters (like "aaa" or "111")
    if (/^(.)\1+$/.test(value)) {
      return {
        valid: false,
        error: "Please provide a meaningful value, not just repeated characters.",
      };
    }

    return { valid: true };
  }

  private validateUSState(value: string): { valid: boolean; error?: string; suggestion?: string } {
    const US_STATES = [
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
      'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
      'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
      'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
      'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
      'new hampshire', 'new jersey', 'new mexico', 'new york',
      'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
      'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
      'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
      'west virginia', 'wisconsin', 'wyoming'
    ];

    const normalized = value.toLowerCase().trim();
    
    // Check if it's a valid US state
    const isValid = US_STATES.some(state => 
      normalized === state || normalized.includes(state)
    );

    if (!isValid) {
      return {
        valid: false,
        error: "Please enter a valid US state.",
        suggestion: "Popular choices: Delaware, California, New York, Texas. Most startups choose Delaware for its business-friendly laws."
      };
    }

    return { valid: true };
  }

  private validateDate(value: string): { valid: boolean; error?: string; formattedValue?: string } {
    // Be VERY lenient - accept almost any date-like input
    // Examples we should accept:
    // - "jan 1 2020"
    // - "January 1, 2024"
    // - "1/1/2024"
    // - "2024-01-01"
    // - "01-01-2024"
    
    // Just check if it has some numbers (could be a date)
    const hasNumbers = /\d/.test(value);
    const hasMonthName = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)/i.test(value);
    
    if (!hasNumbers && !hasMonthName) {
      return {
        valid: false,
        error: "Please enter a date (e.g., January 1, 2024 or 1/1/2024)"
      };
    }

    // Try to parse it
    try {
      // Handle common abbreviations
      let normalized = value
        .replace(/\bjan\b/i, 'January')
        .replace(/\bfeb\b/i, 'February')
        .replace(/\bmar\b/i, 'March')
        .replace(/\bapr\b/i, 'April')
        .replace(/\bmay\b/i, 'May')
        .replace(/\bjun\b/i, 'June')
        .replace(/\bjul\b/i, 'July')
        .replace(/\baug\b/i, 'August')
        .replace(/\bsep\b/i, 'September')
        .replace(/\boct\b/i, 'October')
        .replace(/\bnov\b/i, 'November')
        .replace(/\bdec\b/i, 'December');
      
      const dateObj = new Date(normalized);
      
      // Check if it's a valid date
      if (isNaN(dateObj.getTime())) {
        // Still accept it if it looks date-like
        if (hasNumbers && (hasMonthName || /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value))) {
          return { valid: true }; // Accept as-is
        }
        return {
          valid: false,
          error: "Please enter a valid date"
        };
      }

      // Check reasonable range
      const year = dateObj.getFullYear();
      if (year < 1900 || year > 2100) {
        return {
          valid: false,
          error: "Please enter a date between 1900 and 2100"
        };
      }

      // Format nicely for display
      const formatted = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      return { 
        valid: true,
        formattedValue: formatted // e.g., "January 1, 2024"
      };
    } catch (e) {
      // If parsing fails, but it looks date-like, accept it
      if (hasNumbers && hasMonthName) {
        return { valid: true };
      }
      return {
        valid: false,
        error: "Please enter a valid date"
      };
    }
  }

  private validateCurrency(value: string): { valid: boolean; error?: string; suggestion?: string } {
    // Remove common currency symbols and formatting
    const cleaned = value.replace(/[$,\s]/g, "");

    // Check if it's a valid number
    const number = parseFloat(cleaned);

    if (isNaN(number)) {
      return {
        valid: false,
        error: "Please provide a valid amount.",
        suggestion: "Try formats like: 100000, $100,000, or 100000.00",
      };
    }

    if (number < 0) {
      return {
        valid: false,
        error: "Amount cannot be negative.",
      };
    }

    if (number > 1000000000000) {
      return {
        valid: false,
        error: "That amount seems unusually large. Please double-check.",
      };
    }

    return { valid: true };
  }

  private validateEnum(
    value: string,
    options: string[]
  ): { valid: boolean; error?: string; suggestion?: string } {
    if (options.length === 0) {
      return { valid: true };
    }

    const normalizedValue = value.toLowerCase().trim();
    const normalizedOptions = options.map((opt) => opt.toLowerCase().trim());

    if (!normalizedOptions.includes(normalizedValue)) {
      return {
        valid: false,
        error: `Please choose one of: ${options.join(", ")}`,
      };
    }

    return { valid: true };
  }

  // Handle A2A messages
  protected async handleA2AMessage(
    message: A2AMessage
  ): Promise<Record<string, any>> {
    switch (message.action) {
      case "validate":
        const result = await this.validateField(message.payload);
        return result.data;
      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }
}
