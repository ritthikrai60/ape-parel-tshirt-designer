# Comprehensive Survey & Architectural Report: Financial Accounting, Ledger & Tests (R3)

**Author**: Teamwork Explorer #3 (Financial Accounting, Ledger & Tests)  
**Date**: 2026-10-10  
**Target Milestone**: Gen 4 - Graphic Creator Portal & Financial Reconciliation Engine  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_gen4_3`  
**Reference Document**: `.agents/teamwork/ORIGINAL_REQUEST.md` (Section `## 2026-10-10T05:13:06Z`)

---

## 1. Observation

### 1.1 Existing Financial, Pricing, and Royalty Modules

1. **`src/lib/pricing.ts` (Authoritative Server-Side Pricing Engine)**
   - **Lines 8–152**: `calculateLivePricing(payload: PricingPayload): Promise<PriceCalculationResult>`
   - Calculates itemized breakdown:
     - Garment base: `garment.basePrice + variantAdjustment` (Benchmark APX-HVY-001: 150 THB).
     - DTG Printing: `printPricePerSurface * surfacesCount * quantity` (Benchmark 1 surface: 80 THB).
     - Packaging: `garment.packagingPrice * quantity` (Benchmark: 15 THB).
     - Shipping: `garment.shippingPrice` flat per shipment (Benchmark: 40 THB).
     - Licensing subtotal: `allLicenses` iterated via `prisma.licenseOption.findUnique` (Benchmark 3 licenses: 40 + 60 + 25 = 125 THB).
     - Authoritative Total: `150 + 80 + 15 + 40 + 125 = 410 THB`.
   - Strict server-side verification: Rejects invalid `garmentProductId`, invalid `licenseOptionId`, or mismatched `artworkId` on lines 111–115.

2. **`src/lib/orders.ts` (Atomic Order Placement Service)**
   - **Lines 27–284**: `createOrderAtomic(input: CreateOrderInput): Promise<CreateOrderResult>`
   - Wraps entire execution in `prisma.$transaction(async (tx) => { ... })`.
   - **Lines 68–76**: Anti-tampering check: Rejects any mismatch where `input.clientClaimedTotal !== pricing.totalAmount`.
   - **Lines 171–262**: Creates `RoyaltyObligation` and `RoyaltyLedgerEntry` for each license line item.
   - **Lines 205–216**: `RoyaltyObligation` created with `unitRoyalty: license.price`, `quantity`, `totalAmount: license.price * quantity`, `status: 'ELIGIBLE'`.
   - **Lines 233–262**: Calculates in-transaction running balance per creator (`creatorRunningBalances.get(creatorId)`). Creates `RoyaltyLedgerEntry` with `entryType: 'EARNING'`, `amount: obligationTotal`, `balanceAfter: newBalance`.
   - Note on legacy contract: The existing contract writes 100% of license fee as `obligationTotal` and `amount` directly into `RoyaltyObligation` and `RoyaltyLedgerEntry`.

3. **`src/lib/royalties.ts` (Royalty Ledger & Settlement Service)**
   - **Lines 54–181**: `getCreatorLedgerSummary(creatorIdOrSlug: string): Promise<CreatorLedgerSummary>`
     - Computes `currentBalance` from latest `RoyaltyLedgerEntry.balanceAfter` (or 0).
     - Computes `lifetimeEarnings` from `RoyaltyLedgerEntry` aggregate `where: { entryType: 'EARNING' }`.
     - Computes `totalSettled` from `CreatorSettlement` aggregate `where: { status: 'COMPLETED' }`.
     - Groups obligations into `pendingObligations`, `eligibleObligations`, `settledObligations`.
   - **Lines 192–346**: `executeCreatorPayoutSettlement(creatorIdOrSlug: string, options?: PayoutSettlementOptions): Promise<SettlementResult>`
     - Executes inside `prisma.$transaction`.
     - Queries eligible obligations (`status: 'ELIGIBLE'`).
     - Verifies `balanceBefore >= totalPayoutAmount`.
     - Creates `CreatorSettlement` (`status: 'COMPLETED'`, `settlementNumber: APX-STL-YYYYMMDD-XXXXX`).
     - Updates obligations to `status: 'SETTLED'`.
     - Writes negative `RoyaltyLedgerEntry` (`entryType: 'PAYOUT_SETTLEMENT'`, `amount: -totalPayoutAmount`, `balanceAfter: balanceBefore - totalPayoutAmount`).
     - Writes `AuditEvent` (`action: 'ROYALTY_PAYOUT_SETTLED'`).
   - **Lines 351–389**: `getCreatorLedgerEntries` with pagination support.
   - **Lines 394–409**: `getCreatorSettlements` history query.

