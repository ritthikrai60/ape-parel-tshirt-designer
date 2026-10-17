import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const refundSchema = z.object({
  refundType: z.enum(['FULL', 'PARTIAL']),
  amount: z.number().int().positive('Refund amount must be a positive integer'),
  reason: z.string().min(1, 'Refund reason is required').max(500),
  restockGarment: z.boolean().default(true),
  voidRoyalty: z.boolean().default(true),
});

/**
 * POST /api/admin/orders/[id]/refund
 *
 * Dispute & Refund Resolution Center:
 * Handles full cancellation refunds or partial compensation refunds with
 * automated stock restoration, royalty voiding, and double-entry accounting adjustments.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const adminId = (session?.user as any)?.id as string;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { id: orderId } = params;
  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parseResult = refundSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: parseResult.error.errors[0]?.message,
          issues: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { refundType, amount, reason, restockGarment, voidRoyalty } = parseResult.data;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        obligations: true,
        design: {
          include: {
            garmentProduct: {
              include: {
                variants: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (amount > order.totalAmount) {
      return NextResponse.json(
        {
          error: `Refund amount (฿${amount}) cannot exceed total order amount (฿${order.totalAmount})`,
        },
        { status: 400 }
      );
    }

    const variant = order.design.garmentProduct.variants.find(
      (v) =>
        v.colorHex.toLowerCase() === order.design.garmentColorHex.toLowerCase() &&
        v.size.toUpperCase() === order.design.garmentSize.toUpperCase()
    );

    let restockedCount = 0;
    let voidedRoyaltyCount = 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. If full refund requested and restockGarment is true, restore stock
      if (refundType === 'FULL' && restockGarment && variant) {
        await tx.garmentVariant.update({
          where: { id: variant.id },
          data: { stock: { increment: order.quantity } },
        });
        restockedCount = order.quantity;
      }

      // 2. If voidRoyalty is true, cancel Royalty obligations
      if (voidRoyalty) {
        for (const obl of order.obligations) {
          if (obl.status !== 'CANCELLED') {
            await tx.royaltyObligation.update({
              where: { id: obl.id },
              data: { status: 'CANCELLED' },
            });
            voidedRoyaltyCount += obl.totalAmount;
          }
        }
      }

      // 3. Record OrderRefund entity
      const refundRecord = await tx.orderRefund.create({
        data: {
          orderId: order.id,
          refundType,
          amount,
          reason,
          restockedUnits: restockedCount,
          voidedRoyalty: voidedRoyaltyCount,
          status: 'COMPLETED',
          processedById: adminId,
        },
      });

      // 4. Update order status if FULL refund
      let updatedOrder: any = order;
      if (refundType === 'FULL') {
        updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'REFUNDED',
          },
          include: {
            obligations: true,
            design: {
              include: {
                garmentProduct: true,
              },
            },
          },
        });
      }

      return { refundRecord, updatedOrder };
    });

    // Record audit event
    await recordAuditEvent({
      action: 'ORDER_REFUNDED',
      entityType: 'Order',
      entityId: order.id,
      actorId: adminId,
      payload: {
        orderNumber: order.orderNumber,
        refundType,
        amount,
        reason,
        restockedUnits: restockedCount,
        voidedRoyalty: voidedRoyaltyCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${refundType} refund of ฿${amount.toLocaleString()} for order #${order.orderNumber}`,
      data: result,
    });
  } catch (err: any) {
    console.error('[API /admin/orders/refund] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process refund', details: err?.message },
      { status: 500 }
    );
  }
}
