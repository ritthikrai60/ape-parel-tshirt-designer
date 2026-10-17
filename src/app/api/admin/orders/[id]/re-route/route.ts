import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const rerouteSchema = z.object({
  newSupplierId: z.string().min(1, 'Target supplier ID is required'),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/admin/orders/[id]/re-route
 *
 * Emergency Factory Re-assignment:
 * Transfers production of an order from Supplier A to Supplier B.
 * Restores variant stock on Supplier A and decrements matching variant stock on Supplier B.
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
    const parseResult = rerouteSchema.safeParse(body);
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

    const { newSupplierId, reason } = parseResult.data;

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

    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
      return NextResponse.json(
        { error: `Cannot re-route order in status ${order.status}` },
        { status: 400 }
      );
    }

    if (order.supplierId === newSupplierId) {
      return NextResponse.json(
        { error: 'Order is already assigned to this supplier' },
        { status: 400 }
      );
    }

    // Verify target supplier exists
    const newSupplier = await prisma.supplierProfile.findUnique({
      where: { id: newSupplierId },
      include: {
        products: {
          include: {
            variants: true,
          },
        },
      },
    });

    if (!newSupplier) {
      return NextResponse.json({ error: 'Target supplier not found' }, { status: 404 });
    }

    const previousSupplierName = order.supplier.companyName;
    const newSupplierName = newSupplier.companyName;

    // Find old variant that was reserved
    const oldVariant = order.design.garmentProduct.variants.find(
      (v) =>
        v.colorHex.toLowerCase() === order.design.garmentColorHex.toLowerCase() &&
        v.size.toUpperCase() === order.design.garmentSize.toUpperCase()
    );

    // Find matching target variant in new supplier's catalog
    let newMatchingVariant: any = null;
    let newMatchingProduct: any = null;

    for (const prod of newSupplier.products) {
      const match = prod.variants.find(
        (v) =>
          v.colorHex.toLowerCase() === order.design.garmentColorHex.toLowerCase() &&
          v.size.toUpperCase() === order.design.garmentSize.toUpperCase()
      );
      if (match) {
        newMatchingVariant = match;
        newMatchingProduct = prod;
        break;
      }
    }

    // If exact color hex not found, fallback to first product matching size with stock
    if (!newMatchingVariant && newSupplier.products[0]) {
      newMatchingProduct = newSupplier.products[0];
      newMatchingVariant = newMatchingProduct.variants.find(
        (v: any) => v.size.toUpperCase() === order.design.garmentSize.toUpperCase()
      ) || newMatchingProduct.variants[0];
    }

    if (!newMatchingVariant) {
      return NextResponse.json(
        { error: `Target supplier ${newSupplierName} does not stock size ${order.design.garmentSize}` },
        { status: 400 }
      );
    }

    if (newMatchingVariant.stock < order.quantity) {
      return NextResponse.json(
        {
          error: `Insufficient stock at target supplier: only ${newMatchingVariant.stock} available, order requires ${order.quantity}`,
        },
        { status: 400 }
      );
    }

    // Execute atomic factory transfer
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Restock old supplier variant if found
      if (oldVariant) {
        await tx.garmentVariant.update({
          where: { id: oldVariant.id },
          data: { stock: { increment: order.quantity } },
        });
      }

      // 2. Decrement target supplier variant
      await tx.garmentVariant.update({
        where: { id: newMatchingVariant.id },
        data: { stock: { decrement: order.quantity } },
      });

      // 3. Update Order Supplier & Snapshot
      let snap: Record<string, any> = {};
      try {
        if (order.snapshotData) snap = JSON.parse(order.snapshotData);
      } catch {}

      snap.rerouteHistory = [
        ...(snap.rerouteHistory || []),
        {
          fromSupplierId: order.supplierId,
          fromSupplierName: previousSupplierName,
          toSupplierId: newSupplierId,
          toSupplierName: newSupplierName,
          reason: reason || 'Emergency factory reallocation by platform administrator',
          transferredAt: new Date().toISOString(),
          transferredBy: adminId,
        },
      ];

      return await tx.order.update({
        where: { id: order.id },
        data: {
          supplierId: newSupplierId,
          snapshotData: JSON.stringify(snap),
        },
      });
    });

    // Record audit event
    await recordAuditEvent({
      action: 'ORDER_REROUTED',
      entityType: 'Order',
      entityId: order.id,
      actorId: adminId,
      payload: {
        orderNumber: order.orderNumber,
        previousSupplier: previousSupplierName,
        newSupplier: newSupplierName,
        reason: reason || 'Emergency reallocation',
        transferredUnits: order.quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Order successfully transferred from ${previousSupplierName} to ${newSupplierName}`,
      order: updated,
    });
  } catch (err: any) {
    console.error('[API /admin/orders/re-route] Error:', err);
    return NextResponse.json(
      { error: 'Failed to re-route order', details: err?.message },
      { status: 500 }
    );
  }
}