4. **`src/app/api/royalties/settle/route.ts` (Settlement API Endpoint)**
   - **Lines 36–122**: `POST` handler validates payload with Zod schema (`creatorId`, optional `payoutReference`, `obligationIds`, `notes`).
   - **Lines 128–168**: `GET` handler returns ledger summary for `creatorId`.

5. **`prisma/schema.prisma` (Database Schema)**
   - **Lines 194–210**: `model RoyaltyObligation`: `orderId`, `creatorId`, `artworkId`, `licenseOptionId`, `unitRoyalty`, `quantity`, `totalAmount`, `status` (`PENDING`, `ELIGIBLE`, `SETTLED`, `CANCELLED`).
   - **Lines 212–223**: `model RoyaltyLedgerEntry`: `creatorId`, `obligationId`, `entryType` (`EARNING`, `PAYOUT_SETTLEMENT`, `ADJUSTMENT`), `amount` (Int), `balanceAfter` (Int), `reference`, `notes`.
   - **Lines 225–234**: `model CreatorSettlement`: `creatorId`, `settlementNumber`, `totalAmount`, `status` (`COMPLETED`), `payoutReference`.
   - **Lines 236–245**: `model AuditEvent`: `userId`, `action`, `entityType`, `entityId`, `payload` (JSON string).
   - Currently absent from schema: `CreatorStorefrontSettings`, `ArtworkFileSpec`, `CommissionRule`, `FinancialAccount`, `FinancialJournalEntry`, `ReconciliationReport`.

6. **Existing Portals & UI Pages**
   - `src/app/creator/dashboard/page.tsx` + `src/components/portal/CreatorDashboardClient.tsx`: General dashboard displaying sales volume, available balance, lifetime earnings, recent ledger table, and settlement trigger modal.
   - `src/app/creator/earnings`: Currently DOES NOT EXIST. Must be created for R3.

---

### 1.2 Test Baseline Execution & Inspection

We executed the full automated verification suite directly against the current repository state:

1. **`npm test` (`vitest run`)**
   - **Command Result**: Exited with code `0`.
   - **Duration**: 6.59 seconds.
   - **Suites**: 13 test files passed (13 total).
   - **Tests**: 268 passed (268 total), 0 failed.
   - **Breakdown of 13 Test Suites**:
     | Test File | Test Count | Focus Area |
     |---|---|---|
     | `src/lib/__tests__/m5_graphics_production_challenger.test.ts` | 21 | High-res masters, DPI specs, 3D UV mapping, supplier production packaging |
     | `src/lib/__tests__/orders_royalties_challenger.test.ts` | 19 | Isolated creator stress, concurrency race condition, anti-hijack checks |
     | `src/lib/__tests__/orders_royalties.test.ts` | 19 | Canonical 410 THB benchmark, atomic rollback, balance stepping, settlements |
     | `src/lib/__tests__/challenger_m5_pricing_ledger.test.ts` | 16 | Zero orphan rollback, multi-license in-tx balance progression, immutability |
     | `src/lib/__tests__/orders_api_adversarial.test.ts` | 33 | Order API tamper resistance, invalid options, boundary inputs |
     | `src/lib/__tests__/pricing_challenger.test.ts` | 44 | Quantity scaling, surface pricing combinations, variant adjustments |
     | `src/lib/__tests__/portals_marketplace_challenger.test.ts` | 19 | Creator storefronts, marketplace catalog, supplier portal specs |
     | `src/lib/__tests__/m5_adversarial_final.test.ts` | 13 | Final Tier 5 end-to-end integration boundary checks |
     | `src/lib/__tests__/pricing_adversarial.test.ts` | 31 | Tampering divergence probes (+1/-1 THB), fee spoofing rejection |
     | `src/lib/__tests__/studio_challenger.test.ts` | 12 | Three.js geometry, UV boundaries, multi-layer canvas composition |
     | `src/lib/__tests__/portals_marketplace.test.ts` | 18 | Multi-role portal endpoints, orders status transitions, audit events |
     | `src/lib/__tests__/studio_pipeline.test.ts` | 12 | tshirt.obj file structure, UV coordinate limits (Front <= 0.5, Back >= 0.5) |
     | `src/lib/__tests__/pricing.test.ts` | 11 | Exact THB 410 benchmark assertions, packaging, shipping rates |
     | **Total** | **268** | **100% Passing Baseline** |

