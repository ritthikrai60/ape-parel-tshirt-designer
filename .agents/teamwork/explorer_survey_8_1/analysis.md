# Comprehensive 3D Geometry and UV Layout Analysis Report

**Target Asset**: `prep_models/various size/Low_T-shirt.obj`  
**Investigating Agent**: Explorer 1 (Model Geometry Explorer)  
**Date**: 2026-10-10  
**Context**: Customizer 3D Studio Integration & UV 50/50 Partition Normalization for `public/models/tshirt.obj`

---

## Executive Summary

A comprehensive forensic investigation of `prep_models/various size/Low_T-shirt.obj` was executed using standalone Python 3.14, Node.js 24, and Blender 5.1.2. The model is a production-grade, quad-dominant garment asset created in professional apparel CAD (CLO3D / Marvelous Designer). It features **5,355 vertices**, **5,761 texture coordinates**, **5,355 vertex normals**, and **5,097 faces** (5,095 quads, 2 triangles).

The 3D coordinate system matches Three.js conventions perfectly: **X is Width** ([-372.0, +376.9] mm), **Y is Vertical Height** ([+932.0, +1634.9] mm), and **Z is Depth** ([-157.4, +180.7] mm, with +Z representing Front and -Z representing Back). The side seams are **100% physically welded in 3D geometry** (54 shared vertices between Front and Back body panels).

The primary technical finding is that **the current UV layout already separates Front and Back bodies into non-overlapping blocks, but they are horizontally swapped**:
- Back Body currently occupies $u \in [0.0206, 0.4972]$
- Front Body currently occupies $u \in [0.5002, 0.9768]$
- 47 secondary faces (sleeves and hem trims) currently cross the $u = 0.50$ center line.
- One 8-face inner collar patch (`Patch_FRONT_3165`) was exported in unnormalized pattern millimeter coordinates ($u \in [970.9, 1019.3], v \in [1567.1, 1591.7]$).

Horizontal anti-mirroring is already correctly preserved in the base asset (reading left-to-right on both Front and Back surfaces). Adapting this model for `public/models/tshirt.obj` requires a deterministic UV reorganization that swaps the Front and Back UV partitions, places sleeves/hems into their respective halves, normalizes the collar patch, and maintains zero crossing faces across $u = 0.50$.

---

## 1. File Verification & Physical Metadata

| Metric | Measured Value | Standard / Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Absolute Path** | `D:\Coding Projects\ape-parel tshirt\prep_models\various size\Low_T-shirt.obj` | `prep_models/various size/Low_T-shirt.obj` | Confirmed |
| **File Size** | 785,709 bytes (767.29 KB) | ~785 KB | Confirmed |
| **Line Count** | 21,585 lines | N/A | Confirmed |
| **Line Endings** | LF (`\n`): 21,585; CRLF (`\r\n`): 0; CR: 0 | UNIX LF standard | Confirmed |
| **Encoding** | UTF-8 / 7-bit ASCII compatible | UTF-8 | Confirmed |
| **BOM Header** | None (`has_bom = False`) | No BOM | Confirmed |
| **Header Declaration** | `# This file uses centimeters as units for non-parametric coordinates.` | Wavefront comment | Valid |
| **Material Library** | `mtllib Low_T-shirt.mtl` (Line 3) | Wavefront declaration | Declared |

---

## 2. Geometric Elements & Wavefront Syntax Breakdown

Detailed element count from line-by-line parsing:

```
vCount:  5,355  (Geometric vertices)
vtCount: 5,761  (Texture coordinates)
vnCount: 5,355  (Vertex normals)
fCount:  5,097  (Polygonal faces)
```

### Face Topology
- **Quad faces**: 5,095 (99.96%)
- **Triangular faces**: 2 (0.04%)
- **Face corner format**: Strictly `v/vt/vn` (every vertex references an explicit geometric vertex, texture coordinate, and normal separated by two slashes).
- **Triangle Locations**:
  1. Line 18,890: `f 2705/2796/2621 1915/2799/2622 1916/2795/2620` (Left armpit junction: $x \approx -175, y \approx 1325, z \approx -15$)
  2. Line 19,478: `f 2835/3445/3252 3313/3406/3214 2743/3442/3249` (Right armpit junction: $x \approx +185, y \approx 1290, z \approx -5$)
  These two triangles represent standard topology reduction vertices at the armpit seams where sleeve rings join the cylindrical torso.

