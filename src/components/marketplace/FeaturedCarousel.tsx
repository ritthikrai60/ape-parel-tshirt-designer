'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, TrendingUp } from 'lucide-react';
import { MarketplaceArtworkDTO } from './ArtworkCard';
import { useSettings } from '@/components/providers/SettingsProvider';

interface FeaturedCarouselProps {
  artworks: MarketplaceArtworkDTO[];
}

const CATEGORY_BADGE: Record<string, string> = {
  ILLUSTRATION: 'bg-warm/30 text-ink border-warm/50',
  MASCOT: 'bg-amber-100 text-amber-900 border-amber-300',
  TYPOGRAPHY: 'bg-zinc-200 text-zinc-900 border-zinc-400',
  PATTERN: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  LOGO: 'bg-blue-100 text-blue-900 border-blue-300',
};

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ artworks }) => {
  const { formatPrice } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (artworks.length === 0) return null;

  return (
    <section className="w-full bg-paper-light border-b border-borderCol py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-warm-dark" />
            <h2 className="font-sans font-black text-xl text-ink tracking-tight">Trending Now</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-mutedGray bg-paper border border-borderCol px-2 py-0.5 rounded-full">
              {artworks.length} picks
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-borderCol bg-paper hover:bg-paper-dark hover:border-ink/50 transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-ink" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-borderCol bg-paper hover:bg-paper-dark hover:border-ink/50 transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-ink" />
            </button>
          </div>
        </div>

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-none scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {artworks.map((artwork) => {
            const cat = (artwork.category || 'ILLUSTRATION').toUpperCase();
            const badgeCls = CATEGORY_BADGE[cat] || 'bg-paper-dark text-ink border-borderCol';
            return (
              <div
                key={artwork.id}
                className="flex-none w-56 scroll-snap-start"
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Card */}
                <div className="group bg-paper border border-borderCol rounded-xl overflow-hidden hover:border-ink/60 hover:shadow-lg transition-all duration-200 cursor-pointer">
                  {/* Image */}
                  <div className="relative aspect-square bg-[#131718] flex items-center justify-center overflow-hidden p-4">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px]" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artwork.previewUrl}
                      alt={artwork.title}
                      className="relative max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className={`absolute top-2 left-2 font-mono text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${badgeCls}`}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-sans font-bold text-sm text-ink line-clamp-1 mb-0.5 group-hover:text-warm-dark transition-colors">
                      {artwork.title}
                    </h3>
                    <p className="font-mono text-[10px] text-mutedGray mb-2">@{artwork.creator.slug}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-ink">
                        {formatPrice(artwork.baseLicensePrice)}
                        <span className="font-normal text-[10px] text-mutedGray"> /unit</span>
                      </span>
                      <Link
                        href={`/studio/new?artworkId=${encodeURIComponent(artwork.id)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-ink text-paper font-mono text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-ink-light transition-colors"
                      >
                        Use <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
