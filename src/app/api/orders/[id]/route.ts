import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrderByIdOrNumber } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PAYMENT_CONFIRMED',
    'IN_PRODUCTION',
    'QA',
    'QA_PASSED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ]),
  notes: z.string().max(500).optional(),
});

/**
 * GET /api/orders/[id]
 *
 * Retrieves detailed order information by internal cuid or human-readable orderNumber.
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
    const order = await getOrderByIdOrNumber(id.trim());

    if (!order) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Order not found with identifier "${id}".`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        order,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[GET /api/orders/${id}] Error fetching order:`, error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve order details.',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[id]
 *
 * Updates order status (e.g. IN_PRODUCTION, QA_PASSED / QA, SHIPPED, DELIVERED)
 * and records an immutable AuditEvent in the database.
 */
export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Invalid JSON payload provided.',
      },
      { status: 400 }
    );
  }

  const parseResult = updateOrderStatusSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid status transition value.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const { status, notes } = parseResult.data;

  try {
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: id.trim() }, { orderNumber: id.trim() }],
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Order not found with identifier "${id}".`,
        },
        { status: 404 }
      );
    }

    const previousStatus = existingOrder.status;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: existingOrder.id },
        data: { status },
      });

      await tx.auditEvent.create({
        data: {
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'Order',
          entityId: order.id,
          payload: JSON.stringify({
            previousStatus,
            newStatus: status,
            notes: notes ?? null,
            updatedAt: new Date().toISOString(),
          }),
        },
      });

      return order;
    });

    return NextResponse.json(
      {
        success: true,
        order: updatedOrder,
        previousStatus,
        newStatus: status,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(`[PATCH /api/orders/${id}] Error updating order status:`, error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update order status.',
      },
      { status: 500 }
    );
  }
}
