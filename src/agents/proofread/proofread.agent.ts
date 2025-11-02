import { BaseAgent } from "../core/base-agent";
import type {
  AgentInput,
  AgentOutput,
  Field,
  A2AMessage,
} from "../core/types";

export class ProofreadAgent extends BaseAgent {
  constructor() {
    super("proofread");
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { type, data } = input;

    try {
      switch (type) {
        case "review":
          return await this.reviewFields(data);
        default:
          throw new Error(`Unknown proofread action: ${type}`);
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Review all filled fields and identify potential issues
  private async reviewFields(
    data: Record<string, any>
  ): Promise<AgentOutput> {
    const { fields, filledFields } = data;

    const issues: Array<{
      fieldId: string;
      fieldName: string;
      value: string;
      suggestion?: string;
      severity: "warning" | "info";
    }> = [];

    for (const field of fields) {
      const value = filledFields[field.id];
      if (!value) continue;

      // Check for common issues
      const fieldIssues = this.checkFieldIssues(field, value);
      if (fieldIssues.length > 0) {
        issues.push(...fieldIssues);
      }
    }

    return {
      success: true,
      data: {
        issues,
        hasIssues: issues.length > 0,
      },
    };
  }

  private checkFieldIssues(
    field: Field,
    value: string
  ): Array<{
    fieldId: string;
    fieldName: string;
    value: string;
    suggestion?: string;
    severity: "warning" | "info";
  }> {
    const issues = [];
    const fieldNameLower = field.placeholder.toLowerCase();

    // Check for common naming issues
    if (fieldNameLower.includes("name")) {
      // Check for all lowercase/uppercase
      if (value === value.toLowerCase() && value.length > 3) {
        issues.push({
          fieldId: field.id,
          fieldName: field.placeholder,
          value,
          suggestion: "Consider using proper capitalization (e.g., 'Acme Corp' instead of 'acme corp')",
          severity: "info" as const,
        });
      }
      
      // Check for numbers in company name (might be intentional)
      if (/^\d+$/.test(value)) {
        issues.push({
          fieldId: field.id,
          fieldName: field.placeholder,
          value,
          suggestion: "This appears to be only numbers. Is this correct?",
          severity: "warning" as const,
        });
      }
    }

    // Check date formatting
    if (field.type === "date") {
      const hasComma = value.includes(",");
      const hasSlash = value.includes("/");
      
      if (!hasComma && !hasSlash && !value.includes("-")) {
        issues.push({
          fieldId: field.id,
          fieldName: field.placeholder,
          value,
          suggestion: "Consider using a clearer date format (e.g., 'January 1, 2024' or '01/01/2024')",
          severity: "info" as const,
        });
      }
    }

    // Check for very short entries
    if (value.length < 3 && field.type === "text") {
      issues.push({
        fieldId: field.id,
        fieldName: field.placeholder,
        value,
        suggestion: "This entry seems very short. Please verify it's correct.",
        severity: "warning" as const,
      });
    }

    return issues;
  }

  // Handle A2A messages
  protected async handleA2AMessage(
    message: A2AMessage
  ): Promise<Record<string, any>> {
    switch (message.action) {
      case "review":
        const result = await this.reviewFields(message.payload);
        return result.data;
      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }
}
