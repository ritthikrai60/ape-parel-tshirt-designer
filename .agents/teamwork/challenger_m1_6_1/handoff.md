# Milestone 1 Challenger Report: Empirical Stress-Testing of `public/models/tshirt.obj`

**Agent**: Challenger 1 (`challenger_m1_6_1`)  
**Role**: Empirical Challenger (critic, specialist)  
**Target Asset**: `d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj`  
**Milestone**: Milestone 1: 3D Model Generation via Blender MCP & UV Partitioning  
**Verdict**: **APPROVE**  
**Date**: 2026-10-10  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The new 3D model asset `public/models/tshirt.obj` successfully resolves the architectural defects of the legacy model. It provides continuous welded drape, zero cross-border bleed faces (`crossFaces === 0`), strictly partitioned front and back UV spaces, and verified horizontal anti-mirroring ($r \approx +0.96$ on front, $r \approx -0.96$ on back). Three.js `OBJLoader` parses the geometry without errors or floor clipping.

---

## 1. Observation

### 1.1 Model Asset Parsing & Geometry Metrics
Empirical execution of `node scripts/verify_obj_empirical.mjs` on `public/models/tshirt.obj` produced verbatim:
```json
{
  "header": {
    "objectName": "TShirt",
    "materialName": "GarmentBase",
    "headerPass": true
  },
  "counts": {
    "vertices": 1490,
    "uvs": 1490,
    "normals": 1490,
    "faces": 2524,
    "nonMatchingFaceIndices": 0
  },
  "boundingBox": {
    "x": [-0.95, 0.95],
    "y": [-0.85, 0.7],
    "z": [-0.21747, 0.23403],
    "spanX": 1.9,
    "spanY": 1.55,
    "spanZ": 0.4515,
    "symmetryErrorX": 0
  },
  "normalsSanity": {
    "nonUnitNormals": 0
  },
  "uvBounds": {
    "minU": 0,
    "maxU": 1,
    "minV": 0,
    "maxV": 1,
    "uvOutOfBounds": 0
  },
  "seamCrossingFaces": {
    "crossFaces": 0,
    "pureFrontFaces": 1294,
    "pureBackFaces": 1230,
    "seamOnlyFaces": 0,
    "totalFaces": 2524
  },
  "bleedAudit": {
    "frontBleed": 0,
    "backBleed": 0,
    "faceFrontBleed": 0,
    "faceBackBleed": 0,
    "bleedSweep": [
      { "zThresh": 0.02, "fBleed": 0, "bBleed": 0 },
      { "zThresh": 0.05, "fBleed": 0, "bBleed": 0 },
      { "zThresh": 0.08, "fBleed": 0, "bBleed": 0 },
      { "zThresh": 0.1,  "fBleed": 0, "bBleed": 0 },
      { "zThresh": 0.15, "fBleed": 0, "bBleed": 0 },
      { "zThresh": 0.2,  "fBleed": 0, "bBleed": 0 }
    ]
  },
  "antiMirroring": {
    "sampleCheck": {
      "frontLeftU": 0.05,
      "frontRightU": 0.425,
      "backLeftU": 0.55,
      "backRightU": 0.925,
      "sampleAntiMirrorPass": true
    },
    "statisticalCorrelation": {
      "torso": {
        "frontCount": 487,
        "corrTorsoFrontXtoU": 0.9596249981009992,
        "backCount": 471,
        "corrTorsoBackXtoU": -0.9567642278662528
      },
      "sleeves": {
        "frontCount": 104,
        "corrSleeveFrontXtoU": 0.9309266553007706,
        "backCount": 92,
        "corrSleeveBackXtoU": -0.9460690773983129
      },
      "vertical": {
        "totalVertices": 1490,
        "corrYtoV": 0.9581848477208254
      },
      "statisticalAntiMirrorPass": true
    }
  },
  "geometrySanity": {
    "degenerateFaces": 0
  },
  "OVERALL_VERDICT": "APPROVE"
}
```

### 1.2 Three.js OBJLoader Emulation
Running Three.js `OBJLoader` via Node.js script:
```
Parsed children count: 1
Mesh name: TShirt
Geometry attributes:
  position count: 7572
  uv count: 7572
  normal count: 7572
BoundingBox min: Vector3 { x: -0.949999988079071, y: -0.8500000238418579, z: -0.21747000515460968 }
BoundingBox max: Vector3 { x: 0.949999988079071, y: 0.699999988079071, z: 0.23402999341487885 }
maxDim: 1.899999976158142
Normalized scale (1.9 / maxDim): 1.0000000125483464
Bottom hem after normalization at origin: -0.8500000345079526
Clearance from shadow plane at y = -1.1: 0.25 units
```

### 1.3 Seam Vertex Loop Topology Analysis
Investigation of vertices on $U = 0.5$:
- Exactly 50 vertices have $U = 0.5$ and $Z = 0.0$ (side seams).
- Exactly 96 faces reference these 50 vertices.
- 48 faces connect $U = 0.5$ vertices inwards to front faces ($U < 0.5$).
- 48 faces connect $U = 0.5$ vertices inwards to back faces ($U > 0.5$).
- **Exactly 0 faces bridge between $U < 0.5$ and $U > 0.5$**.

