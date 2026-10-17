# Milestone 1 Formal Handoff Report: UV Bleeding & Seam Stress Testing

**Sender**: Challenger 1 (`challenger_m1_8_1`)  
**Recipient**: Orchestrator (`d4e3a370-bcad-4e87-a99a-a4f08e1d0636`)  
**Target Asset**: `public/models/tshirt.obj`  
**Milestone**: Milestone 1 (Model Adaptation, UV Normalization & OBJ Export)  
**Structured Verdict**: **FAIL**

---

## 1. Observation

Direct empirical observations from executing `scripts/test_challenger_m1_8_1.mjs` and `scripts/stress_test_uv_seams_m1.py` against `public/models/tshirt.obj`:

### 1.1 Asset Headers & Geometric Topology
- Object tag: `o TShirt`
- Material tag: `usemtl GarmentBase`
- Vertex count (`v`): $5,355$ vertices
- UV coordinate count (`vt`): $5,761$ texture coordinates
- Normal vector count (`vn`): $5,355$ normals
- Face count (`f`): Exactly $10,192$ faces, all having arity 3 (triangles).

### 1.2 Boundary & Bleed Tests (Suite 1)
- Triangles spanning across $u = 0.500000$ boundary ($\min(u) < 0.500000 \land \max(u) > 0.500000$): **0** triangles.
- Face allocation:
  - Front partition faces ($u \le 0.500000$): $5,234$ faces ($51.35\%$).
  - Back partition faces ($u \ge 0.500000$): $4,958$ faces ($48.65\%$).
  - Total: $5,234 + 4,958 = 10,192$ faces.
- Bleed Margins:
  - Front partition $\max(u) = 0.498000$ (Allowed threshold: $\le 0.500000$).
  - Back partition $\min(u) = 0.502000$ (Allowed threshold: $\ge 0.500000$).
- Minimum Distance to Seam ($u = 0.500000$):
  - Front minimum clearance: $0.002000$ UV units ($2.048$ pixels on $1024\times1024$).
  - Back minimum clearance: $0.002000$ UV units ($2.048$ pixels on $1024\times1024$).
  - Total buffer gap width: $0.004000$ UV units ($4.096$ pixels safety gutter).

### 1.3 Geometric Normal vs UV Partition Correlation (Suite 2)
Command: `node scripts/test_challenger_m1_8_1.mjs`
Tool Output:
```
--- Test Suite 2: Geometric Normal vs UV Partition Correlation ---
[2.1] Front Normal Faces (normal Z > 0.1): 4780
      Violations (max(u) > 0.50): 889 (18.60%)
      Compliance: 81.40% (Strict 100% required) -> FAIL
[2.2] Back Normal Faces (normal Z < -0.1): 5014
      Violations (min(u) < 0.50): 1194 (23.81%)
      Compliance: 76.19% (Strict 100% required) -> FAIL
[2.3] Side Seam Edge Transitions (|normal Z| <= 0.10): 398 faces
      Front partition: 149
      Back partition:  249
      Crossing seam:   0 -> PASS
```

Island Breakdown for Violations:
- Front-facing triangles ($\text{Normal}_Z > +0.10$) mapped to Back partition ($u \ge 0.502000$): **889 faces**
  - Island 2 (Back Torso Body ribcage curvature): 90 faces
  - Island 4 (Left Sleeve Cuff 1): 60 faces
  - Island 5 (Left Sleeve Main): 517 faces
  - Island 8 (Left Sleeve Cuff 2): 67 faces
  - Island 14 (Back Hem Inner): 155 faces
- Back-facing triangles ($\text{Normal}_Z < -0.10$) mapped to Front partition ($u \le 0.498000$): **1,194 faces**
  - Island 1 (Front Torso Body ribcage curvature): 90 faces
  - Island 3 (Collar Outer): 61 faces
  - Island 6 (Right Sleeve Cuff 1): 64 faces
  - Island 7 (Right Sleeve Main): 624 faces
  - Island 9 (Right Sleeve Cuff 2): 64 faces
  - Island 10 (Collar Inner): 132 faces
  - Island 13 (Front Hem Inner): 159 faces

### 1.4 Seam Welding Verification (Suite 3)
- Front Torso Body (Island 1, faces 1..3008) and Back Torso Body (Island 2, faces 3009..6132) share exactly **54 vertices** in their geometric definition:
  - Left flank ($X < 0$): 27 vertices (`v 1` to `v 138`, $Y \in [-0.8916, 0.2829]$).
  - Right flank ($X > 0$): 27 vertices (`v 2` to `v 139`, $Y \in [-0.8916, 0.2829]$).
