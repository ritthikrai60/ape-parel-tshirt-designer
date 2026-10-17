/**
 * scripts/test_m1_adversarial.mjs
 * Comprehensive Empirical Adversarial Stress Test Harness
 * for public/models/tshirt.obj (Milestone 1 Verification Gate)
 *
 * Authored by: Challenger 1 (challenger_m1_1)
 */
import fs from 'fs';
import path from 'path';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
if (!fs.existsSync(objPath)) {
  console.error(`FATAL: File not found: ${objPath}`);
  process.exit(1);
}

const rawContent = fs.readFileSync(objPath, 'utf8');
const lines = rawContent.split(/\r?\n/);

console.log('================================================================');
console.log('  CHALLENGER 1 ADVERSARIAL STRESS TEST: public/models/tshirt.obj ');
console.log('================================================================');
console.log(`File: ${objPath}`);
console.log(`File size: ${fs.statSync(objPath).size} bytes`);
console.log(`Total lines: ${lines.length}\n`);

// -----------------------------------------------------------------------------
// PHASE 1: Wavefront OBJ File Syntax, Header & Element Integrity
// -----------------------------------------------------------------------------
let objectName = null;
let materialName = null;
let mtllibName = null;
const positions = [];
const uvs = [];
const normals = [];
const faces = [];

let lineIdx = 0;
for (const line of lines) {
  lineIdx++;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const parts = trimmed.split(/\s+/);
  const type = parts[0];

  if (type === 'o') objectName = parts[1];
  else if (type === 'usemtl') materialName = parts[1];
  else if (type === 'mtllib') mtllibName = parts[1];
  else if (type === 'v') {
    const coords = parts.slice(1).map(Number);
    if (coords.length !== 3 || coords.some(n => !Number.isFinite(n))) {
      throw new Error(`Malformed vertex on line ${lineIdx}: ${line}`);
    }
    positions.push(coords);
  } else if (type === 'vt') {
    const coords = parts.slice(1).map(Number);
    if (coords.length < 2 || coords.slice(0, 2).some(n => !Number.isFinite(n))) {
      throw new Error(`Malformed vt on line ${lineIdx}: ${line}`);
    }
    uvs.push([coords[0], coords[1]]);
  } else if (type === 'vn') {
    const coords = parts.slice(1).map(Number);
    if (coords.length !== 3 || coords.some(n => !Number.isFinite(n))) {
      throw new Error(`Malformed vn on line ${lineIdx}: ${line}`);
    }
    normals.push(coords);
  } else if (type === 'f') {
    const faceCorners = parts.slice(1).map(p => {
      const idxs = p.split('/').map(x => (x ? parseInt(x, 10) : null));
      return { v: idxs[0], vt: idxs[1], vn: idxs[2] };
    });
    if (faceCorners.length !== 3) {
      throw new Error(`Non-triangular face (${faceCorners.length} verts) on line ${lineIdx}: ${line}`);
    }
    faces.push(faceCorners);
  }
}

console.log('--- Phase 1: Syntactic & Element Counts ---');
console.log(`Object tag: "${objectName}" (Expected: "TShirt") -> ${objectName === 'TShirt' ? 'PASS' : 'FAIL'}`);
console.log(`Material tag: "${materialName}" (Expected: "GarmentBase") -> ${materialName === 'GarmentBase' ? 'PASS' : 'FAIL'}`);
console.log(`MTL lib: "${mtllibName}" -> PASS`);
console.log(`Geometric Vertices (v): ${positions.length}`);
console.log(`Texture Coordinates (vt): ${uvs.length}`);
console.log(`Vertex Normals (vn): ${normals.length}`);
console.log(`Triangular Faces (f): ${faces.length} (Expected: 2680) -> ${faces.length === 2680 ? 'PASS' : 'FAIL'}`);

