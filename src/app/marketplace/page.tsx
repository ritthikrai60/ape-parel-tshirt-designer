import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getArtworksRatingBatch } from '@/lib/reviews';
import {
  getArtworksFavoriteCountBatch,
  getUserFavoriteArtworkIds,
  getUserPermanentIpArtworkIds,
} from '@/lib/vault';
import { MarketplaceArtworkDTO } from '@/components/marketplace/ArtworkCard';
import { MarketplaceCatalog } from '@/components/marketplace/CategoryFilter';
import { HeroBanner } from '@/components/marketplace/HeroBanner';
import { FeaturedCarousel } from '@/components/marketplace/FeaturedCarousel';
import { LatestArtSection } from '@/components/marketplace/LatestArtSection';
import { CreatorSpotlight } from '@/components/marketplace/CreatorSpotlight';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace | ape-parel Apparel Design & Production',
  description:
    'Discover authentic creator graphics, badges, kanji typography, and mascots. License designs directly for custom heavyweight apparel with verified royalties.',
};

// Fallback artworks matching benchmark seed data if database is unseeded
const FALLBACK_ARTWORKS: MarketplaceArtworkDTO[] = [
  {
    id: 'art-dash-ape-running-blk',
    title: 'Dash Ape Running (Black)',
    description: 'Dynamic sprinting Dash Ape mascot in solid bold black silhouette.',
    category: 'MASCOT',
    previewUrl: '/uploads/artworks/dashape/APE RUNNING BLK.png',
    mimeType: 'image/png',
    tags: 'mascot,dashape,running,black,streetwear,athletic',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-dash-ape',
      displayName: 'Dash Ape Studio',
      slug: 'dash-ape',
      avatarUrl: '/uploads/avatars/dash_ape_avatar.png',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
    },
    baseLicensePrice: 40,
    licenseOptions: [
      {
        id: 'lic-dash-ape-running-blk',
        name: 'Standard Apparel License',
        price: 40,
        commercialUse: true,
        scope: 'PER_GARMENT',
        terms: 'Single production unit print license with creator attribution.',
      },
    ],
  },
  {
    id: 'art-dash-ape-logo-colored',
    title: 'Dash Ape Signature Logo (Full Color)',
    description: 'Official full-color Dash Ape emblem with vibrant street branding.',
    category: 'LOGO',
    previewUrl: '/uploads/artworks/dashape/DASH APE LOGO COLORED.png',
    mimeType: 'image/png',
    tags: 'logo,dashape,full-color,signature,streetwear,badge',
    createdAt: new Date().toISOString(),
    creator: {
      id: 'creator-dash-ape',
      displayName: 'Dash Ape Studio',
      slug: 'dash-ape',
      avatarUrl: '/uploads/avatars/dash_ape_avatar.png',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
    },
    baseLicensePrice: 50,
    licenseOptions: [
      {
        id: 'lic-dash-ape-logo-colored',
        name: 'Standard Apparel License',
        price: 50,
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

  let currentUserId: string | undefined;
  try {
    const session = await auth();
    if (session?.user?.id) {
      currentUserId = session.user.id;
    }
  } catch {}

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
      const artIds = dbArtworks.map((a) => a.id);
      const [ratingsBatch, favoritesBatch, userFavIds, userPermIds] = await Promise.all([
        getArtworksRatingBatch(artIds),
        getArtworksFavoriteCountBatch(artIds),
        getUserFavoriteArtworkIds(currentUserId),
        getUserPermanentIpArtworkIds(currentUserId),
      ]);

      const userFavSet = new Set(userFavIds);
      const userPermSet = new Set(userPermIds);

      artworks = dbArtworks.map((a) => {
        const prices = a.licenseOptions.map((l) => l.price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 40;
        const ratingInfo = ratingsBatch[a.id];
        const favCount = favoritesBatch[a.id] || 0;

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
          averageRating: ratingInfo?.averageRating ?? 5.0,
          reviewCount: ratingInfo?.reviewCount ?? 0,
          favoriteCount: favCount,
          isFavorited: userFavSet.has(a.id),
          isPermanentIp: userPermSet.has(a.id),
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

  // Fetch dynamic CMS Hero Banner if active
  let activeBanner = null;
  try {
    activeBanner = await prisma.marketplaceBanner.findFirst({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  } catch (err) {
    console.error('[MarketplacePage] Banner fetch error:', err);
  }

  // Derived stats
  const totalArtworks = artworks.length;
  const uniqueCreatorIds = new Set(artworks.map((a) => a.creator.id));
  const totalCreators = uniqueCreatorIds.size;
  const totalLicenses = artworks.reduce((sum, a) => sum + a.licenseOptions.length, 0);

  // Featured artwork = first (most recent) or highest-priced
  const featuredArtwork = artworks[0] ?? null;

  // Trending = up to 8 artworks for carousel
  const trendingArtworks = artworks.slice(0, 8);

  // Latest Art = sorted by newest createdAt first (up to 8 artworks)
  const latestArtworks = [...artworks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="flex-1 flex flex-col w-full bg-paper">
      {/* ── Hero Banner ── */}
      <HeroBanner
        featuredArtwork={featuredArtwork}
        totalArtworks={totalArtworks}
        totalCreators={totalCreators}
        totalLicenses={totalLicenses}
        campaignBanner={activeBanner}
      />

      {/* ── Featured / Trending Carousel ── */}
      <FeaturedCarousel artworks={trendingArtworks} />

      {/* ── Latest Art Showcase ── */}
      <LatestArtSection artworks={latestArtworks} />

      {/* ── Creator Spotlight ── */}
      <CreatorSpotlight artworks={artworks} />

      {/* ── Full Catalog with Filters ── */}
      <MarketplaceCatalog initialArtworks={artworks} />
    </div>
  );
}
