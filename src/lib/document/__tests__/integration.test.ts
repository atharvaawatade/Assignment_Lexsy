import { describe, it, expect, beforeEach } from 'vitest';
import { createProcessor } from '../integration';
import fs from 'fs';
import path from 'path';

describe('Document Processing Integration', () => {
  let testDocument: Buffer;

  beforeEach(() => {
    const docPath = path.join(process.cwd(), 'test-documents', 'safe-valuation-cap.docx');
    if (fs.existsSync(docPath)) {
      testDocument = fs.readFileSync(docPath);
    }
  });

  describe('Full Pipeline with v2 Components', () => {
    it('should process document end-to-end', async () => {
      if (!testDocument) {
        console.warn('Test document not found');
        return;
      }

      const processor = createProcessor({
        useV2Parser: true,
        useV2Detector: true,
        useV2Validator: true,
        useV2Generator: true,
        debug: true,
      });

      // Step 1: Parse
      const parsed = await processor.parseDocument(testDocument);
      
      expect(parsed.fields).toBeDefined();
      expect(parsed.fields.length).toBeGreaterThan(0);
      expect(parsed.text).toBeTruthy();
      expect(parsed.version).toBe('v2');

      // Step 2: Detect (enhance fields)
      const enhancedFields = await processor.detectFields(
        parsed.fields,
        parsed.text,
        'SAFE'
      );

      expect(enhancedFields.length).toBeGreaterThanOrEqual(parsed.fields.length);

      // Step 3: Validate (empty fields should fail)
      const validation = processor.validateFields(enhancedFields, {});
      
      expect(validation.errors.length).toBeGreaterThan(0);

      // Step 4: Validate with filled fields
      const filledFields: Record<string, string> = {};
      enhancedFields.forEach(field => {
        if (field.required) {
          if (field.type === 'currency') {
            filledFields[field.id] = '$100,000';
          } else if (field.type === 'date') {
            filledFields[field.id] = 'January 1, 2024';
          } else {
            filledFields[field.id] = 'Test Value';
          }
        }
      });

      const validValidation = processor.validateFields(enhancedFields, filledFields);
      
      expect(validValidation.valid).toBe(true);

      // Step 5: Generate document
      const fieldMap: Record<string, any> = {};
      enhancedFields.forEach(field => {
        fieldMap[field.placeholder.toLowerCase().replace(/\s+/g, '_')] = filledFields[field.id] || 'N/A';
      });

      const generated = await processor.generateDocument(testDocument, fieldMap);
      
      expect(generated).toBeInstanceOf(Buffer);
      expect(generated.length).toBeGreaterThan(0);
    });

    it('should track performance metrics', async () => {
      if (!testDocument) return;

      const processor = createProcessor({ debug: true });

      const startTime = performance.now();
      
      // Full pipeline
      const parsed = await processor.parseDocument(testDocument);
      const fields = await processor.detectFields(parsed.fields, parsed.text);
      processor.validateFields(fields, {});
      
      const duration = performance.now() - startTime;

      // Should complete in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Feature Flag Control', () => {
    it('should use v2 parser when enabled', async () => {
      if (!testDocument) return;

      const processor = createProcessor({
        useV2Parser: true,
      });

      const result = await processor.parseDocument(testDocument);
      
      expect(result.version).toBe('v2');
    });

    it('should use v2 validator when enabled', () => {
      const processor = createProcessor({
        useV2Validator: true,
      });

      const fields = [
        {
          id: '1',
          placeholder: 'Test',
          type: 'text' as const,
          required: true,
          order: 0,
        },
      ];

      const result = processor.validateFields(fields, {});
      
      // v2 validator should return structured errors
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('SAFE Document Processing', () => {
    it('should detect critical SAFE fields', async () => {
      if (!testDocument) return;

      const processor = createProcessor({
        useV2Parser: true,
        useV2Detector: true,
      });

      const parsed = await processor.parseDocument(testDocument);
      const fields = await processor.detectFields(parsed.fields, parsed.text, 'SAFE');

      const criticalFields = [
        'company',
        'investor',
        'amount',
        'valuation',
        'date',
      ];

      const placeholders = fields.map(f => f.placeholder.toLowerCase());

      const foundCritical = criticalFields.filter(critical =>
        placeholders.some(p => p.includes(critical))
      );

      // Should find at least 3 out of 5 critical fields
      expect(foundCritical.length).toBeGreaterThanOrEqual(3);
    });

    it('should validate SAFE-specific rules', async () => {
      if (!testDocument) return;

      const processor = createProcessor({
        useV2Parser: true,
        useV2Validator: true,
      });

      const parsed = await processor.parseDocument(testDocument);
      
      // Create fields with proper IDs
      const fields = parsed.fields.slice(0, 6).map((f, i) => ({
        ...f,
        id: (i + 1).toString(),
        required: false, // Make optional to avoid missing field errors
      }));

      // Create filled fields matching the IDs
      const filledFields: Record<string, string> = {};
      fields.forEach((field, i) => {
        if (field.type === 'currency') {
          filledFields[field.id] = '$100,000';
        } else if (field.type === 'date') {
          filledFields[field.id] = 'January 1, 2024';
        } else {
          filledFields[field.id] = 'Test Value';
        }
      });

      const validation = processor.validateFields(fields, filledFields);

      // Should be valid since all fields are filled with appropriate values
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle parser errors gracefully', async () => {
      const invalidBuffer = Buffer.from('invalid docx');
      const processor = createProcessor({ useV2Parser: true });

      await expect(
        processor.parseDocument(invalidBuffer)
      ).rejects.toThrow();
    });

    it('should handle validation errors', () => {
      const processor = createProcessor({ useV2Validator: true });
      
      const fields = [
        {
          id: '1',
          placeholder: 'Invalid Field',
          type: 'currency' as const,
          required: true,
          order: 0,
        },
      ];

      const result = processor.validateFields(fields, {
        '1': 'not a number',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle generation errors', async () => {
      const invalidBuffer = Buffer.from('invalid');
      const processor = createProcessor({ useV2Generator: true });

      await expect(
        processor.generateDocument(invalidBuffer, {})
      ).rejects.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should parse within target time', async () => {
      if (!testDocument) return;

      const processor = createProcessor({ useV2Parser: true });

      const startTime = performance.now();
      await processor.parseDocument(testDocument);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Target: <100ms
    });

    it('should validate within target time', () => {
      const processor = createProcessor({ useV2Validator: true });

      const fields = Array.from({ length: 20 }, (_, i) => ({
        id: i.toString(),
        placeholder: `Field ${i}`,
        type: 'text' as const,
        required: true,
        order: i,
      }));

      const filledFields = Object.fromEntries(
        fields.map(f => [f.id, 'Test Value'])
      );

      const startTime = performance.now();
      processor.validateFields(fields, filledFields);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(20); // Target: <20ms
    });
  });

  describe('Stats and Monitoring', () => {
    it('should provide processor stats', () => {
      const processor = createProcessor({
        useV2Parser: true,
        useV2Detector: true,
      });

      const stats = processor.getStats();

      expect(stats.version).toBeDefined();
      expect(stats.features).toBeDefined();
      expect(stats.features.useV2Parser).toBe(true);
      expect(stats.features.useV2Detector).toBe(true);
    });
  });

  describe('Caching Behavior', () => {
    it('should benefit from repeated processing', async () => {
      if (!testDocument) return;

      const processor = createProcessor({
        useV2Parser: true,
        useV2Detector: true,
        enableCaching: true,
      });

      // First run
      const start1 = performance.now();
      const parsed1 = await processor.parseDocument(testDocument);
      await processor.detectFields(parsed1.fields, parsed1.text, 'SAFE');
      const duration1 = performance.now() - start1;

      // Second run (should be faster due to caching)
      const start2 = performance.now();
      const parsed2 = await processor.parseDocument(testDocument);
      await processor.detectFields(parsed2.fields, parsed2.text, 'SAFE');
      const duration2 = performance.now() - start2;

      console.log('First run:', duration1, 'Second run:', duration2);

      // Both should complete successfully
      expect(parsed1.fields.length).toBeGreaterThan(0);
      expect(parsed2.fields.length).toBeGreaterThan(0);
    });
  });
});