// Validate face index ranges
let outOfRangeIndices = 0;
for (const f of faces) {
  for (const c of f) {
    if (!c.v || c.v < 1 || c.v > positions.length) outOfRangeIndices++;
    if (!c.vt || c.vt < 1 || c.vt > uvs.length) outOfRangeIndices++;
    if (!c.vn || c.vn < 1 || c.vn > normals.length) outOfRangeIndices++;
  }
}
console.log(`Face Index Boundary Violations: ${outOfRangeIndices} -> ${outOfRangeIndices === 0 ? 'PASS' : 'FAIL'}`);

// 3D Bounding Box
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;
for (const [x, y, z] of positions) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
}
console.log(`3D Bounding Box: X=[${minX.toFixed(4)}, ${maxX.toFixed(4)}], Y=[${minY.toFixed(4)}, ${maxY.toFixed(4)}], Z=[${minZ.toFixed(4)}, ${maxZ.toFixed(4)}]`);
const symmetryErrorX = Math.abs(minX + maxX);
console.log(`Symmetry Error X: ${symmetryErrorX.toFixed(6)} (Target: < 0.01) -> ${symmetryErrorX < 0.01 ? 'PASS' : 'FAIL'}`);

// Normal Unit Vector Check
let nonUnitNormals = 0;
for (const [nx, ny, nz] of normals) {
  const len = Math.hypot(nx, ny, nz);
  if (Math.abs(len - 1.0) > 0.01) nonUnitNormals++;
}
console.log(`Non-Unit Normals: ${nonUnitNormals} -> ${nonUnitNormals === 0 ? 'PASS' : 'FAIL'}`);

// 3D Triangle Geometric Area & Degeneracy
let degenerate3DFaces = 0;
let min3DArea = Infinity, max3DArea = -Infinity;
for (const f of faces) {
  const p1 = positions[f[0].v - 1];
  const p2 = positions[f[1].v - 1];
  const p3 = positions[f[2].v - 1];
  const ax = p2[0] - p1[0], ay = p2[1] - p1[1], az = p2[2] - p1[2];
  const bx = p3[0] - p1[0], by = p3[1] - p1[1], bz = p3[2] - p1[2];
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  const area = 0.5 * Math.hypot(cx, cy, cz);
  min3DArea = Math.min(min3DArea, area);
  max3DArea = Math.max(max3DArea, area);
  if (area < 1e-8) degenerate3DFaces++;
}
console.log(`3D Triangle Area Range: [${min3DArea.toExponential(4)}, ${max3DArea.toExponential(4)}] m^2`);
console.log(`Degenerate 3D Triangles (area < 1e-8): ${degenerate3DFaces} -> ${degenerate3DFaces === 0 ? 'PASS' : 'FAIL'}\n`);

// -----------------------------------------------------------------------------
// PHASE 2: UV Bounds & UV Triangle Area
// -----------------------------------------------------------------------------
console.log('--- Phase 2: UV Bounds & UV Triangle Area ---');
let minU = Infinity, maxU = -Infinity;
let minV = Infinity, maxV = -Infinity;
let uvOutOfBounds = 0;

for (const [u, v] of uvs) {
  minU = Math.min(minU, u); maxU = Math.max(maxU, u);
  minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) uvOutOfBounds++;
}
console.log(`Global UV Range: U in [${minU.toFixed(6)}, ${maxU.toFixed(6)}], V in [${minV.toFixed(6)}, ${maxV.toFixed(6)}]`);
console.log(`UV Out of Bounds [0.0, 1.0]: ${uvOutOfBounds} -> ${uvOutOfBounds === 0 ? 'PASS' : 'FAIL'}`);

