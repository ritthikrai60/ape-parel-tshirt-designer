/**
 * scripts/verify_obj_empirical.mjs
 * Comprehensive Empirical Stress-Test & Forensic Verification Suite
 * for public/models/tshirt.obj
 */
import fs from 'fs';
import path from 'path';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
if (!fs.existsSync(objPath)) {
  console.error(`ERROR: File not found: ${objPath}`);
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

let lineNum = 0;
for (const line of lines) {
  lineNum++;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const parts = trimmed.split(/\s+/);
  const type = parts[0];

  if (type === 'o') {
    objectName = parts[1];
  } else if (type === 'usemtl') {
    materialName = parts[1];
  } else if (type === 'v') {
    const coords = parts.slice(1).map(Number);
    if (coords.length !== 3 || coords.some(n => !Number.isFinite(n))) {
      throw new Error(`Malformed v on line ${lineNum}: ${line}`);
    }
    positions.push(coords);
  } else if (type === 'vt') {
    const coords = parts.slice(1).map(Number);
    if (coords.length < 2 || coords.slice(0, 2).some(n => !Number.isFinite(n))) {
      throw new Error(`Malformed vt on line ${lineNum}: ${line}`);
    }
    uvs.push([coords[0], coords[1]]);
  } else if (type === 'vn') {
    const coords = parts.slice(1).map(Number);
    if (coords.length !== 3 || coords.some(n => !Number.isFinite(n))) {
      throw new Error(`Malformed vn on line ${lineNum}: ${line}`);
    }
    normals.push(coords);
  } else if (type === 'f') {
    const faceVerts = parts.slice(1).map(p => {
      const idxs = p.split('/').map(x => (x ? parseInt(x, 10) : null));
      return { v: idxs[0], vt: idxs[1], vn: idxs[2] };
    });
    if (faceVerts.length !== 3) {
      throw new Error(`Non-triangular face on line ${lineNum}: ${line}`);
    }
    for (const fv of faceVerts) {
      if (!fv.v || fv.v < 1 || fv.v > positions.length) {
        throw new Error(`Out-of-bounds v index ${fv.v} on line ${lineNum}`);
      }
      if (!fv.vt || fv.vt < 1 || fv.vt > uvs.length) {
        throw new Error(`Out-of-bounds vt index ${fv.vt} on line ${lineNum}`);
      }
      if (!fv.vn || fv.vn < 1 || fv.vn > normals.length) {
        throw new Error(`Out-of-bounds vn index ${fv.vn} on line ${lineNum}`);
      }
    }
    faces.push(faceVerts);
  }
}

// 1. Structure Verification
const headerPass = objectName === 'TShirt' && materialName === 'GarmentBase';
const vertexCount = positions.length;
const uvCount = uvs.length;
const normalCount = normals.length;
const faceCount = faces.length;

// Check 1:1 index correspondence in faces
let nonMatchingFaceIndices = 0;
for (const f of faces) {
  for (const vert of f) {
    if (vert.v !== vert.vt || vert.v !== vert.vn) {
      nonMatchingFaceIndices++;
    }
  }
}

// 2. 3D Bounding Box & Normals
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (const [x, y, z] of positions) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
}

let nonUnitNormals = 0;
for (const [nx, ny, nz] of normals) {
  const len = Math.hypot(nx, ny, nz);
  if (Math.abs(len - 1.0) > 0.01) nonUnitNormals++;
}

// 3. UV Ranges
let minU = Infinity, maxU = -Infinity;
let minV = Infinity, maxV = -Infinity;
let uvOutOfBounds = 0;

for (const [u, v] of uvs) {
  minU = Math.min(minU, u); maxU = Math.max(maxU, u);
  minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) {
    uvOutOfBounds++;
  }
}

// 4. Face-Level Seam Crossing Verification (crossFaces)
let crossFaces = 0;
let pureFrontFaces = 0;
let pureBackFaces = 0;
let seamOnlyFaces = 0;

for (const f of faces) {
  let hasStrictFront = false;
  let hasStrictBack = false;
  let allSeam = true;

  for (const vert of f) {
    const [u] = uvs[vert.vt - 1];
    if (u < 0.4999) {
      hasStrictFront = true;
      allSeam = false;
    } else if (u > 0.5001) {
      hasStrictBack = true;
      allSeam = false;
    }
  }

  if (hasStrictFront && hasStrictBack) {
    crossFaces++;
  } else if (hasStrictFront && !hasStrictBack) {
    pureFrontFaces++;
  } else if (!hasStrictFront && hasStrictBack) {
    pureBackFaces++;
  } else if (allSeam) {
    seamOnlyFaces++;
  }
}

// 5. Front and Back Torso Bleed Auditing (Index-wise & Face-corner-wise)
let frontBleed = 0;
let backBleed = 0;

for (let i = 0; i < positions.length && i < uvs.length; i++) {
  const [x, y, z] = positions[i];
  const [u] = uvs[i];
  if (z > 0.08 && u > 0.501) frontBleed++;
  if (z < -0.08 && u < 0.499) backBleed++;
}

// Face-corner level check
let faceFrontBleed = 0;
let faceBackBleed = 0;
for (const f of faces) {
  for (const vert of f) {
    const [x, y, z] = positions[vert.v - 1];
    const [u] = uvs[vert.vt - 1];
    if (z > 0.08 && u > 0.501) faceFrontBleed++;
    if (z < -0.08 && u < 0.499) faceBackBleed++;
  }
}

