/**
 * scripts/test_challenger_m1_8_2.mjs
 * Challenger 2: Three.js WebGL & Anti-Mirroring Adversarial Stress Test Suite
 * Milestone 1 Verification Gate
 *
 * Evaluates:
 * 1. Three.js OBJLoader Parsing & BufferAttribute Integrity
 * 2. Centering, Bounding Box (Box3) & Floor Clearance
 * 3. Anti-Mirroring Adversarial Probes (Front, Back, Torso, Multi-height) & Uprightness
 * 4. Perspective Camera NDC Projection Correlation (Front & Back Views)
 * 5. Zero Cross-Border Bleed & UV Boundary Conformance
 */
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const results = {
  timestamp: new Date().toISOString(),
  targetFile: 'public/models/tshirt.obj',
  verdict: 'PENDING',
  passedCount: 0,
  failedCount: 0,
  tests: []
};

function recordTest(id, name, passed, details) {
  if (passed) {
    results.passedCount++;
    console.log(`[PASS] ${id}: ${name}`);
  } else {
    results.failedCount++;
    console.error(`[FAIL] ${id}: ${name} -> ${details}`);
  }
  results.tests.push({ id, name, passed, details });
}

console.log('================================================================');
console.log('  CHALLENGER 2: THREE.JS WEBGL & ANTI-MIRRORING STRESS TEST');
console.log('================================================================');

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
if (!fs.existsSync(objPath)) {
  console.error(`FATAL: File does not exist at ${objPath}`);
  process.exit(1);
}

const objText = fs.readFileSync(objPath, 'utf8');

// -----------------------------------------------------------------------------
// SECTION 1: Three.js OBJLoader Parsing & BufferAttributes
// -----------------------------------------------------------------------------
console.log('\n--- Section 1: Three.js OBJLoader Parsing & BufferAttribute Integrity ---');

let parsedGroup;
let parseError = null;
try {
  const loader = new OBJLoader();
  parsedGroup = loader.parse(objText);
} catch (err) {
  parseError = err;
}

recordTest(
  'OBJ_PARSE_SUCCESS',
  'Three.js OBJLoader parses public/models/tshirt.obj cleanly without exception',
  parseError === null && parsedGroup !== null,
  parseError ? parseError.message : 'Successfully parsed into THREE.Group'
);

const children = parsedGroup ? parsedGroup.children : [];
recordTest(
  'OBJ_SINGLE_MESH',
  'OBJLoader yields exactly 1 child mesh with name "TShirt"',
  children.length === 1 && children[0].isMesh === true && children[0].name === 'TShirt',
  `Children count: ${children.length}, Child 0 isMesh: ${children[0]?.isMesh}, name: "${children[0]?.name}"`
);

const mesh = children[0];
const geometry = mesh ? mesh.geometry : null;

recordTest(
  'GEOM_EXISTS',
  'Mesh contains valid BufferGeometry',
  geometry instanceof THREE.BufferGeometry,
  geometry ? 'BufferGeometry present' : 'No BufferGeometry'
);

const posAttr = geometry?.attributes?.position;
const normAttr = geometry?.attributes?.normal;
const uvAttr = geometry?.attributes?.uv;

recordTest(
  'POS_COUNT',
  'Position attribute count equals exactly 10,192 triangles * 3 = 30,576 vertices',
  posAttr?.count === 30576,
  `Position count: ${posAttr?.count} (expected 30576)`
);

recordTest(
  'POS_ARRAY_ELEMENTS',
  'Position array length equals 30,576 * 3 = 91,728 elements',
  posAttr?.array?.length === 91728,
  `Position array length: ${posAttr?.array?.length} (expected 91728)`
);

recordTest(
  'NORM_COUNT',
  'Normal attribute count equals 30,576 vertices (array length 91,728)',
  normAttr?.count === 30576 && normAttr?.array?.length === 91728,
  `Normal count: ${normAttr?.count}, array length: ${normAttr?.array?.length}`
);

recordTest(
  'UV_COUNT',
  'UV attribute count equals 30,576 vertices (array length 61,152)',
  uvAttr?.count === 30576 && uvAttr?.array?.length === 61152,
  `UV count: ${uvAttr?.count}, array length: ${uvAttr?.array?.length}`
);