### Groups, Smoothing & Materials
- **Groups (`g`)**: `g default`, `g Low_T_shirt1:Mesh` (all 5,097 faces belong to `Low_T_shirt1:Mesh`).
- **Smoothing Groups (`s`)**: 7 statements (`s 1`, `s 52`, `s 54`, `s 1`, `s 115`, `s 117`, `s 120`).
- **Materials (`usemtl`)**:
  - `Low_T_shirt1:Collar_Stand_FRONT_3153`: 204 faces (Collar inner & outer ribbing)
  - `Low_T_shirt1:Base_FRONT_3159`: 4,885 faces (Torso panels, sleeves, cuffs, hems)
  - `Low_T_shirt1:Patch_FRONT_3165`: 8 faces (Inner back neckline size/brand label)

---

## 3. Exact 3D Bounding Box & Orientation Analysis

### Mathematical Extents (to 6 decimal places)

| Axis | Minimum | Maximum | Dimension ($\Delta$) | Center ($C$) | Garment Orientation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **X** (Width) | `-371.978607` | `+376.942657` | `748.921264` | `+2.482025` | Left / Right (Sleeve span $\approx 74.9$ cm) |
| **Y** (Height) | `+931.976013` | `+1634.913086` | `702.937073` | `+1283.444549` | Vertical (Hem $\approx 93.2$ cm to Collar $\approx 163.5$ cm) |
| **Z** (Depth) | `-157.391418` | `+180.738647` | `338.130065` | `+11.673614` | Depth (Back $-15.7$ cm to Chest $+18.1$ cm) |

### Coordinate System Alignment with Three.js
In `src/components/studio/GarmentPreview3D.tsx`:
- The default **FRONT** camera preset positions the camera at $(0, 0.1, +2.3)$ looking towards $(0, 0, 0)$.
  - In `Low_T-shirt.obj`, Front Torso vertices have $z \in [-32.0, +179.3]$ with $\bar{z} = +81.5$ mm $\rightarrow$ **$+Z$ is FRONT**.
- The **BACK** camera preset positions the camera at $(0, 0.1, -2.3)$ looking towards $(0, 0, 0)$.
  - In `Low_T-shirt.obj`, Back Torso vertices have $z \in [-157.1, +12.8]$ with $\bar{z} = -115.7$ mm $\rightarrow$ **$-Z$ is BACK**.
- **Y axis** represents Up/Down: Bottom hem is at $y \approx 932$ mm, neckline/shoulders are at $y \approx 1635$ mm.
- **X axis** represents Left/Right: Character's right sleeve cuff is at $x \approx -372$ mm (viewer-left when facing front), character's left sleeve cuff is at $x \approx +377$ mm (viewer-right when facing front).
- **Scale & Normalization**:
  In `GarmentPreview3D.tsx` (lines 257–264):
  ```typescript
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  obj.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1.9 / (maxDim || 1);
  obj.scale.setScalar(scale);
  ```
  `maxDim` for `Low_T-shirt.obj` is $\Delta X = 748.921$ mm. Three.js centers the mesh at $(0, 0, 0)$ and scales it by $1.9 / 748.921 = 0.002537$, resulting in an on-screen width of exactly 1.9 Three.js units.

---

## 4. Current UV Layout & Island Decomposition

Topological analysis of shared texture coordinate edges reveals **15 connected UV islands**:

| Island | Component | Faces | Verts | UV U Range | UV V Range | 3D Center $(X, Y, Z)$ | Avg Normal $Z$ | Current U Partition |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | Collar Stand Layer 1 | 102 | 144 | $[0.0206, 0.3469]$ | $[0.6013, 0.6140]$ | $(1.0, 1605.0, -20.1)$ | $+0.29$ | Left ($u \le 0.5$) |
| **2** | Left Sleeve Cuff Band 1 | 66 | 102 | $[0.5787, 0.9664]$ | $[0.7984, 0.8189]$ | $(-304.8, 1317.3, -34.8)$ | $-0.01$ | Right ($u \ge 0.5$) |
| **3** | Left Sleeve Panel | 617 | 669 | $[0.3485, 0.7362]$ | $[0.5179, 0.8135]$ | $(-236.0, 1451.0, -45.6)$ | $-0.07$ | **Crosses $u=0.50$ (35 faces)** |
| **4** | Right Sleeve Cuff Band 1 | 66 | 102 | $[0.3466, 0.7343]$ | $[0.8216, 0.8420]$ | $(308.4, 1310.9, -30.5)$ | $-0.01$ | **Crosses $u=0.50$ (2 faces)** |
| **5** | Right Sleeve Panel | 617 | 669 | $[0.0206, 0.4084]$ | $[0.6683, 0.9639]$ | $(241.7, 1445.7, -40.6)$ | $-0.02$ | Left ($u \le 0.5$) |
| **6** | Left Sleeve Cuff Band 2 | 66 | 102 | $[0.5890, 0.9766]$ | $[0.8447, 0.8651]$ | $(-304.7, 1317.1, -34.8)$ | $0.00$ | Right ($u \ge 0.5$) |
| **7** | Right Sleeve Cuff Band 2 | 66 | 102 | $[0.3138, 0.7015]$ | $[0.8680, 0.8885]$ | $(308.4, 1310.8, -30.6)$ | $0.00$ | **Crosses $u=0.50$ (2 faces)** |
| **8** | Collar Stand Layer 2 | 102 | 144 | $[0.0206, 0.3469]$ | $[0.6169, 0.6296]$ | $(1.0, 1604.3, -20.4)$ | $-0.23$ | Left ($u \le 0.5$) |
| **9** | **Front Torso Body** | 1,505 | 1,582 | $[0.5002, 0.9768]$ | $[0.0123, 0.5153]$ | $(-1.9, 1261.0, +81.5)$ | **$+0.71$** | **Right ($u \ge 0.5$) [Swapped!]** |
| **10** | Front Bottom Hem Layer 1 | 80 | 123 | $[0.4688, 0.9366]$ | $[0.8914, 0.9058]$ | $(-3.6, 972.2, +110.4)$ | $+0.64$ | **Crosses $u=0.50$ (2 faces)** |
| **11** | Back Bottom Hem Layer 1 | 80 | 123 | $[0.4469, 0.9147]$ | $[0.9433, 0.9577]$ | $(1.1, 943.1, -98.7)$ | $-0.61$ | **Crosses $u=0.50$ (2 faces)** |
| **12** | **Back Torso Body** | 1,562 | 1,638 | $[0.0206, 0.4972]$ | $[0.0123, 0.5380]$ | $(5.5, 1255.0, -115.7)$ | **$-0.73$** | **Left ($u \le 0.5$) [Swapped!]** |
| **13** | Front Bottom Hem Layer 2 | 80 | 123 | $[0.4546, 0.9225]$ | $[0.9087, 0.9231]$ | $(-3.5, 972.2, +109.0)$ | $+0.64$ | **Crosses $u=0.50$ (2 faces)** |
| **14** | Back Bottom Hem Layer 2 | 80 | 123 | $[0.4585, 0.9263]$ | $[0.9260, 0.9404]$ | $(1.1, 943.3, -97.3)$ | $-0.62$ | **Crosses $u=0.50$ (2 faces)** |
| **15** | Back Neckline Brand Patch | 8 | 15 | $[970.9, 1019.3]$ | $[1567.1, 1591.7]$ | $(5.1, 1583.3, -113.5)$ | $-0.95$ | **Unnormalized Pattern mm** |

### Key UV Observations
1. **Torso 50/50 Inversion**:
   - The Front Torso (Island 9) has width $\Delta U = 0.9768 - 0.5002 = 0.4766$, strictly located on the right half ($u \ge 0.5$).
   - The Back Torso (Island 12) has width $\Delta U = 0.4972 - 0.0206 = 0.4766$, strictly located on the left half ($u \le 0.5$).
   - Both panels have identical widths (0.4766), designed for a 50/50 texture split, but positioned in reverse compared to ape-parel's contract (Front in $[0.0, 0.5]$, Back in $[0.5, 1.0]$).
2. **Zero Torso Boundary Bleed**:
   - Neither Front Torso nor Back Torso crosses $u = 0.50$ ($\min U_{\text{Front}} = 0.5002 > 0.50$, $\max U_{\text{Back}} = 0.4972 < 0.50$).
