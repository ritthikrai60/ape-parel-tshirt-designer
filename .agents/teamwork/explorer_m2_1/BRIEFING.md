# BRIEFING — 2026-10-10T00:00:00Z

## Mission
Design and specify `src/lib/orders.ts`, `src/app/api/orders/route.ts`, and the integration test `src/lib/__tests__/orders_royalties.test.ts` with atomic transactions, anti-tampering recalculation, and auditable royalty ledgers.

## 🔒 My Identity
- Archetype: explorer
- Roles: Atomic Order Placement & Transaction Explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1
- Original parent: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Milestone: M2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Design and specify src/lib/orders.ts, src/app/api/orders/route.ts, and src/lib/__tests__/orders_royalties.test.ts
- Atomic Prisma transaction for Order, Obligations, and Ledger entries
- Anti-tampering price recalculation on the server
- Test suite verifying transaction atomicity, ledger balances, and rollback

## Current Parent
- Conversation ID: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Updated: 2026-10-10T00:00:00Z

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma` (Order, DesignDocument, RoyaltyObligation, RoyaltyLedgerEntry models)
  - `prisma/seed.mjs` (Benchmark entities, order APX-ORD-9021, and exact ledger entries)
  - `src/lib/pricing.ts` (Authoritative calculateLivePricing engine)
  - `src/lib/types.ts` (Domain models, DesignElement, PricingPayload, PriceCalculationResult)
  - `src/app/api/pricing/calculate/route.ts` (Zod schemas, error mappings, NextRequest/NextResponse)
  - `src/lib/__tests__/pricing.test.ts` & adversarial suites (86 passing Vitest tests)
  - Peer dispatches: `explorer_m2_2/DISPATCH.md` (royalties.ts), `explorer_m2_3/DISPATCH.md` (production.ts)
- **Key findings**:
  - Exact benchmark matches 410 THB: Garment (150) + DTG (80) + Pack (15) + Ship (40) + Licenses (40 + 60 + 25 = 125).
  - Royalty obligations have unitRoyalty, quantity, totalAmount, and status ('ELIGIBLE').
  - RoyaltyLedgerEntry tracks running balance (`balanceAfter`) sequentially per creator.
  - Interactive Prisma transaction `prisma.$transaction(async (tx) => { ... })` ensures strict all-or-nothing rollback across DesignDocument, Order, RoyaltyObligation[], and RoyaltyLedgerEntry[].
  - Anti-tampering must validate clientClaimedTotal against server calculated total before and within order placement.
- **Unexplored areas**: None. Exploration complete.

## Key Decisions Made
- Architected `createOrderAtomic` in `src/lib/orders.ts` with anti-tamper pre-validation and interactive Prisma transaction.
- Designed running balance calculation mechanism via in-memory accumulator within transaction over creator's latest ledger entry.
- Designed `_simulateFailureAtStep` test hooks for 100% deterministic transaction rollback verification.
- Designed `src/app/api/orders/route.ts` with robust Zod validation, HTTP status mapping (201, 400, 404, 500), and GET pagination.
- Designed comprehensive 7-suite integration test for `src/lib/__tests__/orders_royalties.test.ts` with teardown cleanup.

## Artifact Index
- DISPATCH.md — Dispatch instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat tracker
- handoff.md — 5-Component detailed specification and handoff report
