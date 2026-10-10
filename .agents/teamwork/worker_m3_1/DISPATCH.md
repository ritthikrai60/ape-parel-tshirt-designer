## 2026-10-10T01:16:45Z
You are Worker M3-1 for Milestone 3 (2D & 3D Interactive Design Studio) in ape-parel.

Your identity: teamwork_preview_worker
Your working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m3_1
Orchestrator conversation ID: b128b841-82a3-43da-89c3-1191302bd832

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEPS:
1. Read ORIGINAL_REQUEST.md at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read PROJECT.md at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_2\PROJECT.md
3. Read Explorer 1 handoff: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m3_1\handoff.md
4. Read Explorer 2 handoff: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m3_2\handoff.md
5. Read Explorer 3 handoff: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m3_3\handoff.md
6. Initialize your progress.md with "Last visited: [timestamp]" and update it regularly.

YOUR EXCLUSIVE WRITE OWNERSHIP:
- `scripts/generate-tshirt-obj.mjs`
- `public/models/tshirt.obj`
- `src/lib/tshirtGeometry.ts`
- `src/components/studio/textureSync.ts`
- `src/components/studio/Garment2DCanvas.tsx`
- `src/components/studio/LayerManager.tsx`
- `src/components/studio/ArtworkCatalogDrawer.tsx`
- `src/components/studio/LivePricingCard.tsx`
- `src/components/studio/GarmentPreview3D.tsx`
- `src/components/studio/DesignStudioClient.tsx`
- `src/app/studio/new/page.tsx`
- `src/lib/__tests__/studio_pipeline.test.ts`

TASKS:
1. Generate `public/models/tshirt.obj`:
   - Use Explorer 1's parametric script to generate `public/models/tshirt.obj` with front torso, back torso, ribbed collar, and sleeves.
   - Verify UV unwrapping: Front surface $u \in [0.04, 0.46]$, Back surface $u \in [0.54, 0.96]$, zero cross-bleed margin.
   - Implement `src/lib/tshirtGeometry.ts` with `createProceduralTShirtGeometry()` as zero-network procedural fallback for Three.js.
2. Implement 2D Canvas & Controls (`src/components/studio/`):
   - `Garment2DCanvas.tsx`: Transparent background, centered garment silhouette, full-bleed design area without intrusive print boundary boxes, authentic colors (`#131718` Ink Black, `#FFFFFF` Optic White, `#F5F0E8` Paper Beige, `#DABA98` Warm Kraft).
   - `LayerManager.tsx`: Multi-artwork layer list, zIndex ordering, visibility, delete, rotate, scale, position controls.
   - `ArtworkCatalogDrawer.tsx`: Seeded artwork picker (Dash Ape Classic, Cyber Primate, Monogram Pattern, etc.).
3. Implement Three.js 3D Viewport & Texture Sync:
   - `GarmentPreview3D.tsx`: Three.js canvas with OrbitControls (damping, min/max distance, max polar angle), neutral 3-point studio lighting (key, fill, rim/back, ambient), floor shadow plane.
   - `textureSync.ts`: Dual-zone 1024x1024 texture renderer (Front left 512, Back right 512), synchronous `texture.needsUpdate = true` updates to the Three.js material.
4. Implement Studio Page & Live Pricing:
   - `LivePricingCard.tsx`: Dynamically calls `POST /api/pricing/calculate` as garment blank, variant, quantity, technique, and artwork licenses change. Includes "⚡ Load ฿410 Benchmark" button for instant testing of the exact THB 410 benchmark.
   - `DesignStudioClient.tsx`: Coordinates 2D customizer, 3D viewport, layer manager, pricing, and checkout modal calling `POST /api/orders`.
   - `src/app/studio/new/page.tsx`: Studio route page.
5. Create Test Suite (`src/lib/__tests__/studio_pipeline.test.ts`):
   - Test UV coordinate boundaries (Front strictly < 0.5, Back strictly >= 0.5).
   - Test authentic color palette definitions.
   - Test texture baking coordinate calculations and aspect ratios.
6. Verification:
   - `node scripts/generate-tshirt-obj.mjs` (generates valid OBJ)
   - `npx tsc --noEmit` (0 errors)
   - `npm test` (all test suites pass 100% with exit code 0)
   - `npm run build` (Next.js build passes cleanly, `/studio/new` static/dynamic compilation succeeds)
7. Write your handoff report to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m3_1\handoff.md`.
8. Send a message to orchestrator (`b128b841-82a3-43da-89c3-1191302bd832`) when complete.