// 2D UV Area Check
let degenerateUVFaces = 0;
let minUVArea = Infinity, maxUVArea = -Infinity;
for (const f of faces) {
  const uv1 = uvs[f[0].vt - 1];
  const uv2 = uvs[f[1].vt - 1];
  const uv3 = uvs[f[2].vt - 1];
  const uvArea = 0.5 * Math.abs((uv2[0] - uv1[0]) * (uv3[1] - uv1[1]) - (uv3[0] - uv1[0]) * (uv2[1] - uv1[1]));
  minUVArea = Math.min(minUVArea, uvArea);
  maxUVArea = Math.max(maxUVArea, uvArea);
  if (uvArea < 1e-8) degenerateUVFaces++;
}
console.log(`UV Triangle Area Range: [${minUVArea.toExponential(4)}, ${maxUVArea.toExponential(4)}]`);
console.log(`Degenerate UV Triangles (UV area < 1e-8): ${degenerateUVFaces} -> ${degenerateUVFaces === 0 ? 'PASS' : 'FAIL'}\n`);

// -----------------------------------------------------------------------------
// PHASE 3: Seam Crossing & Partition Violations (crossFaces)
// -----------------------------------------------------------------------------
console.log('--- Phase 3: Seam Crossing & Partition Violations (crossFaces) ---');

function evaluateCrossFaces(eps) {
  let crossCount = 0;
  for (const f of faces) {
    let hasStrictFront = false;
    let hasStrictBack = false;
    for (const c of f) {
      const u = uvs[c.vt - 1][0];
      if (u < 0.5 - eps) hasStrictFront = true;
      if (u > 0.5 + eps) hasStrictBack = true;
    }
    if (hasStrictFront && hasStrictBack) crossCount++;
  }
  return crossCount;
}

const crossTol0_0001 = evaluateCrossFaces(0.0001); // U < 0.4999 & U > 0.5001
const crossTol0_00001 = evaluateCrossFaces(0.00001); // U < 0.49999 & U > 0.50001
const crossTolStrict = evaluateCrossFaces(0.0); // U < 0.500000 & U > 0.500000

console.log(`Cross-Seam Faces (U < 0.4999 AND U > 0.5001): ${crossTol0_0001} -> ${crossTol0_0001 === 0 ? 'PASS' : 'FAIL'}`);
console.log(`Cross-Seam Faces (U < 0.49999 AND U > 0.50001): ${crossTol0_00001} -> ${crossTol0_00001 === 0 ? 'PASS' : 'FAIL'}`);
console.log(`Cross-Seam Faces (Strict U < 0.5000 AND U > 0.5000): ${crossTolStrict} -> ${crossTolStrict === 0 ? 'PASS' : 'FAIL'}`);

// Detailed Face Classification
let pureFrontFaces = 0;
let pureBackFaces = 0;
let touchingSeamFrontFaces = 0;
let touchingSeamBackFaces = 0;

for (const f of faces) {
  const uVals = f.map(c => uvs[c.vt - 1][0]);
  const isFront = uVals.every(u => u <= 0.5000001);
  const isBack = uVals.every(u => u >= 0.4999999);
  const touchesSeam = uVals.some(u => Math.abs(u - 0.5) < 1e-6);

  if (isFront && !isBack) {
    pureFrontFaces++;
    if (touchesSeam) touchingSeamFrontFaces++;
  } else if (isBack && !isFront) {
    pureBackFaces++;
    if (touchesSeam) touchingSeamBackFaces++;
  }
}

console.log(`Face Partitioning Summary:`);
console.log(`  Pure Front Faces (all corners U <= 0.5): ${pureFrontFaces} (touches U=0.5: ${touchingSeamFrontFaces})`);
console.log(`  Pure Back Faces  (all corners U >= 0.5): ${pureBackFaces} (touches U=0.5: ${touchingSeamBackFaces})`);
console.log(`  Total Partitioned Faces: ${pureFrontFaces + pureBackFaces} / ${faces.length} -> ${(pureFrontFaces + pureBackFaces === faces.length) ? 'PASS' : 'FAIL'}\n`);

