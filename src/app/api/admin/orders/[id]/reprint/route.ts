import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const reprintSchema = z.object({
  defectReason: z.string().min(1, 'Defect reason is required'),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/admin/orders/[id]/reprint
 *
 * QA Defect Free Reprint Workflow:
 * Dispatches a replacement blank garment into production when quality issues occur.
 * Customer is not billed again, and no duplicate creator royalty obligations are generated.
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
    const parseResult = reprintSchema.safeParse(body);
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

    const { defectReason, notes } = parseResult.data;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        supplier: true,
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

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot trigger reprint for cancelled order' },
        { status: 400 }
      );
    }

    // Find supplier variant to decrement blank garment stock
    const variant = order.design.garmentProduct.variants.find(
      (v) =>
        v.colorHex.toLowerCase() === order.design.garmentColorHex.toLowerCase() &&
        v.size.toUpperCase() === order.design.garmentSize.toUpperCase()
    );

    if (variant && variant.stock < order.quantity) {
      return NextResponse.json(
        {
          error: `Insufficient blank garment stock for reprint: only ${variant.stock} left in supplier inventory`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Decrement blank stock for reprint
      if (variant) {
        await tx.garmentVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: order.quantity } },
        });
      }

      // 2. Append reprint entry to snapshot
      let snap: Record<string, any> = {};
      try {
        if (order.snapshotData) snap = JSON.parse(order.snapshotData);
      } catch {}

      const reprintRecord = {
        reprintId: `RP-${Date.now().toString().slice(-6)}`,
        defectReason,
        notes: notes || null,
        reprintedUnits: order.quantity,
        requestedAt: new Date().toISOString(),
        requestedBy: adminId,
      };

      snap.reprints = [...(snap.reprints || []), reprintRecord];

      // 3. Reset status to IN_PRODUCTION
      return await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'IN_PRODUCTION',
          snapshotData: JSON.stringify(snap),
        },
      });
    });

    // Record audit event
    await recordAuditEvent({
      action: 'ORDER_REPRINT_REQUESTED',
      entityType: 'Order',
      entityId: order.id,
      actorId: adminId,
      payload: {
        orderNumber: order.orderNumber,
        defectReason,
        notes: notes || null,
        units: order.quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reprint order dispatched to ${order.supplier.companyName} at zero cost to customer.`,
      order: updated,
    });
  } catch (err: any) {
    console.error('[API /admin/orders/reprint] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process reprint request', details: err?.message },
      { status: 500 }
    );
  }
}
