# Reviewer Handoff Report — Milestone 2 (Auditable Royalty Ledger & Supplier Specs)

**Reviewer Agent:** `teamwork_preview_reviewer` (`reviewer_m2_1_gen2`)  
**Target Milestone:** M2 (Auditable Royalty Ledger & Supplier Specs)  
**Parent Agent:** `orchestrator` (`b128b841-82a3-43da-89c3-1191302bd832`)  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

Direct empirical observations and verbatim tool execution outputs:

### 1.1 TypeScript Typecheck (`npx tsc --noEmit`)
Command: `npx tsc --noEmit`  
Exit code: `0`  
Output:
```
Stdout: (empty)
Stderr: (empty)
```
*Result*: 0 type errors across the entire codebase.

### 1.2 Full Vitest Test Suite (`npm test`)
Command: `npm test`  
Exit code: `1`  
Output:
```
 RUN  v1.6.1 D:/Coding Projects/ape-parel tshirt

 ❯ src/lib/__tests__/orders_royalties.test.ts > Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2) > Suite 2: Cumulative Running Ledger Balance Tracking > accurately maintains sequential balanceAfter stepping (40 -> 100) for consecutive licenses
   AssertionError: expected [ 280, 340 ] to deeply equal [ 240, 300 ]
 ❯ src/lib/__tests__/orders_royalties.test.ts > Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2) > Suite 4: Transaction Atomicity & Rollback Mechanics > rolls back completely if a failure occurs during royalty ledger creation
   AssertionError: expected 14 to be 12 // Object.is equality
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 2. Cumulative Running Ledger Balance Accuracy > maintains strict mathematical balance progression across 5 consecutive orders
   AssertionError: expected 240 to be 140
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 2. Cumulative Running Ledger Balance Accuracy > correctly tracks distinct creators across front, back, and side surfaces without cross-contamination
   AssertionError: expected 480 to be 280
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > strictly prevents double-settlement of already SETTLED obligations
   AssertionError: expected [Function] to throw error matching /not in eligible status/i but got 'No eligible royalty obligations found…'
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > rejects cross-creator obligation hijacking attempt
   AssertionError: expected [Function] to throw error matching /not in eligible status or do not bel…/i but got 'No eligible royalty obligations found…'
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 4. Concurrency & Race Condition Evaluation under SQLite > handles concurrent order placements with Promise.all without state corruption
   AssertionError: expected 260 to be 220
 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 4. Concurrency & Race Condition Evaluation under SQLite > safely handles concurrent double-settlement calls without double-paying
   AssertionError: expected 300 to be 260

 Test Files  2 failed | 4 passed (6)
      Tests  8 failed | 118 passed (126)
```

### 1.3 Sequential Vitest Test Suite (`npx vitest run --no-file-parallelism`)
Command: `npx vitest run --no-file-parallelism`  
Exit code: `1`  
Output:
```
 RUN  v1.6.1 D:/Coding Projects/ape-parel tshirt

 ❯ src/lib/__tests__/orders_royalties_challenger.test.ts  (17 tests | 2 failed) 431ms
   ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > strictly prevents double-settlement of already SETTLED obligations
     → expected [Function] to throw error matching /not in eligible status/i but got 'No eligible royalty obligations found…'
   ❯ src/lib/__tests__/orders_royalties_challenger.test.ts > Challenger M2: Empirical Stress Test Suite (Atomicity, Ledger & Concurrency) > 3. Payout Settlement Deduction & Invariant Defenses > rejects cross-creator obligation hijacking attempt
     → expected [Function] to throw error matching /not in eligible status or do not bel…/i but got 'No eligible royalty obligations found…'
 ✓ src/lib/__tests__/orders_royalties.test.ts  (19 tests) 253ms
 ✓ src/lib/__tests__/pricing_challenger.test.ts  (44 tests) 178ms
 ✓ src/lib/__tests__/pricing_adversarial.test.ts  (31 tests) 99ms
 ✓ src/lib/__tests__/pricing.test.ts  (11 tests) 48ms
 ✓ .agents/teamwork/explorer_m2_3/proposed_production.test.ts  (4 tests) 24ms

 Test Files  1 failed | 5 passed (6)
      Tests  2 failed | 124 passed (126)
```

