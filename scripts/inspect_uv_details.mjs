import fs from 'fs';
import path from 'path';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
const content = fs.readFileSync(objPath, 'utf8');
const lines = content.split(/\r?\n/);

const positions = [];
const uvs = [];
const normals = [];
const faces = [];

for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const p = t.split(/\s+/);
  if (p[0] === 'v') positions.push(p.slice(1).map(Number));
  else if (p[0] === 'vt') uvs.push(p.slice(1).map(Number));
  else if (p[0] === 'vn') normals.push(p.slice(1).map(Number));
  else if (p[0] === 'f') {
    faces.push(p.slice(1).map(x => {
      const parts = x.split('/').map(v => v ? parseInt(v, 10) : null);
      return { v: parts[0], vt: parts[1], vn: parts[2] };
    }));
  }
}

console.log('--- Geometry & Topology Inspection ---');
console.log('v count:', positions.length);
console.log('vt count:', uvs.length);
console.log('vn count:', normals.length);
console.log('f count:', faces.length);

// Inspect UV coordinates for front chest vs side seams vs back
console.log('\n--- Chest & Seam UV Mapping Analysis ---');
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u, v] = uvs[c.vt - 1];
    // Center chest
    if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05 && z > 0.15) {
      // Print a few center chest UVs
      console.log(`Center chest point: pos=(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}) -> uv=(${u.toFixed(4)}, ${v.toFixed(4)})`);
      break;
    }
  }
}

// Side seam points: near y = 0, z near 0, |x| near 0.52
console.log('\n--- Side Seam UV Analysis ---');
let sideSeamCount = 0;
for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u, v] = uvs[c.vt - 1];
    if (Math.abs(z) < 0.01 && Math.abs(Math.abs(x) - 0.52) < 0.02 && Math.abs(y) < 0.1) {
      if (sideSeamCount < 6) {
        console.log(`Side seam vert ${c.v}: pos=(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}) -> vt ${c.vt}: uv=(${u.toFixed(4)}, ${v.toFixed(4)})`);
        sideSeamCount++;
      }
    }
  }
}

// Check UV mapping orientation across X
console.log('\n--- U vs X Distribution on Front Torso (z > 0.08) ---');
let minFrontTorsoU = Infinity, maxFrontTorsoU = -Infinity;
let minBackTorsoU = Infinity, maxBackTorsoU = -Infinity;

for (const f of faces) {
  for (const c of f) {
    const [x, y, z] = positions[c.v - 1];
    const [u, v] = uvs[c.vt - 1];
    if (z > 0.08 && Math.abs(x) <= 0.52) {
      minFrontTorsoU = Math.min(minFrontTorsoU, u);
      maxFrontTorsoU = Math.max(maxFrontTorsoU, u);
    }
    if (z < -0.08 && Math.abs(x) <= 0.52) {
      minBackTorsoU = Math.min(minBackTorsoU, u);
      maxBackTorsoU = Math.max(maxBackTorsoU, u);
    }
  }
}

console.log('Front Torso U Range:', [minFrontTorsoU, maxFrontTorsoU]);
console.log('Back Torso U Range:', [minBackTorsoU, maxBackTorsoU]);
