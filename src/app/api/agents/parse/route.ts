import { NextRequest, NextResponse } from "next/server";
import { DocumentAgent } from "@/agents/document/parser.agent";
import { sessionStorage } from "@/lib/session-storage";

export async function POST(request: NextRequest) {
  try {
    console.log("=== PARSE API START ===");
    const { sessionId } = await request.json();
    console.log("SessionId:", sessionId);

    if (!sessionId) {
      console.log("ERROR: No session ID");
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get session from storage
    const session = sessionStorage.get(sessionId);
    
    console.log("Session found:", !!session);
    console.log("Session has fileBuffer:", !!session?.fileBuffer);
    console.log("Total sessions in storage:", sessionStorage.size());

    if (!session) {
      console.log("ERROR: Session not found");
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Create document agent
    console.log("Creating document agent...");
    const documentAgent = new DocumentAgent();

    // Parse the document
    console.log("Parsing document...");
    const result = await documentAgent.execute({
      type: "parse",
      data: {
        fileBuffer: session.fileBuffer,
        fileName: session.fileName,
      },
    });

    console.log("Parse result success:", result.success);
    console.log("Parse result error:", result.error);

    if (!result.success) {
      console.log("ERROR: Parse failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Parsing failed" },
        { status: 500 }
      );
    }

    // Store parsed data in session
    console.log("=== PARSE API: Storing fields ===");
    console.log("Fields count:", result.data.fields?.length);
    console.log("Fields:", result.data.fields);
    
    session.fields = result.data.fields;
    session.structure = result.data.structure;
    session.documentText = result.data.text; // ✅ Store for preview
    session.filledFields = session.filledFields || {};
    session.conversationHistory = session.conversationHistory || [];
    
    sessionStorage.set(sessionId, session);
    
    console.log("Session after storing:", {
      hasFields: !!session.fields,
      fieldsCount: session.fields?.length,
      hasFilledFields: !!session.filledFields,
      totalSessions: sessionStorage.size(),
    });

    return NextResponse.json({
      fields: result.data.fields,
      structure: result.data.structure,
      text: result.data.text, // ✅ Add document text for preview
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse document" },
      { status: 500 }
    );
  }
}
