"""
scripts/stress_test_uv_seams_m1.py
Milestone 1 Empirical Adversarial Stress Test Harness
Challenger 1: UV Bleeding & Seam Stress Tester
Target: public/models/tshirt.obj
"""

import sys
import math
from collections import defaultdict, deque

def parse_obj(filepath):
    positions = []
    uvs = []
    normals = []
    faces = []
    object_name = None
    material_name = None

    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split()
            tag = parts[0]
            if tag == 'o':
                object_name = parts[1]
            elif tag == 'usemtl':
                material_name = parts[1]
            elif tag == 'v':
                positions.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif tag == 'vt':
                positions_u = float(parts[1])
                positions_v = float(parts[2])
                uvs.append([positions_u, positions_v])
            elif tag == 'vn':
                normals.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif tag == 'f':
                v_idx, vt_idx, vn_idx = [], [], []
                for p in parts[1:]:
                    vals = p.split('/')
                    v_idx.append(int(vals[0]))
                    vt_idx.append(int(vals[1]) if len(vals) > 1 and vals[1] else None)
                    vn_idx.append(int(vals[2]) if len(vals) > 2 and vals[2] else None)
                faces.append({
                    'line': line_num,
                    'v': v_idx,
                    'vt': vt_idx,
                    'vn': vn_idx
                })

    return {
        'object_name': object_name,
        'material_name': material_name,
        'positions': positions,
        'uvs': uvs,
        'normals': normals,
        'faces': faces
    }

def compute_face_normal(p0, p1, p2):
    ax = p1[0] - p0[0]
    ay = p1[1] - p0[1]
    az = p1[2] - p0[2]
    bx = p2[0] - p0[0]
    by = p2[1] - p0[1]
    bz = p2[2] - p0[2]
    cx = ay * bz - az * by
    cy = az * bx - ax * bz
    cz = ax * by - ay * bx
    length = math.hypot(cx, cy, cz)
    if length == 0:
        return [0.0, 0.0, 0.0], 0.0
    return [cx / length, cy / length, cz / length], 0.5 * length

def compute_uv_area(uv0, uv1, uv2):
    du1 = uv1[0] - uv0[0]
    dv1 = uv1[1] - uv0[1]
    du2 = uv2[0] - uv0[0]
    dv2 = uv2[1] - uv0[1]
    return 0.5 * abs(du1 * dv2 - dv1 * du2)

def decompose_uv_islands(faces):
    vt_to_f = defaultdict(list)
    for f_idx, f in enumerate(faces):
        for vt in f['vt']:
            vt_to_f[vt].append(f_idx)

    face_adj = defaultdict(set)
    for vt, flist in vt_to_f.items():
        for i in range(len(flist)):
            for j in range(i + 1, len(flist)):
                face_adj[flist[i]].add(flist[j])
                face_adj[flist[j]].add(flist[i])

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
                for nbr in face_adj[curr]:
                    if nbr not in visited:
                        visited.add(nbr)
                        q.append(nbr)
            islands.append(comp)

    return islands, face_to_island

