'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, CHANGELOG_DATA, ReleaseMilestone } from '@/lib/version';

type CategoryFilter = 'all' | 'feat' | 'security' | 'ui' | 'perf';

export default function ChangelogPage() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  const getTagBadge = (type: string) => {
    switch (type) {
      case 'feat':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            ฟีเจอร์ใหม่
          </span>
        );
      case 'security':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
            ความปลอดภัย
          </span>
        );
      case 'ui':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-800 border border-purple-300">
            หน้าจอและ 3D
          </span>
        );
      case 'perf':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
            ความเร็ว
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-100 text-gray-800 border border-gray-300">
            แก้ไขข้อผิดพลาด
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Header */}
      <section className="border-b border-borderCol bg-paper-dark/20 py-12 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center space-x-2">
            <Link
              href="/about"
              className="inline-flex items-center space-x-1.5 text-xs font-mono text-mutedGray hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>เกี่ยวกับ APE-PAREL</span>
            </Link>
          </div>

          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            <span>ประวัติการอัปเดตระบบ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-mono text-ink">
            บันทึกเวอร์ชันและรายการปรับปรุง (Release Notes)
          </h1>

          <p className="text-xs sm:text-sm text-mutedGray font-sans leading-relaxed max-w-2xl">
            สรุปรายการฟีเจอร์ใหม่ การปรับปรุงหน้าจอ และการแก้ไขข้อผิดพลาดในแต่ละเวอร์ชัน
          </p>

          {/* Current Version Bar */}
          <div className="mt-3 p-3 rounded-lg border border-borderCol bg-paper flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-mutedGray">เวอร์ชันปัจจุบัน:</span>
              <span className="px-2 py-0.5 rounded bg-ink text-paper font-bold">{APP_VERSION}</span>
            </div>
            <span className="text-mutedGray text-[11px]">อัปเดตล่าสุด: {APP_BUILD_DATE}</span>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="sticky top-16 z-40 bg-paper/95 backdrop-blur border-b border-borderCol py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-mutedGray">
            <Filter className="w-3.5 h-3.5 text-mutedGray" />
            <span className="uppercase tracking-wider text-[11px]">แสดงตามหมวด:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'feat', label: 'ฟีเจอร์ใหม่' },
                { id: 'ui', label: 'หน้าจอ & 3D' },
                { id: 'security', label: 'ความปลอดภัย' },
                { id: 'perf', label: 'ความเร็ว' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
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
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="relative border-l border-borderCol pl-5 sm:pl-7 space-y-10">
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
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[27px] sm:-left-[35px] top-1.5 w-3.5 h-3.5 rounded-full border bg-paper ${
                    milestone.isLatest
                      ? 'border-ink bg-ink'
                      : 'border-borderCol'
                  }`}
                />

                <div className="space-y-3">
                  {/* Version & Date Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold uppercase px-2 py-0.5 rounded bg-ink text-paper">
                      {milestone.version}
                    </span>

                    {milestone.highlightBadge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-warm/30 text-ink border border-warm-dark/20">
                        {milestone.highlightBadge}
                      </span>
                    )}

                    <span className="font-mono text-xs text-mutedGray">
                      {milestone.date}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-ink/80 font-sans leading-relaxed">
                    {milestone.summary}
                  </p>

                  {/* Changes List */}
                  <div className="space-y-2 pt-1">
                    {filteredChanges.map((change, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 rounded-lg border border-borderCol/60 bg-paper-dark/10 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-ink flex items-center space-x-1.5">
                            <span className="w-1 h-1 rounded-full bg-ink/40" />
                            <span>{change.text}</span>
                          </span>
                          {getTagBadge(change.type)}
                        </div>
                        {change.details && (
                          <p className="text-[11px] text-mutedGray font-sans pl-2.5 leading-relaxed">
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
