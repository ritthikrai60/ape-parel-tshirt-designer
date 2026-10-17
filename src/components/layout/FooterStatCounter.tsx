'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Eye } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

interface StatsData {
  totalVisits: number;
  todayVisits: number;
  status: string;
}

export const FooterStatCounter: React.FC = () => {
  const { locale } = useSettings();
  const [stats, setStats] = useState<StatsData>({
    totalVisits: 0,
    todayVisits: 0,
    status: 'ONLINE',
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/analytics/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then((data: StatsData) => {
        if (isMounted && typeof data.totalVisits === 'number') {
          setStats(data);
          setIsLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      data-testid="footer-stat-counter"
      className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-paper-light border border-borderCol/80 font-mono text-[11px] text-ink shadow-2xs hover:border-ink/40 transition-colors"
      title="Live Anonymized Platform Telemetry • PDPA Compliant"
    >
      {/* Live Indicator */}
      <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] uppercase tracking-wider">
          {locale === 'th' ? 'สถิติสด' : 'Live'}
        </span>
      </div>

      <div className="h-3 w-px bg-borderCol/80" />

      {/* Total Visits */}
      <div className="flex items-center gap-1">
        <span className="text-mutedGray text-[10px] uppercase tracking-wider">
          {locale === 'th' ? 'ผู้เข้าชม:' : 'Visits:'}
        </span>
        <span className="font-black text-ink">
          {stats.totalVisits.toLocaleString()}
        </span>
      </div>

      <div className="h-3 w-px bg-borderCol/80" />

      {/* Today Visits */}
      <div className="flex items-center gap-1">
        <span className="text-mutedGray text-[10px] uppercase tracking-wider">
          {locale === 'th' ? 'วันนี้:' : 'Today:'}
        </span>
        <span className="font-bold text-warm-dark">
          +{stats.todayVisits.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default FooterStatCounter;
