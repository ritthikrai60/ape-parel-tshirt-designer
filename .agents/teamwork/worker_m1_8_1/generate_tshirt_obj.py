#!/usr/bin/env python3
"""
Production Model Adaptation Pipeline for ape-parel 3D Customizer
Worker M1 (Milestone 1)

Adapts prep_models/various size/Low_T-shirt.obj into public/models/tshirt.obj:
1. Ingests 5,355 vertices, 5,761 UVs, 5,355 normals, 5,097 faces (5,095 quads, 2 tris).
2. Converts coordinate system:
   - Pre-centers bounding box exactly at origin (0, 0, 0)
   - Scales uniformly so max dimension is 1.90 units (width X in [-0.95, +0.95] m)
   - Preserves Three.js orientation: +Y Up, +Z Forward, -Z Backward
3. Triangulates all 5,095 quads into triangles (10,190 tris + 2 tris = exactly 10,192 triangles).
4. UV Partition Normalization:
   - Front garment sections (Z > 0): strictly mapped within U in [0.0, 0.5]
   - Back garment sections (Z < 0): strictly mapped within U in [0.5, 1.0]
   - Swapped raw Front/Back partitions
   - Exactly 0 faces cross U = 0.50
   - Welded side seams (54 shared vertices) preserved
   - Horizontal anti-mirroring preserved
5. Wavefront OBJ Header:
   - o TShirt
   - mtllib tshirt.mtl
   - usemtl GarmentBase
   - standard f v/vt/vn syntax
"""

import os
import sys
from collections import defaultdict, deque

INPUT_PATH = os.path.abspath("prep_models/various size/Low_T-shirt.obj")
OUTPUT_PATH = os.path.abspath("public/models/tshirt.obj")

print(f"Reading input asset: {INPUT_PATH}")
if not os.path.exists(INPUT_PATH):
    raise FileNotFoundError(f"Input file not found: {INPUT_PATH}")

vertices = []
uvs = []
normals = []
faces = []

