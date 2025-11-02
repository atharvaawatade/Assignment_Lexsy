import { BaseAgent } from "../core/base-agent";
import type { AgentInput, AgentOutput, A2AMessage } from "../core/types";
import { generateDocx } from "@/lib/document/generator";

export class ExportAgent extends BaseAgent {
  constructor() {
    super("export");
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { type, data } = input;

    try {
      switch (type) {
        case "generate":
          return await this.generateDocument(data);
        default:
          throw new Error(`Unknown export action: ${type}`);
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async generateDocument(
    data: Record<string, any>
  ): Promise<AgentOutput> {
    const { templateBuffer, fields, fileName } = data;

    if (!templateBuffer) {
      throw new Error("Template buffer is required");
    }

    if (!fields || Object.keys(fields).length === 0) {
      throw new Error("No fields provided");
    }

    // Generate the document
    const documentBuffer = await generateDocx(templateBuffer, fields);

    return {
      success: true,
      data: {
        buffer: documentBuffer,
        fileName: fileName || "completed-document.docx",
        size: documentBuffer.length,
      },
    };
  }

  // Handle A2A messages
  protected async handleA2AMessage(
    message: A2AMessage
  ): Promise<Record<string, any>> {
    switch (message.action) {
      case "generate":
        const result = await this.generateDocument(message.payload);
        return result.data;
      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }
}
