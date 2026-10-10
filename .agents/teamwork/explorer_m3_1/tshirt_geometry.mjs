import * as THREE from 'three';

export function createProceduralTShirtGeometry() {
  const positions = [];
  const uvs = [];
  const normals = [];
  const indices = [];

  // Helper
  function addVertex(x, y, z, u, v, nx, ny, nz) {
    positions.push(x, y, z);
    uvs.push(u, v);
    normals.push(nx, ny, nz);
    return (positions.length / 3) - 1; // 0-based index
  }

  function addQuad(i0, i1, i2, i3) {
    indices.push(i0, i1, i2);
    indices.push(i0, i2, i3);
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
      const uParam = (2 * tX - 1);
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

      const idx = addVertex(x, y, z, u, v, nx, ny, nz);
      row.push({ idx, isNeckCutout });
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
      addQuad(p00.idx, p01.idx, p11.idx, p10.idx);
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
      const x = w - tX * (2 * w);
      const uParam = (2 * tX - 1);
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

      const idx = addVertex(x, y, z, u, v, nx, ny, nz);
      row.push({ idx, isNeckCutout });
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
      addQuad(p00.idx, p01.idx, p11.idx, p10.idx);
    }
  }

  // 3. SIDE SEAMS
  const iArmpit = Math.floor((numYTorso * (yArmpit - yHem)) / (yShoulder - yHem));
  for (let i = 0; i < iArmpit; i++) {
    const f0 = frontGrid[i][0];
    const f1 = frontGrid[i + 1][0];
    const b0 = backGrid[i][numXTorso];
    const b1 = backGrid[i + 1][numXTorso];
    addQuad(f0.idx, b0.idx, b1.idx, f1.idx);

    const fr0 = frontGrid[i][numXTorso];
    const fr1 = frontGrid[i + 1][numXTorso];
    const br0 = backGrid[i][0];
    const br1 = backGrid[i + 1][0];
    addQuad(fr0.idx, fr1.idx, br1.idx, br0.idx);
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

        const vx = cX + rx;
        const vy = cY + ry;
        const vz = cZ + rz;

        const nx = dir * 0.3 + rx / radius * 0.7;
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

        const idx = addVertex(vx, vy, vz, u, v, nx, ny, nz);
        ring.push(idx);
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
          addQuad(p00, p01, p11, p10);
        } else {
          addQuad(p00, p10, p11, p01);
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

    const uOut = cosT >= 0 ? 0.25 + 0.15 * sinT : 0.75 + 0.15 * sinT;
    const vOut = 0.90 + 0.05 * Math.abs(cosT);
    const idxOut = addVertex(x, y, z, uOut, vOut, sinT * 0.3, 0.4, cosT * 0.8);
    collarBandOuter.push(idxOut);

    const xIn = x * 0.88;
    const yIn = y - 0.025;
    const zIn = z * 0.88;
    const uIn = cosT >= 0 ? 0.25 + 0.12 * sinT : 0.75 + 0.12 * sinT;
    const vIn = 0.93 + 0.04 * Math.abs(cosT);
    const idxIn = addVertex(xIn, yIn, zIn, uIn, vIn, sinT * 0.3, 0.5, cosT * 0.8);
    collarBandInner.push(idxIn);
  }

  for (let k = 0; k < numCollarPts; k++) {
    addQuad(
      collarBandOuter[k],
      collarBandOuter[k + 1],
      collarBandInner[k + 1],
      collarBandInner[k]
    );
  }

  // Build THREE.BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
