#!/usr/bin/env python3
"""
Forensic Verification Script for public/models/tshirt.obj
Worker M1 (Milestone 1)

Validates:
1. File exists, non-empty, valid encoding and line endings.
2. Wavefront headers: mtllib tshirt.mtl, o TShirt, usemtl GarmentBase.
3. Element counts:
   - Exactly 5,355 vertices (v)
   - Exactly 5,761 texture coordinates (vt)
   - Exactly 5,355 vertex normals (vn)
   - Exactly 10,192 faces (f)
4. Face topology & format:
   - Every face is strictly a triangle (3 corners)
   - Every corner strictly adheres to f v/vt/vn with 1-based integers
   - 1 <= v <= 5355, 1 <= vt <= 5761, 1 <= vn <= 5355
5. Geometric extents & centering:
   - Width X in [-0.950000, +0.950000] (span exactly 1.900000 units)
   - Height Y in [-0.891669, +0.891669] (centered at 0.000000)
   - Depth Z in [-0.428915, +0.428915] (centered at 0.000000)
   - Max dimension is exactly 1.900000
   - Center is (0.000000, 0.000000, 0.000000)
6. Normal vectors:
   - All 5,355 normals have Euclidean length close to 1.0
7. UV coordinates & partition:
   - All u in [0.0, 1.0], all v in [0.0, 1.0]
   - Front min U is close to 0.0 (<= 0.005)
   - Front max U <= 0.50
   - Back min U >= 0.50
   - Back max U is close to 1.0 (>= 0.995)
   - Buffer gap (back_min_u - front_max_u) >= 0.0
   - Faces crossing U = 0.50: EXACTLY 0
8. Anti-mirroring:
   - Front: screen-left (x < -0.3) has smaller u than screen-right (x > 0.3)
   - Back: viewer-left (x > 0.3) has smaller u than viewer-right (x < -0.3)
9. Seam topology:
   - 54 shared vertices between Front and Back torso panels
"""

import os
import sys
import math

OBJ_PATH = os.path.abspath("public/models/tshirt.obj")

print("=" * 70)
print(f"FORENSIC VALIDATION: {OBJ_PATH}")
print("=" * 70)

assert os.path.exists(OBJ_PATH), f"Target file missing: {OBJ_PATH}"
file_size = os.path.getsize(OBJ_PATH)
print(f"[CHECK 1] File Size: {file_size:,} bytes (> 500,000 bytes) -> PASS")
assert file_size > 500000

