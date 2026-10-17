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

const suspicious = [];
for (let i = 0; i < faces.length; i++) {
  const f = faces[i];
  const uVals = f.map(vert => uvs[vert.vt][0]);
  const isFront = uVals.every(u => u <= 0.5);

  const p0 = new THREE.Vector3(...positions[f[0].v]);
  const p1 = new THREE.Vector3(...positions[f[1].v]);
  const p2 = new THREE.Vector3(...positions[f[2].v]);
  const centroid = new THREE.Vector3().add(p0).add(p1).add(p2).divideScalar(3);

  if (isFront && centroid.z < -0.15) {
    suspicious.push({ faceIdx: i, centroid, uVals });
  }
}

console.log(`Found ${suspicious.length} front faces (U <= 0.5) with Z < -0.15:`);
for (const s of suspicious.slice(0, 10)) {
  console.log(`Face ${s.faceIdx}: centroid=(${s.centroid.x.toFixed(3)}, ${s.centroid.y.toFixed(3)}, ${s.centroid.z.toFixed(3)}), U=[${s.uVals.map(u => u.toFixed(3)).join(', ')}]`);
}
