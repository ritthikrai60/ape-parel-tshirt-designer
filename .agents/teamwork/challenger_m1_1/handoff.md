# Empirical Benchmark & Mathematical Verification Report — Challenger M1

## 1. Observation

### 1.1 Implementation Codebase
- **Pricing Calculation Service**: `src/lib/pricing.ts` (153 lines)
  - Line 20: `const validQty = Math.max(1, Math.floor(quantity));`
  - Lines 40-48: Variant price adjustment lookup and validation:
    ```typescript
    let variantAdjustment = 0;
    if (garmentVariantId) {
      const variant = garment.variants.find((v) => v.id === garmentVariantId);
      if (variant) {
        variantAdjustment = variant.priceAdjustment || 0;
      } else {
        throw new Error(`Garment variant not found: ${garmentVariantId}`);
      }
    }
    ```
  - Lines 50-51: `const garmentUnitPrice = garment.basePrice + variantAdjustment; const garmentCost = garmentUnitPrice * validQty;`
  - Lines 61-68: DTG surface count and rate calculation:
    ```typescript
    const printSurfacesCount = Math.max(1, surfacesUsed.length);
    const dtgService = garment.supplier.printingServices.find((s) => s.code === 'DTG') ||
      garment.supplier.printingServices[0] || { pricePerSurface: 80 };
    const printPricePerSurface = dtgService.pricePerSurface;
    const printingCost = printPricePerSurface * printSurfacesCount * validQty;
    ```
  - Lines 71-72: `const packagingCost = garment.packagingPrice * validQty; const shippingCost = garment.shippingPrice;`
  - Lines 111-115: License-artwork integrity check:
    ```typescript
    if (item.artworkId && license.artworkId !== item.artworkId) {
      throw new Error(
        `License option ${item.licenseOptionId} does not belong to artwork ${item.artworkId}`
      );
    }
    ```
  - Lines 117-119: `const unitPrice = license.price; const itemTotal = unitPrice * validQty; licensingCost += itemTotal;`
  - Lines 131-132: `const totalAmount = garmentCost + printingCost + licensingCost + packagingCost + shippingCost;`
- **Pricing API Route**: `src/app/api/pricing/calculate/route.ts` (131 lines)
  - Lines 24-47: Zod schema enforcing `garmentProductId.min(1)`, `quantity.int().min(1)`, `frontArtworkLicenses`, `backArtworkLicenses`, `sideArtworkLicenses`.
  - Lines 86-128: Error handling mapping garment not found to 404, invalid licenses/variants to 400, and unexpected errors to 500.

### 1.2 Adversarial Test Execution
- Authored test harness `src/lib/__tests__/pricing_challenger.test.ts` (44 test assertions across 9 test suites).
- Executed `npm test` via powershell:
  ```
  > ape-parel@0.1.0 test
  > vitest run

   RUN  v1.6.1 D:/Coding Projects/ape-parel tshirt

   ✓ src/lib/__tests__/pricing.test.ts  (11 tests) 66ms
   ✓ src/lib/__tests__/pricing_challenger.test.ts  (44 tests) 174ms

   Test Files  2 passed (2)
        Tests  55 passed (55)
     Duration  762ms
  ```
- Executed TypeScript check `npx tsc --noEmit`:
  - Exit code: 0, zero diagnostic errors.
- Executed Next.js build `npm run build`:
  - Exit code: 0, production build compiled successfully, `ƒ /api/pricing/calculate` rendered on demand.

### 1.3 Quantitative Benchmark & Stress Test Results
- **Benchmark THB 410 (1 unit, APX-HVY-001, 3 licenses)**:
  - Garment base: THB 150
  - DTG printing (1 surface): THB 80
  - Packaging: THB 15
  - Shipping (flat): THB 40
  - Licenses: THB 40 (Dash Ape) + THB 60 (Cyber Primate) + THB 25 (Static Glitch) = THB 125
  - Total: $150 + 80 + 15 + 40 + 125 = \text{THB } 410$ (exact).
- **Volume Scaling**:
  - 1 unit: THB 410
  - 2 units: $(150 + 80 + 15 + 125) \times 2 + 40 = \text{THB } 780$
  - 50 units: $(150 + 80 + 15 + 125) \times 50 + 40 = \text{THB } 18,540$
  - 1,000 units: $(150 + 80 + 15 + 125) \times 1,000 + 40 = \text{THB } 370,040$
  - 10,000 units: $(150 + 80 + 15 + 125) \times 10,000 + 40 = \text{THB } 3,700,040$
- **Garment Variant Price Adjustments**:
  - Seeded variants of APX-HVY-001 and RTR-BOX-002: adjustment = 0 THB.
  - Stress variant with +35 THB adjustment (`APX-HVY-001-TEST-ADJ`):
    - Unit garment cost: $150 + 35 = 185$ THB.
    - 1 unit total with 3 licenses: $185 + 80 + 15 + 40 + 125 = 445$ THB.
    - 10 units total with Dash Ape (40): $(185 + 80 + 15 + 40) \times 10 + 40 = 3,240$ THB.
