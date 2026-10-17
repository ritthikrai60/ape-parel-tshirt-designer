import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
console.log(`[Challenger M2-10 Stress Test] Loading model: ${objPath}`);

const content = fs.readFileSync(objPath, 'utf8');
const lines = content.split('\n');

const positions = [];
const uvs = [];
const normals = [];
const faces = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  if (parts[0] === 'v') {
    positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
  } else if (parts[0] === 'vt') {
    uvs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
  } else if (parts[0] === 'vn') {
    normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
  } else if (parts[0] === 'f') {
    const corners = parts.slice(1).map((p) => {
      const idxs = p.split('/').map((s) => parseInt(s, 10));
      return {
        v: idxs[0] - 1,
        vt: idxs[1] - 1,
        vn: idxs[2] - 1,
      };
    });
    faces.push(corners);
  }
}

console.log(`\n=== 1. BASIC COUNTS & SYNTAX ===`);
console.log(`Vertices (v): ${positions.length}`);
console.log(`Texture Coordinates (vt): ${uvs.length}`);
console.log(`Normals (vn): ${normals.length}`);
console.log(`Faces (f): ${faces.length}`);

// Normal unit vector validation
let maxNormalDev = 0;
for (const [nx, ny, nz] of normals) {
  const len = Math.hypot(nx, ny, nz);
  const dev = Math.abs(len - 1.0);
  if (dev > maxNormalDev) maxNormalDev = dev;
}
console.log(`Max normal length deviation from 1.0: ${maxNormalDev.toExponential(4)}`);

// Bounds in 3D
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (const [x, y, z] of positions) {
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  if (z < minZ) minZ = z;
  if (z > maxZ) maxZ = z;
}

console.log(`3D Bounds: X=[${minX.toFixed(4)}, ${maxX.toFixed(4)}], Y=[${minY.toFixed(4)}, ${maxY.toFixed(4)}], Z=[${minZ.toFixed(4)}, ${maxZ.toFixed(4)}]`);

console.log(`\n=== 2. CHALLENGE 1: BOUNDARY VIOLATIONS & BUFFER GUTTER ===`);
let frontMaxU = -Infinity;
let frontMinU = Infinity;
let backMinU = Infinity;
let backMaxU = -Infinity;
let uvsInGutter = 0;
let uvsOutOfUnitSquare = 0;

for (let i = 0; i < uvs.length; i++) {
  const [u, v] = uvs[i];
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    uvsOutOfUnitSquare++;
  }
  if (u > 0.498 && u < 0.502) {
    uvsInGutter++;
    console.error(`GUTTER VIOLATION at vt index ${i}: u=${u}, v=${v}`);
  }
  if (u < 0.5) {
    if (u > frontMaxU) frontMaxU = u;
    if (u < frontMinU) frontMinU = u;
  } else {
    if (u < backMinU) backMinU = u;
    if (u > backMaxU) backMaxU = u;
  }
}

console.log(`Front U range: [${frontMinU.toFixed(6)}, ${frontMaxU.toFixed(6)}]`);
console.log(`Back U range:  [${backMinU.toFixed(6)}, ${backMaxU.toFixed(6)}]`);
console.log(`Gutter buffer Delta U: ${(backMinU - frontMaxU).toFixed(6)}`);
console.log(`UVs in Gutter (0.498, 0.502): ${uvsInGutter}`);
console.log(`UVs outside [0, 1]x[0, 1]: ${uvsOutOfUnitSquare}`);

// Face boundary check
let crossFaces = 0;
let frontTriCount = 0;
let backTriCount = 0;
let unclassifiedTriCount = 0;
let facesWithGutterVertex = 0;

for (let fi = 0; fi < faces.length; fi++) {
  const tri = faces[fi];
  const uVals = tri.map((c) => uvs[c.vt][0]);
  const hasFront = uVals.some((u) => u < 0.5);
  const hasBack = uVals.some((u) => u >= 0.5);

  if (hasFront && hasBack) {
    crossFaces++;
    console.error(`CROSSING FACE at face index ${fi}: U values = ${uVals}`);
  }

  if (uVals.some((u) => u > 0.498 && u < 0.502)) {
    facesWithGutterVertex++;
  }

  if (uVals.every((u) => u <= 0.498)) {
    frontTriCount++;
  } else if (uVals.every((u) => u >= 0.502)) {
    backTriCount++;
  } else {
    unclassifiedTriCount++;
  }
}

