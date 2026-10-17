# Dispatch Instructions

## 2026-10-11T01:32:00Z
You are the Project Orchestrator (orchestrator_10, Gen 10).

Your working directory is:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\orchestrator_10

The user request has been recorded verbatim in:
d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
Specifically refer to the latest request dated ## 2026-10-10T21:53:26Z.

Mission:
Re-unwrap and adapt `prep_models/various size/Low_T-shirt.obj` using Blender MCP with Frontal and Rear Planar UV Projections to achieve 1:1 pixel-accurate alignment with the 2D Studio Canvas, replacing `public/models/tshirt.obj` and passing all verification tests.

Context & Prior Work:
1. **Milestone 1 Completed**: `public/models/tshirt.obj` generated with continuous planar UV mapping via `scripts/generate_planar_tshirt.py`. Unanimous PASS from all 5 verifiers (Reviewers APPROVE, Challengers APPROVE, Auditor CLEAN). See `orchestrator_9/GATE_STATUS.md` and verifier handoffs.
2. **Milestone 2 Implementation Delivered**: `worker_m2_9_1` completed integration verification for `GarmentPreview3D.tsx` and aligned test suites. All 334 Vitest tests pass across 17 test suites, `npx tsc --noEmit` clean, `npm run build` exit code 0. See `worker_m2_9_1/handoff.md`.
3. **Your Immediate Objectives**:
   - Verify Milestone 2 deliverables with verification subagents (Reviewer, Challenger, Auditor) and record Gate M2 evaluation in `GATE_STATUS.md`.
   - Execute Milestone 3: Adversarial QA & Forensic Verification (`npm test`, `npx tsc --noEmit`, `npm run build`).
   - Multi-agent verification swarm:
     * Reviewer: Audit OBJ topology, 50/50 partition bounds, Three.js attribute structure.
     * Challenger: Stress-test 2D-to-3D visual alignment (chest placement, hem placement, sleeve placement), ensuring 0 cross-border bleed and correct orientation.
     * Forensic Auditor: Verify mathematical projection integrity and asset authenticity.
   - Once all acceptance criteria are met, deliver final handoff.md and claim victory to the sentinel.

Acceptance Criteria:
- [ ] A design placed on the chest in the 2D canvas renders on the chest of the 3D model (not on the sleeve or collar).
- [ ] A design placed at the bottom hem in the 2D canvas renders at the bottom hem of the 3D model (not on the chest).
- [ ] UV coordinates strictly respect $U \in [0.0, 0.5]$ for Front and $U \in [0.5, 1.0]$ for Back with 0 crossing faces.
- [ ] All Vitest tests pass (`npm test`).
- [ ] TypeScript check (`npx tsc --noEmit`) and Next.js production build (`npm run build`) complete with exit code 0.