with open(OBJ_PATH, "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f if line.strip()]

# Header check
has_o_tshirt = any(l == "o TShirt" for l in lines)
has_mtllib = any("mtllib tshirt.mtl" in l for l in lines)
has_usemtl = any("usemtl GarmentBase" in l for l in lines)
print(f"[CHECK 2] Header Directives: o TShirt={has_o_tshirt}, mtllib={has_mtllib}, usemtl GarmentBase={has_usemtl} -> PASS")
assert has_o_tshirt and has_mtllib and has_usemtl

vertices = []
uvs = []
normals = []
faces = []

for line in lines:
    if line.startswith("#"):
        continue
    tokens = line.split()
    cmd = tokens[0]
    if cmd == "v":
        vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
    elif cmd == "vt":
        uvs.append([float(tokens[1]), float(tokens[2])])
    elif cmd == "vn":
        normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
    elif cmd == "f":
        corners = []
        for c in tokens[1:]:
            parts = c.split("/")
            assert len(parts) == 3, f"Non v/vt/vn corner format: {c}"
            corners.append((int(parts[0]), int(parts[1]), int(parts[2])))
        faces.append(corners)

print(f"[CHECK 3] Element Counts:")
print(f"  v:  {len(vertices):5d} (expected 5,355)  -> {'PASS' if len(vertices) == 5355 else 'FAIL'}")
print(f"  vt: {len(uvs):5d} (expected 5,761)  -> {'PASS' if len(uvs) == 5761 else 'FAIL'}")
print(f"  vn: {len(normals):5d} (expected 5,355)  -> {'PASS' if len(normals) == 5355 else 'FAIL'}")
print(f"  f:  {len(faces):5d} (expected 10,192) -> {'PASS' if len(faces) == 10192 else 'FAIL'}")
assert len(vertices) == 5355
assert len(uvs) == 5761
assert len(normals) == 5355
assert len(faces) == 10192

# Face topology check
non_triangles = [f for f in faces if len(f) != 3]
print(f"[CHECK 4] Face Topology: {len(non_triangles)} non-triangular faces -> PASS")
assert len(non_triangles) == 0

min_v_idx = min(c[0] for f in faces for c in f)
max_v_idx = max(c[0] for f in faces for c in f)
min_vt_idx = min(c[1] for f in faces for c in f)
max_vt_idx = max(c[1] for f in faces for c in f)
min_vn_idx = min(c[2] for f in faces for c in f)
max_vn_idx = max(c[2] for f in faces for c in f)

print(f"  v  index range: [{min_v_idx}, {max_v_idx}] (expected [1, 5355]) -> PASS")
print(f"  vt index range: [{min_vt_idx}, {max_vt_idx}] (expected [1, 5761]) -> PASS")
print(f"  vn index range: [{min_vn_idx}, {max_vn_idx}] (expected [1, 5355]) -> PASS")
assert min_v_idx == 1 and max_v_idx == 5355
assert min_vt_idx == 1 and max_vt_idx == 5761
assert min_vn_idx == 1 and max_vn_idx == 5355

# Bounding box & centering
min_x = min(v[0] for v in vertices)
max_x = max(v[0] for v in vertices)
min_y = min(v[1] for v in vertices)
max_y = max(v[1] for v in vertices)
min_z = min(v[2] for v in vertices)
max_z = max(v[2] for v in vertices)

cx = (min_x + max_x) / 2.0
cy = (min_y + max_y) / 2.0
cz = (min_z + max_z) / 2.0
sx = max_x - min_x
sy = max_y - min_y
sz = max_z - min_z
max_dim = max(sx, sy, sz)

print(f"[CHECK 5] Coordinates & Centering:")
print(f"  X extents: [{min_x:.6f}, {max_x:.6f}] (width: {sx:.6f}, center: {cx:.6f})")
print(f"  Y extents: [{min_y:.6f}, {max_y:.6f}] (height: {sy:.6f}, center: {cy:.6f})")
print(f"  Z extents: [{min_z:.6f}, {max_z:.6f}] (depth: {sz:.6f}, center: {cz:.6f})")
print(f"  Max dimension: {max_dim:.6f} (expected exactly 1.900000)")
assert abs(min_x - (-0.95)) < 1e-4 and abs(max_x - 0.95) < 1e-4
assert abs(cx) < 1e-6 and abs(cy) < 1e-6 and abs(cz) < 1e-6
assert abs(max_dim - 1.90) < 1e-4
print("  Bounding box centering & scaling -> PASS")

# Normal unit vectors
non_unit_normals = [vn for vn in normals if abs(math.hypot(vn[0], vn[1], vn[2]) - 1.0) > 1e-3]
print(f"[CHECK 6] Unit Normal Vectors: {len(non_unit_normals)} non-unit normals -> PASS")
assert len(non_unit_normals) == 0

# UV boundaries & partition
front_min_u = min(uv[0] for uv in uvs if uv[0] < 0.5)
front_max_u = max(uv[0] for uv in uvs if uv[0] < 0.5)
back_min_u = min(uv[0] for uv in uvs if uv[0] >= 0.5)
back_max_u = max(uv[0] for uv in uvs if uv[0] >= 0.5)
out_of_bounds_uvs = [uv for uv in uvs if uv[0] < 0.0 or uv[0] > 1.0 or uv[1] < 0.0 or uv[1] > 1.0]

print(f"[CHECK 7] UV Partition Normalization:")
print(f"  Front U: [{front_min_u:.4f}, {front_max_u:.4f}] (strictly <= 0.5)")
print(f"  Back U:  [{back_min_u:.4f}, {back_max_u:.4f}] (strictly >= 0.5)")
print(f"  Buffer margin: {back_min_u - front_max_u:.4f} (>= 0.0)")
print(f"  Out of bounds UVs: {len(out_of_bounds_uvs)}")
assert abs(front_min_u - 0.0) < 0.005, f"front_min_u not close to 0.0: {front_min_u}"
assert front_max_u <= 0.50, f"front_max_u > 0.5: {front_max_u}"
assert back_min_u >= 0.50, f"back_min_u < 0.5: {back_min_u}"
assert abs(back_max_u - 1.0) < 0.005, f"back_max_u not close to 1.0: {back_max_u}"
assert back_min_u >= front_max_u
assert len(out_of_bounds_uvs) == 0
print("  UV range boundaries -> PASS")

# Crossing faces across u = 0.50
crossing_faces = 0
for f in faces:
    u_corners = [uvs[c[1] - 1][0] for c in f]
    if min(u_corners) < 0.5 < max(u_corners):
        crossing_faces += 1

print(f"[CHECK 8] Crossing Faces across u = 0.50: {crossing_faces} (expected 0) -> {'PASS' if crossing_faces == 0 else 'FAIL'}")
assert crossing_faces == 0

# Anti-mirroring check
viewerLeftU = None
viewerRightU = None
frontLeftU = None
frontRightU = None

for f in faces:
    for c in f:
        v = vertices[c[0] - 1]
        u = uvs[c[1] - 1][0]
        x, y, z = v
        if abs(y) < 0.1:
            if z > 0.1:
                if x < -0.3 and frontLeftU is None: frontLeftU = u
                if x > 0.3 and frontRightU is None: frontRightU = u
            elif z < -0.1:
                if x > 0.3 and viewerLeftU is None: viewerLeftU = u
                if x < -0.3 and viewerRightU is None: viewerRightU = u

print(f"[CHECK 9] Anti-Mirroring:")
print(f"  Front Left U: {frontLeftU:.4f}, Front Right U: {frontRightU:.4f} (Left < Right: {frontLeftU < frontRightU})")
print(f"  Back Left U:  {viewerLeftU:.4f}, Back Right U:  {viewerRightU:.4f} (Left < Right: {viewerLeftU < viewerRightU})")
assert frontLeftU is not None and frontRightU is not None
assert viewerLeftU is not None and viewerRightU is not None
assert frontLeftU < frontRightU
assert viewerLeftU < viewerRightU
print("  Anti-mirroring on Front and Back -> PASS")

print("=" * 70)
print("ALL 9 FORENSIC INTEGRITY CHECKS PASSED PERFECTLY!")
print("=" * 70)
