/**
 * scripts/adversarial_threejs_antimirror_gate.mjs
 * Challenger 2: Adversarial Three.js & Anti-Mirroring Verification Suite
 * Milestone 1 Verification Gate
 */
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const results = {
  timestamp: new Date().toISOString(),
  target: 'public/models/tshirt.obj',
  verdict: 'PENDING',
  passedCount: 0,
  failedCount: 0,
  tests: []
};

function assertTest(id, name, condition, details) {
  if (condition) {
    results.passedCount++;
    console.log(`[PASS] ${id}: ${name}`);
  } else {
    results.failedCount++;
    console.error(`[FAIL] ${id}: ${name} -> ${details}`);
  }
  results.tests.push({ id, name, passed: !!condition, details });
}

console.log('========================================================================');
console.log(' CHALLENGER 2: THREE.JS WEBGL & ANTI-MIRRORING EMPIRICAL HARNESS');
console.log('========================================================================\n');

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
if (!fs.existsSync(objPath)) {
  console.error(`Fatal: ${objPath} not found`);
  process.exit(1);
}

const objContent = fs.readFileSync(objPath, 'utf8');

// -----------------------------------------------------------------------------
// 1. Three.js OBJLoader Parsing & BufferAttributes
// -----------------------------------------------------------------------------
console.log('--- 1. Three.js OBJLoader Parsing & Attribute Integrity ---');
const loader = new OBJLoader();
let parsedObj;
let parseError = null;

try {
  parsedObj = loader.parse(objContent);
} catch (e) {
  parseError = e;
}

assertTest(
  'T1_OBJLOADER_PARSE',
  'Three.js OBJLoader parses public/models/tshirt.obj without throwing errors',
  parseError === null && parsedObj !== null,
  parseError ? parseError.message : 'Clean parse'
);

const meshChild = parsedObj?.children?.[0];
assertTest(
  'T1_SINGLE_CHILD_MESH',
  'OBJ contains exactly 1 child mesh with object tag "TShirt"',
  parsedObj?.children?.length === 1 && meshChild?.isMesh && meshChild?.name === 'TShirt',
  `Children count: ${parsedObj?.children?.length}, name: "${meshChild?.name}"`
);

const geometry = meshChild?.geometry;
assertTest(
  'T1_BUFFER_GEOMETRY_EXISTS',
  'Mesh contains a valid Three.js BufferGeometry instance',
  geometry instanceof THREE.BufferGeometry,
  `Instance type: ${geometry?.constructor?.name}`
);

const pos = geometry.attributes.position;
const norm = geometry.attributes.normal;
const uv = geometry.attributes.uv;

assertTest(
  'T1_VERTEX_POS_COUNT',
  'Vertex positions count equals 10,192 * 3 = 30,576 buffer elements',
  pos?.count === 30576,
  `pos.count: ${pos?.count} (expected 30576)`
);

assertTest(
  'T1_POS_BUFFER_ARRAY_LENGTH',
  'Position buffer array length equals 30,576 * 3 = 91,728 float elements',
  pos?.array?.length === 91728,
  `pos.array.length: ${pos?.array?.length}`
);

assertTest(
  'T1_NORMAL_COUNT',
  'Normal attribute count equals 30,576 elements (array length 91,728)',
  norm?.count === 30576 && norm?.array?.length === 91728,
  `norm.count: ${norm?.count}, array length: ${norm?.array?.length}`
);

assertTest(
  'T1_UV_COUNT',
  'UV attribute count equals 30,576 elements (array length 61,152)',
  uv?.count === 30576 && uv?.array?.length === 61152,
  `uv.count: ${uv?.count}, array length: ${uv?.array?.length}`
);

let nanOrInfCount = 0;
let zeroLengthNormals = 0;
for (let i = 0; i < pos.count; i++) {
  const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) nanOrInfCount++;

  const nx = norm.getX(i), ny = norm.getY(i), nz = norm.getZ(i);
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) nanOrInfCount++;
  const nLen = Math.hypot(nx, ny, nz);
  if (nLen < 1e-4) zeroLengthNormals++;

  const uVal = uv.getX(i), vVal = uv.getY(i);
  if (!Number.isFinite(uVal) || !Number.isFinite(vVal)) nanOrInfCount++;
}

