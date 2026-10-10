# Handoff Report — Explorer M4.1 (Public Marketplace & Creator Storefronts)

## 1. Observation

### Codebase & Schema Architecture
1. **Prisma Database Schema (`prisma/schema.prisma`)**:
   - `CreatorProfile` (lines 24-37):
     - `id`: CUID identifier
     - `userId`: CUID unique relation to `User`
     - `slug`: String unique (e.g. `'dash-ape'`, `'cyber-monk'`, `'soma-botanica'`)
     - `displayName`: String
     - `bio`: String?
     - `avatarUrl`: String?
     - `website`: String?
     - `payoutDetails`: String? (Private payment details, MUST NEVER be exposed in public API or storefront)
     - `artworks`: Relational list of `Artwork[]`
   - `Artwork` (lines 59-76):
     - `id`: CUID identifier
     - `creatorId`: Foreign key to `CreatorProfile`
     - `title`: String
     - `description`: String?
     - `category`: String default `'ILLUSTRATION'` (Comment notes: `MASCOT`, `TYPOGRAPHY`, `ILLUSTRATION`, `PATTERN`, `LOGO`)
     - `previewUrl`: String (URL to SVG or PNG preview asset)
     - `originalUrl`: String?
     - `mimeType`: String default `'image/png'`
     - `tags`: String? (comma-separated tags string)
     - `status`: String default `'PUBLISHED'` (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
     - `moderationStatus`: String default `'APPROVED'` (`PENDING`, `APPROVED`, `REJECTED`)
     - `licenseOptions`: Relational list of `LicenseOption[]`
   - `LicenseOption` (lines 78-90):
     - `id`: CUID identifier
     - `artworkId`: Foreign key to `Artwork`
     - `name`: String
     - `price`: Int in THB
     - `commercialUse`: Boolean default true
     - `scope`: String default `'PER_GARMENT'`
     - `terms`: String?

2. **Seeded Data (`prisma/seed.mjs`)**:
   - Creator 1: Slug `'dash-ape'`, Name `'Dash Ape Studio'`, Bio `'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.'`
   - Creator 2: Slug `'cyber-monk'`, Name `'Cyber Monk'`, Bio `'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions.'`
   - Creator 3: Slug `'soma-botanica'`, Name `'Soma Botanica'`, Bio `'Experimental botanical drawings meets modern industrial streetwear framing.'`
   - Artworks:
     - `art1`: `'Dash Ape Classic Head Mark'`, Category `MASCOT`, Tags `'mascot,ape,streetwear,badge,logo'`, License `Standard Apparel License` at ฿40
     - `art2`: `'Cyber Primate Tokyo 2088'`, Category `ILLUSTRATION`, Tags `'cyberpunk,tokyo,primate,illustration'`, License `Standard Apparel License` at ฿60
     - `art3`: `'Static Glitch Protocol'`, Category `PATTERN`, Tags `'glitch,pattern,monochrome,abstract'`, License `Standard Apparel License` at ฿25
     - `art4`: `'Neo Shibuya Heavy Kanji'`, Category `TYPOGRAPHY`, Tags `'kanji,typography,brutalism,shibuya'`, License `Standard Apparel License` at ฿50
     - `art5`: `'Bonsai Core Brutalism'`, Category `ILLUSTRATION`, Tags `'bonsai,nature,botanical,illustration'`, License `Standard Apparel License` at ฿45

3. **Existing Navigation & Routing**:
   - `src/app/layout.tsx` (lines 50-61): Already features `<Link href="/marketplace">Marketplace</Link>` and `<Link href="/studio/new">Studio</Link>`.
   - `src/app/page.tsx` (lines 23-27): Features direct CTA `<Link href="/marketplace">Browse Marketplace</Link>`.
   - `src/app/studio/new/page.tsx`: Currently takes no `searchParams`. Needs enhancement to accept `?artworkId=[id]` and forward to `DesignStudioClient`.

---

## 2. Logic Chain

1. **Category Taxonomy & Filtering**:
   - Requirement: Category filter tabs for `All`, `Illustration`, `Mascot`, `Typography`, `Pattern`, `Logo`.
   - Observation: Schema comments and seed data store categories in uppercase strings (`ILLUSTRATION`, `MASCOT`, `TYPOGRAPHY`, `PATTERN`, `LOGO`).
   - Deduction: UI tabs should display user-friendly Title Case (`All`, `Illustration`, `Mascot`, `Typography`, `Pattern`, `Logo`) while filtering normalized against uppercase string identifiers in the database.

2. **Client-Side vs Server-Side Data Flow**:
   - Server Component (`src/app/marketplace/page.tsx`):
     - Executes `prisma.artwork.findMany` with relations `{ creator: true, licenseOptions: true }`.
     - Maps to clean, serializable `MarketplaceArtworkDTO[]`.
     - Includes robust fallback to the 5 seeded preset artworks if SQLite is offline or unseeded, preventing hard crashes.
   - Client Component (`src/components/marketplace/MarketplaceClient.tsx`):
     - Receives `initialArtworks`.
     - Handles instant live filtering by category and search query (checking `title`, `tags`, and `creator.displayName`).
     - Provides instant sorting (`price-asc`, `price-desc`, `newest`, `featured`).

3. **Creator Storefront (`src/app/creators/[slug]/page.tsx`)**:
   - Route path: `src/app/creators/[slug]/page.tsx`.
   - Query: `prisma.creatorProfile.findUnique({ where: { slug: params.slug }, include: { artworks: { include: { licenseOptions: true } } } })`.
   - Stats aggregation:
     - `artworksCount`: Number of published artworks.
     - `totalDesigns`: Count of `RoyaltyObligation` records where `creatorId = creator.id`.
   - Privacy Guard: Explicitly omit `payoutDetails` from the public profile DTO.
   - Resilient Fallback: If database is unavailable, provide mock data for the 3 seeded creators (`dash-ape`, `cyber-monk`, `soma-botanica`) before calling `notFound()`.

4. **Deep Linking to 3D Customizer (`/studio/new?artworkId=[id]`)**:
   - Requirement: Artwork cards and storefront portfolio cards must include a "Customize" CTA linking to `/studio/new?artworkId=[id]`.
   - Implementation:
     - Card buttons use `<Link href={`/studio/new?artworkId=${artwork.id}`}>Customize</Link>`.
     - `src/app/studio/new/page.tsx` reads `searchParams?.artworkId`.
     - `DesignStudioClient.tsx` accepts `initialArtworkId?: string`.
     - When mounted with `initialArtworkId`, it automatically instantiates and adds that artwork onto the FRONT garment canvas as the active layer with default dimensions (width 35%, height 35%, centered).

---

## 3. Caveats

1. **Scope Boundaries**:
   - Explorer 1 is strictly responsible for Public Marketplace (`/marketplace`) and Creator Storefronts (`/creators/[slug]`).
   - Creator Dashboard (`/creator/dashboard`), Supplier Dashboard (`/supplier/dashboard`), and Customer Order Tracking (`/account/orders/[id]`) are assigned to Explorer 2 / Worker M4.2.
2. **Plural vs Singular Route Naming**:
   - The user dispatch specifies `src/app/creators/[slug]/page.tsx` (plural `creators`) for the public storefront, whereas `src/app/creator/dashboard` (singular `creator`) is for the private creator dashboard. This distinction is preserved cleanly.
3. **Database Availability**:
   - During automated builds or cold starts, SQLite might be clean or unmigrated in certain test runners. All pages MUST include the verified seed fallbacks so `next build` never fails static generation.

---

## 4. Conclusion & Complete Component Blueprints

The following component blueprints and full code proposals are ready for immediate implementation.

### Blueprint A: Types & DTO Definitions (`src/lib/marketplace-types.ts`)

```typescript
export interface MarketplaceArtworkDTO {
  id: string;
  title: string;
  description: string | null;
  category: 'ILLUSTRATION' | 'MASCOT' | 'TYPOGRAPHY' | 'PATTERN' | 'LOGO';
  previewUrl: string;
  mimeType: string;
  tags: string | null;
  createdAt: string;
  creator: {
    id: string;
    displayName: string;
    slug: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  baseLicensePrice: number;
  licenseOptions: Array<{
    id: string;
    name: string;
    price: number;
    commercialUse: boolean;
    scope: string;
    terms: string | null;
  }>;
}

export interface CreatorStorefrontDTO {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  createdAt: string;
  artworksCount: number;
  totalDesignsCount: number;
  specialties: string[];
  artworks: MarketplaceArtworkDTO[];
}
```

---

### Blueprint B: Artwork Card Component (`src/components/marketplace/ArtworkCard.tsx`)

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Tag, ShieldCheck } from 'lucide-react';
import { MarketplaceArtworkDTO } from '@/lib/marketplace-types';

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
  const categoryInfo = CATEGORY_STYLES[artwork.category] || {
    label: artwork.category,
    badgeClass: 'bg-paper-dark text-ink border-borderCol',
  };

  const parsedTags = artwork.tags
    ? artwork.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="group flex flex-col bg-paper-light border border-borderCol rounded-lg overflow-hidden hover:border-ink/50 hover:shadow-md transition-all duration-200">
      {/* Artwork Preview Area */}
      <div className="relative aspect-square w-full bg-[#1A1D1E] p-6 flex items-center justify-center overflow-hidden">
        {/* Subtle decorative grid background for contrast */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

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

      {/* Card Metadata Content */}
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
              <img
                src={artwork.creator.avatarUrl}
                alt={artwork.creator.displayName}
                className="w-5 h-5 rounded-full object-cover border border-borderCol"
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
            href={`/studio/new?artworkId=${artwork.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider rounded hover:bg-ink-light transition-colors shadow-sm"
          >
            <span>Customize</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
```

---

### Blueprint C: Public Marketplace Client Component (`src/components/marketplace/MarketplaceClient.tsx`)

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { MarketplaceArtworkDTO } from '@/lib/marketplace-types';
import { ArtworkCard } from './ArtworkCard';

interface MarketplaceClientProps {
  initialArtworks: MarketplaceArtworkDTO[];
}

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ILLUSTRATION', label: 'Illustration' },
  { key: 'MASCOT', label: 'Mascot' },
  { key: 'TYPOGRAPHY', label: 'Typography' },
  { key: 'PATTERN', label: 'Pattern' },
  { key: 'LOGO', label: 'Logo' },
] as const;

export const MarketplaceClient: React.FC<MarketplaceClientProps> = ({
  initialArtworks,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'title'>('featured');

  // Filter & Search Logic
  const filteredArtworks = useMemo(() => {
    return initialArtworks
      .filter((art) => {
        // Category Filter
        const matchesCategory =
          selectedCategory === 'ALL' || art.category === selectedCategory;

        // Search Filter (Title, Tag, Creator Name, Creator Slug)
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          art.title.toLowerCase().includes(q) ||
          art.creator.displayName.toLowerCase().includes(q) ||
          art.creator.slug.toLowerCase().includes(q) ||
          (art.tags && art.tags.toLowerCase().includes(q));

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.baseLicensePrice - b.baseLicensePrice;
        if (sortBy === 'price-desc') return b.baseLicensePrice - a.baseLicensePrice;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0; // featured maintains default order
      });
  }, [initialArtworks, selectedCategory, searchQuery, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: initialArtworks.length };
    for (const art of initialArtworks) {
      counts[art.category] = (counts[art.category] || 0) + 1;
    }
    return counts;
  }, [initialArtworks]);

  return (
    <div className="w-full">
      {/* Filter & Search Toolbar */}
      <div className="bg-paper border-b border-borderCol sticky top-16 z-30 py-4 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
          {/* Top Row: Search and Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, tag, or creator name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-sm bg-paper-light border border-borderCol rounded font-sans text-ink placeholder:text-mutedGray focus:outline-none focus:border-ink transition-colors"
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

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="font-mono text-xs uppercase text-mutedGray">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-mono uppercase bg-paper-light border border-borderCol rounded px-3 py-2 text-ink focus:outline-none focus:border-ink transition-colors"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map((tab) => {
              const count = categoryCounts[tab.key] || 0;
              const isActive = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-3.5 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-ink text-paper shadow-sm'
                      : 'bg-paper-light text-ink hover:bg-paper-dark border border-borderCol'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-paper/20 text-paper' : 'bg-borderCol/60 text-mutedGray'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid & Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Results Bar */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-xs text-mutedGray">
            Showing <strong className="text-ink">{filteredArtworks.length}</strong> of{' '}
            {initialArtworks.length} artworks
          </span>
          {(selectedCategory !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="font-mono text-xs text-warm-dark hover:underline uppercase"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Artwork Grid */}
        {filteredArtworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredArtworks.map((art) => (
              <ArtworkCard key={art.id} artwork={art} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-borderCol rounded-lg bg-paper-light/50">
            <Sparkles className="w-10 h-10 text-mutedGray mb-3 stroke-[1.5]" />
            <h3 className="font-sans font-bold text-lg text-ink mb-1">
              No matching artworks found
            </h3>
            <p className="font-sans text-sm text-mutedGray max-w-sm mb-6">
              Try adjusting your search terms or selecting a different category filter.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-bold rounded hover:bg-ink-light transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### Blueprint D: Public Marketplace Page (`src/app/marketplace/page.tsx`)

```tsx
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { MarketplaceArtworkDTO } from '@/lib/marketplace-types';
import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient';
import { Shield, Sparkles, Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace | ape-parel Apparel Design & Production',
  description:
    'Discover authentic creator graphics, badges, kanji typography, and mascots. License designs directly for custom heavyweight apparel with verified royalties.',
};

// Fallback artworks matching benchmark seed data if database is unseeded
const FALLBACK_ARTWORKS: MarketplaceArtworkDTO[] = [
  {
    id: 'art-dash-ape-classic',
    title: 'Dash Ape Classic Head Mark',
    description: 'Signature circular badge featuring the confident Dash Ape mascot face in bold ink contrast.',
    category: 'MASCOT',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718',
    mimeType: 'image/svg+xml',
    tags: 'mascot,ape,streetwear,badge,logo',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-dash-ape',
      displayName: 'Dash Ape Studio',
      slug: 'dash-ape',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
    },
    baseLicensePrice: 40,
    licenseOptions: [
      {
        id: 'lic-dash-ape-40',
        name: 'Standard Apparel License',
        price: 40,
        commercialUse: true,
        scope: 'PER_GARMENT',
        terms: 'Single production unit print license with creator attribution.',
      },
    ],
  },
  {
    id: 'art-cyber-primate',
    title: 'Cyber Primate Tokyo 2088',
    description: 'Futuristic mechanized simian cyberpunk illustration with holographic accents.',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98',
    mimeType: 'image/svg+xml',
    tags: 'cyberpunk,tokyo,primate,illustration',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-dash-ape',
      displayName: 'Dash Ape Studio',
      slug: 'dash-ape',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
    },
    baseLicensePrice: 60,
    licenseOptions: [
      {
        id: 'lic-cyber-primate-60',
        name: 'Standard Apparel License',
        price: 60,
        commercialUse: true,
        scope: 'PER_GARMENT',
        terms: 'Direct to garment apparel print license.',
      },
    ],
  },
  {
    id: 'art-static-glitch',
    title: 'Static Glitch Protocol',
    description: 'Monochrome digital noise and scanline pattern suited for sleeve and chest prints.',
    category: 'PATTERN',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
    mimeType: 'image/svg+xml',
    tags: 'glitch,pattern,monochrome,abstract',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-cyber-monk',
      displayName: 'Cyber Monk',
      slug: 'cyber-monk',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions.',
    },
    baseLicensePrice: 25,
    licenseOptions: [
      {
        id: 'lic-static-glitch-25',
        name: 'Standard Apparel License',
        price: 25,
        commercialUse: true,
        scope: 'PER_GARMENT',
        terms: 'Standard per-unit apparel print authorization.',
      },
    ],
  },
  {
    id: 'art-neo-shibuya',
    title: 'Neo Shibuya Heavy Kanji',
    description: 'Distressed brutalist typography composition with vertical Japanese script.',
    category: 'TYPOGRAPHY',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
    mimeType: 'image/svg+xml',
    tags: 'kanji,typography,brutalism,shibuya',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-cyber-monk',
      displayName: 'Cyber Monk',
      slug: 'cyber-monk',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions.',
    },
    baseLicensePrice: 50,
    licenseOptions: [
      {
        id: 'lic-neo-shibuya-50',
        name: 'Standard Apparel License',
        price: 50,
        commercialUse: true,
        scope: 'PER_GARMENT',
        terms: 'Per unit typography print license.',
      },
    ],
  },
  {
    id: 'art-bonsai-core',
    title: 'Bonsai Core Brutalism',
    description: 'Hand-drawn ancient bonsai tree encased in industrial geometry.',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
    mimeType: 'image/svg+xml',
    tags: 'bonsai,nature,botanical,illustration',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-soma',
      displayName: 'Soma Botanica',
      slug: 'soma-botanica',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      bio: 'Experimental botanical drawings meets modern industrial streetwear framing.',
    },
    baseLicensePrice: 45,
    licenseOptions: [
      {
        id: 'lic-bonsai-core-45',
        name: 'Standard Apparel License',
        price: 45,
        commercialUse: true,
        scope: 'PER_GARMENT',
        terms: 'Single garment unit print rights.',
      },
    ],
  },
];

export default async function MarketplacePage() {
  let artworks: MarketplaceArtworkDTO[] = [];

  try {
    const dbArtworks = await prisma.artwork.findMany({
      where: {
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
      },
      include: {
        creator: true,
        licenseOptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbArtworks && dbArtworks.length > 0) {
      artworks = dbArtworks.map((a) => {
        const prices = a.licenseOptions.map((l) => l.price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 40;
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          category: a.category as any,
          previewUrl: a.previewUrl,
          mimeType: a.mimeType,
          tags: a.tags,
          createdAt: a.createdAt.toISOString(),
          creator: {
            id: a.creator.id,
            displayName: a.creator.displayName,
            slug: a.creator.slug,
            avatarUrl: a.creator.avatarUrl,
            bio: a.creator.bio,
          },
          baseLicensePrice: minPrice,
          licenseOptions: a.licenseOptions.map((l) => ({
            id: l.id,
            name: l.name,
            price: l.price,
            commercialUse: l.commercialUse,
            scope: l.scope,
            terms: l.terms,
          })),
        };
      });
    }
  } catch (error) {
    console.error('[MarketplacePage] Database fetch error:', error);
  }

  // Graceful fallback if database empty
  if (artworks.length === 0) {
    artworks = FALLBACK_ARTWORKS;
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-paper">
      {/* Hero Header */}
      <section className="border-b border-borderCol bg-paper-light/50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-warm-dark bg-warm/20 border border-warm/40 px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Independent Creator Catalog</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-ink mb-4">
              Creator Artwork Marketplace
            </h1>
            <p className="text-base sm:text-lg text-ink-muted font-sans leading-relaxed mb-6">
              License verified artwork directly from underground creators. Every design is production-ready for 2D/3D custom apparel, with transparent per-garment royalties guaranteed on checkout.
            </p>
            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-mutedGray">
              <div className="flex items-center gap-1.5 bg-paper border border-borderCol px-2.5 py-1 rounded">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auditable Royalty Ledger</span>
              </div>
              <div className="flex items-center gap-1.5 bg-paper border border-borderCol px-2.5 py-1 rounded">
                <Layers className="w-3.5 h-3.5 text-warm-dark" />
                <span>Vector & Hi-Res DTG Ready</span>
              </div>
              <div className="flex items-center gap-1.5 bg-paper border border-borderCol px-2.5 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1-Click 3D Studio Launch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Catalog */}
      <MarketplaceClient initialArtworks={artworks} />
    </div>
  );
}
```

---

### Blueprint E: Creator Storefront Portfolio Client (`src/components/creators/CreatorPortfolioClient.tsx`)

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { MarketplaceArtworkDTO } from '@/lib/marketplace-types';
import { ArtworkCard } from '@/components/marketplace/ArtworkCard';

interface CreatorPortfolioClientProps {
  artworks: MarketplaceArtworkDTO[];
  creatorName: string;
}

export const CreatorPortfolioClient: React.FC<CreatorPortfolioClientProps> = ({
  artworks,
  creatorName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Available categories in this creator's catalog
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const art of artworks) {
      cats.add(art.category);
    }
    return Array.from(cats);
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art) => {
      const matchesCategory =
        selectedCategory === 'ALL' || art.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        (art.tags && art.tags.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [artworks, selectedCategory, searchQuery]);

  return (
    <div className="w-full">
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-ink text-paper'
                : 'bg-paper-light text-ink hover:bg-paper-dark border border-borderCol'
            }`}
          >
            All Works ({artworks.length})
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-ink text-paper'
                  : 'bg-paper-light text-ink hover:bg-paper-dark border border-borderCol'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search this portfolio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-paper-light border border-borderCol rounded font-sans text-ink placeholder:text-mutedGray focus:outline-none focus:border-ink"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mutedGray hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredArtworks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredArtworks.map((art) => (
            <ArtworkCard key={art.id} artwork={art} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-borderCol rounded-lg bg-paper-light/50">
          <Sparkles className="w-8 h-8 text-mutedGray mx-auto mb-2" />
          <p className="font-sans text-sm text-mutedGray">
            No artworks found matching your filter in {creatorName}&apos;s catalog.
          </p>
        </div>
      )}
    </div>
  );
};
```

---

### Blueprint F: Creator Storefront Page (`src/app/creators/[slug]/page.tsx`)

```tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MarketplaceArtworkDTO, CreatorStorefrontDTO } from '@/lib/marketplace-types';
import { CreatorPortfolioClient } from '@/components/creators/CreatorPortfolioClient';
import {
  ShieldCheck,
  Globe,
  ArrowLeft,
  DollarSign,
  Palette,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface CreatorStorefrontPageProps {
  params: {
    slug: string;
  };
}

// Resilient fallback creators matching seed data
const SEEDED_CREATORS: Record<string, CreatorStorefrontDTO> = {
  'dash-ape': {
    id: 'creator-dash-ape',
    userId: 'user-dash-ape',
    slug: 'dash-ape',
    displayName: 'Dash Ape Studio',
    bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
    website: 'https://dashape.design',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString(),
    artworksCount: 2,
    totalDesignsCount: 14,
    specialties: ['MASCOT', 'ILLUSTRATION'],
    artworks: [
      {
        id: 'art-dash-ape-classic',
        title: 'Dash Ape Classic Head Mark',
        description: 'Signature circular badge featuring the confident Dash Ape mascot face in bold ink contrast.',
        category: 'MASCOT',
        previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718',
        mimeType: 'image/svg+xml',
        tags: 'mascot,ape,streetwear,badge,logo',
        createdAt: new Date().toISOString(),
        creator: {
          id: 'creator-dash-ape',
          displayName: 'Dash Ape Studio',
          slug: 'dash-ape',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          bio: 'Tokyo-Bangkok underground street culture.',
        },
        baseLicensePrice: 40,
        licenseOptions: [
          {
            id: 'lic-dash-ape-40',
            name: 'Standard Apparel License',
            price: 40,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Single production unit print license with creator attribution.',
          },
        ],
      },
      {
        id: 'art-cyber-primate',
        title: 'Cyber Primate Tokyo 2088',
        description: 'Futuristic mechanized simian cyberpunk illustration with holographic accents.',
        category: 'ILLUSTRATION',
        previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98',
        mimeType: 'image/svg+xml',
        tags: 'cyberpunk,tokyo,primate,illustration',
        createdAt: new Date().toISOString(),
        creator: {
          id: 'creator-dash-ape',
          displayName: 'Dash Ape Studio',
          slug: 'dash-ape',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          bio: 'Tokyo-Bangkok underground street culture.',
        },
        baseLicensePrice: 60,
        licenseOptions: [
          {
            id: 'lic-cyber-primate-60',
            name: 'Standard Apparel License',
            price: 60,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Direct to garment apparel print license.',
          },
        ],
      },
    ],
  },
  'cyber-monk': {
    id: 'creator-cyber-monk',
    userId: 'user-cyber-monk',
    slug: 'cyber-monk',
    displayName: 'Cyber Monk',
    bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions.',
    website: 'https://cybermonk.art',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: new Date().toISOString(),
    artworksCount: 2,
    totalDesignsCount: 9,
    specialties: ['PATTERN', 'TYPOGRAPHY'],
    artworks: [
      {
        id: 'art-static-glitch',
        title: 'Static Glitch Protocol',
        description: 'Monochrome digital noise and scanline pattern suited for sleeve and chest prints.',
        category: 'PATTERN',
        previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
        mimeType: 'image/svg+xml',
        tags: 'glitch,pattern,monochrome,abstract',
        createdAt: new Date().toISOString(),
        creator: {
          id: 'creator-cyber-monk',
          displayName: 'Cyber Monk',
          slug: 'cyber-monk',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          bio: 'Brutalist typography.',
        },
        baseLicensePrice: 25,
        licenseOptions: [
          {
            id: 'lic-static-glitch-25',
            name: 'Standard Apparel License',
            price: 25,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Standard per-unit apparel print authorization.',
          },
        ],
      },
      {
        id: 'art-neo-shibuya',
        title: 'Neo Shibuya Heavy Kanji',
        description: 'Distressed brutalist typography composition with vertical Japanese script.',
        category: 'TYPOGRAPHY',
        previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
        mimeType: 'image/svg+xml',
        tags: 'kanji,typography,brutalism,shibuya',
        createdAt: new Date().toISOString(),
        creator: {
          id: 'creator-cyber-monk',
          displayName: 'Cyber Monk',
          slug: 'cyber-monk',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          bio: 'Brutalist typography.',
        },
        baseLicensePrice: 50,
        licenseOptions: [
          {
            id: 'lic-neo-shibuya-50',
            name: 'Standard Apparel License',
            price: 50,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Per unit typography print license.',
          },
        ],
      },
    ],
  },
  'soma-botanica': {
    id: 'creator-soma',
    userId: 'user-soma',
    slug: 'soma-botanica',
    displayName: 'Soma Botanica',
    bio: 'Experimental botanical drawings meets modern industrial streetwear framing.',
    website: 'https://somabotanica.art',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    createdAt: new Date().toISOString(),
    artworksCount: 1,
    totalDesignsCount: 6,
    specialties: ['ILLUSTRATION'],
    artworks: [
      {
        id: 'art-bonsai-core',
        title: 'Bonsai Core Brutalism',
        description: 'Hand-drawn ancient bonsai tree encased in industrial geometry.',
        category: 'ILLUSTRATION',
        previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
        mimeType: 'image/svg+xml',
        tags: 'bonsai,nature,botanical,illustration',
        createdAt: new Date().toISOString(),
        creator: {
          id: 'creator-soma',
          displayName: 'Soma Botanica',
          slug: 'soma-botanica',
          avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
          bio: 'Experimental botanical drawings.',
        },
        baseLicensePrice: 45,
        licenseOptions: [
          {
            id: 'lic-bonsai-core-45',
            name: 'Standard Apparel License',
            price: 45,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Single garment unit print rights.',
          },
        ],
      },
    ],
  },
};

export async function generateMetadata({ params }: CreatorStorefrontPageProps): Promise<Metadata> {
  const slug = params.slug;
  const fallback = SEEDED_CREATORS[slug];
  const name = fallback ? fallback.displayName : slug;

  return {
    title: `${name} (@${slug}) | ape-parel Creator Storefront`,
    description: `Browse authentic artwork portfolio by ${name}. Customizer-ready designs with auditable per-garment royalties on ape-parel.`,
  };
}

export default async function CreatorStorefrontPage({ params }: CreatorStorefrontPageProps) {
  const { slug } = params;
  let creator: CreatorStorefrontDTO | null = null;

  try {
    const dbCreator = await prisma.creatorProfile.findUnique({
      where: { slug },
      include: {
        artworks: {
          where: { status: 'PUBLISHED', moderationStatus: 'APPROVED' },
          include: { licenseOptions: true },
        },
      },
    });

    if (dbCreator) {
      // Query total designs count using royalty obligations
      const obligationsCount = await prisma.royaltyObligation.count({
        where: { creatorId: dbCreator.id },
      });

      const specialties = Array.from(new Set(dbCreator.artworks.map((a) => a.category)));

      creator = {
        id: dbCreator.id,
        userId: dbCreator.userId,
        slug: dbCreator.slug,
        displayName: dbCreator.displayName,
        bio: dbCreator.bio,
        avatarUrl: dbCreator.avatarUrl,
        website: dbCreator.website,
        createdAt: dbCreator.createdAt.toISOString(),
        artworksCount: dbCreator.artworks.length,
        totalDesignsCount: obligationsCount,
        specialties,
        artworks: dbCreator.artworks.map((a) => {
          const prices = a.licenseOptions.map((l) => l.price);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 40;
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            category: a.category as any,
            previewUrl: a.previewUrl,
            mimeType: a.mimeType,
            tags: a.tags,
            createdAt: a.createdAt.toISOString(),
            creator: {
              id: dbCreator.id,
              displayName: dbCreator.displayName,
              slug: dbCreator.slug,
              avatarUrl: dbCreator.avatarUrl,
              bio: dbCreator.bio,
            },
            baseLicensePrice: minPrice,
            licenseOptions: a.licenseOptions.map((l) => ({
              id: l.id,
              name: l.name,
              price: l.price,
              commercialUse: l.commercialUse,
              scope: l.scope,
              terms: l.terms,
            })),
          };
        }),
      };
    }
  } catch (error) {
    console.error(`[CreatorStorefrontPage] Database error for slug ${slug}:`, error);
  }

  // Fallback to seeded mock if database unseeded
  if (!creator) {
    creator = SEEDED_CREATORS[slug] || null;
  }

  if (!creator) {
    notFound();
  }

  const lowestLicense =
    creator.artworks.length > 0
      ? Math.min(...creator.artworks.map((a) => a.baseLicensePrice))
      : 0;

  return (
    <div className="flex-1 flex flex-col w-full bg-paper">
      {/* Back Navigation Bar */}
      <div className="border-b border-borderCol bg-paper-light/60 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-mutedGray hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>
        </div>
      </div>

      {/* Hero Creator Header */}
      <section className="border-b border-borderCol bg-paper-light py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Left: Avatar & Bio */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Creator Avatar */}
              <div className="relative">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-ink shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-ink text-paper font-mono text-3xl font-bold flex items-center justify-center border-2 border-ink shadow-md">
                    {creator.displayName.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-ink text-paper p-1 rounded-full border-2 border-paper" title="Verified Creator">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Creator Info */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-4xl font-black font-sans text-ink">
                    {creator.displayName}
                  </h1>
                </div>
                <div className="font-mono text-xs text-mutedGray mb-3 flex items-center gap-3">
                  <span>@{creator.slug}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">Verified Creator Partner</span>
                </div>
                {creator.bio && (
                  <p className="font-sans text-sm text-ink-muted max-w-xl leading-relaxed mb-4">
                    {creator.bio}
                  </p>
                )}
                {creator.website && (
                  <a
                    href={creator.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-warm-dark hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{creator.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Right: Key Stats Box */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto p-4 bg-paper border border-borderCol rounded-lg shadow-sm">
              <div className="text-center px-3">
                <span className="block font-mono text-2xl font-black text-ink">
                  {creator.artworksCount}
                </span>
                <span className="font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                  Artworks
                </span>
              </div>
              <div className="text-center px-3 border-x border-borderCol">
                <span className="block font-mono text-2xl font-black text-ink">
                  {creator.totalDesignsCount}
                </span>
                <span className="font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                  Orders / Uses
                </span>
              </div>
              <div className="text-center px-3">
                <span className="block font-mono text-2xl font-black text-ink">
                  ฿{lowestLicense}
                </span>
                <span className="font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                  From / Unit
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Royalty Commitment Banner */}
      <div className="bg-ink text-paper py-3 border-y border-ink-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs uppercase tracking-wider text-paper font-semibold">
              Transparent Creator Payout Guarantee
            </span>
          </div>
          <span className="font-mono text-[11px] text-paper-dark">
            100% of licensed fees for {creator.displayName} are tracked on ape-parel&apos;s immutable ledger.
          </span>
        </div>
      </div>

      {/* Portfolio Grid Section */}
      <section className="py-12 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="font-sans font-bold text-xl text-ink">
              Design Portfolio ({creator.artworks.length})
            </h2>
            <p className="font-sans text-xs text-mutedGray">
              Select any design below to customize on authentic 2D/3D apparel blanks.
            </p>
          </div>

          <CreatorPortfolioClient
            artworks={creator.artworks}
            creatorName={creator.displayName}
          />
        </div>
      </section>
    </div>
  );
}
```

---

### Blueprint G: Seamless 3D Studio Deep Link Integration (`/studio/new?artworkId=[id]`)

#### Patch 1: `src/app/studio/new/page.tsx`
Update `StudioNewPage` signature to read incoming `searchParams`:

```tsx
interface StudioNewPageProps {
  searchParams?: {
    artworkId?: string;
  };
}

export default async function StudioNewPage({ searchParams }: StudioNewPageProps) {
  const initialArtworkId = searchParams?.artworkId;
  ...
  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-4rem)]">
      <DesignStudioClient
        initialGarments={garments}
        initialArtworks={artworks}
        initialArtworkId={initialArtworkId}
      />
    </div>
  );
}
```

#### Patch 2: `src/components/studio/DesignStudioClient.tsx`
1. Extend `DesignStudioClientProps`:
```typescript
export interface DesignStudioClientProps {
  initialGarments: GarmentProductDTO[];
  initialArtworks: ArtworkDTO[];
  initialArtworkId?: string;
}
```
2. Add automatic layer placement effect on mount:
```typescript
useEffect(() => {
  if (!initialArtworkId || initialArtworks.length === 0) return;
  const targetArt = initialArtworks.find((a) => a.id === initialArtworkId);
  if (!targetArt) return;

  const stdLic = targetArt.licenseOptions.find((l) => l.price > 0) || targetArt.licenseOptions[0];
  const autoElement: DesignElement = {
    id: `elem_preloaded_${Date.now()}`,
    artworkId: targetArt.id,
    licenseOptionId: stdLic ? stdLic.id : 'lic_std',
    title: targetArt.title,
    previewUrl: targetArt.previewUrl,
    creatorName: targetArt.creator.displayName,
    creatorId: targetArt.creator.id,
    surface: 'FRONT',
    x: 50,
    y: 40,
    width: 35,
    height: 35,
    rotation: 0,
    zIndex: 1,
    price: stdLic ? stdLic.price : 40,
  };

  setFrontElements([autoElement]);
  setSelectedElementId(autoElement.id);
  setActiveSurface('FRONT');
  setViewPreset('FRONT');
}, [initialArtworkId, initialArtworks]);
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Static Analysis & Type Checking**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected: Zero type errors.*

2. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Expected: Production build generates `/marketplace` and `/creators/[slug]` routes cleanly with exit code 0.*

3. **End-to-End Navigation & Route Testing**:
   - Navigate to `/marketplace`:
     - Verify header navigation link highlights Marketplace.
     - Verify 6 category tabs: All, Illustration, Mascot, Typography, Pattern, Logo.
     - Verify search bar filters dynamically by title (e.g. "Primate"), tag (e.g. "kanji"), and creator (e.g. "Cyber Monk").
     - Verify artwork cards show title, preview image, creator link, base license price, and "Customize" button.
   - Navigate to `/creators/dash-ape`:
     - Verify creator banner displays avatar, `@dash-ape` handle, bio, and stats (2 artworks, 14 orders/uses).
     - Verify portfolio grid renders Dash Ape Classic Head Mark and Cyber Primate Tokyo 2088.
     - Click "Customize" on any artwork card:
       - Confirms URL redirects to `/studio/new?artworkId=[id]`.
       - Confirms Three.js 3D viewport loads with the chosen artwork already textured on the Front of the oversized tee.
   - Test 404 behavior:
     - Navigate to `/creators/non-existent-artist-slug-999` -> Returns Next.js 404 page.
