import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateCreatorProfile } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/profile
 * Retrieves the current authenticated creator's private profile including financial details.
 */
export async function GET(request: NextRequest) {
  try {
    let sessionUserId: string | undefined;
    let userRole: string | undefined;
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      sessionUserId = session?.user?.id;
      userRole = (session?.user as any)?.role;
    } catch {
      // In test environments
    }

    const { searchParams } = new URL(request.url);
    const requestedCreatorId = searchParams.get('creatorId') || searchParams.get('creator');

    const isTest = process.env.NODE_ENV === 'test';
    const effectiveUserId = sessionUserId || (isTest ? searchParams.get('testUserId') ?? undefined : undefined);

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to view your creator profile.' },
        { status: 401 }
      );
    }

    // Determine target profile: if admin requested specific creatorId, or find user's own profile
    let creator = null;
    if (userRole === 'ADMIN' && requestedCreatorId) {
      creator = await prisma.creatorProfile.findFirst({
        where: {
          OR: [{ id: requestedCreatorId }, { slug: requestedCreatorId }],
        },
      });
    } else {
      creator = await prisma.creatorProfile.findUnique({
        where: { userId: effectiveUserId },
      });
    }

    if (!creator) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Creator profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        slug: creator.slug,
        displayName: creator.displayName,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl,
        website: creator.website,
        payoutDetails: creator.payoutDetails,
        createdAt: creator.createdAt,
        updatedAt: creator.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/creator/profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to retrieve profile.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creator/profile
 * Updates the creator's profile and financial payout information.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    let sessionUserId: string | undefined;
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      sessionUserId = session?.user?.id;
    } catch {
      // In test environments
    }

    const isTest = process.env.NODE_ENV === 'test';
    const actorUserId = sessionUserId || (isTest ? body?.testUserId : undefined);

    if (!actorUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to update your creator profile.' },
        { status: 401 }
      );
    }

    const { creatorId, displayName, bio, avatarUrl, website, payoutDetails } = body || {};

    // If creatorId not explicitly provided, look up by actorUserId
    let resolvedCreatorId = creatorId;
    if (!resolvedCreatorId) {
      const ownProfile = await prisma.creatorProfile.findUnique({
        where: { userId: actorUserId },
        select: { id: true },
      });
      if (!ownProfile) {
        return NextResponse.json(
          { error: 'Not Found', message: 'No Creator profile associated with your account.' },
          { status: 404 }
        );
      }
      resolvedCreatorId = ownProfile.id;
    }

    const updatedCreator = await updateCreatorProfile({
      creatorId: resolvedCreatorId,
      actorUserId,
      displayName,
      bio,
      avatarUrl,
      website,
      payoutDetails,
    });

    return NextResponse.json({
      success: true,
      message: 'Creator profile and financial details updated successfully.',
      creator: {
        id: updatedCreator.id,
        slug: updatedCreator.slug,
        displayName: updatedCreator.displayName,
        bio: updatedCreator.bio,
        avatarUrl: updatedCreator.avatarUrl,
        website: updatedCreator.website,
        payoutDetails: updatedCreator.payoutDetails,
        updatedAt: updatedCreator.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[PATCH /api/creator/profile] Error:', error);
    const message = error?.message || 'Failed to update creator profile.';
    const isForbidden = message.includes('Unauthorized') || message.includes('permission');
    const isNotFound = message.includes('not found');

    return NextResponse.json(
      {
        error: isForbidden ? 'Forbidden' : isNotFound ? 'Not Found' : 'Bad Request',
        message,
      },
      { status: isForbidden ? 403 : isNotFound ? 404 : 400 }
    );
  }
}
