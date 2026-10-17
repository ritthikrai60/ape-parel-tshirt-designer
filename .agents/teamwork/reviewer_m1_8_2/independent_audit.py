#!/usr/bin/env python3
"""
Independent UV Partition & Studio Compatibility Audit
Author: Reviewer 2 (reviewer_m1_8_2)
"""

import os
import sys

OBJ_PATH = os.path.abspath("public/models/tshirt.obj")

print(f"=== INDEPENDENT AUDIT OF {OBJ_PATH} ===")

if not os.path.exists(OBJ_PATH):
    print(f"FAIL: File does not exist at {OBJ_PATH}")
    sys.exit(1)

file_size = os.path.getsize(OBJ_PATH)
print(f"File size: {file_size:,} bytes")

vertices = []
uvs = []
normals = []
faces = []
header_lines = []

with open(OBJ_PATH, "r", encoding="utf-8") as f:
    for line_idx, line in enumerate(f, 1):
        line_clean = line.strip()
        if not line_clean:
            continue
        if line_clean.startswith("#") or line_clean.startswith("mtllib") or line_clean.startswith("o ") or line_clean.startswith("s ") or line_clean.startswith("usemtl"):
            header_lines.append(line_clean)
            continue
        tokens = line_clean.split()
        tag = tokens[0]
        if tag == "v":
            vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tag == "vt":
            uvs.append([float(tokens[1]), float(tokens[2])])
        elif tag == "vn":
            normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tag == "f":
            corners = []
            for c in tokens[1:]:
                parts = c.split("/")
                v_i = int(parts[0]) - 1
                vt_i = int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1
                vn_i = int(parts[2]) - 1 if len(parts) > 2 and parts[2] else -1
                corners.append((v_i, vt_i, vn_i))
            faces.append(corners)

print(f"Parsed counts:")
print(f"  v:  {len(vertices)} (target: 5355)")
print(f"  vt: {len(uvs)} (target: 5761)")
print(f"  vn: {len(normals)} (target: 5355)")
print(f"  f:  {len(faces)} (target: 10192)")

# 1. Topology & Face checks
non_triangles = [i for i, f in enumerate(faces) if len(f) != 3]
print(f"Non-triangle faces: {len(non_triangles)}")

# Index validity
bad_indices = 0
for f in faces:
    for v_i, vt_i, vn_i in f:
        if v_i < 0 or v_i >= len(vertices):
            bad_indices += 1
        if vt_i < 0 or vt_i >= len(uvs):
            bad_indices += 1
        if vn_i < 0 or vn_i >= len(normals):
            bad_indices += 1
print(f"Out of range face indices: {bad_indices}")

# 2. Geometric bounds & centering
xs = [v[0] for v in vertices]
ys = [v[1] for v in vertices]
zs = [v[2] for v in vertices]

min_x, max_x = min(xs), max(xs)
min_y, max_y = min(ys), max(ys)
min_z, max_z = min(zs), max(zs)

center_x = (min_x + max_x) / 2.0
center_y = (min_y + max_y) / 2.0
center_z = (min_z + max_z) / 2.0

size_x = max_x - min_x
size_y = max_y - min_y
size_z = max_z - min_z
max_dim = max(size_x, size_y, size_z)

print(f"3D Extents:")
print(f"  X: [{min_x:.6f}, {max_x:.6f}], span={size_x:.6f}, center={center_x:.6f}")
print(f"  Y: [{min_y:.6f}, {max_y:.6f}], span={size_y:.6f}, center={center_y:.6f}")
print(f"  Z: [{min_z:.6f}, {max_z:.6f}], span={size_z:.6f}, center={center_z:.6f}")
print(f"  Max dimension: {max_dim:.6f} (target: 1.900000)")

# 3. Floor clearance check
shadow_floor_y = -1.10
hem_y = min_y
clearance = hem_y - shadow_floor_y
print(f"Floor Clearance:")
print(f"  Hem Y: {hem_y:.6f}")
print(f"  Shadow Floor Y: {shadow_floor_y:.6f}")
print(f"  Clearance: {clearance:.6f} units (requirement >= 0.15: {clearance >= 0.15})")

# 4. UV Range Bounds
u_coords = [uv[0] for uv in uvs]
v_coords = [uv[1] for uv in uvs]

min_u, max_u = min(u_coords), max(u_coords)
min_v, max_v = min(v_coords), max(v_coords)

