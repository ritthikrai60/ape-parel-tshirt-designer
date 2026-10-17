import sys

input_path = "public/models/tshirt.obj"

positions = []
uvs = []
faces = []

with open(input_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        tokens = line.split()
        if tokens[0] == 'v':
            positions.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tokens[0] == 'vt':
            uvs.append([float(tokens[1]), float(tokens[2])])
        elif tokens[0] == 'f':
            face = []
            for corner in tokens[1:]:
                parts = corner.split('/')
                v_idx = int(parts[0]) - 1
                vt_idx = int(parts[1]) - 1
                vn_idx = int(parts[2]) - 1
                face.append((v_idx, vt_idx, vn_idx))
            faces.append(face)

frontTorsoCount = 0
backTorsoCount = 0
frontBleed = 0
backBleed = 0

for f in faces:
    for c in f:
        v_idx, vt_idx, _ = c
        x, y, z = positions[v_idx]
        u, v = uvs[vt_idx]
        if abs(x) <= 0.52:
            if z > 0.02:
                frontTorsoCount += 1
                if u >= 0.5:
                    frontBleed += 1
            elif z < -0.02:
                backTorsoCount += 1
                if u < 0.5:
                    backBleed += 1

print(f"Existing public/models/tshirt.obj:")
print(f"  frontTorsoCount: {frontTorsoCount}, frontBleed: {frontBleed}")
print(f"  backTorsoCount:  {backTorsoCount}, backBleed:  {backBleed}")
