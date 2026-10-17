import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
const objText = fs.readFileSync(objPath, 'utf8');

const loader = new OBJLoader();
const group = loader.parse(objText);
const mesh = group.children[0];
const geom = mesh.geometry;

const posAttr = geom.attributes.position;
const uvAttr = geom.attributes.uv;

// Front Camera: pos = (0, 0.1, 2.3), lookAt(0, 0, 0)
const frontCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
frontCam.position.set(0, 0.1, 2.3);
frontCam.lookAt(0, 0, 0);
frontCam.updateMatrixWorld();
frontCam.updateProjectionMatrix();

// Back Camera: pos = (0, 0.1, -2.3), lookAt(0, 0, 0)
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

  // Front chest region: z > 0.15, y in [-0.2, 0.4], |x| < 0.25
  if (v.z > 0.15 && v.y >= -0.2 && v.y <= 0.4 && Math.abs(v.x) <= 0.25) {
    const ndc = v.clone().project(frontCam);
    frontSamples.push({ ndcX: ndc.x, ndcY: ndc.y, u, vTex, world: v });
  }

  // Back torso region: z < -0.15, y in [-0.2, 0.4], |x| < 0.25
  if (v.z < -0.15 && v.y >= -0.2 && v.y <= 0.4 && Math.abs(v.x) <= 0.25) {
    const ndc = v.clone().project(backCam);
    backSamples.push({ ndcX: ndc.x, ndcY: ndc.y, u, vTex, world: v });
  }
}

// Compute Pearson correlation between ndcX and U
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

console.log('--- CAMERA NDC PROJECTION CORRELATION ---');
console.log(`Front View (${frontSamples.length} samples):`);
console.log(`  Horizontal (Screen NDC X vs Texture U): Pearson r = ${frontCorrX.toFixed(4)}`);
console.log(`  Vertical   (Screen NDC Y vs Texture V): Pearson r = ${frontCorrY.toFixed(4)}`);

console.log(`\nBack View (${backSamples.length} samples):`);
console.log(`  Horizontal (Screen NDC X vs Texture U): Pearson r = ${backCorrX.toFixed(4)}`);
console.log(`  Vertical   (Screen NDC Y vs Texture V): Pearson r = ${backCorrY.toFixed(4)}`);

console.log('\nCorrelation Analysis:');
console.log(`  Front Screen X -> U correlation > +0.95: ${frontCorrX > 0.95}`);
console.log(`  Front Screen Y -> V correlation > +0.95: ${frontCorrY > 0.95}`);
console.log(`  Back  Screen X -> U correlation > +0.95: ${backCorrX > 0.95}`);
console.log(`  Back  Screen Y -> V correlation > +0.95: ${backCorrY > 0.95}`);
