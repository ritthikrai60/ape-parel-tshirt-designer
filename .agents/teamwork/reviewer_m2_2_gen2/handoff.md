# Reviewer Handoff Report — Milestone 2: Supplier Production Package & Production API

**Reviewer Agent:** `teamwork_preview_reviewer` (`reviewer_m2_2_gen2`)  
**Role:** Reviewer 2 & Adversarial Critic  
**Target Milestone:** M2 (Auditable Royalty Ledger & Supplier Specs)  
**Parent Agent:** `orchestrator` (`b128b841-82a3-43da-89c3-1191302bd832`)  
**Working Directory:** `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\reviewer_m2_2_gen2`  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations and verbatim tool execution outputs recorded during Milestone 2 Reviewer 2 evaluation:

### 1.1 TypeScript Typecheck (`npx tsc --noEmit`)
Command: `npx tsc --noEmit`  
Exit code: `0`  
Verbatim Output:
```
Stdout: (empty)
Stderr: (empty)
```
*Result*: 0 type errors across the entire codebase, confirming all interfaces in `src/lib/types.ts` align with `src/lib/production.ts` and `src/app/api/orders/[id]/production/route.ts`.

---

### 1.2 Full Vitest Test Suite (`npm test`)
Command: `npm test`  
Exit code: `1`  
Verbatim Output:
```
> ape-parel@0.1.0 test
> vitest run

The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v1.6.1 D:/Coding Projects/ape-parel tshirt

 ✓ src/lib/__tests__/pricing.test.ts  (11 tests) 93ms
 ✓ .agents/teamwork/explorer_m2_3/proposed_production.test.ts  (4 tests) 246ms
 ✓ src/lib/__tests__/pricing_adversarial.test.ts  (31 tests) 429ms
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts  (17 tests | 2 failed) 646ms
   ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > strictly prevents double-settlement of already SETTLED obligations
     → expected [Function] to throw error matching /not in eligible status/i but got 'No eligible royalty obligations found…'
   ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > rejects cross-creator obligation hijacking attempt
     → expected [Function] to throw error matching /not in eligible status or do not bel…/i but got 'No eligible royalty obligations found…'
 ❯ src/lib/__tests__/orders_royalties.test.ts  (19 tests | 2 failed) 669ms
   ❯ src/lib/__tests__/orders_royalties.test.ts > Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2) > Suite 4: Transaction Atomicity & Rollback Mechanics > rolls back completely if a failure occurs during royalty ledger creation
     → expected 16 to be 15 // Object.is equality
   ❯ src/lib/__tests__/orders_royalties.test.ts > Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2) > Suite 5: Creator Payout Settlement Deduction & Audit Trail > executes atomic payout settlement: updates obligations to SETTLED, writes negative ledger entry, creates settlement record and audit event
     → expected 300 to be 260 // Object.is equality
 ✓ src/lib/__tests__/pricing_challenger.test.ts  (44 tests) 788ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/lib/__tests__/orders_royalties.test.ts > Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2) > Suite 4: Transaction Atomicity & Rollback Mechanics > rolls back completely if a failure occurs during royalty ledger creation
AssertionError: expected 16 to be 15 // Object.is equality

- Expected
+ Received

- 15
+ 16

 ❯ src/lib/__tests__/orders_royalties.test.ts:449:42
    447| 
    448|       // Verify all entities rolled back
    449|       expect(await prisma.order.count()).toBe(ordersBefore);
       |                                          ^
    450|       expect(await prisma.designDocument.count()).toBe(designsBefore);
    451|       expect(await prisma.royaltyObligation.count()).toBe(obligationsB…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/lib/__tests__/orders_royalties.test.ts > Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2) > Suite 5: Creator Payout Settlement Deduction & Audit Trail > executes atomic payout settlement: updates obligations to SETTLED, writes negative ledger entry, creates settlement record and audit event
AssertionError: expected 300 to be 260 // Object.is equality

- Expected
+ Received

- 260
+ 300

 ❯ src/lib/__tests__/orders_royalties.test.ts:500:40
    498|       expect(settlement.status).toBe('COMPLETED');
    499|       expect(settlement.totalAmount).toBe(payoutAmount);
    500|       expect(settlement.balanceBefore).toBe(balanceBefore);
       |                                        ^
    501|       expect(settlement.balanceAfter).toBe(balanceBefore - payoutAmoun…
    502|       expect(settlement.settledObligationsCount).toBe(1);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > strictly prevents double-settlement of already SETTLED obligations
AssertionError: expected [Function] to throw error matching /not in eligible status/i but got 'No eligible royalty obligations found…'

- Expected: 
/not in eligible status/i

+ Received: 
"No eligible royalty obligations found for settlement for creator \"Dash Ape Studio\" (cmv1l9gp000048lk7wp6q51n8)."

 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts:526:7
    524| 
    525|       // Second settlement attempt on the EXACT SAME obligation: MUST …
    526|       await expect(
       |       ^
    527|         executeCreatorPayoutSettlement(testCreator.id, {
    528|           obligationIds: [obId],

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > rejects cross-creator obligation hijacking attempt
AssertionError: expected [Function] to throw error matching /not in eligible status or do not bel…/i but got 'No eligible royalty obligations found…'

- Expected: 
/not in eligible status or do not belong to creator/i

+ Received: 
"No eligible royalty obligations found for settlement for creator \"Cyber Monk\" (cmv1l9gpa00078lk7kiisri99)."

 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts:557:7
    555|       const creator2Id = artStaticGlitch.creatorId;
    556| 
    557|       await expect(
       |       ^
    558|         executeCreatorPayoutSettlement(creator2Id, {
    559|           obligationIds: [c1ObligationId],

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯

 Test Files  2 failed | 4 passed (6)
      Tests  4 failed | 122 passed (126)
   Start at  07:47:15
   Duration  1.45s (transform 381ms, setup 1ms, collect 805ms, tests 2.87s, environment 1ms, prepare 762ms)
```

