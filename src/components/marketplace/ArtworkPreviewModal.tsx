'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, ArrowRight, ShieldCheck, Tag, Bookmark } from 'lucide-react';
import { MarketplaceArtworkDTO } from './ArtworkCard';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  FabricColor,
  FABRICS,
  getRecommendedFabric,
  TShirtSilhouette,
  FabricSwatchPicker,
} from './fabricUtils';

interface ArtworkPreviewModalProps {
  artwork: MarketplaceArtworkDTO;
  onClose: () => void;
  isBookmarked?: boolean;
  onBookmark?: (id: string) => void;
}

const CATEGORY_STYLES: Record<string, { label: string; badgeClass: string }> = {
  ILLUSTRATION: { label: 'Illustration', badgeClass: 'bg-warm/30 text-ink border-warm/50' },
  MASCOT: { label: 'Mascot', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  TYPOGRAPHY: { label: 'Typography', badgeClass: 'bg-zinc-200 text-zinc-900 border-zinc-400' },
  PATTERN: { label: 'Pattern', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  LOGO: { label: 'Logo', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
};

export const ArtworkPreviewModal: React.FC<ArtworkPreviewModalProps> = ({
  artwork,
  onClose,
  isBookmarked = false,
  onBookmark,
}) => {
  const { formatPrice, t } = useSettings();
  const [imgError, setImgError] = React.useState(false);
  const [fabric, setFabric] = React.useState<FabricColor>(() =>
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

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${artwork.title}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-3xl bg-paper rounded-2xl overflow-hidden shadow-2xl border border-borderCol flex flex-col md:flex-row max-h-[90vh]">
        {/* Left: Artwork Preview */}
        <div
          className={`relative w-full md:w-[45%] ${activeFabric.bgClass} flex items-center justify-center p-10 flex-none transition-colors duration-300 overflow-hidden`}
        >
          {/* Fabric grid */}
          <div
            className="absolute inset-0 opacity-[0.09] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(${activeFabric.isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          />

          {/* T-Shirt Silhouette */}
          <div className="absolute inset-4 flex items-center justify-center pointer-events-none opacity-40 transition-opacity">
            <TShirtSilhouette strokeColor={activeFabric.strokeColor} />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              imgError
                ? `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(artwork.title)}&backgroundColor=222729`
                : artwork.previewUrl
            }
            alt={artwork.title}
            onError={() => setImgError(true)}
            className={`relative max-h-72 max-w-full object-contain transition-all duration-300 ${
              activeFabric.isDark
                ? 'drop-shadow-[0_8px_24px_rgba(255,255,255,0.18)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]'
                : 'drop-shadow-[0_8px_24px_rgba(0,0,0,0.18)]'
            }`}
          />

          {/* Category badge */}
          <span className={`absolute top-3 left-3 font-mono text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${categoryInfo.badgeClass}`}>
            {categoryInfo.label}
          </span>

          {/* Fabric Switcher in Modal */}
          <div className="absolute bottom-3 left-3 z-10">
            <FabricSwatchPicker current={fabric} onChange={setFabric} size="sm" />
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-borderCol">
            <div className="flex-1 min-w-0 pr-3">
              <h2 className="font-sans font-black text-xl text-ink leading-tight mb-1">
                {artwork.title}
              </h2>
              <div className="flex items-center gap-1.5 font-mono text-xs text-mutedGray">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Royalty-Authorized Design
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-borderCol bg-paper hover:bg-paper-dark transition-colors flex-none"
              aria-label="Close preview"
            >
              <X className="w-4 h-4 text-ink" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 flex flex-col gap-5">
            {/* Creator */}
            <div className="flex items-center gap-3">
              {artwork.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artwork.creator.avatarUrl}
                  alt={artwork.creator.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-borderCol"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-ink text-paper font-mono font-bold text-sm flex items-center justify-center">
                  {artwork.creator.displayName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-sans font-bold text-sm text-ink">{artwork.creator.displayName}</p>
                <p className="font-mono text-[10px] text-mutedGray">@{artwork.creator.slug}</p>
              </div>
              <Link
                href={`/creators/${artwork.creator.slug}`}
                onClick={onClose}
                className="ml-auto font-mono text-[10px] uppercase tracking-wider text-warm-dark hover:underline"
              >
                View Profile →
              </Link>
            </div>

            {/* Description */}
            {artwork.description && (
              <p className="font-sans text-sm text-ink/70 leading-relaxed">
                {artwork.description}
              </p>
            )}

            {/* Tags */}
            {parsedTags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-mutedGray mb-2">
                  <Tag className="w-3 h-3" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] text-mutedGray bg-paper-dark px-2 py-0.5 rounded-full border border-borderCol"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* License Options */}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-mutedGray mb-2">Creator License Options</p>
              <div className="flex flex-col gap-2">
                {artwork.licenseOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-paper-dark border border-borderCol gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-sans font-semibold text-sm text-ink">{opt.name}</p>
                        {opt.commercialUse && (
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                            Commercial
                          </span>
                        )}
                      </div>
                      {opt.scope && (
                        <p className="font-mono text-[10px] text-mutedGray">{opt.scope}</p>
                      )}
                      {opt.terms && (
                        <p className="font-sans text-[11px] text-warm-dark/90 leading-tight pt-0.5">
                          &bull; {opt.terms}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-ink shrink-0">{formatPrice(opt.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="p-6 border-t border-borderCol flex items-center gap-3">
            {onBookmark && (
              <button
                onClick={() => onBookmark(artwork.id)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                  isBookmarked
                    ? 'bg-warm text-ink border-warm'
                    : 'bg-paper border-borderCol text-ink hover:border-ink/50'
                }`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
            <Link
              href={`/studio/new?artworkId=${encodeURIComponent(artwork.id)}`}
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink text-paper font-mono text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-ink-light transition-colors shadow-sm"
            >
              {t.marketplace.applyToStudio || 'Customize This Design'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtworkPreviewModal;
