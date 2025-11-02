/**
 * Integration layer between v1 (mammoth) and v2 (docxtemplater)
 * Provides gradual migration path with feature flags
 */

import type { Field } from '@/agents/core/types';
import { createEnhancedParser } from './v2/parser';
import { createHybridDetector } from './v2/detector';
import { createValidator } from './v2/validator';
import { createGenerator } from './v2/generator';

/**
 * Feature flags for gradual rollout
 * DEFAULT: v2 ENABLED (Production Ready)
 */
export const FEATURES = {
  USE_V2_PARSER: process.env.NEXT_PUBLIC_USE_V2_PARSER !== 'false', // Default: TRUE
  USE_V2_DETECTOR: process.env.NEXT_PUBLIC_USE_V2_DETECTOR !== 'false', // Default: TRUE
  USE_V2_VALIDATOR: process.env.NEXT_PUBLIC_USE_V2_VALIDATOR !== 'false', // Default: TRUE
  USE_V2_GENERATOR: process.env.NEXT_PUBLIC_USE_V2_GENERATOR !== 'false', // Default: TRUE
  USE_V2_PREVIEW: process.env.NEXT_PUBLIC_USE_V2_PREVIEW !== 'false', // Default: TRUE
};

/**
 * Document processing configuration
 */
export interface ProcessingConfig {
  useV2Parser?: boolean;
  useV2Detector?: boolean;
  useV2Validator?: boolean;
  useV2Generator?: boolean;
  enableCaching?: boolean;
  debug?: boolean;
}

/**
 * Unified document processor
 * Automatically uses v2 or v1 based on feature flags
 */
export class UnifiedDocumentProcessor {
  private v2Parser = createEnhancedParser();
  private v2Detector = createHybridDetector();
  private v2Validator = createValidator();
  private v2Generator = createGenerator();
  
  private config: ProcessingConfig;

  constructor(config: ProcessingConfig = {}) {
    this.config = {
      useV2Parser: config.useV2Parser ?? FEATURES.USE_V2_PARSER,
      useV2Detector: config.useV2Detector ?? FEATURES.USE_V2_DETECTOR,
      useV2Validator: config.useV2Validator ?? FEATURES.USE_V2_VALIDATOR,
      useV2Generator: config.useV2Generator ?? FEATURES.USE_V2_GENERATOR,
      enableCaching: config.enableCaching ?? true,
      debug: config.debug ?? false,
    };

    if (this.config.debug) {
      console.log('📊 Document Processor Config:', this.config);
    }
  }

  /**
   * Parse document using v2 or v1
   */
  async parseDocument(buffer: Buffer): Promise<{
    fields: Field[];
    text: string;
    buffer: Buffer;
    version: 'v1' | 'v2';
  }> {
    if (this.config.useV2Parser) {
      console.log('🚀 Using v2 parser (enhanced)');
      try {
        const parsed = await this.v2Parser.parse(buffer);
        
        // Merge structured and unstructured fields
        const allFields = [
          ...parsed.structuredFields,
          ...parsed.unstructuredFields,
        ];
        
        // Deduplicate
        const uniqueFields = this.v2Parser.smartDeduplication(allFields);
        
        return {
          fields: uniqueFields,
          text: parsed.text,
          buffer,
          version: 'v2',
        };
      } catch (error) {
        console.error('❌ v2 parser failed, falling back to v1:', error);
        // Fallback to v1 would go here
        throw error;
      }
    } else {
      console.log('📝 Using v1 parser (mammoth)');
      // v1 logic would stay in the existing DocumentAgent
      throw new Error('v1 parser not implemented in integration layer');
    }
  }

  /**
   * Detect and enhance fields
   */
  async detectFields(
    fields: Field[],
    documentText: string,
    documentType: string = 'SAFE'
  ): Promise<Field[]> {
    if (this.config.useV2Detector) {
      console.log('🚀 Using v2 detector (hybrid)');
      const result = await this.v2Detector.detectFields(
        fields,
        documentText,
        documentType
      );
      return result.fields;
    } else {
      console.log('📝 Using v1 detector');
      // Return fields as-is for v1
      return fields;
    }
  }

  /**
   * Validate fields
   */
  validateFields(
    fields: Field[],
    filledFields: Record<string, string>
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    if (this.config.useV2Validator) {
      console.log('🚀 Using v2 validator (legal-grade)');
      const result = this.v2Validator.validate(fields, filledFields);
      
      return {
        valid: result.valid,
        errors: result.errors.map(e => e.message),
        warnings: result.warnings?.map(w => w.message) || [],
      };
    } else {
      console.log('📝 Using v1 validator');
      // Basic validation
      const errors: string[] = [];
      
      fields.forEach(field => {
        if (field.required && !filledFields[field.id]) {
          errors.push(`${field.placeholder} is required`);
        }
      });
      
      return {
        valid: errors.length === 0,
        errors,
        warnings: [],
      };
    }
  }

  /**
   * Generate document
   */
  async generateDocument(
    templateBuffer: Buffer,
    fields: Record<string, any>
  ): Promise<Buffer> {
    if (this.config.useV2Generator) {
      console.log('🚀 Using v2 generator (format-preserving)');
      const result = await this.v2Generator.generate(
        templateBuffer,
        fields,
        {
          auditTrail: true,
          compressionLevel: 9,
        }
      );
      
      if (this.config.debug) {
        console.log('📊 Generation metadata:', result.metadata);
      }
      
      return result.buffer;
    } else {
      console.log('📝 Using v1 generator');
      // v1 generation would use existing logic
      throw new Error('v1 generator not implemented in integration layer');
    }
  }

  /**
   * Get processor stats
   */
  getStats(): {
    version: string;
    features: ProcessingConfig;
    cacheHits?: number;
    processingTime?: number;
  } {
    return {
      version: '2.0',
      features: this.config,
    };
  }
}

/**
 * Create processor with optional config
 */
export function createProcessor(config?: ProcessingConfig): UnifiedDocumentProcessor {
  return new UnifiedDocumentProcessor(config);
}

/**
 * Helper: Check if v2 is fully enabled
 */
export function isV2FullyEnabled(): boolean {
  return (
    FEATURES.USE_V2_PARSER &&
    FEATURES.USE_V2_DETECTOR &&
    FEATURES.USE_V2_VALIDATOR &&
    FEATURES.USE_V2_GENERATOR
  );
}

/**
 * Helper: Get current system version
 */
export function getSystemVersion(): {
  parser: 'v1' | 'v2';
  detector: 'v1' | 'v2';
  validator: 'v1' | 'v2';
  generator: 'v1' | 'v2';
} {
  return {
    parser: FEATURES.USE_V2_PARSER ? 'v2' : 'v1',
    detector: FEATURES.USE_V2_DETECTOR ? 'v2' : 'v1',
    validator: FEATURES.USE_V2_VALIDATOR ? 'v2' : 'v1',
    generator: FEATURES.USE_V2_GENERATOR ? 'v2' : 'v1',
  };
}
