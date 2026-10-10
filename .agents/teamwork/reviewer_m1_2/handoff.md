# HANDOFF REPORT — Reviewer M1 (Instance 2)

- **Agent**: `reviewer_m1_2`
- **Role**: Security, API & Edge Case Reviewer & Adversarial Critic
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\reviewer_m1_2`
- **Parent**: Orchestrator (`ebc38aff-81cb-457f-bd27-e38a9be40d41`)
- **Review Scope**: `src/app/api/pricing/calculate/route.ts`, `src/lib/pricing.ts`, `src/lib/__tests__/pricing.test.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- **Verdict**: **APPROVE**

---

## 1. Observation

1. **Independent Verification Execution**:
   - `npm test`:
     ```
     ✓ src/lib/__tests__/pricing.test.ts (11 tests) 46ms
     Test Files  1 passed (1)
          Tests  11 passed (11)
     Duration    609ms
     Exit code   0
     ```
   - `npx tsc --noEmit`:
     ```
     Exit code 0 (0 diagnostic errors)
     ```
   - `npm run build`:
     ```
     ▲ Next.js 14.2.35
     ✓ Compiled successfully
     ✓ Generating static pages (4/4)
     Route (app)                              Size     First Load JS
     ┌ ○ /                                    175 B          96.1 kB
     ├ ○ /_not-found                          873 B          88.1 kB
     └ ƒ /api/pricing/calculate               0 B                0 B
     + First Load JS shared by all            87.2 kB
     Exit code 0
     ```

2. **Core Pricing Engine (`src/lib/pricing.ts`)**:
   - Computes:
     - Garment unit price = `garment.basePrice + variantAdjustment` (Line 50)
     - Garment cost = `garmentUnitPrice * validQty` (Line 51)
     - Printing cost = `printPricePerSurface * printSurfacesCount * validQty` (Line 68)
     - Packaging cost = `garment.packagingPrice * validQty` (Line 71)
     - Shipping cost = `garment.shippingPrice` flat per shipment (Line 72)
     - Licensing cost = $\sum (\text{license.price} \times \text{validQty})$ (Line 119)
     - Total = `garmentCost + printingCost + licensingCost + packagingCost + shippingCost` (Line 131)
   - Benchmark check: Garment (฿150) + DTG (฿80) + Packaging (฿15) + Shipping (฿40) + Artwork Licenses (฿40 + ฿60 + ฿25 = ฿125) = **฿410** for 1 unit.
   - Defensive checks:
     - Throws `Garment product not found: ${garmentProductId}` if garment doesn't exist (Line 36).
     - Throws `Garment variant not found: ${garmentVariantId}` if variant doesn't exist in garment (Line 46).
     - Throws `Missing licenseOptionId in artwork license line` if licenseOptionId is falsy (Line 93).
     - Throws `License option not found: ${item.licenseOptionId}` if license option does not exist (Line 108).
     - Throws `License option ${item.licenseOptionId} does not belong to artwork ${item.artworkId}` if mismatched (Line 112).

3. **API Route Handler (`src/app/api/pricing/calculate/route.ts`)**:
   - `export const dynamic = 'force-dynamic'` (Line 7).
   - Validates JSON body with `try...catch` returning HTTP 400 on malformed syntax (Lines 58-68).
   - Validates schema using Zod `pricingCalculateSchema.safeParse` returning HTTP 400 on validation failure (Lines 71-81).
   - Maps errors accurately:
     - Missing garment -> HTTP 404 Not Found (Lines 94-102).
     - Invalid license option / mismatched artwork / missing license / invalid variant -> HTTP 400 Bad Request (Lines 105-118).
     - Uncaught errors -> HTTP 500 Internal Server Error (Lines 120-128).
   - Does NOT export non-standard Zod types/schemas, ensuring complete Next.js App Router route typing conformance.

4. **Layout & Presentation**:
   - `src/app/layout.tsx`: Full-bleed root layout applying `#F5F0E8` paper background, responsive brand header, engine status badge, and technical footer.
   - `src/app/page.tsx`: Clean landing page with direct CTAs to `/studio/new` and `/marketplace`.

