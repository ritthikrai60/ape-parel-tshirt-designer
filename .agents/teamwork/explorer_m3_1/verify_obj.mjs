import { generateTShirtOBJ } from './generate_tshirt.mjs';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

async function verify() {
  console.log('--- 1. Generating T-Shirt OBJ ---');
  const { objContent, stats } = generateTShirtOBJ();
  console.log('Generation stats:', stats);
  console.log('OBJ byte size:', Buffer.byteLength(objContent, 'utf8'), 'bytes');

  console.log('\n--- 2. Parsing with Three.js OBJLoader ---');
  const loader = new OBJLoader();
  const group = loader.parse(objContent);
  console.log('Group parsed successfully. Children count:', group.children.length);

  const mesh = group.children[0];
  if (!mesh || !mesh.isMesh) {
    throw new Error('Parsed object is not a THREE.Mesh!');
  }

  const geometry = mesh.geometry;
  console.log('Mesh geometry type:', geometry.type);

  const posAttr = geometry.attributes.position;
  const uvAttr = geometry.attributes.uv;
  const normAttr = geometry.attributes.normal;

  console.log('Position attribute count:', posAttr.count);
  console.log('UV attribute count:', uvAttr.count);
  console.log('Normal attribute count:', normAttr.count);

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  console.log('\n--- 3. Bounding Box ---');
  console.log('X range:', [bbox.min.x.toFixed(3), bbox.max.x.toFixed(3)], 'width:', (bbox.max.x - bbox.min.x).toFixed(3));
  console.log('Y range:', [bbox.min.y.toFixed(3), bbox.max.y.toFixed(3)], 'height:', (bbox.max.y - bbox.min.y).toFixed(3));
  console.log('Z range:', [bbox.min.z.toFixed(3), bbox.max.z.toFixed(3)], 'depth:', (bbox.max.z - bbox.min.z).toFixed(3));

  console.log('\n--- 4. UV Analysis ---');
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  let frontUCount = 0, backUCount = 0, bleedCount = 0;

  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);
    const z = posAttr.getZ(i);

    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;

    if (u < 0.5) {
      frontUCount++;
    } else {
      backUCount++;
    }

    // Check for bleed over the 0.5 border
    // If z > 0.05 (distinct front surface), u should never be > 0.5
    // If z < -0.05 (distinct back surface), u should never be < 0.5
    if (z > 0.05 && u > 0.5) {
      bleedCount++;
      console.warn(`BLEED DETECTED on Front: z=${z.toFixed(3)}, u=${u.toFixed(3)} at index ${i}`);
    }
    if (z < -0.05 && u < 0.5) {
      bleedCount++;
      console.warn(`BLEED DETECTED on Back: z=${z.toFixed(3)}, u=${u.toFixed(3)} at index ${i}`);
    }
  }

  console.log('Total UV range U:', [minU.toFixed(4), maxU.toFixed(4)]);
  console.log('Total UV range V:', [minV.toFixed(4), maxV.toFixed(4)]);
  console.log('Front UV count (u < 0.5):', frontUCount);
  console.log('Back UV count (u >= 0.5):', backUCount);
  console.log('Bleed count across z > 0.05 or z < -0.05:', bleedCount);

  console.log('\n--- 5. Material & Normals Test ---');
  geometry.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  mesh.material = mat;
  console.log('Material configured:', mat.type, 'roughness:', mat.roughness, 'metalness:', mat.metalness);

  console.log('\nVERIFICATION RESULT: SUCCESS');
}

verify().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
