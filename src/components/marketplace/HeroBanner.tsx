'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Shield, Layers, Sparkles, Users, Shirt } from 'lucide-react';
import { MarketplaceArtworkDTO } from './ArtworkCard';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  FabricColor,
  FABRICS,
  getRecommendedFabric,
  TShirtSilhouette,
  FabricSwatchPicker,
} from './fabricUtils';

export interface DynamicBannerData {
  id?: string;
  title: string;
  subtitle?: string | null;
  badgeText?: string | null;
  ctaText?: string;
  ctaLink?: string;
}

interface HeroBannerProps {
  featuredArtwork?: MarketplaceArtworkDTO | null;
  totalArtworks: number;
  totalCreators: number;
  totalLicenses: number;
  campaignBanner?: DynamicBannerData | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredArtwork,
  totalArtworks,
  totalCreators,
  totalLicenses,
  campaignBanner,
}) => {
  const { formatPrice } = useSettings();
  const [fabric, setFabric] = React.useState<FabricColor>(() =>
    featuredArtwork ? getRecommendedFabric(featuredArtwork.title, featuredArtwork.tags) : 'black'
  );
  const activeFabric = FABRICS[fabric];

  return (
    <section className="relative w-full bg-paper border-b border-borderCol overflow-hidden">
      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[520px] items-center">
          {/* Left: Copy */}
          <div className="py-14 lg:py-20 lg:pr-12 flex flex-col justify-center">
            {/* Label */}
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-warm-dark bg-warm/15 border border-warm/30 px-3 py-1.5 rounded-full mb-6 w-fit">
              <Sparkles className="w-3 h-3" />
              <span>{campaignBanner?.badgeText || 'Independent Creator Catalog'}</span>
            </div>

            {/* Headline */}
            <h1 className="font-sans font-black text-4xl sm:text-5xl lg:text-6xl text-ink tracking-tight leading-[1.05] mb-5">
              {campaignBanner ? (
                <span>{campaignBanner.title}</span>
              ) : (
                <>
                  License Art.
                  <br />
                  <span className="text-warm-dark">Wear It</span>
                  <br />
                  Boldly.
                </>
              )}
            </h1>

            {/* Sub copy */}
            <p className="font-sans text-base sm:text-lg text-ink/70 leading-relaxed max-w-md mb-8">
              {campaignBanner?.subtitle ||
                'Verified artwork from underground creators — production-ready for custom heavyweight apparel. Transparent per-garment royalties, every time.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-10">
              <a
                href={campaignBanner?.ctaLink || '#catalog'}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper font-mono text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-ink-light transition-colors shadow-sm"
              >
                {campaignBanner?.ctaText || 'Browse Catalog'}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/creators"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-transparent text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-lg border border-ink/30 hover:border-ink hover:bg-ink/5 transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                Meet Creators
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink/50 bg-paper-dark border border-borderCol px-2.5 py-1 rounded-md">
                <Shield className="w-3 h-3 text-emerald-600" />
                Auditable Royalty Ledger
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink/50 bg-paper-dark border border-borderCol px-2.5 py-1 rounded-md">
                <Layers className="w-3 h-3 text-warm-dark" />
                Vector &amp; DTG Ready
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink/50 bg-paper-dark border border-borderCol px-2.5 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                1-Click 3D Studio
              </div>
            </div>
          </div>

          {/* Right: Featured Artwork Visual */}
          <div className="relative hidden lg:flex items-center justify-center py-12 pl-8">
            {/* Background accent */}
            <div className="absolute inset-8 bg-ink/4 rounded-2xl border border-borderCol" />

            {/* T-Shirt mockup area */}
            <div className="relative z-10 w-full max-w-sm">
              {/* Mockup frame */}
              <div
                className={`relative ${activeFabric.bgClass} rounded-2xl overflow-hidden shadow-2xl border border-borderCol/60 aspect-[3/4] flex items-center justify-center p-8 transition-colors duration-300`}
              >
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.09] pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(${activeFabric.isDark ? '#ffffff' : '#000000'} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* T-Shirt Silhouette */}
                <div className="absolute inset-4 flex items-center justify-center pointer-events-none opacity-45 transition-opacity">
                  <TShirtSilhouette strokeColor={activeFabric.strokeColor} />
                </div>

                {featuredArtwork ? (
                  <div className="relative flex flex-col items-center gap-4 w-full h-full justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredArtwork.previewUrl}
                      alt={featuredArtwork.title}
                      className={`w-52 h-52 object-contain transition-all duration-300 ${
                        activeFabric.isDark
                          ? 'drop-shadow-[0_8px_24px_rgba(255,255,255,0.18)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]'
                          : 'drop-shadow-[0_8px_24px_rgba(0,0,0,0.20)]'
                      }`}
                    />
                    {/* Featured badge */}
                    <div className="absolute top-0 left-0 font-mono text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-warm text-ink font-black shadow-xs">
                      Curated Drop
                    </div>

                    {/* Fabric Switcher */}
                    <div className="absolute top-0 right-0">
                      <FabricSwatchPicker current={fabric} onChange={setFabric} size="sm" />
                    </div>
                  </div>
                ) : (
                  /* Placeholder design */
                  <div className="flex flex-col items-center gap-3 text-mutedGray">
                    <Sparkles className="w-16 h-16 stroke-[1]" />
                    <span className="font-mono text-xs uppercase tracking-widest">Creator Artwork</span>
                  </div>
                )}
              </div>

              {/* Floating info card */}
              {featuredArtwork && (
                <div className="absolute -bottom-4 -left-4 bg-paper border border-borderCol rounded-xl px-4 py-3 shadow-lg z-20 min-w-[180px]">
                  <p className="font-sans font-bold text-sm text-ink line-clamp-1 mb-0.5">
                    {featuredArtwork.title}
                  </p>
                  <p className="font-mono text-[10px] text-mutedGray">
                    by @{featuredArtwork.creator.slug}
                  </p>
                  <p className="font-mono text-xs font-bold text-warm-dark mt-1">
                    {formatPrice(featuredArtwork.baseLicensePrice)} / unit
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-t border-borderCol bg-paper-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center divide-x divide-borderCol">
            <div className="pr-6 mr-6">
              <span className="font-sans font-black text-2xl text-ink">{totalArtworks}+</span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-mutedGray mt-0.5">Artworks</span>
            </div>
            <div className="px-6 mr-6">
              <span className="font-sans font-black text-2xl text-ink">{totalCreators}+</span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-mutedGray mt-0.5">Creators</span>
            </div>
            <div className="pl-6">
              <span className="font-sans font-black text-2xl text-ink">{totalLicenses}+</span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-mutedGray mt-0.5">Licenses Issued</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
