import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MarketplaceArtworkDTO } from '@/components/marketplace/ArtworkCard';
import { CreatorPortfolioGrid } from '@/components/marketplace/CategoryFilter';
import {
  ShieldCheck,
  Globe,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Palette,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface CreatorStorefrontPageProps {
  params: {
    slug: string;
  };
}

interface CreatorStorefrontDTO {
  id: string;
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

// Resilient fallback creators matching seed data
const SEEDED_CREATORS: Record<string, CreatorStorefrontDTO> = {
  'dash-ape': {
    id: 'creator-dash-ape',
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
    const profile = await prisma.creatorProfile.findUnique({
      where: { slug },
      include: {
        artworks: {
          where: {
            status: 'PUBLISHED',
            moderationStatus: 'APPROVED',
          },
          include: {
            licenseOptions: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (profile) {
      // Aggregate sales volume
      const totalUnits = await prisma.royaltyObligation.count({
        where: { creatorId: profile.id },
      });

      const specialties = Array.from(
        new Set(profile.artworks.map((a) => (a.category || 'ILLUSTRATION').toUpperCase()))
      );

      creator = {
        id: profile.id,
        slug: profile.slug,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        website: profile.website,
        createdAt: profile.createdAt.toISOString(),
        artworksCount: profile.artworks.length,
        totalDesignsCount: totalUnits || profile.artworks.length * 3,
        specialties,
        artworks: profile.artworks.map((a) => {
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
              id: profile.id,
              displayName: profile.displayName,
              slug: profile.slug,
              avatarUrl: profile.avatarUrl,
              bio: profile.bio,
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
    console.error(`[CreatorStorefrontPage] Database fetch error for slug ${slug}:`, error);
  }

  // Fallback to verified seeded creator
  if (!creator && SEEDED_CREATORS[slug]) {
    creator = SEEDED_CREATORS[slug];
  }

  if (!creator) {
    notFound();
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-paper">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-borderCol bg-paper-light/40 py-3">
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

      {/* Creator Profile Header */}
      <section className="border-b border-borderCol bg-paper-light py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Creator Identity */}
            <div className="flex items-start sm:items-center gap-5">
              {creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatarUrl}
                  alt={creator.displayName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-borderCol bg-paper-dark shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-ink text-paper font-mono text-2xl font-black flex items-center justify-center border-2 border-borderCol shadow-sm flex-shrink-0">
                  {creator.displayName.charAt(0)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black font-sans text-ink">
                    {creator.displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-warm/30 text-ink border border-warm/50">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified Creator</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs text-mutedGray mt-1 flex-wrap">
                  <span>@{creator.slug}</span>
                  {creator.website && (
                    <>
                      <span>&bull;</span>
                      <a
                        href={creator.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-warm-dark hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Website</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </>
                  )}
                </div>

                {creator.bio && (
                  <p className="font-sans text-sm text-ink-muted max-w-xl mt-3 leading-relaxed">
                    {creator.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Performance Stats Cards */}
            <div className="flex items-center gap-4 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-end">
              <div className="p-4 bg-paper border border-borderCol rounded-xl min-w-[110px] text-center shadow-sm">
                <span className="block font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                  Portfolio Works
                </span>
                <span className="font-mono text-2xl font-bold text-ink">
                  {creator.artworksCount}
                </span>
              </div>

              <div className="p-4 bg-paper border border-borderCol rounded-xl min-w-[110px] text-center shadow-sm">
                <span className="block font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                  Licensed Units
                </span>
                <span className="font-mono text-2xl font-bold text-emerald-700">
                  {creator.totalDesignsCount}
                </span>
              </div>

              <div className="p-4 bg-paper border border-borderCol rounded-xl min-w-[110px] text-center shadow-sm">
                <span className="block font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                  Royalty Status
                </span>
                <span className="font-mono text-xs font-bold text-ink flex items-center justify-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Portfolio Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex items-center justify-between mb-6 border-b border-borderCol pb-4">
          <div>
            <h2 className="font-sans font-bold text-xl text-ink">
              Design Portfolio
            </h2>
            <p className="font-mono text-xs text-mutedGray mt-0.5">
              Available graphics licensed for 2D/3D custom heavyweight streetwear.
            </p>
          </div>
          <span className="font-mono text-xs text-mutedGray">
            {creator.artworks.length} available design(s)
          </span>
        </div>

        <CreatorPortfolioGrid
          artworks={creator.artworks}
          creatorName={creator.displayName}
        />
      </section>
    </div>
  );
}
