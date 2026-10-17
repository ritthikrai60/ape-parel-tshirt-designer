import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserJournalData } from '@/lib/journal';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    designDocument: {
      findMany: vi.fn(),
    },
  },
}));

describe('User Journal Service & Aggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates user orders with complete garment specs and transparent pricing', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'usr_collector_01',
      email: 'collector@streetwear.com',
      name: 'Streetwear Collector',
      role: 'CUSTOMER',
    });

    (prisma.order.findMany as any).mockResolvedValue([
      {
        id: 'ord_1001',
        orderNumber: 'APX-ORD-1001',
        createdAt: new Date('2026-10-10T12:00:00Z'),
        status: 'PAYMENT_CONFIRMED',
        garmentCost: 150,
        printingCost: 80,
        licensingCost: 125,
        packagingCost: 15,
        shippingCost: 40,
        totalAmount: 410,
        design: {
          id: 'dsg_2001',
          title: 'Cyberpunk Mascot Drop',
          garmentColorHex: '#131718',
          garmentSize: 'XL',
          garmentFit: 'oversized',
          frontElements: JSON.stringify([{ x: 25, y: 30, width: 40, height: 40, artworkId: 'art_1' }]),
          backElements: JSON.stringify([]),
          garmentProduct: {
            name: 'Heavyweight Streetwear Tee',
            fabric: '100% Combed Cotton (240 GSM)',
          },
        },
        obligations: [
          {
            id: 'ob_1',
            totalAmount: 125,
            artwork: {
              id: 'art_1',
              title: 'Neon Ape Glitch',
              previewUrl: '/uploads/neon-ape.png',
              creator: {
                displayName: 'Dash Ape',
                slug: 'dash-ape',
              },
            },
            licenseOption: {
              terms: 'Standard Garment License',
            },
          },
        ],
      },
    ]);

    (prisma.designDocument.findMany as any).mockResolvedValue([]);

    const journal = await getUserJournalData('collector@streetwear.com');

    expect(journal.totalOrders).toBe(1);
    expect(journal.totalDesigns).toBe(1);
    expect(journal.creatorsSupportedCount).toBe(1);
    expect(journal.totalRoyaltiesPaid).toBe(125);

    const item = journal.items[0];
    expect(item.referenceNumber).toBe('APX-ORD-1001');
    expect(item.garment.name).toBe('Heavyweight Streetwear Tee');
    expect(item.garment.colorHex).toBe('#131718');
    expect(item.garment.size).toBe('XL');
    expect(item.garment.fit).toBe('oversized');

    // Natural Price breakdown
    expect(item.pricing.garmentCost).toBe(150);
    expect(item.pricing.printingCost).toBe(80);
    expect(item.pricing.licensingCost).toBe(125);
    expect(item.pricing.packagingCost).toBe(15);
    expect(item.pricing.shippingCost).toBe(40);
    expect(item.pricing.totalAmount).toBe(410);

    // Certificate of Authenticity (CoA)
    expect(item.certificateOfAuthenticity.certificateId).toMatch(/^COA-/);
    expect(item.certificateOfAuthenticity.verifiedArtists).toContain('Dash Ape');
    expect(item.certificateOfAuthenticity.hashDigest).toMatch(/^SHA256:/);
  });

  it('gracefully handles users with no orders and incorporates saved draft designs', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'usr_new_02',
      email: 'newuser@streetwear.com',
      role: 'CUSTOMER',
    });

    (prisma.order.findMany as any).mockResolvedValue([]);

    (prisma.designDocument.findMany as any).mockResolvedValue([
      {
        id: 'draft_99',
        title: 'Work in Progress Tee',
        garmentColorHex: '#FFFFFF',
        garmentSize: 'M',
        garmentFit: 'boxy',
        frontElements: '[]',
        backElements: '[]',
        createdAt: new Date('2026-10-11T09:00:00Z'),
        status: 'SAVED',
        garmentProduct: {
          name: 'Boxy Vintage Tee',
          fabric: '100% Organic Cotton',
          basePrice: 160,
        },
      },
    ]);

    const journal = await getUserJournalData('newuser@streetwear.com');

    expect(journal.totalOrders).toBe(0);
    expect(journal.totalDesigns).toBe(1);
    expect(journal.items[0].type).toBe('DRAFT');
    expect(journal.items[0].referenceNumber).toBe('DRAFT-DRAFT_99');
    expect(journal.items[0].garment.name).toBe('Boxy Vintage Tee');
    expect(journal.items[0].garment.colorHex).toBe('#FFFFFF');
    expect(journal.items[0].status).toBe('SAVED_DRAFT');
  });

  it('tracks distinct creators supported across multiple orders', async () => {
    (prisma.user.findFirst as any).mockResolvedValue({
      id: 'usr_collector_multi',
      email: 'multi@streetwear.com',
    });

    (prisma.order.findMany as any).mockResolvedValue([
      {
        id: 'ord_1',
        orderNumber: 'APX-ORD-1',
        createdAt: new Date(),
        status: 'DELIVERED',
        garmentCost: 150,
        printingCost: 80,
        licensingCost: 60,
        packagingCost: 15,
        shippingCost: 40,
        totalAmount: 345,
        design: {
          id: 'dsg_1',
          title: 'Design 1',
          garmentColorHex: '#DABA98',
          garmentSize: 'L',
          frontElements: '[]',
          backElements: '[]',
          garmentProduct: { name: 'Standard Tee', fabric: 'Cotton' },
        },
        obligations: [
          {
            id: 'ob_1',
            totalAmount: 60,
            artwork: {
              id: 'art_1',
              title: 'Art 1',
              previewUrl: '/preview1.png',
              creator: { displayName: 'Creator Alpha' },
            },
          },
        ],
      },
      {
        id: 'ord_2',
        orderNumber: 'APX-ORD-2',
        createdAt: new Date(),
        status: 'SHIPPED',
        garmentCost: 150,
        printingCost: 80,
        licensingCost: 80,
        packagingCost: 15,
        shippingCost: 40,
        totalAmount: 365,
        design: {
          id: 'dsg_2',
          title: 'Design 2',
          garmentColorHex: '#F5F0E8',
          garmentSize: 'M',
          frontElements: '[]',
          backElements: '[]',
          garmentProduct: { name: 'Standard Tee', fabric: 'Cotton' },
        },
        obligations: [
          {
            id: 'ob_2',
            totalAmount: 80,
            artwork: {
              id: 'art_2',
              title: 'Art 2',
              previewUrl: '/preview2.png',
              creator: { displayName: 'Creator Beta' },
            },
          },
        ],
      },
    ]);

    (prisma.designDocument.findMany as any).mockResolvedValue([]);

    const journal = await getUserJournalData('multi@streetwear.com');

    expect(journal.totalOrders).toBe(2);
    expect(journal.creatorsSupportedCount).toBe(2);
    expect(journal.totalRoyaltiesPaid).toBe(140);
  });
});
