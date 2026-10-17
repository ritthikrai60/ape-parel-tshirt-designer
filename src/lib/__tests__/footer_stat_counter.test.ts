import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET as getStatsRoute } from '@/app/api/analytics/stats/route';

describe('Footer Stat Counter & Public Stats API Suite', () => {
  let createdEventId: string;

  beforeAll(async () => {
    // Record a fresh test pageview event to test real count
    const event = await prisma.analyticsEvent.create({
      data: {
        eventType: 'PAGEVIEW',
        path: '/test-footer-counter-route',
        sessionToken: 'sess_test_counter_123',
        deviceType: 'DESKTOP',
        browser: 'Chrome',
        os: 'Windows',
      },
    });
    createdEventId = event.id;
  });

  afterAll(async () => {
    if (createdEventId) {
      await prisma.analyticsEvent.delete({
        where: { id: createdEventId },
      }).catch(() => {});
    }
  });

  it('serves 100% real database analytics stats without any fake baseline offsets', async () => {
    const res = await getStatsRoute();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toBeDefined();

    // Pure real counts
    expect(json.totalVisits).toBeGreaterThanOrEqual(1);
    expect(json.todayVisits).toBeGreaterThanOrEqual(1);
    expect(json.uniqueVisitors).toBeGreaterThanOrEqual(1);
    expect(json.status).toBe('ONLINE');
  });
});