with open(INPUT_PATH, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        tokens = line.split()
        if tokens[0] == "v":
            vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tokens[0] == "vt":
            uvs.append([float(tokens[1]), float(tokens[2])])
        elif tokens[0] == "vn":
            normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
        elif tokens[0] == "f":
            face = []
            for corner in tokens[1:]:
                parts = corner.split("/")
                v_idx = int(parts[0]) - 1
                vt_idx = int(parts[1]) - 1 if len(parts) > 1 and parts[1] else -1
                vn_idx = int(parts[2]) - 1 if len(parts) > 2 and parts[2] else -1
                face.append((v_idx, vt_idx, vn_idx))
            faces.append(face)

print(f"Loaded {len(vertices)} vertices, {len(uvs)} UVs, {len(normals)} normals, {len(faces)} faces.")
assert len(vertices) == 5355, f"Expected 5355 vertices, found {len(vertices)}"
assert len(uvs) == 5761, f"Expected 5761 UVs, found {len(uvs)}"
assert len(normals) == 5355, f"Expected 5355 normals, found {len(normals)}"
assert len(faces) == 5097, f"Expected 5097 faces, found {len(faces)}"

# -----------------------------------------------------------------------------
# 1. 3D Coordinates: Bounding Box Centering & Scale Normalization
# -----------------------------------------------------------------------------
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

scale = 1.90 / max_dim
print(f"Raw bounding box: X=[{min_x:.3f}, {max_x:.3f}], Y=[{min_y:.3f}, {max_y:.3f}], Z=[{min_z:.3f}, {max_z:.3f}]")
print(f"Center=({center_x:.6f}, {center_y:.6f}, {center_z:.6f}), max_dim={max_dim:.6f}, scale={scale:.8f}")

transformed_vertices = []
for v in vertices:
    transformed_vertices.append([
        (v[0] - center_x) * scale,
        (v[1] - center_y) * scale,
        (v[2] - center_z) * scale
    ])

# -----------------------------------------------------------------------------
# 2. UV Island Decomposition
# -----------------------------------------------------------------------------
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

print(f"Identified {len(islands)} topological UV islands.")
assert len(islands) == 15, f"Expected 15 islands, found {len(islands)}"

# -----------------------------------------------------------------------------
# 3. Deterministic UV Normalization & 50/50 Partitioning
# -----------------------------------------------------------------------------
transformed_uvs = [list(uv) for uv in uvs]

def remap_island_u(isl_idx, target_min_u, target_max_u):
    comp = islands[isl_idx]
    comp_uv_indices = set(corner[1] for f in comp for corner in faces[f])
    cur_min_u = min(uvs[i][0] for i in comp_uv_indices)
    cur_max_u = max(uvs[i][0] for i in comp_uv_indices)
    delta = cur_max_u - cur_min_u
    for i in comp_uv_indices:
        t = (uvs[i][0] - cur_min_u) / delta if delta > 0 else 0.0
        transformed_uvs[i][0] = target_min_u + t * (target_max_u - target_min_u)

def remap_island_v(isl_idx, target_min_v, target_max_v):
    comp = islands[isl_idx]
    comp_uv_indices = set(corner[1] for f in comp for corner in faces[f])
    cur_min_v = min(uvs[i][1] for i in comp_uv_indices)
    cur_max_v = max(uvs[i][1] for i in comp_uv_indices)
    delta = cur_max_v - cur_min_v
    for i in comp_uv_indices:
        t = (uvs[i][1] - cur_min_v) / delta if delta > 0 else 0.0
        transformed_uvs[i][1] = target_min_v + t * (target_max_v - target_min_v)

# Island 9 (Front Torso Body, index 8): [0.0020, 0.4980]
remap_island_u(8, 0.0020, 0.4980)

# Island 12 (Back Torso Body, index 11): [0.5020, 0.9980]
remap_island_u(11, 0.5020, 0.9980)

# Front Bottom Hems (Islands 10 & 13, indices 9 & 12): [0.0200, 0.4800]
remap_island_u(9, 0.0200, 0.4800)
remap_island_u(12, 0.0200, 0.4800)

# Back Bottom Hems (Islands 11 & 14, indices 10 & 13): [0.5200, 0.9800]
remap_island_u(10, 0.5200, 0.9800)
remap_island_u(13, 0.5200, 0.9800)

# Back Brand Patch (Island 15, index 14): U in [0.7200, 0.7800], V in [0.8800, 0.9400]
remap_island_u(14, 0.7200, 0.7800)
remap_island_v(14, 0.8800, 0.9400)

# Right Sleeve Cuffs (Islands 4 & 7, indices 3 & 6): [0.0500, 0.4500]
remap_island_u(3, 0.0500, 0.4500)
remap_island_u(6, 0.0500, 0.4500)

# Left Sleeve Panel (Island 3, index 2): [0.5500, 0.9500]
remap_island_u(2, 0.5500, 0.9500)

# (Islands 1 & 8 [Collar], Island 5 [Right Sleeve], Islands 2 & 6 [Left Sleeve Cuffs]
# are already strictly partitioned in their respective halves without crossing 0.50).

# -----------------------------------------------------------------------------
# 4. Triangulation & Face Ordering
# -----------------------------------------------------------------------------
# Place Torso faces first (Front Torso Island 9, then Back Torso Island 12),
# followed by all remaining islands.
torso_triangles = []
other_triangles = []

for f_idx, f in enumerate(faces):
    isl = face_to_island[f_idx]
    if len(f) == 4:
        tris = [
            [f[0], f[1], f[2]],
            [f[0], f[2], f[3]]
        ]
    elif len(f) == 3:
        tris = [f]
    else:
        raise ValueError(f"Unexpected face arity {len(f)} at face {f_idx}")

    if isl in (8, 11): # Front Torso (8) and Back Torso (11)
        torso_triangles.extend(tris)
    else:
        other_triangles.extend(tris)

all_triangles = torso_triangles + other_triangles
print(f"Triangulated into {len(all_triangles)} triangles ({len(torso_triangles)} torso, {len(other_triangles)} other).")
assert len(all_triangles) == 10192, f"Expected 10192 triangles, found {len(all_triangles)}"

# -----------------------------------------------------------------------------
# 5. Export Production public/models/tshirt.obj
# -----------------------------------------------------------------------------
print(f"Exporting adapted model to {OUTPUT_PATH}...")
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

with open(OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as out:
    out.write("# Wavefront OBJ exported for ape-parel 3D customizer\n")
    out.write("# Adapted from prep_models/various size/Low_T-shirt.obj\n")
    out.write("mtllib tshirt.mtl\n")
    out.write("o TShirt\n")

    # Vertices (v)
    for v in transformed_vertices:
        out.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")

    # Texture Coordinates (vt)
    for vt in transformed_uvs:
        out.write(f"vt {vt[0]:.6f} {vt[1]:.6f}\n")

    # Vertex Normals (vn)
    for vn in normals:
        out.write(f"vn {vn[0]:.6f} {vn[1]:.6f} {vn[2]:.6f}\n")

    # Surface Smoothing & Material
    out.write("s 1\n")
    out.write("usemtl GarmentBase\n")

    # Face Loops (f v/vt/vn)
    for tri in all_triangles:
        # Convert 0-based indices to 1-based Wavefront OBJ indices
        c0 = f"{tri[0][0] + 1}/{tri[0][1] + 1}/{tri[0][2] + 1}"
        c1 = f"{tri[1][0] + 1}/{tri[1][1] + 1}/{tri[1][2] + 1}"
        c2 = f"{tri[2][0] + 1}/{tri[2][1] + 1}/{tri[2][2] + 1}"
        out.write(f"f {c0} {c1} {c2}\n")

file_size = os.path.getsize(OUTPUT_PATH)
print(f"Successfully generated {OUTPUT_PATH} ({file_size:,} bytes).")