console.log(`Crossing faces across U=0.50: ${crossFaces}`);
console.log(`Faces with vertex in gutter (0.498, 0.502): ${facesWithGutterVertex}`);
console.log(`Front triangles: ${frontTriCount} (${(frontTriCount/faces.length*100).toFixed(2)}%)`);
console.log(`Back triangles: ${backTriCount} (${(backTriCount/faces.length*100).toFixed(2)}%)`);
console.log(`Unclassified triangles: ${unclassifiedTriCount}`);

console.log(`\n=== 3. CHALLENGE 2: ANATOMICAL PLACEMENT STRESS TESTING ===`);

// Point in triangle in 2D (UV space)
function pointInTriangle(pt, v0, v1, v2) {
  const [px, py] = pt;
  const [x0, y0] = v0;
  const [x1, y1] = v1;
  const [x2, y2] = v2;

  const area = 0.5 * (-y1 * x2 + y0 * (-x1 + x2) + x0 * (y1 - y2) + x1 * y2);
  const s = (y0 * x2 - x0 * y2 + (y2 - y0) * px + (x0 - x2) * py) / (2 * area);
  const t = (x0 * y1 - y0 * x1 + (y0 - y1) * px + (x1 - x0) * py) / (2 * area);
  const u = 1 - s - t;

  const eps = -1e-6;
  if (s >= eps && t >= eps && u >= eps) {
    return { inside: true, bary: [u, s, t] };
  }
  return { inside: false, bary: null };
}

// Search for 3D coordinate at a specific 2D (U, V)
function find3DPointAtUV(targetU, targetV, targetSurface = 'FRONT') {
  let matchedTriangles = [];

  for (let fi = 0; fi < faces.length; fi++) {
    const tri = faces[fi];
    const uVals = tri.map((c) => uvs[c.vt][0]);
    const isFront = uVals.every((u) => u <= 0.498);
    const isBack = uVals.every((u) => u >= 0.502);

    if (targetSurface === 'FRONT' && !isFront) continue;
    if (targetSurface === 'BACK' && !isBack) continue;

    const uv0 = uvs[tri[0].vt];
    const uv1 = uvs[tri[1].vt];
    const uv2 = uvs[tri[2].vt];

    const hit = pointInTriangle([targetU, targetV], uv0, uv1, uv2);
    if (hit.inside) {
      const [w0, w1, w2] = hit.bary;
      const p0 = positions[tri[0].v];
      const p1 = positions[tri[1].v];
      const p2 = positions[tri[2].v];

      const x = w0 * p0[0] + w1 * p1[0] + w2 * p2[0];
      const y = w0 * p0[1] + w1 * p1[1] + w2 * p2[1];
      const z = w0 * p0[2] + w1 * p1[2] + w2 * p2[2];

      matchedTriangles.push({
        faceIndex: fi,
        p3d: [x, y, z],
        bary: hit.bary,
        pts: [p0, p1, p2],
        uvs: [uv0, uv1, uv2],
      });
    }
  }
  return matchedTriangles;
}

// 3.1 Chest Placement: 2D Canvas (50%, 35%) -> Baked (U=0.250, V=0.650)
console.log(`\n--- 3.1 Chest Placement (50%, 35%) ---`);
const chestU = 0.250;
const chestV = 0.650;
const chestHits = find3DPointAtUV(chestU, chestV, 'FRONT');