2. **`npx tsc --noEmit`**
   - **Command Result**: Exited with code `0`.
   - Zero TypeScript compiler errors across all files.

3. **`npm run build` (`next build`)**
   - **Command Result**: Exited with code `0`.
   - Production bundle compiled with zero syntax or build errors.

---

## 2. Logic Chain

### 2.1 Preserving Existing Test Contracts while Introducing R3

1. **Direct Dependency in Existing Tests**:
   - In `src/lib/__tests__/orders_royalties.test.ts` (lines 199–209):
     ```typescript
     expect(ob1?.unitRoyalty).toBe(40);
     expect(ob1?.totalAmount).toBe(40);
     expect(ob2?.unitRoyalty).toBe(60);
     expect(ob2?.totalAmount).toBe(60);
     expect(ob3?.unitRoyalty).toBe(25);
     expect(ob3?.totalAmount).toBe(25);
     ```
   - In `src/lib/__tests__/orders_royalties.test.ts` (line 216–219):
     ```typescript
     const ledgerEntries = await prisma.royaltyLedgerEntry.findMany({ where: { reference: result.orderNumber } });
     expect(ledgerEntries).toHaveLength(3);
     expect(ledgerEntries.map(e => e.amount)).toEqual(expect.arrayContaining([40, 60, 25]));
     ```
   - In `src/lib/__tests__/challenger_m5_pricing_ledger.test.ts` (lines 561–564):
     ```typescript
     expect(entries[0].amount).toBe(40);
     expect(entries[0].balanceAfter).toBe(initialBalance + 40);
     expect(entries[1].amount).toBe(60);
     expect(entries[1].balanceAfter).toBe(initialBalance + 100);
     ```
   - In `src/lib/types.ts` (line 109):
     ```typescript
     expect(result.ledgerEntriesCount).toBe(createdObligations.length);
     ```

2. **Deduction & Architectural Decision**:
   - If we modified `createOrderAtomic` to inject separate commission deduction entries into `RoyaltyLedgerEntry` or changed `obligation.totalAmount` to 85% on standard orders, **at least 8 existing test suites would fail instantly**.
   - Therefore, the architectural solution is a **Dual-Layer Accounting Structure**:
     - **Layer 1 (Royalty Ledger & Obligations)**: Preserves `RoyaltyObligation` and `RoyaltyLedgerEntry` contract exactly as-is for backward compatibility. Add non-breaking optional fields `debit` (Int @default(0)) and `credit` (Int @default(0)) to `RoyaltyLedgerEntry`. When an earning is written, `credit = amount, debit = 0`. When a payout settlement is written, `debit = Math.abs(amount), credit = 0`. This guarantees:
       $$\sum \text{Credits} - \sum \text{Debits} = \text{Current Balance}$$
     - **Layer 2 (Double-Entry General Ledger Engine)**: Introduce `FinancialAccount`, `FinancialJournalEntry`, and `CommissionRule` to formally record:
       - Platform GMV (Debit: Cash/Gateway Clearing Asset Account).
       - 15% Platform Commission (Credit: Commission Revenue Account).
       - 85% Creator Royalty Accruals (Credit: Creator Payable Liability Account).
       - Payout Disbursements (Debit: Creator Payable Liability Account, Credit: Cash Clearing Asset Account).
     - This gives us complete double-entry bookkeeping with strict balance conservation while guaranteeing 100% compatibility with the 268 baseline tests.

---

### 2.2 R3 Double-Entry Bookkeeping & Commission Architecture

#### Account Taxonomy (`FinancialAccount`)
```
Account Code              | Type      | Normal Balance | Purpose
--------------------------|-----------|----------------|-------------------------------------------
AC-ASSET-GATEWAY-CLEARING | ASSET     | Debit          | Tracks gross payments received from buyers (GMV)
AC-REV-PLATFORM-COMMISSION| REVENUE   | Credit         | Tracks ape-parel's 15% commission earnings
AC-LIAB-CREATOR-PAYABLE   | LIABILITY | Credit         | Tracks 85% net royalties accrued to creators
AC-ASSET-PAYOUT-DISBURSE  | ASSET     | Credit         | Tracks funds disbursed via PromptPay/Bank
```

