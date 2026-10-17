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

// Let's inspect torso faces from bottom (hem) to top (collar)
// Sort by Y in 3D:
// Let's divide Y into slices: [-0.85, -0.6], [-0.6, -0.3], [-0.3, 0.0], [0.0, 0.3], [0.3, 0.6], [0.6, 0.85]
const ySlices = [
  [-0.85, -0.6],
  [-0.6, -0.3],
  [-0.3, 0.0],
  [0.0, 0.3],
  [0.3, 0.6],
  [0.6, 0.85]
];

console.log('--- FRONT TORSO V VALUES BY Y SLICE (|X| < 0.25, Z > 0.1) ---');
for (const [yMin, yMax] of ySlices) {
  const vVals = [];
  for (const f of faces) {
    const p0 = positions[f[0].v];
    const p1 = positions[f[1].v];
    const p2 = positions[f[2].v];
    const cy = (p0[1] + p1[1] + p2[1]) / 3;
    const cx = (p0[0] + p1[0] + p2[0]) / 3;
    const cz = (p0[2] + p1[2] + p2[2]) / 3;

    if (cy >= yMin && cy < yMax && Math.abs(cx) < 0.25 && cz > 0.1) {
      for (const vert of f) {
        vVals.push(uvs[vert.vt][1]);
      }
    }
  }
  const avg = vVals.length ? (vVals.reduce((a, b) => a + b, 0) / vVals.length).toFixed(4) : 'N/A';
  const min = vVals.length ? Math.min(...vVals).toFixed(4) : 'N/A';
  const max = vVals.length ? Math.max(...vVals).toFixed(4) : 'N/A';
  console.log(`Y in [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]: count=${vVals.length}, avgV=${avg}, minV=${min}, maxV=${max}`);
}

console.log('\n--- BACK TORSO V VALUES BY Y SLICE (|X| < 0.25, Z < -0.1) ---');
for (const [yMin, yMax] of ySlices) {
  const vVals = [];
  for (const f of faces) {
    const p0 = positions[f[0].v];
    const p1 = positions[f[1].v];
    const p2 = positions[f[2].v];
    const cy = (p0[1] + p1[1] + p2[1]) / 3;
    const cx = (p0[0] + p1[0] + p2[0]) / 3;
    const cz = (p0[2] + p1[2] + p2[2]) / 3;

    if (cy >= yMin && cy < yMax && Math.abs(cx) < 0.25 && cz < -0.1) {
      for (const vert of f) {
        vVals.push(uvs[vert.vt][1]);
      }
    }
  }
  const avg = vVals.length ? (vVals.reduce((a, b) => a + b, 0) / vVals.length).toFixed(4) : 'N/A';
  const min = vVals.length ? Math.min(...vVals).toFixed(4) : 'N/A';
  const max = vVals.length ? Math.max(...vVals).toFixed(4) : 'N/A';
  console.log(`Y in [${yMin.toFixed(2)}, ${yMax.toFixed(2)}]: count=${vVals.length}, avgV=${avg}, minV=${min}, maxV=${max}`);
}