print(f"UV Raw Extents:")
print(f"  U: [{min_u:.6f}, {max_u:.6f}]")
print(f"  V: [{min_v:.6f}, {max_v:.6f}]")

uv_out_of_bounds = sum(1 for u, v in uvs if u < 0.0 or u > 1.0 or v < 0.0 or v > 1.0)
print(f"UV coordinates outside [0.0, 1.0]: {uv_out_of_bounds}")

# 5. Triangle-by-triangle UV partition analysis
cross_border_faces = []
front_faces = []
back_faces = []
ambiguous_faces = []

for idx, f in enumerate(faces):
    face_uvs = [uvs[corner[1]] for corner in f]
    face_us = [uv[0] for uv in face_uvs]
    face_min_u = min(face_us)
    face_max_u = max(face_us)

    # Cross-border definition: min(u) < 0.50 and max(u) > 0.50
    if face_min_u < 0.50 and face_max_u > 0.50:
        cross_border_faces.append((idx, face_min_u, face_max_u, face_us))
    elif face_max_u <= 0.50:
        front_faces.append(idx)
    elif face_min_u >= 0.50:
        back_faces.append(idx)
    else:
        ambiguous_faces.append(idx)

print(f"\n--- UV Partition Classification ---")
print(f"Total Triangles: {len(faces)}")
print(f"Front Triangles (all u <= 0.50): {len(front_faces)}")
print(f"Back Triangles (all u >= 0.50):  {len(back_faces)}")
print(f"Cross-border Triangles (min < 0.50 and max > 0.50): {len(cross_border_faces)}")
print(f"Ambiguous Triangles: {len(ambiguous_faces)}")

front_u_vals = [uvs[faces[f][c][1]][0] for f in front_faces for c in range(3)]
front_v_vals = [uvs[faces[f][c][1]][1] for f in front_faces for c in range(3)]
back_u_vals = [uvs[faces[f][c][1]][0] for f in back_faces for c in range(3)]
back_v_vals = [uvs[faces[f][c][1]][1] for f in back_faces for c in range(3)]

print(f"Front Triangles UV Bounds: U in [{min(front_u_vals):.6f}, {max(front_u_vals):.6f}], V in [{min(front_v_vals):.6f}, {max(front_v_vals):.6f}]")
print(f"Back Triangles UV Bounds:  U in [{min(back_u_vals):.6f}, {max(back_u_vals):.6f}], V in [{min(back_v_vals):.6f}, {max(back_v_vals):.6f}]")
print(f"Front margin to 0.50: {0.50 - max(front_u_vals):.6f}")
print(f"Back margin from 0.50: {min(back_u_vals) - 0.50:.6f}")

# 6. Horizontal Anti-Mirroring Verification
# Front (+Z): increasing 3D X corresponds to increasing U (screen left-to-right)
# Back (-Z): decreasing 3D X corresponds to increasing U (screen left-to-right)
print(f"\n--- Anti-Mirroring Detailed Audit ---")

# Let's inspect torso chest area (y in [-0.2, +0.2])
front_chest_samples = []
back_chest_samples = []

for f_idx in front_faces:
    f = faces[f_idx]
    f_pts = [vertices[f[c][0]] for c in range(3)]
    f_uvs = [uvs[f[c][1]] for c in range(3)]
    avg_y = sum(p[1] for p in f_pts) / 3.0
    avg_z = sum(p[2] for p in f_pts) / 3.0
    avg_x = sum(p[0] for p in f_pts) / 3.0
    avg_u = sum(uv[0] for uv in f_uvs) / 3.0
    if -0.2 <= avg_y <= 0.2 and avg_z > 0.05:
        front_chest_samples.append((avg_x, avg_y, avg_z, avg_u))

for f_idx in back_faces:
    f = faces[f_idx]
    f_pts = [vertices[f[c][0]] for c in range(3)]
    f_uvs = [uvs[f[c][1]] for c in range(3)]
    avg_y = sum(p[1] for p in f_pts) / 3.0
    avg_z = sum(p[2] for p in f_pts) / 3.0
    avg_x = sum(p[0] for p in f_pts) / 3.0
    avg_u = sum(uv[0] for uv in f_uvs) / 3.0
    if -0.2 <= avg_y <= 0.2 and avg_z < -0.05:
        back_chest_samples.append((avg_x, avg_y, avg_z, avg_u))

