# Handoff Report: Pricing Test Suite & Defensive Patch Specification

## 1. Observation
1. **Pricing Engine (`src/lib/pricing.ts`)**:
   - Lines 22–37: Fetches garment by `id: garmentProductId`. Throws `Garment product not found: ${garmentProductId}` if `!garment`.
   - Lines 40–46: Variant price adjustment checks `garment.variants.find((v) => v.id === garmentVariantId)`. If not found, defaults `variantAdjustment = 0` without throwing error.
   - Lines 53–60: Detects print surfaces (`frontArtworkLicenses`, `backArtworkLicenses`, `sideArtworkLicenses`). Sets `printSurfacesCount = Math.max(1, surfacesUsed.length)`.
   - Lines 62–66: Identifies supplier printing service with code `'DTG'`, fallback `{ pricePerSurface: 80 }`.
   - Lines 69–70: `packagingCost = garment.packagingPrice * validQty`, `shippingCost = garment.shippingPrice` (flat per shipment).
   - Lines 89–114: Iterates `allLicenses` and fetches `prisma.licenseOption.findUnique({ where: { id: item.licenseOptionId } })`.
     - **Vulnerability**: Line 101 checks `if (license) { ... }`. If `license` is `null` or missing, it **silently ignores** the license line and proceeds with `licensingCost = 0` instead of throwing an error.
     - **Vulnerability**: No check that `license.artworkId === item.artworkId`, allowing artwork ID spoofing across licenses.
2. **Database & Seed Data (`prisma/seed.mjs`, `prisma/dev.db`)**:
   - `garmentProduct` with SKU `APX-HVY-001`: `basePrice = 150`, `packagingPrice = 15`, `shippingPrice = 40`.
   - `printingService` for supplier: code `'DTG'`, `pricePerSurface = 80`.
   - Artworks and licenses:
     - "Dash Ape Classic Head Mark": standard apparel license at `price = 40`.
     - "Cyber Primate Tokyo 2088": standard apparel license at `price = 60`.
     - "Static Glitch Protocol": standard apparel license at `price = 25`.
   - Total license sum: `40 + 60 + 25 = 125` THB.
3. **Test Infrastructure (`vitest.config.ts`, `package.json`)**:
   - Vitest 1.6.1 is installed and operational (`vitest run`).
   - Environment is `'node'` with alias `'@': './src'`.
   - `src/lib/__tests__/pricing.test.ts` does not yet exist.

---

## 2. Logic Chain
1. **Exact THB 410 Benchmark (Observation 1, 2)**:
   - For 1 unit of `APX-HVY-001` with 3 licenses placed on FRONT surface:
     - Garment unit price = `150`
     - DTG Print (1 surface) = `80 * 1 = 80`
     - Packaging = `15 * 1 = 15`
     - Shipping (flat base) = `40`
     - Licenses = `40 + 60 + 25 = 125`
     - Total = `150 + 80 + 15 + 40 + 125 = 410` THB.
   - All 3 licenses placed on a single surface (`frontArtworkLicenses`) yields `surfacesUsed = ['FRONT']` (`surfacesCount = 1`), matching exactly THB 410.

2. **Quantity Scaling to THB 1150 (Observation 1, 2)**:
   - For `quantity = 3`:
     - Garment cost = `150 * 3 = 450`
     - Printing cost = `80 * 1 surface * 3 = 240`
     - Packaging cost = `15 * 3 = 45`
     - Shipping cost = flat `40` (MVP rule: flat per shipment)
     - Licensing cost = `(40 + 60 + 25) * 3 = 125 * 3 = 375`
     - Total = `450 + 240 + 45 + 40 + 375 = 1150` THB.
   - Quantity normalization in `pricing.ts` ensures `validQty = Math.max(1, Math.floor(quantity))`, correctly handling zero, negative, and floating numbers.

3. **Dual-Surface Printing (Observation 1, 2)**:
   - If licenses are distributed across `frontArtworkLicenses` and `backArtworkLicenses`:
     - `surfacesUsed = ['FRONT', 'BACK']`, `surfacesCount = 2`.
     - DTG print cost = `80 * 2 surfaces * 1 unit = 160` THB.
     - With 1 front license (40) and 1 back license (60), licensing cost = 100 THB.
     - Total = `150 + 160 + 15 + 40 + 100 = 465` THB.