// Scan for NaN, Infinity, or unnormalized values
let nanOrInfCount = 0;
let invalidNormals = 0;
for (let i = 0; i < posAttr.count; i++) {
  const px = posAttr.getX(i), py = posAttr.getY(i), pz = posAttr.getZ(i);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) nanOrInfCount++;

  const nx = normAttr.getX(i), ny = normAttr.getY(i), nz = normAttr.getZ(i);
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) nanOrInfCount++;
  const nLen = Math.hypot(nx, ny, nz);
  if (Math.abs(nLen - 1.0) > 0.05) invalidNormals++;

  const u = uvAttr.getX(i), v = uvAttr.getY(i);
  if (!Number.isFinite(u) || !Number.isFinite(v)) nanOrInfCount++;
}

recordTest(
  'BUFFER_NO_NAN_INF',
  'Zero NaN or Infinite values across all position, normal, and UV buffer attributes',
  nanOrInfCount === 0,
  `NaN/Inf values found: ${nanOrInfCount}`
);

recordTest(
  'NORMALS_UNIT_LENGTH',
  'All vertex normals are normalized unit vectors (length ~ 1.0)',
  invalidNormals === 0,
  `Non-unit normals found: ${invalidNormals}`
);

// -----------------------------------------------------------------------------
// SECTION 2: Centering, Bounding Box (Box3) & Floor Clearance
// -----------------------------------------------------------------------------
console.log('\n--- Section 2: Centering & Bounding Box Stress Test ---');

geometry.computeBoundingBox();
const box = geometry.boundingBox;
const center = new THREE.Vector3();
box.getCenter(center);
const size = new THREE.Vector3();
box.getSize(size);
const maxDim = Math.max(size.x, size.y, size.z);

console.log(`Computed BoundingBox Min: [${box.min.x.toFixed(6)}, ${box.min.y.toFixed(6)}, ${box.min.z.toFixed(6)}]`);
console.log(`Computed BoundingBox Max: [${box.max.x.toFixed(6)}, ${box.max.y.toFixed(6)}, ${box.max.z.toFixed(6)}]`);
console.log(`Computed Box Center: [${center.x.toFixed(6)}, ${center.y.toFixed(6)}, ${center.z.toFixed(6)}] (length: ${center.length().toExponential(4)})`);
console.log(`Computed Box Size: [${size.x.toFixed(6)}, ${size.y.toFixed(6)}, ${size.z.toFixed(6)}]`);
console.log(`Computed Max Dimension: ${maxDim.toFixed(6)} units`);

recordTest(
  'BOX_CENTER_ZERO',
  'Bounding Box center is at origin (0, 0, 0) within 1e-4 tolerance',
  center.length() <= 1e-4,
  `Center offset: ${center.length().toExponential(4)} (threshold 1e-4)`
);

recordTest(
  'BOX_MAX_DIMENSION_1_90',
  'Max dimension equals 1.90 units within 1e-4 tolerance',
  Math.abs(maxDim - 1.90) <= 1e-4,
  `Max dimension: ${maxDim.toFixed(6)} (diff from 1.90: ${Math.abs(maxDim - 1.90).toExponential(4)})`
);

// Simulate GarmentPreview3D.tsx runtime normalization:
const simulatedObj = parsedGroup.clone(true);
const simBox = new THREE.Box3().setFromObject(simulatedObj);
const simCenter = simBox.getCenter(new THREE.Vector3());
const simSize = simBox.getSize(new THREE.Vector3());
const simMaxDim = Math.max(simSize.x, simSize.y, simSize.z);
const simScale = 1.9 / (simMaxDim || 1);

recordTest(
  'STUDIO_NORMALIZATION_STABILITY',
  'Simulated GarmentPreview3D normalization yields identity displacement and unit scale',
  simCenter.length() <= 1e-4 && Math.abs(simScale - 1.0) <= 1e-4,
  `Displacement offset: ${simCenter.length().toExponential(4)}, Scale factor: ${simScale.toFixed(6)}`
);

// Floor clearance test:
const shadowFloorY = -1.10;
const hemMinY = box.min.y;
const floorClearance = hemMinY - shadowFloorY;

console.log(`Shadow floor plane Y: ${shadowFloorY.toFixed(4)}`);
console.log(`Lowest garment point (hem) Y: ${hemMinY.toFixed(6)}`);
console.log(`Floor clearance margin: +${floorClearance.toFixed(6)} units`);

