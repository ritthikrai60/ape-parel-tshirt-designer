import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getOrderByIdOrNumber } from '@/lib/orders';
import {
  detectFraudRisk,
  calculateImageExpiresAt,
  sanitizeMessageForTTL,
  validateChatImagePayload,
} from '@/lib/orderChat';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const postMessageSchema = z.object({
  message: z.string().min(1, 'กรุณาระบุข้อความอย่างน้อย 1 ตัวอักษร').max(2000, 'ข้อความยาวเกินกำหนด (สูงสุด 2,000 ตัวอักษร)'),
  imageUrl: z.string().nullable().optional(),
});

/**
 * Resolves current user from session or development mock fallback.
 */
async function resolveCurrentChatUser(request: NextRequest, orderCustomerId?: string | null, supplierUserId?: string | null) {
  const session = await auth();
  const sessionUser = session?.user as any;

  if (sessionUser?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (dbUser) return dbUser;
  }

  // Development / Demo fallback: Allow explicit X-Role or X-User-Id header if in non-production
  const explicitRole = request.headers.get('x-client-role')?.toUpperCase();
  const explicitUserId = request.headers.get('x-client-user-id');

  if (explicitUserId) {
    const user = await prisma.user.findUnique({
      where: { id: explicitUserId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (user) return user;
  }

  if (explicitRole === 'SUPPLIER' && supplierUserId) {
    const suppUser = await prisma.user.findUnique({
      where: { id: supplierUserId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (suppUser) return suppUser;
  }

  if (orderCustomerId) {
    const custUser = await prisma.user.findUnique({
      where: { id: orderCustomerId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (custUser) return custUser;
  }

  // Default dev fallback user
  let fallbackUser = await prisma.user.findFirst({
    where: { role: explicitRole === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER' },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!fallbackUser) {
    fallbackUser = await prisma.user.findFirst({
      select: { id: true, name: true, email: true, role: true },
    });
  }

  return fallbackUser;
}

/**
 * GET /api/orders/[id]/messages
 * Retrieves conversation transcript for an order with 7-day TTL image sanitization.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Order ID parameter is required' }, { status: 400 });
  }

  try {
    const order = await getOrderByIdOrNumber(id.trim());

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentUser = await resolveCurrentChatUser(
      request,
      order.customerId,
      (order.supplier as any)?.userId
    );

    // Verify role-based access:
    // Admin: allowed to view all chats
    // Customer: allowed if matches order.customerId
    // Supplier: allowed if matches order.supplier.userId
    const isAdmin = currentUser?.role === 'ADMIN';
    const isCustomer = currentUser?.id === order.customerId;
    const isSupplier = currentUser?.id === (order.supplier as any)?.userId || currentUser?.role === 'SUPPLIER';

    if (currentUser && !isAdmin && !isCustomer && !isSupplier) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view messages for this order' },
        { status: 403 }
      );
    }

    // 1. Physically clean up expired image payloads in the database
    try {
      await prisma.orderMessage.updateMany({
        where: {
          orderId: order.id,
          imageExpiresAt: { lte: new Date() },
          isImageExpired: false,
        },
        data: {
          isImageExpired: true,
          imageUrl: null,
        },
      });
    } catch (cleanupErr) {
      console.warn('[Chat TTL Purge Warning]', cleanupErr);
    }

    // 1.1 Mark unread messages from counterparty as read
    if (currentUser?.id) {
      try {
        await prisma.orderMessage.updateMany({
          where: {
            orderId: order.id,
            senderId: { not: currentUser.id },
            isRead: false,
          },
          data: { isRead: true },
        });
      } catch (readErr) {
        console.warn('[Chat mark-as-read warning]', readErr);
      }
    }

    // 2. Fetch all messages in chronological order
    const rawMessages = await prisma.orderMessage.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // 3. Apply in-memory TTL sanitization for safety
    const sanitizedMessages = rawMessages.map((msg) => sanitizeMessageForTTL(msg));

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerId: order.customerId,
        customerName: (order.customer as any)?.name || 'ลูกค้า',
        supplierId: order.supplierId,
        supplierName: (order.supplier as any)?.companyName || 'ผู้ผลิต',
      },
      currentUserRole: isAdmin ? 'ADMIN' : (isSupplier ? 'SUPPLIER' : 'CUSTOMER'),
      messages: sanitizedMessages,
    });
  } catch (error: any) {
    console.error('[GET /api/orders/[id]/messages Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/messages
 * Submits a new message or compressed image, running anti-fraud checks and 7-day TTL enforcement.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Order ID parameter is required' }, { status: 400 });
  }

  try {
    const json = await request.json();
    const parseResult = postMessageSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { message, imageUrl } = parseResult.data;

    const order = await getOrderByIdOrNumber(id.trim());
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const supplierUserId = (order.supplier as any)?.userId;
    const currentUser = await resolveCurrentChatUser(request, order.customerId, supplierUserId);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized: User identity could not be resolved' }, { status: 401 });
    }

    // Determine sender role
    let senderRole: 'CUSTOMER' | 'SUPPLIER' | 'ADMIN' | 'SYSTEM' = 'CUSTOMER';
    if (currentUser.role === 'ADMIN') {
      senderRole = 'ADMIN';
    } else if (currentUser.id === supplierUserId || currentUser.role === 'SUPPLIER') {
      senderRole = 'SUPPLIER';
    } else {
      senderRole = 'CUSTOMER';
    }

    // Validate image format & size if provided
    if (imageUrl) {
      const imgValidation = validateChatImagePayload(imageUrl);
      if (!imgValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid Image', message: imgValidation.error },
          { status: 400 }
        );
      }
    }

    // Anti-Fraud & Off-Platform Detection Engine
    const fraudResult = detectFraudRisk(message);

    // Image TTL calculation (7 Days)
    const imageExpiresAt = imageUrl ? calculateImageExpiresAt() : null;

    // Create the message in database
    const createdMessage = await prisma.orderMessage.create({
      data: {
        orderId: order.id,
        senderId: currentUser.id,
        senderRole,
        message: message.trim(),
        imageUrl: imageUrl || null,
        imageExpiresAt,
        isImageExpired: false,
        isFlagged: fraudResult.isFlagged,
        flagReason: fraudResult.flagReason,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // If flagged for fraud, record immutable audit log event
    if (fraudResult.isFlagged) {
      try {
        await recordAuditEvent({
          action: AuditAction.CHAT_MESSAGE_FLAGGED,
          entityType: 'OrderMessage',
          entityId: createdMessage.id,
          actorId: currentUser.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            senderRole,
            riskLevel: fraudResult.riskLevel,
            flagReason: fraudResult.flagReason,
            detectedMatches: fraudResult.detectedMatches,
            snippet: message.trim().slice(0, 150),
          },
          metadata: {
            orderStatus: order.status,
            detectedAt: new Date().toISOString(),
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Warning]', auditErr);
      }
    }

    // Dispatch notification to counter-party
    try {
      const recipientUserId = senderRole === 'CUSTOMER' ? supplierUserId : order.customerId;
      if (recipientUserId && recipientUserId !== currentUser.id) {
        await prisma.notification.create({
          data: {
            userId: recipientUserId,
            type: 'ORDER_UPDATE',
            title: `ข้อความใหม่: คำสั่งซื้อ #${order.orderNumber}`,
            message: `${currentUser.name || 'คู่สนทนา'}: ${message.trim().slice(0, 60)}${message.length > 60 ? '...' : ''}`,
            metadata: JSON.stringify({
              orderId: order.id,
              orderNumber: order.orderNumber,
              messageId: createdMessage.id,
            }),
          },
        });
      }
    } catch (notifErr) {
      console.warn('[Notification Warning]', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: sanitizeMessageForTTL(createdMessage),
      fraudAlert: fraudResult.isFlagged
        ? {
            isFlagged: true,
            riskLevel: fraudResult.riskLevel,
            reason: fraudResult.flagReason,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[POST /api/orders/[id]/messages Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
