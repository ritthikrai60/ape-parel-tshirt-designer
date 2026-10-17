'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  ShieldCheck,
  ArrowRight,
  Palette,
  Users,
  Sparkles,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export interface CreatorArtworkSummary {
  id: string;
  title: string;
  previewUrl: string;
  category: string;
}

export interface CreatorDirectoryDTO {
  id: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  badgeVerified: boolean;
  specialties: string[];
  artworksCount: number;
  previewArtworks: CreatorArtworkSummary[];
}

interface CreatorsCatalogClientProps {
  initialCreators: CreatorDirectoryDTO[];
}

const CATEGORY_TAGS = [
  { key: 'ALL', label: 'All Specialties' },
  { key: 'MASCOT', label: 'Mascot' },
  { key: 'LOGO', label: 'Logo' },
  { key: 'ILLUSTRATION', label: 'Illustration' },
  { key: 'TYPOGRAPHY', label: 'Typography' },
  { key: 'PATTERN', label: 'Pattern' },
] as const;

export const CreatorsCatalogClient: React.FC<CreatorsCatalogClientProps> = ({ initialCreators }) => {
  const { locale } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'artworks_desc' | 'name_asc' | 'name_desc'>('artworks_desc');

  // Filter and sort creators
  const filteredCreators = useMemo(() => {
    let result = [...initialCreators];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((creator) => {
        const matchesName = creator.displayName.toLowerCase().includes(q);
        const matchesSlug = creator.slug.toLowerCase().includes(q);
        const matchesBio = creator.bio?.toLowerCase().includes(q) ?? false;
        const matchesArtworks = creator.previewArtworks.some((art) =>
          art.title.toLowerCase().includes(q) || art.category.toLowerCase().includes(q)
        );
        return matchesName || matchesSlug || matchesBio || matchesArtworks;
      });
    }

    // Specialty filter
    if (selectedSpecialty !== 'ALL') {
      result = result.filter((creator) =>
        creator.specialties.includes(selectedSpecialty)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'artworks_desc') {
        return b.artworksCount - a.artworksCount;
      }
      if (sortBy === 'name_asc') {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortBy === 'name_desc') {
        return b.displayName.localeCompare(a.displayName);
      }
      return 0;
    });

    return result;
  }, [initialCreators, searchQuery, selectedSpecialty, sortBy]);

  // Derived stats
  const totalArtworksCount = useMemo(
    () => initialCreators.reduce((sum, c) => sum + c.artworksCount, 0),
    [initialCreators]
  );

  return (
    <div className="w-full min-h-screen bg-paper flex flex-col">
      {/* ── 1. Hero & Metrics Header ── */}
      <section className="border-b border-borderCol bg-paper-light py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm/20 border border-warm/40 text-warm-dark font-mono text-xs uppercase tracking-wider mb-4">
              <Users className="w-3.5 h-3.5" />
              <span>ape-parel Creator Roster</span>
            </div>
            <h1 className="font-sans font-black text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
              {locale === 'th' ? 'สำรวจครีเอเตอร์และสตูดิโอผู้ออกแบบ' : 'Authentic Streetwear Creators & Studios'}
            </h1>
            <p className="mt-3 text-mutedGray text-sm sm:text-base leading-relaxed">
              {locale === 'th'
                ? 'พบกับศิลปิน สตูดิโอ และนักออกแบบอิสระที่ได้รับการคัดสรร เลือกลวดลายต้นฉบับคุณภาพสูงเพื่อนำไปผลิตบนเสื้อยืดพรีเมียม พร้อมระบบส่งต่อส่วนแบ่งค่าลิขสิทธิ์อย่างโปร่งใสทุกตัว'
                : 'Discover curated independent artists, graphic studios, and streetwear marks. License authentic designs directly for high-density heavyweight apparel with verified royalty transparency.'}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-borderCol">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-mutedGray">Verified Creators</p>
              <p className="font-sans font-black text-2xl text-ink mt-0.5">{initialCreators.length}</p>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-mutedGray">Published Designs</p>
              <p className="font-sans font-black text-2xl text-ink mt-0.5">{totalArtworksCount}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-mono text-xs uppercase tracking-wider text-mutedGray">Royalty Protection</p>
              <div className="flex items-center gap-1.5 mt-1 text-emerald-600 font-mono font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Audited</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Filter & Search Controls ── */}
      <section className="sticky top-16 z-20 bg-paper/95 backdrop-blur-md border-b border-borderCol py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search creators"
              placeholder={locale === 'th' ? 'ค้นหาชื่อครีเอเตอร์, สไตล์, หรือแท็ก...' : 'Search creator by name, specialty, bio...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-paper-light border border-borderCol rounded-lg font-sans text-ink placeholder:text-mutedGray focus:outline-none focus:border-ink transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mutedGray hover:text-ink transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Specialty Tabs & Sort */}
          <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {CATEGORY_TAGS.map((cat) => {
                const isActive = selectedSpecialty === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedSpecialty(cat.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-ink text-paper font-bold shadow-sm'
                        : 'bg-paper-light text-mutedGray hover:text-ink border border-borderCol hover:border-ink/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <select
              aria-label="Sort creators"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-3 text-xs font-mono bg-paper-light border border-borderCol rounded-lg text-ink focus:outline-none focus:border-ink cursor-pointer"
            >
              <option value="artworks_desc">Most Artworks</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── 3. Creator Cards Grid ── */}
      <section className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {filteredCreators.length === 0 ? (
          <div className="text-center py-20 bg-paper-light border border-dashed border-borderCol rounded-2xl p-8">
            <Palette className="w-12 h-12 text-mutedGray/50 mx-auto mb-3" />
            <h3 className="font-sans font-bold text-lg text-ink">
              {locale === 'th' ? 'ไม่พบคอลเลกชันหรือครีเอเตอร์ที่ตรงกับการค้นหา' : 'No creators match your search'}
            </h3>
            <p className="text-mutedGray text-sm mt-1 max-w-md mx-auto">
              {locale === 'th'
                ? 'ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตฟิลเตอร์เพื่อดูรายชื่อครีเอเตอร์ทั้งหมด'
                : 'Try adjusting your keywords or clearing the specialty filter to view all creators.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSpecialty('ALL');
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper rounded-lg font-mono text-xs uppercase tracking-wider hover:bg-ink/80 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => (
              <div
                key={creator.id}
                className="group flex flex-col bg-paper-light border border-borderCol rounded-xl overflow-hidden hover:border-ink/60 hover:shadow-xl transition-all duration-300"
              >
                {/* ── Mini Gallery Strip (3-4 Artworks) ── */}
                <div className="grid grid-cols-3 bg-[#131718] h-36 relative overflow-hidden border-b border-borderCol">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
                  {creator.previewArtworks.slice(0, 3).map((art, i) => (
                    <Link
                      key={art.id}
                      href={`/creators/${creator.slug}`}
                      className="relative flex items-center justify-center p-3 border-r border-white/5 last:border-r-0 group/item hover:bg-white/5 transition-colors"
                      title={art.title}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={art.previewUrl}
                        alt={art.title}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/item:scale-110 drop-shadow-md"
                        loading="lazy"
                      />
                    </Link>
                  ))}
                  {/* Fill empty slots if creator has fewer than 3 designs */}
                  {Array.from({ length: Math.max(0, 3 - creator.previewArtworks.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center justify-center border-r border-white/5 last:border-r-0">
                      <span className="text-white/20 font-mono text-xs">—</span>
                    </div>
                  ))}
                </div>

                {/* ── Creator Details ── */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Avatar & Header */}
                    <div className="flex items-start gap-3.5 mb-3">
                      {creator.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-borderCol bg-paper-dark flex-none shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-ink text-paper font-mono font-bold text-base flex items-center justify-center flex-none">
                          {creator.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/creators/${creator.slug}`}
                            className="font-sans font-bold text-base text-ink hover:text-warm-dark transition-colors line-clamp-1"
                          >
                            {creator.displayName}
                          </Link>
                          {creator.badgeVerified && (
                            <span title="Verified Studio">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-none" />
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-mutedGray">@{creator.slug}</p>
                      </div>
                    </div>

                    {/* Bio */}
                    {creator.bio && (
                      <p className="text-xs text-ink/70 line-clamp-2 leading-relaxed mb-3">
                        {creator.bio}
                      </p>
                    )}

                    {/* Specialties / Tags */}
                    {creator.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {creator.specialties.map((spec) => (
                          <span
                            key={spec}
                            className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-paper border border-borderCol text-mutedGray"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Footer / CTA ── */}
                  <div className="pt-3 border-t border-borderCol flex items-center justify-between mt-auto">
                    <span className="font-mono text-xs text-ink/60 font-medium">
                      {creator.artworksCount} {creator.artworksCount === 1 ? 'artwork' : 'artworks'}
                    </span>

                    <Link
                      href={`/creators/${creator.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-warm-dark hover:text-ink transition-all group-hover:shadow-md"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Creator Onboarding CTA Banner ── */}
      <section className="bg-ink text-paper py-16 border-t border-ink/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper/10 border border-paper/20 font-mono text-xs uppercase tracking-wider text-warm mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Artist & Brand Partnership</span>
            </div>
            <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-paper">
              {locale === 'th' ? 'คุณเป็นศิลปินหรือดีไซเนอร์สตรีทแวร์ใช่หรือไม่?' : 'Are you an independent artist or streetwear brand?'}
            </h2>
            <p className="mt-2 text-paper/70 text-sm leading-relaxed">
              {locale === 'th'
                ? 'เปิด Storefront ของคุณเองบนแพลตฟอร์ม ape-parel กำหนดอัตราส่วนแบ่งค่าลิขสิทธิ์ได้อย่างอิสระ รับเงินตอบแทนทุกครั้งที่งานของคุณถูกผลิตลงบนเสื้อยืด โดยไม่ต้องสต็อกสินค้า'
                : 'Launch your storefront on ape-parel. Retain full IP ownership, set your per-garment licensing royalties, and let verified automated DTG suppliers handle printing and fulfillment.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link
              href="/creator"
              className="w-full sm:w-auto text-center px-6 py-3 rounded-xl bg-warm hover:bg-warm-dark text-ink font-mono font-bold text-sm uppercase tracking-wider transition-all shadow-lg hover:shadow-warm/20"
            >
              {locale === 'th' ? 'สมัครเป็นครีเอเตอร์' : 'Join as Creator'}
            </Link>
            <Link
              href="/marketplace"
              className="w-full sm:w-auto text-center px-6 py-3 rounded-xl bg-paper/10 hover:bg-paper/20 text-paper font-mono text-sm tracking-wider transition-colors border border-paper/20"
            >
              {locale === 'th' ? 'ดูผลงานใน Marketplace' : 'Browse Marketplace'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreatorsCatalogClient;
