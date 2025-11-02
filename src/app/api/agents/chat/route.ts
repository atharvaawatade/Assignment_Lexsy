import { NextRequest } from "next/server";
import { ConversationAgent } from "@/agents/conversation/chat.agent";
import { ValidationAgent } from "@/agents/validation/validator.agent";
import { Orchestrator } from "@/agents/core/orchestrator";
import { sessionStorage } from "@/lib/session-storage";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, isFirstMessage } = await request.json();
    
    console.log("=== CHAT API START ===");
    console.log("SessionId:", sessionId);
    console.log("Message:", message);
    console.log("IsFirstMessage:", isFirstMessage);

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required" }),
        { status: 400 }
      );
    }

    // Get session
    console.log("Looking for session:", sessionId);
    console.log("Available sessions:", sessionStorage.getAllKeys());
    console.log("Total sessions in storage:", sessionStorage.size());
    
    const session = sessionStorage.get(sessionId);

    if (!session) {
      console.log("ERROR: Session not found");
      console.log("Requested sessionId:", sessionId);
      console.log("Available sessions:", sessionStorage.getAllKeys());
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404 }
      );
    }
    
    console.log("Session fields count:", session.fields?.length);
    console.log("Filled fields count:", Object.keys(session.filledFields || {}).length);
    console.log("Total sessions in storage:", sessionStorage.size());
    
    // Check if session has fields
    if (!session.fields || session.fields.length === 0) {
      console.log("ERROR: Session has no fields! Session data:", {
        hasFields: !!session.fields,
        hasFileBuffer: !!session.fileBuffer,
        fileName: session.fileName,
      });
      return new Response(
        JSON.stringify({ error: "Session not properly initialized. Please upload the document again." }),
        { status: 400 }
      );
    }

    // Initialize agents
    const orchestrator = new Orchestrator();
    const conversationAgent = new ConversationAgent();
    const validationAgent = new ValidationAgent();

    // Register agents for A2A communication
    conversationAgent.registerAgent("validation", validationAgent);
    conversationAgent.registerAgent("orchestrator", orchestrator);

    // Initialize session data if needed
    session.filledFields = session.filledFields || {};
    session.conversationHistory = session.conversationHistory || [];

    let responseText = "";

    if (isFirstMessage) {
      console.log("Starting conversation...");
      // Start conversation
      const result = await conversationAgent.execute({
        type: "start",
        data: { fields: session.fields },
      });

      console.log("Start result:", result);
      responseText = result.data.message;
    } else {
      console.log("Handling user response...");
      
      // Check if we're in review phase
      const inReviewPhase = session.status === "review" || Object.keys(session.filledFields).length >= session.fields.length;
      
      if (inReviewPhase) {
        console.log("In review phase, handling command:", message);
        const messageLower = message.toLowerCase().trim();
        
        // Handle confirm/done
        if (messageLower === "confirm" || messageLower === "done" || messageLower === "finalize") {
          console.log("User confirmed, marking complete");
          session.status = "complete";
          responseText = "✅ Perfect! Your document is ready. Click the **Download Document** button above to get your completed file.\n\n🎉 Thank you for using LawTech!";
        }
        // Handle review request
        else if (messageLower === "review" || messageLower === "check") {
          console.log("User requested review");
          responseText = "🔍 **Reviewing your information...**\n\n";
          
          // Simple review - check for common issues
          const issues = [];
          for (const field of session.fields) {
            const value = session.filledFields[field.id];
            if (value && value.length < 3) {
              issues.push(`• **${field.placeholder}**: "${value}" seems very short. Please verify.`);
            }
          }
          
          if (issues.length > 0) {
            responseText += "⚠️ **I noticed a few things:**\n\n" + issues.join("\n");
            responseText += "\n\nWould you like to make any changes, or should we proceed?";
          } else {
            responseText += "✅ Everything looks good! All fields are properly filled.\n\n";
            responseText += "Type **'confirm'** to finalize, or **'change [field name]'** to update any field.";
          }
        }
        // Handle change field request
        else if (messageLower.startsWith("change ")) {
          const fieldNameToChange = message.substring(7).trim().toLowerCase();
          console.log("User wants to change field:", fieldNameToChange);
          
          // Find the field
          const fieldToChange = session.fields.find((f: any) => 
            f.placeholder.toLowerCase().includes(fieldNameToChange)
          );
          
          if (fieldToChange) {
            session.changingField = fieldToChange.id;
            session.status = "changing";
            responseText = `📝 What should the new value be for **${fieldToChange.placeholder}**?\n\nCurrent value: "${session.filledFields[fieldToChange.id]}"`;
          } else {
            responseText = `❌ I couldn't find a field matching "${fieldNameToChange}".\n\nAvailable fields:\n${session.fields.map((f: any, i: number) => `${i + 1}. ${f.placeholder}`).join("\n")}\n\nPlease try again or type **'confirm'** to proceed.`;
          }
        }
        // User provided input but we're not expecting it
        else {
          responseText = `I didn't understand that command. Here's what you can do:\n\n• Type **'confirm'** to finalize your document\n• Type **'change [field name]'** to update a field\n• Type **'review'** to check for issues`;
        }
      }
      // Check if we're changing a field
      else if (session.status === "changing" && session.changingField) {
        console.log("Updating field:", session.changingField);
        const fieldToUpdate = session.fields.find((f: any) => f.id === session.changingField);
        
        if (fieldToUpdate) {
          // Validate the new value
          const validationAgent = new ValidationAgent();
          const validationResult = await validationAgent.execute({
            type: "validate",
            data: {
              fieldId: fieldToUpdate.id,
              value: message,
              fieldType: fieldToUpdate.type,
              fieldName: fieldToUpdate.placeholder,
            },
          });
          
          if (validationResult.data.valid) {
            session.filledFields[session.changingField] = message;
            delete session.changingField;
            session.status = "review";
            responseText = `✅ Updated **${fieldToUpdate.placeholder}** to "${message}"\n\nWould you like to:\n• Type **'confirm'** to finalize\n• Type **'change [field name]'** to update another field\n• Type **'review'** to check for issues`;
          } else {
            responseText = validationResult.data.error || "That value doesn't look right. Please try again.";
            if (validationResult.data.suggestion) {
              responseText += `\n\n${validationResult.data.suggestion}`;
            }
          }
        }
      }
      // Normal field filling
      else {
        // Determine which field we're currently filling
        const currentFieldIndex = Object.keys(session.filledFields).length;
        const currentField = currentFieldIndex < session.fields.length 
          ? session.fields[currentFieldIndex] 
          : null;

        if (!currentField) {
          console.log("ERROR: No current field found");
          responseText = "An error occurred. Please try again.";
        } else {
          console.log("Current field being filled:", currentField.placeholder, "Index:", currentFieldIndex);
          
          // Handle user response
          const result = await conversationAgent.execute({
            type: "respond",
            data: {
              message,
              fields: session.fields,
              filledFields: session.filledFields,
              conversationHistory: session.conversationHistory,
              currentFieldId: currentField.id,
            },
            context: { sessionId },
          });

          console.log("Response result:", result);

          if (result.data.conversational) {
            // User asked a question - respond but don't fill field
            console.log("Conversational response - not filling field");
            responseText = result.data.message;
          } else if (result.data.retry) {
            // Validation failed, ask again (don't fill field)
            console.log("Validation failed, asking again");
            responseText = result.data.message;
          } else if (result.data.reviewPhase) {
            // Entered review phase - fill the last field first
            console.log("Entering review phase! Filling last field:", currentField.placeholder);
            session.filledFields[currentField.id] = message;
            session.status = "review";
            responseText = result.data.message;
          } else {
            // Validation passed - fill field BEFORE getting next question
            console.log("Validation passed! Filling field:", currentField.placeholder, "with:", message);
            session.filledFields[currentField.id] = message;
            responseText = result.data.message;
          }
        }
      }
    }
    
    console.log("Response text:", responseText);
    console.log("=== CHAT API END ===");

    // Update conversation history
    if (!isFirstMessage) {
      session.conversationHistory.push({
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: message,
        timestamp: new Date(),
      });
    }

    session.conversationHistory.push({
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    });

    sessionStorage.set(sessionId, session);

    // Return streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(responseText));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process message" }),
      { status: 500 }
    );
  }
}