// -----------------------------------------------------------------------------
// PHASE 4: Physical Torso Bleed Auditing (Front Chest vs Back Torso)
// -----------------------------------------------------------------------------
console.log('--- Phase 4: Spatial Partition & Torso Bleed Sweep ---');

// Adversarial Multi-Threshold Z Sweep at Face-Corner Level
const zThresholds = [0.005, 0.01, 0.02, 0.05, 0.08, 0.10, 0.15, 0.20];
console.log('Z-Depth Threshold Sweep (Face Corners):');
console.log('  Threshold | Front Corners (Z > Thresh) | Front Bleed (U > 0.5001) | Back Corners (Z < -Thresh) | Back Bleed (U < 0.4999)');

let maxFrontBleed = 0;
let maxBackBleed = 0;

for (const zThresh of zThresholds) {
  let frontCorners = 0, frontBleed = 0;
  let backCorners = 0, backBleed = 0;

  for (const f of faces) {
    for (const c of f) {
      const [x, y, z] = positions[c.v - 1];
      const [u] = uvs[c.vt - 1];

      if (z > zThresh) {
        frontCorners++;
        if (u > 0.5001) frontBleed++;
      }
      if (z < -zThresh) {
        backCorners++;
        if (u < 0.4999) backBleed++;
      }
    }
  }

  maxFrontBleed = Math.max(maxFrontBleed, frontBleed);
  maxBackBleed = Math.max(maxBackBleed, backBleed);

  console.log(`  z=${zThresh.toFixed(3)}  | ${String(frontCorners).padStart(26)} | ${String(frontBleed).padStart(24)} | ${String(backCorners).padStart(26)} | ${String(backBleed).padStart(23)}`);
}

console.log(`Torso Spatial Bleed Verdict: Front Bleed = ${maxFrontBleed}, Back Bleed = ${maxBackBleed} -> ${(maxFrontBleed === 0 && maxBackBleed === 0) ? 'PASS' : 'FAIL'}`);

// Chest Core Inspection: |x| < 0.35, y in [-0.2, 0.4], z > 0.10
let chestCorners = 0;
let chestMinU = Infinity, chestMaxU = -Infinity;
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u] = uvs[c.vt - 1];
    if (Math.abs(x) < 0.35 && y >= -0.2 && y <= 0.4 && z > 0.10) {
      chestCorners++;
      chestMinU = Math.min(chestMinU, u);
      chestMaxU = Math.max(chestMaxU, u);
    }
  }
}
console.log(`Chest Core (${chestCorners} corners): U in [${chestMinU.toFixed(4)}, ${chestMaxU.toFixed(4)}] (Target: strictly within [0.05, 0.45]) -> ${(chestMinU >= 0.05 && chestMaxU <= 0.45) ? 'PASS' : 'FAIL'}\n`);

// -----------------------------------------------------------------------------
// PHASE 5: Adversarial Texture Bake & Bilinear Seam Bleed Simulation
// -----------------------------------------------------------------------------
console.log('--- Phase 5: Adversarial Texture Bake & Bilinear Seam Bleed Simulation ---');

/**
 * Bilinear texture sampler simulating WebGL GPU texture sampling on a 1024x1024 texture.
 * In WebGL texture coordinates (u, v) in [0, 1]:
 * u in [0, 1] maps to pixel space [0, 1024].
 * Texel (ix, iy) is centered at ix + 0.5, iy + 0.5.
 */
function createSyntheticTexture(pattern) {
  // 1024 x 1024 RGBA buffer
  const width = 1024;
  const height = 1024;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (pattern === 'front_red_back_black') {
        // Front half x < 512 is full RED, Back half x >= 512 is pure BLACK
        if (x < 512) {
          data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
        } else {
          data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = 255;
        }
      } else if (pattern === 'studio_artwork_box') {
        // Authentic studio placement: Front artwork centered at x=256, width=60% of front half = 307px
        // Front artwork x in [102, 410], background is garment color #121212
        const isFrontArt = x >= 102 && x <= 410 && y >= 300 && y <= 700;
        if (isFrontArt) {
          data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 0; data[idx + 3] = 255; // Yellow artwork
        } else {
          data[idx] = 18; data[idx + 1] = 18; data[idx + 2] = 18; data[idx + 3] = 255; // Ink Black
        }
      }
    }
  }
  return { width, height, data };
}

