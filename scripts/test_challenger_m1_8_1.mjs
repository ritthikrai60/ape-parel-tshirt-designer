/**
 * scripts/test_challenger_m1_8_1.mjs
 * Challenger 1: UV Bleeding & Seam Stress Test Suite for Milestone 1
 * Target: public/models/tshirt.obj
 *
 * Verifies:
 * 1. Boundary & Bleed Tests across all 10,192 triangles
 * 2. Geometric Normal vs UV Partition Correlation (Z > 0.1 and Z < -0.1)
 * 3. Side seam edge transitions (|Z| <= 0.1)
 * 4. 3D Seam Welding Verification along Left and Right side seams
 */

import fs from 'fs';
import path from 'path';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
if (!fs.existsSync(objPath)) {
  console.error(`FATAL: File does not exist at ${objPath}`);
  process.exit(1);
}

const content = fs.readFileSync(objPath, 'utf8');
const lines = content.split(/\r?\n/);

const positions = [];
const uvs = [];
const normals = [];
const faces = [];
let objectName = null;
let materialName = null;

for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
  const line = lines[lineNum - 1].trim();
  if (!line || line.startsWith('#')) continue;

  const parts = line.split(/\s+/);
  const tag = parts[0];

  if (tag === 'o') {
    objectName = parts[1];
  } else if (tag === 'usemtl') {
    materialName = parts[1];
  } else if (tag === 'v') {
    positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
  } else if (tag === 'vt') {
    uvs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
  } else if (tag === 'vn') {
    normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
  } else if (tag === 'f') {
    const faceVerts = parts.slice(1).map(p => {
      const idxs = p.split('/').map(v => (v ? parseInt(v, 10) : null));
      return { v: idxs[0], vt: idxs[1], vn: idxs[2] };
    });
    faces.push({ lineNum, verts: faceVerts });
  }
}

console.log('================================================================');
console.log('  CHALLENGER 1: UV BLEEDING & SEAM STRESS TEST (EMPIRICAL)');
console.log('================================================================');
console.log(`Target: ${objPath}`);
console.log(`Object: ${objectName}, Material: ${materialName}`);
console.log(`Vertices (v): ${positions.length}`);
console.log(`UVs (vt):      ${uvs.length}`);
console.log(`Normals (vn):  ${normals.length}`);
console.log(`Faces (f):    ${faces.length}`);

function computeFaceNormal(p0, p1, p2) {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  const len = Math.hypot(cx, cy, cz);
  if (len === 0) return { normal: [0, 0, 0], area: 0 };
  return { normal: [cx / len, cy / len, cz / len], area: 0.5 * len };
}

// -------------------------------------------------------------
// TEST SUITE 1: Boundary & Bleed Tests
// -------------------------------------------------------------
console.log('\n--- Test Suite 1: Boundary & Bleed Tests ---');

const totalTris = faces.length;
const isAllTris = faces.every(f => f.verts.length === 3);

let crossingFaces = 0;
let pureFrontFaces = 0;
let pureBackFaces = 0;
let frontMaxU = -Infinity;
let backMinU = Infinity;
let minClearanceFront = Infinity; // distance from max front U to 0.5
let minClearanceBack = Infinity;  // distance from min back U to 0.5

for (let idx = 0; idx < faces.length; idx++) {
  const f = faces[idx];
  const uVals = f.verts.map(fv => uvs[fv.vt - 1][0]);
  const minU = Math.min(...uVals);
  const maxU = Math.max(...uVals);

  if (minU < 0.500000 && maxU > 0.500000) {
    crossingFaces++;
  } else if (maxU <= 0.500000) {
    pureFrontFaces++;
    if (maxU > frontMaxU) frontMaxU = maxU;
    for (const u of uVals) {
      const dist = 0.500000 - u;
      if (dist < minClearanceFront) minClearanceFront = dist;
    }
  } else if (minU >= 0.500000) {
    pureBackFaces++;
    if (minU < backMinU) backMinU = minU;
    for (const u of uVals) {
      const dist = u - 0.500000;
      if (dist < minClearanceBack) minClearanceBack = dist;
    }
  }
}

const test1_1 = totalTris === 10192 && isAllTris;
const test1_2 = crossingFaces === 0;
const test1_3 = frontMaxU <= 0.500000 && backMinU >= 0.500000;
const test1_4 = minClearanceFront >= 0.001 && minClearanceBack >= 0.001;
const suite1_pass = test1_1 && test1_2 && test1_3 && test1_4;

