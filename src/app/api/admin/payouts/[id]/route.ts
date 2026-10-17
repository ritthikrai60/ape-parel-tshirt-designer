import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updatePayoutSchema = z.object({
  action: z.enum(['APPROVE', 'MARK_PAID', 'REJECT']),
  rejectionReason: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/payouts/[id]
 *
 * Approves, Settles (Marks Paid with 50-Twi generation & ledger debit),
 * or Rejects a creator payout request.
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

  const { id: payoutId } = params;
  if (!payoutId) {
    return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parseResult = updatePayoutSchema.safeParse(body);
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

    const { action, rejectionReason } = parseResult.data;

    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        creator: {
          include: {
            financialAccount: true,
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
    }

    if (payout.status === 'PAID') {
      return NextResponse.json(
        { error: 'This payout request has already been settled and paid.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'APPROVE') {
        return await tx.payoutRequest.update({
          where: { id: payout.id },
          data: {
            status: 'APPROVED',
            approvedById: adminId,
          },
        });
      }

      if (action === 'REJECT') {
        return await tx.payoutRequest.update({
          where: { id: payout.id },
          data: {
            status: 'REJECTED',
            rejectionReason: rejectionReason || 'Rejected by platform administrator',
            approvedById: adminId,
          },
        });
      }

      // action === 'MARK_PAID':
      // 1. Deduct Creator FinancialAccount balance
      const account = payout.creator.financialAccount;
      if (account) {
        const newBalance = Math.max(0, account.balance - payout.grossAmount);
        await tx.financialAccount.update({
          where: { id: account.id },
          data: { balance: newBalance },
        });

        // 2. Post Journal Entry debiting creator's royalty account
        await tx.journalEntry.create({
          data: {
            accountId: account.id,
            entryType: 'DEBIT',
            amount: payout.grossAmount,
            balanceAfter: newBalance,
            reference: payout.referenceNumber,
            description: `Creator Royalty Disbursement [PromptPay: ${payout.promptPayId || payout.accountName}]. Gross: ฿${payout.grossAmount}, WHT 3%: ฿${payout.withholdingTaxAmount}, Net: ฿${payout.netAmount}`,
          },
        });
      }

      // 3. Generate 50-Twi certificate number
      const certificate50TwiUrl = `50TWI-202610-${payout.referenceNumber}`;

      // 4. Update PayoutRequest to PAID
      return await tx.payoutRequest.update({
        where: { id: payout.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          approvedById: adminId,
          certificate50TwiUrl,
        },
      });
    });

    // Record audit event
    await recordAuditEvent({
      action: action === 'MARK_PAID' ? 'CREATOR_PAYOUT_SETTLED' : `PAYOUT_REQUEST_${action}`,
      entityType: 'PayoutRequest',
      entityId: payout.id,
      actorId: adminId,
      payload: {
        referenceNumber: payout.referenceNumber,
        action,
        creatorName: payout.creator.displayName,
        netAmount: payout.netAmount,
        withholdingTaxAmount: payout.withholdingTaxAmount,
        rejectionReason: rejectionReason || null,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === 'MARK_PAID'
          ? `Payout ${payout.referenceNumber} marked as PAID. ฿${payout.netAmount.toLocaleString()} disbursed, ฿${payout.withholdingTaxAmount.toLocaleString()} 3% tax recorded, 50-Twi generated.`
          : `Payout ${payout.referenceNumber} status updated to ${action}.`,
      payout: result,
    });
  } catch (err: any) {
    console.error('[API /admin/payouts/[id] PATCH] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update payout request', details: err?.message },
      { status: 500 }
    );
  }
}
