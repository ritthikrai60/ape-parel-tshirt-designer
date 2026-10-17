import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import {
  parseUserAgent,
  generateAnonymizedSessionToken,
  recordAnalyticsEvent,
  getAnalyticsSummary,
} from '@/lib/analytics';
import { POST as trackRoute } from '@/app/api/analytics/track/route';

describe('Visitor Analytics & Telemetry Engine Suite', () => {
  const createdEventIds: string[] = [];

  afterAll(async () => {
    // Clean up created test analytics events
    if (createdEventIds.length > 0) {
      await prisma.analyticsEvent.deleteMany({
        where: { id: { in: createdEventIds } },
      });
    }
  });

  describe('1. User-Agent Parsing & Anonymized Tokenization', () => {
    it('accurately classifies mobile, tablet, and desktop devices', () => {
      // Desktop Windows Chrome
      const desktop = parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      expect(desktop.deviceType).toBe('DESKTOP');
      expect(desktop.browser).toBe('Chrome');
      expect(desktop.os).toBe('Windows');

      // iPhone Safari
      const mobile = parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      );
      expect(mobile.deviceType).toBe('MOBILE');
      expect(mobile.browser).toBe('Safari');
      expect(mobile.os).toBe('iOS');

      // iPad
      const tablet = parseUserAgent(
        'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
      );
      expect(tablet.deviceType).toBe('TABLET');
      expect(tablet.os).toBe('iOS');

      // Fallback for empty or unknown User-Agent
      const unknown = parseUserAgent(null);
      expect(unknown.deviceType).toBe('DESKTOP');
      expect(unknown.browser).toBe('Unknown');
    });

    it('generates consistent, anonymized session token without leaking raw IP', () => {
      const ip = '203.0.113.195';
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const token1 = generateAnonymizedSessionToken(ip, ua);
      const token2 = generateAnonymizedSessionToken(ip, ua);

      expect(token1).toBe(token2);
      expect(token1.startsWith('sess_')).toBe(true);
      expect(token1.length).toBe(21); // "sess_" + 16 hex chars
      expect(token1).not.toContain(ip); // Does NOT leak raw IP
    });
  });

  describe('2. Event Persistence & Telemetry Aggregation', () => {
    it('persists pageview and engagement events into database with relational safety', async () => {
      const pageview = await recordAnalyticsEvent({
        eventType: 'PAGEVIEW',
        path: '/marketplace',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '198.51.100.42',
      });
      createdEventIds.push(pageview.id);

      expect(pageview.id).toBeDefined();
      expect(pageview.eventType).toBe('PAGEVIEW');
      expect(pageview.path).toBe('/marketplace');
      expect(pageview.deviceType).toBe('DESKTOP');
      expect(pageview.sessionToken.startsWith('sess_')).toBe(true);

      // Custom interaction event
      const customEvent = await recordAnalyticsEvent({
        eventType: 'OPEN_STUDIO',
        path: '/studio/new',
        entityType: 'GARMENT',
        entityId: 'tee-oversized-black',
        metadata: { source: 'marketplace_card_cta' },
      });
      createdEventIds.push(customEvent.id);

      expect(customEvent.eventType).toBe('OPEN_STUDIO');
      expect(customEvent.entityType).toBe('GARMENT');
      expect(customEvent.entityId).toBe('tee-oversized-black');
      expect(customEvent.metadata).toContain('marketplace_card_cta');
    });

    it('aggregates summary metrics including pageviews, unique visitors, and top pages', async () => {
      const summary = await getAnalyticsSummary(7);

      expect(summary).toBeDefined();
      expect(summary.totalPageviews).toBeGreaterThanOrEqual(1);
      expect(summary.uniqueVisitors).toBeGreaterThanOrEqual(1);
      expect(summary.totalEvents).toBeGreaterThanOrEqual(2);
      expect(summary.deviceBreakdown).toHaveProperty('desktop');
      expect(summary.deviceBreakdown).toHaveProperty('mobile');
      expect(summary.deviceBreakdown).toHaveProperty('tablet');
      expect(Array.isArray(summary.topPages)).toBe(true);
      expect(Array.isArray(summary.dailyTimeline)).toBe(true);
      expect(Array.isArray(summary.recentEvents)).toBe(true);
      expect(summary.recentEvents.length).toBeGreaterThan(0);
    });
  });

  describe('3. Public API Route (/api/analytics/track)', () => {
    it('receives POST request, parses telemetry, and returns success with session token', async () => {
      const req = new NextRequest('http://localhost:3000/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        },
        body: JSON.stringify({
          eventType: 'VIEW_ARTWORK',
          path: '/creators/dash-ape',
          entityType: 'ARTWORK',
          entityId: 'art-dash-ape-running-blk',
        }),
      });

      const res = await trackRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.sessionToken).toBeDefined();
      expect(json.sessionToken.startsWith('sess_')).toBe(true);

      // Verify cookie was assigned
      const cookie = res.cookies.get('ape_session_token');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe(json.sessionToken);
    });

    it('rejects malformed requests missing required path', async () => {
      const req = new NextRequest('http://localhost:3000/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'PAGEVIEW' }), // missing path
      });

      const res = await trackRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Path is required');
    });
  });
});
