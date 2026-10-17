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
                face.append((v_idx, vt_idx))
            faces.append(face)

# Find any corner with z < -0.02 and abs(x) <= 0.52 where u < 0.5
violations = []
for f_idx, f in enumerate(faces):
    for c in f:
        v_idx, vt_idx = c
        x, y, z = positions[v_idx]
        u, v = uvs[vt_idx]
        if abs(x) <= 0.52:
            if z > 0.02 and u >= 0.5:
                violations.append(('front', f_idx, v_idx, x, y, z, u, v))
            elif z < -0.02 and u < 0.5:
                violations.append(('back', f_idx, v_idx, x, y, z, u, v))

print(f"Total violations in existing model: {len(violations)}")
