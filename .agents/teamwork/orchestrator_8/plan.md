# Project Plan — Model Adaptation & 50/50 UV Partition Integration (orchestrator_8)

## Overview
Adapt `prep_models/various size/Low_T-shirt.obj` (5,355 vertices) to the ape-parel customizer by normalizing its UV map to strict 50/50 front/back partitions, replacing `public/models/tshirt.obj`, aligning Three.js integration and test assertions, and verifying through a multi-agent adversarial QA swarm and forensic audit.

## Milestones

### Phase 0: Survey & Codebase Investigation
- Dispatch 3 parallel Explorers to:
  1. Explorer 1: Inspect `prep_models/various size/Low_T-shirt.obj` (vertex count, face structure, current UV map, seam topology, bounding box, dimensions, normal orientation).
  2. Explorer 2: Inspect existing 3D studio viewer (`src/components/studio/GarmentPreview3D.tsx`, `DesignStudioClient.tsx`, centering/scaling logic, UV mapping expectations).
  3. Explorer 3: Inspect existing test suites (`m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`, `m5_adversarial_final.test.ts`) and build configuration (`npm test`, `npx tsc --noEmit`, `npm run build`).

### Milestone 1: Model Adaptation & UV Normalization (50/50 Partition)
- **Explorer**: Formulate precise transformation strategy (Blender 5.1.2 via Blender MCP `execute_blender_code` or procedural geometry script):
  - Ingest `prep_models/various size/Low_T-shirt.obj`
  - Partition UVs: Front garment section $u \in [0.0, 0.5]$, Back garment section $u \in [0.5, 1.0]$
  - Ensure zero cross-border bleeding faces across $u = 0.50$, welded side seams, manifold geometry.
- **Worker**: Implement transformation, export processed model to `public/models/tshirt.obj` and verify OBJ file validity.
- **Reviewers (2)**: Review OBJ geometry, vertex count, UV ranges, face indices, normal integrity.
- **Challengers (2)**: Adversarially test seam bleeding, cross-border faces, orientation flipping, boundary coordinate violations.
- **Forensic Auditor**: Verify mathematical integrity, asset provenance, no cheating or synthetic dummy hacks.
- **Gate**: Require unanimous APPROVE + CLEAN.

### Milestone 2: Project Asset Replacement & Studio Alignment
- **Explorer**: Analyze any adjustments needed in `GarmentPreview3D.tsx` (centering, bounding box normalization to 1.9 units, shadow clearance) and test assertions in `m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`.
- **Worker**: Apply required code/test updates if necessary, run unit/integration tests.
- **Reviewers (2)**: Code review on modified files and test alignments.
- **Challengers (2)**: Verify Three.js OBJLoader parsing, canvas texture mapping, front/back separation without bleeding.
- **Forensic Auditor**: Verify code authenticity and test integrity.
- **Gate**: Require unanimous APPROVE + CLEAN.

### Milestone 3: Adversarial QA & Full Verification
- **Worker**: Run full verification suite: `npm test`, `npx tsc --noEmit`, `npm run build`.
- **Reviewer / Challenger / Forensic Auditor**: Comprehensive audit across all project acceptance criteria.
- **Final Handoff**: Synthesize results, update documentation, and report final victory to Sentinel.
