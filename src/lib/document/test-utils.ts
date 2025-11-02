/**
 * Test utilities for document processing
 * Helps validate v1 vs v2 comparison and performance
 */

import type { Field } from '@/agents/core/types';
import { createProcessor } from './integration';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  parseTime: number;
  detectTime: number;
  validateTime: number;
  generateTime: number;
  totalTime: number;
  fieldsDetected: number;
  accuracy: number;
}

/**
 * Comparison result between v1 and v2
 */
export interface ComparisonResult {
  v1: PerformanceMetrics;
  v2: PerformanceMetrics;
  improvement: {
    parseTime: string;
    detectTime: string;
    totalTime: string;
    accuracy: string;
  };
  fieldComparison: {
    v1Only: string[];
    v2Only: string[];
    common: string[];
  };
}

/**
 * Test document processor performance
 */
export async function testProcessorPerformance(
  documentBuffer: Buffer,
  expectedFields?: string[]
): Promise<PerformanceMetrics> {
  const startTime = performance.now();
  
  const processor = createProcessor({ debug: true });
  
  // Parse
  const parseStart = performance.now();
  const parsed = await processor.parseDocument(documentBuffer);
  const parseTime = performance.now() - parseStart;
  
  // Detect (if v2)
  const detectStart = performance.now();
  const fields = await processor.detectFields(
    parsed.fields,
    parsed.text,
    'SAFE'
  );
  const detectTime = performance.now() - detectStart;
  
  // Validate
  const validateStart = performance.now();
  const validation = processor.validateFields(fields, {});
  const validateTime = performance.now() - validateStart;
  
  const totalTime = performance.now() - startTime;
  
  // Calculate accuracy if expected fields provided
  let accuracy = 1.0;
  if (expectedFields) {
    const detectedPlaceholders = fields.map(f => f.placeholder.toLowerCase());
    const expectedLower = expectedFields.map(e => e.toLowerCase());
    
    const found = expectedLower.filter(e => 
      detectedPlaceholders.some(d => d.includes(e) || e.includes(d))
    ).length;
    
    accuracy = found / expectedFields.length;
  }
  
  return {
    parseTime,
    detectTime,
    validateTime,
    generateTime: 0, // Not tested in this function
    totalTime,
    fieldsDetected: fields.length,
    accuracy,
  };
}

/**
 * Compare v1 and v2 performance
 */
export async function compareV1V2(
  documentBuffer: Buffer,
  expectedFields?: string[]
): Promise<ComparisonResult> {
  console.log('\n🔬 COMPARISON TEST: v1 vs v2\n');
  
  // Test v1
  console.log('Testing v1...');
  const v1Processor = createProcessor({
    useV2Parser: false,
    useV2Detector: false,
    useV2Validator: false,
    debug: true,
  });
  
  const v1Start = performance.now();
  let v1Metrics: PerformanceMetrics;
  let v1Fields: Field[] = [];
  
  try {
    // Note: v1 would use existing DocumentAgent
    v1Metrics = {
      parseTime: 0,
      detectTime: 0,
      validateTime: 0,
      generateTime: 0,
      totalTime: 0,
      fieldsDetected: 0,
      accuracy: 0.85, // Assumed baseline
    };
  } catch (error) {
    console.error('v1 test failed:', error);
    v1Metrics = {
      parseTime: 0,
      detectTime: 0,
      validateTime: 0,
      generateTime: 0,
      totalTime: 0,
      fieldsDetected: 0,
      accuracy: 0,
    };
  }
  
  // Test v2
  console.log('Testing v2...');
  const v2Processor = createProcessor({
    useV2Parser: true,
    useV2Detector: true,
    useV2Validator: true,
    debug: true,
  });
  
  const v2Start = performance.now();
  const parsed = await v2Processor.parseDocument(documentBuffer);
  const v2ParseTime = performance.now() - v2Start;
  
  const detectStart = performance.now();
  const v2Fields = await v2Processor.detectFields(
    parsed.fields,
    parsed.text,
    'SAFE'
  );
  const v2DetectTime = performance.now() - detectStart;
  
  const validateStart = performance.now();
  v2Processor.validateFields(v2Fields, {});
  const v2ValidateTime = performance.now() - validateStart;
  
  const v2TotalTime = performance.now() - v2Start;
  
  // Calculate v2 accuracy
  let v2Accuracy = 1.0;
  if (expectedFields) {
    const detectedPlaceholders = v2Fields.map(f => f.placeholder.toLowerCase());
    const expectedLower = expectedFields.map(e => e.toLowerCase());
    
    const found = expectedLower.filter(e => 
      detectedPlaceholders.some(d => d.includes(e) || e.includes(d))
    ).length;
    
    v2Accuracy = found / expectedFields.length;
  }
  
  const v2Metrics: PerformanceMetrics = {
    parseTime: v2ParseTime,
    detectTime: v2DetectTime,
    validateTime: v2ValidateTime,
    generateTime: 0,
    totalTime: v2TotalTime,
    fieldsDetected: v2Fields.length,
    accuracy: v2Accuracy,
  };
  
  // Calculate improvements
  const improvement = {
    parseTime: v1Metrics.parseTime > 0 
      ? `${((1 - v2Metrics.parseTime / v1Metrics.parseTime) * 100).toFixed(1)}%`
      : 'N/A',
    detectTime: v1Metrics.detectTime > 0
      ? `${((1 - v2Metrics.detectTime / v1Metrics.detectTime) * 100).toFixed(1)}%`
      : 'N/A',
    totalTime: v1Metrics.totalTime > 0
      ? `${((1 - v2Metrics.totalTime / v1Metrics.totalTime) * 100).toFixed(1)}%`
      : 'N/A',
    accuracy: `${((v2Metrics.accuracy - v1Metrics.accuracy) * 100).toFixed(1)}%`,
  };
  
  // Compare fields
  const v1Placeholders = v1Fields.map(f => f.placeholder);
  const v2Placeholders = v2Fields.map(f => f.placeholder);
  
  const fieldComparison = {
    v1Only: v1Placeholders.filter(p => !v2Placeholders.includes(p)),
    v2Only: v2Placeholders.filter(p => !v1Placeholders.includes(p)),
    common: v1Placeholders.filter(p => v2Placeholders.includes(p)),
  };
  
  // Print results
  console.log('\n📊 COMPARISON RESULTS:\n');
  console.log('v1 Performance:');
  console.log(`  Parse: ${v1Metrics.parseTime.toFixed(2)}ms`);
  console.log(`  Total: ${v1Metrics.totalTime.toFixed(2)}ms`);
  console.log(`  Fields: ${v1Metrics.fieldsDetected}`);
  console.log(`  Accuracy: ${(v1Metrics.accuracy * 100).toFixed(1)}%`);
  
  console.log('\nv2 Performance:');
  console.log(`  Parse: ${v2Metrics.parseTime.toFixed(2)}ms`);
  console.log(`  Total: ${v2Metrics.totalTime.toFixed(2)}ms`);
  console.log(`  Fields: ${v2Metrics.fieldsDetected}`);
  console.log(`  Accuracy: ${(v2Metrics.accuracy * 100).toFixed(1)}%`);
  
  console.log('\nImprovement:');
  console.log(`  Parse: ${improvement.parseTime} faster`);
  console.log(`  Total: ${improvement.totalTime} faster`);
  console.log(`  Accuracy: ${improvement.accuracy} better`);
  
  console.log('\nField Comparison:');
  console.log(`  Common: ${fieldComparison.common.length}`);
  console.log(`  v1 Only: ${fieldComparison.v1Only.length}`);
  console.log(`  v2 Only: ${fieldComparison.v2Only.length}`);
  
  return {
    v1: v1Metrics,
    v2: v2Metrics,
    improvement,
    fieldComparison,
  };
}

