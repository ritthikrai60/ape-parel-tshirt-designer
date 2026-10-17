# Dispatch Instructions

## 2026-10-10T21:55:00Z
You are the Project Orchestrator (orchestrator_9, Gen 9).

Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_9

The user request has been recorded verbatim in:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
Specifically refer to the latest request dated ## 2026-10-10T21:53:26Z.

Mission:
Re-unwrap and adapt `prep_models/various size/Low_T-shirt.obj` using Blender MCP with Frontal and Rear Planar UV Projections to achieve 1:1 pixel-accurate alignment with the 2D Studio Canvas, replacing `public/models/tshirt.obj` and passing all verification tests.

Requirements:

### R1. Frontal & Rear Planar UV Unwrapping (Blender MCP)
- Ingest `prep_models/various size/Low_T-shirt.obj` (5,355 vertices).
- Using Blender 5.1.2 MCP (`execute_blender_code`) or procedural planar projection:
  - Generate a continuous Frontal Planar UV projection for all front-facing geometry ($Z \ge 0$, including front torso, sleeves, and front collar) strictly into $U \in [0.0, 0.5], V \in [0.0, 1.0]$.
  - Generate a continuous Rear Planar UV projection for all rear-facing geometry ($Z \le 0$, including back torso, rear sleeves, and back collar) strictly into $U \in [0.5, 1.0], V \in [0.0, 1.0]$.
  - Ensure $V = 0.0$ corresponds to the bottom hem and $V = 1.0$ corresponds to the top collar/shoulders, eliminating vertical displacement between 2D canvas and 3D viewport.
  - Maintain horizontal orientation (anti-mirroring) so graphics appear unmirrored on both front and back.
  - Ensure zero crossing faces across $U = 0.50$.

### R2. Model Replacement & 3D Studio Alignment
- Export the re-mapped model to `public/models/tshirt.obj`.
- Verify in `GarmentPreview3D.tsx` that designs placed on the 2D canvas (chest, hem, sleeves) map to the exact same anatomical locations on the 3D model without distortion.
- Align test suites (`m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`) to the new planar UV coordinates.

### R3. Adversarial QA & Forensic Verification
- Multi-agent verification swarm:
  - Reviewer: Audit OBJ topology, 50/50 partition bounds, and Three.js attribute structure.
  - Challenger: Stress-test 2D-to-3D visual alignment (chest placement, hem placement, sleeve placement), ensuring 0 cross-border bleed and correct orientation.
  - Forensic Auditor: Verify mathematical projection integrity and asset authenticity.
- Run complete test suite (`npm test`), TypeScript check (`npx tsc --noEmit`), and production build (`npm run build`).

### Acceptance Criteria:
- [ ] A design placed on the chest in the 2D canvas renders on the chest of the 3D model (not on the sleeve or collar).
- [ ] A design placed at the bottom hem in the 2D canvas renders at the bottom hem of the 3D model (not on the chest).
- [ ] UV coordinates strictly respect $U \in [0.0, 0.5]$ for Front and $U \in [0.5, 1.0]$ for Back with 0 crossing faces.
- [ ] All 323 Vitest tests pass (`npm test`).
- [ ] TypeScript check (`npx tsc --noEmit`) and Next.js production build (`npm run build`) complete with exit code 0.

Deliverables & Lifecycle:
- Initialize your BRIEFING.md, plan.md, and maintain continuous updates to progress.md.
- Decompose into milestones, dispatch specialist subagents into their own directories under `.agents/teamwork/`.
- Once all acceptance criteria are met, deliver your final handoff.md and notify the sentinel.
