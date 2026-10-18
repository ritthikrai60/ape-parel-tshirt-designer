'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Flame,
  Star,
  Sparkles,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { MarketplaceArtworkDTO } from './ArtworkCard';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  FabricColor,
  FABRICS,
  getRecommendedFabric,
  TShirtSilhouette,
  FabricSwatchPicker,
} from './fabricUtils';

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

// Internal lively card component with isolated fabric preview state
const TrendingCard: React.FC<{ artwork: MarketplaceArtworkDTO; index: number }> = ({
  artwork,
  index,
}) => {
  const { formatPrice } = useSettings();
  const [imgError, setImgError] = useState(false);
  const [fabric, setFabric] = useState<FabricColor>(() =>
    getRecommendedFabric(artwork.title, artwork.tags)
  );

  const activeFabric = FABRICS[fabric];
  const cat = (artwork.category || 'ILLUSTRATION').toUpperCase();
  const badgeCls = CATEGORY_BADGE[cat] || 'bg-paper-dark text-ink border-borderCol';

  // Dynamic ranking badges with visual energy
  const renderRankBadge = () => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-md animate-pulse">
          <Crown className="w-2.5 h-2.5" />
          <span>#1 HOT DROP</span>
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm">
          <Flame className="w-2.5 h-2.5 fill-current" />
          <span>#2 TRENDING</span>
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm">
          <Sparkles className="w-2.5 h-2.5" />
          <span>#3 RISING</span>
        </span>
      );
    }
    return (
      <span className="font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-paper border border-borderCol text-mutedGray">
        #{index + 1}
      </span>
    );
  };

  // Simulated live prints velocity for realism (based on hash of artwork id)
  const simulatedPrints = 45 + (artwork.id.charCodeAt(artwork.id.length - 1) % 90);

  return (
    <div
      className={`group relative bg-paper border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer ${
        index === 0
          ? 'border-orange-300/80 ring-1 ring-orange-300/30'
          : 'border-borderCol hover:border-ink/60'
      }`}
    >
      {/* ── Artwork Visual Showcase ── */}
      <div
        className={`relative aspect-square ${activeFabric.bgClass} flex items-center justify-center overflow-hidden p-5 transition-colors duration-300`}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.09] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${activeFabric.isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* T-Shirt Silhouette Contour */}
        <div className="absolute inset-3 flex items-center justify-center pointer-events-none opacity-40 transition-opacity duration-300">
          <TShirtSilhouette strokeColor={activeFabric.strokeColor} />
        </div>

        {/* Artwork Graphic */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            imgError
              ? `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(artwork.title)}&backgroundColor=222729`
              : artwork.previewUrl
          }
          alt={artwork.title}
          onError={() => setImgError(true)}
          className={`relative max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300 ${
            activeFabric.isDark
              ? 'drop-shadow-[0_4px_16px_rgba(255,255,255,0.18)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]'
              : 'drop-shadow-[0_4px_16px_rgba(0,0,0,0.18)]'
          }`}
          loading="lazy"
        />

        {/* Top-Left: Rank Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {renderRankBadge()}
        </div>

        {/* Top-Right: Category Badge */}
        <span
          className={`absolute top-2.5 right-2.5 font-mono text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${badgeCls}`}
        >
          {cat.charAt(0) + cat.slice(1).toLowerCase()}
        </span>

        {/* Bottom-Right: Mini Fabric Switcher */}
        <div className="absolute bottom-2.5 right-2.5 z-10 opacity-75 group-hover:opacity-100 transition-opacity">
          <FabricSwatchPicker current={fabric} onChange={setFabric} size="sm" />
        </div>
      </div>

      {/* ── Info & Actions ── */}
      <div className="p-3.5 space-y-2.5 bg-paper">
        {/* Creator Info & Live Stats */}
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
          <div className="flex items-center space-x-1.5 min-w-0">
            {artwork.creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artwork.creator.avatarUrl}
                alt={artwork.creator.displayName}
                className="w-4 h-4 rounded-full object-cover border border-borderCol shrink-0"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-ink text-paper text-[8px] flex items-center justify-center shrink-0">
                {artwork.creator.displayName.charAt(0)}
              </div>
            )}
            <span className="text-mutedGray truncate">@{artwork.creator.slug}</span>
            <CheckCircle2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />
          </div>

          <div className="flex items-center gap-1 text-orange-600 font-bold shrink-0">
            <Flame className="w-3 h-3 fill-orange-500" />
            <span>{simulatedPrints}+ ordered</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-sans font-bold text-sm text-ink line-clamp-1 group-hover:text-warm-dark transition-colors">
          {artwork.title}
        </h3>

        {/* Price & Action Button */}
        <div className="flex items-center justify-between pt-1 border-t border-borderCol/60">
          <div>
            <span className="font-mono text-sm font-black text-ink">
              {formatPrice(artwork.baseLicensePrice)}
            </span>
            <span className="font-mono text-[9px] text-mutedGray"> /unit</span>
          </div>

          <Link
            href={`/studio/new?artworkId=${encodeURIComponent(artwork.id)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-ink-light transition-all shadow-xs group-hover:shadow-md group-hover:bg-warm-dark"
          >
            <span>Customize</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ artworks }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (artworks.length === 0) return null;

  return (
    <section className="w-full bg-paper-light border-b border-borderCol py-12 relative overflow-hidden">
      {/* Background Decorative Accent Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-warm/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Section Header with Live Status ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-md bg-orange-500/10 text-orange-600 border border-orange-500/20">
                <Flame className="w-4 h-4 fill-orange-500 animate-pulse" />
              </span>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-orange-600">
                Real-Time Demand &bull; Curated Drops
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h2 className="font-sans font-black text-2xl sm:text-3xl text-ink tracking-tight">
                Trending Drops
              </h2>
              <span className="font-mono text-xs uppercase tracking-wider text-ink/70 bg-paper border border-borderCol px-2.5 py-0.5 rounded-full shadow-xs">
                {artworks.length} hot picks
              </span>
            </div>

            <p className="font-mono text-xs text-mutedGray mt-1 max-w-xl">
              Streetwear badges, typography, and simian mascots surging in customer orders this week. Switch garment fabrics live below.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => scroll('left')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-borderCol bg-paper hover:bg-paper-dark hover:border-ink/50 transition-all shadow-xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-ink" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-borderCol bg-paper hover:bg-paper-dark hover:border-ink/50 transition-all shadow-xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-ink" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Track ── */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {artworks.map((artwork, idx) => (
            <div
              key={artwork.id}
              className="flex-none w-64 sm:w-72 scroll-snap-start"
              style={{ scrollSnapAlign: 'start' }}
            >
              <TrendingCard artwork={artwork} index={idx} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
