# BRIEFING — 2026-10-10T00:00:00Z

## Mission
Design and specify `src/lib/royalties.ts` and `src/app/api/royalties/settle/route.ts` covering creator balance computation, ledger entries, lifetime earnings, and atomic batch payout settlement transactions.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Royalty Ledger & Settlement Service Explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2
- Original parent: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Milestone: Milestone 2 (Royalty Settlement & Ledger Service)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- DO NOT modify source code files
- Write analysis and specifications to `handoff.md` in working directory
- Output path discipline: write only within `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2`

## Current Parent
- Conversation ID: ebc38aff-81cb-457f-bd27-e38a9be40d41
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `DISPATCH.md` (Self, explorer_m2_1, explorer_m2_3)
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`
  - `prisma/schema.prisma`, `prisma/seed.mjs`, live `prisma/dev.db`
  - `src/lib/types.ts`, `src/lib/pricing.ts`, `src/lib/prisma.ts`
  - `src/app/api/pricing/calculate/route.ts`
  - `src/lib/__tests__/pricing.test.ts`
- **Key findings**:
  - Live DB verification: Creator 1 (`dash-ape`, id `cmv1l9gp000048lk7wp6q51n8`) has 2 eligible obligations (40 THB + 60 THB) with 2 ledger entries and balanceAfter = 100 THB.
  - Creator 2 (`cyber-monk`) has 1 eligible obligation (25 THB) with balanceAfter = 25 THB.
  - Creator 3 (`soma-botanica`) has 0 obligations and balanceAfter = 0 THB.
  - Settlement workflow must atomically:
    1. Filter eligible obligations (`status: 'ELIGIBLE'`)
    2. Check sufficient ledger balance
    3. Transition obligations to `SETTLED`
    4. Create `CreatorSettlement` record (`settlementNumber: APX-STL-...`)
    5. Write negative `RoyaltyLedgerEntry` (`entryType: 'PAYOUT_SETTLEMENT'`, `amount: -totalPayoutAmount`)
    6. Record `AuditEvent` (`action: 'ROYALTY_PAYOUT_SETTLED'`)
  - `getCreatorLedgerSummary` computes running balance, gross lifetime earnings, total settled amount, unit sales volume, and obligation counts across PENDING, ELIGIBLE, and SETTLED statuses.
- **Unexplored areas**: None. Entire domain surface mapped.

## Key Decisions Made
- Formatted settlement number as `APX-STL-{YYYYMMDD}-{RANDOM5}` matching Ape-Parel conventions (`APX-ORD-9021`).
- Supported identifier lookup by `id`, `slug`, or `userId` in `royalties.ts` functions for friction-free dashboard and API integration.
- Designed `POST /api/royalties/settle` with Zod schema validation and HTTP status codes (200 success, 400 validation/business errors, 404 creator missing, 500 internal error). Added companion `GET /api/royalties/settle?creatorId=...` for balance and summary queries.

## Artifact Index
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\DISPATCH.md — Dispatch instructions
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\BRIEFING.md — Working memory and status
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\progress.md — Liveness heartbeat
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\handoff.md — Final handoff report
