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

// In the torso region, say |X| <= 0.30 and Y between -0.4 and +0.4
console.log('--- TORSO MESH ( |X| <= 0.30, Y in [-0.4, 0.4] ) ---');

const torsoFaces = [];
for (const f of faces) {
  const p0 = new THREE.Vector3(...positions[f[0].v]);
  const p1 = new THREE.Vector3(...positions[f[1].v]);
  const p2 = new THREE.Vector3(...positions[f[2].v]);
  const c = new THREE.Vector3().add(p0).add(p1).add(p2).divideScalar(3);

  if (Math.abs(c.x) <= 0.30 && c.y >= -0.4 && c.y <= 0.4) {
    const uVals = f.map(vert => uvs[vert.vt][0]);
    const vVals = f.map(vert => uvs[vert.vt][1]);
    const avgU = uVals.reduce((a, b) => a + b, 0) / 3;
    const avgV = vVals.reduce((a, b) => a + b, 0) / 3;
    torsoFaces.push({ c, avgU, avgV, uVals });
  }
}

console.log(`Total torso faces: ${torsoFaces.length}`);

const frontTorso = torsoFaces.filter(f => f.c.z > 0.1);
const backTorso = torsoFaces.filter(f => f.c.z < -0.1);

console.log(`Front torso faces (Z > 0.1): ${frontTorso.length}`);
console.log(`Back torso faces (Z < -0.1): ${backTorso.length}`);

// Check all U values on Front Torso
const ftUVals = frontTorso.flatMap(f => f.uVals);
console.log(`Front Torso U range: [${Math.min(...ftUVals).toFixed(4)}, ${Math.max(...ftUVals).toFixed(4)}]`);

// Check all U values on Back Torso
const btUVals = backTorso.flatMap(f => f.uVals);
console.log(`Back Torso U range: [${Math.min(...btUVals).toFixed(4)}, ${Math.max(...btUVals).toFixed(4)}]`);

// Anti-mirroring on Front Torso
const ftLeft = frontTorso.filter(f => f.c.x < -0.05);
const ftRight = frontTorso.filter(f => f.c.x > 0.05);
const avgFtLeftU = ftLeft.reduce((s, f) => s + f.avgU, 0) / ftLeft.length;
const avgFtRightU = ftRight.reduce((s, f) => s + f.avgU, 0) / ftRight.length;
console.log(`\nFront Torso: Left (X < -0.05) avgU=${avgFtLeftU.toFixed(4)}, Right (X > 0.05) avgU=${avgFtRightU.toFixed(4)}`);
console.log(`Front Torso U(right) > U(left): ${avgFtRightU > avgFtLeftU}`);

// Anti-mirroring on Back Torso
// Looking at back: Viewed-Left is X > 0, Viewed-Right is X < 0
const btViewedLeft = backTorso.filter(f => f.c.x > 0.05);
const btViewedRight = backTorso.filter(f => f.c.x < -0.05);
const avgBtViewedLeftU = btViewedLeft.reduce((s, f) => s + f.avgU, 0) / btViewedLeft.length;
const avgBtViewedRightU = btViewedRight.reduce((s, f) => s + f.avgU, 0) / btViewedRight.length;
console.log(`\nBack Torso: Viewed-Left (X > 0.05) avgU=${avgBtViewedLeftU.toFixed(4)}, Viewed-Right (X < -0.05) avgU=${avgBtViewedRightU.toFixed(4)}`);
console.log(`Back Torso U(viewed-right) > U(viewed-left): ${avgBtViewedRightU > avgBtViewedLeftU}`);
