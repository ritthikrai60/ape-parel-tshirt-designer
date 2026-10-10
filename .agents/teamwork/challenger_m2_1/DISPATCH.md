# DISPATCH — Challenger M2 (Instance 1)

## Identity & Assignment
- Role: Empirical Ledger & Concurrency Challenger
- Archetype: teamwork_preview_challenger
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_1
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Empirically stress-test the order placement and royalty ledger services:
1. Write and run a test harness verifying:
   - Atomic rollback: If an error is thrown midway in an order transaction, verify that NO orphaned Order, DesignDocument, RoyaltyObligation, or RoyaltyLedgerEntry records persist.
   - Running ledger balances: Verify that multiple sequential orders for the same creator correctly accumulate running balance (`balanceAfter = prevBalance + amount`).
   - Payout settlement deduction: Verify that settling an eligible balance sets obligation status to SETTLED and reduces balance to zero.
2. Provide a clear verdict: APPROVE or REJECT.
Write your findings to `handoff.md`.

## 2026-10-10T00:11:58Z
You are challenger_m2_1. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_1

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_1\DISPATCH.md

Empirically verify atomic order placement and the royalty ledger:
1. Write and run a test script or harness testing transaction rollback on error, cumulative running balance accuracy, and payout settlement deduction.
2. Check for database state corruption or race conditions.
3. Provide a clear verdict: APPROVE or REJECT.
Write findings to `handoff.md` and report back via send_message to orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
