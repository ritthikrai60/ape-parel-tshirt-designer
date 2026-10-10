# BRIEFING — 2026-10-10T00:08:00Z

## Mission
Implement Milestone 2: Royalty Ledger & Supplier Specs Builder (orders.ts, royalties.ts, production.ts, API routes, and integration tests).

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1
- Original parent: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Milestone: M2 (Royalty Ledger & Supplier Specs)

## 🔒 Key Constraints
- Exclusive write ownership:
  1. src/lib/types.ts
  2. src/lib/orders.ts
  3. src/lib/royalties.ts
  4. src/lib/production.ts
  5. src/lib/__tests__/orders_royalties.test.ts
  6. src/app/api/orders/route.ts
  7. src/app/api/orders/[id]/route.ts
  8. src/app/api/orders/[id]/production/route.ts
  9. src/app/api/royalties/settle/route.ts
- Integrity Mandate: Genuine logic only, no hardcoded test shortcuts, no facades.
- All builds, TypeScript checks, and Vitest test suites must pass cleanly.

## Current Parent
- Conversation ID: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Updated: 2026-10-10T00:08:00Z

## Task Summary
- **What to build**:
  - Update `src/lib/types.ts` with order, royalty, settlement, and production specs.
  - Implement `src/lib/orders.ts` with atomic order creation, anti-tampering, running ledger balance.
  - Implement `src/lib/royalties.ts` with ledger summary and payout settlement.
  - Implement `src/lib/production.ts` with supplier manufacturing package generation.
  - Implement API routes: `POST/GET /api/orders`, `GET /api/orders/[id]`, `GET /api/orders/[id]/production`, `POST/GET /api/royalties/settle`.
  - Comprehensive integration test suite: `src/lib/__tests__/orders_royalties.test.ts`.
- **Success criteria**:
  - Exact THB 410 benchmark atomic creation (VERIFIED).
  - Running balance progression tracking (40 -> 100) (VERIFIED).
  - Payout settlement deduction (VERIFIED).
  - Rollback on failure (VERIFIED).
  - `npx tsc --noEmit` = 0 errors (VERIFIED).
  - `npm test` = 109/109 tests passed (VERIFIED).
  - `npm run build` = clean build with all routes compiled (VERIFIED).

## Key Decisions Made
- `createOrderAtomic` validates price strictly against `calculateLivePricing` before opening Prisma transaction to minimize database lock contention.
- In-memory running balance map inside `prisma.$transaction` avoids race conditions when multiple licenses belong to the same creator in a single order.
- `generateProductionPackage` resolves physical cm dimensions using print service platen dimensions and rounds to 2 decimal places.
- Next.js dynamic API routes enforce `export const dynamic = 'force-dynamic'` and standardized HTTP response codes.

## Artifact Index
- `src/lib/types.ts` — Domain TypeScript types
- `src/lib/orders.ts` — Atomic order placement and query service
- `src/lib/royalties.ts` — Creator ledger summary and payout settlement service
- `src/lib/production.ts` — Supplier production specification package generator
- `src/app/api/orders/route.ts` — POST order placement, GET order list
- `src/app/api/orders/[id]/route.ts` — GET order details
- `src/app/api/orders/[id]/production/route.ts` — GET production job JSON download
- `src/app/api/royalties/settle/route.ts` — POST payout settlement, GET creator ledger summary
- `src/lib/__tests__/orders_royalties.test.ts` — 19 integration tests
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\DISPATCH.md` — Assignment instructions
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\progress.md` — Liveness & step progress
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  - `src/lib/types.ts`: added interfaces for orders, royalties, settlements, production
  - `src/lib/orders.ts`: created atomic order placement service
  - `src/lib/royalties.ts`: created ledger summary and settlement service
  - `src/lib/production.ts`: created supplier production spec generator
  - `src/app/api/orders/route.ts`: created orders API handler
  - `src/app/api/orders/[id]/route.ts`: created order lookup API handler
  - `src/app/api/orders/[id]/production/route.ts`: created production spec download handler
  - `src/app/api/royalties/settle/route.ts`: created royalties settlement API handler
  - `src/lib/__tests__/orders_royalties.test.ts`: created 19 integration tests
- **Build status**: PASS (`npx tsc --noEmit` = 0, `npm test` = 109/109, `npm run build` = 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All 109 tests passing across 5 test suites; Next.js 14 production build completed with 0 errors
- **Lint status**: Clean
- **Tests added/modified**: 19 tests in `src/lib/__tests__/orders_royalties.test.ts`
