import { generateTShirtOBJ } from './generate_tshirt.mjs';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

// Verify that text drawn left-to-right appears left-to-right from the viewer's camera
function testOrientation() {
  const { objContent } = generateTShirtOBJ();
  const loader = new OBJLoader();
  const group = loader.parse(objContent);
  const mesh = group.children[0];
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;

  console.log('Testing Front and Back text alignment...');

  // 1. FRONT TEST:
  // Consider chest height y ~ 0.2
  // We want to find vertices at y ~ 0.2, z > 0.1
  const frontVertices = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(y - 0.2) < 0.05 && z > 0.1) {
      frontVertices.push({
        x: pos.getX(i),
        y: y,
        z: z,
        u: uv.getX(i),
        v: uv.getY(i)
      });
    }
  }

  // Sort by 3D screen position X (from left to right in front view)
  frontVertices.sort((a, b) => a.x - b.x);
  const frontLeft = frontVertices[0];
  const frontRight = frontVertices[frontVertices.length - 1];

  console.log('Front Left vertex (Screen X min):', frontLeft);
  console.log('Front Right vertex (Screen X max):', frontRight);

  // In Front 2D canvas, left has smaller u (towards 0), right has larger u (towards 0.5)
  if (frontLeft.u < frontRight.u) {
    console.log('✅ FRONT ORIENTATION CORRECT: Screen left maps to Canvas left (smaller u)');
  } else {
    throw new Error('❌ FRONT ORIENTATION INVERTED');
  }

  // 2. BACK TEST:
  // Camera looking at the back: viewer is at -Z looking along +Z.
  // In camera view space for back camera:
  // screen_x = -world_x (so positive world_x is screen-left, negative world_x is screen-right)
  const backVertices = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(y - 0.2) < 0.05 && z < -0.1) {
      backVertices.push({
        x: pos.getX(i),
        screenX: -pos.getX(i), // Screen X when viewed from behind!
        y: y,
        z: z,
        u: uv.getX(i),
        v: uv.getY(i)
      });
    }
  }

  // Sort by Screen X when viewed from behind
  backVertices.sort((a, b) => a.screenX - b.screenX);
  const backLeft = backVertices[0];
  const backRight = backVertices[backVertices.length - 1];

  console.log('\nBack Left vertex (Screen X min from behind):', backLeft);
  console.log('Back Right vertex (Screen X max from behind):', backRight);

  // In Back 2D canvas, left has smaller u (towards 0.5), right has larger u (towards 1.0)
  if (backLeft.u < backRight.u) {
    console.log('✅ BACK ORIENTATION CORRECT: Screen left from behind maps to Canvas left (smaller u)');
  } else {
    throw new Error('❌ BACK ORIENTATION INVERTED (MIRRORED)');
  }
}

testOrientation();
