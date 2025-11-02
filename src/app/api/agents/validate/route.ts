import { NextRequest, NextResponse } from "next/server";
import { ValidationAgent } from "@/agents/validation/validator.agent";

export async function POST(request: NextRequest) {
  try {
    const { fieldId, value, fieldType, options } = await request.json();

    if (!fieldId || value === undefined || !fieldType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create validation agent
    const validationAgent = new ValidationAgent();

    // Validate the field
    const result = await validationAgent.execute({
      type: "validate",
      data: {
        fieldId,
        value,
        fieldType,
        options,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Validation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate field" },
      { status: 500 }
    );
  }
}
