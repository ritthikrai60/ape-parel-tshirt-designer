import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
const objText = fs.readFileSync(objPath, 'utf8');

const loader = new OBJLoader();
const group = loader.parse(objText);

console.log('Group name:', group.name);
console.log('Group children count:', group.children.length);

const mesh = group.children[0];
console.log('Mesh name:', mesh.name);
console.log('Is mesh:', mesh.isMesh);

const geom = mesh.geometry;
console.log('Position attribute count:', geom.attributes.position?.count);
console.log('Position array length:', geom.attributes.position?.array?.length);
console.log('Normal attribute count:', geom.attributes.normal?.count);
console.log('Normal array length:', geom.attributes.normal?.array?.length);
console.log('UV attribute count:', geom.attributes.uv?.count);
console.log('UV array length:', geom.attributes.uv?.array?.length);
console.log('Is indexed:', !!geom.index);

geom.computeBoundingBox();
const box = geom.boundingBox;
console.log('BoundingBox Min:', box.min);
console.log('BoundingBox Max:', box.max);

const center = new THREE.Vector3();
box.getCenter(center);
console.log('Box Center:', center);

const size = new THREE.Vector3();
box.getSize(size);
console.log('Box Size:', size);
const maxDim = Math.max(size.x, size.y, size.z);
console.log('Max Dim:', maxDim);

// Check Box3 computed on object / mesh
const objBox = new THREE.Box3().setFromObject(group);
const objCenter = new THREE.Vector3();
objBox.getCenter(objCenter);
console.log('Obj Box Center:', objCenter);
const objSize = new THREE.Vector3();
objBox.getSize(objSize);
console.log('Obj Box Size:', objSize);
console.log('Obj Max Dim:', Math.max(objSize.x, objSize.y, objSize.z));