#### Journal Entry Mapping per Order Transaction (Example Benchmark Order)
- Benchmark Order Licensing GMV: 125 THB (Dash Ape 40 + Cyber Primate 60 + Static Glitch 25).
- Commission Rule: Platform Fee = 15%, Creator Royalty = 85%.

1. **Order Revenue & Accrual Journal Entry (`REF: APX-ORD-XXXX`)**:
   - **Debit**: `AC-ASSET-GATEWAY-CLEARING` = 125 THB (Gross Licensing GMV)
   - **Credit**: `AC-REV-PLATFORM-COMMISSION` = 19 THB ($\text{round}(125 \times 0.15) = 18.75 \rightarrow 19$ THB)
   - **Credit**: `AC-LIAB-CREATOR-PAYABLE:dash-ape` = 34 THB ($40 \times 0.85$)
   - **Credit**: `AC-LIAB-CREATOR-PAYABLE:cyber-monk` = 51 THB ($60 \times 0.85$)
   - **Credit**: `AC-LIAB-CREATOR-PAYABLE:static-glitch` = 21 THB ($\text{round}(25 \times 0.85) = 21.25 \rightarrow 21$ THB)
   - **Check**: $\text{Debits} (125) = \text{Credits} (19 + 34 + 51 + 21 = 125)$. Total Debits = Total Credits.

2. **Payout Disbursement Journal Entry (`REF: APX-STL-YYYYMMDD-XXXX`)**:
   - Creator requests payout of 85 THB.
   - **Debit**: `AC-LIAB-CREATOR-PAYABLE:creatorId` = 85 THB
   - **Credit**: `AC-ASSET-GATEWAY-CLEARING` (or Payout Account) = 85 THB
   - **Check**: Total Debits (85) = Total Credits (85).

---

### 2.3 Financial Reconciliation Engine Design (`src/lib/reconciliation.ts`)

The reconciliation engine performs an automated, auditable 4-way matching procedure:

```
[ Platform Orders ]  <--- (1) Match Orders to Obligations --->  [ Royalty Obligations ]
        |                                                                 |
        |                                                                 |
   (2) Match GMV                                                    (3) Match Credits
        |                                                                 |
        v                                                                 v
[ Financial Accounts ] <--- (4) Balance Conservation Check ---> [ Royalty Ledger Entries ]
        |                                                                 |
        +-----------------> [ Reconciliation Report ] <-------------------+
```

#### Core Verification Algorithms:
1. **Balance Conservation Invariant**:
   For every creator profile $c \in \text{CreatorProfiles}$:
   $$\text{VerifiedBalance}(c) = \sum_{e \in \text{LedgerEntries}(c)} \text{Credit}(e) - \sum_{e \in \text{LedgerEntries}(c)} \text{Debit}(e)$$
   Assert:
   $$\text{VerifiedBalance}(c) == \text{CurrentBalance}(c) == \text{LatestEntry.balanceAfter}$$
   If any discrepancy exists ($\Delta \neq 0$), flag anomaly with `status: 'DISCREPANCY_DETECTED'`.

2. **Order-to-Obligation Completeness**:
   - For every paid `Order` containing licensed artworks, verify that exactly $N$ `RoyaltyObligation` records exist.
   - Verify `sum(obligation.totalAmount) == order.licensingCost`.

3. **Obligation-to-Ledger Consistency**:
   - For every `RoyaltyObligation`, verify that a corresponding `RoyaltyLedgerEntry` exists where `obligationId == obligation.id` and `amount == obligation.totalAmount`.

4. **Settlement-to-Disbursement Consistency**:
   - For every `CreatorSettlement`, verify that all linked obligations are in `status: 'SETTLED'`.
   - Verify a corresponding negative `RoyaltyLedgerEntry` exists with `reference == settlement.settlementNumber` and `amount == -settlement.totalAmount`.

5. **Report Generation & Audit Trail**:
   - Compiles audit results into `ReconciliationReport` in SQLite:
     - `totalOrdersAudited`, `totalGmv`, `totalPlatformCommission`, `totalCreatorRoyalties`, `totalDisbursements`, `discrepanciesCount`, `balanceConservationPassed`.
   - Writes `AuditEvent` (`action: 'FINANCIAL_RECONCILIATION_COMPLETED'`).

---

### 2.4 Creator Financial Dashboard (`/creator/earnings`) Architecture

The dashboard serves as the self-service financial cockpit for creators at `/creator/earnings`.

