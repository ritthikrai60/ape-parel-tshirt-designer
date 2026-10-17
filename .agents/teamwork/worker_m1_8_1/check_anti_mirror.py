import sys

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

# Scale & center vertices like we planned
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

# Let's inspect Back Torso (Island 12 in analysis)
# In raw file: Island 12 has u in [0.0206, 0.4972]
# Looking at back from behind: camera at z < 0 looking towards +z
# Viewer-left is +X, viewer-right is -X
viewer_left_samples = []
viewer_right_samples = []

for f in faces:
    for c in f:
        v_idx, vt_idx, _ = c
        x, y, z = norm_v[v_idx]
        u, v = uvs[vt_idx]
        if z < -0.1 and abs(y) < 0.1:
            if x > 0.3:
                viewer_left_samples.append((x, y, z, u, v))
            elif x < -0.3:
                viewer_right_samples.append((x, y, z, u, v))

print(f"Back Torso samples with z < -0.1 and abs(y) < 0.1:")
print(f"  Viewer left (+X > 0.3): {len(viewer_left_samples)} samples")
if viewer_left_samples:
    print(f"    Raw u: min={min(s[3] for s in viewer_left_samples):.4f}, max={max(s[3] for s in viewer_left_samples):.4f}, avg={sum(s[3] for s in viewer_left_samples)/len(viewer_left_samples):.4f}")
print(f"  Viewer right (-X < -0.3): {len(viewer_right_samples)} samples")
if viewer_right_samples:
    print(f"    Raw u: min={min(s[3] for s in viewer_right_samples):.4f}, max={max(s[3] for s in viewer_right_samples):.4f}, avg={sum(s[3] for s in viewer_right_samples)/len(viewer_right_samples):.4f}")

# Now Front Torso (Island 9)
front_left_samples = [] # viewer left is -X
front_right_samples = [] # viewer right is +X
for f in faces:
    for c in f:
        v_idx, vt_idx, _ = c
        x, y, z = norm_v[v_idx]
        u, v = uvs[vt_idx]
        if z > 0.1 and abs(y) < 0.1:
            if x < -0.3:
                front_left_samples.append((x, y, z, u, v))
            elif x > 0.3:
                front_right_samples.append((x, y, z, u, v))

print(f"\nFront Torso samples with z > 0.1 and abs(y) < 0.1:")
print(f"  Viewer left (-X < -0.3): {len(front_left_samples)} samples")
if front_left_samples:
    print(f"    Raw u: min={min(s[3] for s in front_left_samples):.4f}, max={max(s[3] for s in front_left_samples):.4f}, avg={sum(s[3] for s in front_left_samples)/len(front_left_samples):.4f}")
print(f"  Viewer right (+X > 0.3): {len(front_right_samples)} samples")
if front_right_samples:
    print(f"    Raw u: min={min(s[3] for s in front_right_samples):.4f}, max={max(s[3] for s in front_right_samples):.4f}, avg={sum(s[3] for s in front_right_samples)/len(front_right_samples):.4f}")
