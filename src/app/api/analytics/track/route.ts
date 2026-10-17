import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { recordAnalyticsEvent, generateAnonymizedSessionToken } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventType, path, entityType, entityId, metadata } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // 1. Session token from cookie or header
    let sessionToken = req.cookies.get('ape_session_token')?.value;
    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (!sessionToken) {
      sessionToken = generateAnonymizedSessionToken(ipAddress, userAgent);
    }

    // 2. Auth context for Privacy-Friendly Hybrid policy
    let userId: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // Non-blocking if auth fails or unauthenticated
    }

    const referrer = req.headers.get('referer');

    // 3. Record to Database
    await recordAnalyticsEvent({
      eventType: eventType || 'PAGEVIEW',
      path,
      sessionToken,
      userId,
      entityType,
      entityId,
      referrer,
      userAgent,
      ipAddress,
      metadata,
    });

    const res = NextResponse.json({ success: true, sessionToken });

    // Set cookie if newly generated (lasts 30 days)
    if (!req.cookies.get('ape_session_token')) {
      res.cookies.set('ape_session_token', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (error: any) {
    console.error('[Analytics API Track Error]', error);
    return NextResponse.json({ error: 'Failed to record analytics' }, { status: 500 });
  }
}
