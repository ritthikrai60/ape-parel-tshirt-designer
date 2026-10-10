# DISPATCH — Explorer M1 (Instance 3)

## Identity & Assignment
- Role: Anti-Tamper Checkout & Security Investigator
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_3
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Design and specify:
1. Anti-tampering architecture for checkout:
   - Server must recalculate cart items independently of client input.
   - Client-claimed pricing manipulation must be rejected (HTTP 400).
   - Validation that all artwork license IDs exist in the database and belong to the correct artworks.
2. Integration between pricing engine, Zod schemas, and order placement interfaces.

Write your recommendations to `handoff.md` in your working directory.


## 2026-10-09T23:33:25Z
You are explorer_m1_3. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_3

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_3\DISPATCH.md

Your task is to design and specify:
1. Anti-tampering architecture for checkout: server recalculation, rejection of manipulated client prices, license validation.
2. Integration between pricing engine, Zod schemas, and order placement interfaces.

Write your report to `handoff.md` and send a completion message back to the orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
DO NOT modify any code. Read-only.