5. **Integrity Check**:
   - Zero hardcoded totals (e.g. 410) embedded in calculation logic.
   - Zero facade or mock implementations.
   - Genuinely queries Prisma database models (`GarmentProduct`, `GarmentVariant`, `PrintingService`, `LicenseOption`, `Artwork`).

---

## 2. Logic Chain

1. **Benchmark Compliance**:
   - Survey and R2 require exact THB 410 benchmark: $150 + 80 + 15 + 40 + 125 = 410$.
   - Tested in `pricing.test.ts` across 11 test cases: passes with 100% precision.
   - Quantity scaling to 3 units: $450 + 240 + 45 + 40 + 375 = 1150$ THB: passes.

2. **Anti-Tampering Efficacy**:
   - Any client attempt to inject lower fees, modify license prices, or supply fabricated totals is ignored because:
     - Zod strips unexpected keys from the payload (`tamperedTotal`, `tamperedPrice`).
     - Prices are fetched strictly from authoritative DB records (`garment.basePrice`, `dtgService.pricePerSurface`, `license.price`).
     - Spoofed or swapped license IDs are rejected when `license.artworkId !== item.artworkId`.

3. **App Router Conformance**:
   - Keeping Zod schemas internal (`const`) prevents Next.js route type generation collision with route handler index signatures.
   - `npx tsc --noEmit` and `npm run build` confirm zero typing regressions.

---

## 3. Caveats & Adversarial Findings (Hardening Recommendations)

### [Minor] Finding 1: Unbounded License Array (DoS Risk)
- **What**: In `src/app/api/pricing/calculate/route.ts`, `frontArtworkLicenses`, `backArtworkLicenses`, and `sideArtworkLicenses` do not define a `.max(N)` boundary in their Zod arrays.
- **Where**: `src/app/api/pricing/calculate/route.ts:35-46`
- **Why**: An attacker submitting thousands of license elements causes thousands of sequential database queries (`for (const item of allLicenses) { await prisma.licenseOption.findUnique(...) }`), resulting in connection exhaustion or request latency.
- **Suggestion**: Add `.max(20)` to each license array in the Zod schema, corresponding to maximum permissible canvas layers.

### [Minor] Finding 2: Unbounded Quantity (Integer Overflow Defense)
- **What**: `quantity` in `pricingCalculateSchema` has `.min(1)` but lacks an upper bound `.max(...)`.
- **Where**: `src/app/api/pricing/calculate/route.ts:29-34`
- **Why**: While JS numbers can hold up to $9 \times 10^{15}$, SQLite `Int` columns in Prisma (such as `Order.totalAmount`) are 32-bit signed integers ($2,147,483,647$).
- **Suggestion**: Add `.max(10_000)` to `quantity`.

### [Minor] Finding 3: Error Message Pattern Matching
- **What**: `route.ts` identifies domain errors via `message.includes(...)` string search.
- **Where**: `src/app/api/pricing/calculate/route.ts:94-118`
- **Why**: If error messages change or DB errors happen to contain these phrases, mapping could misclassify errors.
- **Suggestion**: Refactor domain errors in `src/lib/pricing.ts` to typed custom error classes (e.g. `NotFoundError`, `PricingValidationError`).

---

## 4. Conclusion

**Verdict**: **APPROVE**

Worker `worker_m1_1` has delivered an exemplary, secure, and robust Milestone 1 foundation:
1. Server-authoritative calculation prevents all client-side tampering.
2. Exact THB 410 benchmark and quantity scaling are mathematically and programmatically verified.
3. API route `/api/pricing/calculate` has comprehensive input validation, JSON parse error recovery, and proper HTTP status code mapping (400, 404, 500).
4. Root layout and homepage adhere cleanly to brand tokens and Next.js App Router guidelines.
5. All verification commands (`npm test`, `npx tsc --noEmit`, `npm run build`) pass cleanly with exit code 0.

---

## 5. Verification Method

To independently reproduce this verification:

1. **Unit Tests**:
   ```powershell
   npm test
   ```
   *Expected*: 11 tests passed in 1 test file, exit code 0.

2. **Type Checking**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: 0 diagnostic errors, exit code 0.

3. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js build passes with dynamic route `/api/pricing/calculate` and static `/`, exit code 0.
