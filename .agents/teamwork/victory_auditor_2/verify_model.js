const fs = require('fs');

const content = fs.readFileSync('public/models/tshirt.obj', 'utf8');
const lines = content.split(/\r?\n/);

const positions = []; // 1-indexed
const uvs = [];       // 1-indexed
const normals = [];   // 1-indexed
const faces = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  const type = parts[0];
  if (type === 'v') {
    positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
  } else if (type === 'vt') {
    uvs.push([parseFloat(parts[1]), parseFloat(parts[2])]);
  } else if (type === 'vn') {
    normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
  } else if (type === 'f') {
    faces.push(parts.slice(1).map(p => {
      const idxs = p.split('/').map(s => s ? parseInt(s, 10) : null);
      return { v: idxs[0], vt: idxs[1], vn: idxs[2] };
    }));
  }
}

console.log('--- ELEMENT COUNTS ---');
console.log('Vertices (v):', positions.length);
console.log('UVs (vt):', uvs.length);
console.log('Normals (vn):', normals.length);
console.log('Faces (f):', faces.length);

// Check 1-based indexing
let invalidV = 0, invalidVt = 0, invalidVn = 0, nonTriangle = 0;
for (const f of faces) {
  if (f.length !== 3) nonTriangle++;
  for (const c of f) {
    if (c.v < 1 || c.v > positions.length) invalidV++;
    if (c.vt < 1 || c.vt > uvs.length) invalidVt++;
    if (c.vn < 1 || c.vn > normals.length) invalidVn++;
  }
}
console.log('Index validation:', { invalidV, invalidVt, invalidVn, nonTriangle });

// Bounds
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;
for (const [x, y, z] of positions) {
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
}
console.log('--- 3D BOUNDS ---');
console.log({ minX, maxX, minY, maxY, minZ, maxZ, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ });

// Degenerate triangles (area calculation)
let minArea = Infinity, maxArea = -Infinity, zeroAreaCount = 0;
for (const f of faces) {
  const p1 = positions[f[0].v - 1];
  const p2 = positions[f[1].v - 1];
  const p3 = positions[f[2].v - 1];
  const ax = p2[0] - p1[0], ay = p2[1] - p1[1], az = p2[2] - p1[2];
  const bx = p3[0] - p1[0], by = p3[1] - p1[1], bz = p3[2] - p1[2];
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (area < 1e-7) zeroAreaCount++;
  if (area < minArea) minArea = area;
  if (area > maxArea) maxArea = area;
}
console.log('--- TRIANGLE AREA ---');
console.log({ minArea, maxArea, zeroAreaCount });

// Cross faces across U=0.5
let crossFaces = 0;
let frontFaces = 0;
let backFaces = 0;
let minU = Infinity, maxU = -Infinity;
let minV = Infinity, maxV = -Infinity;

for (const [u, v] of uvs) {
  if (u < minU) minU = u; if (u > maxU) maxU = u;
  if (v < minV) minV = v; if (v > maxV) maxV = v;
}

for (const f of faces) {
  const uVals = f.map(c => uvs[c.vt - 1][0]);
  const fMinU = Math.min(...uVals);
  const fMaxU = Math.max(...uVals);
  if (fMinU < 0.49999 && fMaxU > 0.50001) {
    crossFaces++;
  } else if (fMaxU <= 0.50001) {
    frontFaces++;
  } else if (fMinU >= 0.49999) {
    backFaces++;
  }
}
console.log('--- UV DISTRIBUTION ---');
console.log({ minU, maxU, minV, maxV, frontFaces, backFaces, crossFaces, total: frontFaces + backFaces });

// Seam Bleed & Physical Torso Alignment
let frontTorsoVerts = 0, frontBleed = 0;
let backTorsoVerts = 0, backBleed = 0;

for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u, v] = uvs[c.vt - 1];
    if (Math.abs(x) <= 0.52) {
      if (z > 0.02) {
        frontTorsoVerts++;
        if (u >= 0.5) frontBleed++;
      } else if (z < -0.02) {
        backTorsoVerts++;
        if (u < 0.5) backBleed++;
      }
    }
  }
}
console.log('--- TORSO BLEED CHECK ---');
console.log({ frontTorsoVerts, frontBleed, backTorsoVerts, backBleed });

// Topology: Boundary edges, non-manifold edges, loose vertices
const edgeMap = new Map();
const referencedV = new Set();
for (const f of faces) {
  for (let i = 0; i < 3; i++) {
    referencedV.add(f[i].v);
    const vA = f[i].v;
    const vB = f[(i + 1) % 3].v;
    const key = vA < vB ? `${vA}_${vB}` : `${vB}_${vA}`;
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  }
}

let boundaryEdges = 0, nonManifoldEdges = 0, manifoldEdges = 0;
for (const count of edgeMap.values()) {
  if (count === 1) boundaryEdges++;
  else if (count === 2) manifoldEdges++;
  else nonManifoldEdges++;
}
const looseVerts = positions.length - referencedV.size;
console.log('--- TOPOLOGY INTEGRITY ---');
console.log({ totalEdges: edgeMap.size, boundaryEdges, manifoldEdges, nonManifoldEdges, looseVerts });

// Anti-mirroring verification
let frontLeftU = null, frontRightU = null;
let backLeftU = null, backRightU = null;
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u, v] = uvs[c.vt - 1];
    if (Math.abs(y) < 0.1) {
      if (z > 0.1) {
        if (x < -0.3 && frontLeftU === null) frontLeftU = u;
        if (x > 0.3 && frontRightU === null) frontRightU = u;
      } else if (z < -0.1) {
        if (x > 0.3 && backLeftU === null) backLeftU = u;
        if (x < -0.3 && backRightU === null) backRightU = u;
      }
    }
  }
}
console.log('--- ANTI-MIRRORING ---');
console.log({ frontLeftU, frontRightU, backLeftU, backRightU });
console.log('Front Left < Front Right:', frontLeftU < frontRightU);
console.log('Back Left < Back Right:', backLeftU < backRightU);
