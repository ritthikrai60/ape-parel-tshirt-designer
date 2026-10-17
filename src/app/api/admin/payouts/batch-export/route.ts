import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/payouts/batch-export
 *
 * Generates and downloads a CSV batch disbursement file for corporate banking / PromptPay.
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
        creator: true,
      },
    });

    const headers = [
      'Reference',
      'CreatorName',
      'PaymentMethod',
      'PromptPayOrAccount',
      'BankName',
      'GrossAmount_THB',
      'WithholdingTax3Pct_THB',
      'NetAmount_THB',
      'Status',
      'CreatedAt',
    ];

    const rows = payouts.map((p) => [
      p.referenceNumber,
      `"${p.accountName.replace(/"/g, '""')}"`,
      p.paymentMethod,
      p.promptPayId || p.bankAccountNumber || 'N/A',
      p.bankName || 'PromptPay Any ID',
      p.grossAmount,
      p.withholdingTaxAmount,
      p.netAmount,
      p.status,
      new Date(p.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ape_parel_payouts_batch_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('[API /admin/payouts/batch-export] Error:', err);
    return NextResponse.json(
      { error: 'Failed to export payouts batch', details: err?.message },
      { status: 500 }
    );
  }
}