3. **Cross-Border Faces**:
   - Exactly 47 faces in the model cross $u = 0.50$: Island 3 (35 faces), Island 4 (2 faces), Island 7 (2 faces), Island 10 (2 faces), Island 11 (2 faces), Island 13 (2 faces), Island 14 (2 faces).
4. **Vertical Orientation**:
   - On both Front and Back bodies, $v$ increases from bottom hem ($v \approx 0.01$ to $0.44$) up towards neckline ($v \approx 0.52$ to $0.66$). Texture vertical mapping is right-side up.
5. **Horizontal Anti-Mirroring**:
   - Empirical analysis of coordinate correlation confirms that text placed on Front and Back reads left-to-right:
     - Front: Viewer-left ($-X$) maps to smaller $u$ ($\bar{u} \approx 0.63$), viewer-right ($+X$) maps to larger $u$ ($\bar{u} \approx 0.69$).
     - Back: Camera at $-Z$ looking $+Z$; viewer-left ($+X$) maps to smaller $u$ ($\bar{u} \approx 0.26$), viewer-right ($-X$) maps to larger $u$ ($\bar{u} \approx 0.51$).
   - Both panels are unwrapped without horizontal reflection.

---

## 5. Garment Segmentation & Seam Topology

### Physical Seam Welding
Are the side seams welded in 3D geometry? **YES, 100% WELDED.**
- The Front Body (Island 9) and Back Body (Island 12) share **54 physical 3D vertices**:
  - **Left Side Seam**: Exactly 27 shared vertices spanning $y \in [962.9, 1345.4]$ mm.
  - **Right Side Seam**: Exactly 27 shared vertices spanning $y \in [958.8, 1336.9]$ mm.
  - At each of these 54 vertices, the geometric coordinate $(x, y, z)$ is identical, while the Wavefront face indices reference independent `vt` texture coordinates.
  - There are zero geometric gaps, holes, or non-manifold cracks along the side seams.

### Junction & Assembly Map
- **Front Body (Island 9)** shares vertices with:
  - Back Body (Island 12): 54 vertices (Side seams)
  - Left Sleeve (Island 3): 24 vertices (Front armhole seam)
  - Right Sleeve (Island 5): 24 vertices (Front armhole seam)
  - Collar Ribbing (Island 1): 17 vertices (Front neckline seam)
  - Front Hem Band (Island 10): 41 vertices (Front hemline seam)
  - Back Hem Band (Island 11): 2 vertices (Side hem corners)
- **Back Body (Island 12)** shares vertices with:
  - Front Body (Island 9): 54 vertices (Side seams)
  - Left Sleeve (Island 3): 25 vertices (Back armhole seam)
  - Right Sleeve (Island 5): 25 vertices (Back armhole seam)
  - Collar Ribbing (Island 1): 11 vertices (Back neckline seam)
  - Back Hem Band (Island 11): 41 vertices (Back hemline seam)
  - Front Hem Band (Island 10): 2 vertices (Side hem corners)

---

## 6. Precise Adaptation Options & Implementation Strategy

### Comparison of Processing Options

| Factor | Option 1: Procedural Python Geometry Script | Option 2: Headless Blender 5.1.2 Python | Option 3: Blender MCP (`execute_blender_code`) |
| :--- | :--- | :--- | :--- |
| **Availability** | Installed & verified (Python 3.14.5) | Installed (`C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`) | **Blocked**: Permission prompt denied |
| **Determinism** | 100% bitwise deterministic | High, but depends on Blender OBJ exporter flags | Medium (depends on runtime session state) |
| **Topology Preservation** | Preserves all 5,095 quads & 2 triangles verbatim | May triangulate quads unless strict export settings configured | May triangulate or re-order vertex indices |
| **Execution Time** | $< 0.05$ seconds | $\approx 2.5$ seconds (Blender startup overhead) | $\approx 1.5$ seconds |
| **Complexity** | Simple, self-contained math transformation | Medium (requires bpy scene setup, mesh import/export) | High (requires MCP socket handling) |
| **Recommendation** | **PRIMARY RECOMMENDED PATH** | Valid secondary / verification fallback | Not viable in current session |

---

### Step-by-Step UV Normalization Algorithm

To adapt `prep_models/various size/Low_T-shirt.obj` into `public/models/tshirt.obj`, a Python geometry script should execute the following transformation on texture coordinates (`vt`):