- Coincident un-welded duplicate vertex pairs ($d < 10^{-5}\text{ m}$): **0 pairs**.
- UV Seam Decoupling: Shared 3D vertex indices reference distinct, disjoint `vt` indices:
  - Front face loops reference `vt` in $[0.002, 0.498]$.
  - Back face loops reference `vt` in $[0.502, 0.998]$.
  - Shared `vt` indices across seam: **0**.

---

## 2. Logic Chain

1. **Premise 1 (Prompt Contract)**: The orchestrator's dispatch explicitly required:
   - "For all front faces (normal Z > 0.1), assert 100% have u in [0.0, 0.5]."
   - "For all back faces (normal Z < -0.1), assert 100% have u in [0.5, 1.0]."
2. **Observation Step**: In `public/models/tshirt.obj`, face normal calculation ($N = \frac{(p_1 - p_0) \times (p_2 - p_0)}{\|(p_1 - p_0) \times (p_2 - p_0)\|}$) across all 10,192 triangles yields:
   - 4,780 faces with $\text{Normal}_Z > +0.10$. Among them, 889 faces ($18.60\%$) have $u \ge 0.502000$.
   - 5,014 faces with $\text{Normal}_Z < -0.10$. Among them, 1,194 faces ($23.81\%$) have $u \le 0.498000$.
3. **Topological Cause**: The source asset `prep_models/various size/Low_T-shirt.obj` unwrapped sleeves as cylindrical shells (Island 5 Left Sleeve, Island 7 Right Sleeve) and the collar as a single continuous ring (Islands 3 & 10). When adapting to 50/50 partition:
   - Island 5 (Left Sleeve) was assigned entirely to the Back partition ($u \in [0.5, 1.0]$). Consequently, the anterior half of the Left Sleeve faces forward ($\text{Normal}_Z > +0.10$) but is mapped to the Back UV space.
   - Island 7 (Right Sleeve) was assigned entirely to the Front partition ($u \in [0.0, 0.5]$). Consequently, the posterior half of the Right Sleeve faces backward ($\text{Normal}_Z < -0.10$) but is mapped to the Front UV space.
   - Islands 3 & 10 (Collar) were assigned entirely to the Front partition, meaning the posterior neck loop faces backwards but is mapped to the Front UV space.
4. **Conclusion Step**: Because 889 front-facing triangles and 1,194 back-facing triangles violate the asserted bounds, the strict 100% assertion does not hold. Therefore, by empirical rule, the verdict must be **FAIL**.

---

## 3. Caveats

- **Torso Chest & Back Customizer Alignment**: For the primary print zones (front chest $|X| \le 0.25, Y \in [-0.2, 0.4], Z > 0.15$ and upper back $|X| \le 0.25, Y \in [-0.2, 0.4], Z < -0.15$), 100% of the torso triangles map strictly into their respective partitions with verified anti-mirroring ($dU/dX > 0$) as confirmed by Challenger 2.
- **Contract Ambiguity**: If the project intended the 50/50 split to apply strictly at the *Topological Island* level (i.e. Front Torso in $[0, 0.5]$, Back Torso in $[0.5, 1.0]$, Right Sleeve in $[0, 0.5]$, Left Sleeve in $[0.5, 1.0]$) rather than per-triangle normal ray projection, this should be explicitly codified in `PROJECT.md`. However, under the verbatim prompt assertion ("assert 100% have u in [0.0, 0.5] for normal Z > 0.1"), it fails.

---

## 4. Conclusion

- **Structured Verdict**: **FAIL**
- **Actionable Remediation**:
  - **Option 1 (Topology Modification)**: Split the Left and Right sleeve UV islands along their apex seams so that anterior halves are placed in $[0.0, 0.5]$ and posterior halves in $[0.5, 1.0]$, and split the collar ring at the lateral neck points.
  - **Option 2 (Contract Clarification)**: If monolithic sleeve unwraps are an intentional architectural decision of the garment pattern, update the specification to exempt sleeves/collars from the geometric normal assertion and scope the 100% normal correlation assertion strictly to the Front and Back Torso panels.

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Execute Challenger 1 Test Suite**:
   ```powershell
   node scripts/test_challenger_m1_8_1.mjs
   ```
2. **Execute Python Verification Harness**:
   ```powershell
   & "C:\Users\ritth\AppData\Local\Programs\Python\Python314\python.exe" scripts/stress_test_uv_seams_m1.py
   ```
3. **Inspect Output Telemetry**:
   - Verify `scripts/challenger1_results.json`
   - Observe `frontViolations: 889`, `backViolations: 1194`, `crossingFaces: 0`, `totalSharedSeamVerts: 54`.
