## 2026-10-11T14:17:04Z
You are the SWE Light Orchestrator for ape-parel.
Your working directory is: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_3
Your task context is located at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_3\context.md
The authoritative original request is at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
The project root directory is: d:\Coding Projects\ape-parel tshirt

## Task Summary
Implement a 3D Print Placement Guide & Ruler Exporter in ape-parel that generates accurate physical measurement guidelines (centimeter rulers, collar offset, center-chest alignment, graphic width/height, hem clearance) directly from 3D studio designs for suppliers and print shops.

## Requirements
### R1. 3D Snapshot & High-Resolution Orthographic Capture
Enable front and back orthographic capture of the garment in `GarmentPreview3D.tsx` / `DesignStudioClient.tsx`:
- Render the 3D t-shirt from a front-facing perspective without perspective distortion.
- Produce a clean high-resolution canvas/image snapshot containing the garment and placed artwork.

### R2. Physical Dimension Guide & Ruler Engine (cm)
Implement a dimension calculation and rendering engine (`src/lib/productionBlueprint.ts`):
- Compute exact physical centimeter measurements based on standard platen sizing (35x45 cm):
  - Distance from lowest collar center point to top of graphic (`offsetTopCollarCm`).
  - Distance from center chest line to graphic center (`offsetCenterCm`).
  - Physical print dimensions (width & height in cm).
  - Distance from bottom of graphic to hem (`offsetHemCm`).
- Render overlay markings: top and left rulers in cm, red vertical center axis line, dimension callout arrows, and artwork bounding box.

### R3. Export Actions in 3D Studio and Supplier Portal
Provide user-facing export capabilities:
- In `DesignStudioClient.tsx` (`/studio/new`): Add an "Export Print Guide & Ruler" button that generates a downloadable high-res PNG / printable tech sheet.
- In Supplier Jobs (`/supplier/jobs/[id]` or `/account/orders/[id]`): Provide a production blueprint sheet showing the 3D render alongside the ruler guide, order number, garment SKU, and DTG Kornit printing specifications.

### R4. Automated Testing & Verification
Author a dedicated test suite (`src/lib/__tests__/production_blueprint.test.ts`):
- Test physical centimeter coordinate conversions, collar offset calculations, and platen boundary clamping.
- Ensure all 412 existing Vitest tests continue to pass with 0 regressions.
- Verify TypeScript `npx tsc --noEmit` (0 errors) and Next.js `npm run build` (exit code 0).

## Acceptance Criteria
- [ ] Graphic placement coordinates are converted into physical centimeters accurately relative to the collar dip and center chest.
- [ ] Exported blueprint includes visual centimeter rulers on axes, center axis line, and dimensional callout annotations.
- [ ] Both 3D Studio and Supplier Portal provide an action to export or view the print placement blueprint.
- [ ] Dedicated Vitest test suite `src/lib/__tests__/production_blueprint.test.ts` passes with exit code 0.
- [ ] All 412 existing Vitest tests across the 20 suites pass with 0 regressions.
- [ ] `npx tsc --noEmit` passes with 0 type errors.
- [ ] `npm run build` succeeds with exit code 0.