console.log(`[1.1] Triangle Count & Arity: ${totalTris} tris, all 3-vert: ${isAllTris} -> ${test1_1 ? 'PASS' : 'FAIL'}`);
console.log(`[1.2] Crossing Triangles (min(u) < 0.5 < max(u)): ${crossingFaces} -> ${test1_2 ? 'PASS' : 'FAIL'}`);
console.log(`      Front Partition Faces (u <= 0.5): ${pureFrontFaces}`);
console.log(`      Back Partition Faces (u >= 0.5):  ${pureBackFaces}`);
console.log(`[1.3] Zero Bleed Margins:`);
console.log(`      Front max(u): ${frontMaxU.toFixed(6)} (Limit: <= 0.500000)`);
console.log(`      Back min(u):  ${backMinU.toFixed(6)} (Limit: >= 0.500000) -> ${test1_3 ? 'PASS' : 'FAIL'}`);
console.log(`[1.4] Minimum Distance to Seam u = 0.50:`);
console.log(`      Front clearance: ${minClearanceFront.toFixed(6)} UV units`);
console.log(`      Back clearance:  ${minClearanceBack.toFixed(6)} UV units`);
console.log(`      Total buffer gap: ${(minClearanceFront + minClearanceBack).toFixed(6)} UV units -> ${test1_4 ? 'PASS' : 'FAIL'}`);

// -------------------------------------------------------------
// TEST SUITE 2: Geometric Normal vs UV Partition Correlation
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Geometric Normal vs UV Partition Correlation ---');

let frontNormCount = 0;
let frontNormViolations = 0;
let backNormCount = 0;
let backNormViolations = 0;
let sideSeamCount = 0;
let sideSeamCrossing = 0;
let sideSeamFront = 0;
let sideSeamBack = 0;

for (let idx = 0; idx < faces.length; idx++) {
  const f = faces[idx];
  const p0 = positions[f.verts[0].v - 1];
  const p1 = positions[f.verts[1].v - 1];
  const p2 = positions[f.verts[2].v - 1];
  const { normal } = computeFaceNormal(p0, p1, p2);
  const nz = normal[2];

  const uVals = f.verts.map(fv => uvs[fv.vt - 1][0]);
  const minU = Math.min(...uVals);
  const maxU = Math.max(...uVals);

  if (nz > 0.10) {
    frontNormCount++;
    if (maxU > 0.500000) {
      frontNormViolations++;
    }
  } else if (nz < -0.10) {
    backNormCount++;
    if (minU < 0.500000) {
      backNormViolations++;
    }
  } else {
    // |Z| <= 0.10 (Side seam transition zone)
    sideSeamCount++;
    if (minU < 0.500000 && maxU > 0.500000) {
      sideSeamCrossing++;
    } else if (maxU <= 0.500000) {
      sideSeamFront++;
    } else if (minU >= 0.500000) {
      sideSeamBack++;
    }
  }
}

const frontCompliancePct = ((1.0 - frontNormViolations / frontNormCount) * 100);
const backCompliancePct = ((1.0 - backNormViolations / backNormCount) * 100);

const test2_1 = frontNormViolations === 0;
const test2_2 = backNormViolations === 0;
const test2_3 = sideSeamCrossing === 0;
const suite2_pass = test2_1 && test2_2 && test2_3;

console.log(`[2.1] Front Normal Faces (normal Z > 0.1): ${frontNormCount}`);
console.log(`      Violations (max(u) > 0.50): ${frontNormViolations} (${(frontNormViolations / frontNormCount * 100).toFixed(2)}%)`);
console.log(`      Compliance: ${frontCompliancePct.toFixed(2)}% (Strict 100% required) -> ${test2_1 ? 'PASS' : 'FAIL'}`);

console.log(`[2.2] Back Normal Faces (normal Z < -0.1): ${backNormCount}`);
console.log(`      Violations (min(u) < 0.50): ${backNormViolations} (${(backNormViolations / backNormCount * 100).toFixed(2)}%)`);
console.log(`      Compliance: ${backCompliancePct.toFixed(2)}% (Strict 100% required) -> ${test2_2 ? 'PASS' : 'FAIL'}`);

console.log(`[2.3] Side Seam Edge Transitions (|normal Z| <= 0.10): ${sideSeamCount} faces`);
console.log(`      Front partition: ${sideSeamFront}`);
console.log(`      Back partition:  ${sideSeamBack}`);
console.log(`      Crossing seam:   ${sideSeamCrossing} -> ${test2_3 ? 'PASS' : 'FAIL'}`);

// -------------------------------------------------------------
// TEST SUITE 3: Seam Welding Verification
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Seam Welding Verification ---');

// Topological islands analysis
// Island 1 = Front Torso (faces 1..3008), Island 2 = Back Torso (faces 3009..6132)
const isl1_faces = faces.slice(0, 3008);
const isl2_faces = faces.slice(3008, 6132);

const isl1_v = new Set();
for (const f of isl1_faces) for (const vert of f.verts) isl1_v.add(vert.v);

const isl2_v = new Set();
for (const f of isl2_faces) for (const vert of f.verts) isl2_v.add(vert.v);

const torsoSharedV = [];
for (const vIdx of isl1_v) {
  if (isl2_v.has(vIdx)) torsoSharedV.push(vIdx);
}
torsoSharedV.sort((a, b) => a - b);

