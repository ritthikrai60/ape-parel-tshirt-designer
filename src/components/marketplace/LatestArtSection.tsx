'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Clock, Zap } from 'lucide-react';
import { ArtworkCard, MarketplaceArtworkDTO } from './ArtworkCard';

interface LatestArtSectionProps {
  artworks: MarketplaceArtworkDTO[];
  onPreview?: (artwork: MarketplaceArtworkDTO) => void;
}

export const LatestArtSection: React.FC<LatestArtSectionProps> = ({
  artworks,
  onPreview,
}) => {
  if (!artworks || artworks.length === 0) return null;

  // Display top 8 freshest artworks
  const displayedArtworks = artworks.slice(0, 8);

  return (
    <section className="w-full bg-paper border-b border-borderCol py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </span>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-emerald-600">
                Fresh Off The Press &bull; Just Dropped
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h2 className="font-sans font-black text-2xl sm:text-3xl text-ink tracking-tight">
                Latest Art (มาใหม่ล่าสุด)
              </h2>
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                New Arrivals
              </span>
            </div>

            <p className="font-mono text-xs text-mutedGray mt-1 max-w-xl">
              งานออกแบบกราฟิกล่าสุดที่ศิลปินเพิ่งอัปโหลดเข้าสู่ระบบ พร้อมให้คุณนำไปปรับแต่งและสกรีนบนเสื้อผ้าได้ทันที
            </p>
          </div>

          <a
            href="#catalog"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-ink hover:text-warm-dark transition-colors self-start sm:self-auto border-b border-ink/30 pb-0.5 hover:border-warm-dark"
          >
            <span>Explore All in Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 4-column Grid of Latest Artworks */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {displayedArtworks.map((art) => (
            <div key={art.id} className="relative group/latest">
              {/* Relative "NEW" indicator tag */}
              <div className="absolute top-2 left-2 z-20 pointer-events-none">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[8px] font-black uppercase tracking-wider shadow-md">
                  <Zap className="w-2 h-2 fill-current" />
                  <span>NEW</span>
                </span>
              </div>

              <ArtworkCard
                artwork={art}
                onPreview={onPreview}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestArtSection;