4. **Error Handling & Security Vulnerability (Observation 1)**:
   - If an invalid `licenseOptionId` is submitted, `pricing.ts` currently silently omits it. This allows client-side tampering or incomplete orders to quote without license fees.
   - Requirement R2 explicitly dictates: *"Server rejects unauthorized pricing and client-side fee tampering."*
   - Therefore, `src/lib/pricing.ts` must throw `new Error('License option not found: ...')` when `!license`, and `new Error('License option ... does not belong to artwork ...')` when `item.artworkId && license.artworkId !== item.artworkId`.
   - Missing garment must continue throwing `Garment product not found: ...`.
   - Invalid `garmentVariantId` must throw `Garment variant not found: ...`.

5. **Test Architecture**:
   - Rather than hardcoding volatile SQLite CUID strings, the test suite should look up the benchmark garment and licenses in `beforeAll` using SKU (`APX-HVY-001`) and known seeded titles/prices.
   - This ensures the test suite is 100% resilient across database re-seeding (`npm run db:seed`).

---

## 3. Caveats
- **Shipping Flat Rate**: In the MVP, `garment.shippingPrice` is flat per order regardless of quantity. Should multi-parcel or weight-based shipping be added in later milestones, `shippingCost` calculation will need revision.
- **Side Surfaces**: `sideArtworkLicenses` adds `'SIDE'` to `surfacesUsed`. Each additional surface incurs an additional `pricePerSurface` (THB 80).
- **Prisma Connection Handle**: `afterAll` must call `await prisma.$disconnect()` to prevent Vitest test runner hanging.

---

## 4. Conclusion & Actionable Proposals

### 4.1. Defensive Patch for `src/lib/pricing.ts`

Apply the following modifications to `src/lib/pricing.ts`:

```diff
--- a/src/lib/pricing.ts
+++ b/src/lib/pricing.ts
@@ -42,7 +42,9 @@ export async function calculateLivePricing(
   if (garmentVariantId) {
     const variant = garment.variants.find((v) => v.id === garmentVariantId);
     if (variant) {
       variantAdjustment = variant.priceAdjustment || 0;
+    } else {
+      throw new Error(`Garment variant not found: ${garmentVariantId}`);
     }
   }
 
@@ -89,6 +91,10 @@ export async function calculateLivePricing(
   for (const item of allLicenses) {
+    if (!item.licenseOptionId) {
+      throw new Error('Missing licenseOptionId in artwork license line');
+    }
+
     const license = await prisma.licenseOption.findUnique({
       where: { id: item.licenseOptionId },
       include: {
@@ -99,20 +105,26 @@ export async function calculateLivePricing(
     });
 
-    if (license) {
-      const unitPrice = license.price;
-      const itemTotal = unitPrice * validQty;
-      licensingCost += itemTotal;
-
-      artworkBreakdown.push({
-        artworkId: license.artworkId,
-        title: license.artwork.title,
-        creatorName: license.artwork.creator.displayName,
-        unitPrice,
-        totalPrice: itemTotal,
-      });
+    if (!license) {
+      throw new Error(`License option not found: ${item.licenseOptionId}`);
     }
+
+    if (item.artworkId && license.artworkId !== item.artworkId) {
+      throw new Error(
+        `License option ${item.licenseOptionId} does not belong to artwork ${item.artworkId}`
+      );
+    }
+
+    const unitPrice = license.price;
+    const itemTotal = unitPrice * validQty;
+    licensingCost += itemTotal;
+
+    artworkBreakdown.push({
+      artworkId: license.artworkId,
+      title: license.artwork.title,
+      creatorName: license.artwork.creator.displayName,
+      unitPrice,
+      totalPrice: itemTotal,
+    });
   }
```

---

### 4.2. Exact Code Specification for `src/lib/__tests__/pricing.test.ts`

Target File: `src/lib/__tests__/pricing.test.ts`

```typescript
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
```

---

## 5. Verification Method

To independently verify the implementation once applied by the implementer:

1. **Database Pre-flight**:
   Ensure SQLite database is seeded:
   ```powershell
   npm run db:seed
   ```
2. **Execute Unit Test Suite**:
   ```powershell
   npx vitest run src/lib/__tests__/pricing.test.ts
   ```
   **Expected Outcome**: 9 passed tests across all 5 test suites. Zero test failures.
3. **Type-Check Verification**:
   ```powershell
   npx tsc --noEmit
   ```
   **Expected Outcome**: Zero TypeScript errors.
4. **Invalidation Conditions**:
   - If `calculateLivePricing` returns 490 instead of 410 for Test 1, verify that all 3 licenses are placed on `frontArtworkLicenses` (1 surface) rather than split across surfaces.
   - If Test 4 (invalid license option) fails or times out, verify that the defensive patch has replaced `if (license)` with `if (!license) throw new Error(...)`.
