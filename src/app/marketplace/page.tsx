import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { MarketplaceArtworkDTO } from '@/components/marketplace/ArtworkCard';
import { MarketplaceCatalog } from '@/components/marketplace/CategoryFilter';
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
          category: a.category,
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

  // Graceful fallback if database unseeded
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
              <div className="flex items-center gap-1.5 bg-paper border border-borderCol px-2.5 py-1 rounded-md">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auditable Royalty Ledger</span>
              </div>
              <div className="flex items-center gap-1.5 bg-paper border border-borderCol px-2.5 py-1 rounded-md">
                <Layers className="w-3.5 h-3.5 text-warm-dark" />
                <span>Vector & Hi-Res DTG Ready</span>
              </div>
              <div className="flex items-center gap-1.5 bg-paper border border-borderCol px-2.5 py-1 rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1-Click 3D Studio Launch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Catalog */}
      <MarketplaceCatalog initialArtworks={artworks} />
    </div>
  );
}
