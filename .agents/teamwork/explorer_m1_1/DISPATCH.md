# DISPATCH — Explorer M1 (Instance 1)

## Identity & Assignment
- Role: Pricing Test Suite & Edge Case Investigator
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_1
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Design and specify the exact test implementation for `src/lib/__tests__/pricing.test.ts` validating:
1. Exact THB 410 benchmark for 1 unit of Apex Heavyweight Tee (`APX-HVY-001`) with Bangkok DTG print (`฿80`) + packaging (`฿15`) + shipping (`฿40`) + 3 licenses (`฿40`, `฿60`, `฿25` = `฿125`) = `฿410`.
2. Quantity scaling test (e.g. 3 units = `฿1150`).
3. Dual-surface printing test (FRONT + BACK = `฿160` print cost).
4. Error handling when garment product is missing or license option is invalid.
5. Identify required changes in `src/lib/pricing.ts` to throw error on missing license IDs.

Write your recommendations to `handoff.md` in your working directory.

## 2026-10-09T23:33:24Z
From: ebc38aff-81cb-457f-bd27-e38a9be40d41
Content:
You are explorer_m1_1. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_1

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_1\DISPATCH.md

Your task is to design and specify `src/lib/__tests__/pricing.test.ts` validating:
1. Exact THB 410 benchmark for 1 unit of APX-HVY-001 (150) + DTG (80) + Packaging (15) + Shipping (40) + Licenses (40+60+25=125) = 410.
2. Quantity scaling test (3 units = 1150).
3. Dual-surface printing test (FRONT + BACK = 160).
4. Error handling for missing garment product or missing license options.
5. Provide the exact code specification for `src/lib/__tests__/pricing.test.ts` and defensive patch for `src/lib/pricing.ts`.

Write your report to `handoff.md` and send a completion message back to the orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
DO NOT modify any code. Read-only.
