# DISPATCH — Explorer M1 (Instance 2)

## Identity & Assignment
- Role: Pricing API Route & Root Layout Investigator
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_2
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Design and specify:
1. `src/app/api/pricing/calculate/route.ts`:
   - Zod schema validating input payload (`garmentProductId`, `garmentVariantId`, `quantity`, `frontArtworkLicenses`, `backArtworkLicenses`, `sideArtworkLicenses`).
   - Integration with `calculateLivePricing`.
   - Error responses (400 on validation failure, 404/400 on business errors).
2. `src/app/layout.tsx`:
   - Next.js 14 App Router root layout with metadata, fonts, globals.css, and brand shell (`#F5F0E8` paper background, `#131718` ink text).
   - Ensure `npm run build` succeeds cleanly.

Write your recommendations to `handoff.md` in your working directory.


## 2026-10-09T23:33:25Z
You are explorer_m1_2. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_2

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_2\DISPATCH.md

Your task is to design and specify:
1. `src/app/api/pricing/calculate/route.ts`: Zod schema validation, calculateLivePricing integration, error handling.
2. `src/app/layout.tsx`: Root layout for Next.js App Router, metadata, brand styling, globals.css.
3. Verify that these allow `tsc --noEmit` and `npm run build` to succeed cleanly.

Write your report to `handoff.md` and send a completion message back to the orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
DO NOT modify any code. Read-only.
