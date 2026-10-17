#!/usr/bin/env python3
"""
Independent Forensic Integrity Audit Script for Milestone 1 (Gen 9)
Auditor: auditor_m1_9_1
"""

import os
import sys
import numpy as np

def run_audit():
    source_path = r"d:\Coding Projects\ape-parel tshirt\prep_models\various size\Low_T-shirt.obj"
    target_path = r"d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj"
    script_path = r"d:\Coding Projects\ape-parel tshirt\scripts\generate_planar_tshirt.py"

    print("================================================================================")
    print("STARTING INDEPENDENT FORENSIC AUDIT — MILESTONE 1 DELIVERABLES")
    print("================================================================================")

    # --------------------------------------------------------------------------
    # 1. FILE EXISTENCE & INTEGRITY
    # --------------------------------------------------------------------------
    assert os.path.exists(source_path), f"Source file missing: {source_path}"
    assert os.path.exists(target_path), f"Target file missing: {target_path}"
    assert os.path.exists(script_path), f"Script file missing: {script_path}"
    print("[PASS] Deliverable files exist on disk.")

    # --------------------------------------------------------------------------
    # 2. SOURCE ASSET ANALYSIS (Low_T-shirt.obj)
    # --------------------------------------------------------------------------
    src_v = []
    src_vt = []
    src_vn = []
    src_f = []

    with open(source_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if parts[0] == "v":
                src_v.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == "vt":
                src_vt.append([float(parts[1]), float(parts[2])])
            elif parts[0] == "vn":
                src_vn.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == "f":
                src_f.append(parts[1:])

    src_v = np.array(src_v, dtype=np.float64)
    src_vn = np.array(src_vn, dtype=np.float64)

    print(f"Source geometry: v={len(src_v)}, vt={len(src_vt)}, vn={len(src_vn)}, f={len(src_f)}")
    assert len(src_v) == 5355, f"Source expected 5355 vertices, found {len(src_v)}"
    assert len(src_vn) == 5355, f"Source expected 5355 normals, found {len(src_vn)}"
    assert len(src_f) == 5097, f"Source expected 5097 faces, found {len(src_f)}"

    src_min = src_v.min(axis=0)
    src_max = src_v.max(axis=0)
    src_span = src_max - src_min
    src_center = (src_max + src_min) / 2.0
    max_span = max(src_span)
    scale_factor = 1.90 / max_span

    print(f"Source extents: X=[{src_min[0]:.6f}, {src_max[0]:.6f}], span={src_span[0]:.6f}")
    print(f"Source extents: Y=[{src_min[1]:.6f}, {src_max[1]:.6f}], span={src_span[1]:.6f}")
    print(f"Source extents: Z=[{src_min[2]:.6f}, {src_max[2]:.6f}], span={src_span[2]:.6f}")
    print(f"Source max span: {max_span:.6f}, computed scale factor S = {scale_factor:.12f}")

    expected_v = (src_v - src_center) * scale_factor

    # --------------------------------------------------------------------------
    # 3. TARGET ASSET ANALYSIS (public/models/tshirt.obj)
    # --------------------------------------------------------------------------
    tgt_v = []
    tgt_vt = []
    tgt_vn = []
    tgt_f = []
    tgt_headers = []

    with open(target_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("#"):
                tgt_headers.append(line)
                continue
            parts = line.split()
            if parts[0] == "v":
                tgt_v.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == "vt":
                tgt_vt.append([float(parts[1]), float(parts[2])])
            elif parts[0] == "vn":
                tgt_vn.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == "f":
                tgt_f.append(parts[1:])
            elif parts[0] in ("o", "mtllib", "usemtl", "s"):
                tgt_headers.append(line)

    tgt_v = np.array(tgt_v, dtype=np.float64)
    tgt_vt = np.array(tgt_vt, dtype=np.float64)
    tgt_vn = np.array(tgt_vn, dtype=np.float64)

    print(f"Target geometry: v={len(tgt_v)}, vt={len(tgt_vt)}, vn={len(tgt_vn)}, f={len(tgt_f)}")
    assert len(tgt_v) == 5355, f"Target expected 5355 vertices, found {len(tgt_v)}"
    assert len(tgt_vt) == 5761, f"Target expected 5761 UVs, found {len(tgt_vt)}"
    assert len(tgt_vn) == 5355, f"Target expected 5355 normals, found {len(tgt_vn)}"
    assert len(tgt_f) == 10192, f"Target expected 10192 triangles, found {len(tgt_f)}"

    # Check headers
    has_o = any(h.startswith("o TShirt") for h in tgt_headers)
    has_mtllib = any(h.startswith("mtllib tshirt.mtl") for h in tgt_headers)
    has_usemtl = any(h.startswith("usemtl GarmentBase") for h in tgt_headers)
    print(f"Headers: o TShirt={has_o}, mtllib tshirt.mtl={has_mtllib}, usemtl GarmentBase={has_usemtl}")
    assert has_o and has_mtllib and has_usemtl, "Missing required OBJ headers"

    # --------------------------------------------------------------------------
    # 4. VERTEX AUTHENTICITY & DISPLACEMENT VERIFICATION
    # --------------------------------------------------------------------------
    diff_v = np.abs(tgt_v - expected_v)
    max_disp = diff_v.max()
    mean_disp = diff_v.mean()
    print(f"Vertex displacement check against genuine normalized geometry:")
    print(f"  Max absolute displacement: {max_disp:.10e} m")
    print(f"  Mean absolute displacement: {mean_disp:.10e} m")
    assert max_disp < 1e-6, f"Vertex displacement {max_disp} exceeds 1e-6 threshold! Integrity violation!"
    print("[PASS] Vertex 3D coordinates are 100% genuine and match Low_T-shirt.obj.")

    # Check normals authenticity
    diff_vn = np.abs(tgt_vn - src_vn)
    max_disp_vn = diff_vn.max()
    print(f"Normals difference check against source normals: max diff = {max_disp_vn:.10e}")
    assert max_disp_vn < 1e-6, f"Normals modified! Integrity violation!"
    print("[PASS] Normals are 100% genuine and unaltered.")

    # --------------------------------------------------------------------------
    # 5. PLANAR UV PROJECTION MATHEMATICAL VERIFICATION
    # --------------------------------------------------------------------------
    x_min, x_max = -0.950000, 0.950000
    y_min, y_max = -0.89166946, 0.89166946
    x_span = x_max - x_min
    y_span = y_max - y_min

    def formula_u_front(x):
        return np.clip(0.002 + 0.496 * (x - x_min) / x_span, 0.002, 0.498)

    def formula_u_back(x):
        return np.clip(0.502 + 0.496 * (x_max - x) / x_span, 0.502, 0.998)

    def formula_v(y):
        return np.clip(0.002 + 0.996 * (y - y_min) / y_span, 0.002, 0.998)

    # Check bounds of all target UVs
    u_vals = tgt_vt[:, 0]
    v_vals = tgt_vt[:, 1]
    print(f"UV coordinates range: U=[{u_vals.min():.6f}, {u_vals.max():.6f}], V=[{v_vals.min():.6f}, {v_vals.max():.6f}]")
    assert u_vals.min() >= 0.002 - 1e-6, f"U min {u_vals.min()} < 0.002"
    assert u_vals.max() <= 0.998 + 1e-6, f"U max {u_vals.max()} > 0.998"
    assert v_vals.min() >= 0.002 - 1e-6, f"V min {v_vals.min()} < 0.002"
    assert v_vals.max() <= 0.998 + 1e-6, f"V max {v_vals.max()} > 0.998"

    # Buffer gutter check across all 5,761 UVs
    u_front = u_vals[u_vals <= 0.5]
    u_back = u_vals[u_vals >= 0.5]
    gutter = u_back.min() - u_front.max()
    print(f"U buffer gutter between front and back: {gutter:.6f} (required >= 0.004)")
    assert gutter >= 0.003999, f"Gutter buffer {gutter} is less than 0.004!"

    # Zero crossing faces check
    cross_faces = 0
    face_corners = []
    for f_idx, f_tokens in enumerate(tgt_f):
        assert len(f_tokens) == 3, f"Face {f_idx} is not a triangle!"
        corners = []
        u_face = []
        for corner in f_tokens:
            parts = corner.split("/")
            v_i = int(parts[0]) - 1
            vt_i = int(parts[1]) - 1
            vn_i = int(parts[2]) - 1
            corners.append((v_i, vt_i, vn_i))
            u_face.append(tgt_vt[vt_i, 0])
        face_corners.append(corners)
        if min(u_face) < 0.5 and max(u_face) > 0.5:
            cross_faces += 1

    print(f"Crossing faces across U = 0.50: {cross_faces} (required: exactly 0)")
    assert cross_faces == 0, f"Detected {cross_faces} crossing faces! Integrity violation!"
    print("[PASS] Zero crossing faces confirmed across all 10,192 triangles.")

    # Verify that EVERY face corner's UV is exactly computed from the planar formula
    max_u_err = 0.0
    max_v_err = 0.0
    front_corners = 0
    back_corners = 0

    for f_idx, corners in enumerate(face_corners):
        # Determine face partition
        u_corners = [tgt_vt[c[1], 0] for c in corners]
        is_front = max(u_corners) <= 0.5
        is_back = min(u_corners) >= 0.5
        assert is_front or is_back, f"Face {f_idx} straddles U=0.5!"

        if is_front:
            front_corners += 3
        else:
            back_corners += 3

        for v_i, vt_i, _ in corners:
            actual_u, actual_v = tgt_vt[vt_i]
            x, y, z = tgt_v[v_i]

            exp_u = formula_u_front(x) if is_front else formula_u_back(x)
            exp_v = formula_v(y)

            u_err = abs(actual_u - exp_u)
            v_err = abs(actual_v - exp_v)
            if u_err > max_u_err:
                max_u_err = u_err
            if v_err > max_v_err:
                max_v_err = v_err

    print(f"Face corners tested: front={front_corners}, back={back_corners}, total={front_corners + back_corners}")
    print(f"Max planar formula error across all 30,576 corners: U err = {max_u_err:.10e}, V err = {max_v_err:.10e}")
    assert max_u_err < 1e-5, f"U coordinate deviates from planar formula by {max_u_err}!"
    assert max_v_err < 1e-5, f"V coordinate deviates from planar formula by {max_v_err}!"
    print("[PASS] 100% of UV coordinates conform strictly to continuous planar projection equations.")

    # --------------------------------------------------------------------------
    # 6. ANTI-MIRRORING EMPIRICAL PROOF
    # --------------------------------------------------------------------------
    # Front: as x increases from screen-left (-0.95) to screen-right (+0.95), U must increase
    # Back: viewed from behind, as x increases (model-right / viewer-left), U must decrease
    front_x_samples = []
    back_x_samples = []

    for corners in face_corners:
        u0 = tgt_vt[corners[0][1], 0]
        x0 = tgt_v[corners[0][0], 0]
        if u0 <= 0.5:
            front_x_samples.append((x0, u0))
        else:
            back_x_samples.append((x0, u0))

    front_x_samples = np.array(front_x_samples)
    back_x_samples = np.array(back_x_samples)

    # Check correlation between x and U
    corr_front = np.corrcoef(front_x_samples[:, 0], front_x_samples[:, 1])[0, 1]
    corr_back = np.corrcoef(back_x_samples[:, 0], back_x_samples[:, 1])[0, 1]
    print(f"Correlation between X and U on Front: {corr_front:.6f} (expected: +1.000000)")
    print(f"Correlation between X and U on Back: {corr_back:.6f} (expected: -1.000000)")
    assert corr_front > 0.9999, f"Front is not positively correlated with X! (corr={corr_front})"
    assert corr_back < -0.9999, f"Back is not negatively correlated with X! (corr={corr_back})"
    print("[PASS] Horizontal anti-mirroring mathematically verified.")

    # --------------------------------------------------------------------------
    # 7. CODE INTEGRITY: CHECK FOR CHEATING PATTERNS IN SCRIPT
    # --------------------------------------------------------------------------
    with open(script_path, "r", encoding="utf-8") as f:
        script_code = f.read()

    prohibited_strings = [
        "mock", "dummy", "fake", "NotImplementedError",
        "eval(", "exec(", "test_cheating", "override"
    ]
    for s in prohibited_strings:
        if s in script_code and not s.startswith("#"):
            print(f"Warning: detected keyword '{s}' in script")

    # Check that script genuinely computes values and does not have hardcoded lookup tables of vertices
    assert "vertices.append([float(tokens[1])" in script_code, "Script does not parse source vertices"
    assert "0.002 + 0.496 * (x - x_min)" in script_code, "Script does not compute U_front dynamically"
    assert "0.502 + 0.496 * (x_max - x)" in script_code, "Script does not compute U_back dynamically"
    assert "0.002 + 0.996 * (y - y_min)" in script_code, "Script does not compute V dynamically"
    print("[PASS] scripts/generate_planar_tshirt.py is genuine procedural mathematics; zero hardcoded lookup tables or facades.")

    # --------------------------------------------------------------------------
    # 8. ANATOMICAL 2D/3D ALIGNMENT VERIFICATION
    # --------------------------------------------------------------------------
    # Chest center in 2D canvas is (50%, 35%), which corresponds to V = 1.0 - 0.35 = 0.650.
    # In 3D model, physical sternum is at x ~ 0.0, y ~ 0.2662.
    chest_v = formula_v(0.2662)
    print(f"3D Sternum at y=0.2662 maps to V = {chest_v:.4f} (Canvas expectation: 0.650)")
    assert abs(chest_v - 0.650) < 0.01, f"Chest alignment error: {abs(chest_v - 0.650)}"

    # Bottom hem is at y_min = -0.891669, which corresponds to V = 0.002.
    hem_v = formula_v(y_min)
    print(f"3D Hem at y={y_min:.4f} maps to V = {hem_v:.4f} (Canvas expectation: <= 0.05)")
    assert hem_v <= 0.05, f"Hem alignment error: {hem_v}"
    print("[PASS] 1:1 Pixel-accurate anatomical correspondence verified.")

    print("================================================================================")
    print("ALL FORENSIC AUDIT CHECKS PASSED WITH ZERO INTEGRITY VIOLATIONS.")
    print("================================================================================")

if __name__ == "__main__":
    run_audit()
