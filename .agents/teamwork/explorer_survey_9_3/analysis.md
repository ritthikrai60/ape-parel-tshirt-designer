# Test Suites Baseline & Planar UV Verification Survey Report

**Agent**: `explorer_survey_9_3`  
**Milestone**: Survey Phase — 3D/Studio Test Suites & Verification Alignment  
**Date**: 2026-10-10T22:05:00Z  
**Parent**: `orchestrator_9` (`91dc51fb-7050-43fa-9fbd-3548db1388f4`)  
**Target Project**: `ape-parel tshirt`  
**Authoritative Request**: `ORIGINAL_REQUEST.md` (specifically `## 2026-10-10T21:53:26Z`)  

---

## Executive Summary

This investigation analyzed all 3D/Studio test suites and geometric modules in `ape-parel`:
1. `src/lib/__tests__/m5_graphics_production_challenger.test.ts` (21 tests)
2. `src/lib/__tests__/studio_pipeline.test.ts` (12 tests)
3. `src/lib/__tests__/studio_challenger.test.ts` (12 tests)
4. `src/lib/__tests__/m5_adversarial_final.test.ts` (13 tests, Boundary 4 dedicated to 3D)
5. `src/lib/tshirtGeometry.ts` (offline procedural fallback geometry)

### Baseline Execution Result
- Full suite baseline execution (`npm test`): **17 test files passed, 323/323 tests passed (100%)**.
- 3D/Studio test suite subset: **4 test files passed, 58/58 tests passed (100%)**.

### Critical Discovery: Why the Previous Model Caused 2D/3D Misalignment
An empirical forensic audit of `public/models/tshirt.obj` (the Gen 8 model) revealed why designs placed in the 2D Studio customizer misaligned on the 3D model:
1. **Vertical $V$-Axis Inversion & Displacement**:
   - Chest vertices ($Y \approx +0.16$ to $+0.25$, $Z > 0.15$) had UV coordinates with **$V \approx 0.291$** (placed near the bottom of the texture!).
   - Bottom hem vertices ($Y \approx -0.86$) had UV coordinates with **$V \approx 0.891$** (placed near the top of the texture!).
   - As a result, graphics placed on the chest in the 2D canvas rendered at the hem, and hem graphics rendered at the chest!
2. **Sleeve & Collar UV Bleed Across Partitions**:
   - Out of all front-facing vertices ($Z > 0.05$), **206 face-vertices had $U \ge 0.50$** (mapped into the BACK texture zone!).
   - Out of all rear-facing vertices ($Z < -0.05$), **3,770 face-vertices had $U < 0.50$** (mapped into the FRONT texture zone!).
   - Front sleeve vertices ($X < -0.70, Z > 0.05$) had $U \approx 0.85$ (back zone), scattering sleeve graphics to the back.
3. **Why Legacy Tests Passed Despite Misalignment**:
   - `studio_challenger.test.ts` (line 160) explicitly restricted its torso check to `Math.abs(x) <= 0.35 && y >= -0.7 && y <= 0.6`, completely ignoring sleeves ($|X| > 0.35$), hem ($Y < -0.70$), and collar ($Y > 0.60$).
   - `studio_pipeline.test.ts` only checked individual UV entries (`vt`), not associating them with 3D positions ($X, Y, Z$).
   - `m5_graphics_production_challenger.test.ts` had hardcoded specific legacy pattern UV values: `expect(viewerLeftU!).toBeCloseTo(0.52, 1)` and `expect(viewerRightU!).toBeCloseTo(0.99, 1)`.

---

## Comprehensive Test Suite Audit

### 1. `src/lib/__tests__/m5_graphics_production_challenger.test.ts` (1,014 lines, 21 tests)

This file contains 4 major sections:
- Section 1: OBJ Mesh Physical Geometry & UV Mapping Verification (8 tests)
- Section 2: 2D/3D Texture Synchronization & Dual-Zone Baking (3 tests)
- Section 3: Supplier Production Spec Generation & API Probe (4 tests)
- Section 4: Order Status Lifecycle & AuditEvent Immutability (6 tests)

