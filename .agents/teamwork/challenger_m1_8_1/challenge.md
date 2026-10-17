# Milestone 1 Adversarial Stress Test Report: UV Bleeding & Seam Integrity

**Target Asset**: `public/models/tshirt.obj`  
**Challenger Role**: Challenger 1 (UV Bleeding & Seam Stress Tester)  
**Execution Timestamp**: 2026-10-10T20:34:31Z  
**Test Harness**: `scripts/test_challenger_m1_8_1.mjs` & `scripts/stress_test_uv_seams_m1.py`  
**Verdict**: **FAIL**

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While the adapted `public/models/tshirt.obj` achieves 100% compliance on triangle partition bleeding (0 triangles cross the $u = 0.50$ seam, maintaining a positive $0.004000$ UV buffer gap) and verifies full 3D geometric welding along torso side seams (54 shared vertices, 0 un-welded duplicates), it **critically fails** the geometric normal-to-UV partition correlation assertion ($100\%$ required, observed $81.40\%$ for front and $76.19\%$ for back). 

Specifically:
- **889 front-facing triangles** ($\text{Normal}_Z > +0.10$) are mapped to the Back UV partition ($u \ge 0.502000$).
- **1,194 back-facing triangles** ($\text{Normal}_Z < -0.10$) are mapped to the Front UV partition ($u \le 0.498000$).
- Cause: The Left Sleeve (Island 5) and associated cuffs were assigned in their entirety to the Back UV space, the Right Sleeve (Island 7) and associated cuffs were assigned in their entirety to the Front UV space, the continuous Collar loop was assigned to the Front UV space, and side-seam ribcage curvature angles backwards/forwards across panels.

---

## Detailed Empirical Test Suites

### Suite 1: Boundary & Bleed Tests
- **Target Face Count**: 10,192 triangles.
- **Arity Verification**: 10,192 / 10,192 faces are triangles ($3$ vertices per face). (PASS)
- **Crossing Triangles**: Tested $\min(u) < 0.500000 \land \max(u) > 0.500000$ across all 10,192 faces. Exactly **0** triangles cross $u = 0.50$. (PASS)
  - Front partition faces ($u \le 0.50$): 5,234 faces ($51.35\%$).
  - Back partition faces ($u \ge 0.50$): 4,958 faces ($48.65\%$).
- **Zero Bleed Margin**:
  - Front partition $\max(u) = 0.498000$ (Allowed: $\le 0.500000$). Margin: $+0.002000$ UV units.
  - Back partition $\min(u) = 0.502000$ (Allowed: $\ge 0.500000$). Margin: $+0.002000$ UV units.
- **Minimum Clearance to Seam ($u = 0.50$)**:
  - Front clearance: $0.002000$ UV units ($2.048$ pixels on $1024\times1024$ texture).
  - Back clearance: $0.002000$ UV units ($2.048$ pixels on $1024\times1024$ texture).
  - Total buffer gap width: $0.004000$ UV units ($4.096$ pixels blank safety gutter).
- **Suite 1 Result**: **PASS**

---

### Suite 2: Geometric Normal vs UV Partition Correlation
- **Front Normal Faces ($\text{Normal}_Z > +0.10$)**:
  - Total qualifying faces: 4,780 faces.
  - Faces violating $u \in [0.0, 0.5]$ (i.e. $\max(u) > 0.50$): **889 faces** ($18.60\%$ violation rate).
  - Compliance rate: **81.40%** (Assertion required $100.0\%$). (FAIL)
  - Breakdown by Topological UV Island:
    - Island 2 (Back Torso Body): 90 faces (lateral ribcage curvature)
    - Island 4 (Left Sleeve Cuff 1): 60 faces
    - Island 5 (Left Sleeve Main): 517 faces
    - Island 8 (Left Sleeve Cuff 2): 67 faces
    - Island 14 (Back Hem Inner): 155 faces
- **Back Normal Faces ($\text{Normal}_Z < -0.10$)**:
  - Total qualifying faces: 5,014 faces.
  - Faces violating $u \in [0.5, 1.0]$ (i.e. $\min(u) < 0.50$): **1,194 faces** ($23.81\%$ violation rate).
  - Compliance rate: **76.19%** (Assertion required $100.0\%$). (FAIL)
  - Breakdown by Topological UV Island:
    - Island 1 (Front Torso Body): 90 faces (lateral ribcage curvature)
    - Island 3 (Collar Outer): 61 faces
    - Island 6 (Right Sleeve Cuff 1): 64 faces
    - Island 7 (Right Sleeve Main): 624 faces
    - Island 9 (Right Sleeve Cuff 2): 64 faces
    - Island 10 (Collar Inner): 132 faces
    - Island 13 (Front Hem Inner): 159 faces
- **Side Seam Edge Transitions ($|\text{Normal}_Z| \le 0.10$)**:
  - Total transition faces: 398 faces.
  - Front partition allocation: 149 faces.
  - Back partition allocation: 249 faces.
  - Crossing faces: **0** faces (clean topological split). (PASS)
- **Suite 2 Result**: **FAIL**

---

### Suite 3: Seam Welding Verification
- **Torso Side Seam Shared Vertices**:
  - Front Torso Body (Island 1, 3,008 faces) and Back Torso Body (Island 2, 3,124 faces).
  - Shared 3D vertex indices in geometric definition: **54 vertices** ($100\%$ physically welded). (PASS)
  - Left Seam vertices ($X < 0$): **27 vertices** (IDs: `v 1` to `v 138` evenly spaced along left flank from hem $Y = -0.8916$ to armpit $Y = 0.2829$).
  - Right Seam vertices ($X > 0$): **27 vertices** (IDs: `v 2` to `v 139` evenly spaced along right flank from hem $Y = -0.8916$ to armpit $Y = 0.2829$).