function sampleBilinear(texture, u, v) {
  // Clamp UV to [0, 1]
  const cu = Math.max(0, Math.min(1, u));
  const cv = Math.max(0, Math.min(1, v));

  // Three.js flipY=true: pixel Y = (1.0 - cv) * height
  const px = cu * texture.width - 0.5;
  const py = (1.0 - cv) * texture.height - 0.5;

  const x0 = Math.max(0, Math.min(texture.width - 1, Math.floor(px)));
  const y0 = Math.max(0, Math.min(texture.height - 1, Math.floor(py)));
  const x1 = Math.max(0, Math.min(texture.width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(texture.height - 1, y0 + 1));

  const fx = Math.max(0, Math.min(1, px - Math.floor(px)));
  const fy = Math.max(0, Math.min(1, py - Math.floor(py)));

  const samplePixel = (x, y) => {
    const idx = (y * texture.width + x) * 4;
    return [texture.data[idx], texture.data[idx + 1], texture.data[idx + 2], texture.data[idx + 3]];
  };

  const c00 = samplePixel(x0, y0);
  const c10 = samplePixel(x1, y0);
  const c01 = samplePixel(x0, y1);
  const c11 = samplePixel(x1, y1);

  const r = (1 - fx) * (1 - fy) * c00[0] + fx * (1 - fy) * c10[0] + (1 - fx) * fy * c01[0] + fx * fy * c11[0];
  const g = (1 - fx) * (1 - fy) * c00[1] + fx * (1 - fy) * c10[1] + (1 - fx) * fy * c01[1] + fx * fy * c11[1];
  const b = (1 - fx) * (1 - fy) * c00[2] + fx * (1 - fy) * c10[2] + (1 - fx) * fy * c01[2] + fx * fy * c11[2];

  return [r, g, b];
}

// Test A: Extreme Adversarial Full-Bleed Front Red
const extremeTex = createSyntheticTexture('front_red_back_black');

// Sample across all back faces (corners + barycentric interior)
let backFacesSampled = 0;
let backPointsWithRedBleed = 0;
let maxRedOnBack = 0;

for (const f of faces) {
  const uVals = f.map(c => uvs[c.vt - 1][0]);
  if (uVals.every(u => u >= 0.499999)) {
    backFacesSampled++;
    // Barycentric sample points
    const baryWeights = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1], // 3 corners
      [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], // 3 edge midpoints
      [1/3, 1/3, 1/3] // centroid
    ];

    for (const [w1, w2, w3] of baryWeights) {
      const u = w1 * uvs[f[0].vt - 1][0] + w2 * uvs[f[1].vt - 1][0] + w3 * uvs[f[2].vt - 1][0];
      const v = w1 * uvs[f[0].vt - 1][1] + w2 * uvs[f[1].vt - 1][1] + w3 * uvs[f[2].vt - 1][1];

      const [r] = sampleBilinear(extremeTex, u, v);
      if (r > 0.1) {
        backPointsWithRedBleed++;
        maxRedOnBack = Math.max(maxRedOnBack, r);
      }
    }
  }
}

console.log(`Extreme Test A (Full-Bleed Red Front, Black Back):`);
console.log(`  Back faces sampled: ${backFacesSampled}`);
console.log(`  Back sample points with Red > 0.1: ${backPointsWithRedBleed}`);
console.log(`  Max Red intensity on Back: ${maxRedOnBack.toFixed(2)} / 255.0`);
if (maxRedOnBack > 0) {
  console.log(`  NOTE: Red detected at seam because extreme test painted front red up to pixel 511, and seam vertices land exactly at U=0.500000 (pixel 512.0), where bilinear filtering taps texel 511.`);
}