#### Detailed Assertion Map for Section 1:
| Line Range | Test Name | Target Subject | Exact Assertions | Planar Projection Status |
|---|---|---|---|---|
| 163–171 | OBJ exists & Wavefront format | `public/models/tshirt.obj` | `fs.existsSync(objPath)`, `content.length > 100000`, `content.includes('o TShirt')`, `content.includes('usemtl GarmentBase')` | **Compatible**. Planar OBJ must maintain these header tags. |
| 173–191 | Vertex & Element Counts | `public/models/tshirt.obj` | `expect(vCount).toBe(5355);`<br>`expect(vtCount).toBe(5761);`<br>`expect(vnCount).toBe(5355);` | **Alignment Watch**: `vCount` (5,355) and `vnCount` (5,355) are identical. If planar unwrap re-indexes or splits UVs differently, `vtCount` (5,761) must either be preserved or updated to match. |
| 193–232 | Triangular Faces & Index Bounds | `public/models/tshirt.obj` | `expect(faceCount).toBe(10192);`<br>`minV=1, maxV=5355`<br>`minVt=1, maxVt=5761`<br>`minVn=1, maxVn=5355` | **Compatible**. `faceCount` is 10,192 triangles. `maxVt` tracks `vtCount`. |
| 234–272 | 3D Dimensions & Symmetry | `public/models/tshirt.obj` | `minX closeTo -0.95, 1`<br>`maxX closeTo 0.95, 1`<br>`\|minX+maxX\| < 0.02`<br>`minY closeTo -0.89, 1`<br>`maxY closeTo 0.89, 1`<br>`minZ > -0.50, maxZ < 0.50` | **Compatible**. Preserves authentic 3D geometry of `Low_T-shirt.obj`. |
| 274–286 | Unit Normal Vectors | `public/models/tshirt.obj` | `expect(hypot(nx, ny, nz)).toBeCloseTo(1.0, 3)` | **Compatible**. Normals must be normalized. |
| 288–333 | Strict UV Ranges & 50/50 Partition | `public/models/tshirt.obj` | `v in [0.0, 1.0]`<br>`frontMinU closeTo 0.0, 2`<br>`frontMaxU <= 0.5`<br>`backMinU >= 0.5`<br>`backMaxU closeTo 1.0, 2`<br>`bufferGap >= 0.0`<br>`outOfRangeCount === 0` | **Compatible**. Planar projection strictly enforces $U \in [0.0, 0.5]$ (Front) and $U \in [0.5, 1.0]$ (Back). |
| 335–351 | Mipmap Bleed Prevention | Mathematical | `(0.08 * 1024) / 2^level >= 2.0` | **Compatible**. Constant math test. |
| 353–401 | Back Surface Anti-Mirroring | `public/models/tshirt.obj` | Samples $Z < -0.1, \|Y\| < 0.1$:<br>`x > 0.3 => viewerLeftU`<br>`x < -0.3 => viewerRightU`<br>`expect(viewerLeftU).toBeLessThan(viewerRightU)`<br>**`expect(viewerLeftU!).toBeCloseTo(0.52, 1);`**<br>**`expect(viewerRightU!).toBeCloseTo(0.99, 1);`** | **CRITICAL HARDCODED ASSERTIONS**: Under planar projection across whole garment (torso + sleeves), torso $X = \pm 0.35$ sits at $U \approx 0.66$ and $U \approx 0.84$. Testing `toBeCloseTo(0.52, 1)` and `toBeCloseTo(0.99, 1)` will FAIL. **MUST BE ALIGNED** to verify `viewerLeftU < viewerRightU` and range $U \in [0.5, 1.0]$. |
| 403–435 | Procedural Geometry Fallback | `createProceduralTShirtGeometry()` | `posAttr.count === 1490`, `uvAttr.count === 1490`, `normAttr.count === 1490`, $Z > 0 \implies U < 0.5$, $Z < 0 \implies U \ge 0.5$ | **Compatible**. Passes cleanly. |

