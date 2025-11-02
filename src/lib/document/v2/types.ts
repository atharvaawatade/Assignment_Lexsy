import type { Field } from "@/agents/core/types";

/**
 * Parsed document structure
 */
export interface ParsedDocument {
  buffer: Buffer;
  text: string;
  structuredFields: Field[];
  unstructuredFields: Field[];
  metadata: DocumentMetadata;
  tags: DocumentTag[];
}

/**
 * Document metadata extracted during parsing
 */
export interface DocumentMetadata {
  pageCount?: number;
  wordCount: number;
  characterCount: number;
  hasImages: boolean;
  hasTables: boolean;
  hasHeaders: boolean;
  hasFooters: boolean;
  documentType?: string;
  fingerprint: string;
}

/**
 * Document tag detected by docxtemplater
 */
export interface DocumentTag {
  name: string;
  type: 'simple' | 'loop' | 'condition';
  position: number;
  raw: string;
}

/**
 * Field detection result with confidence
 */
export interface FieldDetectionResult {
  fields: Field[];
  confidence: number;
  method: 'template' | 'regex' | 'llm' | 'hybrid';
  metadata?: Record<string, any>;
}

/**
 * Document generation options
 */
export interface GenerationOptions {
  format?: 'docx' | 'pdf';
  includeMetadata?: boolean;
  compressionLevel?: number;
  auditTrail?: boolean;
}

/**
 * Generated document result
 */
export interface GeneratedDocument {
  buffer: Buffer;
  metadata: GenerationMetadata;
  auditLog?: AuditLogEntry[];
}

/**
 * Generation metadata
 */
export interface GenerationMetadata {
  generatedAt: Date;
  processingTime: number;
  fieldCount: number;
  fileSize: number;
  checksum: string;
}

/**
 * Audit log entry for legal compliance
 */
export interface AuditLogEntry {
  timestamp: Date;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Field enrichment data from LLM
 */
export interface FieldEnrichment {
  placeholder: string;
  description: string;
  examples: string[];
  validationRules: ValidationRule[];
  legalContext?: string;
  bestPractices?: string[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'format' | 'range' | 'required' | 'pattern' | 'custom';
  rule: string;
  message: string;
}
