# DISPATCH — Worker M2 (Implementation Squad)

## Identity & Assignment
- Role: Royalty Ledger & Supplier Specs Builder
- Archetype: teamwork_preview_worker
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Reference Specifications
- Explorer 1 Report: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1\handoff.md`
- Explorer 2 Report: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\handoff.md`
- Explorer 3 Report & Proposed Files: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3\handoff.md`, `proposed_production.ts`, `proposed_production_route.ts`

## Exclusive Write Ownership
You exclusively own and may edit:
1. `src/lib/types.ts`
2. `src/lib/orders.ts`
3. `src/lib/royalties.ts`
4. `src/lib/production.ts`
5. `src/lib/__tests__/orders_royalties.test.ts`
6. `src/app/api/orders/route.ts`
7. `src/app/api/orders/[id]/route.ts`
8. `src/app/api/orders/[id]/production/route.ts`
9. `src/app/api/royalties/settle/route.ts`

## Objectives & Deliverables
1. **Types Update (`src/lib/types.ts`)**:
   - Add interfaces for `CreateOrderInput`, `CreateOrderResult`, `CreatorLedgerSummary`, `SettlementResult`, `ProductionJobPackage`.
2. **Atomic Order Placement Service (`src/lib/orders.ts`)**:
   - Implement `createOrderAtomic(input: CreateOrderInput)` using `prisma.$transaction`.
   - Recalculate price authoritatively using `calculateLivePricing`.
   - Reject price tampering if clientClaimedTotal is supplied and does not match server calculation.
   - Atomically create `DesignDocument`, `Order`, `RoyaltyObligation[]` (status ELIGIBLE), and `RoyaltyLedgerEntry[]` (computing accurate `balanceAfter`).
3. **Royalty Ledger & Settlement Service (`src/lib/royalties.ts`)**:
   - Implement `getCreatorLedgerSummary(creatorId: string)`.
   - Implement `executeCreatorPayoutSettlement(creatorId: string, payoutRef?: string)` within `prisma.$transaction` (update eligible obligations to SETTLED, write PAYOUT_SETTLEMENT ledger entry with negative amount and updated balanceAfter, create CreatorSettlement, log AuditEvent).
4. **Supplier Production Specs Generator (`src/lib/production.ts`)**:
   - Implement `generateProductionPackage(orderId: string)` resolving blank garment SKU, printing service, physical cm calculations, placement coordinates, and high-res asset references.
5. **API Routes**:
   - `src/app/api/orders/route.ts` (POST create order, GET query orders)
   - `src/app/api/orders/[id]/route.ts` (GET order details)
   - `src/app/api/orders/[id]/production/route.ts` (GET JSON spec attachment)
   - `src/app/api/royalties/settle/route.ts` (POST settlement execution)
6. **Integration Test Suite (`src/lib/__tests__/orders_royalties.test.ts`)**:
   - Test atomic order creation with THB 410 benchmark allocation.
   - Test ledger balance progression (40 -> 100 for Dash Ape Studio).
   - Test payout settlement balance deduction.
   - Test transaction rollback on simulated error.
7. **Verification**:
   - Run `npx tsc --noEmit` -> verify 0 errors.
   - Run `npm test` -> verify all tests pass (both pricing and orders_royalties suites).
   - Run `npm run build` -> verify clean production build.
   - Document all verification results in `handoff.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-10-10T00:01:26Z
You are worker_m2_1. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\DISPATCH.md

You have access to the detailed Explorer reports and proposed code at:
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1\handoff.md
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\handoff.md
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3\handoff.md
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3\proposed_production.ts
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3\proposed_production_route.ts

Exclusive Write Ownership:
1. src/lib/types.ts
2. src/lib/orders.ts
3. src/lib/royalties.ts
4. src/lib/production.ts
5. src/lib/__tests__/orders_royalties.test.ts
6. src/app/api/orders/route.ts
7. src/app/api/orders/[id]/route.ts
8. src/app/api/orders/[id]/production/route.ts
9. src/app/api/royalties/settle/route.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your tasks:
1. Update `src/lib/types.ts` with required interfaces.
2. Implement `src/lib/orders.ts` (atomic order placement with prisma.$transaction, anti-tampering pricing recalculation, creation of Order, RoyaltyObligations, RoyaltyLedgerEntries with running balanceAfter).
3. Implement `src/lib/royalties.ts` (creator ledger summary, payout settlements within transaction).
4. Implement `src/lib/production.ts` (generateProductionPackage resolving blank SKU, printing technique, physical cm dimensions, and asset URLs).
5. Implement API route handlers:
   - `src/app/api/orders/route.ts`
   - `src/app/api/orders/[id]/route.ts`
   - `src/app/api/orders/[id]/production/route.ts`
   - `src/app/api/royalties/settle/route.ts`
6. Create integration test suite `src/lib/__tests__/orders_royalties.test.ts` validating atomic order creation, THB 410 benchmark allocation, ledger balance progression (40 -> 100), payout settlement deduction, and rollback on error.
7. Run `npx tsc --noEmit`, `npm test`, and `npm run build`. Verify all succeed with 0 errors.
8. Write a full handoff report in `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\handoff.md` with verification command outputs.
9. Send a completion message to the orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
