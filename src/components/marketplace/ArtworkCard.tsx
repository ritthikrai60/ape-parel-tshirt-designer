'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Eye, Star, Heart, Crown, Shirt } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  FabricColor,
  FABRICS,
  getRecommendedFabric,
  TShirtSilhouette,
  FabricSwatchPicker,
} from './fabricUtils';

export interface MarketplaceArtworkDTO {
  id: string;
  title: string;
  description: string | null;
  category: 'ILLUSTRATION' | 'MASCOT' | 'TYPOGRAPHY' | 'PATTERN' | 'LOGO' | string;
  previewUrl: string;
  mimeType: string;
  tags: string | null;
  createdAt: string;
  creator: {
    id: string;
    displayName: string;
    slug: string;
    avatarUrl: string | null;
    bio?: string | null;
  };
  baseLicensePrice: number;
  licenseOptions: Array<{
    id: string;
    name: string;
    price: number;
    commercialUse?: boolean;
    scope?: string;
    terms?: string | null;
  }>;
  averageRating?: number;
  reviewCount?: number;
  favoriteCount?: number;
  isFavorited?: boolean;
  isPermanentIp?: boolean;
}

interface ArtworkCardProps {
  artwork: MarketplaceArtworkDTO;
  onPreview?: (artwork: MarketplaceArtworkDTO) => void;
  isBookmarked?: boolean;
  onBookmark?: (id: string) => void;
  currentUserId?: string;
}

