# DISPATCH — Challenger M2 (Instance 2)

## Identity & Assignment
- Role: Adversarial Order & Security Challenger
- Archetype: teamwork_preview_challenger
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_2
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Adversarially challenge the order placement API and production endpoints:
1. Test anti-tampering: Client submitting `clientClaimedTotal` lower (e.g. 10 THB instead of 410 THB) MUST be rejected with HTTP 400 (`PRICE_TAMPERING_DETECTED`).
2. Test forged license IDs, non-existent garments, empty shipping addresses, negative quantities.
3. Test production spec generation for invalid order IDs (expect HTTP 404).
4. Provide a clear verdict: APPROVE or REJECT.
Write your findings to `handoff.md`.


## 2026-10-10T00:11:58Z
You are challenger_m2_2. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_2

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_2\DISPATCH.md

Adversarially challenge order placement and production API endpoints:
1. Test price tampering attacks (client claiming total lower than server calculation - must return HTTP 400).
2. Test forged license IDs, invalid garments, invalid order IDs.
3. Verify structured JSON error responses with no unhandled crashes.
4. Provide a clear verdict: APPROVE or REJECT.
Write findings to `handoff.md` and report back via send_message to orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).


## 2026-10-10T19:10:54Z
You are Challenger 2 (challenger_m2_2) for Milestone 2/3 of the ape-parel project.
Working directory: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_2`
Project root: `d:\Coding Projects\ape-parel tshirt`
Authoritative Request: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md`
Project Scope: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_7\PROJECT.md`
Worker Report: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_1\handoff.md`

Task:
Empirically stress-test the entire repository build and test pipeline:
1. Run full test suite: `npm test` (or `npx vitest run`).
   - Verify total number of test files and passing tests.
   - Verify exactly 0 failed tests and 0 skipped tests across the entire project.
2. Run TypeScript compilation: `npx tsc --noEmit`. Verify 0 errors.
3. Run Next.js production build: `npm run build`. Verify clean exit with code 0.
4. Verify asset invariance: confirm that `public/models/tshirt.obj` MD5 / hash is unchanged and matches the audited model from Milestone 1.

Output:
Write your full findings to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_2\handoff.md` with:
- Verdict: APPROVE or REQUEST_CHANGES
- Empirical test logs & metrics
- Conclusion & Verification method
Notify your orchestrator when done via send_message.
