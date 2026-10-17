# Milestone 1 Retest: UV Bleeding & Seam Stress Test Report

**Target Asset**: `public/models/tshirt.obj`  
**Evaluation Role**: Challenger 1 Retest (critic, specialist)  
**Date**: 2026-10-10T20:43:00Z  
**Verdict**: **APPROVE**

---

## Executive Summary

Following contract clarification and codification in `PROJECT.md` (specifically defining the 2D Canvas <-> 3D Texture Mapping partition rules, buffer safety gutter, and primary print zone scopes), Challenger 1 executed an adversarial empirical stress-testing suite against `public/models/tshirt.obj`.

All 10,192 triangles were exhaustively analyzed via dual test harnesses:
- Node.js / Three.js analysis harness (`scripts/test_challenger_m1_retest.mjs`)
- Python 3.14 geometric / topological decomposition harness (`scripts/stress_test_uv_seams_retest.py`)

### Verdict Scorecard

| Test Suite | Metric / Assertion | Requirement | Empirical Result | Status |
|---|---|---|---|---|
| **1. Boundary & Bleed** | Total Face Count & Arity | Exactly 10,192 triangles (3-vert) | 10,192 triangles, 100% arity 3 | **PASS** |
| | Cross-Border Triangles | Spanning $u = 0.50$ ($\min(u) < 0.5 < \max(u)$) === 0 | Exactly 0 crossing triangles | **PASS** |
| | Front Partition Faces | Exactly 5,234 faces with $u \le 0.498000$ | 5,234 faces, $\max(u) = 0.498000$ | **PASS** |
| | Back Partition Faces | Exactly 4,958 faces with $u \ge 0.502000$ | 4,958 faces, $\min(u) = 0.502000$ | **PASS** |
| | Buffer Safety Gutter | $\Delta u = \min(u_{\text{back}}) - \max(u_{\text{front}}) \ge 0.004000$ | $\Delta u = 0.004000$ (4.096 px at $1024\times1024$) | **PASS** |
| **2. Seam Welding** | Shared Seam Vertices | Exactly 54 physical vertices (27 left, 27 right) | Exactly 54 (27 left flank, 27 right flank) | **PASS** |
| | Coincident Duplicate Vertices | Distance $< 10^{-5}\text{ m}$ between un-welded pairs === 0 | Exactly 0 coincident duplicate pairs | **PASS** |
| | UV Seam Decoupling | Disjoint `vt` sets for Front vs Back across seam | 0 shared `vt` indices, 0 cross-partition bleed | **PASS** |
| **3. Zone & Island Correlation** | Front Chest Print Zone | $\|X\| \le 0.25, Y \in [-0.2, 0.4], Z > 0.15 \implies u \le 0.498$ | 525 triangles, 0 violations (100.00% compliance) | **PASS** |
| | Upper Back Print Zone | $\|X\| \le 0.25, Y \in [-0.2, 0.4], Z < -0.15 \implies u \ge 0.502$ | 535 triangles, 0 violations (100.00% compliance) | **PASS** |
| | 15 Topological Islands | 100% conformance to assigned partitions | 15 islands (8 Front = 5,234 f, 7 Back = 4,958 f) | **PASS** |

---

## 1. Adversarial Challenge Analysis

### 1.1 Boundary & Bleed Tests (All 10,192 Triangles)
- **Zero Cross-Border Faces**: No triangle has vertices that bridge across $u = 0.50$. Every single triangle is completely contained on either the Front partition ($u \in [0.002, 0.498]$) or the Back partition ($u \in [0.502, 0.998]$).
- **Deadband Buffer**: The distance from the highest Front $u$ coordinate ($0.498000$) to the seam $0.500000$ is exactly $0.002000$ UV units ($2.048$ pixels on a $1024\times1024$ canvas). Similarly, the lowest Back $u$ coordinate ($0.502000$) maintains a $0.002000$ UV unit clearance. The total buffer gutter is:
  $$\Delta u = 0.502000 - 0.498000 = 0.004000 \quad (4.096\text{ pixels at } 1024\times1024)$$
  This guarantees that mipmapping, bilinear filtering, and canvas rasterization will not bleed across the boundary even under sub-pixel interpolation.

