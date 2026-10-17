# Handoff Report — Test Suites Baseline & Planar UV Verification Survey

**Agent**: `explorer_survey_9_3`  
**Milestone**: Survey Phase — 3D/Studio Test Suites & Verification Alignment  
**Timestamp**: 2026-10-10T22:06:00Z  
**Parent**: `orchestrator_9` (`91dc51fb-7050-43fa-9fbd-3548db1388f4`)  
**Status**: Survey Complete (Self-Contained Hard Handoff)  

---

## 1. Observation

1. **Test Suites Baseline Execution**:
   - Executed full Vitest suite (`npm test`): **17 test files passed, 323/323 tests passed (100%)** with exit code 0.
   - Executed targeted 3D/Studio test suite (`npx vitest run src/lib/__tests__/m5_graphics_production_challenger.test.ts src/lib/__tests__/studio_pipeline.test.ts src/lib/__tests__/studio_challenger.test.ts src/lib/__tests__/m5_adversarial_final.test.ts`): **4 test files passed, 58/58 tests passed (100%)** with exit code 0.
2. **Current Mesh Structure in `public/models/tshirt.obj`**:
   - `vCount`: 5,355 vertices, `vtCount`: 5,761 UVs, `vnCount`: 5,355 normals, `faceCount`: 10,192 triangular faces.
   - Dimensions: $X \in [-0.950, +0.950]$ m, $Y \in [-0.892, +0.892]$ m, $Z \in [-0.430, +0.430]$ m.
   - Face-level crossing faces across $U = 0.50$: Exactly 0.
   - Shared welded seam vertices between Front and Back: 122 vertices.
3. **Forensic Evidence of Legacy UV Misalignment in `public/models/tshirt.obj`**:
   - **Chest Vertices** ($X \approx 0.0, Y \approx +0.16 \text{ to } +0.25, Z > 0.15$): Mapped to UV coordinates with **$V \approx 0.291$** (placed near bottom of texture).
   - **Bottom Hem Vertices** ($Y \approx -0.86$): Mapped to UV coordinates with **$V \approx 0.891$** (placed near top of texture).
   - **Front Sleeves** ($X < -0.70, Z > 0.05$): Mapped to **$U \approx 0.85$** (mapped into the BACK texture zone!).
   - Across the entire mesh: **206 front-facing vertices ($Z > 0.05$) have $U \ge 0.50$**, and **3,770 rear-facing vertices ($Z < -0.05$) have $U < 0.50$**.
4. **Hardcoded Legacy Test Assertions**:
   - `src/lib/__tests__/m5_graphics_production_challenger.test.ts` lines 399–400:
     ```ts
     expect(viewerLeftU!).toBeCloseTo(0.52, 1);
     expect(viewerRightU!).toBeCloseTo(0.99, 1);
     ```
     These values were hardcoded to the previous Gen 8 pattern UV layout. Under continuous planar projection across the whole shirt ($X \in [-0.95, +0.95]$), torso edges ($X = \pm 0.35$) map to $U \approx 0.66$ and $U \approx 0.84$.
   - `vtCount` exact checks (5,761) in `m5_graphics_production_challenger.test.ts:189`, `studio_challenger.test.ts:119`, and `m5_adversarial_final.test.ts:378`.
5. **Procedural Fallback Geometry (`src/lib/tshirtGeometry.ts`)**:
   - Generates 1,490 vertices, 2,680 triangles.
   - Maps Front torso to $U \in [0.0, 0.5]$, $V \in [0.0, 1.0]$ ($V=0$ at hem, $V=1$ at shoulder/collar, $U=0.25$ at center).
   - Maps Back torso to $U \in [0.5, 1.0]$, $V \in [0.0, 1.0]$ ($V=0$ at hem, $V=1$ at shoulder, $U=0.75$ at center).
   - Preserves horizontal anti-mirroring and 0 bleed.
   - Already complies with planar UV principles.

---

## 2. Logic Chain

1. **Why the 2D Studio Canvas Misaligned with the 3D Model**:
   - In `src/components/studio/textureSync.ts`, 2D elements are baked onto a flat $1024 \times 1024$ texture where Front is pixels $[0, 512]$ ($U \in [0, 0.5]$) and Back is pixels $[512, 1024]$ ($U \in [0.5, 1.0]$).
   - In 2D Studio Canvas, top of shirt is at $Y = 0$ ($V = 1.0$ in WebGL), chest is at $Y \approx 35\%$ ($V \approx 0.65$), and hem is at $Y \approx 90\%$ ($V \approx 0.10$).
   - In the Gen 8 OBJ model, the UV map came from tailor sewing patterns where $V$ was inverted ($V \approx 0.29$ for chest, $V \approx 0.89$ for hem) and sleeves were detached islands.
   - Therefore, a design placed on the chest in the 2D canvas mapped to $V \approx 0.65$ on the texture, which landed on the collar or sleeves of the 3D model, while hem designs landed near the chest!
