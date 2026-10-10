import fs from 'fs';
import path from 'path';

const objPath = path.resolve('public/models/tshirt.obj');
const stats = fs.statSync(objPath);
console.log('File size (bytes):', stats.size, `(${(stats.size / 1024).toFixed(2)} KB)`);

const content = fs.readFileSync(objPath, 'utf8');
const lines = content.split('\n');

let vCount = 0;
let vtCount = 0;
let vnCount = 0;
let fCount = 0;
let uMin = Infinity, uMax = -Infinity;
let vMin = Infinity, vMax = -Infinity;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (line.startsWith('v ')) {
    vCount++;
  } else if (line.startsWith('vt ')) {
    vtCount++;
    const parts = line.split(/\s+/).slice(1).map(Number);
    if (!isNaN(parts[0])) {
      uMin = Math.min(uMin, parts[0]);
      uMax = Math.max(uMax, parts[0]);
    }
    if (!isNaN(parts[1])) {
      vMin = Math.min(vMin, parts[1]);
      vMax = Math.max(vMax, parts[1]);
    }
  } else if (line.startsWith('vn ')) {
    vnCount++;
  } else if (line.startsWith('f ')) {
    fCount++;
  }
}

console.log('Total lines:', lines.length);
console.log('Vertex count (v):', vCount);
console.log('Texture coords (vt):', vtCount);
console.log('Normal count (vn):', vnCount);
console.log('Face count (f):', fCount);
console.log('UV bounding box: u in [', uMin, ',', uMax, '], v in [', vMin, ',', vMax, ']');

// Sample first 5 lines and last 5 lines
console.log('\n--- First 5 lines ---');
console.log(lines.slice(0, 5).join('\n'));
console.log('\n--- Last 5 lines ---');
console.log(lines.slice(-6).join('\n'));
