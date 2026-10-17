import fs from 'fs';
import path from 'path';

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

console.log(`Loaded ${positions.length} positions, ${uvs.length} uvs, ${faces.length} faces`);

// Check UV ranges
let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
for (const [u, v] of uvs) {
  minU = Math.min(minU, u);
  maxU = Math.max(maxU, u);
  minV = Math.min(minV, v);
  maxV = Math.max(maxV, v);
}
console.log(`Global UV bounds: U in [${minU}, ${maxU}], V in [${minV}, ${maxV}]`);

// Check face UV spans: does any face cross U = 0.5?
let crossFaces = 0;
let frontFaces = 0;
let backFaces = 0;

for (let fi = 0; fi < faces.length; fi++) {
  const f = faces[fi];
  const uVals = f.map(vert => uvs[vert.vt][0]);
  const minFaceU = Math.min(...uVals);
  const maxFaceU = Math.max(...uVals);

  if (minFaceU < 0.5 && maxFaceU > 0.5) {
    crossFaces++;
  } else if (maxFaceU <= 0.5) {
    frontFaces++;
  } else if (minFaceU >= 0.5) {
    backFaces++;
  }
}

console.log(`Front faces (all U <= 0.5): ${frontFaces}`);
console.log(`Back faces (all U >= 0.5): ${backFaces}`);
console.log(`Cross-boundary faces (spanning across U = 0.5): ${crossFaces}`);
