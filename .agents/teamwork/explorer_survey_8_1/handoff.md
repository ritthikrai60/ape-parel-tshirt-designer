# Handoff Report: 3D Model Geometry & UV Layout Investigation

**Role**: Explorer 1 (Model Geometry Explorer)  
**Target Asset**: `prep_models/various size/Low_T-shirt.obj`  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_survey_8_1`  
**Handoff Type**: Hard Handoff (Investigation Complete)  
**Date**: 2026-10-10  

---

## 1. Observation

1. **Target File Existence & Physical Metrics**:
   - Path: `prep_models/various size/Low_T-shirt.obj` (Full path: `D:\Coding Projects\ape-parel tshirt\prep_models\various size\Low_T-shirt.obj`)
   - Size: 785,709 bytes (767.29 KB)
   - Line Count: 21,585 lines (LF: 21,585, CRLF: 0, CR: 0)
   - Encoding: UTF-8 / 7-bit ASCII compatible (`has_bom = False`)
   - Header comments and declarations:
     - Line 1: `# This file uses centimeters as units for non-parametric coordinates.`
     - Line 3: `mtllib Low_T-shirt.mtl`
     - Line 4: `g default`

2. **Geometric Syntax Counts**:
   - Vertices (`v`): Exactly **5,355**
   - Texture coordinates (`vt`): Exactly **5,761**
   - Vertex normals (`vn`): Exactly **5,355**
   - Polygonal faces (`f`): Exactly **5,097**
     - Quads (4-vertex faces): 5,095
     - Triangles (3-vertex faces): 2
       - Triangle 1 at line 18,890: `f 2705/2796/2621 1915/2799/2622 1916/2795/2620` (Left armpit junction: $x \approx -175, y \approx 1325, z \approx -15$)
       - Triangle 2 at line 19,478: `f 2835/3445/3252 3313/3406/3214 2743/3442/3249` (Right armpit junction: $x \approx +185, y \approx 1290, z \approx -5$)
     - Face syntax format: Strictly `v/vt/vn` (every vertex index is accompanied by explicit texture coordinate and normal indices).
   - Smoothing groups (`s`): 7 entries (`s 1`, `s 52`, `s 54`, `s 1`, `s 115`, `s 117`, `s 120`).
   - Materials (`usemtl`):
     - `Low_T_shirt1:Collar_Stand_FRONT_3153`: 204 faces
     - `Low_T_shirt1:Base_FRONT_3159`: 4,885 faces
     - `Low_T_shirt1:Patch_FRONT_3165`: 8 faces

3. **3D Bounding Box & Axis Orientation**:
   - $X$: $[-371.978607, +376.942657]$, $\Delta X = 748.921264$, Center $X = +2.482025$ (Width / Left-Right)
   - $Y$: $[+931.976013, +1634.913086]$, $\Delta Y = 702.937073$, Center $Y = +1283.444549$ (Height / Vertical)
   - $Z$: $[-157.391418, +180.738647]$, $\Delta Z = 338.130065$, Center $Z = +11.673614$ (Depth / Front-Back)
   - Coordinate alignment: Three.js camera at $+Z$ looks at Front; Front Torso panel vertices average $Z = +81.5$ mm; Back Torso panel vertices average $Z = -115.7$ mm.

4. **UV Coordinates & Island Breakdown**:
   - Total UV islands: 15
   - Current $U$ range: $[0.020646, 1019.295593]$
   - Current $V$ range: $[0.012312, 1591.738525]$
   - Unnormalized element: Only Island 15 (8-face brand patch `Patch_FRONT_3165`) resides in pattern millimeter space ($u \in [970.9, 1019.3], v \in [1567.1, 1591.7]$).
   - Remaining 14 islands (5,089 faces) reside in $[0.02, 0.98] \times [0.01, 0.96]$.
   - Torso UV partition:
     - Front Torso (Island 9, 1,505 faces): $u \in [0.5002, 0.9768], v \in [0.0123, 0.5153]$ (currently on right half).
     - Back Torso (Island 12, 1,562 faces): $u \in [0.0206, 0.4972], v \in [0.0123, 0.5380]$ (currently on left half).
     - Both torso panels have identical width $\Delta u = 0.4766$, with 0 faces crossing $u = 0.50$.
   - Cross-border faces across $u = 0.50$: Exactly 47 faces (Island 3: 35 faces; Islands 4, 7, 10, 11, 13, 14: 2 faces each).

5. **Garment Seam Topology & Welding**:
   - The 3D geometry is **100% welded at all side seams**.
   - Front Body and Back Body share exactly 54 geometric vertices:
     - Left side seam: 27 shared vertices ($y \in [962.9, 1345.4]$).
     - Right side seam: 27 shared vertices ($y \in [958.8, 1336.9]$).
   - Zero physical seams or geometric disconnects exist between front and back panels.

6. **Tooling & Environment Status**:
   - Python 3.14.5 is installed and verified (`C:\Users\ritth\AppData\Local\Programs\Python\Python314\python.exe`).
   - Node.js v24.16.0 is installed and verified.
   - Blender 5.1.2 is installed at `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe` and runs headless scripts successfully (`--background --python-expr`).
   - Blender MCP (`execute_blender_code` via MCP server) returned permission denial in this session.

---

## 2. Logic Chain

1. **Step 1 (Geometry Integrity)**:
   - Observations 1 and 2 establish that `Low_T-shirt.obj` is a valid, clean Wavefront file containing 5,355 vertices and 5,097 faces (5,095 quads, 2 triangles).
   - Inferences: The mesh is clean, production-grade polygonal geometry ready for Three.js rendering without requiring manual repair or remeshing.

