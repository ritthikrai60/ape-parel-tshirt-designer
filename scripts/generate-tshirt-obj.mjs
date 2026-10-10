/**
 * scripts/generate-tshirt-obj.mjs
 * Generates public/models/tshirt.obj Wavefront mesh for ape-parel 3D studio.
 *
 * UV Partition Contract:
 * - Front Torso & Sleeves: u in [0.04, 0.46], v in [0.05, 0.95]
 * - Back Torso & Sleeves:  u in [0.54, 0.96], v in [0.05, 0.95]
 * - Seam safety margin:    8% blank zone between u=0.46 and u=0.54 (zero bleed)
 * - Orientation:           Anti-mirrored so screen-left maps to smaller u on both sides
 */
import fs from 'fs';
import path from 'path';

export function generateTShirtOBJ() {
  const positions = [];
  const uvs = [];
  const normals = [];
  const faces = [];

  function addV(x, y, z) {
    positions.push([x, y, z]);
    return positions.length;
  }
  function addVT(u, v) {
    uvs.push([u, v]);
    return uvs.length;
  }
  function addVN(nx, ny, nz) {
    const len = Math.hypot(nx, ny, nz) || 1;
    normals.push([nx / len, ny / len, nz / len]);
    return normals.length;
  }
  function addQuad(v1, vt1, vn1, v2, vt2, vn2, v3, vt3, vn3, v4, vt4, vn4) {
    faces.push({ v: [v1, v2, v3], vt: [vt1, vt2, vt3], vn: [vn1, vn2, vn3] });
    faces.push({ v: [v1, v3, v4], vt: [vt1, vt3, vt4], vn: [vn1, vn3, vn4] });
  }

  const yHem = -0.85;
  const yArmpit = 0.25;
  const yShoulder = 0.58;
  const yNeckTop = 0.66;
  const yCollarDip = 0.46;

  const numYTorso = 24;
  const numXTorso = 20;

  const uFrontMin = 0.04, uFrontMax = 0.46;
  const uBackMin = 0.54, uBackMax = 0.96;
  const vMin = 0.05, vMax = 0.95;

  function getWidth(y) {
    if (y < yArmpit) {
      const t = (y - yHem) / (yArmpit - yHem);
      return 0.52 - 0.04 * Math.sin(t * Math.PI);
    } else {
      const t = (y - yArmpit) / (yShoulder - yArmpit);
      return 0.50 + 0.10 * t;
    }
  }

  function getDepth(y, isFront) {
    const t = (y - yHem) / (yNeckTop - yHem);
    const baseD = 0.18 + 0.03 * Math.sin(t * Math.PI);
    return isFront ? baseD : baseD * 0.92;
  }

  function getDrape(x, y, isFront) {
    const fold1 = 0.018 * Math.sin(5 * Math.PI * (y - yHem)) * Math.cos(2 * Math.PI * x);
    const fold2 = 0.010 * Math.sin(8 * Math.PI * (y - yHem));
    const sideTension = 0.012 * Math.cos(3 * Math.PI * (y - yHem));
    return fold1 + fold2 + sideTension;
  }

  // 1. FRONT TORSO
  const frontGrid = [];
  for (let i = 0; i <= numYTorso; i++) {
    const row = [];
    const tY = i / numYTorso;
    const y = yHem + tY * (yShoulder - yHem);
    const w = getWidth(y);
    const d = getDepth(y, true);

    for (let j = 0; j <= numXTorso; j++) {
      const tX = j / numXTorso;
      const x = -w + tX * (2 * w);
      const uParam = 2 * tX - 1;
      const arc = Math.sqrt(Math.max(0, 1 - uParam * uParam));
      const drape = getDrape(x, y, true);
      const z = Math.max(0, d * arc + drape * arc);

      const nx = uParam * 0.7;
      const ny = 0.1;
      const nz = Math.max(0.3, arc);

      const u = uFrontMin + tX * (uFrontMax - uFrontMin);
      const v = vMin + tY * (vMax - vMin);

      let isNeckCutout = false;
      if (y > yCollarDip) {
        const neckT = (y - yCollarDip) / (yNeckTop - yCollarDip);
        const neckHalfW = 0.22 * Math.sqrt(Math.max(0, neckT));
        if (Math.abs(x) < neckHalfW) isNeckCutout = true;
      }

      const vIdx = addV(x, y, z);
      const vtIdx = addVT(u, v);
      const vnIdx = addVN(nx, ny, nz);
      row.push({ vIdx, vtIdx, vnIdx, isNeckCutout });
    }
    frontGrid.push(row);
  }

  for (let i = 0; i < numYTorso; i++) {
    for (let j = 0; j < numXTorso; j++) {
      const p00 = frontGrid[i][j];
      const p10 = frontGrid[i + 1][j];
      const p11 = frontGrid[i + 1][j + 1];
      const p01 = frontGrid[i][j + 1];
      if (p10.isNeckCutout && p11.isNeckCutout) continue;
      addQuad(
        p00.vIdx, p00.vtIdx, p00.vnIdx,
        p01.vIdx, p01.vtIdx, p01.vnIdx,
        p11.vIdx, p11.vtIdx, p11.vnIdx,
        p10.vIdx, p10.vtIdx, p10.vnIdx
      );
    }
  }

  // 2. BACK TORSO
  const backGrid = [];
  for (let i = 0; i <= numYTorso; i++) {
    const row = [];
    const tY = i / numYTorso;
    const y = yHem + tY * (yShoulder - yHem);
    const w = getWidth(y);
    const d = getDepth(y, false);

    for (let j = 0; j <= numXTorso; j++) {
      const tX = j / numXTorso;
      const x = w - tX * (2 * w); // Reversed for anti-mirroring
      const uParam = 2 * tX - 1;
      const arc = Math.sqrt(Math.max(0, 1 - uParam * uParam));
      const drape = getDrape(x, y, false);
      const z = -Math.max(0, d * arc + drape * arc);

      const nx = -uParam * 0.7;
      const ny = 0.1;
      const nz = -Math.max(0.3, arc);

      const u = uBackMin + tX * (uBackMax - uBackMin);
      const v = vMin + tY * (vMax - vMin);

      let isNeckCutout = false;
      const yBackCollarDip = 0.62;
      if (y > yBackCollarDip) {
        const neckT = (y - yBackCollarDip) / (yNeckTop - yBackCollarDip);
        const neckHalfW = 0.22 * Math.sqrt(Math.max(0, neckT));
        if (Math.abs(x) < neckHalfW) isNeckCutout = true;
      }

      const vIdx = addV(x, y, z);
      const vtIdx = addVT(u, v);
      const vnIdx = addVN(nx, ny, nz);
      row.push({ vIdx, vtIdx, vnIdx, isNeckCutout });
    }
    backGrid.push(row);
  }

  for (let i = 0; i < numYTorso; i++) {
    for (let j = 0; j < numXTorso; j++) {
      const p00 = backGrid[i][j];
      const p10 = backGrid[i + 1][j];
      const p11 = backGrid[i + 1][j + 1];
      const p01 = backGrid[i][j + 1];
      if (p10.isNeckCutout && p11.isNeckCutout) continue;
      addQuad(
        p00.vIdx, p00.vtIdx, p00.vnIdx,
        p01.vIdx, p01.vtIdx, p01.vnIdx,
        p11.vIdx, p11.vtIdx, p11.vnIdx,
        p10.vIdx, p10.vtIdx, p10.vnIdx
      );
    }
  }

  // 3. SIDE SEAMS
  const iArmpit = Math.floor((numYTorso * (yArmpit - yHem)) / (yShoulder - yHem));
  for (let i = 0; i < iArmpit; i++) {
    const f0 = frontGrid[i][0];
    const f1 = frontGrid[i + 1][0];
    const b0 = backGrid[i][numXTorso];
    const b1 = backGrid[i + 1][numXTorso];
    addQuad(f0.vIdx, f0.vtIdx, f0.vnIdx, b0.vIdx, b0.vtIdx, b0.vnIdx, b1.vIdx, b1.vtIdx, b1.vnIdx, f1.vIdx, f1.vtIdx, f1.vnIdx);

    const fr0 = frontGrid[i][numXTorso];
    const fr1 = frontGrid[i + 1][numXTorso];
    const br0 = backGrid[i][0];
    const br1 = backGrid[i + 1][0];
    addQuad(fr0.vIdx, fr0.vtIdx, fr0.vnIdx, fr1.vIdx, fr1.vtIdx, fr1.vnIdx, br1.vIdx, br1.vtIdx, br1.vnIdx, br0.vIdx, br0.vtIdx, br0.vnIdx);
  }

  // 4. SLEEVES
  function createSleeve(isRight) {
    const numSleeveSegments = 10;
    const numSleeveRadial = 16;
    const dir = isRight ? 1 : -1;
    const xBase = dir * 0.52, yBase = 0.45, zBase = 0.0;
    const xCuff = dir * 0.95, yCuff = 0.25, zCuff = 0.02;

    const sleeveGrid = [];
    for (let s = 0; s <= numSleeveSegments; s++) {
      const ring = [];
      const tS = s / numSleeveSegments;
      const cX = xBase + tS * (xCuff - xBase);
      const cY = yBase + tS * (yCuff - yBase);
      const cZ = zBase + tS * (zCuff - zBase);
      const radius = 0.16 - 0.03 * tS;

      for (let r = 0; r <= numSleeveRadial; r++) {
        const phi = (r / numSleeveRadial) * 2 * Math.PI;
        const rx = 0;
        const ry = radius * Math.cos(phi);
        const rz = radius * Math.sin(phi);

        const vx = cX + rx, vy = cY + ry, vz = cZ + rz;
        const nx = dir * 0.3 + (rx / radius) * 0.7;
        const ny = ry / radius;
        const nz = rz / radius;

        let u, v;
        const vSleeve = 0.50 + 0.35 * (1 - tS);
        if (rz >= 0) {
          const uNorm = isRight ? 0.35 + 0.12 * tS : 0.15 - 0.12 * tS;
          u = Math.min(uFrontMax, Math.max(uFrontMin, uNorm));
        } else {
          const uNorm = isRight ? 0.65 - 0.12 * tS : 0.85 + 0.12 * tS;
          u = Math.min(uBackMax, Math.max(uBackMin, uNorm));
        }
        v = Math.min(vMax, Math.max(vMin, vSleeve));

        const vIdx = addV(vx, vy, vz);
        const vtIdx = addVT(u, v);
        const vnIdx = addVN(nx, ny, nz);
        ring.push({ vIdx, vtIdx, vnIdx });
      }
      sleeveGrid.push(ring);
    }

    for (let s = 0; s < numSleeveSegments; s++) {
      for (let r = 0; r < numSleeveRadial; r++) {
        const p00 = sleeveGrid[s][r];
        const p10 = sleeveGrid[s + 1][r];
        const p11 = sleeveGrid[s + 1][r + 1];
        const p01 = sleeveGrid[s][r + 1];
        if (isRight) {
          addQuad(p00.vIdx, p00.vtIdx, p00.vnIdx, p01.vIdx, p01.vtIdx, p01.vnIdx, p11.vIdx, p11.vtIdx, p11.vnIdx, p10.vIdx, p10.vtIdx, p10.vnIdx);
        } else {
          addQuad(p00.vIdx, p00.vtIdx, p00.vnIdx, p10.vIdx, p10.vtIdx, p10.vnIdx, p11.vIdx, p11.vtIdx, p11.vnIdx, p01.vIdx, p01.vtIdx, p01.vnIdx);
        }
      }
    }
  }

  createSleeve(false);
  createSleeve(true);

  // 5. COLLAR BAND
  const numCollarPts = 32;
  const collarBandOuter = [];
  const collarBandInner = [];

  for (let k = 0; k <= numCollarPts; k++) {
    const theta = (k / numCollarPts) * 2 * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const rx = 0.21;
    const x = rx * sinT;

    let y, z;
    if (cosT >= 0) {
      const t = cosT;
      y = yShoulder + 0.04 - (yShoulder - yCollarDip) * t;
      z = 0.12 * t;
    } else {
      const t = -cosT;
      y = yShoulder + 0.04 + (yNeckTop - yShoulder) * t;
      z = -0.11 * t;
    }

    const vOuterIdx = addV(x, y, z);
    const vtOuterIdx = addVT(cosT >= 0 ? 0.25 + 0.15 * sinT : 0.75 + 0.15 * sinT, 0.90 + 0.05 * Math.abs(cosT));
    const vnOuterIdx = addVN(sinT * 0.3, 0.4, cosT * 0.8);
    collarBandOuter.push({ vIdx: vOuterIdx, vtIdx: vtOuterIdx, vnIdx: vnOuterIdx });

    const xIn = x * 0.88, yIn = y - 0.025, zIn = z * 0.88;
    const vInnerIdx = addV(xIn, yIn, zIn);
    const vtInnerIdx = addVT(cosT >= 0 ? 0.25 + 0.12 * sinT : 0.75 + 0.12 * sinT, 0.93 + 0.04 * Math.abs(cosT));
    const vnInnerIdx = addVN(sinT * 0.3, 0.5, cosT * 0.8);
    collarBandInner.push({ vIdx: vInnerIdx, vtIdx: vtInnerIdx, vnIdx: vnInnerIdx });
  }

  for (let k = 0; k < numCollarPts; k++) {
    const o0 = collarBandOuter[k];
    const o1 = collarBandOuter[k + 1];
    const i0 = collarBandInner[k];
    const i1 = collarBandInner[k + 1];
    addQuad(o0.vIdx, o0.vtIdx, o0.vnIdx, o1.vIdx, o1.vtIdx, o1.vnIdx, i1.vIdx, i1.vtIdx, i1.vnIdx, i0.vIdx, i0.vtIdx, i0.vnIdx);
  }

  const lines = [
    '# ape-parel Wavefront OBJ T-Shirt Model',
    '# Milestone 3: 2D & 3D Interactive Design Studio',
    'o TShirt',
    ''
  ];
  for (const [x, y, z] of positions) lines.push(`v ${x.toFixed(5)} ${y.toFixed(5)} ${z.toFixed(5)}`);
  lines.push('');
  for (const [u, v] of uvs) lines.push(`vt ${u.toFixed(5)} ${v.toFixed(5)}`);
  lines.push('');
  for (const [nx, ny, nz] of normals) lines.push(`vn ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}`);
  lines.push('', 's 1', 'usemtl GarmentBase', '');
  for (const f of faces) lines.push(`f ${f.v[0]}/${f.vt[0]}/${f.vn[0]} ${f.v[1]}/${f.vt[1]}/${f.vn[1]} ${f.v[2]}/${f.vt[2]}/${f.vn[2]}`);

  return lines.join('\n');
}

// CLI Execution if executed directly
const isMain = process.argv[1] && (process.argv[1].endsWith('generate-tshirt-obj.mjs') || process.argv[1].endsWith('generate-tshirt-obj.js'));
if (isMain) {
  const targetDir = path.resolve(process.cwd(), 'public/models');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetFile = path.join(targetDir, 'tshirt.obj');
  const objContent = generateTShirtOBJ();
  fs.writeFileSync(targetFile, objContent, 'utf8');
  console.log(`Generated ${targetFile} (${Buffer.byteLength(objContent, 'utf8')} bytes)`);
}
