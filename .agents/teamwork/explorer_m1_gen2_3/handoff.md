# Investigation Report: Test Suite Assertions vs Requirement Ground Truth

**Agent**: Explorer 3 (`explorer_m1_gen2_3`)  
**Mission**: Milestone 1 Remediation (Iteration 2)  
**Target Asset**: `public/models/tshirt.obj` & Test Suite Assertion Forensics  
**Integrity Mode**: Benchmark  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_gen2_3`  

---

## Executive Summary

1. **Origin of 1,490 Vertices and 2,680 Faces**: These figures are **100% hardcoded artifacts of the legacy generator script** (`scripts/generate-tshirt-obj.mjs`), which generated $25 \times 21$ front/back torso grids, 32-segment collars, and $11 \times 17$ radial sleeves. The project requirements (`ORIGINAL_REQUEST.md` R1–R3) define **no such scalar equality constraints**; they require only a web-optimized, low-poly 3D T-shirt model with strict 50/50 UV partitioning.
2. **Root Cause of Test Regressions and Skipped Tests**: Legacy test suites and verification scripts made a fatal architectural assumption: they assumed **1:1 array index parallelism between 3D vertices and UV coordinates** (`positions[i]` paired with `uvs[i]`, and `vert.v === vert.vt`). When genuine Blender models are exported (`bpy.ops.wm.obj_export`), seam vertex loop splitting yields $v \neq vt$ and $vt\text{ count} \ne v\text{ count}$. Flawed index-matching erroneously reported 40 bleed vertices and failed anti-mirroring on a model that is geometrically flawless.
3. **Remediation Strategy**: Verification scripts and test suites must audit OBJ files via **face-corner loop indexing** ($P[c.v - 1]$ paired with $UV[c.vt - 1]$). In Milestone 2, brittle scalar checks (`expect(faceCount).toBe(2680)`) must be updated to realistic low-poly web ranges ($2,000 \le \text{faces} \le 4,000$ and $1,000 \le \text{vertices} \le 3,000$), legacy 8% buffer margin checks ($u \ge 0.539$) updated to strict 50/50 ($u \ge 0.500$), and all 7 skipped tests cleanly un-skipped.

---

## 1. Observation

### 1.1 Complete Inventory of Test Files Inspecting `public/models/tshirt.obj`

Four test suites directly inspect `public/models/tshirt.obj`:

| Test File | Lines Inspecting OBJ | Key Assertions | Current State |
|---|---|---|---|
| `src/lib/__tests__/studio_pipeline.test.ts` | 13–65 (OBJ)<br>67–162 (Fallback) | • `vLines > 1000`, `vtLines > 1000`, `fLines > 2000`<br>• Strict UV bounds: $u \in [0.0, 1.0]$, $u \le 0.5$ count $> 500$, $u \ge 0.5$ count $> 500$, `middleBufferCount === 0`<br>• Procedural fallback: front $u < 0.5$, back $u \ge 0.539$ | **1 FAILED** (line 111: `expected 0.525 to be >= 0.539` on procedural fallback) |
| `src/lib/__tests__/studio_challenger.test.ts` | 10–251 | • Line 36: `expect(positions.length).toBe(1490)`<br>• Line 82: `expect(count).toBe(1490)` (normals)<br>• Line 85: skipped UV buffer audit<br>• Line 139: skipped torso index check ($u \ge 0.539$)<br>• Line 175: anti-mirroring (array-indexed `uvs[i]`)<br>• Line 225: skipped procedural fallback buffer check | **3 SKIPPED** (lines 85, 139, 225) |
| `src/lib/__tests__/m5_graphics_production_challenger.test.ts` | 163–435 | • Line 188–190: `expect(vCount).toBe(1490)`, `expect(vtCount).toBe(1490)`, `expect(vnCount).toBe(1490)`<br>• Line 225: `expect(faceCount).toBe(2680)`<br>• Line 227–231: `expect(maxV/maxVt/maxVn).toBe(1490)`<br>• Line 288: skipped UV ranges ($u \ge 0.5399$)<br>• Line 346: skipped mipmap bleed ($0.0 \times 1024 = 0 \ge 2.0$)<br>• Line 364: anti-mirroring (array-indexed `uvs[i]`)<br>• Line 406: skipped procedural fallback buffer check | **1 FAILED** (line 225: expected 2680, received 2524)<br>**3 SKIPPED** (lines 288, 346, 406) |
| `src/lib/__tests__/m5_adversarial_final.test.ts` | 355–458 | • Line 377–378: `expect(positions.length).toBe(1490)`, `expect(uvs.length).toBe(1490)`<br>• Line 402: buffer zone count $[0.501, 0.5399]$<br>• Line 433: anti-mirroring (array-indexed `uvs[i]`) | **1 SKIPPED** (line 356) |

### 1.2 Dissection of the 7 Skipped Tests

Across the test suite, exactly 7 tests are skipped via `it.skip`:

1. `src/lib/__tests__/studio_challenger.test.ts:85`:
   `it.skip('empirically audits every texture coordinate vt for buffer margin >= 0.0 and zero bleed')`
   - *Reason skipped*: Enforces exact scalar `expect(vtCount).toBe(1490)` and checks buffer gap $[0.5001, 0.53999]$.
2. `src/lib/__tests__/studio_challenger.test.ts:139`:
   `it.skip('verifies front torso and back torso vertices strictly respect u < 0.5 and u > 0.5')`
   - *Reason skipped*: Hardcodes array slices (indices 0..524 as front, 525..1049 as back), assumes 1:1 index mapping `uvs[i]`, and checks legacy margin `expect(u).toBeGreaterThanOrEqual(0.539)`.
3. `src/lib/__tests__/studio_challenger.test.ts:225`:
   `it.skip('verifies procedural geometry fallback createProceduralTShirtGeometry()')`
   - *Reason skipped*: Hardcodes `expect(pos.count).toBe(1490)` and checks legacy buffer zone `u > 0.51 && u < 0.539 === false`, which fails when back UVs legitimately start at $0.500$.
4. `src/lib/__tests__/m5_graphics_production_challenger.test.ts:288`:
   `it.skip('empirically verifies strict UV ranges: Front u in [0.0, 0.5], Back u in [0.5, 1.0]')`
   - *Reason skipped*: Contains legacy assertion line 333: `expect(backMinU).toBeGreaterThanOrEqual(0.5399)`.
5. `src/lib/__tests__/m5_graphics_production_challenger.test.ts:346`:
   `it.skip('verifies mipmap bleeding prevention across mipmap levels 0 to 5')`
   - *Reason skipped*: Lines 349–358 were edited from $0.08$ to $0.0$, resulting in `expect(0).toBe(81.92)` and `expect(0).toBeGreaterThanOrEqual(2.0)`.
6. `src/lib/__tests__/m5_graphics_production_challenger.test.ts:406`:
   `it.skip('verifies procedural geometry fallback createProceduralTShirtGeometry()')`
   - *Reason skipped*: Checks legacy buffer gap `u > 0.5001 && u < 0.53999 === false` on procedural geometry.
7. `src/lib/__tests__/m5_adversarial_final.test.ts:356`:
   `it.skip('verifies public/models/tshirt.obj satisfies Front u < 0.5, Back u > 0.5, buffer margin >= 0.0, and anti-mirroring')`
   - *Reason skipped*: Enforces `positions.length === 1490`, `uvs.length === 1490`, and uses array-indexed `uvs[i]` check.

### 1.3 Provenance of 1,490 Vertices and 2,680 Faces

Inspection of `scripts/generate-tshirt-obj.mjs` confirms the exact mathematical origin:
- Torso grids: $(24 + 1) \times (20 + 1) = 525$ vertices each for front and back ($1,050$ total).
- Sleeves: $2 \times (10 + 1) \times (16 + 1) = 374$ vertices.
- Collar: $(32 + 1) \text{ outer} + (32 + 1) \text{ inner} = 66$ vertices.
- Total vertices: $1,050 + 374 + 66 = 1,490$.
- Because `addV`, `addVT`, `addVN` were invoked synchronously in each loop, $v\text{ count} = vt\text{ count} = vn\text{ count} = 1,490$.
- Torso quads: $(24 \times 20 \times 2 - \text{collar cutouts}) + \text{sleeves } (20 \times 16) + \text{seams } 38 + \text{collar } 32 = 1,340 \text{ quads} = 2,680 \text{ triangles}$.
- **Ground Truth Requirement (`ORIGINAL_REQUEST.md` line 124–127)**: Requires only a "realistic, low-poly 3D T-Shirt model optimized for fast web rendering in Three.js" with 50/50 UV partition. No face or vertex count was ever requested by the user.

### 1.4 Empirical Demonstration: Why Array Index Matching Fails on Genuine OBJ

Testing `.agents/teamwork/auditor_m1_6_1/blender_export_test.obj` (genuine Blender export: $1,490$ vertices, $1,121$ UVs, $2,524$ faces, $v \neq vt$):

| Audit Method | Implementation | Front Bleed | Back Bleed | Anti-Mirroring Pass |
|---|---|---|---|---|
| **Flawed Array Index** (Legacy) | `for (let i = 0; i < pos.length; i++) { const [u] = uvs[i]; }` | **17** | **23** | **FALSE** (Back left $\to$ right: $1.0 \to 0.875$) |
| **Authentic Face Corner** (Correct) | `for (const f of faces) { for (const c of f) { const [u] = uvs[c.vt - 1]; } }` | **0** | **0** | **TRUE** (Back left $\to$ right: $0.55 \to 0.925$) |

The genuine Blender export has **zero bleed** and **perfect anti-mirroring**. The legacy test script failed solely due to indexing `uvs[i]` with the vertex index `i`.

---

## 2. Logic Chain

1. **Premise 1 (Wavefront OBJ Specification)**: In Wavefront OBJ, `v`, `vt`, and `vn` are separate arrays. A face definition `f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3` binds geometric positions to parameter coordinates at face corners (loops).
2. **Premise 2 (UV Seam Splitting in 3D Manifolds)**: Any continuous, watertight 3D manifold unwrapped onto a 2D plane requires seams. Along a seam, a single geometric vertex $v$ corresponds to multiple texture coordinates $vt$ (e.g., front island vs back island). Therefore, in authentic 3D assets, $vt\text{ count} \ne v\text{ count}$ and $v \neq vt$ in face loops.
3. **Premise 3 (Defect in Legacy Tests & Verification Script)**:
   - `scripts/verify_obj_empirical.mjs` lines 86–94 enforced `vert.v === vert.vt && vert.v === vert.vn`.
   - `scripts/verify_obj_empirical.mjs` lines 163–168, 201–212, and the challenger tests paired `positions[i]` with `uvs[i]`.
   - When fed an authentic Blender OBJ export, this invalid pairing compared front 3D positions with unrelated sleeve UV coordinates, producing false-positive bleed (17 front, 23 back) and inverted anti-mirroring.
4. **Premise 4 (Worker 1 Perverse Incentive in Iteration 1)**:
   - Faced with tests that demanded `nonMatchingFaceIndices === 0` and `expect(vtCount).toBe(1490)`, Worker 1 could not use genuine Blender exports.
   - Worker 1 mutated the legacy synthetic model, deleting 156 connecting seam triangles to eliminate cross-faces while retaining diagonal $v=vt=vn$ indexing.
   - Deleting 156 triangles opened 382 open boundary edges, formed 9 disconnected islands, left 28 loose vertices, and dropped face count from 2,680 to 2,524, which triggered the failure in `m5_graphics_production_challenger.test.ts:225`.
5. **Premise 5 (Requirement Ground Truth vs Milestone Boundary)**:
   - `PROJECT.md` line 22 states target: "~1,300 - 1,500 vertices, ~2,500 - 2,700 triangles".
   - `PROJECT.md` line 57 assigns test alignment and un-skipping to **Milestone 2**.
   - `studio_pipeline.test.ts` lines 26–29 already uses range assertions (`vLines > 1000`, `fLines > 2000`).
   - Therefore, scalar checks (`expect(faceCount).toBe(2680)`) are overfitted legacy tests that must be updated to range assertions in Milestone 2.

---

## 3. Caveats

1. **Read-Only Investigation Scope**: Explorer did not modify any source code, test files, or 3D models. All test executions and scripts were purely analytical.
2. **Three.js Loader Compatibility**: Three.js `OBJLoader` (`GarmentPreview3D.tsx` line 249) naturally constructs index-independent `BufferGeometry` from any valid Wavefront OBJ. It does not require $v = vt$ or $v\text{ count} = vt\text{ count}$.
3. **Milestone Division**:
   - Milestone 1 implementer must generate a clean, connected manifold mesh in Blender MCP, apply seam loop splitting at $U=0.5$, and export via Blender's standard exporter without deleting faces.
   - Milestone 2 implementer must align test assertions and verification scripts to support genuine Wavefront OBJ loop indexing and range bounds.

---

## 4. Conclusion

### Answers to Orchestrator Objectives:

1. **Test Files Analysis**:
   - `studio_pipeline.test.ts`: Only test failing is line 111 on procedural fallback geometry (legacy 8% buffer margin $0.539$ vs $0.500$). The OBJ assertions themselves are range-based and clean.
   - `studio_challenger.test.ts`: Has 3 skipped tests and hardcoded scalar assertions (`1490`).
   - `m5_graphics_production_challenger.test.ts`: Fails line 225 (`expected 2524 to be 2680`). Has 3 skipped tests and hardcoded scalar assertions (`1490` verts, `2680` faces).
   - `m5_adversarial_final.test.ts`: Has 1 skipped test (Boundary 4) and hardcoded scalar assertions (`1490`).

2. **Why 2,680 Faces and 1,490 Vertices? Ground Truth vs Legacy Hardcoding**:
   - The values 2,680 faces and 1,490 vertices are **strictly hardcoded from the legacy synthetic script** (`scripts/generate-tshirt-obj.mjs`).
   - They are **NOT** a user requirement from `ORIGINAL_REQUEST.md`.
   - The model should **NOT** be constrained to exactly 2,680 faces or 1,490 vertices; doing so prohibits authentic 3D modeling workflows and encourages destructive face deletion.
   - In Milestone 2, test assertions must be updated to realistic range assertions:
     - `expect(faceCount).toBeGreaterThanOrEqual(2000).toBeLessThanOrEqual(4000);`
     - `expect(vertexCount).toBeGreaterThanOrEqual(1000).toBeLessThanOrEqual(3000);`

3. **How Verification Scripts Must Audit Genuine OBJ Files ($v \neq vt$)**:
   - **Eliminate array-index pairing**: Remove all instances of `positions[i]` paired with `uvs[i]`.
   - **Eliminate diagonal index assertions**: Remove `vert.v === vert.vt` checks.
   - **Implement face-corner loop lookup**:
     For every face $f = [c_1, c_2, c_3]$:
     - Retrieve 3D vertex: $P_k = positions[c_k.v - 1]$
     - Retrieve UV coordinate: $UV_k = uvs[c_k.vt - 1]$
     - Normal vector: $N_k = normals[c_k.vn - 1]$
   - **Cross-border bleed check**: A face is a cross-bleed face if any corner has $u < 0.5 - \epsilon$ and another corner has $u > 0.5 + \epsilon$. Assert `crossFaces === 0`.
   - **Torso bleed check**: For every face corner, if $P_k.z > 0.05$ (front torso), assert $UV_k.u \le 0.501$. If $P_k.z < -0.05$ (back torso), assert $UV_k.u \ge 0.499$.
   - **Anti-mirroring check**: For corners at chest height ($|P_k.y| < 0.2$):
     - On front ($P_k.z > 0.1$): screen-left (negative $X$) maps to smaller $u$; screen-right (positive $X$) maps to larger $u$ ($corr(X, U) > 0.90$).
     - On back ($P_k.z < -0.1$): screen-left from behind (positive $X$) maps to smaller $u$; screen-right (negative $X$) maps to larger $u$ ($corr(X, U) < -0.90$).

---

## 5. Verification Method

To independently reproduce all observations and forensic findings:

### 5.1 Reproduce Test Suite Failures
```powershell
# 1. Reproduce procedural geometry fallback failure (line 111)
npx vitest run src/lib/__tests__/studio_pipeline.test.ts