---

### 1.3 Production Specifications Targeted Test Suites
1. **Isolated Execution of `orders_royalties.test.ts` (19/19 Pass)**:
   Command: `npx vitest run src/lib/__tests__/orders_royalties.test.ts`  
   Exit code: `0`  
   Output:
   ```
   ✓ src/lib/__tests__/orders_royalties.test.ts (19 tests) 259ms
   Test Files 1 passed (1)
        Tests 19 passed (19)
   ```
   Suite 6 (Supplier Production Specification Generation) and Suite 7 (API Route Handlers Integration) passed completely.

2. **Dedicated Production Specs Suite (`proposed_production.test.ts`)**:
   Command: `npx vitest run .agents/teamwork/explorer_m2_3/proposed_production.test.ts`  
   Exit code: `0`  
   Output:
   ```
   ✓ .agents/teamwork/explorer_m2_3/proposed_production.test.ts (4 tests) 29ms
   Test Files 1 passed (1)
        Tests 4 passed (4)
   ```

---

### 1.4 Next.js Production Build (`npm run build`)
Command: `npm run build`  
Exit code: `0`  
Verbatim Output:
```
> ape-parel@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/4) ...
   Generating static pages (1/4) 
   Generating static pages (2/4) 
   Generating static pages (3/4) 
 ✓ Generating static pages (4/4)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    175 B          96.1 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ƒ /api/orders                          0 B                0 B
├ ƒ /api/orders/[id]                     0 B                0 B
├ ƒ /api/orders/[id]/production          0 B                0 B
├ ƒ /api/pricing/calculate               0 B                0 B
└ ƒ /api/royalties/settle                0 B                0 B
+ First Load JS shared by all            87.2 kB
  ├ chunks/117-e5476d4bdcce692a.js       31.7 kB
  ├ chunks/fd9d1056-749e5812300142af.js  53.6 kB
  └ other shared chunks (total)          1.86 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
*Result*: Clean compilation with 0 warnings/errors. `/api/orders/[id]/production` correctly designated as dynamic route (`ƒ`).

---

### 1.5 Detailed Code Review: Production Logic & Architecture

#### 1. Blank Garment SKU & Variant Resolution (`src/lib/production.ts:156-179, 339-353`)
- **Primary lookup**: Checks `design.garmentVariantId` directly against `garmentProduct.variants`.
- **Secondary lookup**: Checks `v.colorHex.toLowerCase() === design.garmentColorHex.toLowerCase() && v.size.toUpperCase() === design.garmentSize.toUpperCase()`.
- **Tertiary lookup**: Fallback match on `v.size.toUpperCase() === design.garmentSize.toUpperCase()`.
- **Fallback SKU synthesis**: `${garmentProduct.sku}-${design.garmentColorHex.replace('#', '')}-${design.garmentSize}` cleanly sanitizes `#` prefix.
- **Spec population**: Blank SKU (`garmentProduct.sku`), variant SKU, colorName, colorHex, size, fit, fabric, weightGsm, and quantity are accurately populated.

#### 2. Printing Technique & Platen Resolution (`src/lib/production.ts:181-193, 354-360`)
- Resolves `DTG` service from `supplier.printingServices` or first available service.
- Fallback platen dimensions: `35.0 cm` width by `45.0 cm` height.

