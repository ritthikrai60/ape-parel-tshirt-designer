import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

console.log('=== INDEPENDENT THREE.JS OBJLOADER AUDIT ===');

const objPath = path.resolve('public/models/tshirt.obj');
const objContent = fs.readFileSync(objPath, 'utf8');

const loader = new OBJLoader();
const parsedObj = loader.parse(objContent);

console.log('OBJLoader.parse completed successfully.');
console.log('Root Object3D Type:', parsedObj.type);
console.log('Children count:', parsedObj.children.length);

let totalMeshes = 0;
let totalVertices = 0;
let totalTriangles = 0;
let hasPosition = true;
let hasNormal = true;
let hasUv = true;
let nanOrInfCount = 0;

parsedObj.traverse((child) => {
  if (child.isMesh) {
    totalMeshes++;
    const geom = child.geometry;
    console.log(`Mesh [${child.name || 'unnamed'}]:`);
    console.log('  drawRange:', geom.drawRange);

    const pos = geom.getAttribute('position');
    const norm = geom.getAttribute('normal');
    const uv = geom.getAttribute('uv');

    if (!pos) hasPosition = false;
    if (!norm) hasNormal = false;
    if (!uv) hasUv = false;

    console.log('  Position count:', pos ? pos.count : 0);
    console.log('  Normal count:', norm ? norm.count : 0);
    console.log('  UV count:', uv ? uv.count : 0);

    totalVertices += pos.count;
    totalTriangles += pos.count / 3;

    // Check for NaN or Inf
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      if (Number.isNaN(px) || Number.isNaN(py) || Number.isNaN(pz) || !Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
        nanOrInfCount++;
      }
    }

    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (Number.isNaN(u) || Number.isNaN(v) || !Number.isFinite(u) || !Number.isFinite(v)) {
        nanOrInfCount++;
      }
    }
  }
});

console.log(`Total meshes: ${totalMeshes}`);
console.log(`Total Three.js vertices: ${totalVertices}`);
console.log(`Total Three.js triangles: ${totalTriangles}`);
console.log(`Attributes check: pos=${hasPosition}, norm=${hasNormal}, uv=${hasUv}`);
console.log(`NaN/Inf occurrences: ${nanOrInfCount}`);

// GarmentPreview3D transformation simulation:
const box = new THREE.Box3().setFromObject(parsedObj);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());

console.log('Unscaled Box3 Min:', box.min.toArray());
console.log('Unscaled Box3 Max:', box.max.toArray());
console.log('Unscaled Box3 Center:', center.toArray());
console.log('Unscaled Box3 Size:', size.toArray());

parsedObj.position.sub(center);
const maxDim = Math.max(size.x, size.y, size.z);
const scale = 1.9 / (maxDim || 1);
parsedObj.scale.setScalar(scale);
parsedObj.updateMatrixWorld(true);

const transformedBox = new THREE.Box3().setFromObject(parsedObj);
const transformedCenter = transformedBox.getCenter(new THREE.Vector3());
const transformedSize = transformedBox.getSize(new THREE.Vector3());

console.log('\nTransformed World Bounds in GarmentPreview3D:');
console.log('  Center:', transformedCenter.toArray());
console.log('  Size:', transformedSize.toArray());
console.log('  Hem (min Y):', transformedBox.min.y);

const shadowPlaneY = -1.10;
const clearance = transformedBox.min.y - shadowPlaneY;
console.log(`  Shadow Floor Y: ${shadowPlaneY}`);
console.log(`  Hem Clearance: ${clearance.toFixed(6)} units`);
console.log(`  Clearance >= 0.15 requirement: ${clearance >= 0.15 ? 'PASS' : 'FAIL'}`);

// Also test UV sampling across BufferGeometry
let crossBorderFacesInThree = 0;
let frontFacesInThree = 0;
let backFacesInThree = 0;

parsedObj.traverse((child) => {
  if (child.isMesh) {
    const uv = child.geometry.getAttribute('uv');
    for (let f = 0; f < uv.count; f += 3) {
      const u0 = uv.getX(f);
      const u1 = uv.getX(f + 1);
      const u2 = uv.getX(f + 2);
      const minU = Math.min(u0, u1, u2);
      const maxU = Math.max(u0, u1, u2);
      if (minU < 0.50 && maxU > 0.50) {
        crossBorderFacesInThree++;
      } else if (maxU <= 0.50) {
        frontFacesInThree++;
      } else {
        backFacesInThree++;
      }
    }
  }
});

console.log(`\nThree.js Face UV Partition:`);
console.log(`  Front faces: ${frontFacesInThree}`);
console.log(`  Back faces:  ${backFacesInThree}`);
console.log(`  Cross-border faces: ${crossBorderFacesInThree}`);

if (crossBorderFacesInThree === 0 && clearance >= 0.15 && nanOrInfCount === 0) {
  console.log('\n=== THREE.JS COMPATIBILITY AUDIT: PERFECT PASS ===');
} else {
  console.log('\n=== THREE.JS COMPATIBILITY AUDIT: FAIL ===');
  process.exit(1);
}
