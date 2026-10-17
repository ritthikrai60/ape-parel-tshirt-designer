import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface TrackEventInput {
  eventType?: 'PAGEVIEW' | 'VIEW_ARTWORK' | 'OPEN_STUDIO' | 'START_CHECKOUT' | 'CUSTOM_EVENT' | string;
  path: string;
  sessionToken?: string;
  userId?: string | null;
  entityType?: 'ARTWORK' | 'CREATOR' | 'GARMENT' | string;
  entityId?: string;
  referrer?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, any>;
}

export interface AnalyticsSummary {
  totalPageviews: number;
  uniqueVisitors: number;
  totalEvents: number;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  topPages: Array<{
    path: string;
    count: number;
    percentage: number;
  }>;
  topEvents: Array<{
    eventType: string;
    count: number;
  }>;
  dailyTimeline: Array<{
    date: string;
    pageviews: number;
    uniqueVisitors: number;
  }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    path: string;
    deviceType: string;
    browser: string | null;
    os: string | null;
    userId: string | null;
    sessionToken: string;
    createdAt: string;
  }>;
}

/**
 * Parses User-Agent header into Device Type, Browser, and Operating System
 */
export function parseUserAgent(userAgent?: string | null): {
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { deviceType: 'DESKTOP', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = userAgent.toLowerCase();

  // 1. Device Type
  let deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' = 'DESKTOP';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'TABLET';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'MOBILE';
  }

  // 2. Browser
  let browser = 'Other';
  if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    browser = 'Opera';
  }

  // 3. Operating System
  let os = 'Other';
  if (ua.includes('win')) {
    os = 'Windows';
  } else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) {
    os = 'macOS';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  return { deviceType, browser, os };
}

/**
 * Generates an anonymized, daily-salted session hash compliant with PDPA.
 * Does not store raw IP addresses.
 */
export function generateAnonymizedSessionToken(ipAddress?: string | null, userAgent?: string | null): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT || 'ape_parel_daily_telemetry_salt';
  const raw = `${ipAddress || 'unknown_ip'}::${userAgent || 'unknown_ua'}::${dateStr}::${salt}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return `sess_${hash}`;
}

/**
 * Core event persistence into database
 */
export async function recordAnalyticsEvent(input: TrackEventInput) {
  const { deviceType, browser, os } = parseUserAgent(input.userAgent);
  const sessionToken = input.sessionToken || generateAnonymizedSessionToken(input.ipAddress, input.userAgent);

  return prisma.analyticsEvent.create({
    data: {
      eventType: input.eventType || 'PAGEVIEW',
      path: input.path.slice(0, 255),
      sessionToken,
      userId: input.userId || null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      referrer: input.referrer ? input.referrer.slice(0, 255) : null,
      deviceType,
      browser,
      os,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

/**
 * Aggregates analytics metrics for Admin Dashboard
 */
export async function getAnalyticsSummary(days: number = 7): Promise<AnalyticsSummary> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch events within range
  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalEvents = events.length;
  const pageviewEvents = events.filter((e) => e.eventType === 'PAGEVIEW');
  const totalPageviews = pageviewEvents.length;

  // Distinct unique visitors by sessionToken
  const uniqueVisitorTokens = new Set(events.map((e) => e.sessionToken));
  const uniqueVisitors = uniqueVisitorTokens.size;

  // Device Breakdown
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  for (const e of events) {
    if (e.deviceType === 'MOBILE') deviceCounts.mobile++;
    else if (e.deviceType === 'TABLET') deviceCounts.tablet++;
    else deviceCounts.desktop++;
  }

  // Top Pages
  const pageMap = new Map<string, number>();
  for (const e of pageviewEvents) {
    pageMap.set(e.path, (pageMap.get(e.path) || 0) + 1);
  }
  const topPages = Array.from(pageMap.entries())
    .map(([path, count]) => ({
      path,
      count,
      percentage: totalPageviews > 0 ? Math.round((count / totalPageviews) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Top Events Breakdown
  const eventMap = new Map<string, number>();
  for (const e of events) {
    eventMap.set(e.eventType, (eventMap.get(e.eventType) || 0) + 1);
  }
  const topEvents = Array.from(eventMap.entries())
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count);

  // Daily Timeline (Last N days)
  const dailyMap = new Map<string, { pageviews: number; visitors: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { pageviews: 0, visitors: new Set() });
  }

  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      if (e.eventType === 'PAGEVIEW') {
        entry.pageviews++;
      }
      entry.visitors.add(e.sessionToken);
    }
  }

  const dailyTimeline = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      pageviews: data.pageviews,
      uniqueVisitors: data.visitors.size,
    }))
    .reverse();

  // Recent 20 Events
  const recentEvents = events.slice(0, 20).map((e) => ({
    id: e.id,
    eventType: e.eventType,
    path: e.path,
    deviceType: e.deviceType,
    browser: e.browser,
    os: e.os,
    userId: e.userId,
    sessionToken: e.sessionToken,
    createdAt: e.createdAt.toISOString(),
  }));

  return {
    totalPageviews,
    uniqueVisitors,
    totalEvents,
    deviceBreakdown: deviceCounts,
    topPages,
    topEvents,
    dailyTimeline,
    recentEvents,
  };
}