---

### 2. `src/lib/__tests__/studio_pipeline.test.ts` (411 lines, 12 tests)

- **Section 1: T-Shirt Mesh & UV Unwrapping Contract**:
  - Line 15: `generates a valid public/models/tshirt.obj file with correct structure`:
    Checks $v > 1000, vt > 1000, vn > 1000, f > 2000$. **Compatible** (5,355 / 10,192).
  - Line 32: `enforces strict UV boundaries on public/models/tshirt.obj texture coordinates`:
    Checks $U \in [0, 1], V \in [0, 1]$, $U \le 0.5 \implies frontUVCount > 500$, $U \ge 0.5 \implies backUVCount > 500$, $middleBufferCount === 0$. **Compatible**.
  - Line 67: `createProceduralTShirtGeometry() produces valid Three.js geometry with exact UV partitions`:
    Pos count > 1000, index count > 2000, $Z > 0 \implies U < 0.5$, $Z < 0 \implies U \ge 0.5$, $bleedCount === 0$. **Compatible**.
  - Line 121: `enforces horizontal anti-mirroring orientation on front and back surfaces`:
    Tests procedural geometry: Front $X < -0.3$ has smaller $U$; Back $X > 0.3$ has smaller $U$. **Compatible**.
- **Section 2: Authentic Garment Colors**:
  - Tests BLK (`#131718`), WHT (`#FFFFFF`), BGE (`#F5F0E8`), WRM (`#DABA98`). **Compatible**.
- **Section 3: Texture Baking Coordinate Calculations**:
  - Front center (50%, 40%) -> (256, 409.6); Back center (50%, 45%) -> (768, 460.8); Aspect ratio scaling; Context fill. **Compatible**.
- **Section 4: Authoritative Benchmark Pricing**:
  - 1 surface DTG = THB 410; 2 surfaces DTG = THB 490. **Compatible**.

---

### 3. `src/lib/__tests__/studio_challenger.test.ts` (518 lines, 12 tests)

- **Section 1: OBJ Mesh Physical Geometry & UV Boundary Stress Testing**:
  - Line 13: `verifies public/models/tshirt.obj exists, is non-empty, and has valid header and object tag`:
    `content.length > 100000`, `o TShirt`, `usemtl GarmentBase`. **Compatible**.
  - Line 21: `parses all vertex positions and asserts physical sanity within realistic bounding box`:
    `positions.length === 5355`, minX/maxX close to -0.95/0.95, minY/maxY close to -0.89/0.89, depth in [-0.50, 0.50]. **Compatible**.
  - Line 65: `verifies all normal vectors vn are normalized unit vectors (length ≈ 1.0)`:
    `count === 5355`, length close to 1.0. **Compatible**.
  - Line 85: `empirically audits every texture coordinate vt for buffer margin >= 0.0 and zero bleed`:
    `expect(vtCount).toBe(5761);`, $U, V \in [0, 1]$, $frontMinU \approx 0.0, frontMaxU \le 0.5$, $backMinU \ge 0.5, backMaxU \approx 1.0$, $bufferMargin \ge 0.0$. **Alignment Watch**: tracks `vtCount`.
  - Line 130: `verifies front torso and back torso vertices strictly respect u < 0.5 and u >= 0.5`:
    Filtered by `Math.abs(x) <= 0.35 && y >= -0.7 && y <= 0.6`.
    $Z > 0.02 \implies U < 0.5$; $Z < -0.02 \implies U \ge 0.5$.
    `frontTorsoCount > 2000`, `backTorsoCount > 2000`, `frontBleed === 0`, `backBleed === 0`.
    **Opportunity for Expansion**: With full planar projection, this can be expanded to test sleeves ($|X| > 0.35$) and hem/collar!
  - Line 182: `verifies anti-mirroring orientation on front and back surfaces`:
    Front: `frontScreenLeftU < frontScreenRightU`.
    Back: `backScreenLeftU < backScreenRightU`.
    (Does not hardcode 0.52/0.99; uses strict `<` comparison). **Compatible**.
  - Line 239: `verifies procedural geometry fallback createProceduralTShirtGeometry()`:
    Pos count 1,490, index > 2000, bounds & partition. **Compatible**.