### 1.2 Side Seam Welding & Topological Watertightness
- **Seam Continuity**: The left side seam ($X < 0$) contains exactly 27 shared physical vertices (`v 1` to `v 138`, $Y \in [-0.8916, 0.2829]$). The right side seam ($X > 0$) contains exactly 27 shared physical vertices (`v 2` to `v 139`, $Y \in [-0.8916, 0.2829]$).
- **Zero Tearing / Cracking**: The distance check between any two distinct seam vertices yielded $\min(\text{distance}) > 0.008\text{ m}$, confirming zero duplicate un-welded vertices.
- **UV Decoupling**: While physical 3D vertices are unified to prevent rendering tears or illumination artifacts, the texture loops cleanly branch into separate texture coordinates:
  - Front faces reference `vt` in $[0.002, 0.498]$.
  - Back faces reference `vt` in $[0.502, 0.998]$.
  - Intersection of Front `vt` and Back `vt` at seam vertices is the empty set ($\emptyset$).

### 1.3 Geometric Normal vs UV Partition Correlation
In the previous test round (`challenger_m1_8_1`), an overly broad assertion evaluated all forward-facing triangles ($N_z > 0.1$) against $u \le 0.50$, flagging cylindrical sleeves and circular collars that wrapped around the garment. Under the codified `PROJECT.md` contracts:
1. **Primary Customizer Print Zones**:
   - **Front Chest** ($\|X\| \le 0.25, Y \in [-0.2, 0.4], Z > 0.15$): Exactly 525 triangles fall within this bounding box. 100% of these triangles have $u \le 0.498000$ (0 violations).
   - **Upper Back** ($\|X\| \le 0.25, Y \in [-0.2, 0.4], Z < -0.15$): Exactly 535 triangles fall within this bounding box. 100% of these triangles have $u \ge 0.502000$ (0 violations).
2. **Topological Island Conformance**:
   Every one of the 15 topological UV islands strictly obeys its assigned partition:
   - **Front Partition (8 islands, 5,234 faces)**:
     1. Island 1: Front Torso Body — 3,008 faces, $U \in [0.002000, 0.498000]$
     2. Island 3: Collar Outer — 204 faces, $U \in [0.020646, 0.346937]$
     3. Island 6: Right Sleeve Cuff 1 — 132 faces, $U \in [0.050000, 0.450000]$
     4. Island 7: Right Sleeve Main — 1,234 faces, $U \in [0.020646, 0.408358]$
     5. Island 9: Right Sleeve Cuff 2 — 132 faces, $U \in [0.050000, 0.450000]$
     6. Island 10: Collar Inner — 204 faces, $U \in [0.020646, 0.346937]$
     7. Island 11: Front Hem Outer — 160 faces, $U \in [0.020000, 0.480000]$
     8. Island 13: Front Hem Inner — 160 faces, $U \in [0.020000, 0.480000]$
   - **Back Partition (7 islands, 4,958 faces)**:
     1. Island 2: Back Torso Body — 3,124 faces, $U \in [0.502000, 0.998000]$
     2. Island 4: Left Sleeve Cuff 1 — 132 faces, $U \in [0.578676, 0.966367]$
     3. Island 5: Left Sleeve Main — 1,234 faces, $U \in [0.550000, 0.950000]$
     4. Island 8: Left Sleeve Cuff 2 — 132 faces, $U \in [0.588958, 0.976648]$
     5. Island 12: Back Hem Outer — 160 faces, $U \in [0.520000, 0.980000]$
     6. Island 14: Back Hem Inner — 160 faces, $U \in [0.520000, 0.980000]$
     7. Island 15: Brand Patch — 16 faces, $U \in [0.720000, 0.780000]$

Zero islands overlap or cross $u = 0.50$.

---

## 2. Conclusion

The adapted 3D asset `public/models/tshirt.obj` satisfies all Milestone 1 verification criteria without compromise:
- Strict 50/50 partition separation.
- Zero crossing faces.
- Sub-pixel safe buffer gap ($\Delta u = 0.004000$).
- Watertight side seam welding with 54 shared vertices.
- 100% primary print zone correlation and 100% UV island conformance.

**Final Structured Verdict**: **APPROVE**
