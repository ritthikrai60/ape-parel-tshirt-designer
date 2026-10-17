#!/usr/bin/env python3
"""
verify_obj_geometry.py
Independent Empirical Verification of public/models/tshirt.obj
Executed by victory_auditor_4
"""

import os
import sys
import numpy as np

def verify():
    base_dir = os.path.abspath("d:/Coding Projects/ape-parel tshirt")
    target_path = os.path.join(base_dir, "public/models/tshirt.obj")
    source_path = os.path.join(base_dir, "prep_models/various size/Low_T-shirt.obj")

    print(f"=== INDEPENDENT GEOMETRIC & TOPOLOGICAL VERIFICATION ===")
    print(f"Target OBJ: {target_path}")
    print(f"Source OBJ: {source_path}")

    # Check files exist
    assert os.path.exists(target_path), f"Missing {target_path}"
    assert os.path.exists(source_path), f"Missing {source_path}"

    # 1. Parse target OBJ
    vertices = []
    uvs = []
    normals = []
    faces = []
    headers = []

    with open(target_path, "r", encoding="utf-8") as f:
        for line in f:
            line_str = line.strip()
            if not line_str:
                continue
            if line_str.startswith("#") or line_str.startswith("o ") or line_str.startswith("mtllib") or line_str.startswith("usemtl") or line_str.startswith("s "):
                headers.append(line_str)
                continue
            tokens = line_str.split()
            tag = tokens[0]
            if tag == "v":
                vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
            elif tag == "vt":
                uvs.append([float(tokens[1]), float(tokens[2])])
            elif tag == "vn":
                normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
            elif tag == "f":
                corners = []
                for corner in tokens[1:]:
                    parts = corner.split("/")
                    v_idx = int(parts[0]) - 1
                    vt_idx = int(parts[1]) - 1
                    vn_idx = int(parts[2]) - 1
                    corners.append((v_idx, vt_idx, vn_idx))
                faces.append(corners)

    v_arr = np.array(vertices, dtype=np.float64)
    uv_arr = np.array(uvs, dtype=np.float64)
    vn_arr = np.array(normals, dtype=np.float64)

    print(f"\n1. TOPOLOGY & SYNTAX:")
    print(f"   Vertices (v):  {len(vertices)} (expected 5,355)")
    print(f"   UVs (vt):       {len(uvs)} (expected 5,761)")
    print(f"   Normals (vn):   {len(normals)} (expected 5,355)")
    print(f"   Faces (f):      {len(faces)} (expected 10,192)")

    assert len(vertices) == 5355, f"Expected 5,355 vertices, got {len(vertices)}"
    assert len(uvs) == 5761, f"Expected 5,761 UVs, got {len(uvs)}"
    assert len(normals) == 5355, f"Expected 5,355 normals, got {len(normals)}"
    assert len(faces) == 10192, f"Expected 10,192 faces, got {len(faces)}"

    # Check headers
    header_str = "\n".join(headers)
    assert "mtllib tshirt.mtl" in header_str, "Missing mtllib tshirt.mtl"
    assert "o TShirt" in header_str, "Missing o TShirt"
    assert "usemtl GarmentBase" in header_str, "Missing usemtl GarmentBase"
    print("   Headers: mtllib tshirt.mtl, o TShirt, usemtl GarmentBase verified.")

    # Check face arity (strictly triangles)
    assert all(len(f) == 3 for f in faces), "Not all faces are triangles!"
    print("   Face Arity: 100% triangles (all 10,192 faces have length 3).")

    # Check finite floats
    assert np.all(np.isfinite(v_arr)), "Non-finite vertex coordinates found!"
    assert np.all(np.isfinite(uv_arr)), "Non-finite UV coordinates found!"
    assert np.all(np.isfinite(vn_arr)), "Non-finite normal coordinates found!"
    print("   Finite floats: 0 NaN, 0 Inf across all arrays.")

    # 2. SOURCE PROVENANCE COMPARISON
    src_v = []
    with open(source_path, "r", encoding="utf-8") as f:
        for line in f:
            tokens = line.strip().split()
            if tokens and tokens[0] == "v":
                src_v.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
    src_v_arr = np.array(src_v, dtype=np.float64)

    assert len(src_v) == 5355, f"Source has {len(src_v)} vertices, expected 5,355"

    src_min = src_v_arr.min(axis=0)
    src_max = src_v_arr.max(axis=0)
    src_center = (src_max + src_min) / 2.0
    src_span = src_max - src_min
    expected_scale = 1.90 / max(src_span)
    reconstructed_v = (src_v_arr - src_center) * expected_scale

    delta = np.abs(v_arr - reconstructed_v)
    max_delta = delta.max()
    mean_delta = delta.mean()
    print(f"\n2. PROVENANCE & GEOMETRIC FIDELITY:")
    print(f"   Source Extents (mm): X=[{src_min[0]:.2f}, {src_max[0]:.2f}], Y=[{src_min[1]:.2f}, {src_max[1]:.2f}], Z=[{src_min[2]:.2f}, {src_max[2]:.2f}]")
    print(f"   Target Extents (m):  X=[{v_arr[:,0].min():.6f}, {v_arr[:,0].max():.6f}], Y=[{v_arr[:,1].min():.6f}, {v_arr[:,1].max():.6f}], Z=[{v_arr[:,2].min():.6f}, {v_arr[:,2].max():.6f}]")
    print(f"   Scale Factor:        {expected_scale:.6f}")
    print(f"   Mean Delta to Raw:   {mean_delta:.10f} m (< 1e-6 m)")
    print(f"   Max Delta to Raw:    {max_delta:.10f} m (< 1e-5 m)")
    assert max_delta < 1e-5, f"Excessive delta between source and target geometry: {max_delta}"

    # 3. 50/50 UV PARTITION & ZERO CROSSING INVARIANT
    print(f"\n3. UV PARTITION & CROSSING FACE ANALYSIS:")
    cross_faces = 0
    front_triangles = 0
    back_triangles = 0
    front_u_vals = []
    back_u_vals = []
    front_v_vals = []
    back_v_vals = []

    for fi, f in enumerate(faces):
        face_u = [uv_arr[corner[1], 0] for corner in f]
        face_v = [uv_arr[corner[1], 1] for corner in f]

        has_front = any(u < 0.50 for u in face_u)
        has_back = any(u >= 0.50 for u in face_u)

        if has_front and has_back:
            cross_faces += 1

        if all(u < 0.50 for u in face_u):
            front_triangles += 1
            front_u_vals.extend(face_u)
            front_v_vals.extend(face_v)
        elif all(u >= 0.50 for u in face_u):
            back_triangles += 1
            back_u_vals.extend(face_u)
            back_v_vals.extend(face_v)
        else:
            pass

    front_u_min = min(front_u_vals)
    front_u_max = max(front_u_vals)
    back_u_min = min(back_u_vals)
    back_u_max = max(back_u_vals)
    gutter = back_u_min - front_u_max

    print(f"   Total Triangles:    {len(faces)}")
    print(f"   Front Triangles:    {front_triangles} ({front_triangles/len(faces)*100:.2f}%)")
    print(f"   Back Triangles:     {back_triangles} ({back_triangles/len(faces)*100:.2f}%)")
    print(f"   Crossing Faces:     {cross_faces} (STRICTLY REQUIRE 0)")
    print(f"   Front U Range:      [{front_u_min:.6f}, {front_u_max:.6f}] (<= 0.50)")
    print(f"   Back U Range:       [{back_u_min:.6f}, {back_u_max:.6f}] (>= 0.50)")
    print(f"   Buffer Gutter:      {gutter:.6f} (>= 0.004)")

    assert cross_faces == 0, f"VIOLATION: Detected {cross_faces} crossing faces across U = 0.50!"
    assert front_u_max <= 0.498, f"VIOLATION: Front max U ({front_u_max}) exceeds 0.498!"
    assert back_u_min >= 0.502, f"VIOLATION: Back min U ({back_u_min}) is below 0.502!"
    assert gutter >= 0.004, f"VIOLATION: Buffer gutter ({gutter}) is less than 0.004!"

    # 4. ANTI-MIRRORING VERIFICATION
    print(f"\n4. HORIZONTAL ORIENTATION & ANTI-MIRRORING:")
    # Collect front and back torso samples
    front_samples = []
    back_samples = []

    for f in faces:
        for corner in f:
            v_idx, vt_idx, _ = corner
            x, y, z = v_arr[v_idx]
            u, v = uv_arr[vt_idx]
            # Torso region: y between -0.4 and 0.4
            if -0.4 < y < 0.4:
                if z > 0.1 and u < 0.5:
                    front_samples.append((x, u))
                elif z < -0.1 and u >= 0.5:
                    back_samples.append((x, u))

    front_samples = np.array(front_samples)
    back_samples = np.array(back_samples)

    # Linear regression dU/dx
    front_slope = np.polyfit(front_samples[:, 0], front_samples[:, 1], 1)[0]
    back_slope = np.polyfit(back_samples[:, 0], back_samples[:, 1], 1)[0]

    print(f"   Front Torso dU/dx:  {front_slope:+.6f} (STRICTLY > 0 for unmirrored front)")
    print(f"   Back Torso dU/dx:   {back_slope:+.6f} (STRICTLY < 0 for unmirrored back)")

    assert front_slope > 0, f"VIOLATION: Front dU/dx is {front_slope} (must be > 0)"
    assert back_slope < 0, f"VIOLATION: Back dU/dx is {back_slope} (must be < 0)"

    # 5. VERTICAL MAPPING (HEM TO COLLAR)
    print(f"\n5. VERTICAL MAPPING & ELEVATION CORRELATION:")
    all_y = v_arr[:, 1]
    y_min, y_max = all_y.min(), all_y.max()
    v_min, v_max = uv_arr[:, 1].min(), uv_arr[:, 1].max()

    # Correlation between y and v
    sample_y = []
    sample_v = []
    for f in faces:
        for corner in f:
            v_idx, vt_idx, _ = corner
            sample_y.append(v_arr[v_idx, 1])
            sample_v.append(uv_arr[vt_idx, 1])

    y_v_corr = np.corrcoef(sample_y, sample_v)[0, 1]
    print(f"   Height Span (Y):    [{y_min:.6f}, {y_max:.6f}] m")
    print(f"   V-Coordinate Span:  [{v_min:.6f}, {v_max:.6f}]")
    print(f"   Y vs V Correlation: {y_v_corr:+.6f} (STRICTLY > 0.99)")
    assert y_v_corr > 0.99, f"VIOLATION: Y vs V correlation is {y_v_corr} (must be > 0.99)"

    # 6. ANATOMICAL 1:1 ALIGNMENT
    print(f"\n6. ANATOMICAL 1:1 ALIGNMENT VERIFICATION:")
    # 6.1 Chest (Sternum): 2D preset (50%, 35%) -> Baked (U=0.250, V=0.650)
    sternum_hits = []
    for f in faces:
        for corner in f:
            v_idx, vt_idx, _ = corner
            x, y, z = v_arr[v_idx]
            u, v = uv_arr[vt_idx]
            if abs(u - 0.250) < 0.02 and abs(v - 0.650) < 0.02 and z > 0:
                sternum_hits.append((x, y, z, u, v))

    sternum_hits = np.array(sternum_hits)
    mean_sternum_x = sternum_hits[:, 0].mean()
    mean_sternum_y = sternum_hits[:, 1].mean()
    mean_sternum_z = sternum_hits[:, 2].mean()
    mean_sternum_u = sternum_hits[:, 3].mean()
    mean_sternum_v = sternum_hits[:, 4].mean()

    print(f"   Chest Preset (U=0.250, V=0.650):")
    print(f"     Mean 3D Physical Position: X={mean_sternum_x:+.4f} m, Y={mean_sternum_y:+.4f} m, Z={mean_sternum_z:+.4f} m")
    print(f"     Mean UV: U={mean_sternum_u:.4f}, V={mean_sternum_v:.4f}")
    assert abs(mean_sternum_x) < 0.05, f"Sternum X off-center: {mean_sternum_x}"
    assert 0.20 < mean_sternum_y < 0.35, f"Sternum Y not on upper chest: {mean_sternum_y}"
    assert mean_sternum_z > 0.15, f"Sternum Z not on anterior front: {mean_sternum_z}"
    print("     Chest placement anatomically validated on anterior sternum.")

    # 6.2 Bottom Hem: 2D preset (50%, 87%) -> Baked (U=0.250, V=0.130)
    hem_vertices = []
    for f in faces:
        for corner in f:
            v_idx, vt_idx, _ = corner
            y = v_arr[v_idx, 1]
            v = uv_arr[vt_idx, 1]
            if y < -0.80: # bottom 10 cm of shirt
                hem_vertices.append(v)

    hem_vertices = np.array(hem_vertices)
    max_hem_v = hem_vertices.max()
    mean_hem_v = hem_vertices.mean()
    print(f"   Bottom Hem (Y < -0.80 m):")
    print(f"     Total Hem Sample Count: {len(hem_vertices)}")
    print(f"     Mean Hem V:             {mean_hem_v:.4f}")
    print(f"     Max Hem V:              {max_hem_v:.4f} (STRICTLY <= 0.150)")
    assert max_hem_v <= 0.150, f"VIOLATION: Bottom hem V ({max_hem_v}) exceeds 0.150!"
    print("     Bottom hem placement validated at base of garment.")

    # 6.3 Sleeves: lateral geometry |X| > 0.50
    front_sleeve_uv = []
    back_sleeve_uv = []
    for f in faces:
        pts = [v_arr[corner[0]] for corner in f]
        centroid_x = sum(p[0] for p in pts) / 3.0
        if abs(centroid_x) > 0.50: # sleeve region
            # Compute face normal z
            p0, p1, p2 = pts
            fn = np.cross(p1 - p0, p2 - p0)
            for corner in f:
                u, v = uv_arr[corner[1]]
                if fn[2] >= 0:
                    front_sleeve_uv.append((u, v))
                else:
                    back_sleeve_uv.append((u, v))

    front_sleeve_uv = np.array(front_sleeve_uv)
    back_sleeve_uv = np.array(back_sleeve_uv)
    max_front_sleeve_u = front_sleeve_uv[:, 0].max()
    min_back_sleeve_u = back_sleeve_uv[:, 0].min()

    print(f"   Sleeves (|X| > 0.50 m):")
    print(f"     Front Sleeve Samples: {len(front_sleeve_uv)}, Max U: {max_front_sleeve_u:.6f} (<= 0.498)")
    print(f"     Back Sleeve Samples:  {len(back_sleeve_uv)}, Min U:  {min_back_sleeve_u:.6f} (>= 0.502)")
    assert max_front_sleeve_u <= 0.498, f"VIOLATION: Front sleeve U ({max_front_sleeve_u}) exceeds 0.498!"
    assert min_back_sleeve_u >= 0.502, f"VIOLATION: Back sleeve U ({min_back_sleeve_u}) is below 0.502!"
    print("     Sleeve partitioning validated with zero cross-seam bleed.")

    # 7. THREE.JS VIEWER INTEGRATION & FLOOR CLEARANCE
    print(f"\n7. THREE.JS STUDIO INTEGRATION & FLOOR CLEARANCE:")
    box_min = v_arr.min(axis=0)
    box_max = v_arr.max(axis=0)
    box_size = box_max - box_min
    box_center = (box_max + box_min) / 2.0
    max_dim = max(box_size)
    scale_factor = 1.90 / max_dim

    transformed_min_y = box_min[1] # since pre-centered at origin, scale is ~1.0
    shadow_floor_y = -1.10
    clearance = transformed_min_y - shadow_floor_y

    print(f"   Model Max Dimension:   {max_dim:.4f} m")
    print(f"   Studio Scale:          {scale_factor:.4f}")
    print(f"   Garment Lowest Y:      {transformed_min_y:.4f} m")
    print(f"   Shadow Floor Plane Y:  {shadow_floor_y:.4f} m")
    print(f"   Clearance above Floor: {clearance:.4f} m (> 0.20 m required)")
    assert clearance > 0.20, f"VIOLATION: Floor clearance {clearance:.4f} m <= 0.20 m!"
    print("   Studio floor clearance verified (> 20 cm).")

    print(f"\n=== ALL EMPIRICAL GEOMETRIC AUDIT CHECKS PASSED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    verify()
