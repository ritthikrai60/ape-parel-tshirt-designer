import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateStockSchema = z.object({
  variantId: z.string().min(1),
  stock: z.number().int().min(0).max(1_000_000),
  reason: z.string().optional(),
});

/**
 * PATCH /api/admin/inventory
 * Admin emergency stock override for any garment variant.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const adminId = (session?.user as any)?.id as string;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const rawBody = await req.json();
    const parsed = updateStockSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: parsed.error.errors[0]?.message,
          issues: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { variantId, stock, reason } = parsed.data;

    const existingVariant = await prisma.garmentVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            supplier: true,
          },
        },
      },
    });

    if (!existingVariant) {
      return NextResponse.json({ error: 'Garment variant not found' }, { status: 404 });
    }

    const previousStock = existingVariant.stock;

    const updatedVariant = await prisma.garmentVariant.update({
      where: { id: variantId },
      data: { stock },
    });

    // Record Immutable Audit Log
    await recordAuditEvent({
      action: 'STOCK_ADJUSTED',
      entityType: 'GarmentVariant',
      entityId: variantId,
      actorId: adminId,
      payload: {
        sku: existingVariant.sku,
        productName: existingVariant.product.name,
        supplierName: existingVariant.product.supplier.companyName,
        previousStock,
        newStock: stock,
        delta: stock - previousStock,
        reason: reason || 'Admin manual inventory override',
      },
    });

    return NextResponse.json({
      success: true,
      variant: updatedVariant,
      message: `Stock for ${existingVariant.sku} updated from ${previousStock} to ${stock}`,
    });
  } catch (err: any) {
    console.error('[API /admin/inventory PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update stock', details: err?.message },
      { status: 500 }
    );
  }
}
