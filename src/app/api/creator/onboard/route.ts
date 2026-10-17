import { NextRequest, NextResponse } from 'next/server';
import { onboardCreator } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let sessionUserId: string | undefined;
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      sessionUserId = session?.user?.id;
    } catch {
      // In headless test environments
    }

    // If an authenticated session is present, ensure identity cannot be forged
    if (sessionUserId && body?.userId && body.userId !== sessionUserId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You cannot create a profile on behalf of another user.' },
        { status: 403 }
      );
    }

    // Authoritative identity: session user takes absolute precedence; allow body fallback only in test environment
    const isTest = process.env.NODE_ENV === 'test';
    const userId = sessionUserId || (isTest ? body?.userId : undefined);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to set up a Creator profile.' },
        { status: 401 }
      );
    }

    const { displayName, slug, bio, avatarUrl, website, payoutDetails } = body || {};

    const creator = await onboardCreator({
      userId,
      displayName,
      slug,
      bio,
      avatarUrl,
      website,
      payoutDetails,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Creator profile created successfully',
        creator,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const message = error?.message || 'Failed to complete creator onboarding';
    const isConflict =
      message.includes('already taken') ||
      message.includes('already has an active Creator profile') ||
      error?.code === 'P2002';

    return NextResponse.json(
      {
        error: isConflict ? 'Conflict' : 'Bad Request',
        message,
      },
      { status: isConflict ? 409 : 400 }
    );
  }
}
