import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total real pageviews from database
    const dbTotal = await prisma.analyticsEvent.count({
      where: { eventType: 'PAGEVIEW' },
    });

    // 2. Today's real pageviews from database
    const dbToday = await prisma.analyticsEvent.count({
      where: {
        eventType: 'PAGEVIEW',
        createdAt: { gte: today },
      },
    });

    // 3. Real unique visitors count (distinct session tokens)
    const uniqueTokens = await prisma.analyticsEvent.groupBy({
      by: ['sessionToken'],
    });

    return NextResponse.json(
      {
        totalVisits: dbTotal,
        todayVisits: dbToday,
        uniqueVisitors: uniqueTokens.length,
        status: 'ONLINE',
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[Analytics Stats API Error]', error);
    return NextResponse.json({
      totalVisits: 0,
      todayVisits: 0,
      uniqueVisitors: 0,
      status: 'ONLINE',
      lastUpdated: new Date().toISOString(),
    });
  }
}
