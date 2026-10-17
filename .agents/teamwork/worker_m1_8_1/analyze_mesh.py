import os
import sys

input_path = "prep_models/various size/Low_T-shirt.obj"

vertices = []
uvs = []
normals = []
faces = [] # list of lists of (v, vt, vn) tuples
face_materials = []
current_mtl = None

with open(input_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        tokens = line.split()
        if tokens[0] == 'v':
            vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tokens[0] == 'vt':
            uvs.append([float(tokens[1]), float(tokens[2])])
        elif tokens[0] == 'vn':
            normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tokens[0] == 'usemtl':
            current_mtl = tokens[1]
        elif tokens[0] == 'f':
            face = []
            for corner in tokens[1:]:
                parts = corner.split('/')
                v_idx = int(parts[0]) - 1
                vt_idx = int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1
                vn_idx = int(parts[2]) - 1 if len(parts) > 2 and parts[2] else -1
                face.append((v_idx, vt_idx, vn_idx))
            faces.append(face)
            face_materials.append(current_mtl)

print(f"Loaded {len(vertices)} vertices, {len(uvs)} uvs, {len(normals)} normals, {len(faces)} faces")

min_x = min(v[0] for v in vertices)
max_x = max(v[0] for v in vertices)
min_y = min(v[1] for v in vertices)
max_y = max(v[1] for v in vertices)
min_z = min(v[2] for v in vertices)
max_z = max(v[2] for v in vertices)

center_x = (min_x + max_x) / 2.0
center_y = (min_y + max_y) / 2.0
center_z = (min_z + max_z) / 2.0

size_x = max_x - min_x
size_y = max_y - min_y
size_z = max_z - min_z
max_dim = max(size_x, size_y, size_z)

print(f"X: [{min_x:.6f}, {max_x:.6f}], center={center_x:.6f}, size={size_x:.6f}")
print(f"Y: [{min_y:.6f}, {max_y:.6f}], center={center_y:.6f}, size={size_y:.6f}")
print(f"Z: [{min_z:.6f}, {max_z:.6f}], center={center_z:.6f}, size={size_z:.6f}")
print(f"max_dim = {max_dim:.6f}")

scale = 1.90 / max_dim
print(f"scale = {scale:.8f}")
scaled_min_x = (min_x - center_x) * scale
scaled_max_x = (max_x - center_x) * scale
scaled_min_y = (min_y - center_y) * scale
scaled_max_y = (max_y - center_y) * scale
scaled_min_z = (min_z - center_z) * scale
scaled_max_z = (max_z - center_z) * scale

print(f"Scaled X: [{scaled_min_x:.6f}, {scaled_max_x:.6f}]")
print(f"Scaled Y: [{scaled_min_y:.6f}, {scaled_max_y:.6f}]")
print(f"Scaled Z: [{scaled_min_z:.6f}, {scaled_max_z:.6f}]")

quad_count = sum(1 for f in faces if len(f) == 4)
tri_count = sum(1 for f in faces if len(f) == 3)
other_count = sum(1 for f in faces if len(f) not in (3, 4))
print(f"Quads: {quad_count}, Tris: {tri_count}, Others: {other_count}")
print(f"Total triangles when triangulated: {quad_count * 2 + tri_count}")
