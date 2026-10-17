# Plan — Orchestrator Gen 7

## Milestone 1: Verification Gate Seal
1. Dispatch Verification Swarm to verify `worker_m1_gen2_1`'s `public/models/tshirt.obj`:
   - `reviewer_m1_1`: Verify mesh topology, manifold seams, boundary openings, and OBJ formatting.
   - `reviewer_m1_2`: Verify dual-zone UV partitioning, Three.js compatibility, and scale.
   - `challenger_m1_1`: Execute deterministic UV bleed & face-corner penetration checks.
   - `challenger_m1_2`: Execute Three.js OBJLoader simulation and WebGL attribute validation.
   - `auditor_m1_1`: Forensic Integrity Audit to ensure zero artificial cheating or deleted seam faces.
2. Evaluate all verdicts in `GATE_STATUS.md`. If all PASS and Auditor CLEAN -> Seal Milestone 1.

## Milestone 2: Test Alignment & 3D Studio Integration
1. Dispatch Worker to:
   - Align test assertions in `src/lib/__tests__/m5_graphics_production_challenger.test.ts` (update vertex/vt scalar expectations from legacy 1490 to the new genuine Blender loop-unwrapped counts 1462 / 1104, while keeping face count 2680).
   - Align `src/lib/__tests__/studio_pipeline.test.ts` (update legacy 8% buffer margin $u \ge 0.539$ to strict 50/50 partition $u \ge 0.500$).
   - Un-skip the 7 skipped tests in `src/lib/__tests__/studio_challenger.test.ts`, `src/lib/__tests__/m5_graphics_production_challenger.test.ts`, `src/lib/__tests__/m5_adversarial_final.test.ts`.
   - Verify `src/components/studio/GarmentPreview3D.tsx` and `src/components/studio/DesignStudioClient.tsx` loading and rendering.
2. Dispatch Reviewers, Challengers, and Auditor for Milestone 2.
3. Gate check Milestone 2.

## Milestone 3: QA, Build Hardening & Victory Audit
1. Run full test suite (`npm test`), TypeScript verification (`npx tsc --noEmit`), and production build (`npm run build`).
2. Run final Forensic Integrity Audit across entire repository.
3. Transmit final Victory Report to Sentinel (`0037a0d0-4b19-49b5-a371-69af8c774fe1`).