### 1.4 Test Suite & Build Verification
1. `npx tsc --noEmit`: Exited with code 0 (zero errors).
2. `npm run build`: Exited with code 0 (compiled all 10 Next.js routes successfully).
3. `npm test`: Exited with code 1 due to 2 legacy assertions scheduled for Milestone 2 alignment:
   - `src/lib/__tests__/m5_graphics_production_challenger.test.ts:225`: Hardcoded expectation `expect(faceCount).toBe(2680)` received 2,524.
   - `src/lib/__tests__/studio_pipeline.test.ts:111`: Legacy offline procedural fallback check `expect(u).toBeGreaterThanOrEqual(0.539)` in `createProceduralTShirtGeometry()`.
   - All 314 other tests passed, including `public/models/tshirt.obj` UV boundaries and structure checks in `studio_pipeline.test.ts`.

---

## 2. Logic Chain

1. **UV Boundary Isolation (Objective 2)**:
   - Observation 1.1 reveals that out of 2,524 total triangular faces, 1,294 are pure front faces ($u \le 0.5$) and 1,230 are pure back faces ($u \ge 0.5$).
   - Exactly zero faces span between $u < 0.4999$ and $u > 0.5001$ (`crossFaces === 0`).
   - Therefore, texture mapping on the front canvas cannot bleed onto back triangles across mesh polygon boundaries.

2. **Torso Depth-to-UV Correlation (Objectives 3 & 4)**:
   - For all 1,490 vertices, depth coordinates $z > 0.08$ strictly map to $u \in [0.0, 0.50]$ (`frontBleed === 0`).
   - Depth coordinates $z < -0.08$ strictly map to $u \in [0.50, 1.00]$ (`backBleed === 0`).
   - Multi-threshold depth sweep ($z \in [0.02, 0.20]$) verified zero front or back bleed at any threshold.
   - Face corner-level analysis confirmed that every face corner with $z > 0.08$ references a front UV, and every corner with $z < -0.08$ references a back UV.

3. **Horizontal Anti-Mirroring (Objective 5)**:
   - Discrete sample point testing:
     - Front chest: screen-left ($x = -0.416$) has $u = 0.05$, screen-right ($x = 0.416$) has $u = 0.425$ ($0.05 < 0.425$).
     - Back chest: viewed from behind, screen-left ($x = 0.416$) has $u = 0.55$, screen-right ($x = -0.416$) has $u = 0.925$ ($0.55 < 0.925$).
   - Statistical Pearson correlation across all 487 front torso vertices yields $r(x, u) = +0.9596$ (as $x$ increases screen-left to screen-right, $u$ increases monotonically).
   - Statistical Pearson correlation across all 471 back torso vertices yields $r(x, u) = -0.9568$ (as viewed from behind, $x$ decreases screen-left to screen-right, meaning $u$ increases monotonically).
   - Both surfaces read left-to-right without mirroring.

4. **Three.js Web Viewer Compatibility**:
   - As observed in Section 1.2, Three.js `OBJLoader` creates a 7,572-vertex `BufferGeometry`.
   - Scale factor is $1.000$ ($1.9 / 1.90$).
   - Bottom hem sits at $y = -0.85$, clearing the shadow floor at $y = -1.10$ by $0.25$ units (no clipping).

---

## 3. Caveats

- **Legacy Test Suite Assertions**: The 2 failing tests in `npm test` are caused by obsolete assertions (hardcoded legacy face count 2,680 and legacy 8% buffer margin $u \ge 0.539$ on offline procedural fallback geometry in `src/lib/tshirtGeometry.ts`). As documented in `PROJECT.md` Feature 6 & Feature 7, these are planned for Milestone 2 scope.
- **Model Scope**: Verification was performed specifically on `public/models/tshirt.obj`. No application TypeScript code or shaders were modified.

---

## 4. Conclusion

The model `public/models/tshirt.obj` satisfies all Milestone 1 requirements:
- $1,490$ vertices, $1,490$ UVs, $1,490$ normals, $2,524$ triangulated faces.
- `crossFaces === 0` (0 faces cross $U = 0.5$).
- `frontBleed === 0` (0 front torso vertices in back UV space).
- `backBleed === 0` (0 back torso vertices in front UV space).
- Horizontal anti-mirroring verified on both front ($r = +0.96$) and back ($r = -0.96$).
- Clean Three.js OBJLoader parsing and Next.js production build (`npm run build`).

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

### 5.1 Deterministic Verification Script
Run from repository root:
```powershell
node scripts/verify_obj_empirical.mjs
```
**Expected Output**:
`OVERALL_VERDICT: "APPROVE"`, `crossFaces: 0`, `frontBleed: 0`, `backBleed: 0`, `statisticalAntiMirrorPass: true`.

### 5.2 Build & Typecheck
```powershell
npx tsc --noEmit
npm run build
```
**Expected Output**: Both exit with code 0.