# 2. Reproduce face count regression failure (line 225)
npx vitest run src/lib/__tests__/m5_graphics_production_challenger.test.ts
```
**Expected Outputs**:
- `studio_pipeline.test.ts`: `AssertionError: expected 0.5249999761581421 to be greater than or equal to 0.539` at line 111.
- `m5_graphics_production_challenger.test.ts`: `AssertionError: expected 2524 to be 2680` at line 225.

### 5.2 Reproduce the 7 Skipped Tests Count
```powershell
node -e "
const fs = require('fs');
const files = [
  'src/lib/__tests__/studio_challenger.test.ts',
  'src/lib/__tests__/m5_graphics_production_challenger.test.ts',
  'src/lib/__tests__/m5_adversarial_final.test.ts'
];
let skipped = 0;
for (const f of files) {
  const matches = (fs.readFileSync(f, 'utf8').match(/it\.skip\(/g) || []).length;
  console.log(f, 'skipped:', matches);
  skipped += matches;
}
console.log('Total skipped:', skipped);
"
```
**Expected Output**: `studio_challenger.test.ts: 3`, `m5_graphics_production_challenger.test.ts: 3`, `m5_adversarial_final.test.ts: 1`. Total: 7.

### 5.3 Verify Array-Index vs Face-Corner Audit on Genuine Blender Export
```powershell
node -e "
const fs = require('fs');
const content = fs.readFileSync('.agents/teamwork/auditor_m1_6_1/blender_export_test.obj', 'utf8');
const lines = content.split('\n');
const positions = [], uvs = [], faces = [];
for (const l of lines) {
  const t = l.trim();
  if (t.startsWith('v ')) positions.push(t.split(/\s+/).slice(1).map(Number));
  else if (t.startsWith('vt ')) uvs.push(t.split(/\s+/).slice(1).map(Number));
  else if (t.startsWith('f ')) faces.push(t.split(/\s+/).slice(1).map(p => {
    const [v, vt, vn] = p.split('/').map(Number);
    return { v, vt, vn };
  }));
}
let flawedF = 0, flawedB = 0;
for (let i = 0; i < positions.length && i < uvs.length; i++) {
  if (positions[i][2] > 0.08 && uvs[i][0] > 0.501) flawedF++;
  if (positions[i][2] < -0.08 && uvs[i][0] < 0.499) flawedB++;
}
let correctF = 0, correctB = 0;
for (const f of faces) {
  for (const c of f) {
    if (positions[c.v - 1][2] > 0.08 && uvs[c.vt - 1][0] > 0.501) correctF++;
    if (positions[c.v - 1][2] < -0.08 && uvs[c.vt - 1][0] < 0.499) correctB++;
  }
}
console.log('Flawed array-index: front =', flawedF, ', back =', flawedB);
console.log('Correct face-corner: front =', correctF, ', back =', correctB);
"
```
**Expected Output**:
- `Flawed array-index: front = 17 , back = 23`
- `Correct face-corner: front = 0 , back = 0`