- **Seeded Garment RTR-BOX-002 (Supplier 2)**:
  - Base garment: 160 THB
  - DTG surface price: 85 THB (Supplier 2 rate)
  - Packaging: 15 THB
  - Shipping: 45 THB
  - Blank tee (1 unit): $160 + 85 + 15 + 45 = 305$ THB.
  - 3 benchmark licenses (1 unit): $160 + 85 + 15 + 45 + 125 = 430$ THB.
- **Surface Combinations**:
  - 0 surfaces (blank tee): defaulted to 1 surface (THB 80 for APX-HVY-001).
  - 1 surface (FRONT only): THB 80.
  - 2 surfaces (FRONT + BACK): $80 \times 2 = \text{THB } 160$.
  - 2 surfaces (FRONT + SIDE): $80 \times 2 = \text{THB } 160$.
  - 3 surfaces (FRONT + BACK + SIDE): $80 \times 3 = \text{THB } 240$.
  - Multiple artworks on 1 surface: charged 1 print surface (THB 80), not multiplied per artwork.
- **Numerical Precision**:
  - `Number.isInteger(result.totalAmount) === true` for all test cases.
  - `Number.isSafeInteger(result.totalAmount) === true` for all test cases up to 10,000 units.
  - Total amount strictly equals the sum of its itemized parts without any floating-point pennies or drift.

---

## 2. Logic Chain

1. **Benchmark Math**: In Observation 1.1, `calculateLivePricing` sums garment, DTG printing, licensing, packaging, and flat shipping. In Observation 1.3, inputting 1 unit of `APX-HVY-001` with 1-surface DTG and the 3 seeded licenses (40, 60, 25) yields $150 + 80 + 15 + 40 + 125 = 410$ THB exactly. This fulfills Requirement R2 and Milestone M1 criteria.
2. **Volume Scaling Invariant**: In Observation 1.1, per-unit items (`garmentCost`, `printingCost`, `packagingCost`, `licensingCost`) multiply strictly by `validQty`, while `shippingCost` remains flat per order. In Observation 1.3, this was verified across orders of 1, 2, 5, 10, 25, 50, 100, 500, 1000, 5000, and 10000 units, demonstrating strict linear scaling with zero deviation from the specification formula.
3. **Variant Adjustment Behavior**: In Observation 1.1 (lines 40-51), variant price adjustments are applied to `garmentUnitPrice` and then multiplied by `validQty`. In Observation 1.3, a test variant with +35 THB premium produced $185$ THB unit cost and scaled to 10 units at $1,850$ THB garment cost, verifying proper variant pricing math.
4. **Floating-Point & Rounding Immunity**: In Observation 1.1, all price fields in the database schema are integers (`Int` in Prisma schema). The calculation engine uses only integer addition and multiplication (`validQty` is floored). In Observation 1.3, every computed component and total is verified to be a safe integer with 0 satang/cents floating-point leakage.
5. **Defensive Anti-Tampering**: In Observation 1.1 (lines 40-48 and 111-115) and Observation 1.2 (Suite 8 and Suite 9), attempts to inject variants from another garment product or licenses belonging to a different artwork are caught and rejected with descriptive business exceptions (and HTTP 400 at the API boundary). Invalid quantities (zero, negative, float) are safely normalized at the function level and rejected with HTTP 400 at the Zod schema API boundary.

---

## 3. Caveats

- **Flat Shipping Model**: The current shipping cost is flat per shipment (40 THB for APX-HVY-001, 45 THB for RTR-BOX-002) as specified in `PROJECT.md` for the MVP milestone. Quantity-tiered shipping (e.g. weight-based over 50 units) is not implemented in M1 and would require schema enhancement in future milestones if required.
- **Currency Support**: The engine exclusively operates in whole Thai Baht (THB). Multi-currency conversion (USD/EUR) is not part of M1 scope.

---

## 4. Conclusion

**Verdict: APPROVE**

The server-authoritative pricing engine (`src/lib/pricing.ts`) and its endpoint (`src/app/api/pricing/calculate/route.ts`):
1. Exactly satisfies the canonical THB 410 benchmark for 1 unit of `APX-HVY-001` with 3 licenses.
2. Scales with mathematical precision across all volume tiers (up to 10,000+ units) without floating-point drift.
3. Correctly handles all seeded garments (`APX-HVY-001`, `RTR-BOX-002`) and variants, including non-zero price adjustments.
4. Correctly computes DTG printing per surface regardless of artwork count per surface.
5. Employs strong anti-tampering guards against cross-product and cross-artwork parameter injection.
6. Passes 100% of test suites (55/55 tests) and compiles cleanly in Next.js production build.

---

## 5. Verification Method

To independently reproduce and verify this assessment:
1. Ensure seeded database is initialized:
   ```powershell
   npm run db:seed
   ```
2. Run the complete test suite (both baseline and challenger tests):
   ```powershell
   npm test
   ```
   *Expected outcome*: 55 passed tests across 2 test files (`src/lib/__tests__/pricing.test.ts` and `src/lib/__tests__/pricing_challenger.test.ts`).
3. Run the TypeScript compiler check:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0 with 0 errors.
4. Run Next.js production build:
   ```powershell
   npm run build
   ```
   *Expected outcome*: Successful build generation.
5. Invalidation condition: Any deviation from `totalAmount === 410` on the 1-unit benchmark, any floating-point fractional result, or any bypass of variant/license ownership validation.
