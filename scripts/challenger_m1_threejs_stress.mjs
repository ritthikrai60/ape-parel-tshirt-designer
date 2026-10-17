import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

console.log('=================================================================');
console.log('THREE.JS EMPIRICAL STRESS TEST FOR public/models/tshirt.obj');
console.log('=================================================================');

const objPath = path.resolve('public/models/tshirt.obj');
const objContent = fs.readFileSync(objPath, 'utf8');

const loader = new OBJLoader();
const obj = loader.parse(objContent);

console.log(`Parsed children count: ${obj.children.length}`);
const mesh = obj.children[0];
console.log(`Child name: ${mesh.name}, type: ${mesh.type}`);

const geom = mesh.geometry;
const posAttr = geom.getAttribute('position');
const uvAttr = geom.getAttribute('uv');
const normAttr = geom.getAttribute('normal');

console.log(`Position attribute count: ${posAttr.count}`);
console.log(`UV attribute count: ${uvAttr.count}`);
console.log(`Normal attribute count: ${normAttr.count}`);

// Check for NaN or Inf
let nanCount = 0;
let infCount = 0;

for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const y = posAttr.getY(i);
  const z = posAttr.getZ(i);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) nanCount++;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) infCount++;
}

for (let i = 0; i < uvAttr.count; i++) {
  const u = uvAttr.getX(i);
  const v = uvAttr.getY(i);
  if (Number.isNaN(u) || Number.isNaN(v)) nanCount++;
  if (!Number.isFinite(u) || !Number.isFinite(v)) infCount++;
}

for (let i = 0; i < normAttr.count; i++) {
  const nx = normAttr.getX(i);
  const ny = normAttr.getY(i);
  const nz = normAttr.getZ(i);
  if (Number.isNaN(nx) || Number.isNaN(ny) || Number.isNaN(nz)) nanCount++;
  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) infCount++;
}

console.log(`NaN count across all attributes: ${nanCount}`);
console.log(`Inf count across all attributes: ${infCount}`);
if (nanCount > 0 || infCount > 0) {
  throw new Error(`Found ${nanCount} NaNs and ${infCount} Infs in BufferGeometry!`);
}

// Check triangle counts in Three.js
const triCount = posAttr.count / 3;
console.log(`Total Triangles loaded into Three.js: ${triCount}`);
if (triCount !== 10192) {
  throw new Error(`Expected 10,192 triangles, got ${triCount}`);
}

// Check UV boundary crossing in Three.js geometry
let crossFaces = 0;
let frontTriangles = 0;
let backTriangles = 0;
let maxFrontU = -Infinity;
let minBackU = Infinity;

for (let t = 0; t < triCount; t++) {
  const u0 = uvAttr.getX(t * 3);
  const u1 = uvAttr.getX(t * 3 + 1);
  const u2 = uvAttr.getX(t * 3 + 2);

  const minU = Math.min(u0, u1, u2);
  const maxU = Math.max(u0, u1, u2);

  if (minU < 0.50 && maxU > 0.50) {
    crossFaces++;
  }

  if (maxU <= 0.50) {
    frontTriangles++;
    maxFrontU = Math.max(maxFrontU, maxU);
  } else if (minU >= 0.50) {
    backTriangles++;
    minBackU = Math.min(minBackU, minU);
  }
}

console.log(`Front Triangles: ${frontTriangles}`);
console.log(`Back Triangles: ${backTriangles}`);
console.log(`Crossing Triangles across U=0.50: ${crossFaces}`);
console.log(`Max Front U: ${maxFrontU.toFixed(6)} (<= 0.498)`);
console.log(`Min Back U: ${minBackU.toFixed(6)} (>= 0.502)`);
console.log(`Gutter Buffer: ${(minBackU - maxFrontU).toFixed(6)} (>= 0.004)`);

if (crossFaces > 0) {
  throw new Error(`Zero-crossing violation: ${crossFaces} triangles cross U=0.50`);
}
if (minBackU - maxFrontU < 0.004 - 1e-7) {
  throw new Error(`Gutter buffer violation: ${(minBackU - maxFrontU).toFixed(6)} < 0.004`);
}

console.log('=================================================================');
console.log('THREE.JS EMPIRICAL STRESS TEST PASSED WITH 0 ERRORS');
console.log('=================================================================');
