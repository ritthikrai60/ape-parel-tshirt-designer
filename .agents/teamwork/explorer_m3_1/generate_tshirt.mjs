/**
 * Prototype T-Shirt OBJ Generator for ape-parel Milestone 3
 * Generates public/models/tshirt.obj Wavefront OBJ file with:
 * - Front Torso, Back Torso, Ribbed Collar, Left/Right Sleeves
 * - Organic garment drape folds
 * - Precise UV mapping: Front [0.0, 0.5], Back [0.5, 1.0]
 * - Outward facing normals, smooth shading, valid triangulated faces
 */

import fs from 'fs';
import path from 'path';

export function generateTShirtOBJ() {
  const positions = [];
  const uvs = [];
  const normals = [];
  const faces = [];

  // Helper to add vertex
  function addV(x, y, z) {
    positions.push([x, y, z]);
    return positions.length; // 1-based index
  }

  function addVT(u, v) {
    uvs.push([u, v]);
    return uvs.length; // 1-based index
  }

  function addVN(nx, ny, nz) {
    const len = Math.hypot(nx, ny, nz) || 1;
    normals.push([nx / len, ny / len, nz / len]);
    return normals.length; // 1-based index
  }

  function addTri(v1, vt1, vn1, v2, vt2, vn2, v3, vt3, vn3) {
    faces.push({
      v: [v1, v2, v3],
      vt: [vt1, vt2, vt3],
      vn: [vn1, vn2, vn3]
    });
  }

  function addQuad(v1, vt1, vn1, v2, vt2, vn2, v3, vt3, vn3, v4, vt4, vn4) {
    // Two triangles: (1, 2, 3) and (1, 3, 4)
    addTri(v1, vt1, vn1, v2, vt2, vn2, v3, vt3, vn3);
    addTri(v1, vt1, vn1, v3, vt3, vn3, v4, vt4, vn4);
  }

  // --- PARAMETERS ---
  // Torso bounds
  const yHem = -0.85;
  const yArmpit = 0.25;
  const yShoulder = 0.58;
  const yNeckTop = 0.66;
  const yCollarDip = 0.46; // Front neck dip

  const numYTorso = 24;
  const numXTorso = 20;

  // UV Margins to prevent texture bleed
  // Front: u in [0.04, 0.46], v in [0.05, 0.95]
  // Back:  u in [0.54, 0.96], v in [0.05, 0.95]
  const uFrontMin = 0.04;
  const uFrontMax = 0.46;
  const uBackMin = 0.54;
  const uBackMax = 0.96;
  const vMin = 0.05;
  const vMax = 0.95;

  // Garment width function
  function getWidth(y) {
    if (y < yArmpit) {
      // Lower torso: waist taper and slight hem flare
      const t = (y - yHem) / (yArmpit - yHem);
      return 0.52 - 0.04 * Math.sin(t * Math.PI); // 0.52 at hem, 0.48 at waist, 0.50 at armpit
    } else {
      // Upper torso: chest to shoulder
      const t = (y - yArmpit) / (yShoulder - yArmpit);
      return 0.50 + 0.10 * t; // expands to shoulder width ~0.60
    }
  }

  // Garment depth function (Z thickness)
  function getDepth(y, isFront) {
    const t = (y - yHem) / (yNeckTop - yHem);
    const baseD = 0.18 + 0.03 * Math.sin(t * Math.PI);
    return isFront ? baseD : baseD * 0.92;
  }

  // Drape fold perturbation
  function getDrape(x, y, isFront) {
    // Subtle fabric wrinkles, more pronounced near hem and sides
    const fold1 = 0.018 * Math.sin(5 * Math.PI * (y - yHem)) * Math.cos(2 * Math.PI * x);
    const fold2 = 0.010 * Math.sin(8 * Math.PI * (y - yHem));
    const sideTension = 0.012 * Math.cos(3 * Math.PI * (y - yHem));
    return fold1 + fold2 + sideTension;
  }

  // 1. GENERATE FRONT TORSO GRID
  // Grid of vertices: row i in [0..numYTorso], col j in [0..numXTorso]
  const frontGrid = [];
  for (let i = 0; i <= numYTorso; i++) {
    const row = [];
    const tY = i / numYTorso;
    const y = yHem + tY * (yShoulder - yHem);
    const w = getWidth(y);
    const d = getDepth(y, true);

    for (let j = 0; j <= numXTorso; j++) {
      const tX = j / numXTorso; // 0 (wearer right / screen left) to 1 (wearer left / screen right)
      // Map tX in [0, 1] to x in [-w, +w]
      const x = -w + tX * (2 * w);

      // Arc for front chest/belly: sqrt(1 - uParam^2)
      const uParam = (2 * tX - 1); // [-1, 1]
      const arc = Math.sqrt(Math.max(0, 1 - uParam * uParam));
      const drape = getDrape(x, y, true);
      const z = Math.max(0, d * arc + drape * arc);

      // Normal approximation
      const nx = uParam * 0.7;
      const ny = 0.1;
      const nz = Math.max(0.3, arc);

      // Front UV: as x increases (left to right), u increases from uFrontMin to uFrontMax
      const u = uFrontMin + tX * (uFrontMax - uFrontMin);
      const v = vMin + tY * (vMax - vMin);

      // Exclude neck cutout if y > yCollarDip and within neck width
      let isNeckCutout = false;
      if (y > yCollarDip) {
        const neckT = (y - yCollarDip) / (yNeckTop - yCollarDip);
        const neckHalfW = 0.22 * Math.sqrt(Math.max(0, neckT));
        if (Math.abs(x) < neckHalfW) {
          isNeckCutout = true;
        }
      }

      const vIdx = addV(x, y, z);
      const vtIdx = addVT(u, v);
      const vnIdx = addVN(nx, ny, nz);

      row.push({ vIdx, vtIdx, vnIdx, x, y, z, isNeckCutout });
    }
    frontGrid.push(row);
  }

  // Front Torso Faces
  for (let i = 0; i < numYTorso; i++) {
    for (let j = 0; j < numXTorso; j++) {
      const p00 = frontGrid[i][j];
      const p10 = frontGrid[i + 1][j];
      const p11 = frontGrid[i + 1][j + 1];
      const p01 = frontGrid[i][j + 1];

      // Skip if all 4 or top 2 are neck cutout
      if (p10.isNeckCutout && p11.isNeckCutout) continue;

      // Front winding: CCW facing front (towards +Z)
      // p00 -> p10 -> p11 -> p01
      addQuad(
        p00.vIdx, p00.vtIdx, p00.vnIdx,
        p01.vIdx, p01.vtIdx, p01.vnIdx,
        p11.vIdx, p11.vtIdx, p11.vnIdx,
        p10.vIdx, p10.vtIdx, p10.vnIdx
      );
    }
  }

  // 2. GENERATE BACK TORSO GRID
  // Grid of vertices: row i in [0..numYTorso], col j in [0..numXTorso]
  const backGrid = [];
  for (let i = 0; i <= numYTorso; i++) {
    const row = [];
    const tY = i / numYTorso;
    const y = yHem + tY * (yShoulder - yHem);
    const w = getWidth(y);
    const d = getDepth(y, false);

    for (let j = 0; j <= numXTorso; j++) {
      const tX = j / numXTorso; // 0 to 1
      // For BACK:
      // When looking at the back of the shirt:
      // Screen left is wearer's left (+w)
      // Screen right is wearer's right (-w)
      // To ensure no horizontal mirroring on the back canvas:
      // Left of back canvas (u -> uBackMin = 0.54) maps to screen left (+w)
      // Right of back canvas (u -> uBackMax = 0.96) maps to screen right (-w)
      const x = w - tX * (2 * w); // x goes from +w down to -w

      const uParam = (2 * tX - 1); // [-1, 1]
      const arc = Math.sqrt(Math.max(0, 1 - uParam * uParam));
      const drape = getDrape(x, y, false);
      const z = -Math.max(0, d * arc + drape * arc);

      // Back normals point towards -Z
      const nx = -uParam * 0.7;
      const ny = 0.1;
      const nz = -Math.max(0.3, arc);

      // Back UV: as tX increases (from left of back canvas to right of back canvas),
      // u increases from uBackMin to uBackMax!
      const u = uBackMin + tX * (uBackMax - uBackMin);
      const v = vMin + tY * (vMax - vMin);

      // Back neck cutout (higher scoop than front)
      let isNeckCutout = false;
      const yBackCollarDip = 0.62;
      if (y > yBackCollarDip) {
        const neckT = (y - yBackCollarDip) / (yNeckTop - yBackCollarDip);
        const neckHalfW = 0.22 * Math.sqrt(Math.max(0, neckT));
        if (Math.abs(x) < neckHalfW) {
          isNeckCutout = true;
        }
      }

      const vIdx = addV(x, y, z);
      const vtIdx = addVT(u, v);
      const vnIdx = addVN(nx, ny, nz);

      row.push({ vIdx, vtIdx, vnIdx, x, y, z, isNeckCutout });
    }
    backGrid.push(row);
  }

  // Back Torso Faces
  for (let i = 0; i < numYTorso; i++) {
    for (let j = 0; j < numXTorso; j++) {
      const p00 = backGrid[i][j];
      const p10 = backGrid[i + 1][j];
      const p11 = backGrid[i + 1][j + 1];
      const p01 = backGrid[i][j + 1];

      if (p10.isNeckCutout && p11.isNeckCutout) continue;

      // Back winding: CCW facing back (towards -Z)
      // Since x goes from +w to -w, from back perspective (+Z behind)
      addQuad(
        p00.vIdx, p00.vtIdx, p00.vnIdx,
        p01.vIdx, p01.vtIdx, p01.vnIdx,
        p11.vIdx, p11.vtIdx, p11.vnIdx,
        p10.vIdx, p10.vtIdx, p10.vnIdx
      );
    }
  }

  // 3. SEW SIDE SEAMS (Connecting Front and Back at edges below armpit)
  // Below armpit (y < yArmpit): connect front edge to back edge
  const iArmpit = Math.floor((numYTorso * (yArmpit - yHem)) / (yShoulder - yHem));
  for (let i = 0; i < iArmpit; i++) {
    // Left side seam (x ~ -w):
    // Front grid j = 0 has x = -w, z ~ 0
    // Back grid j = numXTorso has x = -w, z ~ 0
    const f0 = frontGrid[i][0];
    const f1 = frontGrid[i + 1][0];
    const b0 = backGrid[i][numXTorso];
    const b1 = backGrid[i + 1][numXTorso];

    addQuad(
      f0.vIdx, f0.vtIdx, f0.vnIdx,
      b0.vIdx, b0.vtIdx, b0.vnIdx,
      b1.vIdx, b1.vtIdx, b1.vnIdx,
      f1.vIdx, f1.vtIdx, f1.vnIdx
    );

    // Right side seam (x ~ +w):
    // Front grid j = numXTorso has x = +w, z ~ 0
    // Back grid j = 0 has x = +w, z ~ 0
    const fr0 = frontGrid[i][numXTorso];
    const fr1 = frontGrid[i + 1][numXTorso];
    const br0 = backGrid[i][0];
    const br1 = backGrid[i + 1][0];

    addQuad(
      fr0.vIdx, fr0.vtIdx, fr0.vnIdx,
      fr1.vIdx, fr1.vtIdx, fr1.vnIdx,
      br1.vIdx, br1.vtIdx, br1.vnIdx,
      br0.vIdx, br0.vtIdx, br0.vnIdx
    );
  }

  // 4. GENERATE SHORT SLEEVES (Left and Right)
  function createSleeve(isRight) {
    const numSleeveSegments = 10;
    const numSleeveRadial = 16;
    const dir = isRight ? 1 : -1;

    // Shoulder point and underarm point
    const xBase = dir * 0.52;
    const yBase = 0.45;
    const zBase = 0.0;

    // Cuff end point (angled down ~30 deg and slightly forward)
    const xCuff = dir * 0.95;
    const yCuff = 0.25;
    const zCuff = 0.02;

    const sleeveGrid = [];

    for (let s = 0; s <= numSleeveSegments; s++) {
      const ring = [];
      const tS = s / numSleeveSegments;
      const cX = xBase + tS * (xCuff - xBase);
      const cY = yBase + tS * (yCuff - yBase);
      const cZ = zBase + tS * (zCuff - zBase);

      const radius = 0.16 - 0.03 * tS; // Taper from armhole to cuff

      for (let r = 0; r <= numSleeveRadial; r++) {
        const phi = (r / numSleeveRadial) * 2 * Math.PI;

        // Radial vector perpendicular to sleeve axis
        const rx = 0;
        const ry = radius * Math.cos(phi);
        const rz = radius * Math.sin(phi);

        const vx = cX + rx;
        const vy = cY + ry;
        const vz = cZ + rz;

        const nx = dir * 0.3 + rx / radius * 0.7;
        const ny = ry / radius;
        const nz = rz / radius;

        // UV mapping for sleeve:
        // If front-facing (rz >= 0), map to Front UV domain; if back-facing (rz < 0), map to Back UV domain
        let u, v;
        const vSleeve = 0.50 + 0.35 * (1 - tS);
        if (rz >= 0) {
          // Front sleeve
          const uNorm = isRight ? 0.35 + 0.12 * tS : 0.15 - 0.12 * tS;
          u = Math.min(uFrontMax, Math.max(uFrontMin, uNorm));
        } else {
          // Back sleeve
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

    // Connect sleeve rings
    for (let s = 0; s < numSleeveSegments; s++) {
      for (let r = 0; r < numSleeveRadial; r++) {
        const p00 = sleeveGrid[s][r];
        const p10 = sleeveGrid[s + 1][r];
        const p11 = sleeveGrid[s + 1][r + 1];
        const p01 = sleeveGrid[s][r + 1];

        if (isRight) {
          addQuad(
            p00.vIdx, p00.vtIdx, p00.vnIdx,
            p01.vIdx, p01.vtIdx, p01.vnIdx,
            p11.vIdx, p11.vtIdx, p11.vnIdx,
            p10.vIdx, p10.vtIdx, p10.vnIdx
          );
        } else {
          addQuad(
            p00.vIdx, p00.vtIdx, p00.vnIdx,
            p10.vIdx, p10.vtIdx, p10.vnIdx,
            p11.vIdx, p11.vtIdx, p11.vnIdx,
            p01.vIdx, p01.vtIdx, p01.vnIdx
          );
        }
      }
    }
  }

  createSleeve(false); // Left sleeve
  createSleeve(true);  // Right sleeve

  // 5. GENERATE RIBBED COLLAR BAND
  const numCollarPts = 32;
  const collarBandOuter = [];
  const collarBandInner = [];

  for (let k = 0; k <= numCollarPts; k++) {
    const theta = (k / numCollarPts) * 2 * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    // Collar ellipse
    const rx = 0.21;
    const x = rx * sinT;

    // Y and Z depending on front vs back
    let y, z;
    if (cosT >= 0) {
      // Front scoop
      const t = cosT; // 0 to 1
      y = yShoulder + 0.04 - (yShoulder - yCollarDip) * t;
      z = 0.12 * t;
    } else {
      // Back collar
      const t = -cosT; // 0 to 1
      y = yShoulder + 0.04 + (yNeckTop - yShoulder) * t;
      z = -0.11 * t;
    }

    // Outer rim of collar band
    const vOuterIdx = addV(x, y, z);
    const vtOuterIdx = addVT(
      cosT >= 0 ? 0.25 + 0.15 * sinT : 0.75 + 0.15 * sinT,
      0.90 + 0.05 * Math.abs(cosT)
    );
    const vnOuterIdx = addVN(sinT * 0.3, 0.4, cosT * 0.8);
    collarBandOuter.push({ vIdx: vOuterIdx, vtIdx: vtOuterIdx, vnIdx: vnOuterIdx });

    // Inner rim of collar band (slightly smaller and lower)
    const xIn = x * 0.88;
    const yIn = y - 0.025;
    const zIn = z * 0.88;
    const vInnerIdx = addV(xIn, yIn, zIn);
    const vtInnerIdx = addVT(
      cosT >= 0 ? 0.25 + 0.12 * sinT : 0.75 + 0.12 * sinT,
      0.93 + 0.04 * Math.abs(cosT)
    );
    const vnInnerIdx = addVN(sinT * 0.3, 0.5, cosT * 0.8);
    collarBandInner.push({ vIdx: vInnerIdx, vtIdx: vtInnerIdx, vnIdx: vnInnerIdx });
  }

  // Connect collar band
  for (let k = 0; k < numCollarPts; k++) {
    const o0 = collarBandOuter[k];
    const o1 = collarBandOuter[k + 1];
    const i0 = collarBandInner[k];
    const i1 = collarBandInner[k + 1];

    addQuad(
      o0.vIdx, o0.vtIdx, o0.vnIdx,
      o1.vIdx, o1.vtIdx, o1.vnIdx,
      i1.vIdx, i1.vtIdx, i1.vnIdx,
      i0.vIdx, i0.vtIdx, i0.vnIdx
    );
  }

  // 6. BUILD OBJ STRING
  const lines = [];
  lines.push('# ape-parel Wavefront OBJ T-Shirt Model');
  lines.push('# Milestone 3: 2D & 3D Interactive Design Studio');
  lines.push('o TShirt');
  lines.push('');

  // Vertices
  for (const [x, y, z] of positions) {
    lines.push(`v ${x.toFixed(5)} ${y.toFixed(5)} ${z.toFixed(5)}`);
  }
  lines.push('');

  // Texture coordinates
  for (const [u, v] of uvs) {
    lines.push(`vt ${u.toFixed(5)} ${v.toFixed(5)}`);
  }
  lines.push('');

  // Vertex normals
  for (const [nx, ny, nz] of normals) {
    lines.push(`vn ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}`);
  }
  lines.push('');

  lines.push('s 1');
  lines.push('usemtl GarmentBase');
  lines.push('');

  // Faces
  for (const f of faces) {
    lines.push(`f ${f.v[0]}/${f.vt[0]}/${f.vn[0]} ${f.v[1]}/${f.vt[1]}/${f.vn[1]} ${f.v[2]}/${f.vt[2]}/${f.vn[2]}`);
  }

  return {
    objContent: lines.join('\n'),
    stats: {
      verticesCount: positions.length,
      uvsCount: uvs.length,
      normalsCount: normals.length,
      facesCount: faces.length
    }
  };
}