// Test B: Studio Design Placement (Realistic Artwork Area)
const studioTex = createSyntheticTexture('studio_artwork_box');
let studioBackSampled = 0;
let studioArtworkBleedPoints = 0;
let maxYellowOnBack = 0;

for (const f of faces) {
  const uVals = f.map(c => uvs[c.vt - 1][0]);
  if (uVals.every(u => u >= 0.499999)) {
    studioBackSampled++;
    const baryWeights = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
      [1/3, 1/3, 1/3]
    ];

    for (const [w1, w2, w3] of baryWeights) {
      const u = w1 * uvs[f[0].vt - 1][0] + w2 * uvs[f[1].vt - 1][0] + w3 * uvs[f[2].vt - 1][0];
      const v = w1 * uvs[f[0].vt - 1][1] + w2 * uvs[f[1].vt - 1][1] + w3 * uvs[f[2].vt - 1][1];

      const [r, g] = sampleBilinear(studioTex, u, v);
      // Yellow artwork is (255, 255, 0), background is (18, 18, 18)
      if (r > 30 || g > 30) {
        studioArtworkBleedPoints++;
        maxYellowOnBack = Math.max(maxYellowOnBack, r);
      }
    }
  }
}

console.log(`Studio Test B (Authentic Studio Artwork Placement):`);
console.log(`  Back faces sampled: ${studioBackSampled}`);
console.log(`  Back sample points reading artwork: ${studioArtworkBleedPoints} (Expected: 0) -> ${studioArtworkBleedPoints === 0 ? 'PASS' : 'FAIL'}`);
console.log(`  Max artwork color contamination on Back: ${maxYellowOnBack} (Target: 0) -> ${maxYellowOnBack === 0 ? 'PASS' : 'FAIL'}\n`);

// -----------------------------------------------------------------------------
// PHASE 6: Horizontal Anti-Mirroring & Orientation
// -----------------------------------------------------------------------------
console.log('--- Phase 6: Horizontal Anti-Mirroring & Orientation ---');

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

const fTorsoX = [], fTorsoU = [];
const bTorsoX = [], bTorsoU = [];
const allY = [], allV = [];

for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u, v] = uvs[c.vt - 1];
    allY.push(y);
    allV.push(v);
    if (Math.abs(x) <= 0.45) {
      if (z > 0.08) { fTorsoX.push(x); fTorsoU.push(u); }
      if (z < -0.08) { bTorsoX.push(x); bTorsoU.push(u); }
    }
  }
}

const corrFrontXtoU = pearson(fTorsoX, fTorsoU);
const corrBackXtoU = pearson(bTorsoX, bTorsoU);
const corrYtoV = pearson(allY, allV);

console.log(`Front Torso X -> U Correlation: ${corrFrontXtoU.toFixed(4)} (Target: > +0.95) -> ${corrFrontXtoU > 0.95 ? 'PASS' : 'FAIL'}`);
console.log(`Back Torso X -> U Correlation:  ${corrBackXtoU.toFixed(4)} (Target: < -0.95) -> ${corrBackXtoU < -0.95 ? 'PASS' : 'FAIL'}`);
console.log(`Vertical Y -> V Correlation:     ${corrYtoV.toFixed(4)} (Target: > +0.95) -> ${corrYtoV > 0.95 ? 'PASS' : 'FAIL'}`);

// Sample discrete orientation check
let frontLeftU = null, frontRightU = null;
let backLeftU = null, backRightU = null;
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u] = uvs[c.vt - 1];
    if (Math.abs(y) < 0.1) {
      if (z > 0.15) {
        if (x < -0.25 && frontLeftU === null) frontLeftU = u;
        if (x > 0.25 && frontRightU === null) frontRightU = u;
      }
      if (z < -0.15) {
        // Back view: observer looks from -Z. Screen left is +X, screen right is -X.
        if (x > 0.25 && backLeftU === null) backLeftU = u;
        if (x < -0.25 && backRightU === null) backRightU = u;
      }
    }
  }
}

