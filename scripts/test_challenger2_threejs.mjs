import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

console.log('Testing Three.js OBJLoader import...');
const loader = new OBJLoader();
console.log('OBJLoader created successfully.');

const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
const objText = fs.readFileSync(objPath, 'utf8');

const parsed = loader.parse(objText);
console.log('Parsed successfully. Children count:', parsed.children.length);
