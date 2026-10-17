import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const createPayoutSchema = z.object({
  creatorId: z.string().min(1, 'Creator ID is required'),
  grossAmount: z.number().int().min(500, 'Minimum payout request is ฿500'),
  paymentMethod: z.enum(['PROMPTPAY', 'BANK_TRANSFER']).default('PROMPTPAY'),
  promptPayId: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  accountName: z.string().min(1, 'Account name is required'),
});

/**
 * GET /api/admin/payouts
 * Lists all creator payout requests with creator profile and tax details.
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

  try {
    const payouts = await prisma.payoutRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            avatarUrl: true,
            financialAccount: true,
          },
        },
      },
    });

    const summary = {
      totalPendingCount: payouts.filter((p) => p.status === 'PENDING').length,
      totalPendingAmount: payouts
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.netAmount, 0),
      totalPaidAmount: payouts
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.netAmount, 0),
      totalWithholdingTaxCollected: payouts
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.withholdingTaxAmount, 0),
    };

    return NextResponse.json({ payouts, summary });
  } catch (err: any) {
    console.error('[API /admin/payouts GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve payout requests', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payouts
 * Creates a new payout request for a creator (applies 3% Thai Withholding Tax).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parseResult = createPayoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: parseResult.error.errors[0]?.message,
          issues: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      creatorId,
      grossAmount,
      paymentMethod,
      promptPayId,
      bankName,
      bankAccountNumber,
      accountName,
    } = parseResult.data;

    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      include: { financialAccount: true },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Verify creator has sufficient royalty balance
    const currentBalance = creator.financialAccount?.balance || 0;
    if (currentBalance < grossAmount) {
      return NextResponse.json(
        {
          error: `Insufficient royalty balance: available ฿${currentBalance.toLocaleString()}, requested ฿${grossAmount.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // Calculate 3% Thai Withholding Tax (Section 40(3) Copyright Royalties)
    const withholdingTaxRate = 0.03;
    const withholdingTaxAmount = Math.round(grossAmount * withholdingTaxRate);
    const netAmount = grossAmount - withholdingTaxAmount;

    const referenceNumber = `PO-${Date.now().toString().slice(-6)}`;

    const payout = await prisma.payoutRequest.create({
      data: {
        creatorId,
        grossAmount,
        withholdingTaxRate,
        withholdingTaxAmount,
        netAmount,
        paymentMethod,
        promptPayId: promptPayId || null,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        accountName,
        status: 'PENDING',
        referenceNumber,
      },
    });

    await recordAuditEvent({
      action: 'PAYOUT_REQUEST_CREATED',
      entityType: 'PayoutRequest',
      entityId: payout.id,
      actorId: userId,
      payload: {
        referenceNumber,
        creatorName: creator.displayName,
        grossAmount,
        netAmount,
        withholdingTaxAmount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Payout request ${referenceNumber} submitted successfully. 3% WHT (฿${withholdingTaxAmount}) reserved.`,
      payout,
    });
  } catch (err: any) {
    console.error('[API /admin/payouts POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create payout request', details: err?.message },
      { status: 500 }
    );
  }
}