2. **Why Legacy Tests Passed Despite Misalignment**:
   - `studio_challenger.test.ts:160` restricted its test region strictly to `Math.abs(x) <= 0.35 && y >= -0.7 && y <= 0.6`, deliberately excluding the sleeves ($|X| > 0.35$) and hem/collar.
   - No existing test suite asserted that hem vertices must have $V \approx 0.0$ or that chest vertices must have $V \approx 0.65$.
   - `m5_graphics_production_challenger.test.ts` asserted the specific legacy values `0.52` and `0.99`.
3. **What Must Be Aligned When Planar Projection Is Integrated**:
   - The new model must generate planar UVs:
     * Front ($Z \ge 0$): $U = 0.25 + 0.25 \times (X / X_{max})$, $V = (Y - Y_{min}) / (Y_{max} - Y_{min})$.
     * Rear ($Z \le 0$): $U = 0.75 - 0.25 \times (X / X_{max})$, $V = (Y - Y_{min}) / (Y_{max} - Y_{min})$.
   - In `m5_graphics_production_challenger.test.ts`, lines 399–400 must be updated from `toBeCloseTo(0.52, 1)` to verify that `viewerLeftU < viewerRightU` and $U \in [0.5, 1.0]$.
   - If the new OBJ unwrap produces a different `vtCount`, `vtCount` assertions in `m5_graphics_production_challenger.test.ts:189`, `studio_challenger.test.ts:119`, and `m5_adversarial_final.test.ts:378` must be aligned.
   - Comprehensive new verification tests must be added to verify anatomical alignment: chest ($U \approx 0.25, V \approx 0.64$), hem ($V \le 0.15$), front sleeve ($U \le 0.50$), and rear sleeve ($U \ge 0.50$).

---

## 3. Caveats

1. **UV Seam Silhouette Definition ($Z = 0$)**:
   - When partitioning the 3D mesh into Front ($Z \ge 0$) and Rear ($Z \le 0$), faces that straddle $Z = 0$ along the side ribs and shoulder crests must be split or assigned consistently by face normal ($N_z \ge 0$ vs $N_z < 0$) or face centroid to ensure that no single triangle connects a $U < 0.50$ vertex with a $U > 0.50$ vertex.
2. **`vtCount` Dependency**:
   - If planar unwrapping preserves the 5,761 `vt` entries of `Low_T-shirt.obj`, tests will pass without touching `vtCount`. If new UV indices are created, the 3 test suites asserting `vtCount === 5761` will need alignment to the exact new count.
3. **Procedural Geometry Untouched**:
   - `src/lib/tshirtGeometry.ts` does not require modification; it already implements planar projection.

---

## 4. Conclusion

1. **Baseline Health**: The test environment is completely green (323/323 tests passing).
2. **Root Cause Confirmed**: The 2D/3D visual misalignment was definitively caused by inverted $V$ coordinates (chest at $V=0.291$, hem at $V=0.891$) and detached sleeve UV islands in the Gen 8 model.
3. **Planar Projection Alignment Plan**:
   - Model adaptation (Milestone 1) will project Front to $U \in [0.002, 0.498], V \in [0.0, 1.0]$ and Back to $U \in [0.502, 0.998], V \in [0.0, 1.0]$ with hem at $V=0$ and collar at $V=1$.
   - Test suite alignment (Milestone 2) requires modifying lines 399–400 of `m5_graphics_production_challenger.test.ts` (and updating `vtCount` if changed), plus adding explicit anatomical tests for chest, hem, and sleeves.
   - Full survey deliverables are compiled in `analysis.md` and `handoff.md`.

---

## 5. Verification Method

To independently reproduce and verify this investigation:

1. **Run Full Test Suite Baseline**:
   ```bash
   npm test
   ```
   *Expected*: 17 test files passed, 323/323 tests passed.

2. **Run 3D/Studio Test Suites**:
   ```bash
   npx vitest run src/lib/__tests__/m5_graphics_production_challenger.test.ts src/lib/__tests__/studio_pipeline.test.ts src/lib/__tests__/studio_challenger.test.ts src/lib/__tests__/m5_adversarial_final.test.ts
   ```
   *Expected*: 4 test files passed, 58/58 tests passed.

3. **Verify Forensic Misalignment in Current `public/models/tshirt.obj`**:
   ```bash
   node -e "
   const fs = require('fs');
   const content = fs.readFileSync('public/models/tshirt.obj', 'utf8');
   const lines = content.split('\n');
   const positions = [], uvs = [];
   for (const l of lines) {
     if (l.startsWith('v ')) positions.push(l.split(/\s+/).slice(1).map(Number));
     else if (l.startsWith('vt ')) uvs.push(l.split(/\s+/).slice(1).map(Number));
   }
   for (const l of lines) {
     if (l.startsWith('f ')) {
       for (const p of l.split(/\s+/).slice(1)) {
         const [v, vt] = p.split('/').map(Number);
         const [x, y, z] = positions[v - 1], [u, vCoord] = uvs[vt - 1];
         if (Math.abs(x) < 0.1 && y > 0.15 && y < 0.35 && z > 0.12) {
           console.log('Chest vertex V coordinate:', vCoord); break;
         }
       }
     }
   }
   "
   ```
   *Expected*: Shows $V \approx 0.291$ (forensic evidence of inverted $V$ coordinate).
