# Adversarial Stress Test Report: Three.js WebGL & Anti-Mirroring Integrity

- **Agent**: Challenger 2 (Three.js WebGL & Anti-Mirroring Adversarial Tester)
- **Target Asset**: `public/models/tshirt.obj`
- **Verification Harnesses**: `scripts/adversarial_threejs_antimirror_gate.mjs`, `scripts/test_challenger_m1_8_2.mjs`
- **Execution Date**: 2026-10-11T03:37:18Z
- **Structured Verdict**: **APPROVE**

---

## Challenge Summary

**Overall risk assessment**: **LOW**

Target asset `public/models/tshirt.obj` satisfies all Three.js WebGL parsing requirements, coordinate normalization constraints, bounding box centering tolerances, shadow floor clearance limits, and 50/50 anti-mirroring contracts with zero cross-border bleeding faces.

---

## Challenges & Stress Hypotheses

### [Low] Challenge 1: Naive Z-Coordinate Partition vs Collar Geometry
- **Assumption challenged**: A naive test might assume every face with $Z < 0$ belongs to the Back UV partition ($U \ge 0.50$).
- **Attack scenario**: The garment collar/neck rim forms a continuous 3D loop circling the neck. Because the collar passes behind the neck ($Z \in [-0.29, -0.10]$ at $Y \in [0.71, 0.89]$), naive geometric queries without height bounding would flag collar faces as "back bleed" into the front partition.
- **Blast radius**: If the collar were split across $U = 0.50$, it would introduce visible seam distortion on the collar ribbing.
- **Mitigation / Findings**: In `public/models/tshirt.obj`, the collar loops (Topological Islands 5 & 6, 204 faces each) are cleanly unwrapped as contiguous ribbons in $U \in [0.0206, 0.3469], V \in [0.60, 0.63]$. On the Back Torso ($Y < 0.60$), exactly 0 faces have $U < 0.50$. For Milestone 2, legacy test suites that naively test $Z < -0.02$ across all $Y$ must bound $Y < 0.60$ for torso assertions.

### [Low] Challenge 2: Multi-Island UV Packing on Sleeves vs Torso
- **Assumption challenged**: Does the presence of sleeve islands in the same horizontal UV range as torso panels cause texture bleed between sleeves and torso?
- **Attack scenario**: Left sleeve (Island 3) occupies $U \in [0.5500, 0.9500]$, while Back Torso (Island 1) occupies $U \in [0.5020, 0.9980]$. If they overlapped vertically in $V$, prints baked onto the back would bleed onto the sleeve.
- **Blast radius**: Unintended graphic placement on sleeves during back print customization.
- **Mitigation / Findings**: Verified vertical decoupling: Back Torso spans $V \in [0.0123, 0.5380]$, whereas Left Sleeve spans $V \in [0.5179, 0.8135]$. Torso artwork placed at $Y \in [-0.2, 0.4]$ corresponds to $V \in [0.15, 0.45]$, where sleeve UVs do not exist. Bleed risk is zero.

### [Info] Challenge 3: Legacy Test Suite Assertion Drift
- **Assumption challenged**: All legacy tests in `src/lib/__tests__/` must pass.
- **Attack scenario**: Running legacy test `studio_challenger.test.ts` or `m5_graphics_production_challenger.test.ts` fails because they expect hardcoded Generation 7 counts (1,462 vertices, 1,104 UVs, 2,680 faces).
- **Blast radius**: Milestone 1 gate confusion if test suite status is conflated with asset integrity.
- **Mitigation / Findings**: `PROJECT.md` Feature 5 explicitly schedules Milestone 2 to align these legacy test assertions to the authentic 5,355-vertex / 10,192-face model. `studio_pipeline.test.ts` already passes (12/12).

---

## Empirical Stress Test Results

Executed via `node scripts/adversarial_threejs_antimirror_gate.mjs` and `node scripts/test_challenger_m1_8_2.mjs`:

