import { NextRequest, NextResponse } from "next/server";
import { sessionStorage } from "@/lib/session-storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .docx files are supported" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store using centralized session storage
    sessionStorage.set(sessionId, {
      fileName: file.name,
      fileBuffer: buffer,
      createdAt: new Date(),
    });

    console.log(`[Upload] Created session ${sessionId}. Total sessions: ${sessionStorage.size()}`);

    return NextResponse.json({
      sessionId,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
