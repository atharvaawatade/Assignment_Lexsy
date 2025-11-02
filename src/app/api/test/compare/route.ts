import { NextRequest, NextResponse } from 'next/server';
import { compareV1V2, validateSAFEFields, generateTestReport } from '@/lib/document/test-utils';
import { getSystemVersion } from '@/lib/document/integration';

/**
 * Test API endpoint for comparing v1 vs v2 performance
 * 
 * Usage:
 * POST /api/test/compare
 * Body: { documentBuffer: base64 string, expectedFields?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentBuffer: base64Buffer, expectedFields } = body;

    if (!base64Buffer) {
      return NextResponse.json(
        { error: 'documentBuffer is required' },
        { status: 400 }
      );
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Buffer, 'base64');

    console.log('\n🔬 Starting comparison test...');
    console.log('Document size:', buffer.length, 'bytes');
    console.log('Expected fields:', expectedFields?.length || 'none provided');

    // Run comparison
    const comparison = await compareV1V2(buffer, expectedFields);

    // Validate SAFE fields if no expected fields provided
    const safeValidation = validateSAFEFields(comparison.v2.fieldsDetected > 0 
      ? [] // Would need actual fields here
      : []
    );

    // Generate report
    const report = generateTestReport(comparison, safeValidation);

    // Get current system version
    const systemVersion = getSystemVersion();

    return NextResponse.json({
      success: true,
      comparison,
      safeValidation,
      report,
      systemVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Comparison test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get current system configuration
 * 
 * GET /api/test/compare
 */
export async function GET() {
  const systemVersion = getSystemVersion();

  return NextResponse.json({
    version: '2.0',
    systemVersion,
    features: {
      parser: systemVersion.parser === 'v2' ? 'Enhanced (docxtemplater)' : 'Legacy (mammoth)',
      detector: systemVersion.detector === 'v2' ? 'Hybrid (template + LLM)' : 'Basic',
      validator: systemVersion.validator === 'v2' ? 'Legal-grade' : 'Basic',
      generator: systemVersion.generator === 'v2' ? 'Format-preserving' : 'Legacy',
    },
    status: Object.values(systemVersion).every(v => v === 'v2') 
      ? 'Fully migrated to v2'
      : 'Partial migration',
    timestamp: new Date().toISOString(),
  });
}