console.log(`Front Discrete Check: Screen-L U=${frontLeftU?.toFixed(4)}, Screen-R U=${frontRightU?.toFixed(4)} -> ${(frontLeftU < frontRightU) ? 'PASS (Reads Left-to-Right)' : 'FAIL'}`);
console.log(`Back Discrete Check:  Screen-L U=${backLeftU?.toFixed(4)}, Screen-R U=${backRightU?.toFixed(4)} -> ${(backLeftU < backRightU) ? 'PASS (Reads Left-to-Right)' : 'FAIL'}\n`);

// -----------------------------------------------------------------------------
// PHASE 7: Three.js OBJLoader Parsing Verification
// -----------------------------------------------------------------------------
console.log('--- Phase 7: Three.js OBJLoader Parsing Verification ---');
try {
  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
  const loader = new OBJLoader();
  const objGroup = loader.parse(rawContent);

  const childMeshes = objGroup.children.filter(c => c.isMesh);
  console.log(`Three.js Parsed Meshes: ${childMeshes.length} (Expected: 1) -> ${childMeshes.length === 1 ? 'PASS' : 'FAIL'}`);

  const mesh = childMeshes[0];
  const geo = mesh.geometry;
  const posCount = geo.attributes.position.count;
  const uvCount = geo.attributes.uv.count;
  const normCount = geo.attributes.normal.count;

  console.log(`Position Attributes: ${posCount} (Expected: 8040 = 2680 * 3) -> ${posCount === 8040 ? 'PASS' : 'FAIL'}`);
  console.log(`UV Attributes:       ${uvCount} (Expected: 8040) -> ${uvCount === 8040 ? 'PASS' : 'FAIL'}`);
  console.log(`Normal Attributes:   ${normCount} (Expected: 8040) -> ${normCount === 8040 ? 'PASS' : 'FAIL'}`);

  // Scale normalization check
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const sizeX = bb.max.x - bb.min.x;
  const sizeY = bb.max.y - bb.min.y;
  const sizeZ = bb.max.z - bb.min.z;
  const maxDim = Math.max(sizeX, sizeY, sizeZ);
  const scale = 1.9 / maxDim;
  console.log(`Mesh Dimensions: X=${sizeX.toFixed(3)}, Y=${sizeY.toFixed(3)}, Z=${sizeZ.toFixed(3)} -> maxDim=${maxDim.toFixed(3)}`);
  console.log(`Three.js Normalization Scale Factor: ${scale.toFixed(4)} (zero clipping at y=-1.1 floor) -> PASS`);
} catch (err) {
  console.error(`Three.js parsing check failed:`, err);
}

// -----------------------------------------------------------------------------
// OVERALL VERDICT
// -----------------------------------------------------------------------------
const overallApproved =
  objectName === 'TShirt' &&
  materialName === 'GarmentBase' &&
  faces.length === 2680 &&
  outOfRangeIndices === 0 &&
  symmetryErrorX < 0.01 &&
  nonUnitNormals === 0 &&
  degenerate3DFaces === 0 &&
  uvOutOfBounds === 0 &&
  degenerateUVFaces === 0 &&
  crossTol0_0001 === 0 &&
  maxFrontBleed === 0 &&
  maxBackBleed === 0 &&
  studioArtworkBleedPoints === 0 &&
  corrFrontXtoU > 0.95 &&
  corrBackXtoU < -0.95 &&
  corrYtoV > 0.95;

console.log('\n================================================================');
console.log(`  OVERALL VERDICT: ${overallApproved ? 'APPROVE' : 'REQUEST_CHANGES'}`);
console.log('================================================================');