- **Sections 2 & 3: Authentic Colors & Texture Baking Stress Testing**:
  - Tests 4 colors, center coordinates, corners, zIndex order, broken image resilience. **Compatible**.

---

### 4. `src/lib/__tests__/m5_adversarial_final.test.ts` (600 lines, 13 tests)

- **Boundaries 1–3 & 5**: Pricing anti-tampering, THB 410 benchmark, concurrency rollback, role portal privacy, status stepper lifecycle, audit events. **Compatible**.
- **Boundary 4: 3D Mesh Geometry & UV Mapping (`public/models/tshirt.obj`)**:
  - Lines 355–453: `it('verifies public/models/tshirt.obj satisfies Front u < 0.5, Back u >= 0.5, buffer margin >= 0.0, and anti-mirroring')`:
    - `expect(positions.length).toBe(5355);`
    - `expect(uvs.length).toBe(5761);`  <--- Tracks `vtCount`.
    - `frontMaxU <= 0.5`, `frontMinU closeTo 0.0, 2`.
    - `backMinU >= 0.5`, `backMaxU closeTo 1.0, 2`.
    - `bufferMargin >= 0.0`.
    - Front anti-mirroring: `frontLeftU < frontRightU`.
    - Back anti-mirroring: `backLeftU < backRightU`.
    **Compatible** (provided `uvs.length` matches `vtCount`).

---

## Procedural Geometry Analysis (`src/lib/tshirtGeometry.ts`)

`createProceduralTShirtGeometry()` generates fallback geometry used by Three.js when `tshirt.obj` cannot be loaded.

### Mathematical UV Mapping in `tshirtGeometry.ts`:
1. **Front Torso ($Z \ge 0$)**:
   - $Y \in [yHem, yShoulder] = [-0.85, 0.58]$.
   - $V = vMin + tY \times (vMax - vMin) \in [0.0, 1.0]$.
   - At bottom hem ($y = -0.85$): $V = 0.0$.
   - At top shoulder ($y = 0.58$): $V = 1.0$.
   - At chest ($y \approx 0.20$): $V = (0.20 - (-0.85)) / (0.58 - (-0.85)) \approx 0.73$.
   - $X \in [-w, +w]$: $U = uFrontMin + tX \times (uFrontMax - uFrontMin) \in [0.0, 0.5]$.
   - At center chest ($X = 0$): $U = 0.25$.
2. **Back Torso ($Z \le 0$)**:
   - $Y \in [yHem, yShoulder]$: $V \in [0.0, 1.0]$ ($V = 0$ at hem, $1.0$ at shoulder).
   - $X \in [+w, -w]$: $U = uBackMin + tX \times (uBackMax - uBackMin) \in [0.5, 1.0]$.
   - Looking from behind, viewer-left ($X = +w$) has $U = 0.50$, viewer-right ($X = -w$) has $U = 1.00$. Anti-mirroring holds.
3. **Sleeves & Collar**:
   - Front sleeve ($vz \ge 0$): $U \in [0.03, 0.47] \subset [0.0, 0.50]$, $V \in [0.50, 0.85]$.
   - Back sleeve ($vz < 0$): $U \in [0.53, 0.97] \subset [0.50, 1.00]$, $V \in [0.50, 0.85]$.
   - Collar: Front collar $U \in [0.10, 0.40], V \in [0.90, 0.95]$; Back collar $U \in [0.60, 0.90], V \in [0.90, 0.97]$.
4. **Conclusion on `tshirtGeometry.ts`**:
   `tshirtGeometry.ts` **already matches the planar UV projection contract**. It requires **zero changes**. It serves as an exemplary ground-truth reference for how planar UV unwrapping must map onto the authentic OBJ model!