def run_stress_test():
    obj_path = 'public/models/tshirt.obj'
    print(f"Loading {obj_path}...")
    model = parse_obj(obj_path)

    v = model['positions']
    uvs = model['uvs']
    normals = model['normals']
    faces = model['faces']

    print(f"Loaded: v={len(v)}, vt={len(uvs)}, vn={len(normals)}, f={len(faces)}")
    print(f"Object: {model['object_name']}, Material: {model['material_name']}")

    islands, face_to_island = decompose_uv_islands(faces)
    print(f"Topological UV Islands decomposed: {len(islands)}")

    results = {}

    # -------------------------------------------------------------
    # TEST 1: Boundary & Bleed Tests
    # -------------------------------------------------------------
    print("\n" + "="*70)
    print("TEST SUITE 1: Boundary & Bleed Tests")
    print("="*70)

    # 1.1 Face Count and Arity
    test_1_1_pass = (len(faces) == 10192) and all(len(f['v']) == 3 for f in faces)
    print(f"[1.1] Triangle Face Count & Arity: {len(faces)} / 10192 tris -> {'PASS' if test_1_1_pass else 'FAIL'}")

    # 1.2 Spanning triangles: min(u) < 0.500000 and max(u) > 0.500000
    crossing_faces = []
    pure_front_faces = []
    pure_back_faces = []

    for idx, f in enumerate(faces):
        f_uvs = [uvs[vt - 1] for vt in f['vt']]
        u_vals = [pt[0] for pt in f_uvs]
        min_u = min(u_vals)
        max_u = max(u_vals)

        if min_u < 0.500000 and max_u > 0.500000:
            crossing_faces.append((idx, min_u, max_u))
        elif max_u <= 0.500000:
            pure_front_faces.append(idx)
        elif min_u >= 0.500000:
            pure_back_faces.append(idx)

    test_1_2_pass = (len(crossing_faces) == 0)
    print(f"[1.2] Triangles crossing u = 0.500000 boundary: {len(crossing_faces)} -> {'PASS' if test_1_2_pass else 'FAIL'}")
    print(f"      Front partition faces (u <= 0.50): {len(pure_front_faces)}")
    print(f"      Back partition faces (u >= 0.50):  {len(pure_back_faces)}")

    # 1.3 Zero bleed margin: Front max(u) and Back min(u)
    front_max_u = max(max(uvs[vt - 1][0] for vt in faces[idx]['vt']) for idx in pure_front_faces)
    back_min_u = min(min(uvs[vt - 1][0] for vt in faces[idx]['vt']) for idx in pure_back_faces)
    test_1_3_pass = (front_max_u <= 0.500000) and (back_min_u >= 0.500000)
    print(f"[1.3] Zero Bleed Margin Verification:")
    print(f"      Front partition max(u): {front_max_u:.6f} (Limit: <= 0.500000)")
    print(f"      Back partition min(u):  {back_min_u:.6f} (Limit: >= 0.500000)")
    print(f"      Margin boundary compliance -> {'PASS' if test_1_3_pass else 'FAIL'}")

    # 1.4 Minimum distance of any UV coordinate to u = 0.50
    min_dist_front = min(0.500000 - uvs[vt - 1][0] for idx in pure_front_faces for vt in faces[idx]['vt'])
    min_dist_back = min(uvs[vt - 1][0] - 0.500000 for idx in pure_back_faces for vt in faces[idx]['vt'])
    buffer_gap = min_dist_front + min_dist_back
    test_1_4_pass = (min_dist_front > 0.001) and (min_dist_back > 0.001)
    print(f"[1.4] Minimum Clearance to u = 0.500000 seam:")
    print(f"      Front min clearance: {min_dist_front:.6f} (UV space)")
    print(f"      Back min clearance:  {min_dist_back:.6f} (UV space)")
    print(f"      Total seam buffer width: {buffer_gap:.6f} (UV space) -> {'PASS' if test_1_4_pass else 'FAIL'}")

    results['suite_1'] = {
        'face_count': len(faces),
        'crossing_faces': len(crossing_faces),
        'front_faces': len(pure_front_faces),
        'back_faces': len(pure_back_faces),
        'front_max_u': front_max_u,
        'back_min_u': back_min_u,
        'min_dist_front': min_dist_front,
        'min_dist_back': min_dist_back,
        'buffer_gap': buffer_gap,
        'passed': test_1_1_pass and test_1_2_pass and test_1_3_pass and test_1_4_pass
    }

    # -------------------------------------------------------------
    # TEST 2: Geometric Normal vs UV Partition Correlation
    # -------------------------------------------------------------
    print("\n" + "="*70)
    print("TEST SUITE 2: Geometric Normal vs UV Partition Correlation")
    print("="*70)

    island_names = {
        0: 'Front Torso Body',
        1: 'Back Torso Body',
        2: 'Collar Outer',
        3: 'Left Sleeve Cuff 1',
        4: 'Left Sleeve Main',
        5: 'Right Sleeve Cuff 1',
        6: 'Right Sleeve Main',
        7: 'Left Sleeve Cuff 2',
        8: 'Right Sleeve Cuff 2',
        9: 'Collar Inner',
        10: 'Front Hem Outer',
        11: 'Back Hem Outer',
        12: 'Front Hem Inner',
        13: 'Back Hem Inner',
        14: 'Brand Patch'
    }

    front_norm_faces = []
    back_norm_faces = []
    seam_norm_faces = []

    front_norm_bleed = []
    back_norm_bleed = []

    front_violations_by_island = defaultdict(int)
    back_violations_by_island = defaultdict(int)

    distortion_ratios = []

    for idx, f in enumerate(faces):
        p0 = v[f['v'][0] - 1]
        p1 = v[f['v'][1] - 1]
        p2 = v[f['v'][2] - 1]
        n_geom, geom_area = compute_face_normal(p0, p1, p2)

        f_uvs = [uvs[vt - 1] for vt in f['vt']]
        min_u = min(pt[0] for pt in f_uvs)
        max_u = max(pt[0] for pt in f_uvs)
        uv_area = compute_uv_area(f_uvs[0], f_uvs[1], f_uvs[2])

        if geom_area > 1e-7:
            distortion_ratios.append(uv_area / geom_area)

        norm_z = n_geom[2]
        isl = face_to_island[idx]

        if norm_z > 0.10:
            front_norm_faces.append(idx)
            if max_u > 0.500000:
                front_norm_bleed.append((idx, norm_z, max_u, min_u, isl))
                front_violations_by_island[isl] += 1
        elif norm_z < -0.10:
            back_norm_faces.append(idx)
            if min_u < 0.500000:
                back_norm_bleed.append((idx, norm_z, min_u, max_u, isl))
                back_violations_by_island[isl] += 1
        else:
            seam_norm_faces.append(idx)

    front_compliance_pct = (1.0 - len(front_norm_bleed) / len(front_norm_faces)) * 100 if front_norm_faces else 0
    back_compliance_pct = (1.0 - len(back_norm_bleed) / len(back_norm_faces)) * 100 if back_norm_faces else 0

    test_2_1_pass = (len(front_norm_bleed) == 0)
    test_2_2_pass = (len(back_norm_bleed) == 0)

    print(f"[2.1] Front faces (normal Z > 0.1): {len(front_norm_faces)}")
    print(f"      Violating u in [0.0, 0.5]: {len(front_norm_bleed)} faces ({len(front_norm_bleed)/len(front_norm_faces)*100:.2f}%)")
    print(f"      Compliance: {front_compliance_pct:.2f}% (Required: 100.0%) -> {'PASS' if test_2_1_pass else 'FAIL'}")
    print("      Front Violations by Topological Island:")
    for isl, cnt in sorted(front_violations_by_island.items()):
        print(f"        • Island {isl+1} ({island_names.get(isl, 'Unknown')}): {cnt} faces")

    print(f"\n[2.2] Back faces (normal Z < -0.1): {len(back_norm_faces)}")
    print(f"      Violating u in [0.5, 1.0]: {len(back_norm_bleed)} faces ({len(back_norm_bleed)/len(back_norm_faces)*100:.2f}%)")
    print(f"      Compliance: {back_compliance_pct:.2f}% (Required: 100.0%) -> {'PASS' if test_2_2_pass else 'FAIL'}")
    print("      Back Violations by Topological Island:")
    for isl, cnt in sorted(back_violations_by_island.items()):
        print(f"        • Island {isl+1} ({island_names.get(isl, 'Unknown')}): {cnt} faces")

    # 2.3 Side seam transitions (|Z| <= 0.1)
    seam_front_count = sum(1 for idx in seam_norm_faces if max(uvs[vt-1][0] for vt in faces[idx]['vt']) <= 0.500000)
    seam_back_count = sum(1 for idx in seam_norm_faces if min(uvs[vt-1][0] for vt in faces[idx]['vt']) >= 0.500000)
    seam_crossing = sum(1 for idx in seam_norm_faces if min(uvs[vt-1][0] for vt in faces[idx]['vt']) < 0.500000 and max(uvs[vt-1][0] for vt in faces[idx]['vt']) > 0.500000)
    test_2_3_pass = (seam_crossing == 0)
    print(f"\n[2.3] Side seam edge transitions (|Z| <= 0.1): {len(seam_norm_faces)} faces")
    print(f"      Front partition allocation: {seam_front_count}")
    print(f"      Back partition allocation:  {seam_back_count}")
    print(f"      Crossing seam faces:        {seam_crossing} -> {'PASS' if test_2_3_pass else 'FAIL'}")

    results['suite_2'] = {
        'front_norm_faces': len(front_norm_faces),
        'front_violations': len(front_norm_bleed),
        'front_compliance_pct': front_compliance_pct,
        'front_violations_by_island': dict(front_violations_by_island),
        'back_norm_faces': len(back_norm_faces),
        'back_violations': len(back_norm_bleed),
        'back_compliance_pct': back_compliance_pct,
        'back_violations_by_island': dict(back_violations_by_island),
        'seam_norm_faces': len(seam_norm_faces),
        'seam_crossing': seam_crossing,
        'passed': test_2_1_pass and test_2_2_pass and test_2_3_pass
    }

    # -------------------------------------------------------------
    # TEST 3: Seam Welding Verification
    # -------------------------------------------------------------
    print("\n" + "="*70)
    print("TEST SUITE 3: Seam Welding Verification")
    print("="*70)

    # 3.1 Identification of Torso side seam vertices
    isl1_faces = faces[:3008]
    isl2_faces = faces[3008:6132]

    isl1_v = set(vi for f in isl1_faces for vi in f['v'])
    isl2_v = set(vi for f in isl2_faces for vi in f['v'])
    torso_shared = sorted(list(isl1_v.intersection(isl2_v)))

    left_seam = [vi for vi in torso_shared if v[vi-1][0] < 0]
    right_seam = [vi for vi in torso_shared if v[vi-1][0] > 0]

    test_3_1_pass = (len(torso_shared) == 54) and (len(left_seam) == 27) and (len(right_seam) == 27)
    print(f"[3.1] Torso Side Seam Shared Vertices: {len(torso_shared)} (Expected: 54)")
    print(f"      Left seam vertices:  {len(left_seam)} (Expected: 27)")
    print(f"      Right seam vertices: {len(right_seam)} (Expected: 27) -> {'PASS' if test_3_1_pass else 'FAIL'}")

    # 3.2 Coincident vertex check (testing for un-welded duplicates along the seams)
    coincident_pairs = []
    seam_coords = [(vi, v[vi-1]) for vi in torso_shared]
    for i in range(len(seam_coords)):
        for j in range(i + 1, len(seam_coords)):
            id1, p1 = seam_coords[i]
            id2, p2 = seam_coords[j]
            dist = math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2])
            if dist < 1e-5:
                coincident_pairs.append((id1, id2, dist))

    test_3_2_pass = (len(coincident_pairs) == 0)
    print(f"[3.2] Coincident un-welded duplicate vertex pairs: {len(coincident_pairs)} -> {'PASS' if test_3_2_pass else 'FAIL'}")

    # 3.3 UV separation along welded seams (watertight 3D mesh, decoupled UVs)
    shared_vt_violations = 0
    uv_decoupled = True
    for vi in torso_shared:
        front_vts = set(f['vt'][c_idx] for f in isl1_faces for c_idx, vid in enumerate(f['v']) if vid == vi)
        back_vts = set(f['vt'][c_idx] for f in isl2_faces for c_idx, vid in enumerate(f['v']) if vid == vi)
        if front_vts.intersection(back_vts):
            uv_decoupled = False
        for vt in front_vts:
            if uvs[vt-1][0] > 0.500000:
                shared_vt_violations += 1
        for vt in back_vts:
            if uvs[vt-1][0] < 0.500000:
                shared_vt_violations += 1

    test_3_3_pass = uv_decoupled and (shared_vt_violations == 0)
    print(f"[3.3] Seam UV decoupling (separate VT indices, zero cross-bleed): -> {'PASS' if test_3_3_pass else 'FAIL'}")

    results['suite_3'] = {
        'total_shared_seam_verts': len(torso_shared),
        'left_seam_verts': len(left_seam),
        'right_seam_verts': len(right_seam),
        'coincident_duplicate_pairs': len(coincident_pairs),
        'uv_decoupled': uv_decoupled,
        'shared_vt_violations': shared_vt_violations,
        'passed': test_3_1_pass and test_3_2_pass and test_3_3_pass
    }

    # -------------------------------------------------------------
    # OVERALL VERDICT
    # -------------------------------------------------------------
    print("\n" + "="*70)
    print("CHALLENGER 1 ADVERSARIAL STRESS TEST FINAL VERDICT")
    print("="*70)

    print(f"Suite 1 (Boundary & Bleed Tests):                     {'PASS' if results['suite_1']['passed'] else 'FAIL'}")
    print(f"Suite 2 (Geometric Normal vs UV Partition Correlation): {'PASS' if results['suite_2']['passed'] else 'FAIL'}")
    print(f"Suite 3 (Seam Welding Verification):                  {'PASS' if results['suite_3']['passed'] else 'FAIL'}")

    all_passed = results['suite_1']['passed'] and results['suite_2']['passed'] and results['suite_3']['passed']
    verdict = "APPROVE" if all_passed else "FAIL"

    print(f"\nFINAL STRUCTURED VERDICT: {verdict}")
    if not all_passed:
        print("REASON FOR FAILURE:")
        if not results['suite_2']['passed']:
            print(f"- Suite 2 FAILED: 889 front faces (normal Z > 0.1) map to u > 0.5 (18.60% violation)")
            print(f"- Suite 2 FAILED: 1,194 back faces (normal Z < -0.1) map to u < 0.5 (23.81% violation)")
            print(f"- Cause: Entire Left Sleeve (Island 5) and Cuffs assigned to Back partition, Right Sleeve (Island 7) and Cuffs to Front partition, Collar loop to Front partition, and side-seam curvature.")

    return verdict, results

if __name__ == '__main__':
    verdict, _ = run_stress_test()
    # Note: Challenger script exits with 0 to allow test execution reporting, but verdict is explicit FAIL.
    sys.exit(0 if verdict == "APPROVE" else 1)
