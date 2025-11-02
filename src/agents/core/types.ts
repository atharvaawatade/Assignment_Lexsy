// Core types for the agent system

export type AgentType = 'orchestrator' | 'document' | 'conversation' | 'validation' | 'export' | 'proofread';

export type FieldType = 'text' | 'date' | 'currency' | 'enum';

export interface Field {
  id: string;
  placeholder: string;
  type: FieldType;
  required: boolean;
  validation?: ValidationRule;
  dependencies?: string[];
  order: number;
}

export interface ValidationRule {
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface AgentInput {
  type: string;
  data: Record<string, any>;
  context?: Context;
}

export interface AgentOutput {
  success: boolean;
  data: Record<string, any>;
  error?: string;
  nextAgent?: AgentType;
}

export interface Context {
  sessionId: string;
  fields?: Field[];
  filledFields?: Record<string, string>;
  conversationHistory?: Message[];
  documentStructure?: DocumentNode[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fieldId?: string;
}

export interface DocumentNode {
  type: 'paragraph' | 'heading' | 'list';
  content: string;
  placeholders: string[];
  formatting?: FormatStyle;
}

export interface FormatStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
}

// A2A Protocol Types
export interface A2AMessage {
  from: AgentType;
  to: AgentType;
  action: string;
  payload: Record<string, any>;
  requestId: string;
  timestamp: Date;
}

export interface A2AResponse {
  success: boolean;
  data: Record<string, any>;
  error?: string;
  requestId: string;
}

export interface Session {
  id: string;
  fileName: string;
  fileBuffer: Buffer;
  createdAt: Date;
  status: 'parsing' | 'chatting' | 'complete';
  fields: Field[];
  filledFields: Record<string, string>;
  conversationHistory: Message[];
}