assertTest(
  'T1_NO_NAN_OR_INF',
  'Zero NaN or Inf values across all BufferAttributes (position, normal, uv)',
  nanOrInfCount === 0,
  `Found ${nanOrInfCount} NaN/Inf values`
);

assertTest(
  'T1_NORMALS_NON_ZERO',
  'All vertex normals have valid non-zero length',
  zeroLengthNormals === 0,
  `Found ${zeroLengthNormals} zero normals`
);

// -----------------------------------------------------------------------------
// 2. Centering & Bounding Box Stress Test
// -----------------------------------------------------------------------------
console.log('\n--- 2. Centering & Bounding Box Stress Test ---');
geometry.computeBoundingBox();
const box = geometry.boundingBox;
const center = new THREE.Vector3();
box.getCenter(center);
const size = new THREE.Vector3();
box.getSize(size);
const maxDim = Math.max(size.x, size.y, size.z);

console.log(`Box min: [${box.min.x.toFixed(6)}, ${box.min.y.toFixed(6)}, ${box.min.z.toFixed(6)}]`);
console.log(`Box max: [${box.max.x.toFixed(6)}, ${box.max.y.toFixed(6)}, ${box.max.z.toFixed(6)}]`);
console.log(`Box center: [${center.x.toFixed(6)}, ${center.y.toFixed(6)}, ${center.z.toFixed(6)}]`);
console.log(`Box size: [${size.x.toFixed(6)}, ${size.y.toFixed(6)}, ${size.z.toFixed(6)}]`);
console.log(`Max dimension: ${maxDim.toFixed(6)}`);

assertTest(
  'T2_BOX_CENTER_ORIGIN',
  'Box center is at origin (0, 0, 0) within 1e-4 tolerance',
  center.length() <= 1e-4,
  `Center offset length: ${center.length().toExponential(4)}`
);

assertTest(
  'T2_MAX_DIMENSION_1_90',
  'Max dimension equals 1.90 units within 1e-4 tolerance',
  Math.abs(maxDim - 1.90) <= 1e-4,
  `maxDim: ${maxDim.toFixed(6)} (diff: ${Math.abs(maxDim - 1.90).toExponential(4)})`
);

const hemMinY = box.min.y;
const shadowFloorY = -1.10;
const floorClearance = hemMinY - shadowFloorY;

console.log(`Hem lowest point Y: ${hemMinY.toFixed(6)}`);
console.log(`Shadow floor plane Y: ${shadowFloorY.toFixed(4)}`);
console.log(`Floor clearance margin: +${floorClearance.toFixed(6)} units`);

assertTest(
  'T2_FLOOR_CLEARANCE',
  'Garment hem strictly clears shadow floor at y = -1.10 with margin > +0.20 units',
  floorClearance > 0.20,
  `Clearance: +${floorClearance.toFixed(6)} units`
);

// -----------------------------------------------------------------------------
// 3. Anti-Mirroring Adversarial Test (Virtual Probes)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Anti-Mirroring Adversarial Test (Probes & Multi-Height) ---');

// Probe Front chest at multiple horizontal slices
const frontHeights = [0.30, 0.20, 0.10, 0.00, -0.10];
let allFrontSlicesPass = true;
const frontSliceResults = [];

for (const yh of frontHeights) {
  let leftU = [], rightU = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const cu = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;

    if (Math.abs(cy - yh) <= 0.05 && cz > 0.15 && Math.abs(cx) <= 0.25) {
      if (cx < -0.06) leftU.push(cu);
      if (cx > 0.06) rightU.push(cu);
    }
  }
  const avgL = leftU.reduce((a, b) => a + b, 0) / leftU.length;
  const avgR = rightU.reduce((a, b) => a + b, 0) / rightU.length;
  const pass = avgR > avgL;
  if (!pass) allFrontSlicesPass = false;
  frontSliceResults.push({ y: yh, avgL, avgR, pass });
  console.log(`Front Slice Y=${yh.toFixed(2)}: Left U=${avgL.toFixed(4)}, Right U=${avgR.toFixed(4)} (dU = +${(avgR - avgL).toFixed(4)}) -> ${pass ? 'PASS' : 'FAIL'}`);
}

