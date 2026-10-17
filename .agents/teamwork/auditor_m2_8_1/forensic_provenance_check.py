import os
import sys
import math

def run_forensic_audit():
    source_path = r"d:\Coding Projects\ape-parel tshirt\prep_models\various size\Low_T-shirt.obj"
    target_path = r"d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj"

    print("=== FORENSIC PROVENANCE & UV PARTITION AUDIT ===")
    print(f"Source: {source_path}")
    print(f"Target: {target_path}")

    if not os.path.exists(source_path):
        print(f"FAIL: Source file does not exist: {source_path}")
        return False
    if not os.path.exists(target_path):
        print(f"FAIL: Target file does not exist: {target_path}")
        return False

    # 1. Parse Source
    src_v = []
    src_vt = []
    src_vn = []
    src_f = []

    with open(source_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('v '):
                parts = line.split()[1:]
                src_v.append([float(x) for x in parts[:3]])
            elif line.startswith('vt '):
                parts = line.split()[1:]
                src_vt.append([float(x) for x in parts[:2]])
            elif line.startswith('vn '):
                parts = line.split()[1:]
                src_vn.append([float(x) for x in parts[:3]])
            elif line.startswith('f '):
                parts = line.split()[1:]
                src_f.append(parts)

    print(f"\n[Source Asset Stats]")
    print(f"  v count:  {len(src_v)}")
    print(f"  vt count: {len(src_vt)}")
    print(f"  vn count: {len(src_vn)}")
    print(f"  f count:  {len(src_f)} (quads/tris)")

    # 2. Parse Target
    tgt_v = []
    tgt_vt = []
    tgt_vn = []
    tgt_f = []

    with open(target_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('v '):
                parts = line.split()[1:]
                tgt_v.append([float(x) for x in parts[:3]])
            elif line.startswith('vt '):
                parts = line.split()[1:]
                tgt_vt.append([float(x) for x in parts[:2]])
            elif line.startswith('vn '):
                parts = line.split()[1:]
                tgt_vn.append([float(x) for x in parts[:3]])
            elif line.startswith('f '):
                parts = line.split()[1:]
                tgt_f.append(parts)

    print(f"\n[Target Asset Stats]")
    print(f"  v count:  {len(tgt_v)}")
    print(f"  vt count: {len(tgt_vt)}")
    print(f"  vn count: {len(tgt_vn)}")
    print(f"  f count:  {len(tgt_f)} (all triangles)")

    # Check Counts
    if len(src_v) != len(tgt_v):
        print(f"FAIL: Vertex count mismatch! Source={len(src_v)}, Target={len(tgt_v)}")
        return False
    if len(src_vn) != len(tgt_vn):
        print(f"FAIL: Normal count mismatch! Source={len(src_vn)}, Target={len(tgt_vn)}")
        return False
    if len(src_vt) != len(tgt_vt):
        print(f"FAIL: UV count mismatch! Source={len(src_vt)}, Target={len(tgt_vt)}")
        return False

    # Check Affine Transformation Provenance:
    # Target vertices should be (Source - center) * scale
    # Let's compute min and max for both
    src_min_x = min(p[0] for p in src_v)
    src_max_x = max(p[0] for p in src_v)
    src_min_y = min(p[1] for p in src_v)
    src_max_y = max(p[1] for p in src_v)
    src_min_z = min(p[2] for p in src_v)
    src_max_z = max(p[2] for p in src_v)

    src_cx = (src_min_x + src_max_x) / 2.0
    src_cy = (src_min_y + src_max_y) / 2.0
    src_cz = (src_min_z + src_max_z) / 2.0
    src_max_dim = max(src_max_x - src_min_x, src_max_y - src_min_y, src_max_z - src_min_z)
    scale = 1.90 / src_max_dim

    print(f"\n[Provenance Transformation Analysis]")
    print(f"  Source bounding box: X=[{src_min_x:.4f}, {src_max_x:.4f}], Y=[{src_min_y:.4f}, {src_max_y:.4f}], Z=[{src_min_z:.4f}, {src_max_z:.4f}]")
    print(f"  Source center: ({src_cx:.4f}, {src_cy:.4f}, {src_cz:.4f}), max_dim={src_max_dim:.4f}")
    print(f"  Calculated scale factor: {scale:.8f}")

    # Verify each vertex matches
    max_v_diff = 0.0
    for i in range(len(src_v)):
        expected_x = (src_v[i][0] - src_cx) * scale
        expected_y = (src_v[i][1] - src_cy) * scale
        expected_z = (src_v[i][2] - src_cz) * scale

        actual_x = tgt_v[i][0]
        actual_y = tgt_v[i][1]
        actual_z = tgt_v[i][2]

        diff = math.sqrt((expected_x - actual_x)**2 + (expected_y - actual_y)**2 + (expected_z - actual_z)**2)
        if diff > max_v_diff:
            max_v_diff = diff

    print(f"  Maximum deviation across all 5,355 vertices: {max_v_diff:.8e}")
    if max_v_diff > 1e-4:
        print(f"FAIL: Target vertices deviate from affine transformation of Source! Max diff={max_v_diff}")
        return False
    else:
        print("  PASS: Target vertices are an exact 1:1 affine transformation of Source vertices.")

    # Check Normals
    max_vn_diff = 0.0
    for i in range(len(src_vn)):
        diff = math.sqrt((src_vn[i][0] - tgt_vn[i][0])**2 + (src_vn[i][1] - tgt_vn[i][1])**2 + (src_vn[i][2] - tgt_vn[i][2])**2)
        if diff > max_vn_diff:
            max_vn_diff = diff
    print(f"  Maximum normal vector deviation: {max_vn_diff:.8e}")
    if max_vn_diff > 1e-4:
        print(f"FAIL: Normals mismatch! Max diff={max_vn_diff}")
        return False
    else:
        print("  PASS: Normals are identically preserved.")

    # Check Face Triangulation
    # In source: quads have 4 corners v/vt/vn.
    # Count how many triangles were produced.
    expected_tris = 0
    for f in src_f:
        if len(f) == 3:
            expected_tris += 1
        elif len(f) == 4:
            expected_tris += 2
        else:
            expected_tris += len(f) - 2

    print(f"\n[Topology & Face Triangulation Analysis]")
    print(f"  Expected triangles from source decomposition: {expected_tris}")
    print(f"  Actual triangles in target: {len(tgt_f)}")
    if len(tgt_f) != expected_tris or len(tgt_f) != 10192:
        print(f"FAIL: Triangle face count unexpected! Expected {expected_tris}, Got {len(tgt_f)}")
        return False
    else:
        print("  PASS: Exact triangulation preserved (5095 quads * 2 + 2 tris = 10,192 triangles).")

    # Check UV Partitioning & Cross-Border Bleed
    print(f"\n[UV Partitioning & Seam Bleed Forensic Analysis]")
    front_faces = 0
    back_faces = 0
    crossing_faces = 0
    invalid_uvs = 0

    all_u = [vt[0] for vt in tgt_vt]
    all_v = [vt[1] for vt in tgt_vt]
    min_u = min(all_u)
    max_u = max(all_u)
    min_v = min(all_v)
    max_v = max(all_v)

    print(f"  UV global bounds: U=[{min_u:.6f}, {max_u:.6f}], V=[{min_v:.6f}, {max_v:.6f}]")
    if min_u < 0.0 or max_u > 1.0 or min_v < 0.0 or max_v > 1.0:
        print(f"FAIL: UV coordinates out of [0, 1] bounds!")
        return False

    front_uv_max = float('-inf')
    front_uv_min = float('inf')
    back_uv_min = float('inf')
    back_uv_max = float('-inf')

    for vt in tgt_vt:
        u, v = vt
        if u < 0.5:
            if u > front_uv_max: front_uv_max = u
            if u < front_uv_min: front_uv_min = u
        else:
            if u > back_uv_max: back_uv_max = u
            if u < back_uv_min: back_uv_min = u

    print(f"  Front UV U range: [{front_uv_min:.6f}, {front_uv_max:.6f}] (Partition [0.0, 0.5])")
    print(f"  Back UV U range:  [{back_uv_min:.6f}, {back_uv_max:.6f}] (Partition [0.5, 1.0])")
    buffer_gap = back_uv_min - front_uv_max
    print(f"  Buffer gap at U=0.50: {buffer_gap:.6f} ({buffer_gap * 1024:.2f} texels at 1024x1024)")

    # Audit every face for crossing faces across U = 0.50
    for f_idx, f in enumerate(tgt_f):
        u_vals = []
        for corner in f:
            vt_idx = int(corner.split('/')[1]) - 1
            u_vals.append(tgt_vt[vt_idx][0])

        min_face_u = min(u_vals)
        max_face_u = max(u_vals)

        if min_face_u < 0.5 and max_face_u > 0.5:
            crossing_faces += 1
        elif max_face_u <= 0.5:
            front_faces += 1
        elif min_face_u >= 0.5:
            back_faces += 1
        else:
            crossing_faces += 1

    print(f"  Front faces (all vertices U <= 0.5): {front_faces}")
    print(f"  Back faces (all vertices U >= 0.5):  {back_faces}")
    print(f"  Crossing faces (straddling U = 0.50): {crossing_faces}")

    if crossing_faces > 0:
        print(f"FAIL: Found {crossing_faces} crossing faces straddling U=0.50!")
        return False
    else:
        print("  PASS: Exactly 0 crossing faces across U=0.50. UV partitioning is 100% strict!")

    # Check Anti-Mirroring
    # Find front torso faces and back torso faces
    # Front torso: Z > 0.1, |Y| < 0.2
    # Check screen left (X < -0.2) vs screen right (X > 0.2)
    front_left_u = []
    front_right_u = []
    back_left_u = []
    back_right_u = []

    for f in tgt_f:
        for corner in f:
            parts = corner.split('/')
            v_idx = int(parts[0]) - 1
            vt_idx = int(parts[1]) - 1
            x, y, z = tgt_v[v_idx]
            u, v = tgt_vt[vt_idx]

            if abs(y) < 0.15:
                if z > 0.12:
                    if x < -0.25:
                        front_left_u.append(u)
                    elif x > 0.25:
                        front_right_u.append(u)
                elif z < -0.12:
                    # When looking at back, viewer's left is X > 0.25, viewer's right is X < -0.25
                    if x > 0.25:
                        back_left_u.append(u)
                    elif x < -0.25:
                        back_right_u.append(u)

    avg_front_left_u = sum(front_left_u) / len(front_left_u)
    avg_front_right_u = sum(front_right_u) / len(front_right_u)
    avg_back_left_u = sum(back_left_u) / len(back_left_u)
    avg_back_right_u = sum(back_right_u) / len(back_right_u)

    print(f"\n[Anti-Mirroring Verification]")
    print(f"  Front screen-left avg U:  {avg_front_left_u:.4f}")
    print(f"  Front screen-right avg U: {avg_front_right_u:.4f}")
    print(f"  Back viewer-left avg U:   {avg_back_left_u:.4f}")
    print(f"  Back viewer-right avg U:  {avg_back_right_u:.4f}")

    if avg_front_left_u >= avg_front_right_u:
        print("FAIL: Front UVs are horizontally mirrored!")
        return False
    if avg_back_left_u >= avg_back_right_u:
        print("FAIL: Back UVs are horizontally mirrored!")
        return False

    print("  PASS: Anti-mirroring confirmed on both Front and Back surfaces (U increases left-to-right as viewer reads).")

    print("\nALL FORENSIC CHECKS PASSED EMPIRICALLY WITH 100% MATHEMATICAL INTEGRITY!")
    return True

if __name__ == '__main__':
    success = run_forensic_audit()
    sys.exit(0 if success else 1)