| # | Test ID | Description | Observed Metric | Required Target | Status |
|---|---|---|---|---|---|
| 1 | `T1_OBJLOADER_PARSE` | Three.js OBJLoader parsing | Clean parse into `THREE.Group` | No exceptions | **PASS** |
| 2 | `T1_SINGLE_CHILD_MESH` | Child mesh hierarchy | 1 Mesh, name `TShirt` | Exactly 1 Mesh `TShirt` | **PASS** |
| 3 | `T1_BUFFER_GEOMETRY_EXISTS` | Geometry instance check | `THREE.BufferGeometry` | Valid BufferGeometry | **PASS** |
| 4 | `T1_VERTEX_POS_COUNT` | Vertex positions count | 30,576 vertices | 10,192 * 3 = 30,576 | **PASS** |
| 5 | `T1_POS_BUFFER_ARRAY_LENGTH` | Position array length | 91,728 elements | 30,576 * 3 = 91,728 | **PASS** |
| 6 | `T1_NORMAL_COUNT` | Normal attribute count | 30,576 elements | 30,576 elements | **PASS** |
| 7 | `T1_UV_COUNT` | UV attribute count | 30,576 elements | 30,576 elements | **PASS** |
| 8 | `T1_NO_NAN_OR_INF` | NaN / Infinity scan | 0 NaN or Inf values | Exactly 0 | **PASS** |
| 9 | `T1_NORMALS_NON_ZERO` | Unit length normals | 0 zero-length normals | 0 zero-length normals | **PASS** |
| 10 | `T2_BOX_CENTER_ORIGIN` | Box3 center at origin | `(0.000000, 0.000000, 0.000000)` offset: `0.0000e+0` | $\le 1\times 10^{-4}$ tolerance | **PASS** |
| 11 | `T2_MAX_DIMENSION_1_90` | Max dimension tolerance | 1.900000 units (diff: `0.0000e+0`) | 1.90 units $\le 1\times 10^{-4}$ | **PASS** |
| 12 | `T2_FLOOR_CLEARANCE` | Shadow floor clearance at y = -1.10 | Hem $y = -0.891669$, margin $+0.208331$ | Margin $> +0.20$ units | **PASS** |
| 13 | `T3_FRONT_CHEST_PROBES_INCREASING_U` | Front chest horizontal probes | $U(\text{right}) > U(\text{left})$ across 5 height slices ($\Delta U \approx +0.117$) | $U(\text{right}) > U(\text{left})$ | **PASS** |
| 14 | `T3_BACK_PROBES_INCREASING_U` | Back torso horizontal probes | Viewed-left to viewed-right strictly increases $U$ ($\Delta U \approx +0.120$) | Viewed-L to Viewed-R $dU > 0$ | **PASS** |
| 15 | `T3_FRONT_PROBES_U_IN_0_0_5` | Front chest probe bounds | Max $U = 0.3341 \le 0.50$ | $U \in [0.0, 0.5]$ | **PASS** |
| 16 | `T3_BACK_PROBES_U_IN_0_5_1_0` | Back torso probe bounds | Min $U = 0.6561 \ge 0.50$ | $U \in [0.5, 1.0]$ | **PASS** |
| 17 | `T4_FRONT_TEXT_LEFT_TO_RIGHT` | Front text glyph screen projection | Screen X: `-0.2547 < -0.0887 < 0.0875 < 0.2351` | Strictly left-to-right | **PASS** |
| 18 | `T4_BACK_TEXT_LEFT_TO_RIGHT` | Back text glyph screen projection | Screen X: `-0.2752 < -0.0787 < 0.1125 < 0.2843` | Strictly left-to-right | **PASS** |
| 19 | `T4_FRONT_TEXT_UPRIGHT` | Front vertical uprightness | Top $V = 0.3668$, Bottom $V = 0.2692$ ($\Delta V = +0.0976$) | $\Delta V > 0$ (upright) | **PASS** |
| 20 | `T4_BACK_TEXT_UPRIGHT` | Back vertical uprightness | Top $V = 0.4852$, Bottom $V = 0.2662$ ($\Delta V = +0.2190$) | $\Delta V > 0$ (upright) | **PASS** |
| 21 | `T5_ZERO_CROSS_BORDER_FACES` | Crossing faces at $U = 0.50$ | 0 crossing triangles | Exactly 0 | **PASS** |
| 22 | `T5_NO_DEGENERATE_TRIANGLES` | 3D triangle area sanity | 0 degenerate triangles | Exactly 0 | **PASS** |

---

## Perspective Projection NDC Linearity Verification

Using Three.js `PerspectiveCamera` (FOV: 45°, aspect: 1.0, near: 0.1, far: 100):
- **Front Camera** at `(0, 0.1, 2.3)` looking at `(0, 0, 0)`:
  - Screen NDC X vs Texture U Pearson correlation: **$r = +0.9971$**
  - Screen NDC Y vs Texture V Pearson correlation: **$r = +0.9990$**
- **Back Camera** at `(0, 0.1, -2.3)` looking at `(0, 0, 0)`:
  - Screen NDC X vs Texture U Pearson correlation: **$r = +0.9989$**
  - Screen NDC Y vs Texture V Pearson correlation: **$r = +0.9999$**

This confirms near-perfect linear isometric projection across the torso print areas.

---

## Unchallenged Areas

- **Procedural fallback geometry (`src/lib/tshirtGeometry.ts`)**: Out of scope for Challenger 2; verified by Reviewer and planned for Milestone 2 sync.
- **Database / Pricing / Royalty business logic**: Verified by Milestone 0; out of scope for 3D model geometry validation.

---

## Verdict

**APPROVE**: `public/models/tshirt.obj` passes all Three.js WebGL rendering, Box3 centering, shadow floor clearance, anti-mirroring, and 50/50 partition constraints.
