# DISPATCH — Explorer Survey 2

## Identity & Assignment
- Role: R1 (2D/3D Studio) & R2 (Pricing Engine) Explorer
- Archetype: teamwork_preview_explorer
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_2
- Parent: Orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41)
- Authoritative user request: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

## Objective
Analyze technical specifications and existing implementation for R1 and R2:
1. R1: 2D & 3D Interactive Design Studio:
   - 2D Canvas centered on transparent background with authentic garment colors (Ink Black, Optic White, Paper Beige, Warm Kraft), large full-bleed garment display without intrusive print boundary boxes.
   - 3D Viewport powered by Three.js with OrbitControls, neutral 3-point lighting, floor shadow, and independent Front (u in [0, 0.5]) and Back (u in [0.5, 1.0]) texture mapping onto tshirt.obj.
   - Multi-artwork placement with interactive positioning, scaling, rotation, and artwork layer management.
   - Check existing components (src/components/studio, canvas, 3d viewport) and assets.
2. R2: Authoritative Server-Side Pricing Engine & Checkout:
   - Pricing formula: Garment base + print technique (DTG/Screen) + packaging + shipping + total artwork license fees.
   - Exact benchmark verification: Garment (THB 150) + DTG Print (THB 80) + Packaging (THB 15) + Shipping (THB 40) + Artwork Licenses (THB 40 + THB 60 + THB 25 = THB 125) = THB 410 for 1 unit.
   - Server-side validation requirements, anti-tampering, API routes (e.g. /api/checkout or /api/pricing).
   - Check src/lib/pricing.ts or existing pricing calculation logic.

## Constraints
- Read-only exploration. DO NOT modify any application or source files.
- Document state of code, missing components/functions, interface requirements.
- Write your findings to `handoff.md` in your working directory.


## 2026-10-09T23:24:44Z
From: ebc38aff-81cb-457f-bd27-e38a9be40d41
You are explorer_survey_2. Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_2

Read the authoritative user request at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md

Read your full dispatch instructions at:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_2\DISPATCH.md

Your task is to explore Requirements R1 (2D/3D Studio) and R2 (Pricing Engine):
1. R1: Examine existing 2D and 3D studio code in src/ (Three.js setup, OrbitControls, 2D transparent canvas, Front/Back texture mapping on tshirt.obj with u in [0, 0.5] and [0.5, 1.0], multi-artwork placement, layers, garment colors).
2. R2: Examine existing pricing engine code in src/lib/pricing.ts or related files, the exact THB 410 benchmark test in src/lib/__tests__/pricing.test.ts, checkout validation, anti-tampering logic, and APIs.
3. Detail what is already implemented, what is missing or broken, and provide exact interface recommendations.
4. Write a comprehensive survey report to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_2\handoff.md`.
5. Once finished, send a completion message back to the orchestrator (ebc38aff-81cb-457f-bd27-e38a9be40d41).
DO NOT modify any code. You are strictly read-only.
