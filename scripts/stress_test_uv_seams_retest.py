"""
scripts/stress_test_uv_seams_retest.py
Challenger 1 Retest: Adversarial Python Stress Test Harness
Target Asset: public/models/tshirt.obj
"""

import sys
import math
from collections import defaultdict, deque
import json

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
                uvs.append([float(parts[1]), float(parts[2])])
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
    for f_idx in range(len(faces)):
        if f_idx not in visited:
            comp = []
            q = deque([f_idx])
            visited.add(f_idx)
            while q:
                curr = q.popleft()
                comp.append(curr)
                for nbr in face_adj[curr]:
                    if nbr not in visited:
                        visited.add(nbr)
                        q.append(nbr)
            islands.append(comp)

    return islands

def main():
    obj_path = 'public/models/tshirt.obj'
    model = parse_obj(obj_path)
    v = model['positions']
    uvs = model['uvs']
    normals = model['normals']
    faces = model['faces']

    print(f"Loaded: v={len(v)}, vt={len(uvs)}, vn={len(normals)}, f={len(faces)}")

    # 1. Boundary & Bleed Tests
    assert len(faces) == 10192, f"Face count mismatch: {len(faces)}"
    assert all(len(f['v']) == 3 for f in faces), "Non-triangular faces detected"

    crossing_faces = []
    front_faces = []
    back_faces = []

    for idx, f in enumerate(faces):
        u_vals = [uvs[vt - 1][0] for vt in f['vt']]
        min_u = min(u_vals)
        max_u = max(u_vals)
        if min_u < 0.500000 and max_u > 0.500000:
            crossing_faces.append(idx)
        elif max_u <= 0.500000:
            front_faces.append(idx)
        elif min_u >= 0.500000:
            back_faces.append(idx)

    assert len(crossing_faces) == 0, f"Crossing faces detected: {len(crossing_faces)}"
    assert len(front_faces) == 5234, f"Front face count mismatch: {len(front_faces)}"
    assert len(back_faces) == 4958, f"Back face count mismatch: {len(back_faces)}"

    front_max_u = max(max(uvs[vt - 1][0] for vt in faces[idx]['vt']) for idx in front_faces)
    back_min_u = min(min(uvs[vt - 1][0] for vt in faces[idx]['vt']) for idx in back_faces)

    assert front_max_u <= 0.498000, f"Front max U exceeded 0.498: {front_max_u}"
    assert back_min_u >= 0.502000, f"Back min U under 0.502: {back_min_u}"

    delta_u = back_min_u - front_max_u
    assert delta_u >= 0.004000, f"delta_u under 0.004: {delta_u}"
    print(f"Suite 1 Passed: 10,192 tris, crossing={len(crossing_faces)}, front={len(front_faces)} (max U={front_max_u:.6f}), back={len(back_faces)} (min U={back_min_u:.6f}), delta_u={delta_u:.6f}")

    # 2. Seam Welding Verification
    islands = decompose_uv_islands(faces)
    assert len(islands) == 15, f"Expected 15 islands, got {len(islands)}"

    isl1_v = set(vi for f_idx in islands[0] for vi in faces[f_idx]['v'])
    isl2_v = set(vi for f_idx in islands[1] for vi in faces[f_idx]['v'])
    shared_seam_v = sorted(list(isl1_v.intersection(isl2_v)))

    left_seam = [vi for vi in shared_seam_v if v[vi - 1][0] < 0]
    right_seam = [vi for vi in shared_seam_v if v[vi - 1][0] > 0]

    assert len(shared_seam_v) == 54, f"Expected 54 shared seam vertices, got {len(shared_seam_v)}"
    assert len(left_seam) == 27, f"Expected 27 left seam vertices, got {len(left_seam)}"
    assert len(right_seam) == 27, f"Expected 27 right seam vertices, got {len(right_seam)}"

    # Coincident un-welded duplicates
    coincident_pairs = 0
    for i in range(len(shared_seam_v)):
        for j in range(i + 1, len(shared_seam_v)):
            p1 = v[shared_seam_v[i] - 1]
            p2 = v[shared_seam_v[j] - 1]
            dist = math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2])
            if dist < 1e-5:
                coincident_pairs += 1
    assert coincident_pairs == 0, f"Coincident duplicate vertices detected: {coincident_pairs}"

    # UV decoupling
    for vi in shared_seam_v:
        front_vts = set(faces[f_idx]['vt'][c] for f_idx in islands[0] for c, vid in enumerate(faces[f_idx]['v']) if vid == vi)
        back_vts = set(faces[f_idx]['vt'][c] for f_idx in islands[1] for c, vid in enumerate(faces[f_idx]['v']) if vid == vi)
        assert len(front_vts.intersection(back_vts)) == 0, f"Shared VT index at seam vertex {vi}"
        for vt in front_vts:
            assert uvs[vt - 1][0] <= 0.498000, f"Front VT bled past 0.498: {uvs[vt-1]}"
        for vt in back_vts:
            assert uvs[vt - 1][0] >= 0.502000, f"Back VT bled before 0.502: {uvs[vt-1]}"
    print("Suite 2 Passed: 54 shared vertices, 0 coincident duplicates, clean UV seam decoupling")

    # 3. Geometric Normal & Print Zones Correlation
    front_chest_faces = 0
    front_chest_violations = 0
    upper_back_faces = 0
    upper_back_violations = 0

    for f in faces:
        p0 = v[f['v'][0] - 1]
        p1 = v[f['v'][1] - 1]
        p2 = v[f['v'][2] - 1]
        cx = (p0[0] + p1[0] + p2[0]) / 3.0
        cy = (p0[1] + p1[1] + p2[1]) / 3.0
        cz = (p0[2] + p1[2] + p2[2]) / 3.0

        u_vals = [uvs[vt - 1][0] for vt in f['vt']]
        min_u = min(u_vals)
        max_u = max(u_vals)

        if abs(cx) <= 0.25 and -0.2 <= cy <= 0.4 and cz > 0.15:
            front_chest_faces += 1
            if max_u > 0.498000:
                front_chest_violations += 1

        if abs(cx) <= 0.25 and -0.2 <= cy <= 0.4 and cz < -0.15:
            upper_back_faces += 1
            if min_u < 0.502000:
                upper_back_violations += 1

    assert front_chest_faces > 0 and front_chest_violations == 0, f"Front chest violations: {front_chest_violations}/{front_chest_faces}"
    assert upper_back_faces > 0 and upper_back_violations == 0, f"Upper back violations: {upper_back_violations}/{upper_back_faces}"
    print(f"Suite 3.1 & 3.2 Passed: Front Chest {front_chest_faces} faces (0 violations), Upper Back {upper_back_faces} faces (0 violations)")

    # 15 Islands Partition Check
    front_isl_faces = 0
    back_isl_faces = 0
    for isl_idx, comp in enumerate(islands):
        u_all = [uvs[vt - 1][0] for f_idx in comp for vt in faces[f_idx]['vt']]
        min_isl_u = min(u_all)
        max_isl_u = max(u_all)
        if max_isl_u <= 0.498000:
            front_isl_faces += len(comp)
        elif min_isl_u >= 0.502000:
            back_isl_faces += len(comp)
        else:
            raise AssertionError(f"Island {isl_idx + 1} crosses partition boundary: U in [{min_isl_u}, {max_isl_u}]")

    assert front_isl_faces == 5234, f"Front island faces mismatch: {front_isl_faces}"
    assert back_isl_faces == 4958, f"Back island faces mismatch: {back_isl_faces}"
    print(f"Suite 3.3 Passed: All 15 islands conform (Front={front_isl_faces}, Back={back_isl_faces})")

    print("\nALL EMPIRICAL TESTS PASSED! VERDICT: APPROVE")

if __name__ == '__main__':
    main()
