import { prisma } from '@/lib/prisma';
import { AgreementSnapshot } from '@/lib/licenseAgreement';

export interface UserVaultPermanentItem {
  id: string;
  artworkId: string;
  title: string;
  previewUrl: string;
  category: string;
  creatorName: string;
  creatorSlug: string;
  certificateNumber: string;
  acquiredAt: string;
  status: string;
  agreementSnapshot: AgreementSnapshot | null;
  sha256Hash: string;
  licenseOptionId: string;
}

export interface UserVaultWishlistItem {
  id: string;
  artworkId: string;
  title: string;
  previewUrl: string;
  category: string;
  creatorName: string;
  creatorSlug: string;
  standardPrice: number;
  licenseOptionId: string;
  savedAt: string;
}

export interface UserVaultData {
  permanentIps: UserVaultPermanentItem[];
  wishlist: UserVaultWishlistItem[];
}

/**
 * Fetch all Permanent IPs and Wishlist artworks owned by the user
 */
export async function getUserVaultData(userId: string): Promise<UserVaultData> {
  const [licenses, favorites] = await Promise.all([
    prisma.userArtworkLicense.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { acquiredAt: 'desc' },
      include: {
        artwork: {
          include: {
            creator: { select: { id: true, displayName: true, slug: true } },
            licenseOptions: true,
          },
        },
      },
    }),
    prisma.artworkFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        artwork: {
          include: {
            creator: { select: { id: true, displayName: true, slug: true } },
            licenseOptions: true,
          },
        },
      },
    }),
  ]);

  const permanentIps: UserVaultPermanentItem[] = licenses.map((lic) => {
    let snapshot: AgreementSnapshot | null = null;
    try {
      snapshot = JSON.parse(lic.agreementSnapshot);
    } catch {}

    return {
      id: lic.id,
      artworkId: lic.artworkId,
      title: lic.artwork.title,
      previewUrl: lic.artwork.previewUrl,
      category: lic.artwork.category,
      creatorName: lic.artwork.creator.displayName,
      creatorSlug: lic.artwork.creator.slug,
      certificateNumber: lic.certificateNumber,
      acquiredAt: lic.acquiredAt.toISOString(),
      status: lic.status,
      agreementSnapshot: snapshot,
      sha256Hash: lic.sha256Hash,
      licenseOptionId: lic.licenseOptionId,
    };
  });

  const wishlist: UserVaultWishlistItem[] = favorites.map((fav) => {
    const stdOption = fav.artwork.licenseOptions[0];
    return {
      id: fav.id,
      artworkId: fav.artworkId,
      title: fav.artwork.title,
      previewUrl: fav.artwork.previewUrl,
      category: fav.artwork.category,
      creatorName: fav.artwork.creator.displayName,
      creatorSlug: fav.artwork.creator.slug,
      standardPrice: stdOption?.price || 40,
      licenseOptionId: stdOption?.id || '',
      savedAt: fav.createdAt.toISOString(),
    };
  });

  return {
    permanentIps,
    wishlist,
  };
}

/**
 * Toggle favorite status of an artwork for a user
 */
export async function toggleArtworkFavorite(userId: string, artworkId: string) {
  const existing = await prisma.artworkFavorite.findUnique({
    where: {
      userId_artworkId: {
        userId,
        artworkId,
      },
    },
  });

  if (existing) {
    await prisma.artworkFavorite.delete({
      where: { id: existing.id },
    });
    return { isFavorited: false };
  } else {
    await prisma.artworkFavorite.create({
      data: {
        userId,
        artworkId,
      },
    });
    return { isFavorited: true };
  }
}

/**
 * Get set of favorited artwork IDs for a user
 */
export async function getUserFavoriteArtworkIds(userId?: string): Promise<string[]> {
  if (!userId) return [];
  const favorites = await prisma.artworkFavorite.findMany({
    where: { userId },
    select: { artworkId: true },
  });
  return favorites.map((f) => f.artworkId);
}

/**
 * Get set of Permanent IP artwork IDs for a user
 */
export async function getUserPermanentIpArtworkIds(userId?: string): Promise<string[]> {
  if (!userId) return [];
  const licenses = await prisma.userArtworkLicense.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { artworkId: true },
  });
  return licenses.map((l) => l.artworkId);
}

/**
 * Get count of favorites for multiple artworks in batch
 */
export async function getArtworksFavoriteCountBatch(artworkIds: string[]): Promise<Record<string, number>> {
  if (artworkIds.length === 0) return {};
  const favorites = await prisma.artworkFavorite.groupBy({
    by: ['artworkId'],
    where: { artworkId: { in: artworkIds } },
    _count: { userId: true },
  });
  const map: Record<string, number> = {};
  for (const f of favorites) {
    map[f.artworkId] = f._count.userId;
  }
  return map;
}
