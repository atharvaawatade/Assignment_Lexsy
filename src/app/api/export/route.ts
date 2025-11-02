import { NextRequest, NextResponse } from "next/server";
import { createProcessor } from "@/lib/document/integration";
import { sessionStorage } from "@/lib/session-storage";

/**
 * Document Export API - v2 PRODUCTION
 * Uses v2 generator for 100% format fidelity
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get session
    const session = sessionStorage.get(sessionId);

    if (!session) {
      console.log("ERROR: Session not found for export");
      console.log("Total sessions in storage:", sessionStorage.size());
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (!session.fields || !session.filledFields) {
      return NextResponse.json(
        { error: "Document not ready for export" },
        { status: 400 }
      );
    }

    console.log("\n🎨 ==== v2 DOCUMENT GENERATION ====");
    console.log("Session fields:", session.fields.length);
    console.log("Filled fields:", Object.keys(session.filledFields).length);
    
    // Create field map with multiple key formats for better matching
    const fieldMap: Record<string, any> = {};
    for (const field of session.fields) {
      const value = session.filledFields[field.id];
      if (value) {
        console.log(`  ✅ ${field.placeholder} → ${value}`);
        
        // Add multiple key formats to maximize matches
        fieldMap[field.placeholder] = value; // Original
        fieldMap[field.placeholder.toLowerCase()] = value; // Lowercase
        
        // Normalized (for template tags)
        const normalized = field.placeholder
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        fieldMap[normalized] = value;
      } else {
        console.warn(`  ⚠️  ${field.placeholder} (${field.id}) has no value`);
      }
    }

    console.log("\n📋 Total field mappings:", Object.keys(fieldMap).length);
    
    // Create v2 processor
    const processor = createProcessor({
      useV2Generator: true,
      debug: true,
    });

    // Generate document using v2
    console.log("🚀 Generating with v2 production generator...");
    const startTime = performance.now();
    
    const generatedBuffer = await processor.generateDocument(
      session.fileBuffer,
      fieldMap
    );
    
    const duration = performance.now() - startTime;
    
    console.log("✅ Generation complete!");
    console.log(`   Time: ${duration.toFixed(2)}ms`);
    console.log(`   Size: ${(generatedBuffer.length / 1024).toFixed(2)} KB`);
    console.log("====================================\n");

    // Return the document as a download
    return new NextResponse(new Uint8Array(generatedBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="safe-completed-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export document" },
      { status: 500 }
    );
  }
}