const leftSeamV = torsoSharedV.filter(vIdx => positions[vIdx - 1][0] < 0);
const rightSeamV = torsoSharedV.filter(vIdx => positions[vIdx - 1][0] > 0);

const test3_1 = torsoSharedV.length === 54 && leftSeamV.length === 27 && rightSeamV.length === 27;

// Coincident vertices check
let coincidentPairs = 0;
for (let i = 0; i < torsoSharedV.length; i++) {
  for (let j = i + 1; j < torsoSharedV.length; j++) {
    const p1 = positions[torsoSharedV[i] - 1];
    const p2 = positions[torsoSharedV[j] - 1];
    const dist = Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]);
    if (dist < 1e-5) coincidentPairs++;
  }
}
const test3_2 = coincidentPairs === 0;

// UV decoupling check: Shared 3D vertices MUST have separate VT indices for front and back
let sharedVTCount = 0;
let vtBleedCount = 0;

for (const vi of torsoSharedV) {
  const frontVTs = new Set();
  for (const f of isl1_faces) {
    for (const fv of f.verts) {
      if (fv.v === vi) frontVTs.add(fv.vt);
    }
  }

  const backVTs = new Set();
  for (const f of isl2_faces) {
    for (const fv of f.verts) {
      if (fv.v === vi) backVTs.add(fv.vt);
    }
  }

  for (const vt of frontVTs) {
    if (backVTs.has(vt)) sharedVTCount++;
    if (uvs[vt - 1][0] > 0.500000) vtBleedCount++;
  }
  for (const vt of backVTs) {
    if (uvs[vt - 1][0] < 0.500000) vtBleedCount++;
  }
}

const test3_3 = sharedVTCount === 0 && vtBleedCount === 0;
const suite3_pass = test3_1 && test3_2 && test3_3;

console.log(`[3.1] Torso Side Seam Shared Vertices: ${torsoSharedV.length} (Expected: 54)`);
console.log(`      Left seam vertices:  ${leftSeamV.length} (Expected: 27)`);
console.log(`      Right seam vertices: ${rightSeamV.length} (Expected: 27) -> ${test3_1 ? 'PASS' : 'FAIL'}`);
console.log(`[3.2] Coincident un-welded duplicate vertex pairs: ${coincidentPairs} -> ${test3_2 ? 'PASS' : 'FAIL'}`);
console.log(`[3.3] Seam UV decoupling (separate VT indices, zero cross-bleed):`);
console.log(`      Shared VT indices: ${sharedVTCount}, VT bleed count: ${vtBleedCount} -> ${test3_3 ? 'PASS' : 'FAIL'}`);

// -------------------------------------------------------------
// OVERALL VERDICT
// -------------------------------------------------------------
console.log('\n================================================================');
console.log('  CHALLENGER 1 FINAL VERDICT SUMMARY');
console.log('================================================================');
console.log(`Suite 1 (Boundary & Bleed Tests):                     ${suite1_pass ? 'PASS' : 'FAIL'}`);
console.log(`Suite 2 (Geometric Normal vs UV Partition Correlation): ${suite2_pass ? 'PASS' : 'FAIL'}`);
console.log(`Suite 3 (Seam Welding Verification):                  ${suite3_pass ? 'PASS' : 'FAIL'}`);

const overallPass = suite1_pass && suite2_pass && suite3_pass;
const verdict = overallPass ? 'APPROVE' : 'FAIL';
console.log(`\nFINAL STRUCTURED VERDICT: ${verdict}`);

const fullReport = {
  timestamp: new Date().toISOString(),
  targetFile: 'public/models/tshirt.obj',
  verdict,
  overallPass,
  suite1: {
    passed: suite1_pass,
    faceCount: totalTris,
    isAllTriangles: isAllTris,
    crossingFaces,
    pureFrontFaces,
    pureBackFaces,
    frontMaxU,
    backMinU,
    minClearanceFront,
    minClearanceBack,
    totalBufferGap: minClearanceFront + minClearanceBack
  },
  suite2: {
    passed: suite2_pass,
    frontNormFaces: frontNormCount,
    frontViolations: frontNormViolations,
    frontCompliancePct,
    backNormFaces: backNormCount,
    backViolations: backNormViolations,
    backCompliancePct,
    sideSeamFaces: sideSeamCount,
    sideSeamFront,
    sideSeamBack,
    sideSeamCrossing
  },
  suite3: {
    passed: suite3_pass,
    totalSharedSeamVerts: torsoSharedV.length,
    leftSeamVerts: leftSeamV.length,
    rightSeamVerts: rightSeamV.length,
    coincidentPairs,
    sharedVTCount,
    vtBleedCount
  }
};

fs.writeFileSync(
  path.resolve(process.cwd(), 'scripts/challenger1_results.json'),
  JSON.stringify(fullReport, null, 2)
);
