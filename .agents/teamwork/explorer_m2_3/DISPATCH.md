# DISPATCH — Explorer M2 (Instance 3)

## Identity & Assignment
- Role: Supplier Production Specification Explorer
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
- Scope Document: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

## Objective
Design and specify:
1. `src/lib/production.ts`:
   - `generateProductionPackage(orderId: string): Promise<ProductionJobPackage>`.
   - Query Order, GarmentProduct, GarmentVariant, PrintingService, Supplier, DesignDocument.
   - Parse `frontElements`, `backElements`, `sideElements`.
   - Compute physical print dimensions in cm from percentage placements and max printable width/height.
   - Format complete manufacturing package (garment SKU, variant color/size, printing code, surface details with asset URLs, and recipient info).
2. `src/app/api/orders/[id]/production/route.ts`:
   - `GET` route exporting the production specification JSON with `Content-Disposition: attachment; filename="JOB-{orderNumber}.json"`.
Write your recommendations to `handoff.md`.


## 2026-10-09T23:55:05Z
You are explorer_m2_3. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project scope document at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_1\PROJECT.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m2_3\DISPATCH.md

Your task is to design and specify `src/lib/production.ts` and `src/app/api/orders/[id]/production/route.ts`.
Focus on:
1. Generating complete supplier production specification packages (ProductionJobPackage) from Orders and DesignDocuments.
2. Precision placement coordinates, dimensions in cm, blank garment SKU, high-res asset references.
Write your report to `handoff.md` and report back via send_message.
DO NOT modify code. Read-only.
