import math
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

# 1. Centering & scaling
min_x = min(v[0] for v in vertices)
max_x = max(v[0] for v in vertices)
min_y = min(v[1] for v in vertices)
max_y = max(v[1] for v in vertices)
min_z = min(v[2] for v in vertices)
max_z = max(v[2] for v in vertices)

center_x = (min_x + max_x) / 2.0
center_y = (min_y + max_y) / 2.0
center_z = (min_z + max_z) / 2.0
scale = 1.90 / max(max_x - min_x, max_y - min_y, max_z - min_z)

new_vertices = []
for v in vertices:
    new_vertices.append([
        (v[0] - center_x) * scale,
        (v[1] - center_y) * scale,
        (v[2] - center_z) * scale
    ])

# 2. Island segmentation
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
face_to_island = {}
for f_idx in range(len(faces)):
    if f_idx not in visited:
        comp = []
        q = deque([f_idx])
        visited.add(f_idx)
        while q:
            curr = q.popleft()
            comp.append(curr)
            face_to_island[curr] = len(islands)
            for neighbor in face_adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    q.append(neighbor)
        islands.append(comp)

# 3. Transform UVs
new_uvs = [list(uv) for uv in uvs]

# Helper to map UVs in an island linearly
def remap_island_u(isl_idx, target_min_u, target_max_u):
    comp = islands[isl_idx]
    comp_uv_indices = set(corner[1] for f in comp for corner in faces[f])
    cur_min_u = min(uvs[i][0] for i in comp_uv_indices)
    cur_max_u = max(uvs[i][0] for i in comp_uv_indices)
    delta = cur_max_u - cur_min_u
    for i in comp_uv_indices:
        t = (uvs[i][0] - cur_min_u) / delta if delta > 0 else 0.0
        new_uvs[i][0] = target_min_u + t * (target_max_u - target_min_u)

def remap_island_v(isl_idx, target_min_v, target_max_v):
    comp = islands[isl_idx]
    comp_uv_indices = set(corner[1] for f in comp for corner in faces[f])
    cur_min_v = min(uvs[i][1] for i in comp_uv_indices)
    cur_max_v = max(uvs[i][1] for i in comp_uv_indices)
    delta = cur_max_v - cur_min_v
    for i in comp_uv_indices:
        t = (uvs[i][1] - cur_min_v) / delta if delta > 0 else 0.0
        new_uvs[i][1] = target_min_v + t * (target_max_v - target_min_v)

# Island 9 (Front Torso): map to [0.002, 0.498]
remap_island_u(8, 0.002, 0.498)

# Island 12 (Back Torso): map to [0.502, 0.998]
remap_island_u(11, 0.502, 0.998)

# Island 10 (Front Hem 1): map to [0.02, 0.48]
remap_island_u(9, 0.02, 0.48)

# Island 13 (Front Hem 2): map to [0.02, 0.48]
remap_island_u(12, 0.02, 0.48)

# Island 11 (Back Hem 1): map to [0.52, 0.98]
remap_island_u(10, 0.52, 0.98)

# Island 14 (Back Hem 2): map to [0.52, 0.98]
remap_island_u(13, 0.52, 0.98)

# Island 15 (Brand Patch): map to U in [0.72, 0.78], V in [0.88, 0.94]
remap_island_u(14, 0.72, 0.78)
remap_island_v(14, 0.88, 0.94)

# Island 4 (Right sleeve cuff 1): map to [0.05, 0.45]
remap_island_u(3, 0.05, 0.45)

# Island 7 (Right sleeve cuff 2): map to [0.05, 0.45]
remap_island_u(6, 0.05, 0.45)

# Island 3 (Left sleeve panel): map to [0.55, 0.95]
remap_island_u(2, 0.55, 0.95)

# Verify all UVs
print("\n--- UV Verification ---")
front_min_u = min(uv[0] for uv in new_uvs if uv[0] < 0.5)
front_max_u = max(uv[0] for uv in new_uvs if uv[0] < 0.5)
back_min_u = min(uv[0] for uv in new_uvs if uv[0] >= 0.5)
back_max_u = max(uv[0] for uv in new_uvs if uv[0] >= 0.5)
all_min_v = min(uv[1] for uv in new_uvs)
all_max_v = max(uv[1] for uv in new_uvs)

print(f"Front U: [{front_min_u:.4f}, {front_max_u:.4f}]")
print(f"Back U:  [{back_min_u:.4f}, {back_max_u:.4f}]")
print(f"V range: [{all_min_v:.4f}, {all_max_v:.4f}]")
print(f"Buffer margin: {back_min_u - front_max_u:.4f}")

# Check crossing faces
triangles = []
# Triangulate and check
crossing_tris = 0
for f_idx, f in enumerate(faces):
    if len(f) == 4:
        tri1 = [f[0], f[1], f[2]]
        tri2 = [f[0], f[2], f[3]]
        tri_list = [tri1, tri2]
    else:
        tri_list = [f]
    for tri in tri_list:
        triangles.append(tri)
        u_corners = [new_uvs[c[1]][0] for c in tri]
        if min(u_corners) < 0.5 < max(u_corners):
            crossing_tris += 1

print(f"Total triangulated faces: {len(triangles)}")
print(f"Faces crossing u = 0.50: {crossing_tris}")

# Check test conditions:
# 1. toBeCloseTo(0.0, 2) on front_min_u
print(f"front_min_u toBeCloseTo(0.0, 2): {abs(front_min_u - 0.0) < 0.005}")
# 2. front_max_u <= 0.5
print(f"front_max_u <= 0.5: {front_max_u <= 0.5}")
# 3. back_min_u >= 0.5
print(f"back_min_u >= 0.5: {back_min_u >= 0.5}")
# 4. back_max_u toBeCloseTo(1.0, 2)
print(f"back_max_u toBeCloseTo(1.0, 2): {abs(back_max_u - 1.0) < 0.005}")
# 5. back_max_u <= 1.001
print(f"back_max_u <= 1.001: {back_max_u <= 1.001}")
# 6. buffer margin >= 0.0
print(f"buffer margin >= 0.0: {back_min_u - front_max_u >= 0.0}")
