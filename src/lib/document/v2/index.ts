/**
 * Document Processing v2 - Production Grade
 * 
 * Export all v2 components from a single entry point
 */

// Core components
export * from './types';
export * from './parser';
export * from './detector';
export * from './generator';
export * from './validator';

// Re-export formatters for convenience
export * from '../formatters';
export * from '../highlighter';

// Factory functions for easy instantiation
import { createEnhancedParser } from './parser';
import { createHybridDetector } from './detector';
import { createGenerator } from './generator';
import { createValidator } from './validator';

/**
 * Create a complete v2 processing pipeline
 */
export function createDocumentPipeline() {
  return {
    parser: createEnhancedParser(),
    detector: createHybridDetector(),
    generator: createGenerator(),
    validator: createValidator(),
  };
}

/**
 * Version information
 */
export const VERSION = '2.0.0';
export const FEATURES = {
  templateAware: true,
  llmEnhanced: true,
  legalGrade: true,
  highFidelity: true,
  costOptimized: true,
};
