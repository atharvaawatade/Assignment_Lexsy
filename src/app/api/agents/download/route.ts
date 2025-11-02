import { NextRequest, NextResponse } from "next/server";
import { createProcessor } from "@/lib/document/integration";

/**
 * Download/Generate Document API
 * Uses v2 production generator
 */
export async function POST(request: NextRequest) {
  try {
    console.log("\n🎨 ==== DOCUMENT GENERATION START ====");
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get session
    global.sessions = global.sessions || new Map();
    const session = global.sessions.get(sessionId);

    if (!session || !session.fileBuffer) {
      return NextResponse.json(
        { error: "Session or document not found" },
        { status: 404 }
      );
    }

    console.log("Session fields:", session.fields?.length);
    console.log("Filled fields:", Object.keys(session.filledFields || {}).length);

    // Create processor with v2 generator
    const processor = createProcessor({
      useV2Generator: true,
      debug: true,
    });

    // Transform filled fields to generator format
    const fieldMap: Record<string, any> = {};
    
    if (session.fields && session.filledFields) {
      session.fields.forEach((field: any) => {
        const value = session.filledFields[field.id];
        if (value) {
          // Use placeholder as key (normalized)
          const key = field.placeholder
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          
          fieldMap[key] = value;
          
          // Also try original placeholder
          fieldMap[field.placeholder] = value;
          
          console.log(`  Mapping: ${field.placeholder} -> ${value}`);
        }
      });
    }

    console.log("\n📋 Field mapping:", Object.keys(fieldMap).length, "fields");

    // Generate document using v2
    console.log("🚀 Generating with v2 production generator...");
    const generated = await processor.generateDocument(
      session.fileBuffer,
      fieldMap
    );

    console.log("✅ Generation complete!");
    console.log("   File size:", (generated.length / 1024).toFixed(2), "KB");
    console.log("====================================\n");

    // Return document (convert Buffer to Uint8Array)
    return new NextResponse(new Uint8Array(generated), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="safe-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    console.error("❌ Generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
