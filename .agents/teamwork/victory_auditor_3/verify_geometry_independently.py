#!/usr/bin/env python3
"""
Independent Forensic Geometry & Provenance Verification
Auditor: victory_auditor_3
Target: prep_models/various size/Low_T-shirt.obj vs public/models/tshirt.obj
"""

import math
import os
import sys

RAW_PATH = os.path.abspath("prep_models/various size/Low_T-shirt.obj")
TARGET_PATH = os.path.abspath("public/models/tshirt.obj")

print("=== INDEPENDENT GEOMETRY AUDIT START ===")
print(f"Raw Source Path:   {RAW_PATH}")
print(f"Target Model Path: {TARGET_PATH}")

assert os.path.exists(RAW_PATH), f"Raw asset does not exist: {RAW_PATH}"
assert os.path.exists(TARGET_PATH), f"Target asset does not exist: {TARGET_PATH}"

def parse_obj(filepath):
    vertices = []
    uvs = []
    normals = []
    faces = []
    header_lines = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line_str = line.strip()
            if not line_str:
                continue
            if line_str.startswith("#"):
                header_lines.append(line_str)
                continue
            tokens = line_str.split()
            if tokens[0] == "v":
                vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
            elif tokens[0] == "vt":
                uvs.append([float(tokens[1]), float(tokens[2])])
            elif tokens[0] == "vn":
                normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
            elif tokens[0] == "f":
                corners = []
                for part in tokens[1:]:
                    pieces = part.split("/")
                    v_idx = int(pieces[0]) - 1
                    vt_idx = int(pieces[1]) - 1 if len(pieces) > 1 and pieces[1] else -1
                    vn_idx = int(pieces[2]) - 1 if len(pieces) > 2 and pieces[2] else -1
                    corners.append((v_idx, vt_idx, vn_idx))
                faces.append(corners)
            elif tokens[0] in ("o", "g", "mtllib", "usemtl", "s"):
                header_lines.append(line_str)
    return {
        "vertices": vertices,
        "uvs": uvs,
        "normals": normals,
        "faces": faces,
        "headers": header_lines
    }

raw = parse_obj(RAW_PATH)
tgt = parse_obj(TARGET_PATH)

print(f"\n--- 1. ELEMENT COUNTS ---")
print(f"Raw:    Vertices={len(raw['vertices'])}, UVs={len(raw['uvs'])}, Normals={len(raw['normals'])}, Faces={len(raw['faces'])}")
print(f"Target: Vertices={len(tgt['vertices'])}, UVs={len(tgt['uvs'])}, Normals={len(tgt['normals'])}, Faces={len(tgt['faces'])}")

assert len(raw['vertices']) == 5355, f"Raw vertex count mismatch: {len(raw['vertices'])}"
assert len(tgt['vertices']) == 5355, f"Target vertex count mismatch: {len(tgt['vertices'])}"
assert len(raw['uvs']) == 5761, f"Raw UV count mismatch: {len(raw['uvs'])}"
assert len(tgt['uvs']) == 5761, f"Target UV count mismatch: {len(tgt['uvs'])}"
assert len(raw['normals']) == 5355, f"Raw normal count mismatch: {len(raw['normals'])}"
assert len(tgt['normals']) == 5355, f"Target normal count mismatch: {len(tgt['normals'])}"
assert len(tgt['faces']) == 10192, f"Target face count mismatch: {len(tgt['faces'])}"

# Check face arity
for i, f in enumerate(tgt['faces']):
    if len(f) != 3:
        raise ValueError(f"Face {i} is not triangular! Arity: {len(f)}")
print("All 10,192 faces in target OBJ are confirmed triangles.")

print("\n--- 2. AFFINE PROVENANCE VERIFICATION ---")
min_rx = min(v[0] for v in raw['vertices'])
max_rx = max(v[0] for v in raw['vertices'])
min_ry = min(v[1] for v in raw['vertices'])
max_ry = max(v[1] for v in raw['vertices'])
min_rz = min(v[2] for v in raw['vertices'])
max_rz = max(v[2] for v in raw['vertices'])

cx = (min_rx + max_rx) / 2.0
cy = (min_ry + max_ry) / 2.0
cz = (min_rz + max_rz) / 2.0
max_dim_raw = max(max_rx - min_rx, max_ry - min_ry, max_rz - min_rz)
expected_scale = 1.90 / max_dim_raw

min_tx = min(v[0] for v in tgt['vertices'])
max_tx = max(v[0] for v in tgt['vertices'])
min_ty = min(v[1] for v in tgt['vertices'])
max_ty = max(v[1] for v in tgt['vertices'])
min_tz = min(v[2] for v in tgt['vertices'])
max_tz = max(v[2] for v in tgt['vertices'])

