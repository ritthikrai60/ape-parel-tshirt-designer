# Execution Plan — Generation 9 Planar UV Re-Unwrap & Studio Alignment

## Context & Objectives
User request dated 2026-10-10T21:53:26Z requires:
Re-unwrap and adapt `prep_models/various size/Low_T-shirt.obj` using Blender MCP with Frontal and Rear Planar UV Projections to achieve 1:1 pixel-accurate alignment with the 2D Studio Canvas, replacing `public/models/tshirt.obj` and passing all verification tests.

## Key Challenges & Technical Requirements
1. **Frontal & Rear Planar UV Projection**:
   - Ingest `prep_models/various size/Low_T-shirt.obj` (5,355 vertices).
   - Use Blender 5.1.2 MCP (`execute_blender_code`) or procedural planar projection:
     - Frontal planar projection ($Z \ge 0$, including front torso, sleeves, front collar): strictly into $U \in [0.0, 0.5], V \in [0.0, 1.0]$.
     - Rear planar projection ($Z \le 0$, including back torso, sleeves, back collar): strictly into $U \in [0.5, 1.0], V \in [0.0, 1.0]$.
     - $V = 0.0$ at bottom hem, $V = 1.0$ at top collar/shoulders to eliminate vertical displacement.
     - Horizontal orientation (anti-mirroring) so graphics appear unmirrored on both sides.
     - Zero crossing faces across $U = 0.50$.
2. **Model Replacement & 3D Studio Alignment**:
   - Export re-mapped model to `public/models/tshirt.obj`.
   - Verify 2D-to-3D visual alignment (chest, hem, sleeves) in `GarmentPreview3D.tsx` / `textureSync.ts`.
   - Align test assertions in `m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`, and `m5_adversarial_final.test.ts`.
3. **Multi-Agent Verification & Integrity**:
   - Independent Reviewer, Challenger, and Forensic Auditor.
   - 100% test pass (323 Vitest tests), clean TypeScript, clean Next.js build.

## Phased Strategy
- **Phase 0: Survey Swarm (3 Explorers in parallel)**
  - Explorer 1: Inspect `Low_T-shirt.obj` geometry & formulate exact mathematical planar UV projection equations and Blender MCP scripts.
  - Explorer 2: Inspect 2D studio canvas dimensions, garment SVG/PNG overlay, `textureSync.ts`, and `GarmentPreview3D.tsx`.
  - Explorer 3: Inspect current test files and baseline test results.
- **Phase 1: Architecture & Interface Update**
  - Update `PROJECT.md` with revised equations, UV boundaries, and milestone roadmap.
- **Phase 2: Milestone 1 (Model Adaptation & Planar UV Re-Unwrap)**
  - Dispatch Worker M1 to compute/run planar unwrapping, export to `public/models/tshirt.obj`.
  - Verification Swarm (Reviewer, Challenger, Auditor). Gate M1 check.
- **Phase 3: Milestone 2 (Studio Integration & Test Suite Alignment)**
  - Dispatch Worker M2 to verify Three.js loading, align test assertions, run tests.
  - Verification Swarm (Reviewer, Challenger, Auditor). Gate M2 check.
- **Phase 4: Milestone 3 (Full QA, Build Hardening & Victory Audit)**
  - Multi-agent verification swarm for full suite `npm test`, `npx tsc --noEmit`, `npm run build`.
  - Gate M3 check.
- **Phase 5: Final Victory Handoff**
  - Synthesize handoff report and notify sentinel.
