import sys
from collections import defaultdict, deque

input_path = "prep_models/various size/Low_T-shirt.obj"

vertices = []
uvs = []
normals = []
faces = []

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
        elif tokens[0] == 'f':
            face = []
            for corner in tokens[1:]:
                parts = corner.split('/')
                v_idx = int(parts[0]) - 1
                vt_idx = int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1
                vn_idx = int(parts[2]) - 1 if len(parts) > 2 and parts[2] else -1
                face.append((v_idx, vt_idx, vn_idx))
            faces.append(face)

# Find connected components of faces based on shared vt indices
vt_to_faces = defaultdict(list)
for f_idx, face in enumerate(faces):
    for corner in face:
        vt_idx = corner[1]
        vt_to_faces[vt_idx].append(f_idx)

face_adj = defaultdict(set)
for vt_idx, f_list in vt_to_faces.items():
    for i in range(len(f_list)):
        for j in range(i + 1, len(f_list)):
            face_adj[f_list[i]].add(f_list[j])
            face_adj[f_list[j]].add(f_list[i])

visited = set()
islands = []
for f_idx in range(len(faces)):
    if f_idx not in visited:
        comp = []
        q = deque([f_idx])
        visited.add(f_idx)
        while q:
            curr = q.popleft()
            comp.append(curr)
            for neighbor in face_adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    q.append(neighbor)
        islands.append(comp)

print(f"Total UV islands: {len(islands)}")

for idx, comp in enumerate(islands):
    comp_uv_indices = set()
    comp_v_indices = set()
    for f in comp:
        for corner in faces[f]:
            comp_v_indices.add(corner[0])
            comp_uv_indices.add(corner[1])
    
    comp_uvs = [uvs[i] for i in comp_uv_indices]
    comp_verts = [vertices[i] for i in comp_v_indices]
    comp_normals = [normals[corner[2]] for f in comp for corner in faces[f]]
    
    min_u = min(u[0] for u in comp_uvs)
    max_u = max(u[0] for u in comp_uvs)
    min_v = min(u[1] for u in comp_uvs)
    max_v = max(u[1] for u in comp_uvs)
    
    avg_x = sum(v[0] for v in comp_verts) / len(comp_verts)
    avg_y = sum(v[1] for v in comp_verts) / len(comp_verts)
    avg_z = sum(v[2] for v in comp_verts) / len(comp_verts)
    
    avg_nz = sum(n[2] for n in comp_normals) / len(comp_normals)
    
    cross_05 = sum(1 for f in comp if min(uvs[c[1]][0] for c in faces[f]) < 0.5 < max(uvs[c[1]][0] for c in faces[f]))
    
    print(f"Island {idx+1:2d}: {len(comp):4d} faces, {len(comp_uv_indices):4d} UVs | U: [{min_u:8.4f}, {max_u:8.4f}] | V: [{min_v:8.4f}, {max_v:8.4f}] | 3D Center: ({avg_x:6.1f}, {avg_y:6.1f}, {avg_z:6.1f}) | avg Nz: {avg_nz:5.2f} | cross_0.5: {cross_05}")