# Test correlation: Front (X vs U)
if front_chest_samples:
    front_xs = [s[0] for s in front_chest_samples]
    front_us = [s[3] for s in front_chest_samples]
    # Check left vs right on front
    left_front = [u for x, y, z, u in front_chest_samples if x < -0.15]
    right_front = [u for x, y, z, u in front_chest_samples if x > 0.15]
    avg_left_u = sum(left_front) / len(left_front) if left_front else 0
    avg_right_u = sum(right_front) / len(right_front) if right_front else 0
    print(f"Front Chest (-0.2 <= y <= 0.2, z > 0.05):")
    print(f"  Sample count: {len(front_chest_samples)}")
    print(f"  Left (x < -0.15) mean U: {avg_left_u:.6f}")
    print(f"  Right (x > +0.15) mean U: {avg_right_u:.6f}")
    print(f"  Increasing X -> Increasing U? {avg_right_u > avg_left_u} (diff: {avg_right_u - avg_left_u:.6f})")

if back_chest_samples:
    back_xs = [s[0] for s in back_chest_samples]
    back_us = [s[3] for s in back_chest_samples]
    # Check left vs right on back
    # Note: On back (looking from -Z), viewer left is +X, viewer right is -X.
    # Increasing U is viewer left-to-right, meaning from +X to -X.
    # So decreasing X must give increasing U!
    pos_x_back = [u for x, y, z, u in back_chest_samples if x > 0.15] # viewer left
    neg_x_back = [u for x, y, z, u in back_chest_samples if x < -0.15] # viewer right
    avg_pos_x_u = sum(pos_x_back) / len(pos_x_back) if pos_x_back else 0
    avg_neg_x_u = sum(neg_x_back) / len(neg_x_back) if neg_x_back else 0
    print(f"Back Chest (-0.2 <= y <= 0.2, z < -0.05):")
    print(f"  Sample count: {len(back_chest_samples)}")
    print(f"  Viewer Left (x > +0.15) mean U: {avg_pos_x_u:.6f}")
    print(f"  Viewer Right (x < -0.15) mean U: {avg_neg_x_u:.6f}")
    print(f"  Decreasing X -> Increasing U? {avg_neg_x_u > avg_pos_x_u} (diff: {avg_neg_x_u - avg_pos_x_u:.6f})")

# Also calculate per-triangle derivative du/dx
def triangle_du_dx(f):
    p0 = vertices[f[0][0]]
    p1 = vertices[f[1][0]]
    p2 = vertices[f[2][0]]
    u0 = uvs[f[0][1]][0]
    u1 = uvs[f[1][1]][0]
    u2 = uvs[f[2][1]][0]
    # In 3D plane, project onto XY:
    det = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1])
    if abs(det) < 1e-6:
        return None
    du_dx = ((u1 - u0) * (p2[1] - p0[1]) - (u2 - u0) * (p1[1] - p0[1])) / det
    return du_dx

front_du_dx = []
for f_idx in front_faces:
    f = faces[f_idx]
    avg_z = sum(vertices[f[c][0]][2] for c in range(3)) / 3.0
    if avg_z > 0.05: # strictly front
        deriv = triangle_du_dx(f)
        if deriv is not None:
            front_du_dx.append(deriv)

back_du_dx = []
for f_idx in back_faces:
    f = faces[f_idx]
    avg_z = sum(vertices[f[c][0]][2] for c in range(3)) / 3.0
    if avg_z < -0.05: # strictly back
        deriv = triangle_du_dx(f)
        if deriv is not None:
            back_du_dx.append(deriv)

print(f"Front faces du/dx (should be positive):")
pos_front = sum(1 for d in front_du_dx if d > 0)
neg_front = sum(1 for d in front_du_dx if d < 0)
print(f"  Positive: {pos_front}, Negative: {neg_front}, Ratio: {pos_front / (pos_front + neg_front) * 100:.2f}%")

print(f"Back faces du/dx (should be negative for screen L->R):")
pos_back = sum(1 for d in back_du_dx if d > 0)
neg_back = sum(1 for d in back_du_dx if d < 0)
print(f"  Negative: {neg_back}, Positive: {pos_back}, Ratio: {neg_back / (pos_back + neg_back) * 100:.2f}%")

print("\nAUDIT FINISHED.")
