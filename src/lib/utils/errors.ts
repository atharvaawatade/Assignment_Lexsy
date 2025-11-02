export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UploadError extends AppError {
  constructor(message: string) {
    super(message, "UPLOAD_ERROR", 400);
    this.name = "UploadError";
  }
}

export class ParseError extends AppError {
  constructor(message: string) {
    super(message, "PARSE_ERROR", 500);
    this.name = "ParseError";
  }
}

export class AIError extends AppError {
  constructor(message: string) {
    super(message, "AI_ERROR", 500);
    this.name = "AIError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public suggestion?: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class ExportError extends AppError {
  constructor(message: string) {
    super(message, "EXPORT_ERROR", 500);
    this.name = "ExportError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", 503);
    this.name = "NetworkError";
  }
}

export function handleError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
      statusCode: 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}
