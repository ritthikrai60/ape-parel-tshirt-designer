import fs from 'fs';
import path from 'path';
import * as THREE from 'three';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
const lines = fs.readFileSync(objPath, 'utf8').split(/\r?\n/);

const positions = [];
const uvs = [];
const normals = [];
const faces = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('v ')) {
    positions.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('vt ')) {
    uvs.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('vn ')) {
    normals.push(trimmed.split(/\s+/).slice(1).map(Number));
  } else if (trimmed.startsWith('f ')) {
    const parts = trimmed.split(/\s+/).slice(1).map(p => {
      const [v, vt, vn] = p.split('/').map(Number);
      return { v: v - 1, vt: vt - 1, vn: vn ? vn - 1 : null };
    });
    faces.push(parts);
  }
}

// For each face, determine if it's Front (U <= 0.5) or Back (U >= 0.5)
// and compute its 3D centroid and face normal
const frontCentroids = [];
const backCentroids = [];

for (const f of faces) {
  const uVals = f.map(vert => uvs[vert.vt][0]);
  const isFront = uVals.every(u => u <= 0.5);
  const isBack = uVals.every(u => u >= 0.5);

  const p0 = new THREE.Vector3(...positions[f[0].v]);
  const p1 = new THREE.Vector3(...positions[f[1].v]);
  const p2 = new THREE.Vector3(...positions[f[2].v]);

  const centroid = new THREE.Vector3().add(p0).add(p1).add(p2).divideScalar(3);
  const vA = new THREE.Vector3().subVectors(p1, p0);
  const vB = new THREE.Vector3().subVectors(p2, p0);
  const faceNorm = new THREE.Vector3().crossVectors(vA, vB).normalize();

  const avgU = uVals.reduce((a, b) => a + b, 0) / 3;
  const avgV = f.map(vert => uvs[vert.vt][1]).reduce((a, b) => a + b, 0) / 3;

  if (isFront) {
    frontCentroids.push({ centroid, faceNorm, avgU, avgV });
  } else if (isBack) {
    backCentroids.push({ centroid, faceNorm, avgU, avgV });
  }
}

console.log('Front faces count:', frontCentroids.length);
console.log('Back faces count:', backCentroids.length);

const frontZ = frontCentroids.map(f => f.centroid.z);
const backZ = backCentroids.map(f => f.centroid.z);
console.log(`Front face centroids Z: min=${Math.min(...frontZ).toFixed(4)}, max=${Math.max(...frontZ).toFixed(4)}, avg=${(frontZ.reduce((a,b)=>a+b,0)/frontZ.length).toFixed(4)}`);
console.log(`Back face centroids Z: min=${Math.min(...backZ).toFixed(4)}, max=${Math.max(...backZ).toFixed(4)}, avg=${(backZ.reduce((a,b)=>a+b,0)/backZ.length).toFixed(4)}`);

// Look specifically at torso (chest/back) where |X| < 0.25, Y in [-0.4, 0.4]
const frontTorso = frontCentroids.filter(f => Math.abs(f.centroid.x) < 0.25 && f.centroid.y > -0.4 && f.centroid.y < 0.4);
const backTorso = backCentroids.filter(f => Math.abs(f.centroid.x) < 0.25 && f.centroid.y > -0.4 && f.centroid.y < 0.4);

console.log(`Front torso faces (|X| < 0.25, Y in [-0.4, 0.4]): ${frontTorso.length}`);
console.log(`Back torso faces (|X| < 0.25, Y in [-0.4, 0.4]): ${backTorso.length}`);

const ftZ = frontTorso.map(f => f.centroid.z);
const btZ = backTorso.map(f => f.centroid.z);
console.log(`Front torso Z: min=${Math.min(...ftZ).toFixed(4)}, max=${Math.max(...ftZ).toFixed(4)}, avg=${(ftZ.reduce((a,b)=>a+b,0)/ftZ.length).toFixed(4)}`);
console.log(`Back torso Z: min=${Math.min(...btZ).toFixed(4)}, max=${Math.max(...btZ).toFixed(4)}, avg=${(btZ.reduce((a,b)=>a+b,0)/btZ.length).toFixed(4)}`);
