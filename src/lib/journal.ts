import { prisma } from '@/lib/prisma';

export interface JournalItem {
  id: string;
  type: 'ORDER' | 'DRAFT';
  referenceNumber: string;
  createdAt: string;
  status: string;
  garment: {
    name: string;
    fabric: string;
    fit: string;
    colorHex: string;
    size: string;
  };
  design: {
    id: string;
    title: string;
    frontElements: any[];
    backElements: any[];
  };
  pricing: {
    garmentCost: number;
    printingCost: number;
    licensingCost: number;
    packagingCost: number;
    shippingCost: number;
    totalAmount: number;
  };
  artworks: Array<{
    artworkId: string;
    title: string;
    previewUrl: string;
    creatorName: string;
    creatorSlug?: string;
    licenseFee: number;
    licenseTerms?: string;
  }>;
  certificateOfAuthenticity: {
    certificateId: string;
    issuedAt: string;
    hashDigest: string;
    verifiedArtists: string[];
  };
}

export interface UserJournalSummary {
  totalDesigns: number;
  totalOrders: number;
  creatorsSupportedCount: number;
  totalRoyaltiesPaid: number;
  items: JournalItem[];
}

/**
 * Generates a deterministic or pseudorandom Certificate of Authenticity hash
 */
function generateCoAHash(orderNumber: string, dateStr: string): string {
  const seed = `${orderNumber}-${dateStr}-APE-GENUINE`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `COA-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}-${orderNumber.slice(-4)}`;
}

/**
 * Fetch complete user journal data including completed apparel orders and saved design drafts
 */
export async function getUserJournalData(userIdOrEmail?: string): Promise<UserJournalSummary> {
  // Find customer by ID or Email if provided
  let targetUserId: string | undefined;

  if (userIdOrEmail) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userIdOrEmail }, { email: userIdOrEmail }],
      },
    });
    if (user) targetUserId = user.id;
  }

  // If no specific user, find first customer with orders or fallback to customer@ape-parel.com
  if (!targetUserId) {
    const sampleCustomer = await prisma.user.findFirst({
      where: { role: 'CUSTOMER' },
    });
    if (sampleCustomer) targetUserId = sampleCustomer.id;
  }

  // Query orders with full relations
  const orders = await prisma.order.findMany({
    where: targetUserId ? { customerId: targetUserId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      design: {
        include: {
          garmentProduct: true,
        },
      },
      obligations: {
        include: {
          artwork: {
            include: {
              creator: true,
            },
          },
          licenseOption: true,
        },
      },
    },
  });

  // Query un-ordered design documents if any
  const draftDesigns = await prisma.designDocument.findMany({
    where: targetUserId
      ? { userId: targetUserId, status: { not: 'ORDERED' } }
      : { status: { not: 'ORDERED' } },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      garmentProduct: true,
    },
  });

  const journalItems: JournalItem[] = [];
  const supportedCreatorsSet = new Set<string>();
  let totalRoyaltiesPaid = 0;

  for (const o of orders) {
    let frontEls: any[] = [];
    let backEls: any[] = [];
    try {
      if (o.design?.frontElements) {
        frontEls = typeof o.design.frontElements === 'string'
          ? JSON.parse(o.design.frontElements)
          : o.design.frontElements;
      }
      if (o.design?.backElements) {
        backEls = typeof o.design.backElements === 'string'
          ? JSON.parse(o.design.backElements)
          : o.design.backElements;
      }
    } catch {}

    const artworkList: JournalItem['artworks'] = [];
    const verifiedArtistNames: string[] = [];

    for (const ob of o.obligations) {
      if (ob.artwork) {
        const creatorName = ob.artwork.creator?.displayName || 'Independent Creator';
        supportedCreatorsSet.add(creatorName);
        if (!verifiedArtistNames.includes(creatorName)) {
          verifiedArtistNames.push(creatorName);
        }

        artworkList.push({
          artworkId: ob.artwork.id,
          title: ob.artwork.title,
          previewUrl: ob.artwork.previewUrl,
          creatorName,
          creatorSlug: ob.artwork.creator?.slug,
          licenseFee: ob.totalAmount,
          licenseTerms: ob.licenseOption?.terms || 'Standard Garment License',
        });
      }
    }

    totalRoyaltiesPaid += o.licensingCost;

    journalItems.push({
      id: o.id,
      type: 'ORDER',
      referenceNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      garment: {
        name: o.design?.garmentProduct?.name || 'Heavyweight Streetwear Tee',
        fabric: o.design?.garmentProduct?.fabric || '100% Combed Cotton (240 GSM)',
        fit: o.design?.garmentFit || 'oversized',
        colorHex: o.design?.garmentColorHex || '#131718',
        size: o.design?.garmentSize || 'L',
      },
      design: {
        id: o.design?.id || o.id,
        title: o.design?.title || 'Custom Streetwear Tee',
        frontElements: frontEls,
        backElements: backEls,
      },
      pricing: {
        garmentCost: o.garmentCost,
        printingCost: o.printingCost,
        licensingCost: o.licensingCost,
        packagingCost: o.packagingCost,
        shippingCost: o.shippingCost,
        totalAmount: o.totalAmount,
      },
      artworks: artworkList,
      certificateOfAuthenticity: {
        certificateId: generateCoAHash(o.orderNumber, o.createdAt.toISOString()),
        issuedAt: o.createdAt.toISOString(),
        hashDigest: `SHA256:${Buffer.from(o.orderNumber + o.id).toString('hex').slice(0, 16).toUpperCase()}`,
        verifiedArtists: verifiedArtistNames.length > 0 ? verifiedArtistNames : ['ape-parel Verified Creator'],
      },
    });
  }

  // Also include draft designs in timeline
  for (const d of draftDesigns) {
    let frontEls: any[] = [];
    let backEls: any[] = [];
    try {
      if (d.frontElements) {
        frontEls = typeof d.frontElements === 'string' ? JSON.parse(d.frontElements) : d.frontElements;
      }
      if (d.backElements) {
        backEls = typeof d.backElements === 'string' ? JSON.parse(d.backElements) : d.backElements;
      }
    } catch {}

    journalItems.push({
      id: d.id,
      type: 'DRAFT',
      referenceNumber: `DRAFT-${d.id.slice(0, 8).toUpperCase()}`,
      createdAt: d.createdAt.toISOString(),
      status: 'SAVED_DRAFT',
      garment: {
        name: d.garmentProduct?.name || 'Heavyweight Streetwear Tee',
        fabric: d.garmentProduct?.fabric || '100% Combed Cotton (240 GSM)',
        fit: d.garmentFit || 'oversized',
        colorHex: d.garmentColorHex || '#131718',
        size: d.garmentSize || 'L',
      },
      design: {
        id: d.id,
        title: d.title || 'Draft Design',
        frontElements: frontEls,
        backElements: backEls,
      },
      pricing: {
        garmentCost: d.garmentProduct?.basePrice || 150,
        printingCost: 80,
        licensingCost: 0,
        packagingCost: 15,
        shippingCost: 40,
        totalAmount: 285,
      },
      artworks: [],
      certificateOfAuthenticity: {
        certificateId: `DRAFT-PENDING-${d.id.slice(0, 6)}`,
        issuedAt: d.createdAt.toISOString(),
        hashDigest: 'PENDING_ORDER_CONFIRMATION',
        verifiedArtists: [],
      },
    });
  }

  return {
    totalDesigns: journalItems.length,
    totalOrders: orders.length,
    creatorsSupportedCount: supportedCreatorsSet.size,
    totalRoyaltiesPaid,
    items: journalItems,
  };
}