const CATEGORY_STYLES: Record<string, { label: string; badgeClass: string }> = {
  ILLUSTRATION: { label: 'Illustration', badgeClass: 'bg-warm/30 text-ink border-warm/50' },
  MASCOT: { label: 'Mascot', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  TYPOGRAPHY: { label: 'Typography', badgeClass: 'bg-zinc-200 text-zinc-900 border-zinc-400' },
  PATTERN: { label: 'Pattern', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  LOGO: { label: 'Logo', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
};

export const ArtworkCard: React.FC<ArtworkCardProps> = ({
  artwork,
  onPreview,
  isBookmarked = false,
  onBookmark,
}) => {
  const { formatPrice, t } = useSettings();
  const [hovered, setHovered] = useState(false);
  const [bookmarked, setBookmarked] = useState(isBookmarked || !!artwork.isFavorited);
  const [likesCount, setLikesCount] = useState(artwork.favoriteCount || 0);
  const [imgError, setImgError] = useState(false);
  const [fabric, setFabric] = useState<FabricColor>(() =>
    getRecommendedFabric(artwork.title, artwork.tags)
  );

  const activeFabric = FABRICS[fabric];
  const normalizedCategory = (artwork.category || 'ILLUSTRATION').toUpperCase();
  const categoryInfo = CATEGORY_STYLES[normalizedCategory] || {
    label: artwork.category,
    badgeClass: 'bg-paper-dark text-ink border-borderCol',
  };

  const parsedTags = artwork.tags
    ? artwork.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next);
    setLikesCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
    onBookmark?.(artwork.id);

    try {
      await fetch(`/api/artworks/${artwork.id}/favorite`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPreview?.(artwork);
  };

  return (
    <div
      data-testid={`artwork-card-${artwork.id}`}
      className="group relative flex flex-col bg-paper-light border border-borderCol rounded-xl overflow-hidden hover:border-ink/60 hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Artwork Preview (3:4 aspect) ── */}
      <div
        className={`relative w-full ${activeFabric.bgClass} overflow-hidden transition-colors duration-300`}
        style={{ aspectRatio: '3/4' }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: `radial-gradient(${activeFabric.isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* T-Shirt Silhouette Outline */}
        <div className="absolute inset-2 flex items-center justify-center pointer-events-none opacity-40 transition-opacity duration-300">
          <TShirtSilhouette strokeColor={activeFabric.strokeColor} />
        </div>

        {/* Artwork image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgError ? `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(artwork.title)}&backgroundColor=222729` : artwork.previewUrl}
          alt={artwork.title}
          onError={() => setImgError(true)}
          className={`relative w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-105 ${
            activeFabric.isDark
              ? 'drop-shadow-[0_4px_16px_rgba(255,255,255,0.16)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]'
              : 'drop-shadow-[0_4px_16px_rgba(0,0,0,0.18)]'
          }`}
          loading="lazy"
        />

        {/* Top-left: Category badge + Permanent IP owned tag */}
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1">
          <span className={`font-mono text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${categoryInfo.badgeClass}`}>
            {categoryInfo.label}
          </span>
          {artwork.isPermanentIp && (
            <span className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-amber-950 font-black border border-amber-500 shadow-xs">
              <Crown className="w-2.5 h-2.5" />
              <span>Owned ฿0</span>
            </span>
          )}
        </div>

        {/* Top-right: Royalty Auth + Wishlist Heart */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded bg-ink/80 text-paper border border-white/10 backdrop-blur-sm">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>Royalty Auth</span>
          </div>

          <button
            onClick={handleBookmark}
            aria-label={bookmarked ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`px-2 py-1 rounded-full flex items-center gap-1 text-[10px] font-mono font-bold transition-all ${
              bookmarked
                ? 'bg-rose-500 text-white shadow-sm border border-rose-400'
                : 'bg-ink/60 text-paper/80 hover:bg-ink/90 hover:text-paper border border-white/10'
            } backdrop-blur-sm`}
            title={bookmarked ? 'Wishlisted' : 'Add to Wishlist'}
          >
            <Heart className={`w-3 h-3 ${bookmarked ? 'fill-current' : ''}`} />
            {likesCount > 0 && <span>{likesCount}</span>}
          </button>
        </div>

        {/* Bottom-left: Mini Fabric Switcher */}
        <div className="absolute bottom-3 left-3 z-10 opacity-80 group-hover:opacity-100 transition-opacity">
          <FabricSwatchPicker current={fabric} onChange={setFabric} />
        </div>

        {/* ── Hover Overlay: Slide-up panel ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-paper/95 backdrop-blur-sm border-t border-borderCol p-4 transition-all duration-300 ease-out ${
            hovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          {/* Creator row */}
          <div className="flex items-center gap-2 mb-3">
            {artwork.creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artwork.creator.avatarUrl}
                alt={artwork.creator.displayName}
                className="w-6 h-6 rounded-full object-cover border border-borderCol"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-ink text-paper font-mono text-[10px] flex items-center justify-center">
                {artwork.creator.displayName.charAt(0)}
              </div>
            )}
            <span className="font-mono text-[10px] text-mutedGray">@{artwork.creator.slug}</span>
          </div>

          {/* Price + CTAs */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-wider text-mutedGray">{t.marketplace.price}</span>
              {artwork.isPermanentIp ? (
                <span className="font-mono text-sm font-black text-amber-700 flex items-center gap-1">
                  ฿0
                  <span className="text-[8px] bg-amber-100 border border-amber-300 text-amber-900 px-1 py-0.2 rounded font-mono font-bold">
                    OWNED
                  </span>
                </span>
              ) : (
                <span className="font-mono text-sm font-black text-ink">
                  {formatPrice(artwork.baseLicensePrice)}
                  <span className="text-[10px] font-normal text-mutedGray"> / unit</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {onPreview && (
                <button
                  onClick={handlePreview}
                  aria-label="Quick preview"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-borderCol bg-paper hover:bg-paper-dark transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-ink" />
                </button>
              )}
              <Link
                href={`/studio/new?artworkId=${encodeURIComponent(artwork.id)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-ink-light transition-colors shadow-sm"
              >
                {t.nav.customize} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Footer (always visible) ── */}
      <div className="px-4 py-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1">
          <h3 className="font-sans font-bold text-sm text-ink group-hover:text-warm-dark transition-colors line-clamp-1">
            {artwork.title}
          </h3>
          {artwork.averageRating !== undefined && artwork.averageRating > 0 && (
            <div className="flex items-center gap-0.5 font-mono text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              <span>{artwork.averageRating.toFixed(1)}</span>
              {artwork.reviewCount !== undefined && artwork.reviewCount > 0 && (
                <span className="text-[9px] text-mutedGray font-normal">({artwork.reviewCount})</span>
              )}
            </div>
          )}
        </div>
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {parsedTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] text-mutedGray bg-paper px-1.5 py-0.5 rounded border border-borderCol"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtworkCard;
