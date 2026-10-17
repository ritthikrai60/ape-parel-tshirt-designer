import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  cancelOrderAtomic,
  requestOrderCancellationAtomic,
  reviewOrderCancellationRequestAtomic,
} from '@/lib/orders';

export const dynamic = 'force-dynamic';

const cancelSchema = z.object({
  action: z
    .enum(['CANCEL', 'REQUEST_CANCEL', 'REVIEW_REQUEST'])
    .optional()
    .default('CANCEL'),
  reason: z.string().max(500).optional(),
  approved: z.boolean().optional(),
  rejectionReason: z.string().max(500).optional(),
  proofImageUrl: z.string().optional(),
});

/**
 * POST /api/orders/[id]/cancel
 * Authoritative Order Cancellation & Dispute-Free Resolution Endpoint
 */
export async function POST(
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

  // 1. Session Auth Guard
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const userRole = (session?.user as any)?.role as string | undefined;

  let body: any = {};
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parseResult = cancelSchema.safeParse(rawBody);
    if (parseResult.success) {
      body = parseResult.data;
    }
  } catch {
    // Optional body fallback
  }

  const action = body.action || 'CANCEL';
  const reason = body.reason || 'Customer cancelled from order portal';

  try {
    if (action === 'REQUEST_CANCEL') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required to request cancellation.' },
          { status: 401 }
        );
      }

      const requestResult = await requestOrderCancellationAtomic({
        orderId: id.trim(),
        userId,
        reason,
      });

      return NextResponse.json(
        {
          success: true,
          data: requestResult,
        },
        { status: 200 }
      );
    }

    if (action === 'REVIEW_REQUEST') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Supplier authentication required.' },
          { status: 401 }
        );
      }

      const reviewResult = await reviewOrderCancellationRequestAtomic({
        orderId: id.trim(),
        supplierUserId: userId,
        approved: body.approved === true,
        rejectionReason: body.rejectionReason,
        proofImageUrl: body.proofImageUrl,
      });

      return NextResponse.json(
        {
          success: true,
          data: reviewResult,
        },
        { status: 200 }
      );
    }

    // Default: Direct cancel
    const result = await cancelOrderAtomic({
      orderId: id.trim(),
      userId,
      userRole,
      reason,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to cancel order.';

    console.error(`[POST /api/orders/${id}/cancel] Error:`, error);

    if (message.includes('not found')) {
      return NextResponse.json(
        { error: 'Not Found', message },
        { status: 404 }
      );
    }

    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Forbidden', message },
        { status: 403 }
      );
    }

    if (
      message.includes('already cancelled') ||
      message.includes('Cannot cancel order in status')
    ) {
      return NextResponse.json(
        { error: 'Bad Request', message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message },
      { status: 500 }
    );
  }
}
