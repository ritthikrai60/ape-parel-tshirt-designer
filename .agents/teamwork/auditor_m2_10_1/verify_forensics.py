import os
import sys
import numpy as np
from collections import defaultdict

def run_forensic_audit():
    raw_path = r"d:\Coding Projects\ape-parel tshirt\prep_models\various size\Low_T-shirt.obj"
    target_path = r"d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj"

    print("=== FORENSIC INTEGRITY AUDIT ===")
    print(f"Source OBJ: {raw_path}")
    print(f"Target OBJ: {target_path}")

    # 1. Parse Source OBJ
    raw_v = []
    raw_vt = []
    raw_vn = []
    raw_f = []

    with open(raw_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split()
            if parts[0] == 'v':
                raw_v.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == 'vt':
                raw_vt.append([float(parts[1]), float(parts[2])])
            elif parts[0] == 'vn':
                raw_vn.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == 'f':
                corners = []
                for p in parts[1:]:
                    toks = p.split('/')
                    v_idx = int(toks[0]) - 1
                    vt_idx = int(toks[1]) - 1 if len(toks) > 1 and toks[1] else -1
                    vn_idx = int(toks[2]) - 1 if len(toks) > 2 and toks[2] else -1
                    corners.append((v_idx, vt_idx, vn_idx))
                raw_f.append(corners)

    raw_v = np.array(raw_v, dtype=np.float64)
    raw_vn = np.array(raw_vn, dtype=np.float64)

    print(f"\n[Source Model Metrics]")
    print(f"- Vertices: {len(raw_v)}")
    print(f"- Texture Coordinates: {len(raw_vt)}")
    print(f"- Normals: {len(raw_vn)}")
    print(f"- Faces: {len(raw_f)}")
    quad_count = sum(1 for f in raw_f if len(f) == 4)
    tri_count = sum(1 for f in raw_f if len(f) == 3)
    other_count = sum(1 for f in raw_f if len(f) not in (3, 4))
    print(f"- Quads: {quad_count}, Tris: {tri_count}, Other: {other_count}")
    expected_triangles = quad_count * 2 + tri_count
    print(f"- Expected Triangulated Triangles: {expected_triangles}")

    # 2. Parse Target OBJ
    tgt_v = []
    tgt_vt = []
    tgt_vn = []
    tgt_f = []
    headers = []

    with open(target_path, 'r', encoding='utf-8') as f:
        for line in f:
            trimmed = line.strip()
            if trimmed.startswith('#') or trimmed.startswith('o ') or trimmed.startswith('mtllib ') or trimmed.startswith('usemtl ') or trimmed.startswith('s '):
                headers.append(trimmed)
            if not trimmed or trimmed.startswith('#'):
                continue
            parts = trimmed.split()
            if parts[0] == 'v':
                tgt_v.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == 'vt':
                tgt_vt.append([float(parts[1]), float(parts[2])])
            elif parts[0] == 'vn':
                tgt_vn.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif parts[0] == 'f':
                corners = []
                for p in parts[1:]:
                    toks = p.split('/')
                    v_idx = int(toks[0]) - 1
                    vt_idx = int(toks[1]) - 1 if len(toks) > 1 and toks[1] else -1
                    vn_idx = int(toks[2]) - 1 if len(toks) > 2 and toks[2] else -1
                    corners.append((v_idx, vt_idx, vn_idx))
                tgt_f.append(corners)

    tgt_v = np.array(tgt_v, dtype=np.float64)
    tgt_vt = np.array(tgt_vt, dtype=np.float64)
    tgt_vn = np.array(tgt_vn, dtype=np.float64)

    print(f"\n[Target Model Metrics]")
    print(f"- Vertices: {len(tgt_v)}")
    print(f"- Texture Coordinates: {len(tgt_vt)}")
    print(f"- Normals: {len(tgt_vn)}")
    print(f"- Faces: {len(tgt_f)}")
    target_non_tri = sum(1 for f in tgt_f if len(f) != 3)
    print(f"- Non-triangle faces: {target_non_tri}")

    # 3. Provenance Verification
    min_raw = raw_v.min(axis=0)
    max_raw = raw_v.max(axis=0)
    span_raw = max_raw - min_raw
    center_raw = (max_raw + min_raw) / 2.0
    scale = 1.90 / max(span_raw)

    expected_norm_v = (raw_v - center_raw) * scale

    v_diff = np.abs(tgt_v - expected_norm_v)
    max_v_err = np.max(v_diff)
    mean_v_err = np.mean(v_diff)

    print(f"\n[Provenance: Vertex Transformation Check]")
    print(f"- Raw X: [{min_raw[0]:.4f}, {max_raw[0]:.4f}], Y: [{min_raw[1]:.4f}, {max_raw[1]:.4f}], Z: [{min_raw[2]:.4f}, {max_raw[2]:.4f}]")
    print(f"- Raw Center: ({center_raw[0]:.4f}, {center_raw[1]:.4f}, {center_raw[2]:.4f})")
    print(f"- Scale Factor (1.90 / max_span): {scale:.8f}")
    print(f"- Max Vertex Error: {max_v_err:.8e} m")
    print(f"- Mean Vertex Error: {mean_v_err:.8e} m")
    provenance_vertex_pass = max_v_err < 1e-4

    # Normals correspondence
    vn_diff = np.abs(tgt_vn - raw_vn)
    max_vn_err = np.max(vn_diff)
    print(f"- Max Normal Vector Error: {max_vn_err:.8e}")
    vn_lengths = np.linalg.norm(tgt_vn, axis=1)
    print(f"- Min Normal Length: {np.min(vn_lengths):.6f}, Max Normal Length: {np.max(vn_lengths):.6f}")

    # 4. Planar UV Mathematical Rigor
    x_min, x_max = -0.950000, 0.950000
    y_min, y_max = tgt_v[:, 1].min(), tgt_v[:, 1].max()
    x_span = x_max - x_min
    y_span = y_max - y_min

    print(f"\n[Planar Projection Math Analysis]")
    print(f"- Target Extents: X=[{tgt_v[:,0].min():.6f}, {tgt_v[:,0].max():.6f}]")
    print(f"- Target Extents: Y=[{y_min:.6f}, {y_max:.6f}], Span={y_span:.6f}")
    print(f"- Target Extents: Z=[{tgt_v[:,2].min():.6f}, {tgt_v[:,2].max():.6f}]")

    # Triangle partitioning and crossing face check
    cross_faces = 0
    front_faces = 0
    back_faces = 0
    front_max_u = -float('inf')
    front_min_u = float('inf')
    back_min_u = float('inf')
    back_max_u = -float('inf')

    # Check dU/dx monotonicity
    front_du_dx_violations = 0
    back_du_dx_violations = 0

    face_uv_discrepancies = []

    for fi, tri in enumerate(tgt_f):
        u_vals = [tgt_vt[c[1]][0] for c in tri]
        v_vals = [tgt_vt[c[1]][1] for c in tri]
        pts = [tgt_v[c[0]] for c in tri]

        has_front = any(u < 0.50 for u in u_vals)
        has_back = any(u >= 0.50 for u in u_vals)

        if has_front and has_back:
            cross_faces += 1

        if all(u < 0.50 for u in u_vals):
            front_faces += 1
            for u in u_vals:
                front_max_u = max(front_max_u, u)
                front_min_u = min(front_min_u, u)
            # Check front math: U_front(x) = 0.002 + 0.496 * (x - x_min) / x_span
            for c in tri:
                vx = tgt_v[c[0]][0]
                vy = tgt_v[c[0]][1]
                expected_u = np.clip(0.002 + 0.496 * (vx - x_min) / x_span, 0.002, 0.498)
                expected_v = np.clip(0.002 + 0.996 * (vy - y_min) / y_span, 0.002, 0.998)
                act_u, act_v = tgt_vt[c[1]]
                if abs(act_u - expected_u) > 1e-4 or abs(act_v - expected_v) > 1e-4:
                    face_uv_discrepancies.append((fi, 'FRONT', vx, vy, act_u, expected_u, act_v, expected_v))

            # dU/dx > 0 check on edge pairs
            for i in range(3):
                p_a = pts[i]
                p_b = pts[(i+1)%3]
                u_a = u_vals[i]
                u_b = u_vals[(i+1)%3]
                dx = p_b[0] - p_a[0]
                du = u_b - u_a
                if abs(dx) > 1e-5:
                    if (du / dx) < -1e-6:
                        front_du_dx_violations += 1

        elif all(u >= 0.50 for u in u_vals):
            back_faces += 1
            for u in u_vals:
                back_min_u = min(back_min_u, u)
                back_max_u = max(back_max_u, u)
            # Check back math: U_back(x) = 0.502 + 0.496 * (x_max - x) / x_span
            for c in tri:
                vx = tgt_v[c[0]][0]
                vy = tgt_v[c[0]][1]
                expected_u = np.clip(0.502 + 0.496 * (x_max - vx) / x_span, 0.502, 0.998)
                expected_v = np.clip(0.002 + 0.996 * (vy - y_min) / y_span, 0.002, 0.998)
                act_u, act_v = tgt_vt[c[1]]
                if abs(act_u - expected_u) > 1e-4 or abs(act_v - expected_v) > 1e-4:
                    face_uv_discrepancies.append((fi, 'BACK', vx, vy, act_u, expected_u, act_v, expected_v))

            # dU/dx < 0 check on edge pairs
            for i in range(3):
                p_a = pts[i]
                p_b = pts[(i+1)%3]
                u_a = u_vals[i]
                u_b = u_vals[(i+1)%3]
                dx = p_b[0] - p_a[0]
                du = u_b - u_a
                if abs(dx) > 1e-5:
                    if (du / dx) > 1e-6:
                        back_du_dx_violations += 1

    print(f"- Total Triangles: {len(tgt_f)}")
    print(f"- Front Triangles: {front_faces}")
    print(f"- Back Triangles: {back_faces}")
    print(f"- Crossing Faces across U = 0.50: {cross_faces}")
    print(f"- Front U Range: [{front_min_u:.6f}, {front_max_u:.6f}]")
    print(f"- Back U Range: [{back_min_u:.6f}, {back_max_u:.6f}]")
    buffer_gutter = back_min_u - front_max_u
    print(f"- Deadband Buffer Gutter (Delta U): {buffer_gutter:.6f}")
    print(f"- UV Formula Discrepancies (>1e-4): {len(face_uv_discrepancies)}")
    print(f"- Front dU/dx Violations: {front_du_dx_violations}")
    print(f"- Back dU/dx Violations: {back_du_dx_violations}")

    # 5. Check Anatomical Alignments
    # Chest sternum vertices: |x| < 0.05, y in [0.20, 0.30], z > 0.15
    sternum_uvs = []
    for tri in tgt_f:
        for c in tri:
            vx, vy, vz = tgt_v[c[0]]
            u, v = tgt_vt[c[1]]
            if abs(vx) < 0.05 and 0.20 <= vy <= 0.30 and vz > 0.15:
                sternum_uvs.append((u, v))

    if sternum_uvs:
        avg_sternum_u = np.mean([uv[0] for uv in sternum_uvs])
        avg_sternum_v = np.mean([uv[1] for uv in sternum_uvs])
        print(f"\n[Anatomical Alignment: Chest Sternum]")
        print(f"- Sternum Samples: {len(sternum_uvs)}")
        print(f"- Average Sternum (U, V): ({avg_sternum_u:.4f}, {avg_sternum_v:.4f}) [Expected ~ (0.25, 0.65)]")

    # Hem vertices: y < -0.80
    hem_vs = []
    for tri in tgt_f:
        for c in tri:
            vx, vy, vz = tgt_v[c[0]]
            u, v = tgt_vt[c[1]]
            if vy < -0.80:
                hem_vs.append(v)
    if hem_vs:
        print(f"\n[Anatomical Alignment: Bottom Hem]")
        print(f"- Hem Samples: {len(hem_vs)}")
        print(f"- Max Hem V: {np.max(hem_vs):.6f} [Expected <= 0.150]")
        print(f"- Min Hem V: {np.min(hem_vs):.6f}")

    # Sleeves: |x| > 0.50
    front_sleeve_u = []
    back_sleeve_u = []
    for tri in tgt_f:
        pts = [tgt_v[c[0]] for c in tri]
        c_x = np.mean([p[0] for p in pts])
        if abs(c_x) > 0.50:
            fn = np.cross(pts[1] - pts[0], pts[2] - pts[0])
            for c in tri:
                u = tgt_vt[c[1]][0]
                if fn[2] >= 0:
                    front_sleeve_u.append(u)
                else:
                    back_sleeve_u.append(u)

    print(f"\n[Anatomical Alignment: Sleeves (|x| > 0.50)]")
    print(f"- Front Sleeve Samples: {len(front_sleeve_u)}, Max U: {np.max(front_sleeve_u):.6f} (Expected <= 0.498)")
    print(f"- Back Sleeve Samples: {len(back_sleeve_u)}, Min U: {np.min(back_sleeve_u):.6f} (Expected >= 0.502)")

    # 6. Physical 3D Seams Check
    # Verify welded side seams in 3D geometry
    # Count duplicate 3D vertices
    unique_3d_v = len(np.unique(np.round(tgt_v, 5), axis=0))
    print(f"\n[3D Seams & Topology Check]")
    print(f"- Total 3D Vertices: {len(tgt_v)}, Unique Coordinates (5 decimals): {unique_3d_v}")

    # Summary
    all_pass = (
        len(tgt_v) == 5355 and
        len(tgt_f) == 10192 and
        provenance_vertex_pass and
        cross_faces == 0 and
        buffer_gutter >= 0.004 and
        len(face_uv_discrepancies) == 0 and
        front_du_dx_violations == 0 and
        back_du_dx_violations == 0 and
        front_max_u <= 0.498 and
        back_min_u >= 0.502
    )

    print(f"\n>>> FORENSIC PASS STATUS: {'PASS' if all_pass else 'FAIL'} <<<")

if __name__ == "__main__":
    run_forensic_audit()