assertTest(
  'T3_FRONT_CHEST_PROBES_INCREASING_U',
  'Front chest probes at Left (X < 0) and Right (X > 0) strictly assert U(right) > U(left) across all heights',
  allFrontSlicesPass,
  `All ${frontHeights.length} height slices passed: ${allFrontSlicesPass}`
);

// Probe Back at multiple horizontal slices viewed from behind (looking towards +Z)
// When viewed from behind, viewer-left is world +X, viewer-right is world -X.
const backHeights = [0.30, 0.20, 0.10, 0.00, -0.10];
let allBackSlicesPass = true;
const backSliceResults = [];

for (const yh of backHeights) {
  let viewedLeftU = [], viewedRightU = [];
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const cu = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;

    if (Math.abs(cy - yh) <= 0.05 && cz < -0.15 && Math.abs(cx) <= 0.25) {
      if (cx > 0.06) viewedLeftU.push(cu);  // Viewer's Left
      if (cx < -0.06) viewedRightU.push(cu); // Viewer's Right
    }
  }
  const avgVL = viewedLeftU.reduce((a, b) => a + b, 0) / viewedLeftU.length;
  const avgVR = viewedRightU.reduce((a, b) => a + b, 0) / viewedRightU.length;
  const pass = avgVR > avgVL;
  if (!pass) allBackSlicesPass = false;
  backSliceResults.push({ y: yh, avgVL, avgVR, pass });
  console.log(`Back Slice Y=${yh.toFixed(2)}: Viewed-Left U=${avgVL.toFixed(4)}, Viewed-Right U=${avgVR.toFixed(4)} (dU = +${(avgVR - avgVL).toFixed(4)}) -> ${pass ? 'PASS' : 'FAIL'}`);
}

assertTest(
  'T3_BACK_PROBES_INCREASING_U',
  'Back probes viewed from behind (looking towards +Z) assert viewed-left to viewed-right maps to increasing U across all heights',
  allBackSlicesPass,
  `All ${backHeights.length} height slices passed: ${allBackSlicesPass}`
);

// Strict Partitioning Bounds on Probes in Torso Print Region
let frontProbesMaxU = -Infinity;
let backProbesMinU = Infinity;
for (let i = 0; i < pos.count; i += 3) {
  const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
  const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
  const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
  const cu = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;
  // Torso print region (below collar Y < 0.60)
  if (Math.abs(cx) <= 0.35 && cy >= -0.30 && cy <= 0.55) {
    if (cz > 0.12) frontProbesMaxU = Math.max(frontProbesMaxU, cu);
    if (cz < -0.12) backProbesMinU = Math.min(backProbesMinU, cu);
  }
}

assertTest(
  'T3_FRONT_PROBES_U_IN_0_0_5',
  'Front chest probe UVs are strictly bounded in [0.0, 0.5]',
  frontProbesMaxU <= 0.50,
  `Max Front probe U: ${frontProbesMaxU.toFixed(4)} <= 0.50`
);

assertTest(
  'T3_BACK_PROBES_U_IN_0_5_1_0',
  'Back torso probe UVs are strictly bounded in [0.5, 1.0]',
  backProbesMinU >= 0.50,
  `Min Back probe U: ${backProbesMinU.toFixed(4)} >= 0.50`
);

// -----------------------------------------------------------------------------
// 4. Text Upright & Left-to-Right Rendering Verification
// -----------------------------------------------------------------------------
console.log('\n--- 4. Text Upright & Left-to-Right Simulation ---');

// Simulate text glyphs: "A", "B", "C", "D"
// Text placed on Front canvas (u in [0.15, 0.35])
// Camera positioned in front at (0, 0.1, 2.3) looking at (0, 0, 0)
const frontCamera = new THREE.PerspectiveCamera(42, 1.0, 0.1, 100);
frontCamera.position.set(0, 0.1, 2.3);
frontCamera.lookAt(0, 0, 0);
frontCamera.updateMatrixWorld();
frontCamera.updateProjectionMatrix();