recordTest(
  'SHADOW_FLOOR_CLEARANCE',
  'Hem strictly clears shadow floor plane (y = -1.10) with positive margin (> +0.20 units)',
  floorClearance > 0.20,
  `Floor clearance margin: +${floorClearance.toFixed(6)} units (> +0.20 required)`
);

// -----------------------------------------------------------------------------
// SECTION 3: Anti-Mirroring Adversarial Probes
// -----------------------------------------------------------------------------
console.log('\n--- Section 3: Anti-Mirroring Adversarial Test ---');

const frontLeftProbes = [];
const frontRightProbes = [];
const frontCenterProbes = [];

const backViewedLeftProbes = [];
const backViewedRightProbes = [];
const backCenterProbes = [];

for (let i = 0; i < posAttr.count; i += 3) {
  const p0 = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
  const p1 = new THREE.Vector3(posAttr.getX(i + 1), posAttr.getY(i + 1), posAttr.getZ(i + 1));
  const p2 = new THREE.Vector3(posAttr.getX(i + 2), posAttr.getY(i + 2), posAttr.getZ(i + 2));
  const centroid = new THREE.Vector3().add(p0).add(p1).add(p2).divideScalar(3);

  const u0 = uvAttr.getX(i), u1 = uvAttr.getX(i + 1), u2 = uvAttr.getX(i + 2);
  const v0 = uvAttr.getY(i), v1 = uvAttr.getY(i + 1), v2 = uvAttr.getY(i + 2);
  const avgU = (u0 + u1 + u2) / 3;
  const avgV = (v0 + v1 + v2) / 3;

  if (centroid.z > 0.15 && centroid.y >= -0.2 && centroid.y <= 0.4 && Math.abs(centroid.x) <= 0.25) {
    if (centroid.x < -0.05) frontLeftProbes.push({ centroid, avgU, avgV });
    else if (centroid.x > 0.05) frontRightProbes.push({ centroid, avgU, avgV });
    else frontCenterProbes.push({ centroid, avgU, avgV });
  }

  if (centroid.z < -0.15 && centroid.y >= -0.2 && centroid.y <= 0.4 && Math.abs(centroid.x) <= 0.25) {
    if (centroid.x > 0.05) backViewedLeftProbes.push({ centroid, avgU, avgV });
    else if (centroid.x < -0.05) backViewedRightProbes.push({ centroid, avgU, avgV });
    else backCenterProbes.push({ centroid, avgU, avgV });
  }
}

const avgFL_U = frontLeftProbes.reduce((s, p) => s + p.avgU, 0) / frontLeftProbes.length;
const avgFR_U = frontRightProbes.reduce((s, p) => s + p.avgU, 0) / frontRightProbes.length;
const avgFC_U = frontCenterProbes.reduce((s, p) => s + p.avgU, 0) / frontCenterProbes.length;

console.log(`Front Left probes (X < -0.05): count=${frontLeftProbes.length}, avgU=${avgFL_U.toFixed(4)}`);
console.log(`Front Center probes (|X| <= 0.05): count=${frontCenterProbes.length}, avgU=${avgFC_U.toFixed(4)}`);
console.log(`Front Right probes (X > 0.05): count=${frontRightProbes.length}, avgU=${avgFR_U.toFixed(4)}`);

recordTest(
  'ANTI_MIRROR_FRONT',
  'Front chest: U increases strictly from Viewer-Left (X < 0) to Viewer-Right (X > 0) [U(right) > U(left)]',
  avgFR_U > avgFL_U && avgFC_U > avgFL_U && avgFR_U > avgFC_U,
  `Front avgU: Left=${avgFL_U.toFixed(4)} < Center=${avgFC_U.toFixed(4)} < Right=${avgFR_U.toFixed(4)}`
);

recordTest(
  'FRONT_STRICT_U_HALF',
  'Front chest probes strictly obey U in [0.0, 0.5]',
  frontLeftProbes.every(p => p.avgU <= 0.5) && frontRightProbes.every(p => p.avgU <= 0.5),
  `Max Front probe U: ${Math.max(...frontRightProbes.map(p => p.avgU)).toFixed(4)} <= 0.5`
);

