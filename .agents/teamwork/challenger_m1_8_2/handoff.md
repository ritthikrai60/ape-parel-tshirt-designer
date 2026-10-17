# Handoff Report: Challenger 2 (Three.js WebGL & Anti-Mirroring Adversarial Tester)

- **Agent**: Challenger 2 (`challenger_m1_8_2`)
- **Recipient**: Orchestrator (`d4e3a370-bcad-4e87-a99a-a4f08e1d0636`)
- **Target File**: `public/models/tshirt.obj`
- **Milestone**: Milestone 1 (Model Adaptation, UV Normalization & OBJ Export)
- **Verdict**: **APPROVE**

---

## 1. Observation

Direct observations obtained by executing Three.js (v164) and Node test harnesses against `public/models/tshirt.obj`:

1. **File Properties & Headers**:
   - Path: `public/models/tshirt.obj`
   - Size: 913,359 bytes, 26,670 lines
   - Headers: line 3 `mtllib tshirt.mtl`, line 4 `o TShirt`, line 26670 `usemtl GarmentBase`
   - Wavefront elements: 5,355 geometric vertices (`v`), 5,761 texture coordinates (`vt`), 5,355 normals (`vn`), 10,192 triangular faces (`f`).

2. **Three.js OBJLoader Parsing & BufferAttributes**:
   - Command: `node scripts/adversarial_threejs_antimirror_gate.mjs`
   - Output:
     ```
     [PASS] T1_OBJLOADER_PARSE: Three.js OBJLoader parses public/models/tshirt.obj without throwing errors
     [PASS] T1_SINGLE_CHILD_MESH: OBJ contains exactly 1 child mesh with object tag "TShirt"
     [PASS] T1_BUFFER_GEOMETRY_EXISTS: Mesh contains a valid Three.js BufferGeometry instance
     [PASS] T1_VERTEX_POS_COUNT: Vertex positions count equals 10,192 * 3 = 30,576 buffer elements
     [PASS] T1_POS_BUFFER_ARRAY_LENGTH: Position buffer array length equals 30,576 * 3 = 91,728 float elements
     [PASS] T1_NORMAL_COUNT: Normal attribute count equals 30,576 elements (array length 91,728)
     [PASS] T1_UV_COUNT: UV attribute count equals 30,576 elements (array length 61,152)
     [PASS] T1_NO_NAN_OR_INF: Zero NaN or Inf values across all BufferAttributes (position, normal, uv)
     [PASS] T1_NORMALS_NON_ZERO: All vertex normals have valid non-zero length
     ```

3. **Centering, Bounding Box (Box3) & Shadow Floor Clearance**:
   - `geometry.boundingBox`:
     - Min: `[-0.950000, -0.891669, -0.428915]`
     - Max: `[0.950000, 0.891669, 0.428915]`
     - Center: `[0.000000, 0.000000, 0.000000]` (offset length: `0.0000e+0 <= 1e-4` tolerance)
     - Size: `[1.900000, 1.783338, 0.857830]`
     - Max dimension: `1.900000` units (diff from 1.90: `0.0000e+0 <= 1e-4` tolerance)
   - Simulated `GarmentPreview3D.tsx` normalization: center offset `0.0000e+0`, scale factor `1.000000` (identity displacement).
   - Shadow floor plane at $y = -1.10$: Hem lowest point $y = -0.891669$, clearance margin $+0.208331$ units ($> +0.20$ margin required).

4. **Anti-Mirroring & Probe Gradient**:
   - Front Chest Probes ($Z > 0.15, |X| \le 0.25$, across 5 height slices $Y \in [-0.10, 0.30]$):
     - Left ($X < -0.06$): avg $U = 0.1984$
     - Center ($|X| \le 0.05$): avg $U = 0.2563$
     - Right ($X > 0.06$): avg $U = 0.3125$
     - $U(\text{right}) > U(\text{left})$ passed on every slice ($\Delta U \approx +0.117$).
     - Max front chest probe $U = 0.3341 \le 0.50$.
   - Back Torso Probes ($Z < -0.15, |X| \le 0.25$, viewed from behind looking towards $+Z$):
     - Viewed-Left (world $X > 0.06$): avg $U = 0.6948$
     - Center ($|X| \le 0.05$): avg $U = 0.7508$
     - Viewed-Right (world $X < -0.06$): avg $U = 0.8102$
     - Monotonic increase from viewed-left to viewed-right passed on every slice ($\Delta U \approx +0.120$).
     - Min back torso probe $U = 0.6561 \ge 0.50$.

5. **Text Left-to-Right & Uprightness Simulation**:
   - Front Text Glyphs ($U = [0.18, 0.23, 0.28, 0.33]$) projected to camera at $(0, 0.1, 2.3)$:
     - Screen NDC X: `-0.2547 < -0.0887 < 0.0875 < 0.2351` (strictly left-to-right).
   - Back Text Glyphs ($U = [0.68, 0.73, 0.78, 0.83]$) projected to camera at $(0, 0.1, -2.3)$:
     - Screen NDC X: `-0.2752 < -0.0787 < 0.1125 < 0.2843` (strictly left-to-right).
   - Vertical Uprightness:
     - Front: Top $V = 0.3668$, Bottom $V = 0.2692$ ($\Delta V = +0.0976 > 0$).
     - Back: Top $V = 0.4852$, Bottom $V = 0.2662$ ($\Delta V = +0.2190 > 0$).
     - Text renders right-side up, non-inverted.

