/**
 * scripts/test_challenger_m1_retest.mjs
 * Challenger 1 Retest: UV Bleeding & Seam Stress Test Suite for Milestone 1
 * Target Asset: public/models/tshirt.obj
 *
 * Empirical verification of:
 * 1. Boundary & Bleed Tests across all 10,192 triangles:
 *    - Zero cross-border triangles across u = 0.50 (crossFaces === 0)
 *    - All Front partition triangles (5,234) have u <= 0.498000
 *    - All Back partition triangles (4,958) have u >= 0.502000
 *    - Buffer safety gap delta_u >= 0.004000
 * 2. Seam Welding Verification:
 *    - Exactly 54 shared physical vertices along left and right side seams (27 left, 27 right)
 *    - Zero un-welded duplicates along seams (dist < 1e-5)
 *    - Clean UV seam decoupling (distinct VT indices, zero cross-bleed)
 * 3. Geometric Normal vs UV Partition Correlation under codified PROJECT.md contracts:
 *    - Front Chest (|X| <= 0.25, Y in [-0.2, 0.4], Z > 0.15): 100% correlation to Front partition (u <= 0.498000)
 *    - Upper Back (|X| <= 0.25, Y in [-0.2, 0.4], Z < -0.15): 100% correlation to Back partition (u >= 0.502000)
 *    - All 15 topological UV islands: 100% conformance to assigned Front ([0.0, 0.5]) or Back ([0.5, 1.0]) partitions
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
    faces.push({ index: faces.length, lineNum, verts: faceVerts });
  }
}

console.log('========================================================================');
console.log('  CHALLENGER 1 RETEST: EMPIRICAL UV BLEED, SEAM & CORRELATION HARNESS');
console.log('========================================================================');
console.log(`Target: ${objPath}`);
console.log(`Object tag: "${objectName}", Material tag: "${materialName}"`);
console.log(`Vertices (v):  ${positions.length}`);
console.log(`UVs (vt):       ${uvs.length}`);
console.log(`Normals (vn):   ${normals.length}`);
console.log(`Faces (f):     ${faces.length}`);

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

// ========================================================================
// 1. BOUNDARY & BLEED TESTS ACROSS ALL 10,192 TRIANGLES
// ========================================================================
console.log('\n--- 1. Boundary & Bleed Tests across All 10,192 Triangles ---');

const totalTris = faces.length;
const isAllTris = faces.every(f => f.verts.length === 3);

let crossingFaces = 0;
let pureFrontFaces = 0;
let pureBackFaces = 0;
let frontMaxU = -Infinity;
let backMinU = Infinity;
let frontMinU = Infinity;
let backMaxU = -Infinity;

const frontFaceIndices = [];
const backFaceIndices = [];

for (let idx = 0; idx < faces.length; idx++) {
  const f = faces[idx];
  const uVals = f.verts.map(fv => uvs[fv.vt - 1][0]);
  const minU = Math.min(...uVals);
  const maxU = Math.max(...uVals);

  if (minU < 0.500000 && maxU > 0.500000) {
    crossingFaces++;
  } else if (maxU <= 0.500000) {
    pureFrontFaces++;
    frontFaceIndices.push(idx);
    if (maxU > frontMaxU) frontMaxU = maxU;
    if (minU < frontMinU) frontMinU = minU;
  } else if (minU >= 0.500000) {
    pureBackFaces++;
    backFaceIndices.push(idx);
    if (minU < backMinU) backMinU = minU;
    if (maxU > backMaxU) backMaxU = maxU;
  }
}

const deltaU = backMinU - frontMaxU;
const frontClearance = 0.500000 - frontMaxU;
const backClearance = backMinU - 0.500000;

const assert1_1 = totalTris === 10192 && isAllTris;
const assert1_2 = crossingFaces === 0;
const assert1_3 = pureFrontFaces === 5234 && frontMaxU <= 0.498000;
const assert1_4 = pureBackFaces === 4958 && backMinU >= 0.502000;
const assert1_5 = deltaU >= 0.004000;

console.log(`[1.1] Total Triangles & Arity: ${totalTris} tris, all 3-vert: ${isAllTris} -> ${assert1_1 ? 'PASS' : 'FAIL'}`);
console.log(`[1.2] Crossing Triangles across u = 0.50: ${crossingFaces} -> ${assert1_2 ? 'PASS' : 'FAIL'}`);
console.log(`[1.3] Front Partition:`);
console.log(`      Count: ${pureFrontFaces} faces (Expected: 5234)`);
console.log(`      U Range: [${frontMinU.toFixed(6)}, ${frontMaxU.toFixed(6)}] (Assert max(u) <= 0.498000) -> ${assert1_3 ? 'PASS' : 'FAIL'}`);
console.log(`[1.4] Back Partition:`);
console.log(`      Count: ${pureBackFaces} faces (Expected: 4958)`);
console.log(`      U Range: [${backMinU.toFixed(6)}, ${backMaxU.toFixed(6)}] (Assert min(u) >= 0.502000) -> ${assert1_4 ? 'PASS' : 'FAIL'}`);
console.log(`[1.5] Buffer Safety Gap delta_u:`);
console.log(`      Front margin clearance: ${frontClearance.toFixed(6)} UV units (${(frontClearance * 1024).toFixed(3)} px at 1024x1024)`);
console.log(`      Back margin clearance:  ${backClearance.toFixed(6)} UV units (${(backClearance * 1024).toFixed(3)} px at 1024x1024)`);
console.log(`      delta_u = ${deltaU.toFixed(6)} UV units (${(deltaU * 1024).toFixed(3)} px at 1024x1024, Assert >= 0.004000) -> ${assert1_5 ? 'PASS' : 'FAIL'}`);

const task1_pass = assert1_1 && assert1_2 && assert1_3 && assert1_4 && assert1_5;
console.log(`>>> Task 1 Boundary & Bleed Tests Result: ${task1_pass ? 'PASS' : 'FAIL'}`);

// ========================================================================
// 2. SEAM WELDING VERIFICATION
// ========================================================================
console.log('\n--- 2. Seam Welding Verification ---');

// Topological decomposition of UV islands
const vtToFaces = new Map();
for (let idx = 0; idx < faces.length; idx++) {
  for (const fv of faces[idx].verts) {
    if (!vtToFaces.has(fv.vt)) vtToFaces.set(fv.vt, []);
    vtToFaces.get(fv.vt).push(idx);
  }
}

const faceAdj = Array.from({ length: faces.length }, () => new Set());
for (const [vt, fList] of vtToFaces.entries()) {
  for (let i = 0; i < fList.length; i++) {
    for (let j = i + 1; j < fList.length; j++) {
      faceAdj[fList[i]].add(fList[j]);
      faceAdj[fList[j]].add(fList[i]);
    }
  }
}

const visited = new Uint8Array(faces.length);
const islands = [];
for (let i = 0; i < faces.length; i++) {
  if (visited[i]) continue;
  const comp = [];
  const queue = [i];
  visited[i] = 1;
  while (queue.length > 0) {
    const curr = queue.pop();
    comp.push(curr);
    for (const neighbor of faceAdj[curr]) {
      if (!visited[neighbor]) {
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
  }
  islands.push(comp);
}

// Island 0 = Front Torso Body (3008 faces), Island 1 = Back Torso Body (3124 faces)
const islFrontTorso = islands[0];
const islBackTorso = islands[1];

const frontTorsoV = new Set();
for (const fIdx of islFrontTorso) {
  for (const fv of faces[fIdx].verts) frontTorsoV.add(fv.v);
}

const backTorsoV = new Set();
for (const fIdx of islBackTorso) {
  for (const fv of faces[fIdx].verts) backTorsoV.add(fv.v);
}

const sharedTorsoV = [];
for (const vIdx of frontTorsoV) {
  if (backTorsoV.has(vIdx)) sharedTorsoV.push(vIdx);
}
sharedTorsoV.sort((a, b) => a - b);

const leftSeamV = sharedTorsoV.filter(vi => positions[vi - 1][0] < 0);
const rightSeamV = sharedTorsoV.filter(vi => positions[vi - 1][0] > 0);

const assert2_1 = sharedTorsoV.length === 54 && leftSeamV.length === 27 && rightSeamV.length === 27;

// Coincident vertex check
let coincidentPairs = 0;
for (let i = 0; i < sharedTorsoV.length; i++) {
  for (let j = i + 1; j < sharedTorsoV.length; j++) {
    const p1 = positions[sharedTorsoV[i] - 1];
    const p2 = positions[sharedTorsoV[j] - 1];
    const dist = Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]);
    if (dist < 1e-5) coincidentPairs++;
  }
}
const assert2_2 = coincidentPairs === 0;

// UV Seam Decoupling
let sharedVTCount = 0;
let vtBleedCount = 0;
for (const vi of sharedTorsoV) {
  const frontVTs = new Set();
  for (const fIdx of islFrontTorso) {
    for (const fv of faces[fIdx].verts) {
      if (fv.v === vi) frontVTs.add(fv.vt);
    }
  }

  const backVTs = new Set();
  for (const fIdx of islBackTorso) {
    for (const fv of faces[fIdx].verts) {
      if (fv.v === vi) backVTs.add(fv.vt);
    }
  }

  for (const vt of frontVTs) {
    if (backVTs.has(vt)) sharedVTCount++;
    if (uvs[vt - 1][0] > 0.498000) vtBleedCount++;
  }
  for (const vt of backVTs) {
    if (uvs[vt - 1][0] < 0.502000) vtBleedCount++;
  }
}
const assert2_3 = sharedVTCount === 0 && vtBleedCount === 0;

console.log(`[2.1] Shared Physical Vertices along Side Seams: ${sharedTorsoV.length} (Assert === 54)`);
console.log(`      Left seam (X < 0):  ${leftSeamV.length} (Assert === 27)`);
console.log(`      Right seam (X > 0): ${rightSeamV.length} (Assert === 27) -> ${assert2_1 ? 'PASS' : 'FAIL'}`);
console.log(`[2.2] Coincident un-welded duplicate vertex pairs: ${coincidentPairs} (Assert === 0) -> ${assert2_2 ? 'PASS' : 'FAIL'}`);
console.log(`[2.3] Clean UV Seam Decoupling:`);
console.log(`      Shared VT indices across seam: ${sharedVTCount} (Assert === 0)`);
console.log(`      VT bleed count across seam:    ${vtBleedCount} (Assert === 0) -> ${assert2_3 ? 'PASS' : 'FAIL'}`);

const task2_pass = assert2_1 && assert2_2 && assert2_3;
console.log(`>>> Task 2 Seam Welding Verification Result: ${task2_pass ? 'PASS' : 'FAIL'}`);

// ========================================================================
// 3. GEOMETRIC NORMAL VS UV PARTITION CORRELATION UNDER CODIFIED CONTRACTS
// ========================================================================
console.log('\n--- 3. Geometric Normal vs UV Partition Correlation under Codified Contracts ---');

// 3.1 Primary Print Zones:
// Front Chest: |X| <= 0.25, Y in [-0.2, 0.4], Z > 0.15 -> assert 100% correlation to Front partition (u <= 0.498000)
// Upper Back:  |X| <= 0.25, Y in [-0.2, 0.4], Z < -0.15 -> assert 100% correlation to Back partition (u >= 0.502000)

let frontChestFaces = 0;
let frontChestViolations = 0;
let upperBackFaces = 0;
let upperBackViolations = 0;

for (let idx = 0; idx < faces.length; idx++) {
  const f = faces[idx];
  const p0 = positions[f.verts[0].v - 1];
  const p1 = positions[f.verts[1].v - 1];
  const p2 = positions[f.verts[2].v - 1];

  // Centroid
  const cx = (p0[0] + p1[0] + p2[0]) / 3;
  const cy = (p0[1] + p1[1] + p2[1]) / 3;
  const cz = (p0[2] + p1[2] + p2[2]) / 3;

  const uVals = f.verts.map(fv => uvs[fv.vt - 1][0]);
  const minU = Math.min(...uVals);
  const maxU = Math.max(...uVals);

  // Check Front Chest Zone: |X| <= 0.25, Y in [-0.2, 0.4], Z > 0.15
  if (Math.abs(cx) <= 0.25 && cy >= -0.2 && cy <= 0.4 && cz > 0.15) {
    frontChestFaces++;
    if (maxU > 0.498000) {
      frontChestViolations++;
    }
  }

  // Check Upper Back Zone: |X| <= 0.25, Y in [-0.2, 0.4], Z < -0.15
  if (Math.abs(cx) <= 0.25 && cy >= -0.2 && cy <= 0.4 && cz < -0.15) {
    upperBackFaces++;
    if (minU < 0.502000) {
      upperBackViolations++;
    }
  }
}

const frontChestCompliance = frontChestFaces > 0 ? (1.0 - frontChestViolations / frontChestFaces) * 100 : 0;
const upperBackCompliance = upperBackFaces > 0 ? (1.0 - upperBackViolations / upperBackFaces) * 100 : 0;

const assert3_1 = frontChestFaces > 0 && frontChestViolations === 0;
const assert3_2 = upperBackFaces > 0 && upperBackViolations === 0;

console.log(`[3.1] Front Chest Primary Print Zone (|X| <= 0.25, Y in [-0.2, 0.4], Z > 0.15):`);
console.log(`      Triangles in zone: ${frontChestFaces}`);
console.log(`      Violations (u > 0.498000): ${frontChestViolations}`);
console.log(`      Compliance: ${frontChestCompliance.toFixed(2)}% (Assert === 100.0%) -> ${assert3_1 ? 'PASS' : 'FAIL'}`);

console.log(`[3.2] Upper Back Primary Print Zone (|X| <= 0.25, Y in [-0.2, 0.4], Z < -0.15):`);
console.log(`      Triangles in zone: ${upperBackFaces}`);
console.log(`      Violations (u < 0.502000): ${upperBackViolations}`);
console.log(`      Compliance: ${upperBackCompliance.toFixed(2)}% (Assert === 100.0%) -> ${assert3_2 ? 'PASS' : 'FAIL'}`);

// 3.3 UV Island Partition Conformance across all 15 topological islands
console.log(`\n[3.3] All 15 Topological UV Islands Conformance:`);
console.log(`      Total islands discovered: ${islands.length} (Assert === 15)`);

const islandDetails = [];
let islandConformancePass = true;
let totalFrontIslandFaces = 0;
let totalBackIslandFaces = 0;

const islandNameMap = [
  'Front Torso Body',
  'Back Torso Body',
  'Collar Outer',
  'Left Sleeve Cuff 1',
  'Left Sleeve Main',
  'Right Sleeve Cuff 1',
  'Right Sleeve Main',
  'Left Sleeve Cuff 2',
  'Right Sleeve Cuff 2',
  'Collar Inner',
  'Front Hem Outer',
  'Back Hem Outer',
  'Front Hem Inner',
  'Back Hem Inner',
  'Brand Patch'
];

for (let i = 0; i < islands.length; i++) {
  const comp = islands[i];
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const fIdx of comp) {
    const f = faces[fIdx];
    for (const fv of f.verts) {
      const u = uvs[fv.vt - 1][0];
      const v = uvs[fv.vt - 1][1];
      const z = positions[fv.v - 1][2];
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  let assignedPartition = null;
  let isCompliant = false;

  if (maxU <= 0.498000) {
    assignedPartition = 'Front';
    isCompliant = true;
    totalFrontIslandFaces += comp.length;
  } else if (minU >= 0.502000) {
    assignedPartition = 'Back';
    isCompliant = true;
    totalBackIslandFaces += comp.length;
  } else {
    assignedPartition = 'Crossing / Invalid';
    isCompliant = false;
    islandConformancePass = false;
  }

  const name = islandNameMap[i] || `Island ${i + 1}`;
  islandDetails.push({
    islandIndex: i + 1,
    name,
    faceCount: comp.length,
    assignedPartition,
    uRange: [minU, maxU],
    vRange: [minV, maxV],
    isCompliant
  });

  console.log(`      Island ${String(i + 1).padStart(2, ' ')}: ${name.padEnd(20, ' ')} | Faces: ${String(comp.length).padStart(4, ' ')} | Partition: ${assignedPartition.padEnd(5, ' ')} | U: [${minU.toFixed(6)}, ${maxU.toFixed(6)}] | ${isCompliant ? 'PASS' : 'FAIL'}`);
}

const assert3_3 = islands.length === 15 && islandConformancePass;
const assert3_4 = totalFrontIslandFaces === 5234 && totalBackIslandFaces === 4958;

console.log(`      Island Count Check: ${islands.length} islands -> ${islands.length === 15 ? 'PASS' : 'FAIL'}`);
console.log(`      Island Partition Conformance: 100% compliant -> ${assert3_3 ? 'PASS' : 'FAIL'}`);
console.log(`      Island Faces Sum: Front = ${totalFrontIslandFaces} (5234), Back = ${totalBackIslandFaces} (4958) -> ${assert3_4 ? 'PASS' : 'FAIL'}`);

const task3_pass = assert3_1 && assert3_2 && assert3_3 && assert3_4;
console.log(`>>> Task 3 Geometric Normal vs UV Partition Correlation Result: ${task3_pass ? 'PASS' : 'FAIL'}`);

// ========================================================================
// 4. STRUCTURED VERDICT
// ========================================================================
console.log('\n========================================================================');
console.log('  CHALLENGER 1 RETEST OVERALL VERDICT SUMMARY');
console.log('========================================================================');
console.log(`Task 1 (Boundary & Bleed Tests):                     ${task1_pass ? 'PASS' : 'FAIL'}`);
console.log(`Task 2 (Seam Welding Verification):                  ${task2_pass ? 'PASS' : 'FAIL'}`);
console.log(`Task 3 (Geometric Normal & UV Island Correlation):   ${task3_pass ? 'PASS' : 'FAIL'}`);

const overallPass = task1_pass && task2_pass && task3_pass;
const verdict = overallPass ? 'APPROVE' : 'FAIL';
console.log(`\nFINAL STRUCTURED VERDICT: ${verdict}`);

const fullResults = {
  timestamp: new Date().toISOString(),
  targetFile: 'public/models/tshirt.obj',
  verdict,
  overallPass,
  task1: {
    passed: task1_pass,
    totalTris,
    isAllTris,
    crossingFaces,
    pureFrontFaces,
    pureBackFaces,
    frontMaxU,
    backMinU,
    frontMinU,
    backMaxU,
    frontClearance,
    backClearance,
    deltaU
  },
  task2: {
    passed: task2_pass,
    sharedTorsoVCount: sharedTorsoV.length,
    leftSeamVCount: leftSeamV.length,
    rightSeamVCount: rightSeamV.length,
    coincidentPairs,
    sharedVTCount,
    vtBleedCount
  },
  task3: {
    passed: task3_pass,
    frontChestFaces,
    frontChestViolations,
    frontChestCompliance,
    upperBackFaces,
    upperBackViolations,
    upperBackCompliance,
    islandCount: islands.length,
    totalFrontIslandFaces,
    totalBackIslandFaces,
    islands: islandDetails
  }
};

fs.writeFileSync(
  path.resolve(process.cwd(), '.agents/teamwork/challenger_m1_retest_1/test_results.json'),
  JSON.stringify(fullResults, null, 2)
);
console.log(`Wrote test results to .agents/teamwork/challenger_m1_retest_1/test_results.json`);
