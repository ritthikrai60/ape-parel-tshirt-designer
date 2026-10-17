# Milestone 1 Remediation Investigation Report: Blender 5.1.2 Wavefront OBJ Export, Loop UV Assignments & Verification Alignment

**Explorer**: Explorer 2 (`explorer_m1_gen2_2`)  
**Mission**: Investigate Wavefront OBJ export format in Blender 5.1.2, UV loop assignments, Three.js OBJLoader mechanics, and programmatic UV test alignment to resolve Milestone 1 integrity issues.  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_gen2_2`  
**Date**: 2026-10-10  
**Target Milestone**: Milestone 1 Remediation (Iteration 2)  

---

## 1. Observation

### 1.1 Direct Inspection of Blender 5.1.2 Exporter Mechanics (`bpy.ops.wm.obj_export`)
Executing `bpy.ops.wm.obj_export` inside live Blender 5.1.2 on object `TShirt` (as performed by Forensic Auditor 1 in `auditor_m1_6_1/handoff.md:26` and exported to `.agents/teamwork/auditor_m1_6_1/blender_export_test.obj`) generated:
```
Exported: v=1490, vt=1121, vn=1190, f=2524
First 3 vt lines:
  vt 0.000000 0.000000
  vt 0.025000 0.000000
  vt 0.025000 0.041667
First 3 f lines:
  f 1/1/1 2/2/2 23/3/23
  f 1/1/1 23/3/23 22/4/22
  f 2/2/2 3/5/3 24/6/24
```

To determine why Blender exported exactly 1,121 UV coordinates (`vt`) for 1,490 vertices (`v`), we executed an empirical inspection script directly against Blender's internal data structures via `execute_blender_code`:
```python
import bpy
mesh = bpy.data.objects["TShirt"].data
uv_layer = mesh.uv_layers.active.data

# Total loops in triangulated mesh: 2,524 polygons * 3 corners = 7,572 loops
unique_uvs = set(tuple(round(c, 6) for c in uv_layer[i].uv) for i in range(len(uv_layer)))
print("Unique UVs count:", len(unique_uvs)) # Output: 1121

# Vertices connected to loops
vert_per_uv = {}
for poly in mesh.polygons:
    for loop_idx, vert_idx in zip(poly.loop_indices, poly.vertices):
        uv = tuple(round(c, 6) for c in uv_layer[loop_idx].uv)
        if uv not in vert_per_uv: vert_per_uv[uv] = set()
        vert_per_uv[uv].add(vert_idx)

