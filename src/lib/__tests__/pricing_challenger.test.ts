import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { PricingPayload } from '@/lib/types';

describe('Challenger M1: Empirical & Mathematical Verification Harness', () => {
  let garmentApex: any;
  let garmentRetro: any;
  let testVariantWithAdjustment: any;
  let artDashApe: any;
  let artCyberPrimate: any;
  let artStaticGlitch: any;
  let licDashApe40: any;
  let licCyberPrimate60: any;
  let licStaticGlitch25: any;

  beforeAll(async () => {
    // 1. Fetch APX-HVY-001
    garmentApex = await prisma.garmentProduct.findUnique({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: { include: { printingServices: true } },
      },
    });

    // 2. Fetch RTR-BOX-002
    garmentRetro = await prisma.garmentProduct.findUnique({
      where: { sku: 'RTR-BOX-002' },
      include: {
        variants: true,
        supplier: { include: { printingServices: true } },
      },
    });

    if (!garmentApex || !garmentRetro) {
      throw new Error('Seed data missing: APX-HVY-001 or RTR-BOX-002 not found.');
    }

    // 3. Create a temporary variant on APX-HVY-001 with explicit non-zero price adjustment (+THB 35)
    testVariantWithAdjustment = await prisma.garmentVariant.create({
      data: {
        productId: garmentApex.id,
        sku: 'APX-HVY-001-TEST-ADJ',
        colorName: 'Acid Wash Test',
        colorHex: '#555555',
        size: 'XXL',
        stock: 50,
        priceAdjustment: 35, // +35 THB premium
      },
    });

    // Re-fetch garmentApex so variants list includes the new test variant
    garmentApex = await prisma.garmentProduct.findUnique({
      where: { id: garmentApex.id },
      include: {
        variants: true,
        supplier: { include: { printingServices: true } },
      },
    });

    // 4. Fetch Artworks & License options
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
      throw new Error('Seed data missing: Benchmark artworks not found.');
    }

    artDashApe = art1;
    artCyberPrimate = art2;
    artStaticGlitch = art3;

    licDashApe40 = art1.licenseOptions.find((l) => l.price === 40);
    licCyberPrimate60 = art2.licenseOptions.find((l) => l.price === 60);
    licStaticGlitch25 = art3.licenseOptions.find((l) => l.price === 25);

    if (!licDashApe40 || !licCyberPrimate60 || !licStaticGlitch25) {
      throw new Error('Seed data missing: Licenses 40, 60, 25 not found.');
    }
  });

  afterAll(async () => {
    // Teardown temporary test variant
    if (testVariantWithAdjustment?.id) {
      await prisma.garmentVariant.delete({
        where: { id: testVariantWithAdjustment.id },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. BENCHMARK THB 410 EMPIRICAL VERIFICATION
  // =========================================================================
  describe('Suite 1: Canonical THB 410 Benchmark', () => {
    it('verifies exact benchmark: APX-HVY-001 (150) + DTG (80) + Pack (15) + Ship (40) + Licenses (40+60+25=125) = 410 THB', async () => {
      const payload: PricingPayload = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      };

      const result = await calculateLivePricing(payload);

      expect(result.garmentCost).toBe(150);
      expect(result.printingCost).toBe(80);
      expect(result.packagingCost).toBe(15);
      expect(result.shippingCost).toBe(40);
      expect(result.licensingCost).toBe(125);
      expect(result.totalAmount).toBe(410);

      // Verify summation integrity
      const sum =
        result.garmentCost +
        result.printingCost +
        result.packagingCost +
        result.shippingCost +
        result.licensingCost;
      expect(result.totalAmount).toBe(sum);
    });
  });

  // =========================================================================
  // 2. VOLUME SCALING & MATHEMATICAL INVARIANTS
  // =========================================================================
  describe('Suite 2: Volume Scaling & Linear Invariants', () => {
    const quantitiesToTest = [1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000];

    it.each(quantitiesToTest)(
      'scales strictly linearly for %i units according to contract formula',
      async (qty) => {
        const payload: PricingPayload = {
          garmentProductId: garmentApex.id,
          quantity: qty,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        };

        const result = await calculateLivePricing(payload);

        // Theoretical expected components:
        // Garment: 150 * qty
        // Print (1 surface): 80 * qty
        // Pack: 15 * qty
        // Ship: flat 40
        // Licenses: (40 + 60 + 25) * qty = 125 * qty
        const expectedGarment = 150 * qty;
        const expectedPrint = 80 * qty;
        const expectedPack = 15 * qty;
        const expectedShip = 40;
        const expectedLic = 125 * qty;
        const expectedTotal = expectedGarment + expectedPrint + expectedPack + expectedShip + expectedLic;

        expect(result.quantity).toBe(qty);
        expect(result.garmentCost).toBe(expectedGarment);
        expect(result.printingCost).toBe(expectedPrint);
        expect(result.packagingCost).toBe(expectedPack);
        expect(result.shippingCost).toBe(expectedShip);
        expect(result.licensingCost).toBe(expectedLic);
        expect(result.totalAmount).toBe(expectedTotal);

        // Verify integer precision (no floating-point cents/fractions)
        expect(Number.isInteger(result.totalAmount)).toBe(true);
        expect(Number.isSafeInteger(result.totalAmount)).toBe(true);
      }
    );

    it('specifically verifies 50 units order = THB 18,540', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 50,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });
      expect(result.totalAmount).toBe(18540);
    });

    it('specifically verifies 1,000 units order = THB 370,040', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1000,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });
      expect(result.totalAmount).toBe(370040);
    });
  });

  // =========================================================================
  // 3. SEEDED GARMENT PRODUCTS & ALL VARIANTS VERIFICATION
  // =========================================================================
  describe('Suite 3: All Seeded Garment Products & Variants', () => {
    it('verifies APX-HVY-001 across all its seeded variants', async () => {
      for (const variant of garmentApex.variants.filter((v: any) => v.id !== testVariantWithAdjustment.id)) {
        const result = await calculateLivePricing({
          garmentProductId: garmentApex.id,
          garmentVariantId: variant.id,
          quantity: 1,
        });

        // Blank unit: 150 (garment) + 80 (DTG) + 15 (pack) + 40 (ship) = 285 THB
        expect(result.garmentCost).toBe(150);
        expect(result.printingCost).toBe(80);
        expect(result.packagingCost).toBe(15);
        expect(result.shippingCost).toBe(40);
        expect(result.licensingCost).toBe(0);
        expect(result.totalAmount).toBe(285);
      }
    });

    it('verifies RTR-BOX-002 (Retro 90s Boxy Tee) blank calculation', async () => {
      // RTR-BOX-002: Base 160, Pack 15, Ship 45, Supplier 2 DTG 85
      // Blank: 160 + 85 + 15 + 45 = 305 THB
      const result = await calculateLivePricing({
        garmentProductId: garmentRetro.id,
        quantity: 1,
      });

      expect(result.garmentCost).toBe(160);
      expect(result.printingCost).toBe(85);
      expect(result.packagingCost).toBe(15);
      expect(result.shippingCost).toBe(45);
      expect(result.licensingCost).toBe(0);
      expect(result.totalAmount).toBe(305);
      expect(result.breakdown.printPricePerSurface).toBe(85);
    });

    it('verifies RTR-BOX-002 across all its seeded variants with 3 benchmark licenses', async () => {
      for (const variant of garmentRetro.variants) {
        const result = await calculateLivePricing({
          garmentProductId: garmentRetro.id,
          garmentVariantId: variant.id,
          quantity: 1,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        });

        // 160 (garment) + 85 (DTG) + 15 (pack) + 45 (ship) + 125 (lic) = 430 THB
        expect(result.garmentCost).toBe(160);
        expect(result.printingCost).toBe(85);
        expect(result.packagingCost).toBe(15);
        expect(result.shippingCost).toBe(45);
        expect(result.licensingCost).toBe(125);
        expect(result.totalAmount).toBe(430);
      }
    });
  });

  // =========================================================================
  // 4. VARIANT PRICE ADJUSTMENT EMPIRICAL TESTS
  // =========================================================================
  describe('Suite 4: Variant Price Adjustments', () => {
    it('accurately incorporates positive variant adjustment (+35 THB)', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        garmentVariantId: testVariantWithAdjustment.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });

      // Garment unit price = 150 + 35 = 185
      // Total = 185 + 80 + 15 + 40 + 125 = 445 THB
      expect(result.breakdown.garmentBasePrice).toBe(185);
      expect(result.garmentCost).toBe(185);
      expect(result.totalAmount).toBe(445);
    });

    it('scales variant adjustment with order volume (10 units with +35 THB adj)', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        garmentVariantId: testVariantWithAdjustment.id,
        quantity: 10,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
      });

      // Garment: (150 + 35) * 10 = 1,850
      // Print: 80 * 10 = 800
      // Pack: 15 * 10 = 150
      // Ship: flat 40
      // Lic: 40 * 10 = 400
      // Total: 1850 + 800 + 150 + 40 + 400 = 3,240 THB
      expect(result.garmentCost).toBe(1850);
      expect(result.printingCost).toBe(800);
      expect(result.packagingCost).toBe(150);
      expect(result.shippingCost).toBe(40);
      expect(result.licensingCost).toBe(400);
      expect(result.totalAmount).toBe(3240);
    });
  });

  // =========================================================================
  // 5. PRINT SURFACE CONFIGURATIONS & DTG COSTS
  // =========================================================================
  describe('Suite 5: Print Surface Configurations', () => {
    it('charges 1 surface when multiple artworks placed on the same surface (FRONT)', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        backArtworkLicenses: [],
      });

      expect(result.surfacesUsed).toEqual(['FRONT']);
      expect(result.breakdown.surfacesCount).toBe(1);
      expect(result.printingCost).toBe(80);
      expect(result.licensingCost).toBe(100);
    });

    it('charges 2 surfaces for FRONT + BACK', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        backArtworkLicenses: [
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
      });

      expect(result.surfacesUsed).toEqual(['FRONT', 'BACK']);
      expect(result.breakdown.surfacesCount).toBe(2);
      expect(result.printingCost).toBe(160); // 80 * 2
    });

    it('charges 2 surfaces for FRONT + SIDE', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        sideArtworkLicenses: [
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });

      expect(result.surfacesUsed).toEqual(['FRONT', 'SIDE']);
      expect(result.breakdown.surfacesCount).toBe(2);
      expect(result.printingCost).toBe(160);
    });

    it('charges 3 surfaces for FRONT + BACK + SIDE', async () => {
      const result = await calculateLivePricing({
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
      });

      expect(result.surfacesUsed).toEqual(['FRONT', 'BACK', 'SIDE']);
      expect(result.breakdown.surfacesCount).toBe(3);
      expect(result.printingCost).toBe(240); // 80 * 3
    });
  });

  // =========================================================================
  // 6. QUANTITY NORMALIZATION & BOUNDARY TESTING
  // =========================================================================
  describe('Suite 6: Quantity Normalization & Boundary Conditions', () => {
    it.each([0, -1, -50, -999999])(
      'clamps non-positive quantity (%i) to 1 unit minimum',
      async (invalidQty) => {
        const result = await calculateLivePricing({
          garmentProductId: garmentApex.id,
          quantity: invalidQty,
        });
        expect(result.quantity).toBe(1);
        expect(result.totalAmount).toBe(285);
      }
    );

    it.each([
      [1.2, 1],
      [1.99, 1],
      [2.01, 2],
      [5.5, 5],
      [99.9, 99],
    ])('floors fractional quantity %f to %i', async (floatQty, expectedInt) => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: floatQty,
      });
      expect(result.quantity).toBe(expectedInt);
    });

    it('defaults to 1 unit when quantity is undefined or omitted', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
      });
      expect(result.quantity).toBe(1);
    });
  });

  // =========================================================================
  // 7. PRECISION & FLOATING POINT VERIFICATION
  // =========================================================================
  describe('Suite 7: Floating-Point & Precision Auditing', () => {
    it('maintains strict integer consistency without floating-point artifacts', async () => {
      const largeQty = 3333;
      const result = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: largeQty,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });

      // Check every field is pure integer
      expect(Number.isInteger(result.garmentCost)).toBe(true);
      expect(Number.isInteger(result.printingCost)).toBe(true);
      expect(Number.isInteger(result.packagingCost)).toBe(true);
      expect(Number.isInteger(result.shippingCost)).toBe(true);
      expect(Number.isInteger(result.licensingCost)).toBe(true);
      expect(Number.isInteger(result.totalAmount)).toBe(true);

      // Verify exact arithmetic
      const expectedTotal = (150 + 80 + 15 + 125) * largeQty + 40;
      expect(result.totalAmount).toBe(expectedTotal);
    });
  });

  // =========================================================================
  // 8. SECURITY & ANTI-TAMPER DEFENSIVE VALIDATION
  // =========================================================================
  describe('Suite 8: Security & Defensive Validations', () => {
    it('prevents cross-garment variant injection (variant of RTR-BOX-002 on APX-HVY-001)', async () => {
      const foreignVariant = garmentRetro.variants[0];
      await expect(
        calculateLivePricing({
          garmentProductId: garmentApex.id,
          garmentVariantId: foreignVariant.id, // Variant belongs to RTR-BOX-002, not APX-HVY-001
        })
      ).rejects.toThrow(/garment variant not found/i);
    });

    it('prevents cross-artwork license injection (Dash Ape license claimed under Cyber Primate artwork)', async () => {
      await expect(
        calculateLivePricing({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            {
              artworkId: artCyberPrimate.id,
              licenseOptionId: licDashApe40.id, // Mismatched!
            },
          ],
        })
      ).rejects.toThrow(/does not belong to artwork/i);
    });

    it('rejects completely bogus garment ID', async () => {
      await expect(
        calculateLivePricing({
          garmentProductId: 'bogus-garment-uuid-000',
        })
      ).rejects.toThrow(/garment product not found/i);
    });

    it('rejects completely bogus licenseOptionId', async () => {
      await expect(
        calculateLivePricing({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            {
              artworkId: artDashApe.id,
              licenseOptionId: 'bogus-license-uuid-000',
            },
          ],
        })
      ).rejects.toThrow(/license option not found/i);
    });
  });

  // =========================================================================
  // 9. API ROUTE ENDPOINT INTEGRATION (POST /api/pricing/calculate)
  // =========================================================================
  describe('Suite 9: API Route Endpoint (POST /api/pricing/calculate)', () => {
    it('returns HTTP 200 and exact benchmark THB 410 for valid request', async () => {
      const { POST } = await import('@/app/api/pricing/calculate/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.totalAmount).toBe(410);
      expect(json.garmentCost).toBe(150);
      expect(json.printingCost).toBe(80);
      expect(json.packagingCost).toBe(15);
      expect(json.shippingCost).toBe(40);
      expect(json.licensingCost).toBe(125);
    });

    it('returns HTTP 400 on malformed JSON payload', async () => {
      const { POST } = await import('@/app/api/pricing/calculate/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json: ...',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid JSON');
    });

    it('returns HTTP 400 on Zod validation error when quantity is non-positive', async () => {
      const { POST } = await import('@/app/api/pricing/calculate/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 0, // Zod requires min(1)
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Validation Error');
    });

    it('returns HTTP 400 on Zod validation error when quantity is non-integer', async () => {
      const { POST } = await import('@/app/api/pricing/calculate/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 3.5, // Zod requires integer
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Validation Error');
    });

    it('returns HTTP 404 when garmentProductId does not exist', async () => {
      const { POST } = await import('@/app/api/pricing/calculate/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: 'non-existent-garment-cuid',
          quantity: 1,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not Found');
    });

    it('returns HTTP 400 when licenseOptionId does not belong to artworkId', async () => {
      const { POST } = await import('@/app/api/pricing/calculate/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          frontArtworkLicenses: [
            {
              artworkId: artCyberPrimate.id,
              licenseOptionId: licDashApe40.id, // Mismatch
            },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Bad Request');
    });
  });
});
