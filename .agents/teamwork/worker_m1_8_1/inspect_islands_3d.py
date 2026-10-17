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

# For each island, let's examine its Z distribution and X distribution
for idx, comp in enumerate(islands):
    comp_uv_indices = set()
    comp_v_indices = set()
    for f in comp:
        for corner in faces[f]:
            comp_v_indices.add(corner[0])
            comp_uv_indices.add(corner[1])
    
    comp_uvs = [uvs[i] for i in comp_uv_indices]
    comp_verts = [vertices[i] for i in comp_v_indices]
    
    min_u = min(u[0] for u in comp_uvs)
    max_u = max(u[0] for u in comp_uvs)
    min_v = min(u[1] for u in comp_uvs)
    max_v = max(u[1] for u in comp_uvs)
    
    min_x = min(v[0] for v in comp_verts)
    max_x = max(v[0] for v in comp_verts)
    min_y = min(v[1] for v in comp_verts)
    max_y = max(v[1] for v in comp_verts)
    min_z = min(v[2] for v in comp_verts)
    max_z = max(v[2] for v in comp_verts)
    avg_z = sum(v[2] for v in comp_verts) / len(comp_verts)
    
    print(f"Island {idx+1:2d} ({len(comp):4d} faces):")
    print(f"   UV: U in [{min_u:8.4f}, {max_u:8.4f}], V in [{min_v:8.4f}, {max_v:8.4f}]")
    print(f"   3D: X in [{min_x:6.1f}, {max_x:6.1f}], Y in [{min_y:6.1f}, {max_y:6.1f}], Z in [{min_z:6.1f}, {max_z:6.1f}], avg_Z={avg_z:6.1f}")
