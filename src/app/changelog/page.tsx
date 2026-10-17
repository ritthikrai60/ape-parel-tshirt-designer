'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  Sparkles,
  ShieldCheck,
  Palette,
  Zap,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, APP_CODENAME, CHANGELOG_DATA, ReleaseMilestone } from '@/lib/version';

type CategoryFilter = 'all' | 'feat' | 'security' | 'ui' | 'perf';

export default function ChangelogPage() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  const getTagBadge = (type: string) => {
    switch (type) {
      case 'feat':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            Feature
          </span>
        );
      case 'security':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">
            Security & Escrow
          </span>
        );
      case 'ui':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-800 border border-purple-300">
            3D Studio & UI
          </span>
        );
      case 'perf':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
            Performance
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-100 text-gray-800 border border-gray-300">
            Fix
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Header */}
      <section className="border-b border-borderCol bg-paper-dark/20 py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center space-x-2">
            <Link
              href="/about"
              className="inline-flex items-center space-x-1.5 text-xs font-mono text-mutedGray hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>About APE-PAREL</span>
            </Link>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-warm" />
            <span>Changelog & System Releases</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight font-mono text-ink">
            Platform Release Milestones
          </h1>

          <p className="text-sm text-mutedGray font-sans leading-relaxed max-w-2xl">
            A comprehensive record of architectural evolutions, feature rollouts, security governance,
            and 3D rendering enhancements across APE-PAREL.
          </p>

          {/* Current Production Banner */}
          <div className="mt-4 p-4 rounded-xl border border-warm/60 bg-warm/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <div>
                <span className="font-bold text-ink">Active Production Version: </span>
                <span className="px-2 py-0.5 rounded bg-ink text-paper font-bold ml-1">{APP_VERSION}</span>
                <span className="text-mutedGray ml-2">({APP_CODENAME})</span>
              </div>
            </div>
            <span className="text-mutedGray text-[11px]">Last Deployed: {APP_BUILD_DATE}</span>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="sticky top-16 z-40 bg-paper/95 backdrop-blur border-b border-borderCol py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-mutedGray">
            <Filter className="w-3.5 h-3.5 text-warm-dark" />
            <span className="uppercase tracking-wider">Filter Changes:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {(
              [
                { id: 'all', label: 'All Updates' },
                { id: 'feat', label: 'Features' },
                { id: 'security', label: 'Security & Escrow' },
                { id: 'ui', label: '3D Studio & UI' },
                { id: 'perf', label: 'Performance' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-ink text-paper font-bold shadow-2xs'
                    : 'text-mutedGray hover:text-ink hover:bg-paper-dark border border-borderCol/60'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Entries */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative border-l-2 border-borderCol pl-6 sm:pl-8 space-y-12">
          {CHANGELOG_DATA.map((milestone: ReleaseMilestone) => {
            const filteredChanges =
              activeFilter === 'all'
                ? milestone.changes
                : milestone.changes.filter((c) => c.type === activeFilter);

            if (filteredChanges.length === 0 && activeFilter !== 'all') {
              return null;
            }

            return (
              <div key={milestone.version} className="relative group">
                {/* Timeline Pin Dot */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 bg-paper transition-colors ${
                    milestone.isLatest
                      ? 'border-emerald-600 ring-4 ring-emerald-500/20'
                      : 'border-borderCol group-hover:border-ink'
                  }`}
                />

                <div className="space-y-4">
                  {/* Version & Date Header */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-lg font-black uppercase px-2.5 py-0.5 rounded bg-ink text-paper tracking-tight">
                      {milestone.version}
                    </span>

                    {milestone.highlightBadge && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-warm text-ink border border-warm-dark/30">
                        {milestone.highlightBadge}
                      </span>
                    )}

                    <span className="font-mono text-xs text-mutedGray">
                      {milestone.date}
                    </span>

                    <span className="font-mono text-xs font-semibold text-ink/70">
                      // {milestone.codename}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-ink/80 font-sans leading-relaxed">
                    {milestone.summary}
                  </p>

                  {/* Changes List */}
                  <div className="space-y-3 pt-2">
                    {filteredChanges.map((change, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3.5 rounded-lg border border-borderCol/70 bg-paper-dark/20 space-y-1.5 hover:border-borderCol transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <span className="text-xs font-mono font-bold text-ink flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-ink/50" />
                            <span>{change.text}</span>
                          </span>
                          {getTagBadge(change.type)}
                        </div>
                        {change.details && (
                          <p className="text-xs text-mutedGray font-sans pl-3.5 leading-relaxed">
                            {change.details}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
