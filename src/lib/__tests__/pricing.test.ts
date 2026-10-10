import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { PricingPayload } from '@/lib/types';

describe('Authoritative Server-Side Pricing Engine (pricing.ts)', () => {
  let garmentApex: {
    id: string;
    sku: string;
    basePrice: number;
    packagingPrice: number;
    shippingPrice: number;
    variants: Array<{ id: string; sku: string }>;
  };
  let licDashApe40: { id: string; artworkId: string; price: number };
  let licCyberPrimate60: { id: string; artworkId: string; price: number };
  let licStaticGlitch25: { id: string; artworkId: string; price: number };
  let artDashApe: { id: string; title: string };
  let artCyberPrimate: { id: string; title: string };
  let artStaticGlitch: { id: string; title: string };

  beforeAll(async () => {
    // 1. Fetch benchmark garment APX-HVY-001
    const garment = await prisma.garmentProduct.findUnique({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: {
          include: {
            printingServices: true,
          },
        },
      },
    });

    if (!garment) {
      throw new Error(
        'Seed data missing: Garment APX-HVY-001 not found. Run "npm run db:seed" first.'
      );
    }
    garmentApex = garment;

    // 2. Fetch benchmark artworks and license options
    const art1 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Dash Ape Classic' } },
      include: { licenseOptions: true },
    });
    const art2 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Cyber Primate' } },
      include: { licenseOptions: true },
    });
    const art3 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Static Glitch' } },
      include: { licenseOptions: true },
    });

    if (!art1 || !art2 || !art3) {
      throw new Error(
        'Seed data missing: Benchmark artworks not found. Run "npm run db:seed" first.'
      );
    }

    artDashApe = art1;
    artCyberPrimate = art2;
    artStaticGlitch = art3;

    const l1 = art1.licenseOptions.find((l) => l.price === 40);
    const l2 = art2.licenseOptions.find((l) => l.price === 60);
    const l3 = art3.licenseOptions.find((l) => l.price === 25);

    if (!l1 || !l2 || !l3) {
      throw new Error(
        'Seed data missing: Benchmark license options (THB 40, 60, 25) not found.'
      );
    }

    licDashApe40 = l1;
    licCyberPrimate60 = l2;
    licStaticGlitch25 = l3;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Exact THB 410 Benchmark Verification', () => {
    it('calculates exactly THB 410 for 1 unit of APX-HVY-001 with 1-surface DTG and 3 licenses (40 + 60 + 25)', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
            licenseOptionId: licDashApe40.id,
          },
          {
            artworkId: artCyberPrimate.id,
            licenseOptionId: licCyberPrimate60.id,
          },
          {
            artworkId: artStaticGlitch.id,
            licenseOptionId: licStaticGlitch25.id,
          },
        ],
        backArtworkLicenses: [],
        sideArtworkLicenses: [],
      };

      const result = await calculateLivePricing(payload);

      // Total Cost Assertion: 150 + 80 + 15 + 40 + 125 = 410 THB
      expect(result.totalAmount).toBe(410);

      // Itemized Subtotal Assertions
      expect(result.garmentCost).toBe(150);
      expect(result.printingCost).toBe(80);
      expect(result.packagingCost).toBe(15);
      expect(result.shippingCost).toBe(40);
      expect(result.licensingCost).toBe(125);
      expect(result.quantity).toBe(1);

      // Surface Configuration
      expect(result.surfacesUsed).toEqual(['FRONT']);
      expect(result.breakdown.surfacesCount).toBe(1);
      expect(result.breakdown.printPricePerSurface).toBe(80);

      // Unit Base Rates Breakdown
      expect(result.breakdown.garmentBasePrice).toBe(150);
      expect(result.breakdown.packagingPerUnit).toBe(15);
      expect(result.breakdown.shippingBase).toBe(40);

      // Artwork License Breakdown
      expect(result.breakdown.artworkLicenses).toHaveLength(3);
      expect(result.breakdown.artworkLicenses).toEqual([
        expect.objectContaining({
          artworkId: artDashApe.id,
          title: expect.stringContaining('Dash Ape Classic'),
          unitPrice: 40,
          totalPrice: 40,
        }),
        expect.objectContaining({
          artworkId: artCyberPrimate.id,
          title: expect.stringContaining('Cyber Primate'),
          unitPrice: 60,
          totalPrice: 60,
        }),
        expect.objectContaining({
          artworkId: artStaticGlitch.id,
          title: expect.stringContaining('Static Glitch'),
          unitPrice: 25,
          totalPrice: 25,
        }),
      ]);
    });
  });

  describe('2. Quantity Scaling Verification', () => {
    it('scales linearly for 3 units to exactly THB 1150 (flat shipping, per-unit garment, print, pack, licenses)', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 3,
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
            licenseOptionId: licDashApe40.id,
          },
          {
            artworkId: artCyberPrimate.id,
            licenseOptionId: licCyberPrimate60.id,
          },
          {
            artworkId: artStaticGlitch.id,
            licenseOptionId: licStaticGlitch25.id,
          },
        ],
      };

      const result = await calculateLivePricing(payload);

      // Math: Garment (150*3=450) + Print (80*3=240) + Pack (15*3=45) + Ship (flat 40) + Lic (125*3=375) = 1150 THB
      expect(result.garmentCost).toBe(450);
      expect(result.printingCost).toBe(240);
      expect(result.packagingCost).toBe(45);
      expect(result.shippingCost).toBe(40); // Flat per shipment
      expect(result.licensingCost).toBe(375);
      expect(result.totalAmount).toBe(1150);
      expect(result.quantity).toBe(3);

      // Verify per-item totals in license breakdown
      expect(result.breakdown.artworkLicenses[0].totalPrice).toBe(120); // 40 * 3
      expect(result.breakdown.artworkLicenses[1].totalPrice).toBe(180); // 60 * 3
      expect(result.breakdown.artworkLicenses[2].totalPrice).toBe(75);  // 25 * 3
    });

    it('normalizes non-positive or float quantities correctly', async () => {
      // Quantity 0 defaults to 1
      const zeroQtyResult = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 0,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
      });
      expect(zeroQtyResult.quantity).toBe(1);

      // Float quantity 3.8 floors to 3
      const floatQtyResult = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 3.8,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });
      expect(floatQtyResult.quantity).toBe(3);
      expect(floatQtyResult.totalAmount).toBe(1150);
    });
  });

  describe('3. Multi-Surface Printing Verification', () => {
    it('calculates dual-surface printing (FRONT + BACK = THB 160 print cost)', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        backArtworkLicenses: [
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        sideArtworkLicenses: [],
      };

      const result = await calculateLivePricing(payload);

      // Dual Surface Printing: 80 * 2 surfaces * 1 unit = 160 THB
      expect(result.printingCost).toBe(160);
      expect(result.surfacesUsed).toEqual(['FRONT', 'BACK']);
      expect(result.breakdown.surfacesCount).toBe(2);

      // Total: Garment (150) + Print (160) + Pack (15) + Ship (40) + Lic (40+60=100) = 465 THB
      expect(result.garmentCost).toBe(150);
      expect(result.licensingCost).toBe(100);
      expect(result.totalAmount).toBe(465);
    });

    it('calculates triple-surface printing (FRONT + BACK + SIDE = THB 240 print cost)', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        backArtworkLicenses: [
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        sideArtworkLicenses: [
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      };

      const result = await calculateLivePricing(payload);

      // Triple Surface: 80 * 3 surfaces * 1 unit = 240 THB
      expect(result.printingCost).toBe(240);
      expect(result.surfacesUsed).toEqual(['FRONT', 'BACK', 'SIDE']);
      expect(result.breakdown.surfacesCount).toBe(3);
      // Total: Garment (150) + Print (240) + Pack (15) + Ship (40) + Lic (125) = 570 THB
      expect(result.totalAmount).toBe(570);
    });
  });

  describe('4. Error Handling and Defensive Validations', () => {
    it('throws error when garmentProductId does not exist', async () => {
      const payload: PricingPayload = {
        garmentProductId: 'non-existent-garment-cuid-999',
        quantity: 1,
      };

      await expect(calculateLivePricing(payload)).rejects.toThrow(
        /garment product not found/i
      );
    });

    it('throws error when licenseOptionId is invalid or does not exist', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
            licenseOptionId: 'non-existent-license-opt-cuid-888',
          },
        ],
      };

      await expect(calculateLivePricing(payload)).rejects.toThrow(
        /license option not found/i
      );
    });

    it('throws error when licenseOptionId does not belong to the claimed artworkId', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: artCyberPrimate.id, // Mismatched artwork
            licenseOptionId: licDashApe40.id, // Belongs to Dash Ape
          },
        ],
      };

      await expect(calculateLivePricing(payload)).rejects.toThrow(
        /does not belong to artwork/i
      );
    });

    it('throws error when garmentVariantId is provided but invalid', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        garmentVariantId: 'invalid-variant-cuid-777',
        quantity: 1,
      };

      await expect(calculateLivePricing(payload)).rejects.toThrow(
        /garment variant not found/i
      );
    });
  });

  describe('5. Baseline & Variant Adjustments', () => {
    it('calculates correctly for a blank garment with zero artworks (default single surface print)', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
      };

      const result = await calculateLivePricing(payload);

      // Blank garment: Garment (150) + Default Front Print (80) + Pack (15) + Ship (40) + Lic (0) = 285 THB
      expect(result.garmentCost).toBe(150);
      expect(result.printingCost).toBe(80);
      expect(result.packagingCost).toBe(15);
      expect(result.shippingCost).toBe(40);
      expect(result.licensingCost).toBe(0);
      expect(result.totalAmount).toBe(285);
      expect(result.surfacesUsed).toEqual([]);
      expect(result.breakdown.artworkLicenses).toHaveLength(0);
    });

    it('handles valid garment variant without price adjustment correctly', async () => {
      const validVariant = garmentApex.variants[0];
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        garmentVariantId: validVariant.id,
        quantity: 1,
      };

      const result = await calculateLivePricing(payload);
      expect(result.garmentCost).toBe(150);
      expect(result.totalAmount).toBe(285);
    });
  });
});
