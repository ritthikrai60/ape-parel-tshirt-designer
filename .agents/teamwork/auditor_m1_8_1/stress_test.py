#!/usr/bin/env python3
"""
Adversarial Stress-Testing & Geometric Quality Audit
Auditor: auditor_m1_8_1
"""

import os
import sys
import math
from collections import defaultdict

PUB_PATH = os.path.abspath("public/models/tshirt.obj")

print("=" * 80)
print("ADVERSARIAL STRESS-TESTING: GEOMETRY, UV INTEGRITY & DEGENERACY")
print("=" * 80)

vertices = []
uvs = []
normals = []
faces = []

with open(PUB_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        p = line.split()
        if p[0] == "v":
            vertices.append([float(p[1]), float(p[2]), float(p[3])])
        elif p[0] == "vt":
            uvs.append([float(p[1]), float(p[2])])
        elif p[0] == "vn":
            normals.append([float(p[1]), float(p[2]), float(p[3])])
        elif p[0] == "f":
            corners = []
            for c in p[1:]:
                parts = c.split("/")
                corners.append((int(parts[0]) - 1, int(parts[1]) - 1, int(parts[2]) - 1))
            faces.append(corners)

print(f"Loaded {len(vertices)} vertices, {len(uvs)} UVs, {len(normals)} normals, {len(faces)} faces.")

# 1. Check for unreferenced elements
ref_v = set()
ref_vt = set()
ref_vn = set()
degenerate_faces = 0
for f_idx, face in enumerate(faces):
    v0, v1, v2 = face[0][0], face[1][0], face[2][0]
    if v0 == v1 or v1 == v2 or v2 == v0:
        degenerate_faces += 1
    for c in face:
        ref_v.add(c[0])
        ref_vt.add(c[1])
        ref_vn.add(c[2])

print(f"Degenerate 3D faces (duplicate vertex in triangle): {degenerate_faces}")
print(f"Referenced vertices: {len(ref_v)} / {len(vertices)}")
print(f"Referenced UVs:      {len(ref_vt)} / {len(uvs)}")
print(f"Referenced normals:  {len(ref_vn)} / {len(normals)}")

assert degenerate_faces == 0, f"Found {degenerate_faces} degenerate 3D faces!"
assert len(ref_v) == len(vertices), f"Found {len(vertices) - len(ref_v)} unreferenced vertices!"
assert len(ref_vt) == len(uvs), f"Found {len(uvs) - len(ref_vt)} unreferenced UVs!"
assert len(ref_vn) == len(normals), f"Found {len(normals) - len(ref_vn)} unreferenced normals!"

# 2. Check 3D Face Areas & Normals
zero_area_3d = 0
min_area_3d = float('inf')
max_area_3d = 0.0

def vec_sub(a, b):
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]

def vec_cross(a, b):
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ]

def vec_len(a):
    return math.sqrt(a[0]**2 + a[1]**2 + a[2]**2)

for face in faces:
    p0 = vertices[face[0][0]]
    p1 = vertices[face[1][0]]
    p2 = vertices[face[2][0]]
    e1 = vec_sub(p1, p0)
    e2 = vec_sub(p2, p0)
    cr = vec_cross(e1, e2)
    area = 0.5 * vec_len(cr)
    if area < 1e-8:
        zero_area_3d += 1
    min_area_3d = min(min_area_3d, area)
    max_area_3d = max(max_area_3d, area)

print(f"3D Triangle Areas: min={min_area_3d:.8f}, max={max_area_3d:.8f}, zero_area (<1e-8)={zero_area_3d}")
assert zero_area_3d == 0, f"Found {zero_area_3d} zero-area 3D triangles!"

# 3. Check UV Face Areas (Signed and Unsigned)
zero_area_uv = 0
flipped_uv = 0
front_uv_area = 0.0
back_uv_area = 0.0

for face in faces:
    t0 = uvs[face[0][1]]
    t1 = uvs[face[1][1]]
    t2 = uvs[face[2][1]]
    
    # 2D cross product: (x1 - x0)*(y2 - y0) - (y1 - y0)*(x2 - x0)
    signed_area_2d = 0.5 * ((t1[0] - t0[0]) * (t2[1] - t0[1]) - (t1[1] - t0[1]) * (t2[0] - t0[0]))
    if abs(signed_area_2d) < 1e-9:
        zero_area_uv += 1
    
    u_mean = (t0[0] + t1[0] + t2[0]) / 3.0
    if u_mean < 0.5:
        front_uv_area += abs(signed_area_2d)
    else:
        back_uv_area += abs(signed_area_2d)

print(f"UV Triangle Area stats:")
print(f"  Zero-area UV triangles (<1e-9): {zero_area_uv}")
print(f"  Front UV total area coverage:  {front_uv_area:.4f} (of 0.5 max)")
print(f"  Back UV total area coverage:   {back_uv_area:.4f} (of 0.5 max)")

# 4. Check for NaN / Inf in any floating point value
nan_inf_found = False
for i, v in enumerate(vertices):
    if any(math.isnan(c) or math.isinf(c) for c in v):
        nan_inf_found = True
        print(f"NaN/Inf in vertex {i}: {v}")
for i, uv in enumerate(uvs):
    if any(math.isnan(c) or math.isinf(c) for c in uv):
        nan_inf_found = True
        print(f"NaN/Inf in UV {i}: {uv}")
for i, n in enumerate(normals):
    if any(math.isnan(c) or math.isinf(c) for c in n):
        nan_inf_found = True
        print(f"NaN/Inf in normal {i}: {n}")

assert not nan_inf_found, "Found NaN or Inf in coordinates!"
print("Floating-point sanitization: ZERO NaN/Inf values found.")

# 5. Check Boundary Safety Margins
front_u_coords = [uv[0] for uv in uvs if uv[0] < 0.5]
back_u_coords = [uv[0] for uv in uvs if uv[0] >= 0.5]

print(f"Front U bounds: min={min(front_u_coords):.6f}, max={max(front_u_coords):.6f}")
print(f"Back U bounds:  min={min(back_u_coords):.6f}, max={max(back_u_coords):.6f}")
margin = min(back_u_coords) - max(front_u_coords)
print(f"Partition boundary safety margin across U=0.50: {margin:.6f}")
assert margin >= 0.003, f"Safety margin too narrow or negative: {margin}"
print("Partition boundary safety: VERIFIED with safety margin > 0.003.")

print("=" * 80)
print("ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY.")
print("=" * 80)
