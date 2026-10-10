/**
 * src/lib/tshirtGeometry.ts
 * Procedural BufferGeometry generator for Three.js with authentic APX-HVY-001 drape
 * and non-overlapping dual-zone UV unwrapping (Front: u in [0.04, 0.46], Back: u in [0.54, 0.96]).
 *
 * Provides a zero-network procedural geometry fallback for Three.js client previews
 * and headless rendering environments.
 */
import * as THREE from 'three';

export function createProceduralTShirtGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  function addVertex(
    x: number,
    y: number,
    z: number,
    u: number,
    v: number,
    nx: number,
    ny: number,
    nz: number
  ): number {
    positions.push(x, y, z);
    uvs.push(u, v);
    normals.push(nx, ny, nz);
    return positions.length / 3 - 1;
  }

  function addQuad(i0: number, i1: number, i2: number, i3: number) {
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

  const uFrontMin = 0.04;
  const uFrontMax = 0.46;
  const uBackMin = 0.54;
  const uBackMax = 0.96;
  const vMin = 0.05;
  const vMax = 0.95;

  function getWidth(y: number): number {
    if (y < yArmpit) {
      const t = (y - yHem) / (yArmpit - yHem);
      return 0.52 - 0.04 * Math.sin(t * Math.PI);
    }
    const t = (y - yArmpit) / (yShoulder - yArmpit);
    return 0.50 + 0.10 * t;
  }

  function getDepth(y: number, isFront: boolean): number {
    const t = (y - yHem) / (yNeckTop - yHem);
    const baseD = 0.18 + 0.03 * Math.sin(t * Math.PI);
    return isFront ? baseD : baseD * 0.92;
  }

  function getDrape(x: number, y: number, isFront: boolean): number {
    const fold1 = 0.018 * Math.sin(5 * Math.PI * (y - yHem)) * Math.cos(2 * Math.PI * x);
    const fold2 = 0.010 * Math.sin(8 * Math.PI * (y - yHem));
    const sideTension = 0.012 * Math.cos(3 * Math.PI * (y - yHem));
    return fold1 + fold2 + sideTension;
  }

  // 1. FRONT TORSO
  const frontGrid: { idx: number; isNeckCutout: boolean }[][] = [];
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
      const z = Math.max(0, d * arc + getDrape(x, y, true) * arc);
      const u = uFrontMin + tX * (uFrontMax - uFrontMin);
      const v = vMin + tY * (vMax - vMin);

      let isNeckCutout = false;
      if (y > yCollarDip) {
        const neckT = (y - yCollarDip) / (yNeckTop - yCollarDip);
        if (Math.abs(x) < 0.22 * Math.sqrt(Math.max(0, neckT))) isNeckCutout = true;
      }
      row.push({
        idx: addVertex(x, y, z, u, v, uParam * 0.7, 0.1, Math.max(0.3, arc)),
        isNeckCutout,
      });
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
  const backGrid: { idx: number; isNeckCutout: boolean }[][] = [];
  for (let i = 0; i <= numYTorso; i++) {
    const row = [];
    const tY = i / numYTorso;
    const y = yHem + tY * (yShoulder - yHem);
    const w = getWidth(y);
    const d = getDepth(y, false);

    for (let j = 0; j <= numXTorso; j++) {
      const tX = j / numXTorso;
      const x = w - tX * (2 * w);
      const uParam = 2 * tX - 1;
      const arc = Math.sqrt(Math.max(0, 1 - uParam * uParam));
      const z = -Math.max(0, d * arc + getDrape(x, y, false) * arc);
      const u = uBackMin + tX * (uBackMax - uBackMin);
      const v = vMin + tY * (vMax - vMin);

      let isNeckCutout = false;
      if (y > 0.62) {
        const neckT = (y - 0.62) / (yNeckTop - 0.62);
        if (Math.abs(x) < 0.22 * Math.sqrt(Math.max(0, neckT))) isNeckCutout = true;
      }
      row.push({
        idx: addVertex(x, y, z, u, v, -uParam * 0.7, 0.1, -Math.max(0.3, arc)),
        isNeckCutout,
      });
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
    addQuad(
      frontGrid[i][0].idx,
      backGrid[i][numXTorso].idx,
      backGrid[i + 1][numXTorso].idx,
      frontGrid[i + 1][0].idx
    );
    addQuad(
      frontGrid[i][numXTorso].idx,
      frontGrid[i + 1][numXTorso].idx,
      backGrid[i + 1][0].idx,
      backGrid[i][0].idx
    );
  }

  // 4. SLEEVES
  function buildSleeve(isRight: boolean) {
    const numSleeveSegments = 10;
    const numSleeveRadial = 16;
    const dir = isRight ? 1 : -1;
    const xBase = dir * 0.52;
    const yBase = 0.45;
    const zBase = 0.0;
    const xCuff = dir * 0.95;
    const yCuff = 0.25;
    const zCuff = 0.02;

    const sleeveGrid: number[][] = [];
    for (let s = 0; s <= numSleeveSegments; s++) {
      const ring: number[] = [];
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

        let u: number;
        if (rz >= 0) {
          u = Math.min(uFrontMax, Math.max(uFrontMin, isRight ? 0.35 + 0.12 * tS : 0.15 - 0.12 * tS));
        } else {
          u = Math.min(uBackMax, Math.max(uBackMin, isRight ? 0.65 - 0.12 * tS : 0.85 + 0.12 * tS));
        }
        const v = Math.min(vMax, Math.max(vMin, 0.50 + 0.35 * (1 - tS)));
        ring.push(
          addVertex(
            vx,
            vy,
            vz,
            u,
            v,
            dir * 0.3 + (rx / radius) * 0.7,
            ry / radius,
            rz / radius
          )
        );
      }
      sleeveGrid.push(ring);
    }

    for (let s = 0; s < numSleeveSegments; s++) {
      for (let r = 0; r < numSleeveRadial; r++) {
        if (isRight) {
          addQuad(
            sleeveGrid[s][r],
            sleeveGrid[s][r + 1],
            sleeveGrid[s + 1][r + 1],
            sleeveGrid[s + 1][r]
          );
        } else {
          addQuad(
            sleeveGrid[s][r],
            sleeveGrid[s + 1][r],
            sleeveGrid[s + 1][r + 1],
            sleeveGrid[s][r + 1]
          );
        }
      }
    }
  }

  buildSleeve(false);
  buildSleeve(true);

  // 5. COLLAR BAND
  const numCollarPts = 32;
  const outerRing: number[] = [];
  const innerRing: number[] = [];
  for (let k = 0; k <= numCollarPts; k++) {
    const theta = (k / numCollarPts) * 2 * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const x = 0.21 * sinT;
    const y =
      cosT >= 0
        ? yShoulder + 0.04 - (yShoulder - yCollarDip) * cosT
        : yShoulder + 0.04 + (yNeckTop - yShoulder) * -cosT;
    const z = cosT >= 0 ? 0.12 * cosT : -0.11 * -cosT;
    const uOut = cosT >= 0 ? 0.25 + 0.15 * sinT : 0.75 + 0.15 * sinT;
    const vOut = 0.90 + 0.05 * Math.abs(cosT);
    outerRing.push(addVertex(x, y, z, uOut, vOut, sinT * 0.3, 0.4, cosT * 0.8));

    const uIn = cosT >= 0 ? 0.25 + 0.12 * sinT : 0.75 + 0.12 * sinT;
    const vIn = 0.93 + 0.04 * Math.abs(cosT);
    innerRing.push(
      addVertex(x * 0.88, y - 0.025, z * 0.88, uIn, vIn, sinT * 0.3, 0.5, cosT * 0.8)
    );
  }
  for (let k = 0; k < numCollarPts; k++) {
    addQuad(outerRing[k], outerRing[k + 1], innerRing[k + 1], innerRing[k]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