2. **Step 2 (Coordinate Orientation)**:
   - Observation 3 shows that $Y$ spans from 932 mm (bottom hem) to 1635 mm (collar), $X$ spans from $-372$ mm to $+377$ mm (sleeve span), and $Z$ spans from $-157$ mm (back) to $+181$ mm (front).
   - Inferences: The 3D orientation ($+Y$ Up, $+Z$ Front, $+X$ Character Left) directly corresponds with standard Three.js OBJ rendering and `GarmentPreview3D.tsx`'s camera orientations without requiring 3D axis rotation.

3. **Step 3 (UV Layout & Inversion Diagnosis)**:
   - Observation 4 shows that Front Torso is mapped to $u \in [0.5002, 0.9768]$ and Back Torso is mapped to $u \in [0.0206, 0.4972]$.
   - ape-parel requirements (`ORIGINAL_REQUEST.md` R1) explicitly require:
     - Front garment section: strictly mapped within $u \in [0.0, 0.5]$
     - Back garment section: strictly mapped within $u \in [0.5, 1.0]$
   - Inferences: The original asset author inverted the 50/50 partition. To satisfy project requirements, Front and Back UV coordinates must be swapped along the U-axis.

4. **Step 4 (Anti-Mirroring Verification)**:
   - Testing coordinate covariance between 3D world coordinates and UVs confirms:
     - On Front, viewer-left ($-X$) maps to smaller $u$, viewer-right ($+X$) maps to larger $u$.
     - On Back (viewed from $-Z$), viewer-left ($+X$) maps to smaller $u$, viewer-right ($-X$) maps to larger $u$.
   - Inferences: Text placed horizontally on the 2D canvas will appear unmirrored on both sides. Swapping the partitions must preserve this horizontal orientation.

5. **Step 5 (Boundary & Crossing Resolution)**:
   - Observation 4 identified 47 faces crossing $u = 0.50$ (Left Sleeve and Hem trims).
   - Inferences: Placing Left Sleeve and Back Hems into $u \in [0.52, 0.98]$ and Right Sleeve, Collar, and Front Hems into $u \in [0.02, 0.48]$ completely eliminates all 47 crossing faces, leaving a $0.04$ safety margin across the center ($[0.48, 0.52]$) that prevents any mipmap bleeding.

6. **Step 6 (Optimal Processing Path)**:
   - Observation 6 indicates that while Blender 5.1.2 is installed locally, Blender MCP is blocked by permission check.
   - In contrast, Python 3.14.5 and Node 24 are fully available and can execute deterministic geometry transformations directly.
   - Inferences: A procedural Python geometry script is the fastest, safest, and most deterministic method to generate `public/models/tshirt.obj`, preserving quad topology with zero loss.

---

## 3. Caveats

1. **Test Suite Expectation Drift**:
   - Existing unit test `src/lib/__tests__/m5_graphics_production_challenger.test.ts` (lines 188-190) asserts exact vertex counts from the old procedural mock (`expect(vCount).toBe(1462)`, `expect(faceCount).toBe(2680)`).
   - Integrating `Low_T-shirt.obj` (5,355 vertices, 5,097 faces) requires updating these assertions to reflect the authentic production asset.
2. **Blender MCP Session Permission**:
   - Direct execution via Blender MCP tool `execute_blender_code` requires elevated session permissions. However, the standalone CLI `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe` is verified and functional as an alternative.

---

## 4. Conclusion

`prep_models/various size/Low_T-shirt.obj` is an authentic, watertight, quad-dominant garment model perfectly suited for ape-parel's 3D customizer. Its 3D coordinates align naturally with Three.js camera conventions. 

Adapting this model to replace `public/models/tshirt.obj` requires:
1. Swapping Front and Back UV panels so Front maps into $u \in [0.02, 0.48]$ and Back maps into $u \in [0.52, 0.98]$.
2. Packing secondary panels (sleeves, cuffs, hems, collar, and neck label) into their respective halves so that **exactly 0 faces cross $u = 0.50$**.
3. Adding standard Wavefront object headers (`o TShirt`, `usemtl GarmentBase`).
4. Aligning test suite assertions in `m5_graphics_production_challenger.test.ts` and `studio_pipeline.test.ts` to validate the new 5,355-vertex topology.

---

## 5. Verification Method

To independently reproduce and verify all findings:

1. **Verify Geometry Counts & Bounding Box**:
   ```powershell
   & "C:\Users\ritth\AppData\Local\Programs\Python\Python314\python.exe" -c "
   v = sum(1 for line in open('prep_models/various size/Low_T-shirt.obj') if line.startswith('v '))
   vt = sum(1 for line in open('prep_models/various size/Low_T-shirt.obj') if line.startswith('vt '))
   vn = sum(1 for line in open('prep_models/various size/Low_T-shirt.obj') if line.startswith('vn '))
   f = sum(1 for line in open('prep_models/various size/Low_T-shirt.obj') if line.startswith('f '))
   print(f'v={v}, vt={vt}, vn={vn}, f={f}')
   "
   ```
   *Expected output*: `v=5355, vt=5761, vn=5355, f=5097`.

2. **Verify Welded Side Seams**:
   Execute the seam vertex analysis script in `analysis.md` Section 5.
   *Expected output*: Exactly 54 shared vertices between Front and Back bodies (27 left, 27 right).

3. **Verify Blender 5.1.2 Availability**:
   ```powershell
   & "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --version
   ```
   *Expected output*: `Blender 5.1.2`.
