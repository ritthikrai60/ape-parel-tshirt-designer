import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const objPath = path.resolve('public/models/tshirt.obj');
const content = fs.readFileSync(objPath, 'utf8');
const lines = content.split('\n');

const positions = [];
const uvs = [];
const normals = [];
const faces = [];

let oName = '';
let mtllib = '';
let usemtl = '';

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('o ')) oName = trimmed.slice(2).trim();
  else if (trimmed.startsWith('mtllib ')) mtllib = trimmed.slice(7).trim();
  else if (trimmed.startsWith('usemtl ')) usemtl = trimmed.slice(7).trim();
  else if (trimmed.startsWith('v ')) {
    positions.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('vt ')) {
    uvs.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('vn ')) {
    normals.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('f ')) {
    faces.push(trimmed.split(/\s+/).slice(1));
  }
}

console.log('--- OBJ Header & Metadata ---');
console.log(`Object name: ${oName}`);
console.log(`MTL lib: ${mtllib}`);
console.log(`Material: ${usemtl}`);
console.log(`Vertices (v): ${positions.length}`);
console.log(`UVs (vt): ${uvs.length}`);
console.log(`Normals (vn): ${normals.length}`);
console.log(`Faces (f): ${faces.length}`);

// Check quads vs tris
const nonTris = faces.filter(f => f.length !== 3);
console.log(`Non-triangular faces: ${nonTris.length}`);

// Compute bounds
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (const [x, y, z] of positions) {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
}
console.log(`Bounds X: [${minX.toFixed(4)}, ${maxX.toFixed(4)}], Y: [${minY.toFixed(4)}, ${maxY.toFixed(4)}], Z: [${minZ.toFixed(4)}, ${maxZ.toFixed(4)}]`);

// Check UV partitions and zero crossing
let crossFaces = 0;
let frontMaxU = -Infinity, frontMinU = Infinity;
let backMaxU = -Infinity, backMinU = Infinity;

for (const f of faces) {
  const faceUs = f.map(p => {
    const vtIdx = parseInt(p.split('/')[1], 10);
    return uvs[vtIdx - 1][0];
  });
  const hasFront = faceUs.some(u => u < 0.5);
  const hasBack = faceUs.some(u => u >= 0.5);
  if (hasFront && hasBack) crossFaces++;

  for (const u of faceUs) {
    if (u < 0.5) {
      frontMaxU = Math.max(frontMaxU, u);
      frontMinU = Math.min(frontMinU, u);
    } else {
      backMaxU = Math.max(backMaxU, u);
      backMinU = Math.min(backMinU, u);
    }
  }
}

console.log('--- UV Partitions & Crossing ---');
console.log(`Cross faces across U = 0.50: ${crossFaces}`);
console.log(`Front partition U range: [${frontMinU.toFixed(6)}, ${frontMaxU.toFixed(6)}]`);
console.log(`Back partition U range: [${backMinU.toFixed(6)}, ${backMaxU.toFixed(6)}]`);
console.log(`Buffer gutter: ${(backMinU - frontMaxU).toFixed(6)}`);

// Anti-mirroring
let viewerLeftU = null;
let viewerRightU = null;
for (const f of faces) {
  for (const p of f) {
    const [vIdx, vtIdx] = p.split('/').map(Number);
    const [x, y, z] = positions[vIdx - 1];
    const [u] = uvs[vtIdx - 1];
    if (z < -0.1 && Math.abs(y) < 0.1) {
      if (x > 0.3 && viewerLeftU === null) viewerLeftU = u;
      if (x < -0.3 && viewerRightU === null) viewerRightU = u;
    }
  }
}
console.log(`Back viewer-left (+X) U: ${viewerLeftU}, viewer-right (-X) U: ${viewerRightU}`);
console.log(`Anti-mirroring (viewerLeftU < viewerRightU): ${viewerLeftU < viewerRightU}`);