console.log(`Matches found for Chest (U=${chestU}, V=${chestV}) on Front: ${chestHits.length}`);
if (chestHits.length > 0) {
  const avgX = chestHits.reduce((s, h) => s + h.p3d[0], 0) / chestHits.length;
  const avgY = chestHits.reduce((s, h) => s + h.p3d[1], 0) / chestHits.length;
  const avgZ = chestHits.reduce((s, h) => s + h.p3d[2], 0) / chestHits.length;
  console.log(`Interpolated 3D Position: X=${avgX.toFixed(4)}, Y=${avgY.toFixed(4)}, Z=${avgZ.toFixed(4)}`);

  // Assertions:
  // Must be strictly on torso sternum:
  // X should be centered (|X| < 0.05)
  // Y should be mid-chest (~0.25, in [0.15, 0.35])
  // Z should be positive front surface (Z > 0.15)
  // NOT on sleeve (|X| > 0.45)
  // NOT on collar (Y > 0.65)
  const isCentered = Math.abs(avgX) < 0.05;
  const isTorsoY = avgY >= 0.15 && avgY <= 0.35;
  const isFrontZ = avgZ >= 0.15;
  const notOnSleeve = Math.abs(avgX) < 0.45;
  const notOnCollar = avgY < 0.65;

  console.log(`Sternum Placement Verification:`);
  console.log(`- Is centered (|X| < 0.05): ${isCentered} (X=${avgX.toFixed(4)})`);
  console.log(`- Is mid-chest torso Y (0.15 <= Y <= 0.35): ${isTorsoY} (Y=${avgY.toFixed(4)})`);
  console.log(`- Is anterior sternum surface (Z >= 0.15): ${isFrontZ} (Z=${avgZ.toFixed(4)})`);
  console.log(`- NOT on sleeve (|X| < 0.45): ${notOnSleeve}`);
  console.log(`- NOT on collar (Y < 0.65): ${notOnCollar}`);
} else {
  console.error(`FAILED: No triangle hit for Chest (U=${chestU}, V=${chestV})!`);
}

// 3.2 Bottom Hem Placement: 2D Canvas (50%, 87%) -> Baked (U=0.250, V=0.130)
console.log(`\n--- 3.2 Bottom Hem Placement (50%, 87%) ---`);
const hemU = 0.250;
const hemV = 0.130;
const hemHits = find3DPointAtUV(hemU, hemV, 'FRONT');

console.log(`Matches found for Hem (U=${hemU}, V=${hemV}) on Front: ${hemHits.length}`);
if (hemHits.length > 0) {
  const avgX = hemHits.reduce((s, h) => s + h.p3d[0], 0) / hemHits.length;
  const avgY = hemHits.reduce((s, h) => s + h.p3d[1], 0) / hemHits.length;
  const avgZ = hemHits.reduce((s, h) => s + h.p3d[2], 0) / hemHits.length;
  console.log(`Interpolated 3D Position: X=${avgX.toFixed(4)}, Y=${avgY.toFixed(4)}, Z=${avgZ.toFixed(4)}`);

  const isCentered = Math.abs(avgX) < 0.05;
  const isNearBottom = avgY <= -0.60;
  const notChestOrCollar = avgY < 0.0;

  console.log(`Hem Placement Verification:`);
  console.log(`- Is centered (|X| < 0.05): ${isCentered} (X=${avgX.toFixed(4)})`);
  console.log(`- Is near bottom hem (Y <= -0.60): ${isNearBottom} (Y=${avgY.toFixed(4)})`);
  console.log(`- NOT on chest or neck (Y < 0.0): ${notChestOrCollar}`);
} else {
  console.error(`FAILED: No triangle hit for Hem (U=${hemU}, V=${hemV})!`);
}

// Bottom hem physical vertices check (Y < -0.80)
let hemVMax = -Infinity;
let hemVMin = Infinity;
let hemVertexCount = 0;
for (let i = 0; i < positions.length; i++) {
  const [x, y, z] = positions[i];
  if (y < -0.80) {
    // Find all vt associated with this v
    for (const tri of faces) {
      for (const c of tri) {
        if (c.v === i) {
          const vCoord = uvs[c.vt][1];
          if (vCoord > hemVMax) hemVMax = vCoord;
          if (vCoord < hemVMin) hemVMin = vCoord;
          hemVertexCount++;
        }
      }
    }
  }
}
console.log(`Bottom hem physical vertices (Y < -0.80): count=${hemVertexCount}, V min=${hemVMin.toFixed(6)}, V max=${hemVMax.toFixed(6)}`);
console.log(`Is hem V <= 0.150: ${hemVMax <= 0.150}`);

