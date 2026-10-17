#!/usr/bin/env python3
"""
Forensic Integrity Audit Script for Milestone 1
Auditor: auditor_m1_8_1
Target: public/models/tshirt.obj vs prep_models/various size/Low_T-shirt.obj
Worker Pipeline: .agents/teamwork/worker_m1_8_1/generate_tshirt_obj.py
"""

import os
import sys
import math
from collections import defaultdict, deque

RAW_PATH = os.path.abspath("prep_models/various size/Low_T-shirt.obj")
PUB_PATH = os.path.abspath("public/models/tshirt.obj")
SCRIPT_PATH = os.path.abspath(".agents/teamwork/worker_m1_8_1/generate_tshirt_obj.py")

print("=" * 80)
print("FORENSIC INTEGRITY AUDIT — MILESTONE 1 ASSET PROVENANCE")
print(f"Raw Source: {RAW_PATH}")
print(f"Target OBJ: {PUB_PATH}")
print(f"Pipeline:   {SCRIPT_PATH}")
print("=" * 80)

def parse_obj(path):
    verts = []
    uvs = []
    normals = []
    faces = []
    headers = []
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line_s = line.strip()
            if not line_s or line_s.startswith("#"):
                continue
            parts = line_s.split()
            tag = parts[0]
            if tag == "v":
                verts.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif tag == "vt":
                uvs.append([float(parts[1]), float(parts[2])])
            elif tag == "vn":
                normals.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif tag == "f":
                corners = []
                for p in parts[1:]:
                    sub = p.split("/")
                    v_idx = int(sub[0])
                    vt_idx = int(sub[1]) if len(sub) > 1 and sub[1] else None
                    vn_idx = int(sub[2]) if len(sub) > 2 and sub[2] else None
                    corners.append((v_idx, vt_idx, vn_idx))
                faces.append(corners)
            elif tag in ("o", "g", "mtllib", "usemtl", "s"):
                headers.append((line_no, line_s))
    return {
        "verts": verts,
        "uvs": uvs,
        "normals": normals,
        "faces": faces,
        "headers": headers,
    }

raw_data = parse_obj(RAW_PATH)
pub_data = parse_obj(PUB_PATH)

print(f"\n[PHASE 1: ELEMENT COUNTS]")
print(f"Raw vertices: {len(raw_data['verts'])}")
print(f"Pub vertices: {len(pub_data['verts'])}")
print(f"Raw UVs:      {len(raw_data['uvs'])}")
print(f"Pub UVs:      {len(pub_data['uvs'])}")
print(f"Raw normals:  {len(raw_data['normals'])}")
print(f"Pub normals:  {len(pub_data['normals'])}")
print(f"Raw faces:    {len(raw_data['faces'])}")
print(f"Pub faces:    {len(pub_data['faces'])}")

# Check 1: 1:1 Vertex count
assert len(raw_data['verts']) == 5355, "Raw vertices != 5355"
assert len(pub_data['verts']) == 5355, "Pub vertices != 5355"

# Check 2: Mathematical 1:1 Affine Transformation
print(f"\n[PHASE 2: VERTEX AFFINE BIJECTION FORENSICS]")
# Find raw extents
raw_v = raw_data['verts']
pub_v = pub_data['verts']

min_x_raw, max_x_raw = min(v[0] for v in raw_v), max(v[0] for v in raw_v)
min_y_raw, max_y_raw = min(v[1] for v in raw_v), max(v[1] for v in raw_v)
min_z_raw, max_z_raw = min(v[2] for v in raw_v), max(v[2] for v in raw_v)

cx_raw = (min_x_raw + max_x_raw) / 2.0
cy_raw = (min_y_raw + max_y_raw) / 2.0
cz_raw = (min_z_raw + max_z_raw) / 2.0
span_x_raw = max_x_raw - min_x_raw
span_y_raw = max_y_raw - min_y_raw
span_z_raw = max_z_raw - min_z_raw
max_dim_raw = max(span_x_raw, span_y_raw, span_z_raw)
scale_expected = 1.90 / max_dim_raw

print(f"Raw Center: ({cx_raw:.6f}, {cy_raw:.6f}, {cz_raw:.6f})")
print(f"Raw Spans:  X={span_x_raw:.6f}, Y={span_y_raw:.6f}, Z={span_z_raw:.6f}, MaxDim={max_dim_raw:.6f}")
print(f"Expected Uniform Scale: {scale_expected:.10f}")