print(f"Raw Bounds:    X=[{min_rx:.4f}, {max_rx:.4f}], Y=[{min_ry:.4f}, {max_ry:.4f}], Z=[{min_rz:.4f}, {max_rz:.4f}]")
print(f"Raw Center:    ({cx:.6f}, {cy:.6f}, {cz:.6f}), max dimension: {max_dim_raw:.6f}")
print(f"Target Bounds: X=[{min_tx:.6f}, {max_tx:.6f}], Y=[{min_ty:.6f}, {max_ty:.6f}], Z=[{min_tz:.6f}, {max_tz:.6f}]")
print(f"Target Center: ({(min_tx+max_tx)/2.0:.6f}, {(min_ty+max_ty)/2.0:.6f}, {(min_tz+max_tz)/2.0:.6f})")
print(f"Target Size:   X={max_tx-min_tx:.6f}, Y={max_ty-min_ty:.6f}, Z={max_tz-min_tz:.6f}")

max_v_diff = 0.0
for i in range(len(raw['vertices'])):
    rv = raw['vertices'][i]
    tv = tgt['vertices'][i]
    pred_x = (rv[0] - cx) * expected_scale
    pred_y = (rv[1] - cy) * expected_scale
    pred_z = (rv[2] - cz) * expected_scale
    diff = max(abs(tv[0] - pred_x), abs(tv[1] - pred_y), abs(tv[2] - pred_z))
    if diff > max_v_diff:
        max_v_diff = diff

print(f"Maximum vertex affine deviation across all 5,355 vertices: {max_v_diff:.8e}")
assert max_v_diff < 1e-4, f"Affine deviation too high: {max_v_diff}"

# Verify normals
max_n_diff = 0.0
for i in range(len(raw['normals'])):
    rn = raw['normals'][i]
    tn = tgt['normals'][i]
    diff = max(abs(rn[0] - tn[0]), abs(rn[1] - tn[1]), abs(rn[2] - tn[2]))
    if diff > max_n_diff:
        max_n_diff = diff
print(f"Maximum normal deviation across all 5,355 normals: {max_n_diff:.8e}")
assert max_n_diff < 1e-4, f"Normal deviation too high: {max_n_diff}"

# Verify unit normals
max_n_norm_err = 0.0
for i, n in enumerate(tgt['normals']):
    length = math.sqrt(n[0]*n[0] + n[1]*n[1] + n[2]*n[2])
    err = abs(length - 1.0)
    if err > max_n_norm_err:
        max_n_norm_err = err
print(f"Maximum normal unit length error: {max_n_norm_err:.8e}")
assert max_n_norm_err < 1e-3, f"Normal is not unit vector: {max_n_norm_err}"

print("\n--- 3. UV PARTITION & CROSSING FACE AUDIT ---")
u_vals = [uv[0] for uv in tgt['uvs']]
v_vals = [uv[1] for uv in tgt['uvs']]

print(f"Target U Range: [{min(u_vals):.6f}, {max(u_vals):.6f}]")
print(f"Target V Range: [{min(v_vals):.6f}, {max(v_vals):.6f}]")
assert min(u_vals) >= 0.0, f"U coordinate below 0.0: {min(u_vals)}"
assert max(u_vals) <= 1.0001, f"U coordinate above 1.0: {max(u_vals)}"
assert min(v_vals) >= 0.0, f"V coordinate below 0.0: {min(v_vals)}"
assert max(v_vals) <= 1.0001, f"V coordinate above 1.0: {max(v_vals)}"

cross_border_faces = []
front_faces = []
back_faces = []

for f_idx, face in enumerate(tgt['faces']):
    u_corners = [tgt['uvs'][corner[1]][0] for corner in face]
    has_front = any(u < 0.50 for u in u_corners)
    has_back = any(u > 0.50 for u in u_corners)
    if has_front and has_back:
        cross_border_faces.append((f_idx, u_corners))
    elif has_front:
        front_faces.append(f_idx)
    elif has_back:
        back_faces.append(f_idx)
    else:
        # Exactly on 0.50
        cross_border_faces.append((f_idx, u_corners))

print(f"Total Triangles:          {len(tgt['faces'])}")
print(f"Front Triangles (U < 0.5): {len(front_faces)}")
print(f"Back Triangles (U > 0.5):  {len(back_faces)}")
print(f"Cross-border Triangles:   {len(cross_border_faces)}")

assert len(cross_border_faces) == 0, f"Found {len(cross_border_faces)} cross-border faces across U=0.50!"