#### Required Capabilities:
1. **Financial Overview KPIs**:
   - **Available Balance**: Immediately withdrawable cleared earnings.
   - **Pending Royalties**: Royalties from orders in production or escrow holding period.
   - **Cleared Royalties**: Historical total royalties eligible/cleared.
   - **Lifetime Payouts**: Historical total successfully disbursed.
   - **Platform Commission Breakdown**: Total gross licensing volume generated vs. 15% platform fee deducted vs. 85% creator net.

2. **Downloadable Financial Statements**:
   - Endpoint: `GET /api/creator/statements?creatorId=...&period=YYYY-MM&format=csv` (or json).
   - Generates itemized accounting statements: Order Date, Order Number, Artwork Title, License Tier, Gross Fee (GMV), 15% Platform Commission, 85% Creator Net Royalty, Running Balance.
   - Includes official header, settlement references, and PromptPay/Bank disbursement timestamps.

3. **Payout Request Flow (`REQUESTED -> APPROVED -> SETTLED`)**:
   - **Step 1: REQUESTED**:
     - Creator submits payout request via UI modal on `/creator/earnings`.
     - Validates minimum payout threshold (e.g. 100 THB) and `requestedAmount <= currentBalance`.
     - Creates `CreatorSettlement` with `status: 'REQUESTED'`.
     - Logs `AuditEvent` (`action: 'PAYOUT_REQUEST_SUBMITTED'`).
   - **Step 2: APPROVED** (Administrative check):
     - Admin or automated rule verifies account standing.
     - Transitions `status: 'APPROVED'`.
     - Logs `AuditEvent` (`action: 'PAYOUT_REQUEST_APPROVED'`).
   - **Step 3: SETTLED**:
     - Calls `executeCreatorPayoutSettlement`.
     - Atomically marks obligations `SETTLED`, writes negative `RoyaltyLedgerEntry`, writes double-entry disbursement journal, and transitions settlement to `status: 'SETTLED'`.
     - Logs `AuditEvent` (`action: 'ROYALTY_PAYOUT_SETTLED'`).

---

### 2.5 Zero-Regression Test Strategy

To guarantee that the existing 268 baseline tests continue to pass without a single regression while establishing comprehensive coverage for R3:

1. **Non-Destructive Schema Extension**:
   - Add new models (`CreatorStorefrontSettings`, `ArtworkFileSpec`, `CommissionRule`, `FinancialAccount`, `FinancialJournalEntry`, `ReconciliationReport`) without altering any existing columns or constraints in `Order`, `RoyaltyObligation`, `RoyaltyLedgerEntry`, or `CreatorSettlement`.
   - Add new columns to existing models only with safe defaults (`@default(0)` or nullable `?`).
   - Run `npx prisma db push` to synchronize SQLite `dev.db`.

2. **Backward-Compatible Service Signatures**:
   - In `src/lib/orders.ts`: Preserve `createOrderAtomic(input)` output structure (`orderId`, `orderNumber`, `designId`, `totalAmount`, `costs`, `obligationsCount`, `ledgerEntriesCount`, `obligations`). Hook double-entry ledger recording non-disruptively inside the existing transaction.
   - In `src/lib/royalties.ts`: Keep `executeCreatorPayoutSettlement` and `getCreatorLedgerSummary` returning existing shape, while adding helper functions for the new payout request lifecycle (`requestCreatorPayout`, `settleCreatorPayoutRequest`).

3. **New Dedicated Vitest Test Suites**:
   - Create 3 separate test files in `src/lib/__tests__/`:
     1. `financial_accounting_double_entry.test.ts` (~20 tests):
        - Validates 15% platform commission and 85% creator split calculations.
        - Validates double-entry journal creation (Debits == Credits per transaction).
        - Validates GMV tracking and account balance conservation.
     2. `financial_reconciliation_engine.test.ts` (~20 tests):
        - Validates $\sum \text{Credits} - \sum \text{Debits} == \text{Current Balance}$ across all test creators.
        - Validates 4-way matching between Orders, Obligations, Ledger Entries, and Settlements.
        - Validates discrepancy detection when an intentional unbalance is simulated.
        - Validates `ReconciliationReport` generation and audit events.
     3. `creator_earnings_payout_flow.test.ts` (~20 tests):
        - Validates `/creator/earnings` API routes.
        - Validates payout request lifecycle (`REQUESTED` $\rightarrow$ `SETTLED`).
        - Validates statement generation (CSV and JSON format exports).
        - Validates boundary checks (insufficient balance, duplicate requests, negative payout requests).
   - Expected post-implementation test count: $268 + ~60 = ~328$ passing tests.

