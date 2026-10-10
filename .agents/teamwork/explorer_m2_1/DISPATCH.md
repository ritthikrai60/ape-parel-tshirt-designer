# DISPATCH — Explorer M2 (Instance 1)

## Identity & Assignment
- Role: Atomic Order Placement & Transaction Explorer
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Design and specify:
1. `src/lib/orders.ts`:
   - `createOrderAtomic(input: CreateOrderInput): Promise<CreateOrderResult>`.
   - Wrap in `prisma.$transaction(async (tx) => { ... })`.
   - Re-calculate authoritative price with `calculateLivePricing`.
   - Reject price tampering if clientClaimedTotal is supplied and does not match server calculation.
   - Atomically create `DesignDocument`, `Order`, `RoyaltyObligation[]` (one per licensed artwork), and `RoyaltyLedgerEntry[]` (one per creator, computing `balanceAfter` accurately).
2. `src/app/api/orders/route.ts`:
   - `POST` route handling order submission with Zod validation.
   - `GET` route handling order query.
3. Integration test design for `src/lib/__tests__/orders_royalties.test.ts`:
   - Verify atomic creation of Order + Obligations + Ledger entries.
   - Verify rollback on simulated failure.
Write your recommendations to `handoff.md`.


## 2026-10-09T23:55:05Z
You are explorer_m2_1. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_1\DISPATCH.md

Your task is to design and specify `src/lib/orders.ts`, `src/app/api/orders/route.ts`, and the integration test `src/lib/__tests__/orders_royalties.test.ts`.
Focus on:
1. Atomic Prisma transaction for Order, Obligations, and Ledger entries.
2. Anti-tampering price recalculation on the server.
3. Test suite verifying transaction atomicity, ledger balances, and rollback.
Write your report to `handoff.md` and report back via send_message.
DO NOT modify code. Read-only.