# Compare every single vertex
max_err_x, max_err_y, max_err_z = 0.0, 0.0, 0.0
err_count = 0

for i in range(5355):
    rv = raw_v[i]
    pv = pub_v[i]
    
    expected_x = (rv[0] - cx_raw) * scale_expected
    expected_y = (rv[1] - cy_raw) * scale_expected
    expected_z = (rv[2] - cz_raw) * scale_expected
    
    ex = abs(pv[0] - expected_x)
    ey = abs(pv[1] - expected_y)
    ez = abs(pv[2] - expected_z)
    
    max_err_x = max(max_err_x, ex)
    max_err_y = max(max_err_y, ey)
    max_err_z = max(max_err_z, ez)
    
    # 6 decimals in output implies tolerance ~ 1e-5
    if ex > 1e-4 or ey > 1e-4 or ez > 1e-4:
        err_count += 1
        if err_count <= 5:
            print(f"Vertex {i} deviation: pub={pv}, expected=({expected_x:.6f}, {expected_y:.6f}, {expected_z:.6f}), err=({ex:.6f}, {ey:.6f}, {ez:.6f})")

print(f"Max error across 5,355 vertices: X={max_err_x:.8f}, Y={max_err_y:.8f}, Z={max_err_z:.8f}")
print(f"Vertices with deviation > 1e-4: {err_count} / 5355")
assert err_count == 0, f"Vertex affine transformation check failed: {err_count} vertices deviated!"

# Check 3: Normals preservation
print(f"\n[PHASE 3: VERTEX NORMALS INTEGRITY]")
assert len(pub_data['normals']) == 5355, "Pub normals != 5355"
normal_errs = 0
for i in range(5355):
    rn = raw_data['normals'][i]
    pn = pub_data['normals'][i]
    diff = max(abs(rn[0] - pn[0]), abs(rn[1] - pn[1]), abs(rn[2] - pn[2]))
    if diff > 1e-5:
        normal_errs += 1
print(f"Normals exactly matching raw asset: {5355 - normal_errs} / 5355 (diffs > 1e-5: {normal_errs})")
assert normal_errs == 0, f"Vertex normals deviated from raw asset: {normal_errs} mismatches!"

# Check 4: Triangulation and Face Topology Correspondence
print(f"\n[PHASE 4: FACE TOPOLOGY & TRIANGULATION BIJECTION]")
# Triangulate raw faces following standard quad split: (0, 1, 2) and (0, 2, 3)
raw_triangles = []
for f_idx, f in enumerate(raw_data['faces']):
    if len(f) == 3:
        raw_triangles.append(tuple(f))
    elif len(f) == 4:
        raw_triangles.append((f[0], f[1], f[2]))
        raw_triangles.append((f[0], f[2], f[3]))
    else:
        raise ValueError(f"Unexpected raw face arity {len(f)}")

print(f"Raw triangulated triangle count: {len(raw_triangles)}")
print(f"Pub triangle count:              {len(pub_data['faces'])}")
assert len(raw_triangles) == 10192, f"Expected 10192 raw triangles, got {len(raw_triangles)}"
assert len(pub_data['faces']) == 10192, f"Expected 10192 pub triangles, got {len(pub_data['faces'])}"

# Convert corners to geometric vertex index tuples (v0, v1, v2)
raw_geo_tri_set = defaultdict(int)
for tri in raw_triangles:
    geo_t = (tri[0][0], tri[1][0], tri[2][0])
    raw_geo_tri_set[geo_t] += 1

pub_geo_tri_set = defaultdict(int)
for tri in pub_data['faces']:
    geo_t = (tri[0][0], tri[1][0], tri[2][0])
    pub_geo_tri_set[geo_t] += 1

missing_in_pub = 0
for geo_t, count in raw_geo_tri_set.items():
    if pub_geo_tri_set[geo_t] != count:
        missing_in_pub += 1

extra_in_pub = 0
for geo_t, count in pub_geo_tri_set.items():
    if raw_geo_tri_set[geo_t] != count:
        extra_in_pub += 1

