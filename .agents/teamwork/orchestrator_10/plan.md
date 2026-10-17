# Execution Plan — Orchestrator 10 (Gen 10)

## Objective
Verify Milestone 2 deliverables, evaluate Gate M2, and execute Milestone 3 (Full QA, Build Hardening, and Forensic Verification) to achieve 1:1 pixel-accurate alignment between Low_T-shirt.obj planar UVs and the 2D Studio Canvas, replacing public/models/tshirt.obj.

## Phases

### Phase 1: Setup & Initialization
- [x] Review DISPATCH.md, PROJECT.md, ORIGINAL_REQUEST.md, worker_m2_9_1 handoff.md
- [x] Create BRIEFING.md, plan.md, progress.md in orchestrator_10
- [ ] Initialize recurring heartbeat cron (every 10 minutes)

### Phase 2: Dispatch Milestone 2 Verification Swarm
- [ ] Create workspace directories under `.agents/teamwork/`:
  - `reviewer_m2_10_1`
  - `reviewer_m2_10_2`
  - `challenger_m2_10_1`
  - `challenger_m2_10_2`
  - `auditor_m2_10_1`
- [ ] Dispatch Reviewer 1 (`teamwork_preview_reviewer`):
  - Audit test suite alignment across all 4 test files (`m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`, `m5_adversarial_final.test.ts`).
  - Verify Three.js OBJLoader integration in `GarmentPreview3D.tsx`, origin centering, scale normalization, floor clearance ($>0.20$m).
  - Run targeted 3D Vitest tests and full test suite.
- [ ] Dispatch Reviewer 2 (`teamwork_preview_reviewer`):
  - Audit 2D-to-3D Planar UV anatomical alignment math (chest 50%, 35% -> sternum, hem -> $V \le 0.150$, sleeve partitions $U \in [0.002, 0.498]$ / $[0.502, 0.998]$).
  - Audit zero crossing faces (`crossFaces === 0`), gutter buffer ($\Delta U \ge 0.004$), anti-mirroring ($dU/dx < 0$ on back).
- [ ] Dispatch Challenger 1 (`teamwork_preview_challenger`):
  - Adversarial stress-test of 2D-to-3D visual alignment (chest placement, hem placement, sleeve placement), ensuring 0 cross-border bleed and correct orientation.
  - Test seam boundaries and texture coordinates.
- [ ] Dispatch Challenger 2 (`teamwork_preview_challenger`):
  - Stress-test full test suite (`npm test`, all 334 tests), TypeScript checks (`npx tsc --noEmit`), Next.js production build (`npm run build`).
  - Stress-test OBJ topology, vertex counts (5,355 vertices, 10,192 triangles), header validity.
- [ ] Dispatch Forensic Auditor (`teamwork_preview_auditor`):
  - Rigorous integrity audit: verify asset provenance of `public/models/tshirt.obj` adapted from `Low_T-shirt.obj`.
  - Verify continuous planar projection formulas and absence of dummy/hardcoded mocks.
  - Zero tolerance for cheating or fabricated verification.

### Phase 3: Gate Evaluation (Gate M2 & Gate M3)
- [ ] Monitor subagent outputs and collect handoff reports
- [ ] Record verdicts in `GATE_STATUS.md`
- [ ] Verify pass criteria: all Reviewers APPROVE, all Challengers APPROVE, Auditor CLEAN, tests pass
- [ ] Update `PROJECT.md` milestones table (M2 -> DONE, M3 -> DONE)

### Phase 4: Final Victory Synthesis & Handoff
- [ ] Synthesize verification evidence across all 5 verification agents
- [ ] Verify all acceptance criteria from ORIGINAL_REQUEST.md
- [ ] Write final `handoff.md`
- [ ] Send victory message to parent caller (`9046e691-ee1e-465a-b158-50c5e4593195`)
