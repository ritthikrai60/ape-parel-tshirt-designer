import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Retrieves in-app notifications for the authenticated user, ordered by creation date desc.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  try {
    const whereClause: any = { userId };
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    console.error('[API /notifications GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve notifications', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Marks specific notification(s) or all notifications as read.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId || typeof notificationId !== 'string') {
      return NextResponse.json(
        { error: 'notificationId or markAllAsRead is required' },
        { status: 400 }
      );
    }

    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updated.count,
    });
  } catch (err: any) {
    console.error('[API /notifications PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update notifications', details: err?.message },
      { status: 500 }
    );
  }
}