front_u_max = max(max(tgt['uvs'][corner[1]][0] for corner in tgt['faces'][f_idx]) for f_idx in front_faces)
back_u_min = min(min(tgt['uvs'][corner[1]][0] for corner in tgt['faces'][f_idx]) for f_idx in back_faces)
gap = back_u_min - front_u_max
print(f"Front Max U: {front_u_max:.6f} (<= 0.50)")
print(f"Back Min U:  {back_u_min:.6f} (>= 0.50)")
print(f"Partition Safety Gap Delta U across 0.50: {gap:.6f} ({gap * 1024:.2f} pixels on 1024x1024 canvas)")
assert front_u_max <= 0.50, f"Front exceeds 0.50: {front_u_max}"
assert back_u_min >= 0.50, f"Back below 0.50: {back_u_min}"
assert gap >= 0.003, f"Safety gap too small: {gap}"

print("\n--- 4. SEAM WELDING & UV DECOUPLING AUDIT ---")
# 3D side seams: Vertices shared between front torso and back torso
front_v_indices = set(corner[0] for f_idx in front_faces for corner in tgt['faces'][f_idx])
back_v_indices = set(corner[0] for f_idx in back_faces for corner in tgt['faces'][f_idx])
shared_3d_vertices = front_v_indices.intersection(back_v_indices)
print(f"Front unique 3D vertex indices: {len(front_v_indices)}")
print(f"Back unique 3D vertex indices:  {len(back_v_indices)}")
print(f"Shared 3D vertices along seams:  {len(shared_3d_vertices)}")
assert len(shared_3d_vertices) > 0, "No shared 3D vertices found between front and back! Mesh is split!"

# UV decoupling: Ensure that along the seam, UV coordinates are decoupled (no shared vt index between front and back)
front_vt_indices = set(corner[1] for f_idx in front_faces for corner in tgt['faces'][f_idx])
back_vt_indices = set(corner[1] for f_idx in back_faces for corner in tgt['faces'][f_idx])
shared_vt_indices = front_vt_indices.intersection(back_vt_indices)
print(f"Front UV indices: {len(front_vt_indices)}")
print(f"Back UV indices:  {len(back_vt_indices)}")
print(f"Shared UV indices between Front and Back: {len(shared_vt_indices)}")
assert len(shared_vt_indices) == 0, f"UV indices shared between front and back: {len(shared_vt_indices)}! Texture bleed risk!"

print("\n--- 5. ANTI-MIRRORING EMPIRICAL AUDIT ---")
# Chest area: Y in [-0.2, 0.4], Z > 0.1
front_chest_left_u = []   # X < -0.15 (screen left / model right)
front_chest_right_u = []  # X > +0.15 (screen right / model left)

# Back chest area: Y in [-0.2, 0.4], Z < -0.1
back_chest_left_u = []    # As seen from behind: X > +0.15 is viewer's left
back_chest_right_u = []   # As seen from behind: X < -0.15 is viewer's right

for face in tgt['faces']:
    for corner in face:
        v = tgt['vertices'][corner[0]]
        vt = tgt['uvs'][corner[1]]
        x, y, z = v[0], v[1], v[2]
        u, val_v = vt[0], vt[1]
        if -0.2 <= y <= 0.4:
            if z > 0.10: # Front
                if x < -0.15:
                    front_chest_left_u.append(u)
                elif x > 0.15:
                    front_chest_right_u.append(u)
            elif z < -0.10: # Back
                if x > 0.15: # viewer left
                    back_chest_left_u.append(u)
                elif x < -0.15: # viewer right
                    back_chest_right_u.append(u)

avg_f_left = sum(front_chest_left_u) / len(front_chest_left_u)
avg_f_right = sum(front_chest_right_u) / len(front_chest_right_u)
avg_b_left = sum(back_chest_left_u) / len(back_chest_left_u)
avg_b_right = sum(back_chest_right_u) / len(back_chest_right_u)

print(f"Front Chest: Screen-Left avg U = {avg_f_left:.4f}, Screen-Right avg U = {avg_f_right:.4f}")
print(f"Back Chest:  Viewer-Left avg U = {avg_b_left:.4f}, Viewer-Right avg U = {avg_b_right:.4f}")

assert avg_f_left < avg_f_right, f"Front texture is horizontally mirrored! ({avg_f_left:.4f} >= {avg_f_right:.4f})"
assert avg_b_left < avg_b_right, f"Back texture is horizontally mirrored! ({avg_b_left:.4f} >= {avg_b_right:.4f})"
print("Anti-mirroring check PASSED on both Front and Back!")

print("\n--- 6. FLOOR CLEARANCE & THREE.JS BOUNDING BOX ---")
hem_y = min_ty
shadow_plane_y = -1.10
clearance = hem_y - shadow_plane_y
print(f"Bottom Hem Y:     {hem_y:.6f}")
print(f"Shadow Floor Y:   {shadow_plane_y:.6f}")
print(f"Floor Clearance:  {clearance:.6f} meters (+{clearance * 100:.2f} cm)")
assert clearance > 0.15, f"Clearance too small: {clearance}"

print("\n=== ALL INDEPENDENT GEOMETRY AUDIT CHECKS PASSED ===")