const avgBVL_U = backViewedLeftProbes.reduce((s, p) => s + p.avgU, 0) / backViewedLeftProbes.length;
const avgBVR_U = backViewedRightProbes.reduce((s, p) => s + p.avgU, 0) / backViewedRightProbes.length;
const avgBC_U = backCenterProbes.reduce((s, p) => s + p.avgU, 0) / backCenterProbes.length;

console.log(`Back Viewed-Left probes (X > 0.05): count=${backViewedLeftProbes.length}, avgU=${avgBVL_U.toFixed(4)}`);
console.log(`Back Center probes (|X| <= 0.05): count=${backCenterProbes.length}, avgU=${avgBC_U.toFixed(4)}`);
console.log(`Back Viewed-Right probes (X < -0.05): count=${backViewedRightProbes.length}, avgU=${avgBVR_U.toFixed(4)}`);

recordTest(
  'ANTI_MIRROR_BACK',
  'Back view: U increases strictly from Viewed-Left (X > 0) to Viewed-Right (X < 0)',
  avgBVR_U > avgBVL_U && avgBC_U > avgBVL_U && avgBVR_U > avgBC_U,
  `Back avgU: Viewed-Left=${avgBVL_U.toFixed(4)} < Center=${avgBC_U.toFixed(4)} < Viewed-Right=${avgBVR_U.toFixed(4)}`
);

recordTest(
  'BACK_STRICT_U_HALF',
  'Back probes strictly obey U in [0.5, 1.0]',
  backViewedLeftProbes.every(p => p.avgU >= 0.5) && backViewedRightProbes.every(p => p.avgU >= 0.5),
  `Min Back probe U: ${Math.min(...backViewedLeftProbes.map(p => p.avgU)).toFixed(4)} >= 0.5`
);

// -----------------------------------------------------------------------------
// SECTION 4: Multi-Height Horizontal Gradient Robustness
// -----------------------------------------------------------------------------
console.log('\n--- Section 4: Multi-Height Horizontal Gradient Robustness ---');

const heightBands = [
  { name: 'Upper Chest/Back', yMin: 0.20, yMax: 0.40 },
  { name: 'Mid Torso',       yMin: 0.00, yMax: 0.20 },
  { name: 'Lower Torso',     yMin: -0.25, yMax: 0.00 }
];

let allBandsAntiMirrored = true;
for (const band of heightBands) {
  const fL = [], fR = [], bL = [], bR = [];
  for (let i = 0; i < posAttr.count; i += 3) {
    const cy = (posAttr.getY(i) + posAttr.getY(i + 1) + posAttr.getY(i + 2)) / 3;
    const cx = (posAttr.getX(i) + posAttr.getX(i + 1) + posAttr.getX(i + 2)) / 3;
    const cz = (posAttr.getZ(i) + posAttr.getZ(i + 1) + posAttr.getZ(i + 2)) / 3;
    const au = (uvAttr.getX(i) + uvAttr.getX(i + 1) + uvAttr.getX(i + 2)) / 3;

    if (cy >= band.yMin && cy < band.yMax && Math.abs(cx) <= 0.25) {
      if (cz > 0.15) {
        if (cx < -0.06) fL.push(au);
        if (cx > 0.06) fR.push(au);
      } else if (cz < -0.15) {
        if (cx > 0.06) bL.push(au);
        if (cx < -0.06) bR.push(au);
      }
    }
  }

  const avgFL = fL.reduce((a, b) => a + b, 0) / fL.length;
  const avgFR = fR.reduce((a, b) => a + b, 0) / fR.length;
  const avgBL = bL.reduce((a, b) => a + b, 0) / bL.length;
  const avgBR = bR.reduce((a, b) => a + b, 0) / bR.length;

  const bandPassed = avgFR > avgFL && avgBR > avgBL;
  if (!bandPassed) allBandsAntiMirrored = false;

  console.log(`Band "${band.name}" (Y in [${band.yMin}, ${band.yMax}]):`);
  console.log(`  Front: Left U=${avgFL.toFixed(4)}, Right U=${avgFR.toFixed(4)} -> dU=${(avgFR - avgFL).toFixed(4)} (passed: ${avgFR > avgFL})`);
  console.log(`  Back:  Viewed-Left U=${avgBL.toFixed(4)}, Viewed-Right U=${avgBR.toFixed(4)} -> dU=${(avgBR - avgBL).toFixed(4)} (passed: ${avgBR > avgBL})`);
}

