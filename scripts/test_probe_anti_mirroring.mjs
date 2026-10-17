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
const normAttr = geom.attributes.normal;

console.log('Total vertices:', posAttr.count);

// Sample vertices on Front Chest (Z > 0.1, Y in [0.0, 0.5])
const frontLeft = [];
const frontCenter = [];
const frontRight = [];

// Sample vertices on Back (Z < -0.1, Y in [0.0, 0.5])
const backViewedLeft = []; // X > 0.1
const backCenter = [];     // |X| < 0.05
const backViewedRight = [];// X < -0.1

for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const y = posAttr.getY(i);
  const z = posAttr.getZ(i);
  const u = uvAttr.getX(i);
  const v = uvAttr.getY(i);

  // Front chest region: z > 0.05, y between 0.0 and 0.4
  if (z > 0.08 && y > 0.0 && y < 0.4) {
    if (x < -0.15) {
      frontLeft.push({ x, y, z, u, v });
    } else if (Math.abs(x) < 0.05) {
      frontCenter.push({ x, y, z, u, v });
    } else if (x > 0.15) {
      frontRight.push({ x, y, z, u, v });
    }
  }

  // Back upper region: z < -0.08, y between 0.0 and 0.4
  if (z < -0.08 && y > 0.0 && y < 0.4) {
    // When looking at Back (facing +Z):
    // Viewer's Left is +X, Viewer's Right is -X
    if (x > 0.15) {
      backViewedLeft.push({ x, y, z, u, v });
    } else if (Math.abs(x) < 0.05) {
      backCenter.push({ x, y, z, u, v });
    } else if (x < -0.15) {
      backViewedRight.push({ x, y, z, u, v });
    }
  }
}

function stats(arr, name) {
  if (arr.length === 0) {
    console.log(`${name}: empty`);
    return;
  }
  const uVals = arr.map(p => p.u);
  const vVals = arr.map(p => p.v);
  const xVals = arr.map(p => p.x);
  const yVals = arr.map(p => p.y);
  const minU = Math.min(...uVals);
  const maxU = Math.max(...uVals);
  const avgU = uVals.reduce((a, b) => a + b, 0) / uVals.length;
  const avgV = vVals.reduce((a, b) => a + b, 0) / vVals.length;
  const avgX = xVals.reduce((a, b) => a + b, 0) / xVals.length;
  console.log(`${name} (count=${arr.length}): avgX=${avgX.toFixed(3)}, U range=[${minU.toFixed(4)}, ${maxU.toFixed(4)}], avgU=${avgU.toFixed(4)}, avgV=${avgV.toFixed(4)}`);
  return { minU, maxU, avgU, avgV, avgX };
}

console.log('--- FRONT CHEST (Looking at front from +Z towards -Z: Left is X < 0, Right is X > 0) ---');
const fl = stats(frontLeft, 'Front Left (X < -0.15)');
const fc = stats(frontCenter, 'Front Center (|X| < 0.05)');
const fr = stats(frontRight, 'Front Right (X > 0.15)');

console.log('\n--- BACK (Looking at back from -Z towards +Z: Viewed-Left is X > 0, Viewed-Right is X < 0) ---');
const bvl = stats(backViewedLeft, 'Back Viewed-Left (X > 0.15)');
const bc = stats(backCenter, 'Back Center (|X| < 0.05)');
const bvr = stats(backViewedRight, 'Back Viewed-Right (X < -0.15)');

// Also check hem vs collar V values (Uprightness test)
const hemVerts = [];
const collarVerts = [];
for (let i = 0; i < posAttr.count; i++) {
  const y = posAttr.getY(i);
  const v = uvAttr.getY(i);
  if (y < -0.80) hemVerts.push(v);
  if (y > 0.70) collarVerts.push(v);
}
console.log('\n--- VERTICAL UPRIGHTNESS ---');
console.log(`Hem (Y < -0.80): count=${hemVerts.length}, avgV=${(hemVerts.reduce((a,b)=>a+b,0)/hemVerts.length).toFixed(4)}`);
console.log(`Collar (Y > 0.70): count=${collarVerts.length}, avgV=${(collarVerts.reduce((a,b)=>a+b,0)/collarVerts.length).toFixed(4)}`);
