import fs from 'fs';

// Let's count by inspecting how many quads are added in each block
// 1. Front torso:
// numYTorso = 24, numXTorso = 20
// Total possible quads = 24 * 20 = 480.
// Neck cutout:
// yCollarDip = 0.46, yNeckTop = 0.66, yShoulder = 0.58, yHem = -0.85
let frontQuads = 0;
const yHem = -0.85;
const yShoulder = 0.58;
const yNeckTop = 0.66;
const yCollarDip = 0.46;
const numYTorso = 24;
const numXTorso = 20;

function getWidth(y) {
  const yArmpit = 0.25;
  if (y < yArmpit) {
    const t = (y - yHem) / (yArmpit - yHem);
    return 0.52 - 0.04 * Math.sin(t * Math.PI);
  } else {
    const t = (y - yArmpit) / (yShoulder - yArmpit);
    return 0.50 + 0.10 * t;
  }
}

const frontCutout = [];
for (let i = 0; i <= numYTorso; i++) {
  const row = [];
  const tY = i / numYTorso;
  const y = yHem + tY * (yShoulder - yHem);
  const w = getWidth(y);
  for (let j = 0; j <= numXTorso; j++) {
    const tX = j / numXTorso;
    const x = -w + tX * (2 * w);
    let isNeckCutout = false;
    if (y > yCollarDip) {
      const neckT = (y - yCollarDip) / (yNeckTop - yCollarDip);
      const neckHalfW = 0.22 * Math.sqrt(Math.max(0, neckT));
      if (Math.abs(x) < neckHalfW) isNeckCutout = true;
    }
    row.push(isNeckCutout);
  }
  frontCutout.push(row);
}

for (let i = 0; i < numYTorso; i++) {
  for (let j = 0; j < numXTorso; j++) {
    if (frontCutout[i + 1][j] && frontCutout[i + 1][j + 1]) continue;
    frontQuads++;
  }
}

const backCutout = [];
for (let i = 0; i <= numYTorso; i++) {
  const row = [];
  const tY = i / numYTorso;
  const y = yHem + tY * (yShoulder - yHem);
  const w = getWidth(y);
  for (let j = 0; j <= numXTorso; j++) {
    const tX = j / numXTorso;
    const x = w - tX * (2 * w);
    let isNeckCutout = false;
    const yBackCollarDip = 0.62;
    if (y > yBackCollarDip) {
      const neckT = (y - yBackCollarDip) / (yNeckTop - yBackCollarDip);
      const neckHalfW = 0.22 * Math.sqrt(Math.max(0, neckT));
      if (Math.abs(x) < neckHalfW) isNeckCutout = true;
    }
    row.push(isNeckCutout);
  }
  backCutout.push(row);
}

let backQuads = 0;
for (let i = 0; i < numYTorso; i++) {
  for (let j = 0; j < numXTorso; j++) {
    if (backCutout[i + 1][j] && backCutout[i + 1][j + 1]) continue;
    backQuads++;
  }
}

const iArmpit = Math.floor((numYTorso * (0.25 - yHem)) / (yShoulder - yHem));
const sideSeamQuads = 2 * iArmpit;
const sleeveQuads = 2 * (10 * 16);
const collarQuads = 32;

console.log({
  frontTriangles: frontQuads * 2,
  backTriangles: backQuads * 2,
  sideSeamTriangles: sideSeamQuads * 2,
  sleeveTriangles: sleeveQuads * 2,
  collarTriangles: collarQuads * 2,
  totalTriangles: (frontQuads + backQuads + sideSeamQuads + sleeveQuads + collarQuads) * 2
});
