const fs = require('fs');
const path = 'public/models/tshirt.obj';

const stats = fs.statSync(path);
console.log('File size:', stats.size, 'bytes');

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let vCount = 0;
let vtCount = 0;
let vnCount = 0;
let fCount = 0;
let gCount = 0;
let oCount = 0;

let minU = Infinity, maxU = -Infinity;
let minV = Infinity, maxV = -Infinity;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (let line of lines) {
  line = line.trim();
  if (line.startsWith('v ')) {
    vCount++;
    const parts = line.split(/\s+/).slice(1).map(Number);
    minX = Math.min(minX, parts[0]);
    maxX = Math.max(maxX, parts[0]);
    minY = Math.min(minY, parts[1]);
    maxY = Math.max(maxY, parts[1]);
    minZ = Math.min(minZ, parts[2]);
    maxZ = Math.max(maxZ, parts[2]);
  } else if (line.startsWith('vt ')) {
    vtCount++;
    const parts = line.split(/\s+/).slice(1).map(Number);
    minU = Math.min(minU, parts[0]);
    maxU = Math.max(maxU, parts[0]);
    minV = Math.min(minV, parts[1]);
    maxV = Math.max(maxV, parts[1]);
  } else if (line.startsWith('vn ')) {
    vnCount++;
  } else if (line.startsWith('f ')) {
    fCount++;
  } else if (line.startsWith('g ')) {
    gCount++;
  } else if (line.startsWith('o ')) {
    oCount++;
  }
}

console.log('Total lines:', lines.length);
console.log('Vertices (v):', vCount);
console.log('Texture coords (vt):', vtCount);
console.log('Normals (vn):', vnCount);
console.log('Faces (f):', fCount);
console.log('Objects / Groups:', oCount, gCount);
console.log('Bounding Box X: [', minX.toFixed(3), ',', maxX.toFixed(3), ']');
console.log('Bounding Box Y: [', minY.toFixed(3), ',', maxY.toFixed(3), ']');
console.log('Bounding Box Z: [', minZ.toFixed(3), ',', maxZ.toFixed(3), ']');
console.log('UV bounds U: [', minU.toFixed(3), ',', maxU.toFixed(3), '], V: [', minV.toFixed(3), ',', maxV.toFixed(3), ']');
console.log('First 15 lines:\n' + lines.slice(0, 15).join('\n'));
