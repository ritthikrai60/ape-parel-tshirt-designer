'use client';

import React, { useEffect, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export interface CustomEventOptions {
  entityType?: 'ARTWORK' | 'CREATOR' | 'GARMENT' | string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Global helper to trigger engagement events from anywhere in the client
 */
export function trackAnalyticsEvent(
  eventType: 'VIEW_ARTWORK' | 'OPEN_STUDIO' | 'START_CHECKOUT' | 'CUSTOM_EVENT' | string,
  options?: CustomEventOptions
) {
  if (typeof window === 'undefined') return;

  const payload = {
    eventType,
    path: window.location.pathname,
    entityType: options?.entityType,
    entityId: options?.entityId,
    metadata: options?.metadata,
  };

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    console.debug('[Analytics] Failed to send event beacon', err);
  }
}

function AnalyticsTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>('');

  useEffect(() => {
    if (!pathname) return;

    const queryString = searchParams?.toString();
    const fullUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Avoid duplicate pageview on identical URL
    if (lastTrackedUrl.current === fullUrl) return;
    lastTrackedUrl.current = fullUrl;

    const payload = {
      eventType: 'PAGEVIEW',
      path: fullUrl,
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/track', blob);
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Non-blocking
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner />
    </Suspense>
  );
}

export default AnalyticsTracker;