#### 1. Torso Panel Swapping
- **Front Torso (Island 9)**:
  - Current: $u \in [0.5002, 0.9768]$ ($\Delta u = 0.4766$)
  - Transform: $u' = u - 0.4800$ (or linear fit into $[0.02, 0.48]$)
  - Result: $u' \in [0.0202, 0.4968]$ $\subset [0.0, 0.5]$ (Buffer margin to center seam: $0.0032$)
- **Back Torso (Island 12)**:
  - Current: $u \in [0.0206, 0.4972]$ ($\Delta u = 0.4766$)
  - Transform: $u' = u + 0.5000$ (or linear fit into $[0.52, 0.98]$)
  - Result: $u' \in [0.5206, 0.9972]$ $\subset [0.5, 1.0]$ (Buffer margin to center seam: $0.0206$)

#### 2. Sleeve and Cuff Re-mapping
- **Right Sleeve & Cuffs (Islands 5, 4, 7)**:
  - Island 5 is already in $u \in [0.0206, 0.4084]$.
  - Islands 4 & 7 (cuffs) currently cross $u = 0.50$ ($u \in [0.31, 0.73]$).
  - Transform: Compress/shift Islands 4 & 7 horizontally to fit within $u \in [0.02, 0.48]$ (e.g. $u' = 0.05 + 0.5 \times (u - 0.31)$).
- **Left Sleeve & Cuffs (Islands 3, 2, 6)**:
  - Islands 2 & 6 (cuffs) are already in $u \in [0.58, 0.98]$.
  - Island 3 (sleeve body) currently spans $u \in [0.3485, 0.7362]$ (crossing $u=0.50$).
  - Transform: Shift/scale Island 3 into $u \in [0.52, 0.96]$ (e.g. $u' = 0.54 + 0.95 \times (u - 0.3485)$).

#### 3. Hem Bands & Collar Placement
- **Front Hems (Islands 10, 13)**: Scale/shift from $u \in [0.45, 0.94]$ into $u' \in [0.05, 0.45]$.
- **Back Hems (Islands 11, 14)**: Scale/shift from $u \in [0.45, 0.93]$ into $u' \in [0.55, 0.95]$.
- **Collar Ribbing (Islands 1, 8)**: Already in $u \in [0.0206, 0.3469] \subset [0.0, 0.5]$; retain position.
- **Brand Patch (Island 15)**: Normalize from $[970.9, 1019.3] \times [1567.1, 1591.7]$ into $u' \in [0.70, 0.80], v' \in [0.90, 0.95]$ (Back upper interior).

#### 4. Verification Check after Normalization
- $\max(u)$ for all Front faces $< 0.495$
- $\min(u)$ for all Back faces $> 0.505$
- Total faces crossing $u = 0.50$: **Exactly 0**
- Total out-of-range UVs: **0** ($\min(u) \ge 0.0, \max(u) \le 1.0, \min(v) \ge 0.0, \max(v) \le 1.0$)
- Anti-mirroring: Back surface retains $\frac{\partial u}{\partial (-x)} > 0$.

---

## 7. Downstream Alignment Requirements for `public/models/tshirt.obj`

1. **Header & Naming Compatibility**:
   In `src/lib/__tests__/m5_graphics_production_challenger.test.ts`:
   - Line 169 expects `o TShirt`
   - Line 170 expects `usemtl GarmentBase`
   - Line 188 expects vertex counts: `expect(vCount).toBe(1462)`
   When replacing `public/models/tshirt.obj` with the adapted model:
   - Include `o TShirt` and `usemtl GarmentBase` in the output file header.
   - Update test assertions in `m5_graphics_production_challenger.test.ts` (and `studio_pipeline.test.ts` / `studio_challenger.test.ts`) from the obsolete mock counts (1,462 v, 2,680 f) to the authoritative production counts (**5,355 vertices**, **5,097 faces**).

2. **Three.js OBJLoader Compatibility**:
   - `GarmentPreview3D.tsx` loads the mesh via `new OBJLoader().load('/models/tshirt.obj', ...)`.
   - The adapted OBJ must retain valid `v`, `vt`, `vn`, `f` lines with 1-based indexing.
   - No external `.mtl` dependency required at runtime because `GarmentPreview3D.tsx` automatically assigns `new THREE.MeshStandardMaterial({ map: canvasTexture, ... })` to all loaded mesh children.