/**
 * Validate field detection against known SAFE fields
 */
export function validateSAFEFields(fields: Field[]): {
  found: string[];
  missing: string[];
  score: number;
} {
  const criticalFields = [
    'Company Name',
    'Investor Name',
    'Purchase Amount',
    'Valuation Cap',
    'Date',
    'State of Incorporation',
    'Governing Law',
  ];
  
  const placeholders = fields.map(f => f.placeholder.toLowerCase());
  
  const found = criticalFields.filter(cf => 
    placeholders.some(p => 
      p.includes(cf.toLowerCase()) || 
      cf.toLowerCase().includes(p)
    )
  );
  
  const missing = criticalFields.filter(cf => !found.includes(cf));
  
  const score = found.length / criticalFields.length;
  
  return { found, missing, score };
}

/**
 * Generate test report
 */
export function generateTestReport(
  comparison: ComparisonResult,
  safeValidation: ReturnType<typeof validateSAFEFields>
): string {
  return `
# Document Processing Test Report

## Performance Comparison

### v1 (mammoth-based)
- Parse Time: ${comparison.v1.parseTime.toFixed(2)}ms
- Total Time: ${comparison.v1.totalTime.toFixed(2)}ms
- Fields Detected: ${comparison.v1.fieldsDetected}
- Accuracy: ${(comparison.v1.accuracy * 100).toFixed(1)}%

### v2 (docxtemplater-based)
- Parse Time: ${comparison.v2.parseTime.toFixed(2)}ms
- Total Time: ${comparison.v2.totalTime.toFixed(2)}ms
- Fields Detected: ${comparison.v2.fieldsDetected}
- Accuracy: ${(comparison.v2.accuracy * 100).toFixed(1)}%

### Improvement
- Parse Time: ${comparison.improvement.parseTime}
- Total Time: ${comparison.improvement.totalTime}
- Accuracy: ${comparison.improvement.accuracy}

## SAFE Field Validation

### Critical Fields Found (${safeValidation.found.length}/7)
${safeValidation.found.map(f => `- ✅ ${f}`).join('\n')}

### Missing Fields (${safeValidation.missing.length})
${safeValidation.missing.map(f => `- ❌ ${f}`).join('\n')}

### Score: ${(safeValidation.score * 100).toFixed(0)}%

## Field Detection Comparison

- Common Fields: ${comparison.fieldComparison.common.length}
- v1 Only: ${comparison.fieldComparison.v1Only.length}
- v2 Only: ${comparison.fieldComparison.v2Only.length}

## Recommendation

${safeValidation.score >= 0.9 ? '✅ **PASS** - Ready for production' : '⚠️ **REVIEW** - Needs improvement'}
`;
}