recordTest(
  'MULTI_HEIGHT_ANTI_MIRROR',
  'All 3 vertical height bands (Upper, Mid, Lower) exhibit monotonic positive dU horizontal gradient',
  allBandsAntiMirrored,
  'Upper, Mid, and Lower bands all verify dU > 0 for front and back'
);

// -----------------------------------------------------------------------------
// SECTION 5: Perspective Camera NDC Projection Correlation
// -----------------------------------------------------------------------------
console.log('\n--- Section 5: Perspective Camera NDC Projection Correlation ---');

const frontCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
frontCam.position.set(0, 0.1, 2.3);
frontCam.lookAt(0, 0, 0);
frontCam.updateMatrixWorld();
frontCam.updateProjectionMatrix();

const backCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
backCam.position.set(0, 0.1, -2.3);
backCam.lookAt(0, 0, 0);
backCam.updateMatrixWorld();
backCam.updateProjectionMatrix();

const frontSamples = [];
const backSamples = [];

for (let i = 0; i < posAttr.count; i++) {
  const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
  const u = uvAttr.getX(i);
  const vTex = uvAttr.getY(i);

  if (v.z > 0.15 && v.y >= -0.2 && v.y <= 0.4 && Math.abs(v.x) <= 0.25) {
    const ndc = v.clone().project(frontCam);
    frontSamples.push({ ndcX: ndc.x, ndcY: ndc.y, u, vTex });
  }

  if (v.z < -0.15 && v.y >= -0.2 && v.y <= 0.4 && Math.abs(v.x) <= 0.25) {
    const ndc = v.clone().project(backCam);
    backSamples.push({ ndcX: ndc.x, ndcY: ndc.y, u, vTex });
  }
}

