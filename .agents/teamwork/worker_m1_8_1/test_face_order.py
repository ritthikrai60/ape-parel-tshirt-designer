import sys
from collections import defaultdict, deque

input_path = "prep_models/various size/Low_T-shirt.obj"

vertices = []
uvs = []
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
        elif tokens[0] == 'f':
            face = []
            for corner in tokens[1:]:
                parts = corner.split('/')
                v_idx = int(parts[0]) - 1
                vt_idx = int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1
                vn_idx = int(parts[2]) - 1 if len(parts) > 2 and parts[2] else -1
                face.append((v_idx, vt_idx, vn_idx))
            faces.append(face)

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

norm_v = []
for v in vertices:
    norm_v.append([
        (v[0] - center_x) * scale,
        (v[1] - center_y) * scale,
        (v[2] - center_z) * scale
    ])

# Island segmentation
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

print(f"Total islands: {len(islands)}")

# Let's inspect the test loop from m5_graphics_production_challenger:
# for (const line of lines) {
#   if (line.startsWith('f ')) {
#     for (const p of parts) {
#       const [x, y, z] = positions[vIdx - 1];
#       const [u] = uvs[vtIdx - 1];
#       if (z < -0.1 && Math.abs(y) < 0.1) {
#         if (x > 0.3 && viewerLeftU === null) viewerLeftU = u;
#         if (x < -0.3 && viewerRightU === null) viewerRightU = u;
#       }
#     }
#   }
# }

first_viewer_left = None
first_viewer_right = None

for f_idx, f in enumerate(faces):
    isl = face_to_island[f_idx]
    for c in f:
        v_idx, vt_idx, _ = c
        x, y, z = norm_v[v_idx]
        u, v = uvs[vt_idx]
        if z < -0.1 and abs(y) < 0.1:
            if x > 0.3 and first_viewer_left is None:
                first_viewer_left = (f_idx, isl, v_idx, vt_idx, x, y, z, u, v)
            if x < -0.3 and first_viewer_right is None:
                first_viewer_right = (f_idx, isl, v_idx, vt_idx, x, y, z, u, v)

print("FIRST viewer left (looking at back from behind, x > 0.3):")
print(f"  Face {first_viewer_left[0]}, Island {first_viewer_left[1]+1}, pos=({first_viewer_left[4]:.3f}, {first_viewer_left[5]:.3f}, {first_viewer_left[6]:.3f}), raw_u={first_viewer_left[7]:.4f}")

print("FIRST viewer right (looking at back from behind, x < -0.3):")
print(f"  Face {first_viewer_right[0]}, Island {first_viewer_right[1]+1}, pos=({first_viewer_right[4]:.3f}, {first_viewer_right[5]:.3f}, {first_viewer_right[6]:.3f}), raw_u={first_viewer_right[7]:.4f}")

# And all samples for island 12 (Back Torso):
isl12_left_u = []
isl12_right_u = []
for f_idx in islands[11]: # island 12 is index 11
    for c in faces[f_idx]:
        v_idx, vt_idx, _ = c
        x, y, z = norm_v[v_idx]
        u, v = uvs[vt_idx]
        if z < -0.1 and abs(y) < 0.1:
            if x > 0.3:
                isl12_left_u.append(u)
            elif x < -0.3:
                isl12_right_u.append(u)

print(f"\nIsland 12 Back Torso only:")
print(f"  left_u (+x > 0.3): count={len(isl12_left_u)}, min={min(isl12_left_u):.4f}, max={max(isl12_left_u):.4f}, avg={sum(isl12_left_u)/len(isl12_left_u):.4f}")
print(f"  right_u (-x < -0.3): count={len(isl12_right_u)}, min={min(isl12_right_u):.4f}, max={max(isl12_right_u):.4f}, avg={sum(isl12_right_u)/len(isl12_right_u):.4f}")