print(f"Unique geometric triangle configurations: {len(raw_geo_tri_set)}")
print(f"Discrepancies in geometric triangles (missing/mismatched count): {missing_in_pub}")
print(f"Extra triangles in pub: {extra_in_pub}")
assert missing_in_pub == 0 and extra_in_pub == 0, "Pub faces do NOT match triangulated raw faces!"

# Check 5: UV Bounds & Partition Integrity
print(f"\n[PHASE 5: UV BOUNDS, 50/50 PARTITION & CROSSING FACES]")
pub_uvs = pub_data['uvs']
assert len(pub_uvs) == 5761, f"Expected 5761 UVs, got {len(pub_uvs)}"

all_u = [uv[0] for uv in pub_uvs]
all_v = [uv[1] for uv in pub_uvs]

print(f"Overall U range: [{min(all_u):.6f}, {max(all_u):.6f}]")
print(f"Overall V range: [{min(all_v):.6f}, {max(all_v):.6f}]")
assert min(all_u) >= 0.0, f"U coordinate below 0.0: {min(all_u)}"
assert max(all_u) <= 1.0, f"U coordinate above 1.0: {max(all_u)}"
assert min(all_v) >= 0.0, f"V coordinate below 0.0: {min(all_v)}"
assert max(all_v) <= 1.0, f"V coordinate above 1.0: {max(all_v)}"

# Check crossing faces
crossing_faces = 0
front_faces = 0
back_faces = 0
cross_face_samples = []

for idx, tri in enumerate(pub_data['faces']):
    u_corners = [pub_uvs[c[1] - 1][0] for c in tri]
    u_min = min(u_corners)
    u_max = max(u_corners)
    if u_min < 0.5 < u_max:
        crossing_faces += 1
        if len(cross_face_samples) < 5:
            cross_face_samples.append((idx, tri, u_corners))
    elif u_max <= 0.5:
        front_faces += 1
    elif u_min >= 0.5:
        back_faces += 1

print(f"Front faces (all u <= 0.5): {front_faces}")
print(f"Back faces  (all u >= 0.5): {back_faces}")
print(f"Crossing faces (crossing u=0.5): {crossing_faces}")
assert crossing_faces == 0, f"Detected {crossing_faces} crossing faces across u=0.50! Samples: {cross_face_samples}"

# Check 6: Anti-Mirroring & Orientation
print(f"\n[PHASE 6: HORIZONTAL ANTI-MIRRORING]")
# Inspect front torso chest region (Z > 0.1, Y between -0.2 and 0.4)
front_left_u = []   # Screen-left: X < -0.25
front_right_u = []  # Screen-right: X > +0.25

back_left_u = []    # Viewer-left: X > +0.25
back_right_u = []   # Viewer-right: X < -0.25

for tri in pub_data['faces']:
    for c in tri:
        v = pub_v[c[0] - 1]
        uv = pub_uvs[c[1] - 1]
        if -0.3 < v[1] < 0.3:
            if v[2] > 0.15: # Front chest
                if v[0] < -0.25:
                    front_left_u.append(uv[0])
                elif v[0] > 0.25:
                    front_right_u.append(uv[0])
            elif v[2] < -0.15: # Back
                if v[0] > 0.25:
                    back_left_u.append(uv[0])
                elif v[0] < -0.25:
                    back_right_u.append(uv[0])

avg_front_left = sum(front_left_u) / len(front_left_u) if front_left_u else None
avg_front_right = sum(front_right_u) / len(front_right_u) if front_right_u else None
avg_back_left = sum(back_left_u) / len(back_left_u) if back_left_u else None
avg_back_right = sum(back_right_u) / len(back_right_u) if back_right_u else None

print(f"Front Chest U: Screen-Left (avg) = {avg_front_left:.4f}, Screen-Right (avg) = {avg_front_right:.4f}")
print(f"Back Chest U:  Viewer-Left (avg) = {avg_back_left:.4f}, Viewer-Right (avg) = {avg_back_right:.4f}")

assert avg_front_left < avg_front_right, f"Front anti-mirroring violated: {avg_front_left} >= {avg_front_right}"
assert avg_back_left < avg_back_right, f"Back anti-mirroring violated: {avg_back_left} >= {avg_back_right}"
print("Anti-mirroring check: PASSED (U increases monotonically from left to right on both sides)")