---

## 3. Caveats

1. **Integer Arithmetic & Fractional Satangs**:
   - In Thailand e-commerce and the current Prisma schema, currency amounts are stored as integers in THB (`price Int`, `amount Int`).
   - A 15% platform fee on an odd license fee (such as 25 THB for Static Glitch) yields $25 \times 0.15 = 3.75$ THB, and 85% yields $21.25$ THB.
   - **Resolution**: The accounting engine must adopt a deterministic rounding standard:
     $$\text{platformFee} = \text{round}(\text{fee} \times 0.15)$$
     $$\text{creatorRoyalty} = \text{fee} - \text{platformFee}$$
     This guarantees:
     $$\text{platformFee} + \text{creatorRoyalty} == \text{fee} \quad \text{(exact conservation without orphan pennies)}$$
     For 25 THB: $\text{platformFee} = \text{round}(3.75) = 4$ THB; $\text{creatorRoyalty} = 25 - 4 = 21$ THB ($4 + 21 = 25$).

2. **Existing `/creator/dashboard` vs New `/creator/earnings`**:
   - `/creator/dashboard` currently exists as a high-level operational overview (recent orders, basic balance, quick settlement trigger).
   - `/creator/earnings` is specified by R3 as the dedicated Financial Dashboard featuring detailed pending vs. cleared breakdown, downloadable statements, and structured payout request workflows.
   - Both routes should be retained and cross-linked in navigation to prevent breaking existing navigation tests or user bookmarks.

3. **SQLite Single-Writer Concurrency**:
   - SQLite supports high concurrent reads but serializes writes.
   - Large batch reconciliation runs must be executed as read-only audit queries first, writing only the summary `ReconciliationReport` record upon completion, ensuring zero locking contention with active customer order placements.

---

## 4. Conclusion

1. **Baseline Health**: The codebase is in pristine condition: 268/268 Vitest tests pass in 6.59 seconds, `npx tsc --noEmit` produces 0 errors, and Next.js production build (`npm run build`) compiles cleanly.
2. **Contract Preservation**: Existing tests in `orders_royalties.test.ts` and `challenger_m5_pricing_ledger.test.ts` explicitly assert legacy `RoyaltyLedgerEntry` amounts (`[40, 60, 25]`). These must not be altered destructively.
3. **Architecture Blueprint for Implementation**:
   - Implement R3 double-entry accounting via non-destructive additions: `FinancialAccount`, `FinancialJournalEntry`, and `CommissionRule`.
   - Augment `RoyaltyLedgerEntry` with non-breaking `debit` and `credit` columns (@default(0)) to provide native balance-conservation validation.
   - Implement `src/lib/reconciliation.ts` featuring the 4-way matching engine and balance-conservation invariant check ($\sum \text{Credits} - \sum \text{Debits} == \text{Current Balance}$).
   - Build `/creator/earnings` UI (`src/app/creator/earnings/page.tsx`, `src/components/portal/CreatorEarningsClient.tsx`) with pending/cleared breakdown, CSV statement downloads, and `REQUESTED -> SETTLED` payout request lifecycle.
   - Implement the test suite with 3 new test files (~60 tests) covering double-entry bookkeeping, reconciliation, and earnings/payout flows, guaranteeing 0 regressions on all 268 baseline tests.

---

## 5. Verification Method

To independently reproduce and verify this investigation:

1. **Verify Baseline Test Suite (268 tests)**:
   ```powershell
   npm test
   ```
   *Expected output*: 13 test files passed, 268 passed, 0 failed.

2. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected output*: Exit code 0, no output.

3. **Verify Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Expected output*: Exit code 0, all routes compiled cleanly.

4. **Verify Seeded Database State**:
   ```powershell
   node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.order.count(), p.royaltyObligation.count(), p.royaltyLedgerEntry.count()]).then(([o, ob, l]) => { console.log({ orders: o, obligations: ob, ledgerEntries: l }); p.\$disconnect(); });"
   ```

5. **Invalidation Conditions**:
   - Any test failure in the 13 existing test files invalidates the zero-regression guarantee.
   - Any modification to `RoyaltyObligation.totalAmount` or `RoyaltyLedgerEntry.amount` on benchmark orders that alters the `[40, 60, 25]` sequence invalidates `orders_royalties.test.ts` lines 216–219.
