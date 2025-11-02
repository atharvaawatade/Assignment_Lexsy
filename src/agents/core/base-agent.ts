import { GoogleGenAI } from "@google/genai";
import type {
  AgentInput,
  AgentOutput,
  AgentType,
  A2AMessage,
  A2AResponse,
} from "./types";

export abstract class BaseAgent {
  protected ai: GoogleGenAI;
  protected agentType: AgentType;
  protected agentRegistry: Map<string, BaseAgent>;

  constructor(agentType: AgentType) {
    this.agentType = agentType;
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "AIzaSyDJYqdQAmp2MGUV3nPK5JHbouCeEBEN868",
    });
    this.agentRegistry = new Map();
  }

  // Register other agents for A2A communication
  registerAgent(agentType: AgentType, agent: BaseAgent): void {
    this.agentRegistry.set(agentType, agent);
  }

  // Main execution method - must be implemented by subclasses
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  // A2A Protocol: Send message to another agent
  protected async sendToAgent(
    targetAgentType: AgentType,
    action: string,
    payload: Record<string, any>
  ): Promise<A2AResponse> {
    const targetAgent = this.agentRegistry.get(targetAgentType);
    
    if (!targetAgent) {
      throw new Error(`Agent ${targetAgentType} not found in registry`);
    }

    const message: A2AMessage = {
      from: this.agentType,
      to: targetAgentType,
      action,
      payload,
      requestId: this.generateRequestId(),
      timestamp: new Date(),
    };

    return await targetAgent.receiveMessage(message);
  }

  // A2A Protocol: Receive message from another agent
  async receiveMessage(message: A2AMessage): Promise<A2AResponse> {
    try {
      const result = await this.handleA2AMessage(message);
      return {
        success: true,
        data: result,
        requestId: message.requestId,
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
        requestId: message.requestId,
      };
    }
  }

  // Handle A2A messages - can be overridden by subclasses
  protected async handleA2AMessage(
    message: A2AMessage
  ): Promise<Record<string, any>> {
    throw new Error(
      `Agent ${this.agentType} does not handle action: ${message.action}`
    );
  }

  // Call Gemini LLM
  protected async callLLM(
    prompt: string,
    systemInstruction?: string
  ): Promise<string> {
    try {
      const fullPrompt = systemInstruction 
        ? `${systemInstruction}\n\n${prompt}` 
        : prompt;
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: fullPrompt,
      });
      return response.text || "";
    } catch (error) {
      console.error("LLM call failed:", error);
      throw new Error("Failed to get response from AI");
    }
  }

  // Stream responses from Gemini
  protected async *streamLLM(
    prompt: string,
    systemInstruction?: string
  ): AsyncGenerator<string> {
    try {
      const fullPrompt = systemInstruction 
        ? `${systemInstruction}\n\n${prompt}` 
        : prompt;
      
      const response = await this.ai.models.generateContentStream({
        model: "gemini-2.0-flash-exp",
        contents: fullPrompt,
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error("LLM streaming failed:", error);
      throw new Error("Failed to stream response from AI");
    }
  }

  // Utility: Generate unique request ID
  private generateRequestId(): string {
    return `${this.agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