- **Coincident Duplicate Vertices Check**:
  - Tested Euclidean distance between all distinct seam vertex pairs: Minimum pairwise distance $= 0.0197\text{ m}$.
  - Coincident un-welded duplicates ($d < 10^{-5}\text{ m}$): **0 pairs**. (PASS)
- **Seam UV Decoupling**:
  - Front and Back face loops share identical 3D position indices `v`, but reference disjoint texture coordinates `vt`.
  - Shared `vt` indices across seam: **0** (completely decoupled UV seams).
  - Cross-seam `vt` bleeding: **0**. (PASS)
- **Suite 3 Result**: **PASS**

---

## Challenges & Failure Analysis

### [High] Challenge 1: Asymmetric Sleeve Allocation to UV Partitions
- **Assumption Challenged**: That all front-facing geometry ($\text{Normal}_Z > +0.10$) receives texture coordinates from the Front 2D Customizer canvas ($u \in [0.0, 0.5]$), and all back-facing geometry receives texture coordinates from the Back canvas ($u \in [0.5, 1.0]$).
- **Attack Scenario**: 
  1. A user places a graphic spanning across the chest onto the Left Sleeve. Because Island 5 (Left Sleeve Main) is placed in the Back UV partition ($u \in [0.502, 0.998]$), the anterior side of the left sleeve will NOT show any artwork placed on the Front 2D canvas. Instead, it will display graphics placed on the Back 2D canvas.
  2. Symmetrically, a user placing a graphic on the Back 2D customizer targeting the Right Sleeve will find the posterior side of the right sleeve does NOT display the back artwork; instead it samples from the Front canvas ($u \in [0.002, 0.498]$).
- **Blast Radius**: 3D viewer rendering on sleeves is cross-coupled: Front canvas controls Right sleeve (both front and back), Back canvas controls Left sleeve (both front and back).
- **Mitigation**:
  - Option A (Split sleeves): Cut the sleeve meshes along the top shoulder/arm seam into anterior (front) and posterior (back) UV shells, placing anterior shells in $[0.0, 0.5]$ and posterior in $[0.5, 1.0]$.
  - Option B (Accept island granularity contract): Formally amend the project interface contract in `PROJECT.md` to state that 50/50 partition applies strictly at the Torso level and topological island level (Torso Front in $[0.0, 0.5]$, Torso Back in $[0.5, 1.0]$), with Left Sleeve allocated to Back partition and Right Sleeve allocated to Front partition.

### [Medium] Challenge 2: Continuous Collar Loop Partitioning
- **Assumption Challenged**: That the neck opening / collar respects the front/back camera normal split.
- **Attack Scenario**: A user inspecting the collar from the back sees texture from the Front 2D customizer canvas ($193$ faces on Island 3 and 10 face backwards with $\text{Normal}_Z < -0.10$ but have $u \le 0.498000$).
- **Blast Radius**: Collar texture from the front wraps around to the back collar.
- **Mitigation**: Cut collar at the side neck points into front-collar and back-collar UV segments, or accept collar as an un-split single trim piece.

---

## Stress Test Results Summary

| Test Case | Scenario / Assertion | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| `BOUNDARY_1.1` | Face count & triangle arity | Exactly 10,192 triangles | 10,192 triangles (all arity 3) | **PASS** |
| `BOUNDARY_1.2` | Zero triangles spanning $u = 0.50$ | 0 crossing triangles | 0 crossing triangles | **PASS** |
| `BOUNDARY_1.3` | Zero bleed margin ($u \le 0.50$ front, $u \ge 0.50$ back) | Front $\le 0.50$, Back $\ge 0.50$ | Front max $= 0.498000$, Back min $= 0.502000$ | **PASS** |
| `BOUNDARY_1.4` | Boundary clearance buffer gap | Clearance $\ge 0.001$ UV units | Front: $0.002000$, Back: $0.002000$, Gap: $0.004000$ | **PASS** |
| `NORMAL_2.1` | Front faces ($\text{Normal}_Z > 0.1$) have $u \in [0.0, 0.5]$ | 100.0% compliance | 81.40% compliance (889 violating faces) | **FAIL** |
| `NORMAL_2.2` | Back faces ($\text{Normal}_Z < -0.1$) have $u \in [0.5, 1.0]$ | 100.0% compliance | 76.19% compliance (1,194 violating faces) | **FAIL** |
| `NORMAL_2.3` | Side seam edge transitions ($|\text{Normal}_Z| \le 0.1$) | Clean split, 0 crossing faces | 149 front, 249 back, 0 crossing faces | **PASS** |
| `WELDING_3.1` | Left & Right side seam shared vertices | 54 vertices (27 left, 27 right) | 54 vertices (27 left, 27 right) | **PASS** |
| `WELDING_3.2` | Coincident duplicate vertex pairs | 0 duplicate vertex pairs | 0 duplicate pairs ($d < 10^{-5}\text{ m}$) | **PASS** |
| `WELDING_3.3` | Seam UV decoupling (separate VT indices) | 0 shared VT across seam | 0 shared VT, 0 cross-seam bleed | **PASS** |

---

## Unchallenged Areas

- **Procedural fallback geometry (`src/lib/tshirtGeometry.ts`)**: Out of scope for Milestone 1 asset testing; scheduled for Milestone 2.
- **GarmentPreview3D rendering in live browser WebGL context**: Challenger 2 verified Three.js headless parsing; live DOM rendering deferred to Milestone 2.
