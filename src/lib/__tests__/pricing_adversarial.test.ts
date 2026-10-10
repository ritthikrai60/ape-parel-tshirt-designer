import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { POST } from '@/app/api/pricing/calculate/route';
import { PricingPayload } from '@/lib/types';

describe('Adversarial Stress Harness: Pricing Engine & API Route', () => {
  let garmentApex: {
    id: string;
    sku: string;
    basePrice: number;
    variants: Array<{ id: string; sku: string }>;
  };
  let licDashApe40: { id: string; artworkId: string; price: number };
  let licCyberPrimate60: { id: string; artworkId: string; price: number };
  let artDashApe: { id: string; title: string };
  let artCyberPrimate: { id: string; title: string };

  beforeAll(async () => {
    // 1. Fetch benchmark garment
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
      throw new Error('Seed data missing: Garment APX-HVY-001 not found.');
    }
    garmentApex = garment;

    // 2. Fetch benchmark artworks and licenses
    const art1 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Dash Ape Classic' } },
      include: { licenseOptions: true },
    });
    const art2 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Cyber Primate' } },
      include: { licenseOptions: true },
    });

    if (!art1 || !art2) {
      throw new Error('Seed data missing: Benchmark artworks not found.');
    }

    artDashApe = art1;
    artCyberPrimate = art2;

    const l1 = art1.licenseOptions.find((l) => l.price === 40);
    const l2 = art2.licenseOptions.find((l) => l.price === 60);

    if (!l1 || !l2) {
      throw new Error('Seed data missing: Benchmark license options not found.');
    }

    licDashApe40 = l1;
    licCyberPrimate60 = l2;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to invoke POST route handler with raw string or object
  async function callPricingApi(body: any, rawString = false) {
    const payloadStr = rawString ? body : JSON.stringify(body);
    const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: payloadStr,
    });
    const res = await POST(req);
    const json = await res.json();
    return { status: res.status, data: json };
  }

  describe('1. Malformed Payloads & Syntax Errors', () => {
    it('rejects completely invalid/corrupted JSON syntax with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi('{ "garmentProductId": "broken-json, ', true);
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid JSON');
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
    });

    it('rejects empty body string with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi('', true);
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid JSON');
    });

    it('rejects JSON null payload with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi('null', true);
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
      expect(data).toHaveProperty('issues');
    });

    it('rejects array root payload with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi([], false);
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
      expect(data).toHaveProperty('issues');
    });

    it('rejects primitive number or boolean root payload with structured HTTP 400', async () => {
      const resNum = await callPricingApi(12345, false);
      expect(resNum.status).toBe(400);
      expect(resNum.data).toHaveProperty('error', 'Validation Error');

      const resBool = await callPricingApi(true, false);
      expect(resBool.status).toBe(400);
      expect(resBool.data).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('2. Missing Required Fields & Empty Strings', () => {
    it('rejects empty object payload missing garmentProductId with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({});
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
      expect(data.issues._errors || data.issues.garmentProductId).toBeDefined();
    });

    it('rejects empty string garmentProductId with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: '',
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects license lines missing artworkId with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        frontArtworkLicenses: [
          {
            licenseOptionId: licDashApe40.id,
          },
        ],
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects license lines with empty string artworkId with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        frontArtworkLicenses: [
          {
            artworkId: '',
            licenseOptionId: licDashApe40.id,
          },
        ],
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects license lines missing licenseOptionId with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
          },
        ],
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects license lines with empty string licenseOptionId with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
            licenseOptionId: '',
          },
        ],
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });
  });

  describe('3. Malformed & Exploitative Quantities', () => {
    it('rejects negative quantity (-1, -100) with structured HTTP 400', async () => {
      const resNeg1 = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: -1,
      });
      expect(resNeg1.status).toBe(400);
      expect(resNeg1.data).toHaveProperty('error', 'Validation Error');

      const resNeg100 = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: -100,
      });
      expect(resNeg100.status).toBe(400);
      expect(resNeg100.data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects zero quantity (0) with structured HTTP 400', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: 0,
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects non-integer floating-point quantities (1.5, 3.14) with structured HTTP 400', async () => {
      const resFloat = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: 1.5,
      });
      expect(resFloat.status).toBe(400);
      expect(resFloat.data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects non-numeric quantity types (string, boolean, array, object) with structured HTTP 400', async () => {
      for (const badQty of ['five', true, [10], { count: 5 }]) {
        const res = await callPricingApi({
          garmentProductId: garmentApex.id,
          quantity: badQty,
        });
        expect(res.status).toBe(400);
        expect(res.data).toHaveProperty('error', 'Validation Error');
      }
    });

    it('handles giant positive quantities safely without crashing or throwing unhandled errors', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: 1000000,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
      });
      expect(status).toBe(200);
      expect(data.quantity).toBe(1000000);
      expect(data.totalAmount).toBeGreaterThan(0);
      expect(Number.isFinite(data.totalAmount)).toBe(true);
    });
  });

  describe('4. Prototype Pollution & Injection Defenses', () => {
    it('defends against prototype pollution payloads without polluting Object.prototype', async () => {
      const maliciousPayload = {
        garmentProductId: garmentApex.id,
        __proto__: { polluted: 'attacker_controlled', admin: true },
        constructor: { prototype: { hacked: true } },
      };

      const { status, data } = await callPricingApi(maliciousPayload);
      expect(status).toBe(200);
      // Ensure Object.prototype is NOT polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).admin).toBeUndefined();
      expect((Object.prototype as any).hacked).toBeUndefined();
      expect(data.totalAmount).toBe(285); // Baseline 1-unit garment
    });

    it('safely handles SQL injection payloads in garmentProductId without crashing (returns 404)', async () => {
      const sqlInjections = [
        "'; DROP TABLE GarmentProduct; --",
        "' OR '1'='1",
        "1; SELECT * FROM User; --",
      ];

      for (const injection of sqlInjections) {
        const { status, data } = await callPricingApi({
          garmentProductId: injection,
        });
        expect(status).toBe(404);
        expect(data).toHaveProperty('error', 'Not Found');
        expect(data.message).toContain('Garment product not found');
      }
    });

    it('safely handles SQL injection payloads in licenseOptionId without crashing (returns 400)', async () => {
      const sqlInjections = [
        "'; DROP TABLE LicenseOption; --",
        "' OR 1=1 --",
      ];

      for (const injection of sqlInjections) {
        const { status, data } = await callPricingApi({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            {
              artworkId: artDashApe.id,
              licenseOptionId: injection,
            },
          ],
        });
        expect(status).toBe(400);
        expect(data).toHaveProperty('error', 'Bad Request');
        expect(data.message).toContain('License option not found');
      }
    });

    it('safely handles SQL injection in garmentVariantId without crashing (returns 400)', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        garmentVariantId: "' OR '1'='1; --",
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toContain('Garment variant not found');
    });
  });

  describe('5. Forged & Mismatched IDs', () => {
    it('returns structured HTTP 400 when licenseOptionId is forged and does not exist', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
            licenseOptionId: 'cuid-forged-random-license-999',
          },
        ],
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toContain('License option not found');
    });

    it('returns structured HTTP 400 when licenseOptionId belongs to artwork A but claimed under artwork B', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        frontArtworkLicenses: [
          {
            artworkId: artCyberPrimate.id, // Mismatched artwork
            licenseOptionId: licDashApe40.id, // Belongs to Dash Ape
          },
        ],
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toContain('does not belong to artwork');
    });

    it('returns structured HTTP 400 when garmentVariantId does not exist', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        garmentVariantId: 'cuid-forged-variant-999',
      });
      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toContain('Garment variant not found');
    });

    it('returns structured HTTP 400 when garmentVariantId belongs to another garment', async () => {
      // Find another garment product
      const otherGarment = await prisma.garmentProduct.findFirst({
        where: { id: { not: garmentApex.id } },
        include: { variants: true },
      });

      if (otherGarment && otherGarment.variants.length > 0) {
        const otherVariantId = otherGarment.variants[0].id;
        const { status, data } = await callPricingApi({
          garmentProductId: garmentApex.id,
          garmentVariantId: otherVariantId,
        });
        expect(status).toBe(400);
        expect(data).toHaveProperty('error', 'Bad Request');
        expect(data.message).toContain('Garment variant not found');
      }
    });
  });

  describe('6. Stress Testing: Boundary Surfaces & Large Payloads', () => {
    it('handles blank garment configuration (all license arrays empty) with HTTP 200', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [],
        backArtworkLicenses: [],
        sideArtworkLicenses: [],
      });
      expect(status).toBe(200);
      expect(data.garmentCost).toBe(150);
      expect(data.printingCost).toBe(80); // Default single surface DTG
      expect(data.packagingCost).toBe(15);
      expect(data.shippingCost).toBe(40);
      expect(data.licensingCost).toBe(0);
      expect(data.totalAmount).toBe(285);
      expect(data.surfacesUsed).toEqual([]);
      expect(data.breakdown.artworkLicenses).toHaveLength(0);
    });

    it('handles multiple artworks across all surfaces (FRONT, BACK, SIDE) without memory or arithmetic errors', async () => {
      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: 2,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        backArtworkLicenses: [
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        sideArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
      });
      expect(status).toBe(200);
      // 3 surfaces: 80 * 3 surfaces * 2 units = 480 THB
      expect(data.printingCost).toBe(480);
      expect(data.surfacesUsed).toEqual(['FRONT', 'BACK', 'SIDE']);
      expect(data.breakdown.surfacesCount).toBe(3);
      // Licenses: (40 + 60 + 40) * 2 units = 280 THB
      expect(data.licensingCost).toBe(280);
      // Garment: 150 * 2 = 300 THB
      // Packaging: 15 * 2 = 30 THB
      // Shipping: 40 THB
      // Total: 300 + 480 + 280 + 30 + 40 = 1130 THB
      expect(data.totalAmount).toBe(1130);
    });

    it('handles large array of license lines (e.g. 30 items) without crashing or timeout', async () => {
      const repeatedLicenses = Array.from({ length: 30 }).map(() => ({
        artworkId: artDashApe.id,
        licenseOptionId: licDashApe40.id,
      }));

      const { status, data } = await callPricingApi({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: repeatedLicenses,
      });

      expect(status).toBe(200);
      expect(data.breakdown.artworkLicenses).toHaveLength(30);
      expect(data.licensingCost).toBe(40 * 30); // 1200 THB
    });
  });

  describe('7. Direct Pricing Engine (pricing.ts) Defensive Validations', () => {
    it('defensively sanitizes non-positive quantity to 1 when called directly', async () => {
      const res = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: -10,
      });
      expect(res.quantity).toBe(1);
      expect(res.totalAmount).toBe(285);
    });

    it('defensively floors fractional quantities when called directly', async () => {
      const res = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 4.9,
      });
      expect(res.quantity).toBe(4);
    });

    it('throws explicit error when licenseOptionId is missing', async () => {
      await expect(
        calculateLivePricing({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: '' },
          ],
        })
      ).rejects.toThrow(/missing licenseoptionid/i);
    });

    it('throws explicit error when license does not belong to artwork', async () => {
      await expect(
        calculateLivePricing({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            {
              artworkId: artCyberPrimate.id,
              licenseOptionId: licDashApe40.id,
            },
          ],
        })
      ).rejects.toThrow(/does not belong to artwork/i);
    });
  });
});
