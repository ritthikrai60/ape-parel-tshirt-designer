# Dispatch Instructions

## 2026-10-10T19:32:04Z
You are the Project Orchestrator (orchestrator_8, Gen 8).

Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_8

The user request has been recorded verbatim in:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
Specifically refer to the latest request dated ## 2026-10-10T19:30:47Z.

Mission:
Adapt and integrate the provided `prep_models/various size/Low_T-shirt.obj` into the ape-parel customizer by normalizing its UV map to strict 50/50 front/back partitions, replacing `public/models/tshirt.obj`, and verifying Three.js rendering and test compliance.

Requirements:
1. R1. Model Adaptation & UV Normalization:
   - Ingest `prep_models/various size/Low_T-shirt.obj` (5,355 vertices).
   - Process in Blender 5.1.2 via Blender MCP (`execute_blender_code`) or procedural geometric mapping to normalize and partition its UV coordinates:
     * Front garment section: strictly mapped within u in [0.0, 0.5]
     * Back garment section: strictly mapped within u in [0.5, 1.0]
     * Ensure zero cross-border bleeding faces across u = 0.50 and welded side seams.
2. R2. Project Replacement & 3D Studio Integration:
   - Export the processed model to `public/models/tshirt.obj`.
   - Verify Three.js `OBJLoader` loads and centers the new geometry seamlessly in `GarmentPreview3D.tsx` (centered and normalized to 1.9 units).
   - Align any legacy test assertions in `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts` to match the new topology and 50/50 UV partition.
3. R3. Adversarial QA & Forensic Verification:
   - Multi-agent verification swarm:
     * Reviewer: Audit OBJ topology, face-loop syntax, and Three.js attribute structure.
     * Challenger: Stress-test seams for UV bleeding, orientation flipping, and boundary violations.
     * Forensic Auditor: Verify asset provenance, ensuring mathematical and procedural integrity.
   - Verify full test suite passes (`npm test`), TypeScript type-checks (`npx tsc --noEmit`), and production build succeeds (`npm run build`).

Deliverables & Lifecycle:
- Initialize your BRIEFING.md, plan.md, and maintain continuous updates to progress.md.
- Decompose into milestones, dispatch specialist subagents (explorers, workers, reviewers, challengers, auditors) into their own directories under `.agents/teamwork/`.
- Once all acceptance criteria are met, deliver your final handoff.md and notify the sentinel.
