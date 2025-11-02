import { BaseAgent } from "../core/base-agent";
import type {
  AgentInput,
  AgentOutput,
  Field,
  Message,
  A2AMessage,
} from "../core/types";

export class ConversationAgent extends BaseAgent {
  constructor() {
    super("conversation");
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { type, data, context } = input;

    try {
      switch (type) {
        case "start":
          return await this.startConversation(data, context);
        case "respond":
          return await this.handleUserResponse(data, context);
        default:
          throw new Error(`Unknown conversation action: ${type}`);
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async startConversation(
    data: Record<string, any>,
    context?: any
  ): Promise<AgentOutput> {
    const { fields } = data;

    if (!fields || fields.length === 0) {
      throw new Error("No fields to collect");
    }

    // Get the first field
    const firstField = fields[0];
    
    // Generate greeting + first question
    const greeting = `Hi! I'll help you fill out this document. I need to collect ${fields.length} pieces of information.\n\n`;
    const firstQuestion = await this.generateQuestion(firstField, []);
    
    return {
      success: true,
      data: {
        message: greeting + firstQuestion,
        fieldId: firstField.id,
        nextFieldIndex: 0,
      },
    };
  }

  private async handleUserResponse(
    data: Record<string, any>,
    context?: any
  ): Promise<AgentOutput> {
    const { message, fields, filledFields, conversationHistory, currentFieldId } = data;

    console.log("=== CONVERSATION AGENT: handleUserResponse ===");
    console.log("User message:", message);
    console.log("Fields count:", fields?.length);
    console.log("Filled fields:", Object.keys(filledFields || {}).length);
    console.log("Current field ID:", currentFieldId);

    // Get the current field being validated
    const currentField = currentFieldId 
      ? fields.find((f: any) => f.id === currentFieldId)
      : fields[Object.keys(filledFields).length];

    if (!currentField) {
      console.log("No current field found - this shouldn't happen!");
      return {
        success: false,
        data: {},
        error: "Current field not found",
      };
    }

    // 🤖 AGENTIC INTELLIGENCE: Detect user intent using AI
    const intent = await this.detectIntent(message, currentField, fields, filledFields);
    console.log("Detected intent:", intent);

    // Handle field navigation intent
    if (intent.type === "navigate" || intent.type === "skip") {
      console.log("User wants to navigate to a different field");
      
      // Try to find the field they want
      const targetFieldName = message.toLowerCase();
      const targetField = fields.find((f: Field) => 
        f.placeholder.toLowerCase().includes(targetFieldName) ||
        targetFieldName.includes(f.placeholder.toLowerCase())
      );
      
      if (targetField) {
        return {
          success: true,
          data: {
            message: `Sure! Let's fill in ${targetField.placeholder}.\n\nWhat value should I use for ${targetField.placeholder}?`,
            fieldId: targetField.id,
            skipTo: targetField.id,
            conversational: true,
          },
        };
      } else {
        return {
          success: true,
          data: {
            message: `I couldn't find a field matching "${message}". Here are the available fields:\n\n${fields.map((f: Field, i: number) => `${i + 1}. ${f.placeholder}`).join('\n')}\n\nWhich one would you like to fill?`,
            fieldId: currentField.id,
            conversational: true,
          },
        };
      }
    }

    // Handle different intents
    if (intent.type === "question" || intent.type === "help") {
      console.log("User is asking a question, providing helpful response");
      const helpResponse = await this.answerQuestion(message, currentField, fields, filledFields);
      return {
        success: true,
        data: {
          message: helpResponse,
          fieldId: currentField.id,
          retry: false, // Don't count as retry, just conversation
          conversational: true, // Flag to indicate this is conversational
        },
      };
    }

    console.log("User is providing data, validating field:", currentField.placeholder, "value:", message);
    
    // Send to validation agent via A2A
    const validationResponse = await this.sendToAgent("validation", "validate", {
      fieldId: currentField.id,
      value: message,
      fieldType: currentField.type,
      fieldName: currentField.placeholder, // Pass field name for context-aware validation
    });

    console.log("Validation response:", validationResponse);

    if (!validationResponse.success || !validationResponse.data.valid) {
      console.log("Validation failed!");
      
      // Build error message with suggestion if available
      let errorMessage = validationResponse.data.error || "That doesn't look quite right. Could you try again?";
      if (validationResponse.data.suggestion) {
        errorMessage += `\n\n${validationResponse.data.suggestion}`;
      }
      
      return {
        success: true,
        data: {
          message: errorMessage,
          fieldId: currentField.id,
          retry: true,
        },
      };
    }

    console.log("Validation passed!");

    // Notify orchestrator of field completion
    await this.sendToAgent("orchestrator", "field_complete", {
      sessionId: context?.sessionId,
      fieldId: currentField.id,
      value: message,
    });

    // Check if this was the last field
    const filledCount = Object.keys(filledFields).length + 1; // +1 for the field we just validated
    if (filledCount >= fields.length) {
      console.log("All fields complete! Entering review phase...");
      
      // Enter review phase
      const reviewMessage = await this.generateReviewMessage(fields, filledFields, message);
      
      return {
        success: true,
        data: {
          message: reviewMessage,
          reviewPhase: true,
          complete: false, // Not truly complete until user confirms
        },
      };
    }

    // Find next field to ask about
    const nextField = fields[filledCount];
    console.log("Generating question for next field:", nextField.placeholder);
    const question = await this.generateQuestion(nextField, conversationHistory);
    console.log("Generated question:", question);

    return {
      success: true,
      data: {
        message: question,
        fieldId: nextField.id,
        complete: false,
      },
    };
  }

  private generateGreeting(fields: Field[]): string {
    return `Hi! I'll help you fill out this document. I need to collect ${fields.length} pieces of information. Let's start with the first one.`;
  }

  private findNextField(
    fields: Field[],
    filledFields: Record<string, string>
  ): Field | null {
    return fields.find((field) => !filledFields[field.id]) || null;
  }

  private getCurrentFieldIndex(
    fields: Field[],
    filledFields: Record<string, string>
  ): number {
    // Returns the index of the field that is currently being filled
    // If we have 0 filled, we're on field 0. If we have 1 filled, we're on field 1.
    const filledCount = Object.keys(filledFields).length;
    return filledCount;
  }

  private async generateQuestion(
    field: Field,
    conversationHistory?: Message[]
  ): Promise<string> {
    const placeholder = field.placeholder.toLowerCase();
    
    // AI-powered contextual questions with guidance
    if (placeholder.includes("company") && placeholder.includes("name")) {
      return `What's your company's legal name?\n\n💡 This should match exactly how it appears in your incorporation documents.`;
    } 
    
    if (placeholder.includes("investor") && placeholder.includes("name")) {
      return `What's the investor's full legal name?\n\n💡 For individuals, use their full name (e.g., "John Michael Smith"). For entities, use the complete legal name (e.g., "Acme Ventures LLC").`;
    }
    
    if (placeholder.includes("date") && placeholder.includes("safe")) {
      return `What's the date of this SAFE agreement?\n\n💡 Use the date when the agreement is being signed. Common format: "January 1, 2024" or "1/1/2024"`;
    }
    
    if (placeholder.includes("state") && placeholder.includes("incorporation")) {
      return `In which state is your company legally incorporated?\n\n💡 Most startups choose Delaware for its business-friendly laws and well-established corporate legal system. Other popular choices include California, New York, and your home state.\n\nExamples: Delaware, California, New York, Texas`;
    }
    
    if (placeholder.includes("governing") && placeholder.includes("law")) {
      return `Which state's laws should govern this agreement?\n\n💡 This is typically the same as your state of incorporation. If you chose Delaware for incorporation, you'd usually choose Delaware here too.\n\nExamples: Delaware, California, New York`;
    }
    
    if (placeholder.includes("valuation") && placeholder.includes("cap")) {
      return `What's the valuation cap for this SAFE?\n\n💡 This is the maximum company valuation at which the SAFE converts to equity. Common range: $5M - $20M for seed stage.\n\nExample: $10,000,000`;
    }
    
    if (placeholder.includes("purchase") && placeholder.includes("amount")) {
      return `What's the investment amount?\n\n💡 This is the total amount the investor is contributing.\n\nExample: $100,000`;
    }
    
    if (placeholder.includes("title")) {
      return `What's the signatory's title at the company?\n\n💡 This is usually the person authorized to sign legal documents.\n\nExamples: CEO, President, Founder`;
    }
    
    if (placeholder.includes("date")) {
      return `What's the ${field.placeholder}?\n\n💡 You can use formats like: January 1, 2024 or 1/1/2024`;
    }
    
    if (field.type === "currency") {
      return `What's the ${field.placeholder}?\n\n💡 Enter the amount in dollars (e.g., $100,000 or 100000)`;
    }
    
    // Fallback with basic example
    return `What's the ${field.placeholder}?`;
  }

  private async generateReviewMessage(
    fields: Field[],
    filledFields: Record<string, string>,
    lastValue: string
  ): Promise<string> {
    // Update filled fields with the last value
    const updatedFilledFields = { ...filledFields };
    const lastFieldId = fields[fields.length - 1].id;
    updatedFilledFields[lastFieldId] = lastValue;

    // Generate a summary of all filled fields
    let summary = "✅ **Great! I've collected all the information.**\n\n";
    summary += "Here's what we have:\n\n";
    
    fields.forEach((field, index) => {
      const value = updatedFilledFields[field.id] || "(not filled)";
      summary += `${index + 1}. **${field.placeholder}**: ${value}\n`;
    });

    summary += "\n📋 **What would you like to do?**\n\n";
    summary += "• Type **'confirm'** or **'done'** to finalize and download your document\n";
    summary += "• Type **'change [field name]'** to update any field (e.g., 'change company name')\n";
    summary += "• Type **'review'** to check for any potential issues\n\n";
    summary += "💡 *Tip: For legal documents, it's important to double-check all information before finalizing.*";

    return summary;
  }

  // Streaming version for real-time responses
  async *streamResponse(
    message: string,
    fields: Field[],
    filledFields: Record<string, string>,
    conversationHistory: Message[]
  ): AsyncGenerator<string> {
    const nextField = this.findNextField(fields, filledFields);

    if (!nextField) {
      yield "Great! We've collected all the information. Let me prepare your document...";
      return;
    }

    const prompt = `Generate a natural, conversational question to ask the user for this information:

Field: ${nextField.placeholder}
Type: ${nextField.type}

Previous conversation:
${conversationHistory.slice(-3).map((m) => `${m.role}: ${m.content}`).join("\n")}

Make the question friendly and clear.`;

    try {
      for await (const chunk of this.streamLLM(
        prompt,
        "You are a friendly assistant helping users fill out legal documents."
      )) {
        yield chunk;
      }
    } catch (error) {
      yield `What is the ${nextField.placeholder}?`;
    }
  }

  // 🤖 AGENTIC: Detect user intent using AI
  private async detectIntent(
    userMessage: string,
    currentField: Field,
    allFields: Field[],
    filledFields: Record<string, string>
  ): Promise<{ type: string; confidence: number }> {
    // Quick pattern matching for common navigation phrases
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes("skip") || lowerMessage.includes("jump") || 
        lowerMessage.includes("go to") || lowerMessage.includes("move to") ||
        lowerMessage.includes("let's move") || lowerMessage.includes("lets move")) {
      return { type: "navigate", confidence: 1.0 };
    }

    const prompt = `You are an intelligent assistant analyzing user intent in a document filling conversation.

Current context:
- We're asking for: "${currentField.placeholder}"
- User said: "${userMessage}"

Analyze if the user is:
1. "answer" - Providing the requested information
2. "question" - Asking a question (e.g., "can I download?", "what is this?", "why do you need this?")
3. "help" - Asking for help or clarification
4. "navigate" - Wants to skip/jump to a different field (e.g., "let's do email first", "skip to address")
5. "unclear" - Message is unclear or off-topic

Respond with ONLY ONE WORD: answer, question, help, navigate, or unclear`;

    try {
      const response = await this.callLLM(prompt, "You are an intent classifier. Respond with only one word.");
      const intent = response.toLowerCase().trim();
      
      if (["answer", "question", "help", "navigate", "unclear"].includes(intent)) {
        return { type: intent, confidence: 0.9 };
      }
      
      // Fallback: assume it's an answer
      return { type: "answer", confidence: 0.5 };
    } catch (error) {
      console.error("Intent detection failed:", error);
      return { type: "answer", confidence: 0.3 };
    }
  }

  // 🤖 AGENTIC: Answer user questions intelligently
  private async answerQuestion(
    userMessage: string,
    currentField: Field,
    allFields: Field[],
    filledFields: Record<string, string>
  ): Promise<string> {
    const filledCount = Object.keys(filledFields).length;
    const totalFields = allFields.length;
    const progress = `${filledCount}/${totalFields}`;

    const prompt = `You are a helpful AI assistant helping a user fill out a legal SAFE agreement document.

Current situation:
- Progress: ${progress} fields completed
- Currently asking for: "${currentField.placeholder}"
- User's question: "${userMessage}"

Context about the document:
- This is a SAFE (Simple Agreement for Future Equity) - a common startup investment document
- We're collecting information to fill in the template
- Fields we need: ${allFields.map(f => f.placeholder).join(", ")}

Respond to the user's question in a helpful, friendly way. Then gently guide them back to answering the current question.

Keep your response concise (2-3 sentences max) and end by asking for the "${currentField.placeholder}" again.`;

    try {
      const response = await this.callLLM(
        prompt,
        "You are a friendly, knowledgeable assistant. Be helpful but concise."
      );
      return response.trim();
    } catch (error) {
      console.error("Question answering failed:", error);
      // Fallback response
      return `I understand you have a question! We're currently filling out a SAFE agreement document. We've completed ${filledCount} out of ${totalFields} fields so far.\n\nLet's continue - what's the ${currentField.placeholder}?`;
    }
  }

  // Handle A2A messages
  protected async handleA2AMessage(
    message: A2AMessage
  ): Promise<Record<string, any>> {
    switch (message.action) {
      case "start":
        const result = await this.startConversation(message.payload);
        return result.data;
      case "respond":
        const response = await this.handleUserResponse(message.payload);
        return response.data;
      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }
}