// 3.3 Extreme Placement Points Testing
console.log(`\n--- 3.3 Extreme Placement Points Testing ---`);
const testPoints = [
  { name: 'Collar Center (50%, 5%)', u: 0.250, v: 0.950, surf: 'FRONT' },
  { name: 'Left Sleeve Tip (5%, 35%)', u: 0.025, v: 0.650, surf: 'FRONT' },
  { name: 'Right Sleeve Tip (95%, 35%)', u: 0.475, v: 0.650, surf: 'FRONT' },
  { name: 'Left Hem Corner (5%, 90%)', u: 0.025, v: 0.100, surf: 'FRONT' },
  { name: 'Right Hem Corner (95%, 90%)', u: 0.475, v: 0.100, surf: 'FRONT' },
  { name: 'Rear Upper Back (50%, 25%)', u: 0.750, v: 0.750, surf: 'BACK' },
  { name: 'Rear Lower Hem (50%, 87%)', u: 0.750, v: 0.130, surf: 'BACK' },
];

for (const tp of testPoints) {
  const hits = find3DPointAtUV(tp.u, tp.v, tp.surf);
  if (hits.length > 0) {
    const avgX = hits.reduce((s, h) => s + h.p3d[0], 0) / hits.length;
    const avgY = hits.reduce((s, h) => s + h.p3d[1], 0) / hits.length;
    const avgZ = hits.reduce((s, h) => s + h.p3d[2], 0) / hits.length;
    console.log(`[PASS] ${tp.name}: U=${tp.u.toFixed(3)}, V=${tp.v.toFixed(3)} -> 3D=(${avgX.toFixed(3)}, ${avgY.toFixed(3)}, ${avgZ.toFixed(3)}) (${hits.length} tri hits)`);
  } else {
    console.log(`[OUT-OF-MESH] ${tp.name}: U=${tp.u.toFixed(3)}, V=${tp.v.toFixed(3)} outside garment silhouette (normal for negative space)`);
  }
}

// 3.4 Sleeve Boundary & Side Seam Distortion & UV Winding Stress Test
console.log(`\n--- 3.4 Sleeve Boundary & Side Seam UV Windings ---`);

// Compute signed UV area and 3D area for every triangle
let frontPositiveUvArea = 0;
let frontNegativeUvArea = 0;
let backPositiveUvArea = 0;
let backNegativeUvArea = 0;
let degenerateTriangles3D = 0;
let degenerateTrianglesUV = 0;
let maxAspectRatio = 0;

for (let fi = 0; fi < faces.length; fi++) {
  const tri = faces[fi];
  const p0 = positions[tri[0].v];
  const p1 = positions[tri[1].v];
  const p2 = positions[tri[2].v];

  const uv0 = uvs[tri[0].vt];
  const uv1 = uvs[tri[1].vt];
  const uv2 = uvs[tri[2].vt];

  // 3D Area
  const v01 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const v02 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  const cross3D = [
    v01[1] * v02[2] - v01[2] * v02[1],
    v01[2] * v02[0] - v01[0] * v02[2],
    v01[0] * v02[1] - v01[1] * v02[0],
  ];
  const area3D = 0.5 * Math.hypot(cross3D[0], cross3D[1], cross3D[2]);
  if (area3D < 1e-8) degenerateTriangles3D++;

  // Edge lengths for aspect ratio
  const d01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  const d12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const d20 = Math.hypot(p0[0] - p2[0], p0[1] - p2[1], p0[2] - p2[2]);
  const maxEdge = Math.max(d01, d12, d20);
  const minAltitude = (2 * area3D) / (maxEdge || 1);
  const aspect = maxEdge / (minAltitude || 1e-6);
  if (aspect > maxAspectRatio) maxAspectRatio = aspect;

  // Signed UV Area
  const uvArea = 0.5 * ((uv1[0] - uv0[0]) * (uv2[1] - uv0[1]) - (uv2[0] - uv0[0]) * (uv1[1] - uv0[1]));
  if (Math.abs(uvArea) < 1e-10) degenerateTrianglesUV++;

  const isFront = uv0[0] <= 0.498;
  if (isFront) {
    if (uvArea > 0) frontPositiveUvArea++;
    else frontNegativeUvArea++;
  } else {
    if (uvArea > 0) backPositiveUvArea++;
    else backNegativeUvArea++;
  }
}

