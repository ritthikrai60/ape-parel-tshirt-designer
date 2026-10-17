'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Eye,
  Activity,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Globe,
  Clock,
  Layers,
} from 'lucide-react';
import { AnalyticsSummary } from '@/lib/analytics';

interface AdminAnalyticsTabProps {
  initialSummary?: AnalyticsSummary | null;
}

export function AdminAnalyticsTab({ initialSummary }: AdminAnalyticsTabProps) {
  const [days, setDays] = useState<number>(7);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState<boolean>(!initialSummary);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (targetDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${targetDays}`);
      if (!res.ok) {
        throw new Error(`Failed to load analytics: HTTP ${res.status}`);
      }
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSummary || days !== 7) {
      fetchSummary(days);
    }
  }, [days]);

  // Derived metrics
  const desktopCount = summary?.deviceBreakdown.desktop || 0;
  const mobileCount = summary?.deviceBreakdown.mobile || 0;
  const tabletCount = summary?.deviceBreakdown.tablet || 0;
  const totalDevices = desktopCount + mobileCount + tabletCount || 1;

  const desktopPct = Math.round((desktopCount / totalDevices) * 100);
  const mobilePct = Math.round((mobileCount / totalDevices) * 100);
  const tabletPct = Math.round((tabletCount / totalDevices) * 100);

  const maxTimelinePageviews = Math.max(
    ...(summary?.dailyTimeline.map((t) => t.pageviews) || [1]),
    1
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Top Controls Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-paper-light border border-borderCol p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-ink text-paper flex items-center justify-center flex-none">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-sans font-black text-lg text-ink">Visitor Analytics & Telemetry</h2>
            <p className="font-mono text-xs text-mutedGray">
              Anonymized session intelligence and real-time marketplace interaction tracking
            </p>
          </div>
        </div>

        {/* Time Filter & Refresh */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="inline-flex rounded-lg border border-borderCol bg-paper p-1">
            {[
              { label: '7 Days', val: 7 },
              { label: '14 Days', val: 14 },
              { label: '30 Days', val: 30 },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => setDays(tab.val)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                  days === tab.val
                    ? 'bg-ink text-paper font-bold shadow-sm'
                    : 'text-mutedGray hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchSummary(days)}
            disabled={loading}
            className="p-2 border border-borderCol rounded-lg bg-paper-light text-ink hover:border-ink/50 transition-colors disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-mono">
          {error}
        </div>
      )}

      {/* ── 2. KPI Scorecards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pageviews */}
        <div className="bg-paper-light border border-borderCol p-5 rounded-xl">
          <div className="flex items-center justify-between text-mutedGray mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Total Pageviews</span>
            <Eye className="w-4 h-4 text-warm-dark" />
          </div>
          <p className="font-sans font-black text-3xl text-ink">
            {summary ? summary.totalPageviews.toLocaleString() : '—'}
          </p>
          <p className="font-mono text-[11px] text-mutedGray mt-1">
            ~{summary ? Math.round(summary.totalPageviews / Math.max(days, 1)) : 0} views / day
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-paper-light border border-borderCol p-5 rounded-xl">
          <div className="flex items-center justify-between text-mutedGray mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Unique Visitors</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-sans font-black text-3xl text-ink">
            {summary ? summary.uniqueVisitors.toLocaleString() : '—'}
          </p>
          <p className="font-mono text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>PDPA Compliant Hash</span>
          </p>
        </div>

        {/* Total Platform Events */}
        <div className="bg-paper-light border border-borderCol p-5 rounded-xl">
          <div className="flex items-center justify-between text-mutedGray mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Interactions & Events</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-sans font-black text-3xl text-ink">
            {summary ? summary.totalEvents.toLocaleString() : '—'}
          </p>
          <p className="font-mono text-[11px] text-mutedGray mt-1">
            Pageviews + Custom Actions
          </p>
        </div>

        {/* Primary Platform Device */}
        <div className="bg-paper-light border border-borderCol p-5 rounded-xl">
          <div className="flex items-center justify-between text-mutedGray mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Primary Device</span>
            <Monitor className="w-4 h-4 text-ink" />
          </div>
          <p className="font-sans font-black text-2xl text-ink">
            {desktopPct >= mobilePct ? `Desktop ${desktopPct}%` : `Mobile ${mobilePct}%`}
          </p>
          <p className="font-mono text-[11px] text-mutedGray mt-1">
            Mobile {mobilePct}% • Tablet {tabletPct}%
          </p>
        </div>
      </div>

      {/* ── 3. Visual Charts & Breakdowns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Traffic Timeline (2 cols) */}
        <div className="lg:col-span-2 bg-paper-light border border-borderCol p-6 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-sans font-bold text-base text-ink">Traffic Trend (Past {days} Days)</h3>
                <p className="font-mono text-xs text-mutedGray">Daily comparison of pageviews and unique visitors</p>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-ink inline-block" /> Pageviews
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-warm-dark inline-block" /> Visitors
                </span>
              </div>
            </div>

            {/* Bar Chart Visualization */}
            <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-borderCol">
              {summary?.dailyTimeline.map((item) => {
                const heightPct = Math.max(Math.round((item.pageviews / maxTimelinePageviews) * 100), 6);
                const visitorHeightPct = Math.max(Math.round((item.uniqueVisitors / maxTimelinePageviews) * 100), 4);

                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* Pageview Bar */}
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-1/2 max-w-[18px] bg-ink rounded-t-sm transition-all group-hover:bg-warm-dark"
                        title={`${item.date}: ${item.pageviews} views`}
                      />
                      {/* Unique Visitors Bar */}
                      <div
                        style={{ height: `${visitorHeightPct}%` }}
                        className="w-1/2 max-w-[18px] bg-warm rounded-t-sm transition-all group-hover:bg-warm"
                        title={`${item.date}: ${item.uniqueVisitors} visitors`}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-mutedGray mt-2 truncate w-full text-center">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between font-mono text-xs text-mutedGray pt-4">
            <span>Range: {summary?.dailyTimeline[0]?.date} — {summary?.dailyTimeline[summary.dailyTimeline.length - 1]?.date}</span>
            <span>Scale: Max {maxTimelinePageviews} hits/day</span>
          </div>
        </div>

        {/* Device Breakdown (1 col) */}
        <div className="bg-paper-light border border-borderCol p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-bold text-base text-ink mb-1">Device Breakdown</h3>
            <p className="font-mono text-xs text-mutedGray mb-6">Traffic share across device form factors</p>

            <div className="space-y-4">
              {/* Desktop */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                    <Monitor className="w-4 h-4 text-ink" /> Desktop
                  </span>
                  <span>{desktopCount} ({desktopPct}%)</span>
                </div>
                <div className="w-full bg-paper border border-borderCol rounded-full h-2.5 overflow-hidden">
                  <div className="bg-ink h-full rounded-full transition-all duration-500" style={{ width: `${desktopPct}%` }} />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                    <Smartphone className="w-4 h-4 text-warm-dark" /> Mobile
                  </span>
                  <span>{mobileCount} ({mobilePct}%)</span>
                </div>
                <div className="w-full bg-paper border border-borderCol rounded-full h-2.5 overflow-hidden">
                  <div className="bg-warm-dark h-full rounded-full transition-all duration-500" style={{ width: `${mobilePct}%` }} />
                </div>
              </div>

              {/* Tablet */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                    <Tablet className="w-4 h-4 text-mutedGray" /> Tablet
                  </span>
                  <span>{tabletCount} ({tabletPct}%)</span>
                </div>
                <div className="w-full bg-paper border border-borderCol rounded-full h-2.5 overflow-hidden">
                  <div className="bg-mutedGray h-full rounded-full transition-all duration-500" style={{ width: `${tabletPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-borderCol font-mono text-[11px] text-mutedGray">
            Responsive Layout Telemetry
          </div>
        </div>
      </div>

      {/* ── 4. Top Visited Pages & Engagement Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-paper-light border border-borderCol rounded-xl p-6">
          <h3 className="font-sans font-bold text-base text-ink mb-1">Top Visited Pages</h3>
          <p className="font-mono text-xs text-mutedGray mb-4">Most frequented endpoints and storefronts</p>

          {summary?.topPages.length === 0 ? (
            <p className="font-mono text-xs text-mutedGray text-center py-8">No pageviews recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {summary?.topPages.map((page, idx) => (
                <div key={page.path} className="flex items-center gap-3">
                  <span className="w-5 font-mono text-xs text-mutedGray">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-ink font-semibold truncate" title={page.path}>
                        {page.path}
                      </span>
                      <span className="text-mutedGray font-medium ml-2 flex-none">
                        {page.count} ({page.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-paper border border-borderCol rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-ink h-full rounded-full transition-all duration-500"
                        style={{ width: `${page.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Events Breakdown */}
        <div className="bg-paper-light border border-borderCol rounded-xl p-6">
          <h3 className="font-sans font-bold text-base text-ink mb-1">Platform Event Breakdown</h3>
          <p className="font-mono text-xs text-mutedGray mb-4">Custom user interactions across the funnel</p>

          {summary?.topEvents.length === 0 ? (
            <p className="font-mono text-xs text-mutedGray text-center py-8">No events logged yet.</p>
          ) : (
            <div className="space-y-3">
              {summary?.topEvents.map((evt) => (
                <div
                  key={evt.eventType}
                  className="flex items-center justify-between p-3 rounded-lg border border-borderCol bg-paper"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        evt.eventType === 'PAGEVIEW'
                          ? 'bg-ink text-paper'
                          : evt.eventType === 'VIEW_ARTWORK'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : evt.eventType === 'OPEN_STUDIO'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {evt.eventType}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-ink">
                    {evt.count.toLocaleString()} occurrences
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Real-Time Visitor Activity Feed ── */}
      <div className="bg-paper-light border border-borderCol rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-sans font-bold text-base text-ink">Recent Visitor Activity Stream</h3>
            <p className="font-mono text-xs text-mutedGray">Latest 20 real-time events recorded in the database</p>
          </div>
          <span className="font-mono text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Ingestion
          </span>
        </div>

        {summary?.recentEvents.length === 0 ? (
          <p className="font-mono text-xs text-mutedGray text-center py-10">No recent activity detected.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-borderCol text-mutedGray uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Path</th>
                  <th className="py-2.5 px-3">Device / OS</th>
                  <th className="py-2.5 px-3">Session Token</th>
                  <th className="py-2.5 px-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCol">
                {summary?.recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-paper transition-colors">
                    <td className="py-2.5 px-3 text-mutedGray whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-paper-dark border border-borderCol text-[10px] font-bold text-ink">
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-ink truncate max-w-[200px]" title={evt.path}>
                      {evt.path}
                    </td>
                    <td className="py-2.5 px-3 text-mutedGray whitespace-nowrap">
                      {evt.deviceType} • {evt.os || 'Other'} ({evt.browser || 'Web'})
                    </td>
                    <td className="py-2.5 px-3 text-mutedGray font-mono text-[11px] whitespace-nowrap">
                      {evt.sessionToken.slice(0, 10)}...
                    </td>
                    <td className="py-2.5 px-3 text-mutedGray whitespace-nowrap">
                      {evt.userId ? (
                        <span className="text-warm-dark font-bold">User #{evt.userId.slice(0, 6)}</span>
                      ) : (
                        <span className="text-mutedGray/60">Anonymous</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAnalyticsTab;