6. **UV Partition Boundaries & Polygon Area**:
   - Crossing faces across $U = 0.50$: exactly 0.
   - Degenerate 3D triangles (zero area): exactly 0.
   - All $U, V \in [0.0, 1.0]$.

---

## 2. Logic Chain

1. **Geometry Parsing & Integrity (Obs 1, 2)**:
   Three.js `OBJLoader` reads the 10,192 triangular faces, each referencing 3 vertices with `v/vt/vn` indices. This expands directly into unindexed `BufferAttribute` arrays with $10,192 \times 3 = 30,576$ elements for `position`, `normal`, and `uv`. Scans across all 30,576 elements found 0 NaN or infinite floats, and all vertex normals possess non-zero unit length ($\approx 1.0$). Therefore, the asset is structurally valid and directly ingestible by Three.js WebGL render pipelines without parsing warnings or GPU attribute crashes.

2. **Centering & Viewport Dimensions (Obs 3)**:
   `Box3` computation confirms the bounding box is centered at $(0.0, 0.0, 0.0)$ with exactly 0.0 offset. Max dimension $\max(1.900, 1.783, 0.858) = 1.900000$ units. When ingested by `GarmentPreview3D.tsx`, `obj.position.sub(center)` applies zero displacement and `scale = 1.9 / maxDim = 1.0`. The lowest hem point at $y = -0.891669$ leaves $+0.208331$ units of clearance above the shadow contact plane at $y = -1.10$. Therefore, the model will render centered in the viewport with no ground clipping or z-fighting.

3. **Anti-Mirroring & Orientation (Obs 4, 5)**:
   On the Front chest, viewer's left is $-X$ and viewer's right is $+X$; observed $U$ increases monotonically from $0.1984$ to $0.3125$ ($U(\text{right}) > U(\text{left})$). On the Back, when looking towards $+Z$, viewer's left is $+X$ and viewer's right is $-X$; observed $U$ increases monotonically from $0.6948$ to $0.8102$. NDC projection simulation confirms simulated glyph sequences render strictly left-to-right on screen for both viewpoints. Uprightness checks confirm $\Delta V > 0$ for $+Y$ displacement on both sides. Therefore, 2D designs and text placed on Front and Back canvases render upright and left-to-right without mirroring.

4. **Zero Seam Bleed (Obs 6)**:
   Audit of all 10,192 triangles confirms that pure front triangles have $U \le 0.4980$ (5,234 faces) and pure back triangles have $U \ge 0.5020$ (4,958 faces), with a safety margin of $0.004$ across $U = 0.50$ and exactly 0 crossing faces. Therefore, no cross-seam texture bleed or polygon tearing occurs.

---

## 3. Caveats

1. **Collar UV Island**: The collar/neck ribbing (Islands 5 & 6, 408 faces) forms a continuous loop around the neck ($Y \in [0.71, 0.89]$) and is mapped into Front partition $U \in [0.02, 0.35]$. Because the posterior half of the collar loop curves behind the neck ($Z < 0$), naive tests that test $Z < -0.02$ across the entire garment without bounding $Y < 0.60$ will flag collar faces as "back bleed". On the actual Back Torso ($Y < 0.60$), 100% of faces have $U \ge 0.50$.
2. **Sleeve UV Packing**: Left sleeve (Island 3) is packed in $U \in [0.55, 0.95]$ and right sleeve (Island 4) in $U \in [0.02, 0.41]$. They do not overlap with torso prints because they are separated vertically in $V$ ($V > 0.51$ for sleeves vs $V \in [0.15, 0.45]$ for torso prints).
3. **Legacy Test Alignment (Milestone 2)**: Legacy tests in `studio_challenger.test.ts` and `m5_graphics_production_challenger.test.ts` still expect legacy Generation 7 counts (1,462 vertices, 1,104 UVs) and must be aligned in Milestone 2 as specified in `PROJECT.md` Feature 5.

---

## 4. Conclusion

**APPROVE**: `public/models/tshirt.obj` satisfies all requirements of Milestone 1:
- Three.js OBJLoader parses cleanly without NaN/Inf attributes.
- Vertex count is exactly $10,192 \times 3 = 30,576$ buffer elements.
- Centering is $(0, 0, 0)$ within $1\times 10^{-4}$ tolerance.
- Max dimension is exactly $1.90$ units.
- Shadow clearance at $y = -1.10$ exceeds $+0.20$ margin ($+0.208331$).
- Anti-mirroring holds for Front ($U(\text{right}) > U(\text{left})$) and Back (viewed-left to viewed-right increases $U$).
- Text mapped to front and back renders upright and left-to-right without mirroring.
- Zero triangles cross $U = 0.50$.

---

## 5. Verification Method

To independently reproduce and verify this verdict, run:

```bash
# 1. Run the Three.js WebGL & Anti-Mirroring gate harness
node scripts/adversarial_threejs_antimirror_gate.mjs

# 2. Run the statistical NDC correlation and probe harness
node scripts/test_challenger_m1_8_2.mjs

# 3. Verify existing studio pipeline test suite
npx vitest run src/lib/__tests__/studio_pipeline.test.ts
```

**Invalidation conditions**:
- Any test in `scripts/adversarial_threejs_antimirror_gate.mjs` exits with non-zero code or reports `FAIL`.
- Bounding box center distance from origin exceeds $1\times 10^{-4}$.
- Max dimension differs from 1.90 by more than $1\times 10^{-4}$.
- Text glyph projection produces decreasing Screen X (mirroring) on either front or back.
