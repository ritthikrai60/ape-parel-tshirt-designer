# DISPATCH — Explorer Survey 3

## Identity & Assignment
- Role: R3 (Royalty Ledger & Specs) & R4 (Portals & Marketplace) Explorer
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_3
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

## Objective
Analyze technical specifications and existing implementation for R3 and R4:
1. R3: Auditable Royalty Ledger & Supplier Production Specs:
   - Atomic order placement generating immutable RoyaltyObligation and RoyaltyLedgerEntry records for every licensed artwork.
   - Settlement and payout calculation tracking creator earnings, platform commissions, and payment statuses.
   - Automated generation of production specification packages for suppliers (print placement coordinates, dimensions, blank garment SKUs, high-res asset references).
   - Check Prisma transaction logic, orders service, royalty ledger service, spec generator.
2. R4: Multi-Role Portals & Marketplace:
   - Public Marketplace and Creator storefronts with artwork catalog and licensing terms.
   - Creator Dashboard displaying sales volume, license fees earned, and royalty ledger status.
   - Supplier Dashboard displaying pending production jobs and manufacturing specifications.
   - Customer Order Tracking portal showing design previews, production progress, and item breakdown.
   - Check app router pages (src/app/marketplace, src/app/creator, src/app/supplier, src/app/orders/[id], etc.).

## Constraints
- Read-only exploration. DO NOT modify any application or source files.
- Document state of code, missing components/routes, interface requirements.
- Write your findings to `handoff.md` in your working directory.

## 2026-10-09T23:24:44Z
From: ebc38aff-81cb-457f-bd27-e38a9be40d41
You are explorer_survey_3. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_3

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_3\DISPATCH.md

Your task is to explore Requirements R3 (Royalty Ledger & Supplier Specs) and R4 (Portals & Marketplace):
1. R3: Examine Prisma schema, order placement services, atomic transaction handling, RoyaltyObligation and RoyaltyLedgerEntry records, settlement/payout calculation, and production specification package generation. Check src/lib/__tests__/orders_royalties.test.ts.
2. R4: Examine existing pages and components for Marketplace & Creator storefronts, Creator Dashboard, Supplier Dashboard, and Customer Order Tracking portal.
3. Detail what is already implemented, what is missing or broken, and provide exact interface recommendations.
4. Write a comprehensive survey report to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_3\handoff.md`.
5. Once finished, send a completion message back to the orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
DO NOT modify any code. You are strictly read-only.
