import type { Field, FieldType } from '@/agents/core/types';
import type { FieldDetectionResult, FieldEnrichment } from './types';
import { GoogleGenAI } from '@google/genai';

/**
 * Hybrid Field Detector
 * Combines template-aware detection with LLM enhancement
 */
export class HybridFieldDetector {
  private genAI: GoogleGenAI;
  private cache: Map<string, FieldEnrichment[]> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenAI({
      apiKey,
    });
  }

  /**
   * Detect and classify fields using hybrid approach
   */
  async detectFields(
    fields: Field[],
    documentText: string,
    documentType: string = 'SAFE'
  ): Promise<FieldDetectionResult> {
    console.log('\n=== HYBRID FIELD DETECTION ===');
    console.log('Input fields:', fields.length);

    try {
      // Step 1: Check cache for this document type
      const cacheKey = this.generateCacheKey(documentType, fields);
      if (this.cache.has(cacheKey)) {
        console.log('✅ Using cached enrichment');
        const cached = this.cache.get(cacheKey)!;
        return {
          fields: this.applyEnrichment(fields, cached),
          confidence: 0.99,
          method: 'hybrid',
          metadata: { cached: true },
        };
      }

      // Step 2: Enhance with LLM (only for classification, not detection)
      console.log('🤖 Enhancing with Gemini 2.0 Flash...');
      const enrichments = await this.enrichFieldsWithLLM(fields, documentText, documentType);
      
      // Step 3: Apply enrichments to fields
      const enrichedFields = this.applyEnrichment(fields, enrichments);
      
      // Step 4: Cache for future use
      this.cache.set(cacheKey, enrichments);
      console.log('✅ Enrichment cached for reuse');
      
      console.log('==============================\n');

      return {
        fields: enrichedFields,
        confidence: 0.99,
        method: 'hybrid',
        metadata: { 
          cached: false,
          llmUsed: true,
          enrichmentCount: enrichments.length,
        },
      };
    } catch (error) {
      console.error('Hybrid detection error:', error);
      
      // Fallback: Return fields with basic classification
      return {
        fields,
        confidence: 0.85,
        method: 'template',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Enrich fields using LLM for smart classification
   */
  private async enrichFieldsWithLLM(
    fields: Field[],
    documentText: string,
    documentType: string
  ): Promise<FieldEnrichment[]> {
    const fieldNames = fields.map(f => f.placeholder).join(', ');
    
    const prompt = `You are analyzing a ${documentType} legal document to provide intelligent field classifications.

Document context (first 1000 chars):
${documentText.substring(0, 1000)}

Fields to classify:
${fields.map((f, i) => `${i + 1}. ${f.placeholder}`).join('\n')}

For EACH field, provide:
1. Clear description (what this field is for)
2. 2-3 examples of valid values
3. Validation rules (format, requirements)
4. Legal context or best practices (if applicable)

Respond with a JSON array, one object per field:
[
  {
    "placeholder": "Company Name",
    "description": "The legal name of the company issuing the SAFE",
    "examples": ["Acme Inc.", "TechCorp LLC", "Startup Co."],
    "validationRules": [
      {
        "type": "required",
        "rule": "Must not be empty",
        "message": "Company name is required"
      }
    ],
    "legalContext": "Must match the name in incorporation documents exactly",
    "bestPractices": ["Verify with incorporation certificate", "Include legal entity type (Inc, LLC, etc.)"]
  }
]

IMPORTANT: Return EXACTLY ${fields.length} objects, one for each field in order.`;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      });
      const response = result.text;
      
      if (!response) {
        throw new Error('Empty response from LLM');
      }
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const enrichments = JSON.parse(jsonMatch[0]);
      
      // Validate we got the right number of enrichments
      if (!Array.isArray(enrichments) || enrichments.length !== fields.length) {
        console.warn(`LLM returned ${enrichments?.length || 0} enrichments, expected ${fields.length}`);
        return this.generateFallbackEnrichments(fields);
      }

      return enrichments;
    } catch (error) {
      console.error('LLM enrichment failed:', error);
      return this.generateFallbackEnrichments(fields);
    }
  }

  /**
   * Apply enrichments to fields
   */
  private applyEnrichment(
    fields: Field[],
    enrichments: FieldEnrichment[]
  ): Field[] {
    return fields.map((field, index) => {
      const enrichment = enrichments[index];
      
      if (!enrichment) {
        return field;
      }

      return {
        ...field,
        // Store enrichment data in metadata
        metadata: {
          description: enrichment.description,
          examples: enrichment.examples,
          validationRules: enrichment.validationRules,
          legalContext: enrichment.legalContext,
          bestPractices: enrichment.bestPractices,
        },
      };
    });
  }

  /**
   * Generate fallback enrichments without LLM
   */
  private generateFallbackEnrichments(fields: Field[]): FieldEnrichment[] {
    return fields.map(field => ({
      placeholder: field.placeholder,
      description: `Please provide the ${field.placeholder.toLowerCase()}`,
      examples: this.getExamplesForType(field.type),
      validationRules: this.getValidationForType(field.type),
      legalContext: undefined,
      bestPractices: undefined,
    }));
  }

  /**
   * Get example values based on field type
   */
  private getExamplesForType(type: FieldType): string[] {
    switch (type) {
      case 'currency':
        return ['$100,000', '$1,000,000', '$50,000'];
      case 'date':
        return ['January 1, 2024', 'March 15, 2024', 'December 31, 2023'];
      case 'text':
      default:
        return ['Example value', 'Sample text', 'Your value here'];
    }
  }

  /**
   * Get validation rules based on field type
   */
  private getValidationForType(type: FieldType): any[] {
    switch (type) {
      case 'currency':
        return [
          {
            type: 'required',
            rule: 'Must not be empty',
            message: 'This field is required',
          },
          {
            type: 'format',
            rule: 'Must be a valid currency amount',
            message: 'Please enter a valid dollar amount',
          },
        ];
      case 'date':
        return [
          {
            type: 'required',
            rule: 'Must not be empty',
            message: 'This field is required',
          },
          {
            type: 'format',
            rule: 'Must be a valid date',
            message: 'Please enter a valid date',
          },
        ];
      default:
        return [
          {
            type: 'required',
            rule: 'Must not be empty',
            message: 'This field is required',
          },
        ];
    }
  }

  /**
   * Generate cache key for document type and fields
   */
  private generateCacheKey(documentType: string, fields: Field[]): string {
    const fieldNames = fields.map(f => f.placeholder).sort().join('|');
    return `${documentType}:${fieldNames}`;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Create detector instance
 */
export function createHybridDetector(): HybridFieldDetector {
  return new HybridFieldDetector();
}
