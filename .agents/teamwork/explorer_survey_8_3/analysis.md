# Test & Build Investigation Report: 3D Garment Topology & Test Alignment

**Date**: 2026-10-10T19:40:00Z  
**Author**: Explorer 3 (Test & Build Explorer)  
**Target Workspace**: `d:\Coding Projects\ape-parel tshirt`  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_8_3`  

---

## 1. Executive Summary

This investigation examines all 3D garment test suites and build requirements in preparation for adapting `prep_models/various size/Low_T-shirt.obj` (5,355 vertices) to replace `public/models/tshirt.obj` with a strict 50/50 Front/Back UV partition.

### Key Discoveries:
1. **Four (4) Test Files Directly Inspect `public/models/tshirt.obj`**:
   - `src/lib/__tests__/m5_graphics_production_challenger.test.ts`
   - `src/lib/__tests__/studio_pipeline.test.ts`
   - `src/lib/__tests__/studio_challenger.test.ts`
   - `src/lib/__tests__/m5_adversarial_final.test.ts`
   *(Note: While user prompt R2 only explicitly mentions `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts`, both `studio_challenger.test.ts` and `m5_adversarial_final.test.ts` also hardcode exact vertex counts (1,462) and will fail `npm test` if not aligned).*
2. **Current Baseline Health**:
   - `npm test`: **323 / 323 tests passing across all 17 test files** (~18.5s runtime).
   - `npx tsc --noEmit`: **0 TypeScript errors** (~7s runtime).
   - `npm run build`: **Successful production build** (10 static pages generated, ~25s runtime).
3. **Incoming Model vs. Assertion Discrepancies**:
   - Raw `Low_T-shirt.obj` contains **5,355 vertices, 5,761 UVs, 5,355 normals, 5,097 faces (5,095 quads + 2 triangles)**.
   - Raw coordinates are in centimeter scale: $X \in [-371.98, +376.94]$, $Y \in [931.98, 1634.91]$, $Z \in [-157.39, +180.74]$.
   - Raw UVs are in pixel/pattern coordinates ($U \in [0.02, 1019.30]$, $V \in [0.01, 1591.74]$), with Marvelous/CLO material names (`Collar_Stand_FRONT_3153`, etc.).
   - Legacy assertions require: strictly triangular faces (`v/vt/vn`), `o TShirt`, `usemtl GarmentBase`, normalized bounding box centered at origin ($[-0.95, +0.95]$), and exact counts (1462 v, 1104 vt, 1174 vn, 2680 f).

---

## 2. Comprehensive Inventory of 3D / Garment Tests

Across all 17 test files in `src/lib/__tests__/`, the following files contain assertions related to 3D mesh geometry, UV unwrapping, and Three.js loading:

| Test File | Section / Test Name | Target Tested | Assertion Type |
|---|---|---|---|
| `m5_graphics_production_challenger.test.ts` | `1. OBJ Mesh Physical Geometry & UV Mapping Verification` | `public/models/tshirt.obj` | Exact counts (`1462 v`, `1104 vt`, `1174 vn`, `2680 f`), Header tags (`o TShirt`, `usemtl GarmentBase`), Triangles arity (`f v/vt/vn`), Bounding box & symmetry, Unit normals, Strict UV bounds (`u in [0, 0.5]` vs `[0.5, 1.0]`), Back anti-mirroring. |
| `m5_graphics_production_challenger.test.ts` | Line 403: `createProceduralTShirtGeometry()` | `src/lib/tshirtGeometry.ts` | Procedural BufferGeometry fallback (`posAttr.count === 1490`, UV partitions). |
| `studio_pipeline.test.ts` | `1. T-Shirt Mesh & UV Unwrapping Contract` (Lines 12–65) | `public/models/tshirt.obj` | Threshold counts (`v > 1000`, `vt > 1000`, `vn > 1000`, `f > 2000`), Strict UV boundaries, Front UV > 500, Back UV > 500, `middleBufferCount === 0`. |
| `studio_pipeline.test.ts` | Lines 67–161: `createProceduralTShirtGeometry()` | `src/lib/tshirtGeometry.ts` | Three.js procedural fallback geometry, anti-mirroring orientation. |
| `studio_challenger.test.ts` | `1. OBJ Mesh Physical Geometry & UV Boundary Stress Testing` (Lines 12–237) | `public/models/tshirt.obj` | Header tags (`o TShirt`, `usemtl GarmentBase`), Exact `positions.length === 1462`, `vn === 1174`, `vt === 1104`, Bounding box, Torso spatial bleed (`frontBleed === 0`, `backBleed === 0`), Anti-mirroring. |
| `studio_challenger.test.ts` | Lines 239–270: `createProceduralTShirtGeometry()` | `src/lib/tshirtGeometry.ts` | Procedural fallback BufferGeometry (`pos.count === 1490`). |
| `m5_adversarial_final.test.ts` | `Boundary 4: 3D Mesh Geometry & UV Mapping` (Lines 355–453) | `public/models/tshirt.obj` | Exact `positions.length === 1462`, `uvs.length === 1104`, Strict UV bounds (`[0, 0.5]` vs `[0.5, 1.0]`), Buffer margin >= 0.0, Anti-mirroring. |

---

## 3. Detailed Breakdown of Existing Assertions on `public/models/tshirt.obj`

### A. Element Counts & Header Tags
- **Header Declarations**:
  - `m5_graphics_production_challenger.test.ts` (lines 169–170):
    ```ts
    expect(content).toContain('o TShirt');
    expect(content).toContain('usemtl GarmentBase');
    ```
  - `studio_challenger.test.ts` (lines 17–18):
    ```ts
    expect(content.includes('o TShirt')).toBe(true);
    expect(content.includes('usemtl GarmentBase')).toBe(true);
    ```
- **Exact Counts**:
  - `m5_graphics_production_challenger.test.ts`:
    ```ts
    expect(vCount).toBe(1462);
    expect(vtCount).toBe(1104);
    expect(vnCount).toBe(1174);
    expect(faceCount).toBe(2680);
    expect(minV).toBe(1); expect(maxV).toBe(1462);
    expect(minVt).toBe(1); expect(maxVt).toBe(1104);
    expect(minVn).toBe(1); expect(maxVn).toBe(1174);
    ```
  - `studio_challenger.test.ts`:
    ```ts
    expect(positions.length).toBe(1462);
    expect(count).toBe(1174); // vn count
    expect(vtCount).toBe(1104);
    ```
  - `m5_adversarial_final.test.ts`:
    ```ts
    expect(positions.length).toBe(1462);
    expect(uvs.length).toBe(1104);
    ```
  - `studio_pipeline.test.ts`:
    ```ts
    expect(vLines.length).toBeGreaterThan(1000);
    expect(vtLines.length).toBeGreaterThan(1000);
    expect(vnLines.length).toBeGreaterThan(1000);
    expect(fLines.length).toBeGreaterThan(2000);
    ```

### B. Face Topology and Arity
- `m5_graphics_production_challenger.test.ts` lines 206–213:
  ```ts
  const parts = trimmed.split(/\s+/).slice(1);
  expect(parts.length).toBe(3); // strictly triangular faces
  for (const p of parts) {
    const [v, vt, vn] = p.split('/').map(Number);
    expect(Number.isInteger(v)).toBe(true);
    expect(Number.isInteger(vt)).toBe(true);
    expect(Number.isInteger(vn)).toBe(true);
  }
  ```
  **Requirement**: Faces MUST be triangles (`parts.length === 3`) and MUST specify `v/vt/vn`.

### C. Physical Dimensions & Bounding Box
- `m5_graphics_production_challenger.test.ts` lines 261–271 & `studio_challenger.test.ts` lines 52–62:
  ```ts
  // Symmetrical sleeve span: ~1.9m total (-0.95 to +0.95)
  expect(minX).toBeCloseTo(-0.95, 1);
  expect(maxX).toBeCloseTo(0.95, 1);
  expect(Math.abs(minX + maxX)).toBeLessThan(0.01); // or 0.02

  // Height span (hem -0.85 to collar +0.70): ~1.55m
  expect(minY).toBeCloseTo(-0.85, 1);
  expect(maxY).toBeCloseTo(0.70, 1);

  // Depth span (torso thickness): -0.22 to +0.22
  expect(minZ).toBeGreaterThan(-0.30);
  expect(maxZ).toBeLessThan(0.30);
  ```

### D. UV Range, Partitioning, and Zero-Bleed Seams
- `m5_graphics_production_challenger.test.ts` lines 319–330:
  ```ts
  expect(frontMinU).toBeCloseTo(0.0, 2);
  expect(frontMaxU).toBeLessThanOrEqual(0.5);
  expect(backMinU).toBeGreaterThanOrEqual(0.5);
  expect(backMaxU).toBeCloseTo(1.0, 2);
  expect(bufferGap).toBeGreaterThanOrEqual(0.0);
  ```
- `studio_pipeline.test.ts` lines 50–64:
  ```ts
  if (u <= 0.5) frontUVCount++;
  else if (u >= 0.5) backUVCount++;
  else middleBufferCount++;
  expect(frontUVCount).toBeGreaterThan(500);
  expect(backUVCount).toBeGreaterThan(500);
  expect(middleBufferCount).toBe(0);
  ```
- `studio_challenger.test.ts` lines 160–179 (Torso Spatial Bleed):
  ```ts
  // Torso body: |x| <= 0.52
  if (Math.abs(x) <= 0.52) {
    if (z > 0.02) {
      frontTorsoCount++;
      if (u >= 0.5) frontBleed++;
      expect(u).toBeLessThan(0.5);
    } else if (z < -0.02) {
      backTorsoCount++;
      if (u < 0.5) backBleed++;
      expect(u).toBeGreaterThanOrEqual(0.5);
    }
  }
  expect(frontTorsoCount).toBeGreaterThan(2000);
  expect(backTorsoCount).toBeGreaterThan(2000);
  expect(frontBleed).toBe(0);
  expect(backBleed).toBe(0);
  ```

### E. Anti-Mirroring & Orientation
- All three challenger files sample points at chest level `Math.abs(y) < 0.1` and verify:
  - Looking at front ($z > 0.1$): left ($x < -0.3$) has smaller $u$ than right ($x > 0.3$).
  - Looking at back ($z < -0.1$): left ($x > 0.3$) has smaller $u$ than right ($x < -0.3$).
  - In `m5_graphics_production_challenger.test.ts` (lines 399–400):
    ```ts
    expect(viewerLeftU!).toBeCloseTo(0.58, 1);
    expect(viewerRightU!).toBeCloseTo(0.92, 1);
    ```
    *(Note: 0.58 and 0.92 are legacy constants derived from the old procedural 8% buffer margin mesh).*

---

## 4. Failure Mode Analysis: What Fails Upon Replacing with `Low_T-shirt.obj`

If `prep_models/various size/Low_T-shirt.obj` is integrated directly or with standard export without alignment:

| Test / Assertion | Location | Cause of Failure | Severity |
|---|---|---|---|
| **Vertex count = 1462** | `m5_graphics_production_challenger.test.ts`:188<br>`studio_challenger.test.ts`:36<br>`m5_adversarial_final.test.ts`:377 | `Low_T-shirt.obj` has 5,355 vertices, not 1,462. | **FAIL** (Blocker) |
| **Normal count = 1174** | `m5_graphics_production_challenger.test.ts`:190<br>`studio_challenger.test.ts`:82 | `Low_T-shirt.obj` has 5,355 normals. | **FAIL** (Blocker) |
| **UV count = 1104** | `m5_graphics_production_challenger.test.ts`:189<br>`studio_challenger.test.ts`:119<br>`m5_adversarial_final.test.ts`:378 | `Low_T-shirt.obj` has 5,761 UV coordinates. | **FAIL** (Blocker) |
| **Face count = 2680** | `m5_graphics_production_challenger.test.ts`:225 | Triangulated model will have ~10,192 faces (or 5,097 quads). | **FAIL** (Blocker) |
| **Index range 1..1462** | `m5_graphics_production_challenger.test.ts`:227, 229, 231 | Max vertex index is 5,355, max UV index is 5,761, max normal index is 5,355. | **FAIL** (Blocker) |
| **Face arity: 3 (Triangles)** | `m5_graphics_production_challenger.test.ts`:207 | `Low_T-shirt.obj` raw faces are Quads (`parts.length === 4`). | **FAIL** (Blocker if untriangulated) |
| **Header declarations** | `m5_graphics_production_challenger.test.ts`:169–170<br>`studio_challenger.test.ts`:17–18 | `Low_T-shirt.obj` lacks `o TShirt` and `usemtl GarmentBase`. | **FAIL** (Blocker if not added in export) |
| **Bounding box X, Y, Z** | `m5_graphics_production_challenger.test.ts`:261–271<br>`studio_challenger.test.ts`:52–62 | Raw coordinates are $X \in [-372, 377]$, $Y \in [932, 1635]$, $Z \in [-157, 181]$. Tests expect meter scale $[-0.95, 0.95]$ centered at origin. | **FAIL** (Blocker if unnormalized) |
| **Spatial Torso Bleed Filters** | `studio_challenger.test.ts`:160–170 | Spatial filter `\|x\| <= 0.52`, `z > 0.02` expects meter scale. In centimeter scale, zero vertices match. | **FAIL** |
| **Exact Anti-Mirroring UV Values** | `m5_graphics_production_challenger.test.ts`:399–400 | Hardcoded `toBeCloseTo(0.58)` and `toBeCloseTo(0.92)` do not match the new UV island placement. | **FAIL** |

---

## 5. Strategic Alignment Plan per Requirement R2

To satisfy Requirement R2 and ensure 100% test passing across the suite:

### 1. Adaptation & Export Specifications for `public/models/tshirt.obj`
The model processing pipeline (Blender MCP or geometric transformation script) MUST produce an OBJ file that adheres to:
1. **Header**:
   ```obj
   # Wavefront OBJ exported for ape-parel 3D studio
   mtllib tshirt.mtl
   o TShirt
   usemtl GarmentBase
   ```
2. **Topology**:
   - **Triangulation**: Export all faces as triangles (`f v/vt/vn v/vt/vn v/vt/vn`). Total triangular faces: 10,192 (or clean triangulation of 5,355 vertices).
   - **Unit Normals**: All normals normalized to unit length ($\|\mathbf{n}\| = 1.0$).
3. **Spatial Scale & Centering**:
   - Centered at origin: $X_{\text{center}} = 0$, $Y_{\text{center}} = -0.075$ (span $-0.85$ to $+0.70$ or normalized span ~1.55), $Z_{\text{center}} = 0$.
   - Symmetric width span: $X \in [-0.95, +0.95]$ (max dimension 1.90 units, directly matching Three.js `GarmentPreview3D.tsx` scale factor `1.9 / maxDim`).
4. **UV Unwrapping (50/50 Partition Contract)**:
   - Front garment surfaces: strictly mapped to $U \in [0.0, 0.5]$, $V \in [0.0, 1.0]$.
   - Back garment surfaces: strictly mapped to $U \in [0.5, 1.0]$, $V \in [0.0, 1.0]$.
   - Seams welded at $U = 0.50$, zero crossing faces ($U_{\text{min}} < 0.4999 \land U_{\text{max}} > 0.5001$).
   - Anti-mirrored: text placed on front and back reads left-to-right from the viewer's perspective.

### 2. Test Assertion Alignment Matrix
Per R2 ("Align any legacy test assertions in `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts` to match the new topology and 50/50 UV partition"), and extending to all files testing `tshirt.obj`:

1. **`src/lib/__tests__/m5_graphics_production_challenger.test.ts`**:
   - **Line 173**: Update description to reflect new topology: `5355 vertices (v), ~5761 UVs (vt), 5355 normals (vn)`.
   - **Lines 188–190**:
     ```ts
     expect(vCount).toBe(5355);
     expect(vtCount).toBe(5761); // or exact adapted count
     expect(vnCount).toBe(5355);
     ```
   - **Line 193 & Lines 225–231**:
     ```ts
     expect(faceCount).toBe(10192); // triangulated count
     expect(minV).toBe(1);
     expect(maxV).toBe(5355);
     expect(minVt).toBe(1);
     expect(maxVt).toBe(5761);
     expect(minVn).toBe(1);
     expect(maxVn).toBe(5355);
     ```
   - **Lines 399–400**:
     Replace legacy hardcoded floats `0.58` and `0.92` with relational and boundary assertions:
     ```ts
     expect(viewerLeftU!).toBeGreaterThanOrEqual(0.50);
     expect(viewerRightU!).toBeLessThanOrEqual(1.00);
     expect(viewerLeftU!).toBeLessThan(viewerRightU!);
     ```
2. **`src/lib/__tests__/studio_pipeline.test.ts`**:
   - Lines 26–29 already use `.toBeGreaterThan(1000)` and `.toBeGreaterThan(2000)`.
   - Lines 61–64 already use `frontUVCount > 500`, `backUVCount > 500`, `middleBufferCount === 0`.
   - **Verdict**: Fully compatible; will pass without breaking changes once the model satisfies the 50/50 partition.
3. **`src/lib/__tests__/studio_challenger.test.ts`**:
   - **Line 36**: `expect(positions.length).toBe(5355);`
   - **Line 82**: `expect(count).toBe(5355);`
   - **Line 119**: `expect(vtCount).toBe(5761);`
4. **`src/lib/__tests__/m5_adversarial_final.test.ts`**:
   - **Line 377**: `expect(positions.length).toBe(5355);`
   - **Line 378**: `expect(uvs.length).toBe(5761);`

---

## 6. Build, Typecheck, and Lint Verification Findings

| Command | Status | Output / Findings |
|---|---|---|
| `npm test` (`vitest run`) | **PASS** | 17 test files, 323 passed tests. Runtime: 18.42s. Database dependency: SQLite `prisma/dev.db` with pre-seeded garment `APX-HVY-001`. |
| `npx tsc --noEmit` | **PASS** | TypeScript 5.4.5 type check passes with 0 errors. Runtime: ~7s. |
| `npm run build` (`next build`) | **PASS** | Next.js 14.2.35 production build compiles and generates 10 static pages + dynamic endpoints. Runtime: ~25s. |
| `npm run lint` (`next lint`) | **PROMPT / SKIPPED** | ESLint is unconfigured in this repository (no `.eslintrc.json`). Next build performs compile-time linting and type checking automatically. |

---

## 7. Next Steps for Implementer & Verifier Swarm
1. Implementer can adapt `prep_models/various size/Low_T-shirt.obj` via Blender MCP / geometric processing:
   - Scale by factor to fit $X \in [-0.95, +0.95]$ and center at origin.
   - Triangulate faces (`f v/vt/vn`).
   - Remap UVs to Front $[0.0, 0.5]$ and Back $[0.5, 1.0]$.
   - Inject header `o TShirt` and `usemtl GarmentBase`.
2. Implementer updates the legacy assertions in:
   - `m5_graphics_production_challenger.test.ts`
   - `studio_pipeline.test.ts`
   - `studio_challenger.test.ts`
   - `m5_adversarial_final.test.ts`
3. Verifier verifies:
   - `npx vitest run` -> 323 passing tests.
   - `npx tsc --noEmit` -> 0 errors.
   - `npm run build` -> exit code 0.