// Adversarial multi-threshold bleed sweep
const bleedSweep = [];
for (const zThresh of [0.02, 0.05, 0.08, 0.10, 0.15, 0.20]) {
  let fBleed = 0;
  let bBleed = 0;
  for (let i = 0; i < positions.length; i++) {
    const [x, y, z] = positions[i];
    const [u] = uvs[i];
    if (z > zThresh && u > 0.5001) fBleed++;
    if (z < -zThresh && u < 0.4999) bBleed++;
  }
  bleedSweep.push({ zThresh, fBleed, bBleed });
}

// 6. Anti-Mirroring Verification
// Method A: Discrete sample points at chest level
let frontLeftU = null, frontRightU = null;
let backLeftU = null, backRightU = null;

for (let i = 0; i < positions.length; i++) {
  const [x, y, z] = positions[i];
  const [u] = uvs[i];
  if (Math.abs(y) < 0.2) {
    if (z > 0.1) {
      if (x < -0.3 && frontLeftU === null) frontLeftU = u;
      if (x > 0.3 && frontRightU === null) frontRightU = u;
    } else if (z < -0.1) {
      if (x > 0.3 && backLeftU === null) backLeftU = u;
      if (x < -0.3 && backRightU === null) backRightU = u;
    }
  }
}

const sampleAntiMirrorPass =
  frontLeftU !== null &&
  frontRightU !== null &&
  backLeftU !== null &&
  backRightU !== null &&
  frontLeftU < frontRightU &&
  backLeftU < backRightU;

// Method B: Statistical Pearson Correlation
function pearsonCorrelation(xs, ys) {
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

// Torso components (|x| <= 0.52)
const fTorsoX = [], fTorsoU = [];
const bTorsoX = [], bTorsoU = [];
// Sleeve components (|x| > 0.52)
const fSleeveX = [], fSleeveU = [];
const bSleeveX = [], bSleeveU = [];
// Vertical
const allY = [], allV = [];

for (let i = 0; i < positions.length; i++) {
  const [x, y, z] = positions[i];
  const [u, v] = uvs[i];
  allY.push(y);
  allV.push(v);
  if (Math.abs(x) <= 0.52) {
    if (z > 0.08) { fTorsoX.push(x); fTorsoU.push(u); }
    if (z < -0.08) { bTorsoX.push(x); bTorsoU.push(u); }
  } else {
    if (z > 0.08) { fSleeveX.push(x); fSleeveU.push(u); }
    if (z < -0.08) { bSleeveX.push(x); bSleeveU.push(u); }
  }
}

const corrTorsoFrontXtoU = pearsonCorrelation(fTorsoX, fTorsoU);
const corrTorsoBackXtoU = pearsonCorrelation(bTorsoX, bTorsoU);
const corrSleeveFrontXtoU = pearsonCorrelation(fSleeveX, fSleeveU);
const corrSleeveBackXtoU = pearsonCorrelation(bSleeveX, bSleeveU);
const corrYtoV = pearsonCorrelation(allY, allV);

const statisticalAntiMirrorPass =
  corrTorsoFrontXtoU > 0.95 &&
  corrTorsoBackXtoU < -0.95 &&
  corrSleeveFrontXtoU > 0.90 &&
  corrSleeveBackXtoU < -0.90 &&
  corrYtoV > 0.90;

// 7. Degenerate Faces Check
let degenerateFaces = 0;
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
  if (area < 1e-8) degenerateFaces++;
}

const isApproved =
  headerPass &&
  vertexCount === 1490 &&
  uvCount === 1490 &&
  faceCount === 2524 &&
  nonMatchingFaceIndices === 0 &&
  nonUnitNormals === 0 &&
  uvOutOfBounds === 0 &&
  crossFaces === 0 &&
  frontBleed === 0 &&
  backBleed === 0 &&
  faceFrontBleed === 0 &&
  faceBackBleed === 0 &&
  sampleAntiMirrorPass &&
  statisticalAntiMirrorPass &&
  degenerateFaces === 0;

const summary = {
  header: { objectName, materialName, headerPass },
  counts: {
    vertices: vertexCount,
    uvs: uvCount,
    normals: normalCount,
    faces: faceCount,
    nonMatchingFaceIndices,
  },
  boundingBox: {
    x: [minX, maxX],
    y: [minY, maxY],
    z: [minZ, maxZ],
    spanX: maxX - minX,
    spanY: maxY - minY,
    spanZ: maxZ - minZ,
    symmetryErrorX: Math.abs(minX + maxX),
  },
  normalsSanity: { nonUnitNormals },
  uvBounds: {
    minU, maxU, minV, maxV,
    uvOutOfBounds,
  },
  seamCrossingFaces: {
    crossFaces,
    pureFrontFaces,
    pureBackFaces,
    seamOnlyFaces,
    totalFaces: faceCount,
  },
  bleedAudit: {
    frontBleed,
    backBleed,
    faceFrontBleed,
    faceBackBleed,
    bleedSweep,
  },
  antiMirroring: {
    sampleCheck: {
      frontLeftU,
      frontRightU,
      backLeftU,
      backRightU,
      sampleAntiMirrorPass,
    },
    statisticalCorrelation: {
      torso: {
        frontCount: fTorsoX.length,
        corrTorsoFrontXtoU,
        backCount: bTorsoX.length,
        corrTorsoBackXtoU,
      },
      sleeves: {
        frontCount: fSleeveX.length,
        corrSleeveFrontXtoU,
        backCount: bSleeveX.length,
        corrSleeveBackXtoU,
      },
      vertical: {
        totalVertices: allY.length,
        corrYtoV,
      },
      statisticalAntiMirrorPass,
    },
  },
  geometrySanity: { degenerateFaces },
  OVERALL_VERDICT: isApproved ? 'APPROVE' : 'REQUEST_CHANGES',
};

console.log(JSON.stringify(summary, null, 2));
