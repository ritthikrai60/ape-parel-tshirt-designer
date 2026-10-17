import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/cms/promos/[id]
 * Updates promo code properties (e.g. toggle isActive, update discount value or maxUses).
 */
export async function PATCH(
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

  const { id: promoId } = params;

  try {
    const body = await req.json();

    const promo = await prisma.promoCode.update({
      where: { id: promoId },
      data: {
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.discountValue !== undefined ? { discountValue: Number(body.discountValue) } : {}),
        ...(body.minOrderAmount !== undefined ? { minOrderAmount: Number(body.minOrderAmount) } : {}),
        ...(body.maxUses !== undefined ? { maxUses: Number(body.maxUses) } : {}),
      },
    });

    await recordAuditEvent({
      action: 'PROMO_CODE_UPDATED',
      entityType: 'PromoCode',
      entityId: promo.id,
      actorId: adminId,
      payload: body,
    });

    return NextResponse.json({ success: true, promo });
  } catch (err: any) {
    console.error('[API /admin/cms/promos/[id] PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update promo code', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/cms/promos/[id]
 * Deletes promo code.
 */
export async function DELETE(
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

  const { id: promoId } = params;

  try {
    await prisma.promoCode.delete({
      where: { id: promoId },
    });

    await recordAuditEvent({
      action: 'PROMO_CODE_DELETED',
      entityType: 'PromoCode',
      entityId: promoId,
      actorId: adminId,
    });

    return NextResponse.json({ success: true, message: 'Promo code deleted' });
  } catch (err: any) {
    console.error('[API /admin/cms/promos/[id] DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete promo code', details: err?.message },
      { status: 500 }
    );
  }
}
