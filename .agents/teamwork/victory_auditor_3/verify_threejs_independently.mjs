// Independent Three.js OBJLoader verification
// Auditor: victory_auditor_3

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import fs from 'fs';
import path from 'path';

const objPath = path.resolve('public/models/tshirt.obj');
console.log('Testing Three.js OBJLoader on:', objPath);

const content = fs.readFileSync(objPath, 'utf8');
const loader = new OBJLoader();
const obj = loader.parse(content);

console.log('Children count:', obj.children.length);
assert(obj.children.length === 1, 'Expected exactly 1 child mesh');

const mesh = obj.children[0];
console.log('Child name:', mesh.name);
console.log('Is mesh:', mesh.isMesh);
assert(mesh.isMesh === true, 'Child must be THREE.Mesh');

const geometry = mesh.geometry;
console.log('Position attribute count:', geometry.attributes.position.count);
console.log('UV attribute count:', geometry.attributes.uv.count);
console.log('Normal attribute count:', geometry.attributes.normal.count);

// 10,192 triangles * 3 = 30,576 vertices
assert(geometry.attributes.position.count === 30576, 'Expected 30576 vertices in non-indexed buffer');
assert(geometry.attributes.uv.count === 30576, 'Expected 30576 UVs in non-indexed buffer');
assert(geometry.attributes.normal.count === 30576, 'Expected 30576 normals in non-indexed buffer');

// Check for NaN or Inf
for (let i = 0; i < geometry.attributes.position.count; i++) {
  const x = geometry.attributes.position.getX(i);
  const y = geometry.attributes.position.getY(i);
  const z = geometry.attributes.position.getZ(i);
  if (isNaN(x) || isNaN(y) || isNaN(z) || !isFinite(x) || !isFinite(y) || !isFinite(z)) {
    throw new Error(`NaN or Inf in position attribute at index ${i}`);
  }

  const u = geometry.attributes.uv.getX(i);
  const v = geometry.attributes.uv.getY(i);
  if (isNaN(u) || isNaN(v) || !isFinite(u) || !isFinite(v)) {
    throw new Error(`NaN or Inf in UV attribute at index ${i}`);
  }

  const nx = geometry.attributes.normal.getX(i);
  const ny = geometry.attributes.normal.getY(i);
  const nz = geometry.attributes.normal.getZ(i);
  if (isNaN(nx) || isNaN(ny) || isNaN(nz) || !isFinite(nx) || !isFinite(ny) || !isFinite(nz)) {
    throw new Error(`NaN or Inf in normal attribute at index ${i}`);
  }
}

// Check bounding box
geometry.computeBoundingBox();
const box = geometry.boundingBox;
console.log('Bounding Box Min:', box.min.x, box.min.y, box.min.z);
console.log('Bounding Box Max:', box.max.x, box.max.y, box.max.z);

const center = new THREE.Vector3();
box.getCenter(center);
console.log('Bounding Box Center:', center.x, center.y, center.z);
assert(Math.abs(center.x) < 1e-4, 'Center X must be 0');
assert(Math.abs(center.y) < 1e-4, 'Center Y must be 0');
assert(Math.abs(center.z) < 1e-4, 'Center Z must be 0');

const size = new THREE.Vector3();
box.getSize(size);
console.log('Bounding Box Size:', size.x, size.y, size.z);
const maxDim = Math.max(size.x, size.y, size.z);
console.log('Max Dimension:', maxDim);
assert(Math.abs(maxDim - 1.90) < 1e-4, 'Max dimension must be 1.90');

console.log('THREE.JS LOADER INDEPENDENT VERIFICATION PASSED WITH ZERO ERRORS');

function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}
