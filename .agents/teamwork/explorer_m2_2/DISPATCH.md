# DISPATCH — Explorer M2 (Instance 2)

## Identity & Assignment
- Role: Royalty Ledger & Settlement Service Explorer
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Design and specify:
1. `src/lib/royalties.ts`:
   - `getCreatorLedgerSummary(creatorId: string): Promise<CreatorLedgerSummary>`.
   - Calculate current balance, lifetime earnings, total settled, pending vs eligible obligations.
   - `executeCreatorPayoutSettlement(creatorId: string, payoutRef?: string): Promise<SettlementResult>`.
   - Wrap in `prisma.$transaction`: update eligible obligations to SETTLED, write `RoyaltyLedgerEntry` with `entryType: 'PAYOUT_SETTLEMENT'` and negative amount, update `balanceAfter`, create `CreatorSettlement`.
2. `src/app/api/royalties/settle/route.ts`:
   - `POST` endpoint executing creator settlement with Zod validation.
Write your recommendations to `handoff.md`.


## 2026-10-09T23:55:05Z
You are explorer_m2_2. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_2\DISPATCH.md

Your task is to design and specify `src/lib/royalties.ts` and `src/app/api/royalties/settle/route.ts`.
Focus on:
1. Creator balance computation, ledger entries query, and lifetime earnings.
2. Batch payout settlement transaction (obligation status update to SETTLED, negative ledger entry, CreatorSettlement record).
Write your report to `handoff.md` and report back via send_message.
DO NOT modify code. Read-only.