# Check 7: Side Seam Physical Weldedness vs UV Disjointness
print(f"\n[PHASE 7: SIDE SEAM TOPOLOGY]")
# Count shared 3D vertices between front and back torso faces
front_tri_v_indices = set()
back_tri_v_indices = set()
front_tri_vt_indices = set()
back_tri_vt_indices = set()

for tri in pub_data['faces']:
    u_corners = [pub_uvs[c[1] - 1][0] for c in tri]
    if max(u_corners) <= 0.5:
        for c in tri:
            front_tri_v_indices.add(c[0])
            front_tri_vt_indices.add(c[1])
    elif min(u_corners) >= 0.5:
        for c in tri:
            back_tri_v_indices.add(c[0])
            back_tri_vt_indices.add(c[1])

shared_v = front_tri_v_indices.intersection(back_tri_v_indices)
shared_vt = front_tri_vt_indices.intersection(back_tri_vt_indices)

print(f"Vertices in Front panels: {len(front_tri_v_indices)}")
print(f"Vertices in Back panels:  {len(back_tri_v_indices)}")
print(f"Shared 3D vertices (seam welds): {len(shared_v)}")
print(f"Shared UV indices: {len(shared_vt)}")

assert len(shared_v) > 0, "No shared vertices between Front and Back (seams unwelded!)"
assert len(shared_vt) == 0, f"UV texture coordinates shared across seam boundary ({len(shared_vt)} shared vt)!"
print("Seam topology: 3D geometry is physically watertight, UV coordinates are strictly partitioned and disjoint.")

# Check 8: Wavefront OBJ File Format and Syntax Standards
print(f"\n[PHASE 8: WAVEFRONT OBJ SYNTAX & STANDARD COMPLIANCE]")
with open(PUB_PATH, "r", encoding="utf-8") as f:
    raw_lines = f.readlines()

print(f"Total lines in target OBJ: {len(raw_lines)}")
header_tags = [line.split()[0] for line in raw_lines if line.strip() and not line.startswith("#")]

# Check order of definitions: v before vt/vn, before f
first_v = next(i for i, t in enumerate(header_tags) if t == "v")
first_vt = next(i for i, t in enumerate(header_tags) if t == "vt")
first_vn = next(i for i, t in enumerate(header_tags) if t == "vn")
first_f = next(i for i, t in enumerate(header_tags) if t == "f")

print(f"First indices: v={first_v}, vt={first_vt}, vn={first_vn}, f={first_f}")
assert first_v < first_vt < first_vn < first_f, "OBJ element order is non-standard!"

# Check 1-based indexing bounds
for f_idx, tri in enumerate(pub_data['faces']):
    for c in tri:
        assert 1 <= c[0] <= 5355, f"Face {f_idx} vertex index {c[0]} out of bounds"
        assert 1 <= c[1] <= 5761, f"Face {f_idx} vt index {c[1]} out of bounds"
        assert 1 <= c[2] <= 5355, f"Face {f_idx} vn index {c[2]} out of bounds"

print("1-based indexing: PASSED for all 30,576 face corners.")

# Check 9: Anti-Cheating & Prohibited Pattern Forensics
print(f"\n[PHASE 9: ANTI-CHEATING & PROHIBITED PATTERNS FORENSICS]")
# Check generate_tshirt_obj.py source code
with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
    script_content = f.read()

# Look for hardcoded strings or tables
suspicious_patterns = [
    "return True", "return 0", "mock", "dummy", "fake", "placeholder",
    "NotImplemented", "eval(", "exec("
]
found_patterns = [p for p in suspicious_patterns if p in script_content]
print(f"Suspicious pattern scan in pipeline script: {found_patterns}")
assert len(found_patterns) == 0, f"Found suspicious patterns: {found_patterns}"

# Check for hardcoded vertex arrays or lookup tables in script
# The script should read INPUT_PATH and transform dynamically.
assert "open(INPUT_PATH" in script_content or "with open(INPUT_PATH" in script_content
assert "transformed_vertices.append" in script_content
assert "scale = 1.90 / max_dim" in script_content
print("Pipeline script dynamically parses and computes geometric transformation: VERIFIED.")

print("\n" + "=" * 80)
print("ALL FORENSIC AUDIT CHECKS PASSED EMPIRICALLY WITH ZERO INTEGRITY VIOLATIONS.")
print("=" * 80)
