import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/cms/banners/[id]
 * Updates banner properties (e.g. toggle isActive, edit text/links).
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

  const { id: bannerId } = params;

  try {
    const body = await req.json();

    const banner = await prisma.marketplaceBanner.update({
      where: { id: bannerId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
        ...(body.badgeText !== undefined ? { badgeText: body.badgeText } : {}),
        ...(body.ctaText !== undefined ? { ctaText: body.ctaText } : {}),
        ...(body.ctaLink !== undefined ? { ctaLink: body.ctaLink } : {}),
        ...(body.bgColor !== undefined ? { bgColor: body.bgColor } : {}),
        ...(body.textColor !== undefined ? { textColor: body.textColor } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.priority !== undefined ? { priority: Number(body.priority) } : {}),
      },
    });

    await recordAuditEvent({
      action: 'CMS_BANNER_UPDATED',
      entityType: 'MarketplaceBanner',
      entityId: banner.id,
      actorId: adminId,
      payload: body,
    });

    return NextResponse.json({ success: true, banner });
  } catch (err: any) {
    console.error('[API /admin/cms/banners/[id] PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update banner', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/cms/banners/[id]
 * Deletes banner.
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

  const { id: bannerId } = params;

  try {
    await prisma.marketplaceBanner.delete({
      where: { id: bannerId },
    });

    await recordAuditEvent({
      action: 'CMS_BANNER_DELETED',
      entityType: 'MarketplaceBanner',
      entityId: bannerId,
      actorId: adminId,
    });

    return NextResponse.json({ success: true, message: 'Banner deleted' });
  } catch (err: any) {
    console.error('[API /admin/cms/banners/[id] DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete banner', details: err?.message },
      { status: 500 }
    );
  }
}
