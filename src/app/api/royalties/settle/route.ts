import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  executeCreatorPayoutSettlement,
  getCreatorLedgerSummary,
} from '@/lib/royalties';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

/**
 * Zod validation schema for payout settlement
 */
const settleRoyaltiesSchema = z.object({
  creatorId: z
    .string({ required_error: 'creatorId is required' })
    .min(1, 'creatorId cannot be empty'),
  payoutReference: z
    .string()
    .trim()
    .max(100, 'payoutReference cannot exceed 100 characters')
    .optional(),
  obligationIds: z
    .array(z.string().min(1, 'obligationId cannot be empty'))
    .optional(),
  notes: z
    .string()
    .max(500, 'notes cannot exceed 500 characters')
    .optional(),
});

/**
 * POST /api/royalties/settle
 * Executes an atomic batch payout settlement for eligible creator royalties
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        message: 'Request body must be a valid JSON object.',
      },
      { status: 400 }
    );
  }

  // 2. Validate payload with Zod
  const parseResult = settleRoyaltiesSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid settlement payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const { creatorId, payoutReference, obligationIds, notes } = parseResult.data;

  // 3. Execute settlement transaction
  try {
    const result = await executeCreatorPayoutSettlement(creatorId, {
      payoutRef: payoutReference,
      obligationIds,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        settlement: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown settlement error occurred';

    // Creator not found -> 404
    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Business validation errors -> 400
    if (
      message.includes('No eligible royalty obligations') ||
      message.includes('Insufficient ledger balance') ||
      message.includes('Settlement amount must be greater than zero') ||
      message.includes('not in ELIGIBLE status')
    ) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message,
        },
        { status: 400 }
      );
    }

    // Internal Server Error -> 500
    console.error('[POST /api/royalties/settle] Settlement failure:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process royalty settlement transaction.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/royalties/settle?creatorId=...
 * Query creator ledger summary & settlement status preview
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creatorId');

  if (!creatorId) {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Query parameter "creatorId" is required.',
      },
      { status: 400 }
    );
  }

  try {
    const summary = await getCreatorLedgerSummary(creatorId);
    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error retrieving ledger summary';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    console.error('[GET /api/royalties/settle] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve creator ledger summary.',
      },
      { status: 500 }
    );
  }
}
