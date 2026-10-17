# Handoff Report: 3D Garment Test Suites & Project Build Requirements

**Agent**: Explorer 3 (Test & Build Explorer)  
**Role**: Investigator / Test & Build Analyst  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_8_3`  
**Date**: 2026-10-10T19:42:00Z  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

1. **Test Suite Execution & Baseline Health**:
   - `npm test` (`vitest run`):
     - Command: `npx vitest run`
     - Result: `Test Files: 17 passed (17) | Tests: 323 passed (323) | Duration: 18.42s`. Exit code 0.
   - `npx tsc --noEmit`:
     - Command: `npx tsc --noEmit`
     - Result: Clean output, 0 type errors. Exit code 0.
   - `npm run build` (`next build`):
     - Command: `npm run build`
     - Result: `Compiled successfully`, `Generating static pages (10/10)`, `Route (app) ...`. Exit code 0.
   - `npm run lint` (`next lint`):
     - Prompts interactive setup because ESLint is not configured in this repository (no `.eslintrc.json`). Not part of automated acceptance criteria.

2. **Files Directly Testing `public/models/tshirt.obj`**:
   - `src/lib/__tests__/m5_graphics_production_challenger.test.ts`:
     - Line 169–170: `expect(content).toContain('o TShirt'); expect(content).toContain('usemtl GarmentBase');`
     - Line 173: `it('verifies exact vertex counts: 1462 vertices (v), 1104 UVs (vt), 1174 normals (vn)', () => {`
     - Lines 188–190: `expect(vCount).toBe(1462); expect(vtCount).toBe(1104); expect(vnCount).toBe(1174);`
     - Line 207: `expect(parts.length).toBe(3); // strictly triangular faces`
     - Lines 225–231: `expect(faceCount).toBe(2680); expect(minV).toBe(1); expect(maxV).toBe(1462); expect(minVt).toBe(1); expect(maxVt).toBe(1104); expect(minVn).toBe(1); expect(maxVn).toBe(1174);`
     - Lines 261–271: `expect(minX).toBeCloseTo(-0.95, 1); expect(maxX).toBeCloseTo(0.95, 1); expect(Math.abs(minX + maxX)).toBeLessThan(0.02); expect(minY).toBeCloseTo(-0.85, 1); expect(maxY).toBeCloseTo(0.70, 1); expect(minZ).toBeGreaterThan(-0.30); expect(maxZ).toBeLessThan(0.30);`
     - Lines 319–330: `expect(frontMinU).toBeCloseTo(0.0, 2); expect(frontMaxU).toBeLessThanOrEqual(0.5); expect(backMinU).toBeGreaterThanOrEqual(0.5); expect(backMaxU).toBeCloseTo(1.0, 2); expect(bufferGap).toBeGreaterThanOrEqual(0.0);`
     - Lines 399–400: `expect(viewerLeftU!).toBeCloseTo(0.58, 1); expect(viewerRightU!).toBeCloseTo(0.92, 1);`
   - `src/lib/__tests__/studio_challenger.test.ts`:
     - Lines 17–18: `expect(content.includes('o TShirt')).toBe(true); expect(content.includes('usemtl GarmentBase')).toBe(true);`
     - Line 36: `expect(positions.length).toBe(1462);`
     - Lines 52–62: `expect(minX).toBeCloseTo(-0.95, 1); expect(maxX).toBeCloseTo(0.95, 1); expect(minY).toBeCloseTo(-0.85, 1); expect(maxY).toBeCloseTo(0.70, 1); expect(minZ).toBeGreaterThan(-0.30); expect(maxZ).toBeLessThan(0.30);`
     - Line 82: `expect(count).toBe(1174);`
     - Line 119: `expect(vtCount).toBe(1104);`
     - Lines 176–179: `expect(frontTorsoCount).toBeGreaterThan(2000); expect(backTorsoCount).toBeGreaterThan(2000); expect(frontBleed).toBe(0); expect(backBleed).toBe(0);` (for `|x| <= 0.52`, `z > 0.02` / `z < -0.02`).
   - `src/lib/__tests__/m5_adversarial_final.test.ts`:
     - Line 377: `expect(positions.length).toBe(1462);`
     - Line 378: `expect(uvs.length).toBe(1104);`
     - Lines 402–411: `expect(frontMaxU).toBeLessThanOrEqual(0.5); expect(frontMinU).toBeCloseTo(0.0, 2); expect(backMinU).toBeGreaterThanOrEqual(0.5); expect(backMaxU).toBeCloseTo(1.0, 2);`
   - `src/lib/__tests__/studio_pipeline.test.ts`:
     - Lines 26–29: `expect(vLines.length).toBeGreaterThan(1000); expect(vtLines.length).toBeGreaterThan(1000); expect(vnLines.length).toBeGreaterThan(1000); expect(fLines.length).toBeGreaterThan(2000);`
     - Lines 61–64: `expect(frontUVCount).toBeGreaterThan(500); expect(backUVCount).toBeGreaterThan(500); expect(middleBufferCount).toBe(0);`

3. **Topology of Raw Candidate Model `prep_models/various size/Low_T-shirt.obj`**:
   - Element counts:
     - `v` (vertices): `5,355`
     - `vt` (UV coordinates): `5,761`
     - `vn` (vertex normals): `5,355`
     - `f` (faces): `5,097` total (specifically `5,095 quads` + `2 triangles`)
   - Bounding Box Dimensions:
     - $X \in [-371.978607, +376.942657]$ (span: 748.92 cm)
     - $Y \in [931.976013, 1634.913086]$ (span: 702.94 cm)
     - $Z \in [-157.391418, +180.738647]$ (span: 338.13 cm)
   - UV Boundaries:
     - $U \in [0.020646, 1019.295593]$
     - $V \in [0.012312, 1591.738525]$
   - Groups/Materials: `g default`, `g Low_T_shirt1:Mesh`, `usemtl Low_T_shirt1:Collar_Stand_FRONT_3153`, `usemtl Low_T_shirt1:Base_FRONT_3159`, `usemtl Low_T_shirt1:Patch_FRONT_3165`.

4. **Studio 3D Mesh Consumer (`GarmentPreview3D.tsx`)**:
   - Lines 257–264:
     ```ts
     const box = new THREE.Box3().setFromObject(obj);
     const center = box.getCenter(new THREE.Vector3());
     const size = box.getSize(new THREE.Vector3());
     obj.position.sub(center);
     const maxDim = Math.max(size.x, size.y, size.z);
     const scale = 1.9 / (maxDim || 1);
     obj.scale.setScalar(scale);
     ```
   - Three.js runtime dynamically centers and scales any loaded geometry to fit a 1.9-unit bounding box. However, unit tests parse the raw disk file (`public/models/tshirt.obj`) directly via `fs.readFileSync`.

---

## 2. Logic Chain

1. **Finding the complete blast radius of replacing `tshirt.obj`**:
   - Observation 2 reveals that while requirement R2 mentions `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts`, there are actually four test files that directly read and assert on `public/models/tshirt.obj`.
   - `studio_challenger.test.ts` (lines 36, 82, 119) and `m5_adversarial_final.test.ts` (lines 377–378) explicitly assert exact counts `1462` and `1104`.
   - Therefore, if only `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts` are updated, `npm test` will fail on `studio_challenger.test.ts` and `m5_adversarial_final.test.ts`.

2. **Triangulation necessity**:
   - Observation 3 shows that `Low_T-shirt.obj` has 5,095 quad faces (`f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 v4/vt4/vn4`).
   - Observation 2 shows that `m5_graphics_production_challenger.test.ts` line 207 strictly asserts `expect(parts.length).toBe(3); // strictly triangular faces`.
   - Therefore, the adapted model exported to `public/models/tshirt.obj` MUST be triangulated (splitting 5,095 quads + 2 triangles into 10,192 triangles), otherwise line 207 will fail.

3. **Spatial normalization necessity**:
   - Observation 3 shows that `Low_T-shirt.obj` is scaled in centimeters ($X \approx \pm 375$, $Y \approx 932\dots 1635$, $Z \approx \pm 170$).
   - Observation 2 shows that `m5_graphics_production_challenger.test.ts` lines 261–271 and `studio_challenger.test.ts` lines 52–62 assert $X \in [-0.95, +0.95]$, $Y \in [-0.85, +0.70]$, and $Z \in (-0.30, +0.30)$.
   - Furthermore, `studio_challenger.test.ts` torso spatial bleed test (lines 160–170) filters for `|x| <= 0.52` and `z > 0.02`. In raw centimeter scale, zero vertices will match or torso will be misclassified.
   - Therefore, the adapted model exported to `public/models/tshirt.obj` MUST be normalized and centered around the origin to fit the $[-0.95, +0.95]$ width envelope (with $Y$ span $\approx 1.55$ and $Z$ span $\approx 0.44$).

4. **Header declarations necessity**:
   - Observation 2 shows that `m5_graphics_production_challenger.test.ts` (lines 169–170) and `studio_challenger.test.ts` (lines 17–18) strictly assert `content.includes('o TShirt')` and `content.includes('usemtl GarmentBase')`.
   - Observation 3 shows that `Low_T-shirt.obj` does not declare `o TShirt` or `usemtl GarmentBase`.
   - Therefore, the OBJ generation/export pipeline MUST output `o TShirt` and `usemtl GarmentBase`.

5. **Legacy test assertion alignment**:
   - In `m5_graphics_production_challenger.test.ts`:
     - Line 188: update `1462` -> `5355`.
     - Line 189: update `1104` -> adapted `vtCount` (e.g. `5761` or remapped count).
     - Line 190: update `1174` -> `5355`.
     - Line 225: update `2680` -> triangulated face count (e.g. `10192`).
     - Lines 227–231: update index ceilings to match `5355` / `5761`.
     - Lines 399–400: change obsolete specific float checks (`0.58` and `0.92`) to boundary and relational checks (`viewerLeftU >= 0.50`, `viewerRightU <= 1.00`, `viewerLeftU < viewerRightU`).
   - In `studio_challenger.test.ts`:
     - Line 36: update `1462` -> `5355`.
     - Line 82: update `1174` -> `5355`.
     - Line 119: update `1104` -> adapted `vtCount`.
   - In `m5_adversarial_final.test.ts`:
     - Line 377: update `1462` -> `5355`.
     - Line 378: update `1104` -> adapted `vtCount`.
   - In `studio_pipeline.test.ts`:
     - Already relies on range checks (`> 1000` vertices, `> 2000` faces, `middleBufferCount === 0`). Will pass without code changes once the model conforms to the 50/50 partition.

---

## 3. Caveats

1. **UV Remapping Geometry**:
   - The exact number of texture coordinates (`vt`) in the final adapted model depends on whether UV seam splits are introduced during unwrapping. In raw `Low_T-shirt.obj`, `vtCount` is 5,761. If seam cutting adds duplicate UVs along the 50/50 boundary, `vtCount` may slightly exceed 5,761. The tests should be updated to match the final exact count of the adapted model.
2. **ESLint**:
   - `npm run lint` was checked; it is currently unconfigured in this repository. `npm run build` runs Next.js internal type and syntax checking, which passes cleanly.
3. **Database Pre-seeding**:
   - `npm test` requires `prisma/dev.db` to have seeded garment and variants (`APX-HVY-001`). If the database is ever wiped, `npm run db:seed` must be run prior to `npm test`.

---

## 4. Conclusion

1. The project build and test baseline is in a healthy, passing state (**17/17 test files passed, 323/323 tests passed, 0 TypeScript errors, successful Next.js production build**).
2. The blast radius of replacing `public/models/tshirt.obj` spans **four test files**:
   - `src/lib/__tests__/m5_graphics_production_challenger.test.ts`
   - `src/lib/__tests__/studio_pipeline.test.ts`
   - `src/lib/__tests__/studio_challenger.test.ts`
   - `src/lib/__tests__/m5_adversarial_final.test.ts`
3. All 4 files must have their legacy hardcoded counts (1,462 vertices, 1,104 UVs, 1,174 normals, 2,680 faces) aligned with the adapted 5,355-vertex topology.
4. The adapted model export pipeline must:
   - Normalize and center coordinates to meter scale ($X \in [-0.95, +0.95]$).
   - Triangulate all faces (`parts.length === 3`).
   - Output `o TShirt` and `usemtl GarmentBase`.
   - Partition UV coordinates strictly into Front $[0.0, 0.5]$ and Back $[0.5, 1.0]$.

---

## 5. Verification Method

To independently verify all findings and test suite behavior:

1. **Verify Baseline Test Suite**:
   ```powershell
   npx vitest run
   ```
   *Expected*: 17 test files pass, 323 tests pass.

2. **Verify TypeScript Type Integrity**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

3. **Verify Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Exit code 0, 10 static pages generated.

4. **Verify Incoming Model Properties**:
   ```powershell
   node -e "const fs = require('fs'); const lines = fs.readFileSync('prep_models/various size/Low_T-shirt.obj', 'utf8').split('\n'); let v=0, vt=0, vn=0, f=0; for (const l of lines) { if (l.startsWith('v ')) v++; else if (l.startsWith('vt ')) vt++; else if (l.startsWith('vn ')) vn++; else if (l.startsWith('f ')) f++; } console.log({ v, vt, vn, f });"
   ```
   *Expected*: `{ v: 5355, vt: 5761, vn: 5355, f: 5097 }`.

5. **Invalidation Conditions**:
   - If `studio_challenger.test.ts` or `m5_adversarial_final.test.ts` are left un-aligned with 5,355 vertices, running `npx vitest run` will immediately fail with `AssertionError: expected 5355 to be 1462`.
   - If the adapted OBJ file is exported with quad faces, `m5_graphics_production_challenger.test.ts` line 207 will fail with `AssertionError: expected 4 to be 3`.
