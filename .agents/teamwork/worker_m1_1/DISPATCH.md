# DISPATCH — Worker M1 (Implementation Squad)

## Identity & Assignment
- Role: Pricing Engine, Tests & App Router Builder
- Archetype: teamwork_preview_worker
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m1_1
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Reference Specifications
- Explorer 1 Report: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_1\handoff.md`
- Explorer 2 Report & Code: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_2\handoff.md`, `proposed_route.ts`, `proposed_layout.tsx`, `proposed_page.tsx`
- Explorer 3 Report: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_3\handoff.md`

## Exclusive Write Ownership
You exclusively own and may edit:
1. `src/app/layout.tsx`
2. `src/app/page.tsx`
3. `src/lib/pricing.ts`
4. `src/lib/__tests__/pricing.test.ts`
5. `src/app/api/pricing/calculate/route.ts`

DO NOT modify files outside this set without orchestrator approval.

## Objectives & Deliverables
1. **Next.js 14 Root Shell**:
   - Create `src/app/layout.tsx` using brand styling (`#F5F0E8` paper, `#131718` ink), metadata, and font declarations.
   - Create `src/app/page.tsx` providing clean landing page and entrypoints to `/marketplace` and `/studio/new`.
2. **Defensive Pricing Engine**:
   - In `src/lib/pricing.ts`, update `calculateLivePricing` to throw a descriptive error when a `licenseOptionId` is not found or when `license.artworkId !== item.artworkId`, preventing silent fee evasion.
3. **Pricing Vitest Test Suite**:
   - Create `src/lib/__tests__/pricing.test.ts` implementing tests for:
     - Exact THB 410 benchmark: 1 unit of `APX-HVY-001` (150) + Bangkok DTG (80) + Packaging (15) + Shipping (40) + 3 licenses (40, 60, 25 = 125) = exactly 410 THB.
     - Quantity scaling: 3 units = exactly 1,150 THB.
     - Dual-surface: FRONT + BACK = 160 THB printing cost, total 465 THB.
     - Error handling: Non-existent garment throws error; invalid license throws error.
4. **Live Pricing API**:
   - Create `src/app/api/pricing/calculate/route.ts` with Zod schema parsing and validation. Return 400 on invalid payload/license, 200 with `PriceCalculationResult` on success.
5. **Verification**:
   - Run `npx tsc --noEmit` and verify zero errors.
   - Run `npm test` (`vitest run`) and verify all tests pass.
   - Run `npm run build` and verify production build completes cleanly.
   - Document all verification results in `handoff.md`.


## 2026-10-09T23:40:25Z
Received dispatch from parent (ebc38aff-81cb-457f-bd27-e38a9be40d41).
Tasks:
1. Implement `src/app/layout.tsx` and `src/app/page.tsx`.
2. Apply defensive patch to `src/lib/pricing.ts`.
3. Implement `src/lib/__tests__/pricing.test.ts`.
4. Implement `src/app/api/pricing/calculate/route.ts`.
5. Run tsc, test, build verification.
6. Write handoff.md and report to parent.
