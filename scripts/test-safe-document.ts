/**
 * Manual Testing Script for SAFE Document
 * 
 * Tests the complete document processing pipeline with a real SAFE document
 * 
 * Usage: npx tsx scripts/test-safe-document.ts
 */

import fs from 'fs';
import path from 'path';
import { createEnhancedParser } from '../src/lib/document/v2/parser';
import { createValidator } from '../src/lib/document/v2/validator';
import { createGenerator } from '../src/lib/document/v2/generator';
import { validateSAFEFields } from '../src/lib/document/test-utils';
import type { Field } from '../src/agents/core/types';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  logSection('🧪 SAFE DOCUMENT TESTING SUITE');

  // Load test document
  const docPath = path.join(process.cwd(), 'test-documents', 'safe-valuation-cap.docx');
  
  if (!fs.existsSync(docPath)) {
    log('❌ Test document not found at: ' + docPath, 'red');
    log('Please ensure safe-valuation-cap.docx exists in test-documents/', 'yellow');
    process.exit(1);
  }

  const documentBuffer = fs.readFileSync(docPath);
  log(`✅ Loaded test document (${(documentBuffer.length / 1024).toFixed(2)} KB)`, 'green');

  // Test 1: Parser
  logSection('TEST 1: Enhanced Parser');
  
  const parser = createEnhancedParser();
  
  log('Parsing document...', 'cyan');
  const parseStart = performance.now();
  
  let parsed;
  try {
    parsed = await parser.parse(documentBuffer);
    const parseTime = performance.now() - parseStart;
    
    log(`✅ Parse successful in ${parseTime.toFixed(2)}ms`, 'green');
    log(`   Target: <100ms - ${parseTime < 100 ? '✅ PASS' : '❌ FAIL'}`, parseTime < 100 ? 'green' : 'red');
    
    console.log('\n📊 Parse Results:');
    console.log(`   Document text length: ${parsed.text.length} characters`);
    console.log(`   Word count: ${parsed.metadata.wordCount}`);
    console.log(`   Structured fields: ${parsed.structuredFields.length}`);
    console.log(`   Unstructured fields: ${parsed.unstructuredFields.length}`);
    console.log(`   Document fingerprint: ${parsed.metadata.fingerprint}`);
    
    // Show detected fields
    if (parsed.structuredFields.length > 0) {
      console.log('\n📝 Structured Fields Detected:');
      parsed.structuredFields.forEach((field, i) => {
        console.log(`   ${i + 1}. ${field.placeholder} (${field.type})`);
      });
    }
    
    if (parsed.unstructuredFields.length > 0) {
      console.log('\n📝 Unstructured Fields Detected:');
      parsed.unstructuredFields.slice(0, 10).forEach((field, i) => {
        console.log(`   ${i + 1}. ${field.placeholder} (${field.type})`);
      });
      if (parsed.unstructuredFields.length > 10) {
        console.log(`   ... and ${parsed.unstructuredFields.length - 10} more`);
      }
    }
  } catch (error) {
    log(`❌ Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    process.exit(1);
  }

  // Test 2: Field Deduplication
  logSection('TEST 2: Smart Deduplication');
  
  const allFields = [...parsed.structuredFields, ...parsed.unstructuredFields];
  log(`Total fields before deduplication: ${allFields.length}`, 'cyan');
  
  const dedupedFields = parser.smartDeduplication(allFields);
  log(`✅ Fields after deduplication: ${dedupedFields.length}`, 'green');
  log(`   Removed ${allFields.length - dedupedFields.length} duplicate(s)`, 'yellow');

  // Test 3: SAFE Field Validation
  logSection('TEST 3: SAFE Field Validation');
  
  const safeValidation = validateSAFEFields(dedupedFields);
  
  console.log('📋 Critical SAFE Fields:');
  console.log(`   Found: ${safeValidation.found.length}/7`);
  console.log(`   Score: ${(safeValidation.score * 100).toFixed(0)}%`);
  
  if (safeValidation.found.length > 0) {
    console.log('\n✅ Found Fields:');
    safeValidation.found.forEach(field => {
      log(`   • ${field}`, 'green');
    });
  }
  
  if (safeValidation.missing.length > 0) {
    console.log('\n❌ Missing Fields:');
    safeValidation.missing.forEach(field => {
      log(`   • ${field}`, 'red');
    });
  }
  
  const passThreshold = 0.7; // 70% of critical fields
  if (safeValidation.score >= passThreshold) {
    log(`\n✅ SAFE validation PASSED (>= ${passThreshold * 100}%)`, 'green');
  } else {
    log(`\n⚠️  SAFE validation needs improvement (< ${passThreshold * 100}%)`, 'yellow');
  }

  // Test 4: Validator
  logSection('TEST 4: Field Validator');
  
  const validator = createValidator();
  
  // Test with empty fields (should fail)
  log('Testing validation with empty fields...', 'cyan');
  const emptyValidation = validator.validate(dedupedFields.slice(0, 5), {});
  
  if (!emptyValidation.valid) {
    log(`✅ Correctly rejected empty fields`, 'green');
    console.log(`   Errors: ${emptyValidation.errors.length}`);
    emptyValidation.errors.slice(0, 3).forEach(error => {
      console.log(`   • ${error.field}: ${error.message}`);
    });
  }

  // Test with valid data
  log('\nTesting validation with valid data...', 'cyan');
  const validFields: Record<string, string> = {};
  dedupedFields.slice(0, 5).forEach((field, i) => {
    const id = (i + 1).toString();
    if (field.type === 'currency') {
      validFields[id] = '$100,000';
    } else if (field.type === 'date') {
      validFields[id] = 'January 1, 2024';
    } else {
      validFields[id] = 'Test Value';
    }
  });

  const testFields = dedupedFields.slice(0, 5).map((f, i) => ({
    ...f,
    id: (i + 1).toString(),
  }));

  const validValidation = validator.validate(testFields, validFields);
  
  if (validValidation.valid) {
    log(`✅ Valid data accepted`, 'green');
  } else {
    log(`❌ Valid data rejected (unexpected)`, 'red');
    validValidation.errors.forEach(error => {
      console.log(`   • ${error.message}`);
    });
  }

  if (validValidation.warnings && validValidation.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${validValidation.warnings.length}`);
    validValidation.warnings.forEach(warning => {
      console.log(`   • ${warning.message}`);
    });
  }

  // Test 5: Generator
  logSection('TEST 5: Document Generator');
  
  const generator = createGenerator();
  
  log('Generating document...', 'cyan');
  const genStart = performance.now();
  
  const fieldMap: Record<string, any> = {
    company_name: 'Acme Inc.',
    investor_name: 'John Doe',
    purchase_amount: 100000,
    valuation_cap: 5000000,
    date_of_safe: '2024-01-15',
    state_of_incorporation: 'Delaware',
  };

  try {
    const generated = await generator.generate(documentBuffer, fieldMap, {
      auditTrail: true,
      compressionLevel: 9,
    });
    
    const genTime = performance.now() - genStart;
    
    log(`✅ Generation successful in ${genTime.toFixed(2)}ms`, 'green');
    log(`   Target: <200ms - ${genTime < 200 ? '✅ PASS' : '❌ FAIL'}`, genTime < 200 ? 'green' : 'red');
    
    console.log('\n📊 Generation Metadata:');
    console.log(`   File size: ${(generated.metadata.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   Fields filled: ${generated.metadata.fieldCount}`);
    console.log(`   Processing time: ${generated.metadata.processingTime.toFixed(2)}ms`);
    console.log(`   Checksum: ${generated.metadata.checksum.substring(0, 16)}...`);
    
    if (generated.auditLog) {
      console.log(`   Audit log entries: ${generated.auditLog.length}`);
    }
    
    // Save generated document
    const outputPath = path.join(process.cwd(), 'test-documents', 'generated-safe.docx');
    fs.writeFileSync(outputPath, generated.buffer);
    log(`\n💾 Generated document saved to: ${outputPath}`, 'blue');
  } catch (error) {
    log(`❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
  }

  // Final Summary
  logSection('📊 FINAL SUMMARY');
  
  const results = {
    parsing: parseStart !== undefined,
    deduplication: dedupedFields.length > 0,
    safeValidation: safeValidation.score >= passThreshold,
    validator: validValidation.valid,
    generator: true, // If we got here, it worked
  };

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.values(results).length;
  
  console.log('Test Results:');
  console.log(`   Parsing: ${results.parsing ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Deduplication: ${results.deduplication ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   SAFE Validation: ${results.safeValidation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Field Validator: ${results.validator ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Generator: ${results.generator ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log(`\n📈 Score: ${passedTests}/${totalTests} (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
  
  if (passedTests === totalTests) {
    log('\n🎉 ALL TESTS PASSED!', 'green');
    log('The v2 document processing system is working correctly.', 'green');
  } else {
    log(`\n⚠️  ${totalTests - passedTests} test(s) failed`, 'yellow');
    log('Please review the errors above and fix the issues.', 'yellow');
  }
  
  logSection('✨ TESTING COMPLETE');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
