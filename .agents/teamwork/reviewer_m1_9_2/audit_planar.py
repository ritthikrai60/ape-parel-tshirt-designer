import os
import sys
import numpy as np

def audit_planar():
    obj_path = "public/models/tshirt.obj"
    assert os.path.exists(obj_path), f"File {obj_path} does not exist"

    vertices = []
    vts = []
    normals = []
    faces = []

    with open(obj_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            tokens = line.split()
            if tokens[0] == "v":
                vertices.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
            elif tokens[0] == "vt":
                vts.append([float(tokens[1]), float(tokens[2])])
            elif tokens[0] == "vn":
                normals.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
            elif tokens[0] == "f":
                face = []
                for corner in tokens[1:]:
                    parts = corner.split("/")
                    face.append((int(parts[0]) - 1, int(parts[1]) - 1, int(parts[2]) - 1))
                faces.append(face)

    vertices = np.array(vertices)
    vts = np.array(vts)
    normals = np.array(normals)

    print(f"Vertex count: {len(vertices)}")
    print(f"VT count: {len(vts)}")
    print(f"Normal count: {len(normals)}")
    print(f"Face count: {len(faces)}")

    # 1. Topology counts
    assert len(vertices) == 5355, f"Expected 5,355 vertices, found {len(vertices)}"
    assert len(vts) == 5761, f"Expected 5,761 UVs, found {len(vts)}"
    assert len(normals) == 5355, f"Expected 5,355 normals, found {len(normals)}"
    assert len(faces) == 10192, f"Expected 10,192 triangles, found {len(faces)}"

    # Check for NaN / Inf
    assert not np.isnan(vertices).any(), "Found NaN in vertices"
    assert not np.isinf(vertices).any(), "Found Inf in vertices"
    assert not np.isnan(vts).any(), "Found NaN in UVs"
    assert not np.isinf(vts).any(), "Found Inf in UVs"
    assert not np.isnan(normals).any(), "Found NaN in normals"
    assert not np.isinf(normals).any(), "Found Inf in normals"

    # Check normal lengths
    norm_lens = np.linalg.norm(normals, axis=1)
    print(f"Normals: min length={norm_lens.min():.6f}, max length={norm_lens.max():.6f}")
    assert np.allclose(norm_lens, 1.0, atol=1e-3), "Normals are not unit length"

    # 2. Bounding Box & Centering
    min_x, max_x = vertices[:, 0].min(), vertices[:, 0].max()
    min_y, max_y = vertices[:, 1].min(), vertices[:, 1].max()
    min_z, max_z = vertices[:, 2].min(), vertices[:, 2].max()
    print(f"Extents: X=[{min_x:.6f}, {max_x:.6f}], Y=[{min_y:.6f}, {max_y:.6f}], Z=[{min_z:.6f}, {max_z:.6f}]")
    center = (vertices.min(axis=0) + vertices.max(axis=0)) / 2.0
    print(f"Center: {center}")
    assert abs(center[0]) < 1e-5, f"X not centered: {center[0]}"
    assert abs(center[1]) < 1e-5, f"Y not centered: {center[1]}"
    assert abs(center[2]) < 1e-5, f"Z not centered: {center[2]}"
    max_dim = max(max_x - min_x, max_y - min_y, max_z - min_z)
    print(f"Max dimension: {max_dim:.6f}")
    assert abs(max_dim - 1.90) < 1e-5, f"Max dimension not 1.90: {max_dim}"

    # 3. Partition bounds & Zero Crossing
    front_vts = []
    back_vts = []
    cross_faces = 0

    for fi, tri in enumerate(faces):
        tri_u = [vts[c[1], 0] for c in tri]
        if min(tri_u) < 0.5 and max(tri_u) > 0.5:
            cross_faces += 1
        if max(tri_u) <= 0.5:
            for c in tri:
                front_vts.append(c[1])
        elif min(tri_u) >= 0.5:
            for c in tri:
                back_vts.append(c[1])
        else:
            pass # crossing

    print(f"Zero crossing faces count: {cross_faces}")
    assert cross_faces == 0, f"Found {cross_faces} crossing faces across U=0.50!"

    front_u = vts[front_vts, 0]
    back_u = vts[back_vts, 0]
    print(f"Front U bounds: [{front_u.min():.6f}, {front_u.max():.6f}]")
    print(f"Back U bounds: [{back_u.min():.6f}, {back_u.max():.6f}]")
    assert front_u.min() >= 0.002 - 1e-6 and front_u.max() <= 0.498 + 1e-6
    assert back_u.min() >= 0.502 - 1e-6 and back_u.max() <= 0.998 + 1e-6

    gutter = back_u.min() - front_u.max()
    print(f"Buffer gutter between Front and Back: {gutter:.6f} (target >= 0.004000)")
    assert gutter >= 0.004 - 1e-6, f"Gutter too small: {gutter}"

    # V bounds
    print(f"V bounds: [{vts[:, 1].min():.6f}, {vts[:, 1].max():.6f}]")
    assert vts[:, 1].min() >= 0.002 - 1e-6
    assert vts[:, 1].max() <= 0.998 + 1e-6

    # 4. Planar projection formulas audit
    x_min, x_max = -0.950000, 0.950000
    y_min, y_max = -0.89166946, 0.89166946
    x_span = x_max - x_min
    y_span = y_max - y_min

    def get_u_front(x):
        return np.clip(0.002 + 0.496 * (x - x_min) / x_span, 0.002, 0.498)

    def get_u_back(x):
        return np.clip(0.502 + 0.496 * (x_max - x) / x_span, 0.502, 0.998)

    def get_v(y):
        return np.clip(0.002 + 0.996 * (y - y_min) / y_span, 0.002, 0.998)

    # Check mapping accuracy on all corners
    max_u_diff = 0.0
    max_v_diff = 0.0
    for tri in faces:
        u_vals = [vts[c[1], 0] for c in tri]
        is_front = max(u_vals) <= 0.5
        for c in tri:
            v_pt = vertices[c[0]]
            vt_pt = vts[c[1]]
            exp_u = get_u_front(v_pt[0]) if is_front else get_u_back(v_pt[0])
            exp_v = get_v(v_pt[1])
            u_diff = abs(vt_pt[0] - exp_u)
            v_diff = abs(vt_pt[1] - exp_v)
            if u_diff > max_u_diff:
                max_u_diff = u_diff
            if v_diff > max_v_diff:
                max_v_diff = v_diff

    print(f"Planar projection max deviation: delta_U={max_u_diff:.8f}, delta_V={max_v_diff:.8f}")
    assert max_u_diff < 1e-5, f"Planar U projection formula mismatch: {max_u_diff}"
    assert max_v_diff < 1e-5, f"Planar V projection formula mismatch: {max_v_diff}"

    # 5. Anti-mirroring audit
    # Front: derivative dU/dx
    xs = np.linspace(-0.95, 0.95, 100)
    du_dx_front = np.gradient(get_u_front(xs), xs)
    print(f"Front dU/dx min={du_dx_front.min():.6f}, max={du_dx_front.max():.6f}")
    assert np.all(du_dx_front > 0), "Front dU/dx is not strictly positive!"

    # Back: derivative dU/dx
    du_dx_back = np.gradient(get_u_back(xs), xs)
    print(f"Back dU/dx min={du_dx_back.min():.6f}, max={du_dx_back.max():.6f}")
    assert np.all(du_dx_back < 0), "Back dU/dx is not strictly negative!"

    # Empirical visual orientation check:
    # On the front (Z > 0.05):
    # Vertex on screen-left (X < -0.3) vs screen-right (X > 0.3)
    front_mask = (vertices[:, 2] > 0.05) & (abs(vertices[:, 1]) < 0.2)
    left_front_mask = front_mask & (vertices[:, 0] < -0.3)
    right_front_mask = front_mask & (vertices[:, 0] > 0.3)

    # Find faces referencing these vertices
    left_front_vts = []
    right_front_vts = []
    for tri in faces:
        if max(vts[c[1], 0] for c in tri) <= 0.5:
            for c in tri:
                if left_front_mask[c[0]]:
                    left_front_vts.append(c[1])
                if right_front_mask[c[0]]:
                    right_front_vts.append(c[1])

    left_u_mean = vts[left_front_vts, 0].mean()
    right_u_mean = vts[right_front_vts, 0].mean()
    print(f"Front torso: Left (X < -0.3) U_mean={left_u_mean:.4f}, Right (X > 0.3) U_mean={right_u_mean:.4f}")
    assert left_u_mean < right_u_mean, "Front is mirrored!"

    # On the back (Z < -0.05):
    # When viewed from behind:
    # A viewer looking at the rear sees world +X on the left, and world -X on the right.
    # So viewer-left is world +X (X > 0.3), viewer-right is world -X (X < -0.3).
    back_mask = (vertices[:, 2] < -0.05) & (abs(vertices[:, 1]) < 0.2)
    left_back_mask = back_mask & (vertices[:, 0] > 0.3) # viewer left
    right_back_mask = back_mask & (vertices[:, 0] < -0.3) # viewer right

    left_back_vts = []
    right_back_vts = []
    for tri in faces:
        if min(vts[c[1], 0] for c in tri) >= 0.5:
            for c in tri:
                if left_back_mask[c[0]]:
                    left_back_vts.append(c[1])
                if right_back_mask[c[0]]:
                    right_back_vts.append(c[1])

    viewer_left_u_mean = vts[left_back_vts, 0].mean()
    viewer_right_u_mean = vts[right_back_vts, 0].mean()
    print(f"Back torso: Viewer-Left (world X > 0.3) U_mean={viewer_left_u_mean:.4f}, Viewer-Right (world X < -0.3) U_mean={viewer_right_u_mean:.4f}")
    assert viewer_left_u_mean < viewer_right_u_mean, "Back is mirrored when viewed from behind!"

    # 6. Anatomical placement checks:
    # Bottom hem:
    hem_mask = (vertices[:, 1] < -0.80) & (vertices[:, 2] > 0.0)
    hem_vts = [c[1] for tri in faces if max(vts[c[1], 0] for c in tri) <= 0.5 for c in tri if hem_mask[c[0]]]
    hem_v_max = vts[hem_vts, 1].max()
    print(f"Bottom hem (Y < -0.80, Z > 0) max V: {hem_v_max:.4f}")
    assert hem_v_max <= 0.1500, f"Bottom hem exceeds V=0.150: {hem_v_max}"

    # Center chest / sternum:
    chest_mask = (abs(vertices[:, 0]) < 0.05) & (abs(vertices[:, 1] - 0.2662) < 0.05) & (vertices[:, 2] > 0.10)
    chest_vts = [c[1] for tri in faces if max(vts[c[1], 0] for c in tri) <= 0.5 for c in tri if chest_mask[c[0]]]
    chest_v_mean = vts[chest_vts, 1].mean()
    print(f"Center chest (X~0, Y~0.2662, Z>0.10) mean V: {chest_v_mean:.4f}")
    assert abs(chest_v_mean - 0.650) < 0.02, f"Center chest deviates from V=0.650: {chest_v_mean}"

    # 7. Check references of all 5,761 VT lines
    all_referenced_vts = set(c[1] for tri in faces for c in tri)
    print(f"Referenced VT count: {len(all_referenced_vts)} / {len(vts)}")
    assert len(all_referenced_vts) == 5761, f"Not all VTs are referenced: {len(all_referenced_vts)}"
    assert min(all_referenced_vts) == 0 and max(all_referenced_vts) == 5760

    print("ALL AUDIT CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    audit_planar()
