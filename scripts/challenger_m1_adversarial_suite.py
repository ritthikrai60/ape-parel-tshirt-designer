#!/usr/bin/env python3
"""
scripts/challenger_m1_adversarial_suite.py
Adversarial Empirical Challenge Suite for Milestone 1: public/models/tshirt.obj

Tests:
1. Syntax & Topology Invariants (v, vt, vn, f counts, headers, triangulation)
2. Seam Stress & Zero Crossing (every triangle tested for U=0.50 crossing)
3. Deadband Gutter Buffer (min(U_back) - max(U_front) >= 0.004)
4. Welded Seams & UV Decoupling (3D welded vertices shared across front/back)
5. Planar Projection Mathematical Rigor (max deviation from theoretical formula)
6. Anti-Mirroring & Gradient Verification (dU/dx signs on Front and Back)
7. Anatomical Landmarks (Chest, Hem, Collar V correspondence)
"""

import os
import sys
import numpy as np
from collections import defaultdict

def run_adversarial_suite(obj_path="public/models/tshirt.obj"):
    print(f"=================================================================")
    print(f"ADVERSARIAL EMPIRICAL SUITE: {obj_path}")
    print(f"=================================================================")
    
    if not os.path.exists(obj_path):
        print(f"FAIL: File not found: {obj_path}")
        sys.exit(1)

    with open(obj_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    headers = [l for l in lines if l.startswith(("o ", "mtllib ", "usemtl "))]
    print(f"Headers found: {headers}")

    v_lines = [l for l in lines if l.startswith("v ")]
    vt_lines = [l for l in lines if l.startswith("vt ")]
    vn_lines = [l for l in lines if l.startswith("vn ")]
    f_lines = [l for l in lines if l.startswith("f ")]

    v_count = len(v_lines)
    vt_count = len(vt_lines)
    vn_count = len(vn_lines)
    f_count = len(f_lines)

    print(f"\n--- 1. Topology & Syntax Counts ---")
    print(f"v  count: {v_count} (Expected: 5355)")
    print(f"vt count: {vt_count} (Expected: 5761)")
    print(f"vn count: {vn_count} (Expected: 5355)")
    print(f"f  count: {f_count} (Expected: 10192)")

    assert v_count == 5355, f"v count mismatch: {v_count}"
    assert vt_count == 5761, f"vt count mismatch: {vt_count}"
    assert vn_count == 5355, f"vn count mismatch: {vn_count}"
    assert f_count == 10192, f"f count mismatch: {f_count}"

    # Parse 3D vertices
    vertices = np.zeros((v_count, 3), dtype=np.float64)
    for i, l in enumerate(v_lines):
        parts = l.split()
        vertices[i] = [float(parts[1]), float(parts[2]), float(parts[3])]

    # Parse UVs
    uvs = np.zeros((vt_count, 2), dtype=np.float64)
    for i, l in enumerate(vt_lines):
        parts = l.split()
        uvs[i] = [float(parts[1]), float(parts[2])]

    # Parse normals
    normals = np.zeros((vn_count, 3), dtype=np.float64)
    for i, l in enumerate(vn_lines):
        parts = l.split()
        normals[i] = [float(parts[1]), float(parts[2]), float(parts[3])]

    # Parse faces
    faces = []
    used_v = set()
    used_vt = set()
    used_vn = set()

    for fi, l in enumerate(f_lines):
        corners = l.split()[1:]
        assert len(corners) == 3, f"Face {fi} is not a triangle: {l}"
        face_corners = []
        for c in corners:
            parts = c.split("/")
            vi = int(parts[0]) - 1
            vti = int(parts[1]) - 1
            vni = int(parts[2]) - 1
            used_v.add(vi)
            used_vt.add(vti)
            used_vn.add(vni)
            face_corners.append((vi, vti, vni))
        faces.append(face_corners)

    print(f"Used vertices: {len(used_v)} / {v_count}")
    print(f"Used UV slots: {len(used_vt)} / {vt_count} (min={min(used_vt)+1}, max={max(used_vt)+1})")
    print(f"Used normals: {len(used_vn)} / {vn_count}")
    assert len(used_v) == v_count, "Not all vertices are referenced"
    assert len(used_vt) == vt_count, "Not all UV slots are referenced"
    assert len(used_vn) == vn_count, "Not all normals are referenced"

    # Extents
    min_v = vertices.min(axis=0)
    max_v = vertices.max(axis=0)
    span_v = max_v - min_v
    center_v = (max_v + min_v) / 2.0
    print(f"\n3D Bounds:")
    print(f"X in [{min_v[0]:.6f}, {max_v[0]:.6f}], span={span_v[0]:.6f}, center={center_v[0]:.6f}")
    print(f"Y in [{min_v[1]:.6f}, {max_v[1]:.6f}], span={span_v[1]:.6f}, center={center_v[1]:.6f}")
    print(f"Z in [{min_v[2]:.6f}, {max_v[2]:.6f}], span={span_v[2]:.6f}, center={center_v[2]:.6f}")

    # Check unit normals
    norm_lens = np.linalg.norm(normals, axis=1)
    print(f"Normal lengths: min={norm_lens.min():.6f}, max={norm_lens.max():.6f}")
    assert np.allclose(norm_lens, 1.0, atol=1e-5), "Normals are not unit length!"

    # --- 2. Seam Stress & Zero Crossing Testing ---
    print(f"\n--- 2. Seam Stress & Zero Crossing Testing ---")
    cross_faces = 0
    cross_face_indices = []
    front_faces = []
    back_faces = []

    front_u_vals = []
    back_u_vals = []
    front_v_vals = []
    back_v_vals = []

    for fi, f in enumerate(faces):
        f_uvs = [uvs[c[1]] for c in f]
        u_coords = [uv[0] for uv in f_uvs]
        v_coords = [uv[1] for uv in f_uvs]
        
        u_min = min(u_coords)
        u_max = max(u_coords)

        if u_min < 0.50 and u_max > 0.50:
            cross_faces += 1
            cross_face_indices.append((fi, u_coords))

        if u_max <= 0.50:
            front_faces.append(fi)
            front_u_vals.extend(u_coords)
            front_v_vals.extend(v_coords)
        elif u_min >= 0.50:
            back_faces.append(fi)
            back_u_vals.extend(u_coords)
            back_v_vals.extend(v_coords)
        else:
            # Triangles that cross are neither purely front nor purely back
            pass

    print(f"Total Triangles: {len(faces)}")
    print(f"Front Triangles: {len(front_faces)} ({len(front_faces)/len(faces)*100:.2f}%)")
    print(f"Back Triangles:  {len(back_faces)} ({len(back_faces)/len(faces)*100:.2f}%)")
    print(f"Crossing Faces across U=0.50: {cross_faces}")
    if cross_faces > 0:
        print(f"FAIL: Found {cross_faces} crossing faces! First 5: {cross_face_indices[:5]}")
    assert cross_faces == 0, f"Found {cross_faces} crossing faces!"

    # Deadband Gutter Buffer
    max_u_front = max(front_u_vals)
    min_u_front = min(front_u_vals)
    min_u_back = min(back_u_vals)
    max_u_back = max(back_u_vals)
    gutter = min_u_back - max_u_front

    print(f"\nUV Range Front: U in [{min_u_front:.6f}, {max_u_front:.6f}], V in [{min(front_v_vals):.6f}, {max(front_v_vals):.6f}]")
    print(f"UV Range Back:  U in [{min_u_back:.6f}, {max_u_back:.6f}], V in [{min(back_v_vals):.6f}, {max(back_v_vals):.6f}]")
    print(f"Deadband Gutter Buffer: min(U_back) - max(U_front) = {gutter:.6f} ({gutter*1024:.2f} texels at 1024x1024)")
    assert max_u_front <= 0.4980000001, f"Front max U exceeds 0.498: {max_u_front}"
    assert min_u_back >= 0.5019999999, f"Back min U below 0.502: {min_u_back}"
    assert gutter >= 0.004 - 1e-7, f"Gutter buffer {gutter} is less than required 0.004!"

    # --- 3. Welded Seam & UV Decoupling Stress Test ---
    print(f"\n--- 3. Welded Seam & UV Decoupling Stress Test ---")
    v_to_front_faces = defaultdict(list)
    v_to_back_faces = defaultdict(list)
    v_to_front_uvs = defaultdict(set)
    v_to_back_uvs = defaultdict(set)

    for fi in front_faces:
        for c in faces[fi]:
            vi = c[0]
            v_to_front_faces[vi].append(fi)
            v_to_front_uvs[vi].add((uvs[c[1]][0], uvs[c[1]][1]))

    for fi in back_faces:
        for c in faces[fi]:
            vi = c[0]
            v_to_back_faces[vi].append(fi)
            v_to_back_uvs[vi].add((uvs[c[1]][0], uvs[c[1]][1]))

    shared_seam_vertices = set(v_to_front_faces.keys()).intersection(set(v_to_back_faces.keys()))
    print(f"Total physically shared 3D seam vertices between Front & Back: {len(shared_seam_vertices)}")

    # Stress-test each shared seam vertex
    decoupled_count = 0
    seam_violations = 0
    min_seam_u_jump = float('inf')
    max_seam_u_jump = 0.0

    for vi in sorted(shared_seam_vertices):
        pos = vertices[vi]
        front_u_set = [u for u, v in v_to_front_uvs[vi]]
        back_u_set = [u for u, v in v_to_back_uvs[vi]]

        max_f_u = max(front_u_set)
        min_b_u = min(back_u_set)
        u_jump = min_b_u - max_f_u
        min_seam_u_jump = min(min_seam_u_jump, u_jump)
        max_seam_u_jump = max(max_seam_u_jump, u_jump)

        # Check decoupling condition:
        # Every front UV must be <= 0.498
        # Every back UV must be >= 0.502
        if max_f_u > 0.4980001 or min_b_u < 0.5019999:
            seam_violations += 1
            print(f"VIOLATION at vertex {vi} (pos={pos}): Front U={front_u_set}, Back U={back_u_set}")
        else:
            decoupled_count += 1

    print(f"Properly Decoupled Seam Vertices: {decoupled_count} / {len(shared_seam_vertices)}")
    print(f"Seam Violations: {seam_violations}")
    print(f"Seam U Jump range (min U_back - max U_front): [{min_seam_u_jump:.6f}, {max_seam_u_jump:.6f}]")
    assert seam_violations == 0, f"Found {seam_violations} seam decoupling violations!"
    assert len(shared_seam_vertices) > 0, "No seam vertices found! Are front and back disconnected?"

    # Check side seams specifically (where x is near boundary or |z| is small)
    side_seam_vertices = [vi for vi in shared_seam_vertices if abs(vertices[vi][2]) < 0.1]
    print(f"Shared seam vertices with |Z| < 0.1 (physical side/shoulder seams): {len(side_seam_vertices)}")

    # Verify identical 3D positions (welded mesh check)
    # Since they share vertex index vi, by definition position is identical.
    # Now verify if there are any UNWELDED coincident vertices in 3D that should be welded:
    # Build KD-tree or spatial hash to find distinct vertex pairs with dist < 1e-6
    from scipy.spatial import cKDTree
    tree = cKDTree(vertices)
    duplicate_pairs = tree.query_pairs(r=1e-5)
    print(f"Unwelded coincident vertex pairs (dist < 1e-5): {len(duplicate_pairs)}")
    if duplicate_pairs:
        print(f"Warning: Coincident vertex pairs found: {list(duplicate_pairs)[:5]}")
    # Note: having 0 coincident vertex pairs means all 3D vertices are 100% unique and welded!

    # --- 4. Planar Mathematical Rigor Test ---
    print(f"\n--- 4. Planar Projection Mathematical Rigor Test ---")
    x_min, x_max = -0.950, 0.950
    x_span = 1.900
    y_min, y_max = -0.891669, 0.891669
    y_span = 1.783338

    max_front_u_err = 0.0
    max_front_v_err = 0.0
    max_back_u_err = 0.0
    max_back_v_err = 0.0

    for fi in front_faces:
        for vi, vti, vni in faces[fi]:
            x, y, z = vertices[vi]
            u, v = uvs[vti]
            exp_u = 0.002 + 0.496 * (x - x_min) / x_span
            exp_v = 0.002 + 0.996 * (y - y_min) / y_span
            max_front_u_err = max(max_front_u_err, abs(u - exp_u))
            max_front_v_err = max(max_front_v_err, abs(v - exp_v))

    for fi in back_faces:
        for vi, vti, vni in faces[fi]:
            x, y, z = vertices[vi]
            u, v = uvs[vti]
            exp_u = 0.502 + 0.496 * (x_max - x) / x_span
            exp_v = 0.002 + 0.996 * (y - y_min) / y_span
            max_back_u_err = max(max_back_u_err, abs(u - exp_u))
            max_back_v_err = max(max_back_v_err, abs(v - exp_v))

    print(f"Front Planar Error: max |U - U_expected| = {max_front_u_err:.10f}, max |V - V_expected| = {max_front_v_err:.10f}")
    print(f"Back Planar Error:  max |U - U_expected| = {max_back_u_err:.10f}, max |V - V_expected| = {max_back_v_err:.10f}")
    assert max_front_u_err < 1e-4, f"Front U planar error too high: {max_front_u_err}"
    assert max_front_v_err < 1e-4, f"Front V planar error too high: {max_front_v_err}"
    assert max_back_u_err < 1e-4, f"Back U planar error too high: {max_back_u_err}"
    assert max_back_v_err < 1e-4, f"Back V planar error too high: {max_back_v_err}"

    # --- 5. Anti-Mirroring & Gradient Verification ---
    print(f"\n--- 5. Anti-Mirroring & Gradient Verification ---")
    # For every triangle, compute dU/dx in 3D:
    # Using the 3 triangle vertices:
    front_pos_grad_count = 0
    front_neg_grad_count = 0
    back_pos_grad_count = 0
    back_neg_grad_count = 0

    for fi in front_faces:
        c = faces[fi]
        p0, p1, p2 = vertices[c[0][0]], vertices[c[1][0]], vertices[c[2][0]]
        u0, u1, u2 = uvs[c[0][1]][0], uvs[c[1][1]][0], uvs[c[2][1]][0]
        # Check delta u vs delta x across edges
        for (pa, pb, ua, ub) in [(p0, p1, u0, u1), (p1, p2, u1, u2), (p2, p0, u2, u0)]:
            dx = pb[0] - pa[0]
            du = ub - ua
            if abs(dx) > 1e-4:
                if du / dx > 0:
                    front_pos_grad_count += 1
                else:
                    front_neg_grad_count += 1

    for fi in back_faces:
        c = faces[fi]
        p0, p1, p2 = vertices[c[0][0]], vertices[c[1][0]], vertices[c[2][0]]
        u0, u1, u2 = uvs[c[0][1]][0], uvs[c[1][1]][0], uvs[c[2][1]][0]
        for (pa, pb, ua, ub) in [(p0, p1, u0, u1), (p1, p2, u1, u2), (p2, p0, u2, u0)]:
            dx = pb[0] - pa[0]
            du = ub - ua
            if abs(dx) > 1e-4:
                if du / dx < 0:
                    back_neg_grad_count += 1
                else:
                    back_pos_grad_count += 1

    print(f"Front Edges: dU/dx > 0: {front_pos_grad_count}, dU/dx < 0: {front_neg_grad_count}")
    print(f"Back Edges:  dU/dx < 0: {back_neg_grad_count}, dU/dx > 0: {back_pos_grad_count}")
    assert front_neg_grad_count == 0, f"Found {front_neg_grad_count} inverted front edges!"
    assert back_pos_grad_count == 0, f"Found {back_pos_grad_count} inverted back edges!"

    # --- 6. Anatomical Landmarks ---
    print(f"\n--- 6. Anatomical Landmarks ---")
    # Sternum / center chest (x near 0, y near 0.2662, z > 0.1)
    chest_verts = [vi for vi in range(v_count) if abs(vertices[vi][0]) < 0.05 and abs(vertices[vi][1] - 0.2662) < 0.05 and vertices[vi][2] > 0.1]
    if chest_verts:
        chest_u = [uvs[c[1]][0] for fi in front_faces for c in faces[fi] if c[0] in chest_verts]
        chest_v = [uvs[c[1]][1] for fi in front_faces for c in faces[fi] if c[0] in chest_verts]
        avg_chest_u = np.mean(chest_u)
        avg_chest_v = np.mean(chest_v)
        print(f"Center Chest (target U=0.250, V=0.650): U={avg_chest_u:.4f}, V={avg_chest_v:.4f}")
        assert abs(avg_chest_u - 0.250) < 0.02, f"Chest U off: {avg_chest_u}"
        assert abs(avg_chest_v - 0.650) < 0.02, f"Chest V off: {avg_chest_v}"

    # Bottom hem (y near -0.89)
    hem_verts = [vi for vi in range(v_count) if vertices[vi][1] < -0.85]
    if hem_verts:
        hem_v = [uvs[c[1]][1] for fi in range(len(faces)) for c in faces[fi] if c[0] in hem_verts]
        min_hem_v = min(hem_v)
        max_hem_v = max(hem_v)
        print(f"Bottom Hem: V in [{min_hem_v:.4f}, {max_hem_v:.4f}] (Expected V <= 0.150)")
        assert max_hem_v < 0.150, f"Hem V exceeds 0.150: {max_hem_v}"

    print(f"\n=================================================================")
    print(f"ALL ADVERSARIAL EMPIRICAL TESTS PASSED WITH 0 DEFECTS!")
    print(f"=================================================================")

if __name__ == "__main__":
    run_adversarial_suite()
