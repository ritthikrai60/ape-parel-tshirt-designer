import { NextRequest, NextResponse } from 'next/server';
import { generateProductionPackage } from '@/lib/production';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/production
 *
 * Exports complete manufacturing specification package (ProductionJobPackage)
 * as a downloadable JSON document with Content-Disposition attachment header.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Order ID parameter is required.',
      },
      { status: 400 }
    );
  }

  try {
    const productionPackage = await generateProductionPackage(id);

    const filename = `JOB-${productionPackage.orderNumber}.json`;
    const jsonBody = JSON.stringify(productionPackage, null, 2);

    return new NextResponse(jsonBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown production package error occurred';

    // Order not found -> 404 Not Found
    if (message.includes('Order not found') || message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Validation / Bad Request -> 400 Bad Request
    if (message.includes('Order ID is required')) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message,
        },
        { status: 400 }
      );
    }

    // Unexpected internal error -> 500
    console.error(`[GET /api/orders/${id}/production] Unhandled error:`, error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate production specification package.',
      },
      { status: 500 }
    );
  }
}
