import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');

console.log('='.repeat(70));
console.log('THREE.JS OBJLOADER PARSING & RUNTIME VALIDATION');
console.log('='.repeat(70));

const content = fs.readFileSync(objPath, 'utf8');
console.log(`Read ${content.length} characters from ${objPath}`);

const loader = new OBJLoader();
const obj = loader.parse(content);

console.log(`Parsed Object3D: type=${obj.type}, name="${obj.name}", children=${obj.children.length}`);

let totalMeshCount = 0;
let totalVertexCount = 0;
let totalFaceCount = 0;

obj.traverse((child) => {
  if (child.isMesh) {
    totalMeshCount++;
    const geom = child.geometry;
    const pos = geom.getAttribute('position');
    const norm = geom.getAttribute('normal');
    const uv = geom.getAttribute('uv');
    const index = geom.getIndex();

    console.log(`Mesh [${child.name}]:`);
    console.log(`  Position attribute count: ${pos ? pos.count : 'NONE'}`);
    console.log(`  Normal attribute count:   ${norm ? norm.count : 'NONE'}`);
    console.log(`  UV attribute count:       ${uv ? uv.count : 'NONE'}`);
    console.log(`  Index count:              ${index ? index.count : 'NON-INDEXED'}`);

    if (pos) totalVertexCount += pos.count;
    if (index) {
      totalFaceCount += index.count / 3;
    } else if (pos) {
      totalFaceCount += pos.count / 3;
    }
  }
});

console.log(`Total Meshes: ${totalMeshCount}`);
console.log(`Total Vertex count in Three.js BufferGeometry: ${totalVertexCount}`);
console.log(`Total Triangles in Three.js: ${totalFaceCount}`);

// Compute Bounding Box
const box = new THREE.Box3().setFromObject(obj);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());

console.log('\nThree.js Bounding Box:');
console.log(`  Min:    (${box.min.x.toFixed(6)}, ${box.min.y.toFixed(6)}, ${box.min.z.toFixed(6)})`);
console.log(`  Max:    (${box.max.x.toFixed(6)}, ${box.max.y.toFixed(6)}, ${box.max.z.toFixed(6)})`);
console.log(`  Center: (${center.x.toFixed(6)}, ${center.y.toFixed(6)}, ${center.z.toFixed(6)})`);
console.log(`  Size:   (${size.x.toFixed(6)}, ${size.y.toFixed(6)}, ${size.z.toFixed(6)})`);

const maxDim = Math.max(size.x, size.y, size.z);
console.log(`  Max dimension: ${maxDim.toFixed(6)} (Target: 1.900000)`);

// Test GarmentPreview3D transformation behavior
const scale = 1.9 / (maxDim || 1);
obj.position.sub(center);
obj.scale.setScalar(scale);
obj.updateMatrixWorld(true);

const scaledBox = new THREE.Box3().setFromObject(obj);
const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
const scaledSize = scaledBox.getSize(new THREE.Vector3());

console.log('\nTransformed World Bounds (as in GarmentPreview3D.tsx):');
console.log(`  Scaled Center: (${scaledCenter.x.toFixed(6)}, ${scaledCenter.y.toFixed(6)}, ${scaledCenter.z.toFixed(6)})`);
console.log(`  Scaled Size:   (${scaledSize.x.toFixed(6)}, ${scaledSize.y.toFixed(6)}, ${scaledSize.z.toFixed(6)})`);
console.log(`  Bottom Hem Y:  ${scaledBox.min.y.toFixed(6)}`);
console.log(`  Shadow Floor:  -1.100000`);
const floorClearance = scaledBox.min.y - (-1.10);
console.log(`  Floor Clearance: +${floorClearance.toFixed(6)} units (${(floorClearance * 100).toFixed(2)} cm)`);

if (Math.abs(scaledCenter.x) > 1e-4 || Math.abs(scaledCenter.y) > 1e-4 || Math.abs(scaledCenter.z) > 1e-4) {
  throw new Error(`Scaled center not at origin: ${scaledCenter.toArray()}`);
}
if (floorClearance < 0.10) {
  throw new Error(`Insufficient floor clearance: ${floorClearance}`);
}

console.log('='.repeat(70));
console.log('THREE.JS VALIDATION: PASSED WITH ZERO ERRORS');
console.log('='.repeat(70));
