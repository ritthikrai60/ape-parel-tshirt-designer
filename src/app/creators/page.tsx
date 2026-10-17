import React from 'react';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import CreatorsCatalogClient, { CreatorDirectoryDTO } from '@/components/creators/CreatorsCatalogClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creators & Studios Directory | ape-parel Streetwear Ecosystem',
  description:
    'Explore authentic streetwear graphic creators, brutalist typography studios, and underground illustrators. Discover original artwork ready for custom apparel printing.',
};

// Resilient fallback creators if database query is empty or unseeded
const FALLBACK_CREATORS: CreatorDirectoryDTO[] = [
  {
    id: 'creator-dash-ape',
    slug: 'dash-ape',
    displayName: 'Dash Ape Studio',
    bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
    avatarUrl: '/uploads/avatars/dash_ape_avatar.png',
    website: 'https://dashape.design',
    badgeVerified: true,
    specialties: ['MASCOT', 'LOGO'],
    artworksCount: 8,
    previewArtworks: [
      {
        id: 'art-dash-ape-running-blk',
        title: 'Dash Ape Running (Black)',
        previewUrl: '/uploads/artworks/dashape/APE RUNNING BLK.png',
        category: 'MASCOT',
      },
      {
        id: 'art-dash-ape-logo-colored',
        title: 'Dash Ape Signature Logo (Full Color)',
        previewUrl: '/uploads/artworks/dashape/DASH APE LOGO COLORED.png',
        category: 'LOGO',
      },
      {
        id: 'art-dash-ape-da',
        title: 'Dash Ape DA Monogram',
        previewUrl: '/uploads/artworks/dashape/DASH APE DA.png',
        category: 'LOGO',
      },
    ],
  },
  {
    id: 'creator-jtact-dev',
    slug: 'jtact-dev',
    displayName: 'JTACT DEV',
    bio: 'Tactical Norse & Modern Military Streetwear Graphics. Specialized in high-threat apparel art.',
    avatarUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
    website: 'https://jtact.dev',
    badgeVerified: true,
    specialties: ['LOGO', 'ILLUSTRATION'],
    artworksCount: 5,
    previewArtworks: [
      {
        id: 'art-jtact-1',
        title: 'JTAC Dev Group - Viking NVG Badge (Dark)',
        previewUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
        category: 'LOGO',
      },
      {
        id: 'art-jtact-3',
        title: 'Tactical Valkyrie - Modern Warfare Stance',
        previewUrl: '/uploads/artworks/jtact_tactical_valkyrie_full.png',
        category: 'ILLUSTRATION',
      },
    ],
  },
  {
    id: 'creator-cyber-monk',
    slug: 'cyber-monk',
    displayName: 'Cyber Monk',
    bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    website: 'https://cybermonk.art',
    badgeVerified: true,
    specialties: ['PATTERN', 'TYPOGRAPHY'],
    artworksCount: 2,
    previewArtworks: [
      {
        id: 'art-static-glitch',
        title: 'Static Glitch Protocol',
        previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
        category: 'PATTERN',
      },
      {
        id: 'art-neo-shibuya',
        title: 'Neo Shibuya Heavy Kanji',
        previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
        category: 'TYPOGRAPHY',
      },
    ],
  },
  {
    id: 'creator-soma-botanica',
    slug: 'soma-botanica',
    displayName: 'Soma Botanica',
    bio: 'Experimental botanical drawings meets modern industrial streetwear framing.',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    website: 'https://somabotanica.art',
    badgeVerified: true,
    specialties: ['ILLUSTRATION'],
    artworksCount: 1,
    previewArtworks: [
      {
        id: 'art-bonsai-core',
        title: 'Bonsai Core Brutalism',
        previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
        category: 'ILLUSTRATION',
      },
    ],
  },
];

export default async function CreatorsDirectoryPage() {
  let creators: CreatorDirectoryDTO[] = [];

  try {
    const profiles = await prisma.creatorProfile.findMany({
      where: {
        artworks: {
          some: {
            status: 'PUBLISHED',
            moderationStatus: 'APPROVED',
          },
        },
      },
      include: {
        storefrontSettings: true,
        artworks: {
          where: {
            status: 'PUBLISHED',
            moderationStatus: 'APPROVED',
          },
          select: {
            id: true,
            title: true,
            category: true,
            previewUrl: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    if (profiles && profiles.length > 0) {
      creators = profiles.map((p) => {
        const specialties = Array.from(
          new Set(p.artworks.map((a) => (a.category || 'ILLUSTRATION').toUpperCase()))
        );

        return {
          id: p.id,
          slug: p.slug,
          displayName: p.displayName,
          bio: p.bio,
          avatarUrl: p.avatarUrl || p.storefrontSettings?.avatarUrl || null,
          website: p.website,
          badgeVerified: Boolean(p.storefrontSettings?.badgeVerified),
          specialties,
          artworksCount: p.artworks.length,
          previewArtworks: p.artworks.map((a) => ({
            id: a.id,
            title: a.title,
            previewUrl: a.previewUrl,
            category: a.category,
          })),
        };
      });
    }
  } catch (error) {
    console.error('[CreatorsDirectoryPage] Database query error:', error);
  }

  // Use resilient fallback if empty
  if (creators.length === 0) {
    creators = FALLBACK_CREATORS;
  }

  return <CreatorsCatalogClient initialCreators={creators} />;
}
