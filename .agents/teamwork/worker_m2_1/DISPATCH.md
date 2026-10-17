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


## 2026-10-10T18:55:23Z
You are Worker 1 (worker_m2_1) for Milestone 2 of the ape-parel project.
Working directory: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1`
Project root: `d:\Coding Projects\ape-parel tshirt`
Authoritative Request: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md`
Project Scope: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_7\PROJECT.md`
Predecessor Reports:
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m1_gen2_1\handoff.md`
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m1_2\handoff.md`
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m1_1\handoff.md`
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\reviewer_m1_1\handoff.md`
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\reviewer_m1_2\handoff.md`
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\auditor_m1_1\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
You exclusively own:
- `src/lib/__tests__/m5_graphics_production_challenger.test.ts`
- `src/lib/__tests__/studio_pipeline.test.ts`
- `src/lib/__tests__/studio_challenger.test.ts`
- `src/lib/__tests__/m5_adversarial_final.test.ts`
- `src/lib/tshirtGeometry.ts` (if needed for fallback alignment)
- `src/components/studio/GarmentPreview3D.tsx` (if needed)
DO NOT modify `public/models/tshirt.obj` (this asset is sealed and audited).

Task:
Milestone 2: Test Alignment & 3D Studio Integration
1. Align `src/lib/__tests__/m5_graphics_production_challenger.test.ts`:
   - Lines 188–190: Update expected counts to match the genuine Blender loop-unwrapped OBJ model: 1,462 vertices (`v`), 1,104 UVs (`vt`), 1,174 normals (`vn`), 2,680 faces (`f`).
   - Line 227: Update upper bound on vertex reference indices to 1,462.
   - Line 387 ("verifies Back surface is UNMIRRORED"): In standard Wavefront OBJ format, UVs are associated with vertices per-face-corner (`f v/vt/vn`), not as a 1:1 parallel array indexed by `positions[i]`. Update the test logic to map positions and UVs through the face loop definitions (`f.v` -> `f.vt`), matching the actual Wavefront OBJ format.
   - Un-skip all skipped tests in this file (e.g. `test.skip` -> `test`) and ensure they pass.
2. Align `src/lib/__tests__/studio_pipeline.test.ts`:
   - Line 111: Update legacy 8% buffer margin assertion (`u >= 0.539`) to strict 50/50 partition (`u >= 0.500`), matching Feature 2 and Feature 6 in `PROJECT.md`.
3. Align `src/lib/__tests__/studio_challenger.test.ts`:
   - Un-skip all 4 skipped tests in this file and ensure they pass on the new model.
4. Align `src/lib/__tests__/m5_adversarial_final.test.ts`:
   - Un-skip any skipped tests and ensure they pass on the new model.
5. Verify `src/components/studio/GarmentPreview3D.tsx` and Next.js `DesignStudioClient` integration.
6. Run test and build commands:
   - `npx vitest run src/lib/__tests__/m5_graphics_production_challenger.test.ts`
   - `npx vitest run src/lib/__tests__/studio_pipeline.test.ts`
   - `npx vitest run src/lib/__tests__/studio_challenger.test.ts`
   - `npx vitest run src/lib/__tests__/m5_adversarial_final.test.ts`
   - `npm test`
   - `npx tsc --noEmit`
   - `npm run build`

Output:
Write your full report to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\handoff.md` with:
- Observation (files changed, line numbers, exact diff rationale)
- Logic Chain & Caveats
- Command outputs (test results, build output)
- Conclusion & Verification method
Notify your orchestrator when done via send_message.


## 2026-10-10T19:00:26Z
[Message] timestamp=2026-10-10T19:00:26Z sender=2497e6f8-1432-4f9c-b218-8816c43f5522 priority=MESSAGE_PRIORITY_HIGH content=**Context**: Milestone 2 Test Alignment & Studio Integration Progress Check
**Content**: Please provide your current progress status. What step of your plan are you currently executing? If you have completed test alignments or encountered any issues, please report.
**Action**: Report current status and next actions.