// Anatomical Sternum
const sternumSamples = [];
for (const f of faces) {
  for (const p of f) {
    const [vIdx, vtIdx] = p.split('/').map(Number);
    const [x, y, z] = positions[vIdx - 1];
    const [u, v] = uvs[vtIdx - 1];
    if (Math.abs(x) < 0.05 && Math.abs(y - 0.25) < 0.05 && z > 0.15) {
      sternumSamples.push({ u, v, x, y, z });
    }
  }
}
const avgSternumU = sternumSamples.reduce((s, c) => s + c.u, 0) / sternumSamples.length;
const avgSternumV = sternumSamples.reduce((s, c) => s + c.v, 0) / sternumSamples.length;
console.log(`Sternum samples: ${sternumSamples.length}, avgU: ${avgSternumU.toFixed(4)}, avgV: ${avgSternumV.toFixed(4)}`);

// Bottom hem
let hemCount = 0;
let maxHemV = -Infinity;
for (const f of faces) {
  for (const p of f) {
    const [vIdx, vtIdx] = p.split('/').map(Number);
    const [, y] = positions[vIdx - 1];
    const [, v] = uvs[vtIdx - 1];
    if (y < -0.80) {
      hemCount++;
      maxHemV = Math.max(maxHemV, v);
    }
  }
}
console.log(`Hem samples (y < -0.80): ${hemCount}, max V: ${maxHemV.toFixed(4)}`);

// Sleeves
let frontSleeveCount = 0, rearSleeveCount = 0;
let frontSleeveMaxU = -Infinity, rearSleeveMinU = Infinity;
for (const f of faces) {
  const corners = f;
  const vIdxs = corners.map(p => parseInt(p.split('/')[0], 10) - 1);
  const vtIdxs = corners.map(p => parseInt(p.split('/')[1], 10) - 1);
  const pts = vIdxs.map(idx => positions[idx]);
  const centroidX = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;

  if (Math.abs(centroidX) > 0.5) {
    const p0 = pts[0], p1 = pts[1], p2 = pts[2];
    const fnZ = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
    for (const vtIdx of vtIdxs) {
      const u = uvs[vtIdx][0];
      if (fnZ >= 0) {
        frontSleeveCount++;
        frontSleeveMaxU = Math.max(frontSleeveMaxU, u);
      } else {
        rearSleeveCount++;
        rearSleeveMinU = Math.min(rearSleeveMinU, u);
      }
    }
  }
}
console.log(`Front sleeve corners: ${frontSleeveCount}, maxU: ${frontSleeveMaxU.toFixed(4)}`);
console.log(`Rear sleeve corners: ${rearSleeveCount}, minU: ${rearSleeveMinU.toFixed(4)}`);

// Three.js OBJLoader simulation
const loader = new OBJLoader();
const obj = loader.parse(content);
const box = new THREE.Box3().setFromObject(obj);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const maxDim = Math.max(size.x, size.y, size.z);
const scale = 1.9 / (maxDim || 1);

obj.scale.setScalar(scale);
obj.position.copy(center).multiplyScalar(-scale);

const transformedBox = new THREE.Box3().setFromObject(obj);
const transformedCenter = transformedBox.getCenter(new THREE.Vector3());
console.log('--- Three.js Loader & Transforms ---');
console.log(`Children meshes: ${obj.children.length}`);
console.log(`Original center: (${center.x.toFixed(4)}, ${center.y.toFixed(4)}, ${center.z.toFixed(4)})`);
console.log(`Original size: (${size.x.toFixed(4)}, ${size.y.toFixed(4)}, ${size.z.toFixed(4)})`);
console.log(`maxDim: ${maxDim.toFixed(4)}, scale: ${scale.toFixed(4)}`);
console.log(`Transformed center: (${transformedCenter.x.toFixed(6)}, ${transformedCenter.y.toFixed(6)}, ${transformedCenter.z.toFixed(6)})`);
console.log(`Transformed min: (${transformedBox.min.x.toFixed(4)}, ${transformedBox.min.y.toFixed(4)}, ${transformedBox.min.z.toFixed(4)})`);
console.log(`Transformed max: (${transformedBox.max.x.toFixed(4)}, ${transformedBox.max.y.toFixed(4)}, ${transformedBox.max.z.toFixed(4)})`);
const floorY = -1.10;
const floorClearance = transformedBox.min.y - floorY;
console.log(`Floor clearance (floor at y = ${floorY}m): ${floorClearance.toFixed(6)} m`);
