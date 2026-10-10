# DISPATCH — Challenger M1 (Instance 2)

## Identity & Assignment
- Role: Adversarial Exploit & Negative Input Challenger
- Archetype: teamwork_preview_challenger
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m1_2
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Adversarially challenge the pricing engine and API route:
1. Test malformed payloads:
   - SQL injection / prototype pollution keys in JSON payloads.
   - Forged licenseOptionId that does not exist or belongs to another artwork.
   - Negative quantity, non-integer numbers, giant arrays of licenses.
   - Invalid surface combinations or empty surfaces.
2. Verify that the server rejects exploits gracefully (returns HTTP 400 with structured JSON error, does not crash or throw unhandled exceptions).
3. Provide a clear verdict: APPROVE or REJECT.
Write your findings and verdict in `handoff.md` in your working directory.

## 2026-10-09T23:46:27Z
You are challenger_m1_2. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m1_2

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m1_2\DISPATCH.md

Adversarially challenge the pricing engine and API route:
1. Test malformed inputs: negative quantities, non-numeric values, forged license IDs, mismatched artwork IDs, missing fields.
2. Verify that the system responds with structured HTTP 400 errors and never throws unhandled crashes.
3. Provide a clear verdict: APPROVE or REJECT.
Write your findings to `handoff.md` and send a message back to orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
