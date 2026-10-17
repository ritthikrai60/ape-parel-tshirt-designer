import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subscribers/newsletter/export
 * Admin-only CSV export of newsletter subscribers
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin)' }, { status: 403 });
  }

  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Email', 'Status', 'Source', 'ConsentGiven', 'ConsentTimestamp', 'CreatedAt'];
    const rows = subscribers.map((s) => [
      `"${s.id}"`,
      `"${s.email.replace(/"/g, '""')}"`,
      `"${s.status}"`,
      `"${s.source}"`,
      s.consentGiven ? 'TRUE' : 'FALSE',
      `"${new Date(s.consentTimestamp).toISOString()}"`,
      `"${new Date(s.createdAt).toISOString()}"`,
    ]);

    // UTF-8 BOM (\uFEFF) for Excel Thai / UTF-8 compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const filename = `ape_parel_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('[CSV Export] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate CSV export', details: err?.message },
      { status: 500 }
    );
  }
}
