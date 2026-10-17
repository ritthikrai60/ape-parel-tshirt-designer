import { prisma } from '@/lib/prisma';

export interface SubmitArtworkReviewInput {
  userId: string;
  artworkId: string;
  orderId?: string;
  rating: number; // 1 to 5
  comment?: string;
}

/**
 * Submit an artwork review from a verified buyer or owner
 */
export async function submitArtworkReview(input: SubmitArtworkReviewInput) {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  // 1. Verification Guard: User must have an order with this artwork or own Permanent IP
  const [hasDeliveredOrder, hasPermanentIp] = await Promise.all([
    prisma.order.findFirst({
      where: {
        customerId: input.userId,
        status: { in: ['DELIVERED', 'SHIPPED', 'IN_PRODUCTION', 'PAYMENT_CONFIRMED'] },
        obligations: {
          some: {
            artworkId: input.artworkId,
          },
        },
      },
    }),
    prisma.userArtworkLicense.findUnique({
      where: {
        userId_artworkId: {
          userId: input.userId,
          artworkId: input.artworkId,
        },
      },
    }),
  ]);

  if (!hasDeliveredOrder && !hasPermanentIp) {
    throw new Error(
      'เฉพาะผู้ที่เคยสั่งซื้อผลงานนี้หรือถือครองลิขสิทธิ์ถาวร (Permanent IP) เท่านั้นที่สามารถรีวิวได้'
    );
  }

  // Upsert review (1 review per user per artwork)
  const existing = await prisma.artworkReview.findFirst({
    where: {
      userId: input.userId,
      artworkId: input.artworkId,
    },
  });

  if (existing) {
    return await prisma.artworkReview.update({
      where: { id: existing.id },
      data: {
        rating,
        comment: input.comment || null,
        orderId: input.orderId || existing.orderId,
      },
    });
  }

  return await prisma.artworkReview.create({
    data: {
      userId: input.userId,
      artworkId: input.artworkId,
      orderId: input.orderId || null,
      rating,
      comment: input.comment || null,
    },
  });
}

/**
 * Get aggregate rating and reviews for an artwork
 */
export async function getArtworkReviewsAndRating(artworkId: string) {
  const [reviews, aggregate] = await Promise.all([
    prisma.artworkReview.findMany({
      where: { artworkId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      take: 20,
    }),
    prisma.artworkReview.aggregate({
      where: { artworkId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const averageRating = aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 5.0;
  const reviewCount = aggregate._count.rating || 0;

  return {
    averageRating,
    reviewCount,
    reviews,
  };
}

/**
 * Batch fetch rating stats for multiple artworks
 */
export async function getArtworksRatingBatch(artworkIds: string[]) {
  if (artworkIds.length === 0) return {};

  const reviews = await prisma.artworkReview.groupBy({
    by: ['artworkId'],
    where: { artworkId: { in: artworkIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const map: Record<string, { averageRating: number; reviewCount: number }> = {};
  for (const r of reviews) {
    map[r.artworkId] = {
      averageRating: r._avg.rating ? Number(r._avg.rating.toFixed(1)) : 5.0,
      reviewCount: r._count.rating,
    };
  }
  return map;
}

export interface SubmitSupplierReviewInput {
  userId: string;
  orderId: string;
  rating: number; // 1 to 5
  comment?: string;
}

/**
 * Submit a supplier review upon order delivery
 */
export async function submitSupplierReview(input: SubmitSupplierReviewInput) {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  // Verify that the order exists, belongs to user, and is DELIVERED
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { supplier: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${input.orderId}`);
  }

  if (order.customerId && order.customerId !== input.userId) {
    throw new Error('Unauthorized: order does not belong to this user.');
  }

  if (order.status !== 'DELIVERED') {
    throw new Error('สามารถให้คะแนนและรีวิวโรงงานผู้ผลิตได้หลังจากสินค้าจัดส่งสำเร็จ (DELIVERED) แล้วเท่านั้น');
  }

  // Create or update review (unique on orderId)
  return await prisma.supplierReview.upsert({
    where: { orderId: order.id },
    update: {
      rating,
      comment: input.comment || null,
    },
    create: {
      supplierId: order.supplierId,
      userId: input.userId,
      orderId: order.id,
      rating,
      comment: input.comment || null,
    },
  });
}

/**
 * Get aggregate rating and reviews for a supplier
 */
export async function getSupplierReviewsAndRating(supplierId: string) {
  const [reviews, aggregate] = await Promise.all([
    prisma.supplierReview.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      take: 20,
    }),
    prisma.supplierReview.aggregate({
      where: { supplierId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  const averageRating = aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 5.0;
  const reviewCount = aggregate._count.rating || 0;

  return {
    averageRating,
    reviewCount,
    reviews,
  };
}

/**
 * Batch fetch rating stats for multiple suppliers
 */
export async function getSuppliersRatingBatch(supplierIds: string[]) {
  if (supplierIds.length === 0) return {};

  const reviews = await prisma.supplierReview.groupBy({
    by: ['supplierId'],
    where: { supplierId: { in: supplierIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const map: Record<string, { averageRating: number; reviewCount: number }> = {};
  for (const r of reviews) {
    map[r.supplierId] = {
      averageRating: r._avg.rating ? Number(r._avg.rating.toFixed(1)) : 5.0,
      reviewCount: r._count.rating,
    };
  }
  return map;
}