---

## Required Test Alignments & Recommended New Verification Tests

### 1. Assertions Requiring Alignment
In `src/lib/__tests__/m5_graphics_production_challenger.test.ts`:
- **Lines 399–400**:
  ```ts
  // CURRENT (hardcoded to Gen 8 pattern UV):
  expect(viewerLeftU!).toBeCloseTo(0.52, 1);
  expect(viewerRightU!).toBeCloseTo(0.99, 1);

  // ALIGNED (for planar projection):
  expect(viewerLeftU!).toBeLessThan(viewerRightU!);
  expect(viewerLeftU!).toBeGreaterThanOrEqual(0.5);
  expect(viewerRightU!).toBeLessThanOrEqual(1.0);
  ```
- **Line 189 & Face Index Bounds (Line 229)**:
  If the newly generated planar OBJ model uses a different `vtCount` (e.g. from splitting UV seams along $Z=0$):
  `expect(vtCount).toBe(NEW_VT_COUNT);` and `expect(maxVt).toBe(NEW_VT_COUNT);`.
  Similarly in `studio_challenger.test.ts:119` and `m5_adversarial_final.test.ts:378`.

### 2. New Verification Assertions to Add (to satisfy User Request `2026-10-10T21:53:26Z`)
To guarantee that the user's acceptance criteria are strictly verified, the test suite should incorporate:
1. **Vertical $V$ Anatomical Alignment**:
   - For bottom hem vertices ($Y < -0.85$): $V \in [0.0, 0.15]$ (guaranteeing hem design renders at bottom hem).
   - For collar/shoulder vertices ($Y > 0.70$): $V \in [0.85, 1.00]$ (guaranteeing collar design renders at top).
   - For center chest vertices ($|X| < 0.15, Y \in [0.20, 0.45], Z > 0.10$): $U \in [0.20, 0.30]$ and $V \in [0.55, 0.75]$ (guaranteeing chest design renders at chest).
2. **Sleeve Partition Conformance**:
   - Front sleeve vertices ($|X| > 0.50, Z > 0.05$): $U \in [0.0, 0.50]$ (zero bleeding to back).
   - Rear sleeve vertices ($|X| > 0.50, Z < -0.05$): $U \in [0.50, 1.00]$ (zero bleeding to front).
3. **Face-Level Seam Crossing Check**:
   - For every triangular face ($f$): all 3 corners must have $U \le 0.50$ OR all 3 corners must have $U \ge 0.50$.
   - Cross-border face count = **strictly 0**.
4. **Seam Weldedness Check**:
   - Verify that side seams share identical 3D position vertices ($v$) while referencing distinct UV coordinates ($vt$), ensuring zero mesh cracking under dynamic lighting.

---

## Action Plan for Subsequent Milestones
1. **Milestone 1 (Model Adaptation)**:
   - Worker M1 ingests `prep_models/various size/Low_T-shirt.obj` (5,355 vertices).
   - Applies Frontal Planar Projection for $Z \ge 0$ ($U \in [0.002, 0.498]$, $V = (Y - Y_{min}) / (Y_{max} - Y_{min})$) and Rear Planar Projection for $Z \le 0$ ($U \in [0.502, 0.998]$, unmirrored).
   - Splits UV indices along $Z = 0$ silhouette to guarantee 0 cross-border faces while maintaining welded 3D positions ($v$).
   - Exports to `public/models/tshirt.obj`.
2. **Milestone 2 (Test Alignment & Verification)**:
   - Worker M2 aligns lines 399–400 in `m5_graphics_production_challenger.test.ts` and any `vtCount` differences.
   - Adds the anatomical placement assertions (chest, hem, sleeves) and face-level zero-crossing tests.
   - Verifies `GarmentPreview3D.tsx` rendering.
3. **Milestone 3 (QA & Build Hardening)**:
   - Verifier swarm confirms all 323+ tests pass (`npm test`), TypeScript passes (`npx tsc --noEmit`), and production build completes (`npm run build`).
