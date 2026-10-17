import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAnalyticsSummary } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) || 7 : 7;

    const summary = await getAnalyticsSummary(days);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('[Admin Analytics API Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
