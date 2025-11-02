import { BaseAgent } from "./base-agent";
import type {
  AgentInput,
  AgentOutput,
  AgentType,
  Context,
  A2AMessage,
} from "./types";

export class Orchestrator extends BaseAgent {
  private sessions: Map<string, Context>;

  constructor() {
    super("orchestrator");
    this.sessions = new Map();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { type, data, context } = input;

    try {
      switch (type) {
        case "start_session":
          return await this.startSession(data, context);
        case "process_document":
          return await this.processDocument(data, context);
        case "route_message":
          return await this.routeMessage(data, context);
        case "complete_session":
          return await this.completeSession(data, context);
        default:
          throw new Error(`Unknown orchestrator action: ${type}`);
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Start a new session
  private async startSession(
    data: Record<string, any>,
    context?: Context
  ): Promise<AgentOutput> {
    const sessionId = this.generateSessionId();
    
    const sessionContext: Context = {
      sessionId,
      fields: [],
      filledFields: {},
      conversationHistory: [],
      documentStructure: [],
    };

    this.sessions.set(sessionId, sessionContext);

    return {
      success: true,
      data: { sessionId, context: sessionContext },
    };
  }

  // Process uploaded document
  private async processDocument(
    data: Record<string, any>,
    context?: Context
  ): Promise<AgentOutput> {
    if (!context?.sessionId) {
      throw new Error("Session ID required");
    }

    // Send to document agent via A2A
    const parseResponse = await this.sendToAgent("document", "parse", {
      fileBuffer: data.fileBuffer,
      fileName: data.fileName,
    });

    if (!parseResponse.success) {
      throw new Error(parseResponse.error || "Document parsing failed");
    }

    // Update session context
    const sessionContext = this.sessions.get(context.sessionId);
    if (sessionContext) {
      sessionContext.fields = parseResponse.data.fields || [];
      sessionContext.documentStructure = parseResponse.data.structure || [];
      this.sessions.set(context.sessionId, sessionContext);
    }

    return {
      success: true,
      data: parseResponse.data,
      nextAgent: "conversation",
    };
  }

  // Route user messages to appropriate agent
  private async routeMessage(
    data: Record<string, any>,
    context?: Context
  ): Promise<AgentOutput> {
    if (!context?.sessionId) {
      throw new Error("Session ID required");
    }

    const sessionContext = this.sessions.get(context.sessionId);
    if (!sessionContext) {
      throw new Error("Session not found");
    }

    // Determine intent and route to conversation agent
    const intent = await this.determineIntent(data.message, sessionContext);

    if (intent === "conversation") {
      return {
        success: true,
        data: { agent: "conversation", context: sessionContext },
        nextAgent: "conversation",
      };
    }

    return {
      success: true,
      data: { agent: "conversation", context: sessionContext },
      nextAgent: "conversation",
    };
  }

  // Complete session and prepare for export
  private async completeSession(
    data: Record<string, any>,
    context?: Context
  ): Promise<AgentOutput> {
    if (!context?.sessionId) {
      throw new Error("Session ID required");
    }

    const sessionContext = this.sessions.get(context.sessionId);
    if (!sessionContext) {
      throw new Error("Session not found");
    }

    return {
      success: true,
      data: { ready: true, context: sessionContext },
      nextAgent: "export",
    };
  }

  // Get session context
  getSession(sessionId: string): Context | undefined {
    return this.sessions.get(sessionId);
  }

  // Update session context
  updateSession(sessionId: string, updates: Partial<Context>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...updates });
    }
  }

  // Handle A2A messages
  protected async handleA2AMessage(
    message: A2AMessage
  ): Promise<Record<string, any>> {
    switch (message.action) {
      case "update_progress":
        return this.handleProgressUpdate(message.payload);
      case "field_complete":
        return this.handleFieldComplete(message.payload);
      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }

  private async handleProgressUpdate(
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const { sessionId, progress } = payload;
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // Update session with progress info
      this.sessions.set(sessionId, { ...session, ...progress });
    }

    return { updated: true };
  }

  private async handleFieldComplete(
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const { sessionId, fieldId, value } = payload;
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.filledFields = session.filledFields || {};
      session.filledFields[fieldId] = value;
      this.sessions.set(sessionId, session);
    }

    return { recorded: true };
  }

  // Determine user intent
  private async determineIntent(
    message: string,
    context: Context
  ): Promise<string> {
    // Simple intent detection - can be enhanced with LLM
    return "conversation";
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