#### 3. Mathematical Exactness of Platen Coordinates & Dimensions (`src/lib/production.ts:40-87`)
- Platen Dimensions: $W = 35.0\text{ cm}$, $H = 45.0\text{ cm}$.
- Formulas:
  $$\text{calculatedWidthCm} = \text{roundCm}\left(\frac{\text{widthPercent}}{100} \times W\right)$$
  $$\text{calculatedHeightCm} = \text{roundCm}\left(\frac{\text{heightPercent}}{100} \times H\right)$$
  $$\text{xCenterCm} = \text{roundCm}\left(\frac{\text{xPercent}}{100} \times W\right)$$
  $$\text{yCenterCm} = \text{roundCm}\left(\frac{\text{yPercent}}{100} \times H\right)$$
  $$\text{xLeftCm} = \text{roundCm}\left(\text{xCenterCm} - \frac{\text{calculatedWidthCm}}{2}\right)$$
  $$\text{yTopCm} = \text{roundCm}\left(\text{yCenterCm} - \frac{\text{calculatedHeightCm}}{2}\right)$$
- Verification of Benchmark Values:
  - Dash Ape Classic ($32\% \times 32\%$, center $50\%, 35\%$):
    - Width: $0.32 \times 35.0 = 11.20\text{ cm}$
    - Height: $0.32 \times 45.0 = 14.40\text{ cm}$
    - Center X: $0.50 \times 35.0 = 17.50\text{ cm}$
    - Center Y: $0.35 \times 45.0 = 15.75\text{ cm}$
    - Left X: $17.50 - 5.60 = 11.90\text{ cm}$
    - Top Y: $15.75 - 7.20 = 8.55\text{ cm}$
  - Cyber Primate ($28\% \times 28\%$, center $50\%, 62\%$):
    - Width: $0.28 \times 35.0 = 9.80\text{ cm}$
    - Height: $0.28 \times 45.0 = 12.60\text{ cm}$
    - Center X: $17.50\text{ cm}$, Center Y: $27.90\text{ cm}$
    - Left X: $12.60\text{ cm}$, Top Y: $21.60\text{ cm}$
  - Static Glitch ($22\% \times 22\%$, center $50\%, 40\%$):
    - Width: $7.70\text{ cm}$, Height: $9.90\text{ cm}$
    - Center X: $17.50\text{ cm}$, Center Y: $18.00\text{ cm}$
    - Left X: $13.65\text{ cm}$, Top Y: $13.05\text{ cm}$
- All results match calculated values with exact 2-decimal precision.

#### 4. High-Resolution Asset Master Prioritization (`src/lib/production.ts:273-296`)
- `const highResAssetUrl = artMeta?.originalUrl || previewUrl;`
- Populates `assetUrl: highResAssetUrl` and `highResAssetUrl: highResAssetUrl`, retaining `previewUrl` for mockups.
- Batch queries missing artworks from `prisma.artwork` on line 234 if not in order obligations.

#### 5. API Endpoint Architecture (`src/app/api/orders/[id]/production/route.ts`)
- Returns `status: 200` with JSON body.
- Headers:
  - `'Content-Type': 'application/json'`
  - `'Content-Disposition': 'attachment; filename="JOB-${productionPackage.orderNumber}.json"'`
  - `'Cache-Control': 'no-store, no-cache, must-revalidate'`
- Error handling:
  - Missing/empty `id`: HTTP `400 Bad Request`.
  - Non-existent order: HTTP `404 Not Found`.
  - Internal unexpected exceptions: HTTP `500 Internal Server Error`.

---

### 1.6 Adversarial Stress Testing & Edge Cases

| Test Case | Input Condition | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Malformed Design Elements | Invalid JSON string in DB | Gracefully parse to empty array | `safeParseElements` returns `[]` | PASS |
| Non-Array Design Elements | JSON string `"{}"` | Gracefully return empty array | `Array.isArray` check returns `[]` | PASS |
| Blank Shirt (0 elements) | Front, Back, Side all empty | Package generated with 0 surfaces | `surfaces: []`, `totalArtworksCount: 0` | PASS |
| Inverted Rotation | `rotation: -45` or `rotation: 270` | Pass through exact degrees | `rotationDeg: -45` passed through | PASS |
| Z-Index Reordering | Elements with zIndex 3, 1, 2 | Sort ascending by zIndex | Sorted `[1, 2, 3]` for bottom-up RIP print | PASS |
| Identifier Polymorphism | Query by CUID vs OrderNumber | Equivalent package returned | Both resolved via `OR: [{ id }, { orderNumber }]` | PASS |
| Missing Supplier Print Tech | Supplier has no `PrintingService` | Fall back to standard DTG | Kornit DTG 35x45 cm default applied | PASS |