// Text placed on Back canvas (u in [0.65, 0.85])
// Camera positioned behind at (0, 0.1, -2.3) looking at (0, 0, 0)
const backCamera = new THREE.PerspectiveCamera(42, 1.0, 0.1, 100);
backCamera.position.set(0, 0.1, -2.3);
backCamera.lookAt(0, 0, 0);
backCamera.updateMatrixWorld();
backCamera.updateProjectionMatrix();

// Find mesh triangles corresponding to text glyph positions:
// Glyph 1: U ~ 0.18, Glyph 2: U ~ 0.23, Glyph 3: U ~ 0.28, Glyph 4: U ~ 0.33
const frontGlyphUs = [0.18, 0.23, 0.28, 0.33];
const frontScreenXs = [];

for (const targetU of frontGlyphUs) {
  let closestDist = Infinity;
  let screenX = 0;
  for (let i = 0; i < pos.count; i += 3) {
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cu = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;
    if (cz > 0.18 && Math.abs(cy - 0.15) < 0.08) {
      const dist = Math.abs(cu - targetU);
      if (dist < closestDist) {
        closestDist = dist;
        const vCentroid = new THREE.Vector3(
          (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
          cy,
          cz
        );
        const ndc = vCentroid.project(frontCamera);
        screenX = ndc.x;
      }
    }
  }
  frontScreenXs.push(screenX);
}

console.log('Front Text Glyphs [U=0.18, 0.23, 0.28, 0.33] projected Screen X:');
console.log('  ' + frontScreenXs.map(x => x.toFixed(4)).join(' < '));

const frontTextLeftToRight =
  frontScreenXs[0] < frontScreenXs[1] &&
  frontScreenXs[1] < frontScreenXs[2] &&
  frontScreenXs[2] < frontScreenXs[3];

assertTest(
  'T4_FRONT_TEXT_LEFT_TO_RIGHT',
  'Text mapped to Front canvas renders strictly left-to-right on screen without mirroring',
  frontTextLeftToRight,
  `Screen X positions: ${frontScreenXs.map(x => x.toFixed(3)).join(', ')}`
);

// Back Text Glyphs: U ~ 0.68, 0.73, 0.78, 0.83
const backGlyphUs = [0.68, 0.73, 0.78, 0.83];
const backScreenXs = [];

for (const targetU of backGlyphUs) {
  let closestDist = Infinity;
  let screenX = 0;
  for (let i = 0; i < pos.count; i += 3) {
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cu = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3;
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    if (cz < -0.18 && Math.abs(cy - 0.15) < 0.08 && Math.abs(cx) <= 0.25) {
      const dist = Math.abs(cu - targetU);
      if (dist < closestDist) {
        closestDist = dist;
        const vCentroid = new THREE.Vector3(cx, cy, cz);
        const ndc = vCentroid.project(backCamera);
        screenX = ndc.x;
      }
    }
  }
  backScreenXs.push(screenX);
}

console.log('Back Text Glyphs [U=0.68, 0.73, 0.78, 0.83] projected Screen X:');
console.log('  ' + backScreenXs.map(x => x.toFixed(4)).join(' < '));

const backTextLeftToRight =
  backScreenXs[0] < backScreenXs[1] &&
  backScreenXs[1] < backScreenXs[2] &&
  backScreenXs[2] < backScreenXs[3];

assertTest(
  'T4_BACK_TEXT_LEFT_TO_RIGHT',
  'Text mapped to Back canvas renders strictly left-to-right on screen without mirroring',
  backTextLeftToRight,
  `Screen X positions: ${backScreenXs.map(x => x.toFixed(3)).join(', ')}`
);

// Vertical Uprightness (Top of text vs Bottom of text)
// Top of letter is higher Y in 3D (+Y) -> must map to higher V in UV space!
let frontTopV = 0, frontBottomV = 0;
let backTopV = 0, backBottomV = 0;
let fTopCount = 0, fBotCount = 0, bTopCount = 0, bBotCount = 0;

for (let i = 0; i < pos.count; i += 3) {
  const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
  const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
  const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
  const cv = (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3;

  if (Math.abs(cx) <= 0.15) {
    if (cz > 0.15) {
      if (cy > 0.25) { frontTopV += cv; fTopCount++; }
      if (cy < -0.10) { frontBottomV += cv; fBotCount++; }
    } else if (cz < -0.15) {
      if (cy > 0.25) { backTopV += cv; bTopCount++; }
      if (cy < -0.10) { backBottomV += cv; bBotCount++; }
    }
  }
}

const avgFTopV = frontTopV / fTopCount;
const avgFBotV = frontBottomV / fBotCount;
const avgBTopV = backTopV / bTopCount;
const avgBBotV = backBottomV / bBotCount;

console.log(`Front Top V: ${avgFTopV.toFixed(4)}, Front Bottom V: ${avgFBotV.toFixed(4)} (dV = +${(avgFTopV - avgFBotV).toFixed(4)})`);
console.log(`Back Top V: ${avgBTopV.toFixed(4)}, Back Bottom V: ${avgBBotV.toFixed(4)} (dV = +${(avgBTopV - avgBBotV).toFixed(4)})`);

assertTest(
  'T4_FRONT_TEXT_UPRIGHT',
  'Front text renders upright (top of garment maps to higher texture V)',
  avgFTopV > avgFBotV,
  `Front dV: +${(avgFTopV - avgFBotV).toFixed(4)}`
);

assertTest(
  'T4_BACK_TEXT_UPRIGHT',
  'Back text renders upright (top of garment maps to higher texture V)',
  avgBTopV > avgBBotV,
  `Back dV: +${(avgBTopV - avgBBotV).toFixed(4)}`
);

// -----------------------------------------------------------------------------
// 5. Zero Cross-Border Bleed & UV Triangle Area Stress Test
// -----------------------------------------------------------------------------
console.log('\n--- 5. Seam Bleed & Polygon Stress Test ---');

let crossFaces = 0;
let degenerateTriangles = 0;
let invertedTriangles = 0;

for (let i = 0; i < pos.count; i += 3) {
  const u0 = uv.getX(i), u1 = uv.getX(i + 1), u2 = uv.getX(i + 2);
  const v0 = uv.getY(i), v1 = uv.getY(i + 1), v2 = uv.getY(i + 2);

  const minU = Math.min(u0, u1, u2);
  const maxU = Math.max(u0, u1, u2);

  if (minU < 0.50 && maxU > 0.50) {
    crossFaces++;
  }

  // 3D area
  const p0 = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
  const p1 = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
  const p2 = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
  const e1 = new THREE.Vector3().subVectors(p1, p0);
  const e2 = new THREE.Vector3().subVectors(p2, p0);
  const crossP = new THREE.Vector3().crossVectors(e1, e2);
  const area3D = crossP.length() * 0.5;

  if (area3D < 1e-8) {
    degenerateTriangles++;
  }

  // UV 2D signed area (cross product of 2D UV edges)
  const uvArea = 0.5 * ((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0));
  if (Math.abs(uvArea) < 1e-10) {
    // zero area in UV
  }
}

assertTest(
  'T5_ZERO_CROSS_BORDER_FACES',
  'Exactly 0 triangles cross across U = 0.50 boundary partition',
  crossFaces === 0,
  `Found ${crossFaces} crossing triangles`
);

assertTest(
  'T5_NO_DEGENERATE_TRIANGLES',
  'Zero degenerate 3D triangles (zero surface area)',
  degenerateTriangles === 0,
  `Found ${degenerateTriangles} degenerate triangles`
);

// -----------------------------------------------------------------------------
// SUMMARY & STRUCTURED VERDICT
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
const overallPass = results.failedCount === 0;
results.verdict = overallPass ? 'APPROVE' : 'FAIL';
console.log(`OVERALL STRUCTURED VERDICT: ${results.verdict}`);
console.log(`Passed: ${results.passedCount} / ${results.passedCount + results.failedCount}`);
console.log('========================================================================');

const jsonPath = path.resolve(process.cwd(), '.agents/teamwork/challenger_m1_8_2/test_results.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

process.exit(overallPass ? 0 : 1);
