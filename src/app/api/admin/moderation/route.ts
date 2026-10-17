import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/moderation
 * Retrieves artworks categorized by moderation status with creator and fileSpec details.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status'); // PENDING, APPROVED, REJECTED, or null (all)

  try {
    const whereClause: any = {};
    if (statusFilter && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter.toUpperCase())) {
      whereClause.moderationStatus = statusFilter.toUpperCase();
    }

    const artworks = await prisma.artwork.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            slug: true,
            avatarUrl: true,
          },
        },
        fileSpec: true,
        licenseOptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const counts = {
      pending: await prisma.artwork.count({ where: { moderationStatus: 'PENDING' } }),
      approved: await prisma.artwork.count({ where: { moderationStatus: 'APPROVED' } }),
      rejected: await prisma.artwork.count({ where: { moderationStatus: 'REJECTED' } }),
    };

    return NextResponse.json({
      artworks,
      counts,
    });
  } catch (err: any) {
    console.error('[API /admin/moderation GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve moderation queue', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/moderation
 * Accepts or Rejects an artwork with optional reason and creates a notification for the creator.
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
    const body = await req.json();
    const { artworkId, action, reason } = body;

    if (!artworkId || typeof artworkId !== 'string') {
      return NextResponse.json({ error: 'artworkId is required' }, { status: 400 });
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action: must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    if (action === 'REJECT' && (!reason || typeof reason !== 'string' || !reason.trim())) {
      return NextResponse.json(
        { error: 'A specific reason is required when rejecting an artwork.' },
        { status: 400 }
      );
    }

    const existingArtwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        creator: true,
      },
    });

    if (!existingArtwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    const isApprove = action === 'APPROVE';
    const newModerationStatus = isApprove ? 'APPROVED' : 'REJECTED';
    const newStatus = isApprove ? 'PUBLISHED' : 'DRAFT';
    const cleanReason = isApprove ? null : reason?.trim();

    // Execute atomic update, notification creation, and audit logging
    const result = await prisma.$transaction(async (tx) => {
      const updatedArtwork = await tx.artwork.update({
        where: { id: artworkId },
        data: {
          moderationStatus: newModerationStatus,
          status: newStatus,
          moderationReason: cleanReason,
          moderatedAt: new Date(),
          moderatedById: adminId,
        },
      });

      // Send in-app notification to creator
      const notifTitle = isApprove
        ? `🎉 Artwork Approved: ${existingArtwork.title}`
        : `⚠️ Artwork Rejected: ${existingArtwork.title}`;

      const notifMessage = isApprove
        ? `Your graphic design "${existingArtwork.title}" has been reviewed and approved! It is now live in the ape-parel Marketplace and Design Studio.`
        : `Your graphic design "${existingArtwork.title}" was rejected for the following reason: "${cleanReason}". Please adjust the design and re-upload.`;

      await tx.notification.create({
        data: {
          userId: existingArtwork.creator.userId,
          type: isApprove ? 'ARTWORK_APPROVED' : 'ARTWORK_REJECTED',
          title: notifTitle,
          message: notifMessage,
          metadata: JSON.stringify({
            artworkId: existingArtwork.id,
            artworkTitle: existingArtwork.title,
            reason: cleanReason,
            moderatedAt: new Date().toISOString(),
          }),
        },
      });

      return updatedArtwork;
    });

    // Record system audit event
    await recordAuditEvent({
      action: isApprove ? AuditAction.ARTWORK_APPROVED : AuditAction.ARTWORK_REJECTED,
      entityType: 'Artwork',
      entityId: artworkId,
      actorId: adminId,
      userId: existingArtwork.creator.userId,
      payload: {
        action,
        previousStatus: existingArtwork.moderationStatus,
        newStatus: newModerationStatus,
        reason: cleanReason,
      },
    });

    return NextResponse.json({
      success: true,
      artwork: result,
      message: isApprove ? 'Artwork approved successfully' : 'Artwork rejected with notification sent',
    });
  } catch (err: any) {
    console.error('[API /admin/moderation PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process moderation review', details: err?.message },
      { status: 500 }
    );
  }
}
