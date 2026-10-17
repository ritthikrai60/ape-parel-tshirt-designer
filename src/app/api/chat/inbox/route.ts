import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeMessageForTTL } from '@/lib/orderChat';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    let currentUserId = (session?.user as any)?.id as string | undefined;
    let currentUserRole = (session?.user as any)?.role as string | undefined;

    // Development / Demo Fallback
    const explicitRole = request.headers.get('x-client-role')?.toUpperCase();
    const explicitUserId = request.headers.get('x-client-user-id');

    if (explicitUserId) {
      currentUserId = explicitUserId;
    }

    let dbUser = currentUserId
      ? await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, name: true, email: true, role: true },
        })
      : null;

    if (!dbUser) {
      // Fallback in dev/test environment to customer or supplier
      dbUser = await prisma.user.findFirst({
        where: { role: explicitRole === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER' },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!dbUser) {
        dbUser = await prisma.user.findFirst({
          select: { id: true, name: true, email: true, role: true },
        });
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized: User not found' }, { status: 401 });
    }

    const userId = dbUser.id;
    const role = explicitRole || dbUser.role || 'CUSTOMER';

    // Build filter based on user role
    const orderWhere: any = {};
    if (role === 'ADMIN') {
      // Admin sees orders that have messages or active orders
      orderWhere.OR = [
        { messages: { some: {} } },
        { status: { in: ['PAYMENT_CONFIRMED', 'IN_PRODUCTION', 'QA', 'READY_TO_PACK'] } },
      ];
    } else if (role === 'SUPPLIER') {
      orderWhere.supplier = {
        userId,
      };
    } else {
      // Customer
      orderWhere.customerId = userId;
    }

    // 1. Fetch matching orders
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        design: {
          include: {
            garmentProduct: true,
          },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        supplier: {
          select: { id: true, companyName: true, userId: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    const orderIds = orders.map((o) => o.id);

    // 2. Fetch unread counts per order for current user
    const unreadAgg = orderIds.length > 0
      ? await prisma.orderMessage.groupBy({
          by: ['orderId'],
          where: {
            orderId: { in: orderIds },
            senderId: { not: userId },
            isRead: false,
          },
          _count: { id: true },
        })
      : [];

    const unreadMap = new Map<string, number>();
    for (const item of unreadAgg) {
      unreadMap.set(item.orderId, item._count.id);
    }

    // 3. Format into thread summaries
    const threads = orders.map((order) => {
      const rawLastMsg = order.messages[0] || null;
      const sanitizedLastMsg = rawLastMsg ? sanitizeMessageForTTL(rawLastMsg) : null;
      const unreadCount = unreadMap.get(order.id) || 0;

      let partnerName = 'คู่สนทนา';
      let partnerRole = 'SUPPLIER';

      if (role === 'CUSTOMER') {
        partnerName = order.supplier?.companyName || 'โรงงานผู้ผลิต';
        partnerRole = 'ผู้ผลิต';
      } else if (role === 'SUPPLIER') {
        partnerName = order.customer?.name || 'ลูกค้าคำสั่งซื้อ';
        partnerRole = 'ลูกค้า';
      } else {
        partnerName = `${order.customer?.name || 'ลูกค้า'} ↔ ${order.supplier?.companyName || 'ผู้ผลิต'}`;
        partnerRole = 'Admin View';
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        garment: {
          name: order.design?.garmentProduct?.name || 'Custom Garment',
          sku: order.design?.garmentProduct?.sku || 'APX-HVY-001',
          colorHex: order.design?.garmentColorHex || '#131718',
          size: order.design?.garmentSize || 'L',
          previewFrontUrl: order.design?.previewFrontUrl || null,
        },
        partner: {
          name: partnerName,
          role: partnerRole,
        },
        lastMessage: sanitizedLastMsg
          ? {
              id: sanitizedLastMsg.id,
              message: sanitizedLastMsg.message,
              senderRole: sanitizedLastMsg.senderRole,
              senderName: sanitizedLastMsg.sender?.name || (sanitizedLastMsg.senderRole === 'SUPPLIER' ? 'ผู้ผลิต' : 'ลูกค้า'),
              hasImage: Boolean(sanitizedLastMsg.imageExpiresAt),
              isImageExpired: Boolean(sanitizedLastMsg.isImageExpired),
              createdAt: sanitizedLastMsg.createdAt.toISOString(),
            }
          : null,
        unreadCount,
        hasFlagged: sanitizedLastMsg?.isFlagged || false,
      };
    });

    const totalUnread = Array.from(unreadMap.values()).reduce((sum, c) => sum + c, 0);

    return NextResponse.json({
      success: true,
      currentUser: {
        id: dbUser.id,
        name: dbUser.name,
        role,
      },
      threads,
      totalUnread,
    });
  } catch (error: any) {
    console.error('[GET /api/chat/inbox Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to fetch inbox threads' },
      { status: 500 }
    );
  }
}