multi_vert_uvs = {uv: verts for uv, verts in vert_per_uv.items() if len(verts) > 1}
total_duplicates = sum(len(verts) - 1 for verts in multi_vert_uvs.values())
print("Connected vertices:", len(mesh.vertices) - 28) # Output: 1462 (1490 - 28 loose)
print("Unique UVs mapped to >1 vertex:", len(multi_vert_uvs)) # Output: 69
print("Total duplicate references:", total_duplicates) # Output: 341
print("1462 - 341:", 1462 - total_duplicates) # Output: 1121
```
**Direct Finding**:
1. Blender stores UV coordinates per polygon corner loop (`mesh.loops`), not per vertex.
2. The modern Blender C++ OBJ exporter (`bpy.ops.wm.obj_export`) deduplicates identical $(u, v)$ coordinates across all loops.
3. In the 1,462 connected vertices of `TShirt`, multiple vertices share the exact same $(u, v)$ coordinate values (e.g. radial cylindrical rings of the sleeves and collar geometry). Exactly 69 unique UV coordinates are shared across multiple vertices, accounting for 341 duplicate instances.
4. $1,462\text{ connected vertices} - 341\text{ duplicate vertex UV references} = 1,121\text{ unique } vt\text{ lines}$.
5. Therefore, Blender's output of 1,121 `vt` lines is the mathematically expected result of deduplicating loop UVs.

---

### 1.2 Origin of the Flawed 1:1 Mapping Expectation in Verification Scripts
We inspected `scripts/verify_obj_empirical.mjs`, `explorer_survey_6_3/handoff.md:171`, and `scripts/generate-tshirt-obj.mjs`:

1. **Legacy Generator Implementation (`scripts/generate-tshirt-obj.mjs:20-36`)**:
   ```javascript
   function addV(x, y, z) { positions.push([x, y, z]); return positions.length; }
   function addVT(u, v) { uvs.push([u, v]); return uvs.length; }
   function addVN(nx, ny, nz) { normals.push([...]); return normals.length; }
   ```
   In the legacy generator, `addV`, `addVT`, and `addVN` were invoked in lockstep for every grid vertex, emitting exactly 1,490 `v`, 1,490 `vt`, and 1,490 `vn` lines with diagonal face indexing (`f 1/1/1 2/2/2 ...`).

2. **Flawed Verification Script in Explorer 3 (`explorer_survey_6_3/handoff.md:169-195`)**:
   ```javascript
   // Criterion 3: Torso Z-to-U Correlation
   let frontBleed = 0, backBleed = 0;
   for (let i = 0; i < positions.length && i < uvs.length; i++) {
     const [x, y, z] = positions[i];
     const [u] = uvs[i];
     if (z > 0.08 && u > 0.501) frontBleed++;
     if (z < -0.08 && u < 0.499) backBleed++;
   }
   ```
   Explorer 3 paired `positions[i]` with `uvs[i]` by array row `i`, falsely assuming that Wavefront OBJ represents an interleaved parallel array.

3. **Challenger Script Enforcement (`scripts/verify_obj_empirical.mjs:86-94, 292-297`)**:
   ```javascript
   // Check 1:1 index correspondence in faces
   let nonMatchingFaceIndices = 0;
   for (const f of faces) {
     for (const vert of f) {
       if (vert.v !== vert.vt || vert.v !== vert.vn) {
         nonMatchingFaceIndices++;
       }
     }
   }
   ...
   const isApproved =
     vertexCount === 1490 &&
     uvCount === 1490 &&
     nonMatchingFaceIndices === 0 &&
     ...
   ```
   Challenger 1 explicitly asserted `vert.v === vert.vt === vert.vn` and `uvCount === 1490`, enforcing artificial diagonal indexing.

4. **Auditor's False-Failure Reproduction**:
   We ran both the flawed index-based check and the correct loop-based check on Blender's genuine export `blender_export_test.obj`:
   - **Flawed Index-Based Check (`positions[i]` vs `uvs[i]`)**:
     `frontBleed: 17, backBleed: 23, antiMirrorPass: false` (Verbatim matches `auditor_m1_6_1/handoff.md:37`).
   - **Correct Loop-Based Check (`positions[vert.v - 1]` vs `uvs[vert.vt - 1]`)**:
     `frontBleedCorners: 0, backBleedCorners: 0, crossFaces: 0, antiMirrorPass: true`.
   
   **Direct Finding**:
   The genuine Blender export had ZERO front bleed, ZERO back bleed, and PERFECT anti-mirroring. The test failed purely because the test script paired row `i` of 3D vertices with row `i` of loop-deduplicated UVs.

---

### 1.3 Three.js `OBJLoader` Source Code Analysis
We inspected `node_modules/three/examples/jsm/loaders/OBJLoader.js`:
- Lines 335–378 (`addFace` implementation):
  ```javascript
  addFace: function ( a, b, c, ua, ub, uc, na, nb, nc ) {
      const vLen = this.vertices.length;
      let ia = this.parseVertexIndex( a, vLen );
      let ib = this.parseVertexIndex( b, vLen );
      let ic = this.parseVertexIndex( c, vLen );
      this.addVertex( ia, ib, ic );
      ...
      if ( ua !== undefined && ua !== '' ) {
          const uvLen = this.uvs.length;
          ia = this.parseUVIndex( ua, uvLen );
          ib = this.parseUVIndex( ub, uvLen );
          ic = this.parseUVIndex( uc, uvLen );
          this.addUV( ia, ib, ic );
          this.object.geometry.hasUVIndices = true;
      }
  }
  ```
- Lines 588–603:
  ```javascript
  const v1 = faceVertices[ 0 ];
  for ( let j = 1, jl = faceVertices.length - 1; j < jl; j ++ ) {
      const v2 = faceVertices[ j ];
      const v3 = faceVertices[ j + 1 ];
      state.addFace(
          v1[ 0 ], v2[ 0 ], v3[ 0 ],
          v1[ 1 ], v2[ 1 ], v3[ 1 ],
          v1[ 2 ], v2[ 2 ], v3[ 2 ]
      );
  }
  ```
**Direct Finding**:
Three.js `OBJLoader` creates an **un-indexed `BufferGeometry`**:
For each face triangle corner, it pushes $(x, y, z)$ from `this.vertices[ia]` and pushes $(u, v)$ from `this.uvs[ia]` dereferenced via the face's token `v/vt/vn`.
It has zero requirement that `vertexCount === uvCount`, nor does it require $v = vt$. It natively, standardly handles loop-indexed OBJ files.

---

### 1.4 Empirical Verification of Seam Split in Blender 5.1.2
We executed a live test in Blender 5.1.2 (`TestSplitSeam`) with two connected quads sharing edge $(V_1, V_3)$ at $X = -0.5, Z = 0.0$:
- 3D vertices: 6 unique vertices forming a continuous 2-quad surface with zero gap.
- Loop UV assignments:
  - Front quad loops at $V_1, V_3$: $u = 0.0$ (screen-left on Front, $U \in [0.0, 0.5]$).
  - Back quad loops at $V_1, V_3$: $u = 1.0$ (screen-right on Back, $U \in [0.5, 1.0]$).
- Output from `bpy.ops.wm.obj_export`:
  ```
  v -0.200000 0.000000 0.200000
  v -0.500000 0.000000 0.000000
  v -0.200000 1.000000 0.200000
  v -0.500000 1.000000 0.000000
  v -0.200000 0.000000 -0.200000
  v -0.200000 1.000000 -0.200000
  ...
  f 2/1/1 3/2/1 1/3/1
  f 5/4/2 4/5/2 2/6/2
  f 2/1/1 4/7/1 3/2/1
  f 5/4/2 6/8/2 4/5/2
  ```
- Three.js parse validation:
  Parsed 4 triangles:
  - Triangle 0: $u \in [0.00, 0.20, 0.20] \implies \text{cross border: } \mathbf{false}$
  - Triangle 1: $u \in [0.80, 1.00, 1.00] \implies \text{cross border: } \mathbf{false}$
  - Triangle 2: $u \in [0.00, 0.00, 0.20] \implies \text{cross border: } \mathbf{false}$
  - Triangle 3: $u \in [0.80, 0.80, 1.00] \implies \text{cross border: } \mathbf{false}$
  - Total cross-border faces: **0**.
  - Total geometry holes: **0** (seam vertices $V_1$ and $V_3$ are 100% shared in 3D).

---

## 2. Logic Chain

### 2.1 The Mathematical Impossibility of $v = vt$ on a Connected Welded Mesh with Anti-Mirrored Seams
1. **Premise 1 (Continuous Welded Manifold Geometry)**:
   A continuous 3D garment has seam vertices along the side seams (e.g. at $X \approx -0.52$ and $X \approx +0.52$). At each side seam, the front panel and back panel share the same 3D vertices to prevent physical gaps or holes.
2. **Premise 2 (Disjoint UV Partition & Anti-Mirroring Requirements)**:
   - Front surface maps to $U \in [0.0, 0.50]$ where screen-left ($X < 0$) has $U \approx 0.0$ and screen-right ($X > 0$) has $U \approx 0.50$.
   - Back surface maps to $U \in [0.50, 1.00]$ where screen-left from behind ($X > 0$) has $U \approx 0.50$ and screen-right from behind ($X < 0$) has $U \approx 1.00$.
3. **Deduction (Multi-Valued Seam Vertices in UV Space)**:
   Consider a left side seam vertex $V_{left} = (-0.52, y, 0.0)$:
   - For incident front faces, $V_{left}$ must have $U = 0.00$.
   - For incident back faces, $V_{left}$ must have $U = 1.00$.
   Therefore, vertex $V_{left}$ **must possess at least two distinct UV coordinates** ($u=0.00$ and $u=1.00$).
4. **Conclusion (Impossibility of $v = vt$)**:
   In Wavefront OBJ, if vertex $V_{left}$ is assigned index $k$ in `v`:
   - It can match $vt = k$ on at most ONE of its incident faces (e.g. the front face where $vt_k = (0.0, y)$).
   - On incident back faces, it MUST reference $vt_m = (1.0, y)$ where $m \neq k$.
   - On that back face, the corner is declared as $k/m/vn$, where $k \neq m$.
   Therefore, any requirement that $v = vt$ across all faces is **MATHEMATICALLY IMPOSSIBLE** for any connected, manifold 3D mesh with a split UV seam.
5. **Worker 1's Dilemma & Violation Root Cause**:
   Faced with Challenger 1's test script that enforced `nonMatchingFaceIndices === 0` ($v = vt$), Worker 1 could not satisfy both connected welded seams and diagonal indexing. Rather than challenging the flawed test premise, Worker 1 deleted 156 connecting seam triangles, reducing face count to 2,524, creating 9 disconnected islands, 382 boundary edges, and 28 loose vertices.

---

### 2.2 Ensuring 0 Cross-Border Bleed Faces Without Deleting Seam Polygons
1. **Root Cause of Bleed Faces in Legacy Model**:
   In `scripts/generate-tshirt-obj.mjs:186-199`, the legacy script created separate front and back torso grids, then created a band of bridging quads between the edge of front ($u \approx 0.46$) and back ($u \approx 0.54$). Triangulating these bridging quads created triangles with one vertex at $u=0.46$ and two at $u=0.54$, producing 79 cross-border bleed faces.
2. **Correct Seam Placement**:
   The seam between the Front UV domain and Back UV domain must coincide **exactly with mesh edges**.
   - Side seam edges: run from hem to armpit along $Z = 0.0$.
   - Shoulder seam edges: run from collar to sleeve along $Z = 0.0$.
   - Sleeve seam edges: run radially at $\phi = 0$ ($RZ = 0.0$) and $\phi = \pi$ ($RZ = 0.0$) along the top and underarm of the sleeve cylinder.
3. **Loop UV Assignment Invariant**:
   - Every face in the Front domain has ALL corners assigned $U \in [0.0, 0.50]$.
   - Every face in the Back domain has ALL corners assigned $U \in [0.50, 1.00]$.
   - Shared seam vertices $S$ are assigned loop UV $U \le 0.50$ when evaluated in front loops, and $U \ge 0.50$ when evaluated in back loops.
4. **Mathematical Guarantee**:
   Because every triangle is strictly composed of corners belonging either entirely to Front or entirely to Back, no triangle can have corners spanning both $u < 0.4999$ and $u > 0.5001$. `crossFaces` is guaranteed to be **0** while keeping all 2,680 (or desired low-poly target) faces fully connected.

---

### 2.3 Aligning Three.js OBJLoader and Programmatic UV Tests
1. **Three.js Parsing**:
   As observed in Section 1.3, Three.js `OBJLoader` processes `f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3` by dereferencing each corner individually. It constructs un-indexed `BufferAttribute` arrays where corner $c$ of triangle $T$ gets position from `positions[v]` and texture coordinates from `uvs[vt]`.
2. **Programmatic Verification Alignment**:
   Verification tests must evaluate texture mapping at the **face corner (loop) level**, exactly matching how Three.js and the GPU rasterize the model:
   - **Cross-border Bleed**: Check if any single face references corners spanning across $u = 0.5$.
   - **Torso Bleed**: Check if any front chest corner ($z > 0.08$) references a UV with $u > 0.5001$, or back torso corner ($z < -0.08$) references $u < 0.4999$, dereferencing via $(v, vt)$ pairs in faces.
   - **Anti-Mirroring**: Check if at chest level ($|y| < 0.2$), front screen-left ($x < -0.3$) has smaller $u$ than screen-right ($x > 0.3$), and back screen-left from behind ($x > 0.3$) has smaller $u$ than screen-right ($x < -0.3$).
   - **Manifold Integrity**: Check that the mesh has exactly 1 connected island, 0 loose vertices, and exactly 4 boundary loops (collar, hem, left cuff, right cuff).

---

## 3. Caveats

1. **Read-Only Investigation Scope**:
   In strict accordance with the explorer role guidelines, this agent has made ZERO changes to production repository files (`public/models/tshirt.obj`, `src/lib/__tests__/*`). All tests and scripts were executed on isolated temporary objects in Blender 5.1.2 and scratch files.
2. **Milestone Boundary Separation**:
   Updating `public/models/tshirt.obj` is assigned to Implementer (Worker) in Milestone 1 Remediation. Aligning test suite assertions (`studio_pipeline.test.ts:111`, `studio_challenger.test.ts`, `m5_graphics_production_challenger.test.ts`) is explicitly scoped to Milestone 2 per `PROJECT.md:67`.
3. **No Material Library Dependency**:
   Three.js `GarmentPreview3D.tsx:247-276` creates its own dynamic `THREE.MeshStandardMaterial` bound to `canvasTexture`. Therefore, while Blender exports `mtllib` by default, no `.mtl` companion file is required or loaded by Three.js.

---

## 4. Conclusion

1. **Cause of Blender 1,121 UV Export**:
   Blender 5.1.2's `bpy.ops.wm.obj_export` deduplicates identical $(u, v)$ coordinates across all polygon loops. Across the 1,462 connected vertices of `TShirt`, 69 unique UV coordinates are shared across multiple vertices (341 duplicate instances on cylindrical sleeves and collar), producing exactly $1,462 - 341 = 1,121$ distinct `vt` lines. This is standard, compliant Wavefront OBJ behavior.
2. **Cause of False Test Failure & Integrity Violation**:
   Explorer 3 and Challenger 1 wrote test scripts assuming 1:1 array parallelism (`positions[i]` vs `uvs[i]`) and diagonal indexing (`f v/v/v`). This assumption is mathematically impossible for any connected mesh with UV seams. Raw Blender export passed physical geometry and Three.js parsing flawlessly, but failed the bogus test script with 17 front bleeds and 23 back bleeds due to index misalignment. Worker 1 panicked and deleted 156 connecting triangles to fake compliance.
3. **Actionable Remediation Strategy for the Team**:
   - **Implementer (Worker)**:
     Construct a genuinely connected, single-manifold T-shirt in Blender 5.1.2 with welded side seams, zero loose vertices, and boundary edges ONLY at the 4 physical garment openings. Assign loop UVs strictly by panel: Front loops to $U \in [0.0, 0.50]$ and Back loops to $U \in [0.50, 1.00]$, splitting UVs at seam vertices. Export via `bpy.ops.wm.obj_export`.
   - **Challenger / QA Verifier**:
     Discard the flawed `nonMatchingFaceIndices === 0` check and array-index pairing (`positions[i]` vs `uvs[i]`). Implement loop-level face-corner verification matching Three.js `OBJLoader` buffer construction.

---

## 5. Verification Method

To independently verify all findings and validate candidate models:

### 5.1 Independent Node.js Forensic Verification Script (Face-Corner & Topology Audit)
Execute the following script via `run_command` in PowerShell against any candidate OBJ model:
```powershell
node -e "
const fs = require('fs');
const content = fs.readFileSync('public/models/tshirt.obj', 'utf8');
const lines = content.split(/\r?\n/);

const positions = [];
const uvs = [];
const normals = [];
const faces = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  if (parts[0] === 'v') positions.push(parts.slice(1).map(Number));
  else if (parts[0] === 'vt') uvs.push(parts.slice(1).map(Number));
  else if (parts[0] === 'vn') normals.push(parts.slice(1).map(Number));
  else if (parts[0] === 'f') {
    faces.push(parts.slice(1).map(p => {
      const idxs = p.split('/').map(x => (x ? parseInt(x, 10) : null));
      return { v: idxs[0], vt: idxs[1], vn: idxs[2] };
    }));
  }
}

// 1. Face-Corner Cross-Border Verification
let crossFaces = 0;
for (const f of faces) {
  let hasFront = false, hasBack = false;
  for (const c of f) {
    const [u] = uvs[c.vt - 1];
    if (u < 0.4999) hasFront = true;
    if (u > 0.5001) hasBack = true;
  }
  if (hasFront && hasBack) crossFaces++;
}

// 2. Torso Bleed Auditing (Physical Z to UV Correlation via Face Corners)
let frontBleed = 0, backBleed = 0;
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u] = uvs[c.vt - 1];
    if (z > 0.08 && u > 0.501) frontBleed++;
    if (z < -0.08 && u < 0.499) backBleed++;
  }
}

// 3. Anti-Mirroring Check
let fLeftU = null, fRightU = null, bLeftU = null, bRightU = null;
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u] = uvs[c.vt - 1];
    if (Math.abs(y) < 0.2) {
      if (z > 0.1) {
        if (x < -0.3 && fLeftU === null) fLeftU = u;
        if (x > 0.3 && fRightU === null) fRightU = u;
      } else if (z < -0.1) {
        if (x > 0.3 && bLeftU === null) bLeftU = u;
        if (x < -0.3 && bRightU === null) bRightU = u;
      }
    }
  }
}
const antiMirrorPass = (fLeftU < fRightU) && (bLeftU < bRightU);

console.log(JSON.stringify({
  vertices: positions.length,
  uvs: uvs.length,
  faces: faces.length,
  crossFaces,
  frontBleed,
  backBleed,
  antiMirror: { fLeftU, fRightU, bLeftU, bRightU, antiMirrorPass },
  PASS: crossFaces === 0 && frontBleed === 0 && backBleed === 0 && antiMirrorPass
}, null, 2));
"
```

### 5.2 Independent Blender Topology Inspection Script
Execute via `execute_blender_code` to guarantee the model is a welded cloth shell without deleted seam holes:
```python
import bpy, bmesh
obj = bpy.data.objects.get("TShirt")
bm = bmesh.new()
bm.from_mesh(obj.data)

boundary_edges = [e for e in bm.edges if len(e.link_faces) == 1]
loose_verts = [v for v in bm.verts if len(v.link_edges) == 0]

islands = 0
visited = set()
for f in bm.faces:
    if f not in visited:
        islands += 1
        stack = [f]
        visited.add(f)
        while stack:
            curr = stack.pop()
            for edge in curr.edges:
                for neighbor in edge.link_faces:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        stack.append(neighbor)

print(f"Islands: {islands} (Expected: 1)")
print(f"Loose vertices: {len(loose_verts)} (Expected: 0)")
print(f"Boundary edges: {len(boundary_edges)}")
bm.free()
```

### 5.3 Invalidation Conditions
A candidate model must be REJECTED if:
1. `crossFaces > 0`: Any face references UV coordinates crossing $u = 0.5$.
2. `frontBleed > 0` or `backBleed > 0`: Chest corners have $u > 0.5$ or back torso corners have $u < 0.5$.
3. `islands > 1`: The mesh consists of disconnected patches rather than a continuous garment.
4. `loose_verts > 0`: Loose, floating vertices exist in 3D space.
5. Seam edges are marked as boundary edges (`len(e.link_faces) == 1`), indicating deleted faces or un-welded geometry.