function pearson(samples, xKey, yKey) {
  const n = samples.length;
  const xAvg = samples.reduce((s, p) => s + p[xKey], 0) / n;
  const yAvg = samples.reduce((s, p) => s + p[yKey], 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (const p of samples) {
    const dx = p[xKey] - xAvg;
    const dy = p[yKey] - yAvg;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  return num / Math.sqrt(denX * denY);
}

const frontCorrX = pearson(frontSamples, 'ndcX', 'u');
const frontCorrY = pearson(frontSamples, 'ndcY', 'vTex');
const backCorrX = pearson(backSamples, 'ndcX', 'u');
const backCorrY = pearson(backSamples, 'ndcY', 'vTex');

console.log(`Front Screen NDC X vs U Pearson r = ${frontCorrX.toFixed(4)}`);
console.log(`Front Screen NDC Y vs V Pearson r = ${frontCorrY.toFixed(4)}`);
console.log(`Back Screen NDC X vs U Pearson r = ${backCorrX.toFixed(4)}`);
console.log(`Back Screen NDC Y vs V Pearson r = ${backCorrY.toFixed(4)}`);

recordTest(
  'FRONT_CAMERA_NDC_LINEARITY',
  'Front camera screen NDC X and Y correlate with texture U and V with Pearson r > +0.95',
  frontCorrX > 0.95 && frontCorrY > 0.95,
  `Pearson r: NDC_X vs U = ${frontCorrX.toFixed(4)}, NDC_Y vs V = ${frontCorrY.toFixed(4)}`
);

recordTest(
  'BACK_CAMERA_NDC_LINEARITY',
  'Back camera screen NDC X and Y correlate with texture U and V with Pearson r > +0.95',
  backCorrX > 0.95 && backCorrY > 0.95,
  `Pearson r: NDC_X vs U = ${backCorrX.toFixed(4)}, NDC_Y vs V = ${backCorrY.toFixed(4)}`
);

// -----------------------------------------------------------------------------
// SECTION 6: Vertical Uprightness (Text Does Not Render Inverted)
// -----------------------------------------------------------------------------
console.log('\n--- Section 6: Vertical Uprightness Test ---');

let fLowerV = [], fUpperV = [], bLowerV = [], bUpperV = [];
for (let i = 0; i < posAttr.count; i += 3) {
  const cy = (posAttr.getY(i) + posAttr.getY(i + 1) + posAttr.getY(i + 2)) / 3;
  const cx = (posAttr.getX(i) + posAttr.getX(i + 1) + posAttr.getX(i + 2)) / 3;
  const cz = (posAttr.getZ(i) + posAttr.getZ(i + 1) + posAttr.getZ(i + 2)) / 3;
  const av = (uvAttr.getY(i) + uvAttr.getY(i + 1) + uvAttr.getY(i + 2)) / 3;

  if (Math.abs(cx) <= 0.20) {
    if (cz > 0.15) {
      if (cy >= -0.50 && cy <= -0.20) fLowerV.push(av);
      if (cy >= 0.20 && cy <= 0.50) fUpperV.push(av);
    } else if (cz < -0.15) {
      if (cy >= -0.50 && cy <= -0.20) bLowerV.push(av);
      if (cy >= 0.20 && cy <= 0.50) bUpperV.push(av);
    }
  }
}

const avgFLowerV = fLowerV.reduce((a, b) => a + b, 0) / fLowerV.length;
const avgFUpperV = fUpperV.reduce((a, b) => a + b, 0) / fUpperV.length;
const avgBLowerV = bLowerV.reduce((a, b) => a + b, 0) / bLowerV.length;
const avgBUpperV = bUpperV.reduce((a, b) => a + b, 0) / bUpperV.length;

console.log(`Front Lower Torso avgV: ${avgFLowerV.toFixed(4)}, Upper Chest avgV: ${avgFUpperV.toFixed(4)}`);
console.log(`Back Lower Torso avgV: ${avgBLowerV.toFixed(4)}, Upper Back avgV: ${avgBUpperV.toFixed(4)}`);

recordTest(
  'UPRIGHT_VERTICAL_ORIENTATION',
  'V increases monotonically with 3D height (+Y), ensuring upright text rendering on Front and Back',
  avgFUpperV > avgFLowerV && avgBUpperV > avgBLowerV,
  `Front dV: +${(avgFUpperV - avgFLowerV).toFixed(4)}, Back dV: +${(avgBUpperV - avgBLowerV).toFixed(4)}`
);

// -----------------------------------------------------------------------------
// SECTION 7: Global Partitioning & Zero Bleed Verification
// -----------------------------------------------------------------------------
console.log('\n--- Section 7: Zero Cross-Border Bleed & UV Boundaries ---');

let crossFacesCount = 0;
let minAllU = Infinity, maxAllU = -Infinity;
let minAllV = Infinity, maxAllV = -Infinity;

for (let i = 0; i < posAttr.count; i += 3) {
  const u0 = uvAttr.getX(i), u1 = uvAttr.getX(i + 1), u2 = uvAttr.getX(i + 2);
  const minF_U = Math.min(u0, u1, u2);
  const maxF_U = Math.max(u0, u1, u2);

  minAllU = Math.min(minAllU, minF_U);
  maxAllU = Math.max(maxAllU, maxF_U);

  minAllV = Math.min(minAllV, uvAttr.getY(i), uvAttr.getY(i + 1), uvAttr.getY(i + 2));
  maxAllV = Math.max(maxAllV, uvAttr.getY(i), uvAttr.getY(i + 1), uvAttr.getY(i + 2));

  if (minF_U < 0.50 && maxF_U > 0.50) {
    crossFacesCount++;
  }
}

recordTest(
  'ZERO_CROSS_BORDER_FACES',
  'Exactly 0 triangles span across the U = 0.50 boundary partition (zero cross-border bleed)',
  crossFacesCount === 0,
  `Crossing faces count: ${crossFacesCount}`
);

recordTest(
  'UV_BOUNDS_VALID',
  'All UV coordinates strictly lie within [0.0, 1.0] unit square',
  minAllU >= 0.0 && maxAllU <= 1.0 && minAllV >= 0.0 && maxAllV <= 1.0,
  `U in [${minAllU.toFixed(6)}, ${maxAllU.toFixed(6)}], V in [${minAllV.toFixed(6)}, ${maxAllV.toFixed(6)}]`
);

// -----------------------------------------------------------------------------
// FINAL VERDICT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
const allPassed = results.failedCount === 0;
results.verdict = allPassed ? 'APPROVE' : 'FAIL';
console.log(`FINAL VERDICT: ${results.verdict} (${results.passedCount} passed, ${results.failedCount} failed)`);
console.log('================================================================');

fs.writeFileSync(
  path.resolve(process.cwd(), 'scripts/challenger2_results.json'),
  JSON.stringify(results, null, 2)
);