console.log(`Degenerate 3D triangles (area < 1e-8): ${degenerateTriangles3D}`);
console.log(`Degenerate UV triangles (area < 1e-10): ${degenerateTrianglesUV}`);
console.log(`Max triangle aspect ratio in 3D: ${maxAspectRatio.toFixed(2)}`);
console.log(`Front UV Winding Distribution: +area=${frontPositiveUvArea}, -area=${frontNegativeUvArea}`);
console.log(`Back UV Winding Distribution:  +area=${backPositiveUvArea}, -area=${backNegativeUvArea}`);

// 3.5 Side Seam Vertices Continuity & Anti-Bleed
console.log(`\n--- 3.5 Side Seams Welded Topology Analysis ---`);
// Find 3D vertices shared between Front and Back partitions
const vUsage = new Map();
for (const tri of faces) {
  const isFront = uvs[tri[0].vt][0] <= 0.498;
  for (const c of tri) {
    if (!vUsage.has(c.v)) vUsage.set(c.v, new Set());
    vUsage.get(c.v).add(isFront ? 'FRONT' : 'BACK');
  }
}

let seam3DVertexCount = 0;
let seamVertices = [];
for (const [vIdx, usages] of vUsage.entries()) {
  if (usages.has('FRONT') && usages.has('BACK')) {
    seam3DVertexCount++;
    seamVertices.push(vIdx);
  }
}

console.log(`3D vertices physically shared along seams (welded side seams): ${seam3DVertexCount}`);
// Inspect UV separation for these seam vertices
let minSeamUvDist = Infinity;
for (const vIdx of seamVertices) {
  // Find front vt and back vt for this vertex
  let frontU = null;
  let backU = null;
  for (const tri of faces) {
    for (const c of tri) {
      if (c.v === vIdx) {
        const u = uvs[c.vt][0];
        if (u <= 0.498 && frontU === null) frontU = u;
        if (u >= 0.502 && backU === null) backU = u;
      }
    }
  }
  if (frontU !== null && backU !== null) {
    const diff = backU - frontU;
    if (diff < minSeamUvDist) minSeamUvDist = diff;
  }
}
console.log(`Minimum UV separation across welded seam vertices: ${minSeamUvDist.toFixed(6)}`);
console.log(`Seam vertices UV separation >= 0.004 buffer gutter: ${minSeamUvDist >= 0.004}`);

console.log(`\n=== 4. THREE.JS OBJLOADER INTEGRATION & STUDIO CLEARANCE ===`);
const loader = new OBJLoader();
const obj = loader.parse(content);
const box = new THREE.Box3().setFromObject(obj);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const maxDim = Math.max(size.x, size.y, size.z);
const scale = 1.9 / (maxDim || 1);

console.log(`Raw Object: maxDim=${maxDim.toFixed(4)}, scale=${scale.toFixed(4)}`);
console.log(`Raw Center: (${center.x.toFixed(4)}, ${center.y.toFixed(4)}, ${center.z.toFixed(4)})`);

obj.scale.setScalar(scale);
obj.position.copy(center).multiplyScalar(-scale);

const transformedBox = new THREE.Box3().setFromObject(obj);
const transformedCenter = transformedBox.getCenter(new THREE.Vector3());
const floorClearance = transformedBox.min.y - (-1.10);

console.log(`Transformed Center: (${transformedCenter.x.toFixed(6)}, ${transformedCenter.y.toFixed(6)}, ${transformedCenter.z.toFixed(6)})`);
console.log(`Transformed Min Y: ${transformedBox.min.y.toFixed(6)} m`);
console.log(`Floor Clearance above y = -1.10 m: ${(floorClearance * 100).toFixed(2)} cm`);
console.log(`Floor Clearance > 20 cm: ${floorClearance > 0.20}`);
