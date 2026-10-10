'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Tag } from 'lucide-react';

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
}

interface ArtworkCardProps {
  artwork: MarketplaceArtworkDTO;
}

const CATEGORY_STYLES: Record<string, { label: string; badgeClass: string }> = {
  ILLUSTRATION: { label: 'Illustration', badgeClass: 'bg-warm/30 text-ink border-warm/50' },
  MASCOT: { label: 'Mascot', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  TYPOGRAPHY: { label: 'Typography', badgeClass: 'bg-zinc-200 text-zinc-900 border-zinc-400' },
  PATTERN: { label: 'Pattern', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  LOGO: { label: 'Logo', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
};

export const ArtworkCard: React.FC<ArtworkCardProps> = ({ artwork }) => {
  const normalizedCategory = (artwork.category || 'ILLUSTRATION').toUpperCase();
  const categoryInfo = CATEGORY_STYLES[normalizedCategory] || {
    label: artwork.category,
    badgeClass: 'bg-paper-dark text-ink border-borderCol',
  };

  const parsedTags = artwork.tags
    ? artwork.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      data-testid={`artwork-card-${artwork.id}`}
      className="group flex flex-col bg-paper-light border border-borderCol rounded-xl overflow-hidden hover:border-ink/50 hover:shadow-lg transition-all duration-200"
    >
      {/* Artwork Preview Area */}
      <div className="relative aspect-square w-full bg-[#131718] p-6 flex items-center justify-center overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.previewUrl}
          alt={artwork.title}
          className="relative max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Category Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className={`font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${categoryInfo.badgeClass}`}
          >
            {categoryInfo.label}
          </span>
        </div>

        {/* Royalty Protection Badge */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-ink/80 text-paper border border-borderCol/20 backdrop-blur">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Royalty Auth</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3 className="font-sans font-bold text-base text-ink group-hover:text-warm-dark transition-colors line-clamp-1 mb-1">
            {artwork.title}
          </h3>

          {/* Creator Attribution */}
          <Link
            href={`/creators/${artwork.creator.slug}`}
            className="inline-flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
          >
            {artwork.creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artwork.creator.avatarUrl}
                alt={artwork.creator.displayName}
                className="w-5 h-5 rounded-full object-cover border border-borderCol bg-paper-dark"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-ink text-paper font-mono text-[10px] flex items-center justify-center">
                {artwork.creator.displayName.charAt(0)}
              </div>
            )}
            <span className="font-mono text-xs text-mutedGray hover:text-ink transition-colors">
              @{artwork.creator.slug}
            </span>
          </Link>

          {/* Tags */}
          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {parsedTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] text-mutedGray bg-paper px-1.5 py-0.5 rounded border border-borderCol"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pricing & Customize CTA */}
        <div className="pt-3 border-t border-borderCol flex items-center justify-between mt-auto">
          <div>
            <span className="block font-mono text-[10px] uppercase text-mutedGray tracking-wider">
              License From
            </span>
            <span className="font-mono text-sm font-bold text-ink">
              ฿{artwork.baseLicensePrice}{' '}
              <span className="text-[10px] font-normal text-mutedGray">/ unit</span>
            </span>
          </div>

          <Link
            href={`/studio/new?artworkId=${encodeURIComponent(artwork.id)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-ink-light transition-colors shadow-sm"
          >
            <span>Customize</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArtworkCard;