### 1.4 Next.js Production Build (`npm run build`)
Command: `npm run build`  
Exit code: `0`  
Output:
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
```
*Result*: Build completed with exit code 0. All 5 API route handlers compiled cleanly as dynamic routes (`ƒ`).

### 1.5 Code Review & Business Logic Invariants
1. **Authoritative Pricing & Anti-Tampering (`src/lib/orders.ts:58-76`)**:
   - `createOrderAtomic` invokes `calculateLivePricing` directly on lines 58-65.
   - Anti-tampering check on line 69-76 throws `Price tampering detected: client claimed total ... does not match server authoritative total ...` when `clientClaimedTotal !== pricing.totalAmount`.
   - The authoritative `pricing.totalAmount` is strictly saved to `Order.totalAmount` on line 151.
2. **ACID Transaction Scope (`src/lib/orders.ts:79-283`)**:
   - Everything from `DesignDocument` to `Order`, `RoyaltyObligation[]`, and `RoyaltyLedgerEntry[]` runs inside `await prisma.$transaction(async (tx) => { ... })`.
   - Rollback verified via diagnostic hook `_simulateFailureAtStep`.
3. **Running Ledger Balance Tracking (`src/lib/orders.ts:188-262`)**:
   - Uses `creatorRunningBalances = new Map<string, number>()`.
   - On the first artwork for creator `C`, queries `tx.royaltyLedgerEntry.findFirst({ where: { creatorId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })`.
   - For subsequent artworks in the same order for creator `C`, increments the tracked balance in the map, producing monotonic running balances (`40 -> 100`).
4. **Royalty Payout Settlement Invariants (`src/lib/royalties.ts:210-345`)**:
   - Executes inside `prisma.$transaction`.
   - Transitions obligations to `SETTLED`.
   - Records `PAYOUT_SETTLEMENT` ledger entry with `-totalPayoutAmount`.
   - Writes `AuditEvent` record with full metadata.
5. **Specific Error Handling Gap (`src/lib/royalties.ts:221-239`)**:
   - When caller passes `options.obligationIds`, query filters by `creatorId: canonicalCreatorId` and `status: 'ELIGIBLE'`.
   - If ALL passed `obligationIds` are ineligible (e.g. already settled or belonging to another creator), `eligibleObligations` is empty (`[]`).
   - Line 225 fires: `if (eligibleObligations.length === 0) throw new Error("No eligible royalty obligations found...")`.
   - Lines 231-239:
     ```typescript
     if (options.obligationIds && options.obligationIds.length > 0) {
       const foundIds = new Set(eligibleObligations.map((o) => o.id));
       const missingIds = options.obligationIds.filter((id) => !foundIds.has(id));
       if (missingIds.length > 0) {
         throw new Error(
           `Obligations [${missingIds.join(', ')}] are not in ELIGIBLE status or do not belong to creator "${creator.displayName}".`
         );
       }
     }
     ```
     This block is **dead code** when all requested obligations are ineligible, because line 225 throws a generic error first.
6. **API Route Validation & Status Codes**:
   - `POST /api/orders`: Zod schema `createOrderSchema`, returns `201 Created` on success, `400 Bad Request` on tampering/validation, `404 Not Found` on missing garment.
   - `GET /api/orders`: Paginated query returning `200 OK`.
   - `GET /api/orders/[id]`: Returns `200 OK` on found, `404 Not Found` if missing.
   - `GET /api/orders/[id]/production`: Returns `200 OK` with header `Content-Disposition: attachment; filename="JOB-{orderNumber}.json"`.
   - `POST /api/royalties/settle`: Zod schema `settleRoyaltiesSchema`, returns `200 OK` on success, `400 Bad Request` on business/validation failure, `404 Not Found` on missing creator.

---

## 2. Logic Chain

1. **Acceptance Criteria Mandate**:
   - According to `ORIGINAL_REQUEST.md` (lines 49-52), the acceptance criteria explicitly mandates:
     - `npx tsc --noEmit` passes with zero errors (PASSED)
     - `npm test` passes (FAILED)
     - `npm run build` completes successfully (PASSED)
2. **Analysis of Test Failures**:
   - Direct execution of `npm test` produces **exit code 1** with 8 test failures across 2 test files.
   - Investigation reveals two underlying causes:
     - **Issue 1 (Vitest Configuration & SQLite Parallelism)**:
       Vitest runs test files in parallel across multiple worker threads by default. Because tests perform real database mutations against the single SQLite file (`prisma/dev.db`), parallel test execution results in severe database race conditions: `prisma.order.count()` fluctuates, and concurrent updates to Dash Ape Studio's balance produce deep equality mismatches (e.g. `[280, 340]` vs `[240, 300]`).
       Additionally, test files placed inside `.agents/` are picked up by Vitest, violating `PROJECT.md` layout boundaries and causing further test collisions.
     - **Issue 2 (Error Message Discrepancy in `executeCreatorPayoutSettlement`)**:
       When `obligationIds` are passed that are already `SETTLED` or belong to a different creator, `where: { creatorId, status: 'ELIGIBLE', id: { in: obligationIds } }` returns an empty array.
       The function immediately throws the generic error `No eligible royalty obligations found for settlement...` at line 226 before reaching the targeted validation at line 231.
       This breaks API expectations and causes tests in `orders_royalties_challenger.test.ts` (lines 526 and 557) to fail their regex assertions (`/not in eligible status/i` and `/not in eligible status or do not belong to creator/i`).
3. **Integrity Audit**:
   - No hardcoded test bypasses or facades were detected in `orders.ts`, `royalties.ts`, or `production.ts`. Real Prisma queries and mathematical calculations are executed.
   - However, the worker handoff claimed `npm test` had 109 passing tests with 0 failures, which omitted the newly introduced challenger tests and failed to account for SQLite test concurrency in the global test runner.
4. **Conclusion Derivation**:
   - Because `npm test` fails with exit code 1, the milestone gating cannot pass. The code and test configuration require targeted adjustments before Milestone 2 can be approved.

---

## 3. Caveats

- In single-threaded execution (`npx vitest run src/lib/__tests__/orders_royalties.test.ts`), all 19 of the worker's original integration tests pass.
- The failure under `npm test` is primarily caused by test parallelism over SQLite and the error message specificity mismatch in `executeCreatorPayoutSettlement`.
- Production build and TypeScript compilation are completely healthy.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Required Changes:
1. **Fix `src/lib/royalties.ts` (`executeCreatorPayoutSettlement`)**:
   When `options.obligationIds` is provided, validate the requested obligations specifically to ensure that if any (or all) requested obligations are not eligible or do not belong to the creator, throw the descriptive error:
   `Obligations [id] are not in ELIGIBLE status or do not belong to creator "{name}".`
   This ensures the check is not bypassed when all requested IDs are ineligible.
2. **Update `vitest.config.ts` for SQLite Serial Testing**:
   Configure Vitest to prevent parallel worker collisions on the SQLite database:
   ```typescript
   export default defineConfig({
     test: {
       environment: 'node',
       globals: true,
       fileParallelism: false,
       include: ['src/**/*.{test,spec}.ts'],
     },
     ...
   });
   ```
   This ensures `npm test` runs test files sequentially against SQLite and ignores any scratch tests in `.agents/`.
3. **Verify `npm test` exits with code 0**:
   All 126 tests across all test suites must pass cleanly under the project's standard `npm test` command.

---

## 5. Verification Method

To independently verify these findings:

1. **Reproduce `npm test` failure**:
   ```powershell
   npm test
   ```
   *Observed result*: Exits with code 1, 8 failed tests.

2. **Reproduce Isolated Settlement Error Mismatch**:
   ```powershell
   npx vitest run src/lib/__tests__/orders_royalties_challenger.test.ts
   ```
   *Observed result*: Exits with code 1, 2 failed tests matching lines 526 and 557.

3. **Verify Typecheck & Build Pass**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
   *Observed result*: Both exit with code 0.
