import fs from 'fs';
import path from 'path';
import * as THREE from 'three';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
const lines = fs.readFileSync(objPath, 'utf8').split(/\r?\n/);

const positions = [];
const uvs = [];
const faces = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('v ')) {
    positions.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('vt ')) {
    uvs.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('f ')) {
    const parts = trimmed.split(/\s+/).slice(1).map(p => {
      const [v, vt, vn] = p.split('/').map(Number);
      return { v: v - 1, vt: vt - 1, vn: vn ? vn - 1 : null };
    });
    faces.push(parts);
  }
}

// Front chest probes: Z > 0.15, Y in [0.0, 0.4]
const frontProbes = [];
// Back probes: Z < -0.20, Y in [0.0, 0.4]
const backProbes = [];

for (const f of faces) {
  const p0 = new THREE.Vector3(...positions[f[0].v]);
  const p1 = new THREE.Vector3(...positions[f[1].v]);
  const p2 = new THREE.Vector3(...positions[f[2].v]);
  const centroid = new THREE.Vector3().add(p0).add(p1).add(p2).divideScalar(3);

  const uVals = f.map(vert => uvs[vert.vt][0]);
  const vVals = f.map(vert => uvs[vert.vt][1]);
  const avgU = uVals.reduce((a, b) => a + b, 0) / 3;
  const avgV = vVals.reduce((a, b) => a + b, 0) / 3;

  if (centroid.z > 0.15 && centroid.y > 0.0 && centroid.y < 0.4) {
    frontProbes.push({ x: centroid.x, y: centroid.y, z: centroid.z, u: avgU, v: avgV });
  }

  if (centroid.z < -0.20 && centroid.y > 0.0 && centroid.y < 0.4) {
    backProbes.push({ x: centroid.x, y: centroid.y, z: centroid.z, u: avgU, v: avgV });
  }
}

console.log(`Front probes count: ${frontProbes.length}`);
console.log(`Back probes count: ${backProbes.length}`);

// Test correlation between X and U on Front
// When looking at Front: Left is X < 0, Right is X > 0.
// We expect U to increase as X increases: U(X > 0) > U(X < 0).
const frontLeft = frontProbes.filter(p => p.x < -0.05);
const frontRight = frontProbes.filter(p => p.x > 0.05);

const avgFrontLeftU = frontLeft.reduce((s, p) => s + p.u, 0) / frontLeft.length;
const avgFrontRightU = frontRight.reduce((s, p) => s + p.u, 0) / frontRight.length;

console.log(`Front Left (X < -0.05): count=${frontLeft.length}, avgX=${(frontLeft.reduce((s,p)=>s+p.x,0)/frontLeft.length).toFixed(3)}, avgU=${avgFrontLeftU.toFixed(4)}`);
console.log(`Front Right (X > 0.05): count=${frontRight.length}, avgX=${(frontRight.reduce((s,p)=>s+p.x,0)/frontRight.length).toFixed(3)}, avgU=${avgFrontRightU.toFixed(4)}`);
console.log(`Front U(right) > U(left): ${avgFrontRightU > avgFrontLeftU ? 'PASS' : 'FAIL'} (${avgFrontRightU.toFixed(4)} > ${avgFrontLeftU.toFixed(4)})`);

// Test correlation on Back
// When looking at Back (from -Z looking towards +Z):
// Viewed-Left is X > 0, Viewed-Right is X < 0.
// We expect U to increase from viewed-left (X > 0) to viewed-right (X < 0)!
// So: U(viewed-right, X < 0) > U(viewed-left, X > 0)!
const backViewedLeft = backProbes.filter(p => p.x > 0.05); // X > 0
const backViewedRight = backProbes.filter(p => p.x < -0.05); // X < 0

const avgBackViewedLeftU = backViewedLeft.reduce((s, p) => s + p.u, 0) / backViewedLeft.length;
const avgBackViewedRightU = backViewedRight.reduce((s, p) => s + p.u, 0) / backViewedRight.length;

console.log(`\nBack Viewed-Left (X > 0.05): count=${backViewedLeft.length}, avgX=${(backViewedLeft.reduce((s,p)=>s+p.x,0)/backViewedLeft.length).toFixed(3)}, avgU=${avgBackViewedLeftU.toFixed(4)}`);
console.log(`Back Viewed-Right (X < -0.05): count=${backViewedRight.length}, avgX=${(backViewedRight.reduce((s,p)=>s+p.x,0)/backViewedRight.length).toFixed(3)}, avgU=${avgBackViewedRightU.toFixed(4)}`);
console.log(`Back U(viewed-right) > U(viewed-left): ${avgBackViewedRightU > avgBackViewedLeftU ? 'PASS' : 'FAIL'} (${avgBackViewedRightU.toFixed(4)} > ${avgBackViewedLeftU.toFixed(4)})`);
