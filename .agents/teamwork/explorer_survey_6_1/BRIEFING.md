# BRIEFING — 2026-10-10T15:33:00Z

## Mission
Investigate ape-parel frontend codebase regarding 3D studio viewer, canvas texture mapping, Three.js components, UV mapping, scaling/positioning/camera/lighting, and hardcoded offsets.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_6_1
- Original parent: d3d41d37-f1af-4035-8536-0169e07e737d
- Milestone: survey_6

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify any source files
- Do NOT edit production code

## Current Parent
- Conversation ID: d3d41d37-f1af-4035-8536-0169e07e737d
- Updated: 2026-10-10T15:28:24Z

## Investigation State
- **Explored paths**:
  - `src/components/studio/DesignStudioClient.tsx`
  - `src/components/studio/GarmentPreview3D.tsx`
  - `src/components/studio/Garment2DCanvas.tsx`
  - `src/components/studio/textureSync.ts`
  - `src/lib/tshirtGeometry.ts`
  - `public/models/tshirt.obj`
  - `src/app/studio/new/page.tsx`
  - `src/lib/__tests__/studio_pipeline.test.ts`
  - `src/lib/__tests__/studio_challenger.test.ts`
  - `src/lib/__tests__/m5_graphics_production_challenger.test.ts`
- **Key findings**:
  - Three.js viewer dynamically centers loaded OBJ via `Box3` (`obj.position.sub(center)`) and scales by `1.9 / maxDim`.
  - OrbitControls centers target at `(0, 0, 0)` with camera at `(0, 0.1, 2.3)` (Front) and `(0, 0.1, -2.3)` (Back).
  - Ground contact shadow plane is hardcoded at `y = -1.1` and shadow receiver at `y = -1.105`.
  - Texture baking in `textureSync.ts` produces 1024x1024 canvas split at x = 512: Left [0..512] for Front, Right [512..1024] for Back.
  - Three.js `CanvasTexture` defaults to `flipY = true`, correctly mapping top of 2D canvas (y=0) to collar (v=1.0) and bottom (y=1024) to hem (v=0.0).
  - UV unwrapping contract requires strict 50/50 split without arbitrary padding: Front `u in [0.0, 0.5]`, Back `u in [0.5, 1.0]`.
  - Anti-mirroring orientation is mandatory: Front screen-left (-X) maps to smaller u; Back screen-left (+X viewed from behind) maps to smaller u.
  - Test suites (`m5_graphics_production_challenger.test.ts`, `studio_challenger.test.ts`) currently check specific vertex count (1490), face count (2680), and dimensions (-0.95 to 0.95 X, -0.85 to 0.70 Y).
- **Unexplored areas**: None within the assigned survey scope.

## Key Decisions Made
- Completed deep inspection of studio viewer, texture sync engine, 2D/3D mapping, coordinate transformations, and hardcoded scene offsets.
- Documented findings with verbatim line citations in handoff.md.

## Artifact Index
- handoff.md — Comprehensive 5-component handoff report
- progress.md — Progress and heartbeat tracking
- DISPATCH.md — Incoming dispatch message record
