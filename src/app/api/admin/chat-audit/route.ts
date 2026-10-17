import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeMessageForTTL } from '@/lib/orderChat';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/chat-audit
 *
 * Super-visibility admin portal endpoint for cross-order chat auditing,
 * fraud detection analysis, dispute investigations, and risk statistics.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role as string | undefined;

    // Allow Admin or Development fallback
    const isDev = process.env.NODE_ENV !== 'production';
    const explicitRole = req.headers.get('x-client-role')?.toUpperCase();
    const isAuthorized = role === 'ADMIN' || (isDev && (!role || explicitRole === 'ADMIN'));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required for chat audit control center' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const flaggedOnly = searchParams.get('flagged') === 'true';
    const search = searchParams.get('search')?.trim() || '';
    const orderNumberFilter = searchParams.get('orderNumber')?.trim() || '';
    const riskFilter = searchParams.get('risk')?.toUpperCase() || 'ALL'; // ALL, HIGH, MEDIUM
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // Build Prisma query filter
    const where: any = {};

    if (flaggedOnly) {
      where.isFlagged = true;
    }

    if (riskFilter === 'HIGH') {
      where.isFlagged = true;
      where.OR = [
        { flagReason: { contains: 'นอกระบบ' } },
        { flagReason: { contains: 'บัญชีธนาคาร' } },
        { flagReason: { contains: 'PromptPay' } },
      ];
    } else if (riskFilter === 'MEDIUM') {
      where.isFlagged = true;
      where.NOT = {
        OR: [
          { flagReason: { contains: 'นอกระบบ' } },
          { flagReason: { contains: 'บัญชีธนาคาร' } },
          { flagReason: { contains: 'PromptPay' } },
        ],
      };
    }

    if (orderNumberFilter) {
      where.order = {
        orderNumber: { contains: orderNumberFilter },
      };
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { message: { contains: search } },
        { flagReason: { contains: search } },
      ];
    }

    // 1. Fetch matching messages
    const [rawMessages, totalCount] = await Promise.all([
      prisma.orderMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              customer: {
                select: { id: true, name: true, email: true },
              },
              supplier: {
                select: { id: true, companyName: true },
              },
            },
          },
          sender: {
            select: { id: true, name: true, role: true, email: true },
          },
        },
      }),
      prisma.orderMessage.count({ where }),
    ]);

    // 2. Fetch aggregate telemetry stats
    const [totalMessages, flaggedCount, highRiskCount, ordersWithFlags] = await Promise.all([
      prisma.orderMessage.count(),
      prisma.orderMessage.count({ where: { isFlagged: true } }),
      prisma.orderMessage.count({
        where: {
          isFlagged: true,
          OR: [
            { flagReason: { contains: 'นอกระบบ' } },
            { flagReason: { contains: 'บัญชีธนาคาร' } },
            { flagReason: { contains: 'PromptPay' } },
          ],
        },
      }),
      prisma.orderMessage.groupBy({
        by: ['orderId'],
        where: { isFlagged: true },
        _count: { id: true },
      }),
    ]);

    // 3. Sanitize TTL images before sending
    const sanitizedMessages = rawMessages.map((msg) => ({
      ...sanitizeMessageForTTL(msg),
      isHighRisk:
        msg.isFlagged &&
        Boolean(
          msg.flagReason?.includes('นอกระบบ') ||
          msg.flagReason?.includes('บัญชีธนาคาร') ||
          msg.flagReason?.includes('PromptPay')
        ),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalMessages,
        flaggedCount,
        highRiskCount,
        flaggedOrdersCount: ordersWithFlags.length,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      messages: sanitizedMessages,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/chat-audit Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to fetch chat audit logs' },
      { status: 500 }
    );
  }
}
