'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import { MarketplaceArtworkDTO } from './ArtworkCard';

interface CreatorInfo {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  bio?: string | null;
  artworkCount: number;
  previewArtworks: MarketplaceArtworkDTO[];
}

interface CreatorSpotlightProps {
  artworks: MarketplaceArtworkDTO[];
}

export const CreatorSpotlight: React.FC<CreatorSpotlightProps> = ({ artworks }) => {
  // Group artworks by creator
  const creatorsMap = new Map<string, CreatorInfo>();
  for (const art of artworks) {
    const existing = creatorsMap.get(art.creator.id);
    if (existing) {
      existing.artworkCount += 1;
      if (existing.previewArtworks.length < 3) {
        existing.previewArtworks.push(art);
      }
    } else {
      creatorsMap.set(art.creator.id, {
        ...art.creator,
        artworkCount: 1,
        previewArtworks: [art],
      });
    }
  }

  const creators = Array.from(creatorsMap.values()).slice(0, 4);

  if (creators.length === 0) return null;

  return (
    <section className="w-full bg-paper border-b border-borderCol py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-warm-dark" />
            <h2 className="font-sans font-black text-xl text-ink tracking-tight">Creator Spotlight</h2>
          </div>
          <Link
            href="/creators"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-mutedGray hover:text-ink transition-colors"
          >
            All Creators <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Creator Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              href={`/creators/${creator.slug}`}
              className="group block bg-paper-light border border-borderCol rounded-xl overflow-hidden hover:border-ink/60 hover:shadow-lg transition-all duration-200"
            >
              {/* Preview Strip — 3 small artworks */}
              <div className="grid grid-cols-3 bg-[#131718] h-28 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
                {creator.previewArtworks.map((art, i) => (
                  <div key={art.id} className="relative flex items-center justify-center p-2 border-r border-white/5 last:border-r-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={art.previewUrl}
                      alt={art.title}
                      className={`max-h-full max-w-full object-contain transition-transform duration-300 ${i === 0 ? 'group-hover:scale-110' : ''}`}
                      loading="lazy"
                    />
                  </div>
                ))}
                {/* Fill remaining slots if < 3 artworks */}
                {Array.from({ length: Math.max(0, 3 - creator.previewArtworks.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center justify-center border-r border-white/5 last:border-r-0">
                    <span className="text-white/20 font-mono text-[10px]">—</span>
                  </div>
                ))}
              </div>

              {/* Creator Info */}
              <div className="p-4 flex items-start gap-3">
                {/* Avatar */}
                {creator.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-borderCol bg-paper-dark flex-none"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-ink text-paper font-mono font-bold text-sm flex items-center justify-center flex-none">
                    {creator.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-bold text-sm text-ink group-hover:text-warm-dark transition-colors line-clamp-1">
                    {creator.displayName}
                  </p>
                  <p className="font-mono text-[10px] text-mutedGray mb-1">@{creator.slug}</p>
                  <span className="font-mono text-[10px] text-ink/50 bg-paper border border-borderCol px-2 py-0.5 rounded-full">
                    {creator.artworkCount} artwork{creator.artworkCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CreatorSpotlight;
