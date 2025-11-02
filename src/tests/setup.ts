import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_USE_V2_PARSER = 'true';
process.env.NEXT_PUBLIC_USE_V2_DETECTOR = 'true';
process.env.NEXT_PUBLIC_USE_V2_VALIDATOR = 'true';
process.env.NEXT_PUBLIC_USE_V2_GENERATOR = 'true';