---

### 1.7 Integrity Audit

- **Hardcoded test values**: Grepped for static fixtures (e.g. `APX-ORD-9021`). Only found in JSDoc documentation example comment on line 93. Logic executes genuine Prisma queries.
- **Facade implementations**: No mock facades detected.
- **Shortcuts / Task Bypasses**: No external delegation or cheating found.
- **Fabricated verification outputs**: Worker claimed 109 passing tests, but `npm test` currently fails due to newly added challenger tests and SQLite concurrency collisions.

---

## 2. Logic Chain

1. **Production Specification Implementation Quality**:
   - Observations 1.1, 1.3, 1.4, 1.5, and 1.6 confirm that `src/lib/production.ts`, `src/app/api/orders/[id]/production/route.ts`, and `src/lib/types.ts` are implemented with high precision.
   - Blank garment SKUs, variants, print techniques, platen coordinates, high-res assets, HTTP attachment headers, and 404 responses work properly.

2. **Acceptance Criteria Mandate**:
   - `ORIGINAL_REQUEST.md` (lines 49-52) explicitly defines the following pass criteria:
     - `npx tsc --noEmit` passes with 0 errors (PASSED)
     - `npm test` passes (FAILED, Exit code 1)
     - `npm run build` completes successfully (PASSED)

3. **Analysis of Test Suite Failures**:
   - Direct execution of `npm test` produces **exit code 1** with 4 test failures across 2 files (`orders_royalties.test.ts` and `orders_royalties_challenger.test.ts`).
   - Investigation reveals two causes:
     1. **Vitest Multi-Worker Concurrency over Single SQLite Database**:
        Vitest executes test files in parallel by default. Both test files mutate `Order`, `RoyaltyObligation`, and `RoyaltyLedgerEntry` simultaneously, causing database race conditions that distort order counts and creator balances.
     2. **Settlement Error Message Mismatch in `src/lib/royalties.ts`**:
        In `executeCreatorPayoutSettlement`, when caller provides `options.obligationIds` that are not eligible (already settled or belonging to another creator), `tx.royaltyObligation.findMany({ where: { creatorId, status: 'ELIGIBLE', id: { in: obligationIds } } })` returns `[]`. Line 225 throws `No eligible royalty obligations found...` before reaching line 231 (`Obligations [...] are not in ELIGIBLE status or do not belong to creator...`), causing regex assertion failures in `orders_royalties_challenger.test.ts`.

4. **Conclusion Derivation**:
   - Although the production specifications codebase is technically sound, the global project acceptance criteria requires that `npm test` must pass cleanly.
   - Therefore, Milestone 2 cannot be approved until `npm test` exits with code 0.

---

## 3. Caveats

- In isolated single-suite execution (`npx vitest run src/lib/__tests__/orders_royalties.test.ts`), all 19 tests pass 100%.
- In isolated single-suite execution (`npx vitest run .agents/teamwork/explorer_m2_3/proposed_production.test.ts`), all 4 production tests pass 100%.
- The failure under `npm test` is strictly in the royalty settlement error specificity and SQLite parallel test runner configuration, not in the production package generator.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Required Changes:
1. **Fix `src/lib/royalties.ts` (`executeCreatorPayoutSettlement`)**:
   When `options.obligationIds` is provided, validate the requested obligation IDs so that if any requested obligations are ineligible or do not belong to the creator, the error `Obligations [id] are not in ELIGIBLE status or do not belong to creator "{name}".` is thrown.
2. **Update `vitest.config.ts` for Serial Execution**:
   Configure `fileParallelism: false` and `include: ['src/**/*.{test,spec}.ts']` in `vitest.config.ts` to prevent parallel worker collisions on SQLite.
3. **Ensure `npm test` Exits Cleanly with Code 0**:
   All tests across the project must pass under `npm test`.

---

## 5. Verification Method

To independently reproduce all observations and verify resolution:

1. **Verify Production Logic (Isolated)**:
   ```powershell
   npx vitest run .agents/teamwork/explorer_m2_3/proposed_production.test.ts
   npx vitest run src/lib/__tests__/orders_royalties.test.ts -t "Suite 6"
   ```
   *Expected*: All tests pass.

2. **Verify Typecheck and Production Build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
   *Expected*: Exit code 0, 0 errors.

3. **Verify `npm test` Failure (Current Issue)**:
   ```powershell
   npm test
   ```
   *Expected*: Exits with code 1.
