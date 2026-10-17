import sys
import os
import math
from collections import defaultdict

def stress_test():
    target_path = r"d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj"
    print("=== ADVERSARIAL STRESS-TEST & TOPOLOGY INVESTIGATION ===")

    v_list = []
    vt_list = []
    vn_list = []
    f_list = []

    with open(target_path, "r", encoding="utf-8") as f:
        for line in f:
            line_str = line.strip()
            if not line_str or line_str.startswith("#"):
                continue
            tokens = line_str.split()
            cmd = tokens[0]
            if cmd == "v":
                v_list.append((float(tokens[1]), float(tokens[2]), float(tokens[3])))
            elif cmd == "vt":
                vt_list.append((float(tokens[1]), float(tokens[2])))
            elif cmd == "vn":
                vn_list.append((float(tokens[1]), float(tokens[2]), float(tokens[3])))
            elif cmd == "f":
                face = []
                for fv in tokens[1:]:
                    parts = fv.split("/")
                    face.append((int(parts[0]), int(parts[1]), int(parts[2])))
                f_list.append(face)

    # 1. Investigate the 54 welded side seam vertices
    print("\n--- 1. Side Seams Vertex Sharing Verification ---")
    # Identify which faces belong to Front Torso vs Back Torso
    # Front Torso has u in [0, 0.5], Back Torso has u in [0.5, 1.0]
    front_v_set = set()
    back_v_set = set()
    for f in f_list:
        us = [vt_list[fv[1]-1][0] for fv in f]
        max_u = max(us)
        min_u = min(us)
        if max_u <= 0.5:
            for fv in f:
                front_v_set.add(fv[0])
        elif min_u >= 0.5:
            for fv in f:
                back_v_set.add(fv[0])

    shared_v = front_v_set.intersection(back_v_set)
    print(f"Total vertices in front partition: {len(front_v_set)}")
    print(f"Total vertices in back partition: {len(back_v_set)}")
    print(f"Vertices shared between front and back partitions: {len(shared_v)}")
    
    # Are these shared vertices along the side seams and shoulders?
    # Let's inspect their spatial coordinates (X, Y, Z)
    left_seam_v = [v_idx for v_idx in shared_v if v_list[v_idx-1][0] < -0.2]
    right_seam_v = [v_idx for v_idx in shared_v if v_list[v_idx-1][0] > 0.2]
    shoulder_seam_v = [v_idx for v_idx in shared_v if abs(v_list[v_idx-1][0]) <= 0.2]
    
    print(f"  Shared vertices on Left side/sleeve seam (X < -0.2): {len(left_seam_v)}")
    print(f"  Shared vertices on Right side/sleeve seam (X > 0.2): {len(right_seam_v)}")
    print(f"  Shared vertices near Collar/Shoulder (|X| <= 0.2): {len(shoulder_seam_v)}")
    
    # For shared vertices, do they have distinct UV coordinates?
    # (i.e. UV seam is cut so front has front UV, back has back UV, but 3D vertex is shared)
    uv_split_count = 0
    for v_idx in shared_v:
        # Collect all vt indices used by this vertex
        vt_for_v = set()
        for f in f_list:
            for fv in f:
                if fv[0] == v_idx:
                    vt_for_v.add(fv[1])
        if len(vt_for_v) > 1:
            uv_split_count += 1
    print(f"Shared vertices with split UV coordinates (proper UV seam unwrap): {uv_split_count} / {len(shared_v)}")

    # 2. Normal consistency / Winding Order check
    print("\n--- 2. Face Winding & Normal Consistency ---")
    flipped_normal_count = 0
    for f in f_list:
        v0 = v_list[f[0][0]-1]
        v1 = v_list[f[1][0]-1]
        v2 = v_list[f[2][0]-1]
        
        # Computed geometric normal
        e1 = (v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2])
        e2 = (v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2])
        cross = (
            e1[1]*e2[2] - e1[2]*e2[1],
            e1[2]*e2[0] - e1[0]*e2[2],
            e1[0]*e2[1] - e1[1]*e2[0]
        )
        geom_norm_mag = math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2)
        if geom_norm_mag < 1e-12:
            continue
        gn = (cross[0]/geom_norm_mag, cross[1]/geom_norm_mag, cross[2]/geom_norm_mag)
        
        # Average vertex normal
        avg_vn = [0.0, 0.0, 0.0]
        for fv in f:
            vn = vn_list[fv[2]-1]
            avg_vn[0] += vn[0]
            avg_vn[1] += vn[1]
            avg_vn[2] += vn[2]
        avg_vn_mag = math.sqrt(avg_vn[0]**2 + avg_vn[1]**2 + avg_vn[2]**2)
        if avg_vn_mag > 1e-6:
            avn = (avg_vn[0]/avg_vn_mag, avg_vn[1]/avg_vn_mag, avg_vn[2]/avg_vn_mag)
            dot = gn[0]*avn[0] + gn[1]*avn[1] + gn[2]*avn[2]
            if dot < 0: # Opposing direction!
                flipped_normal_count += 1
                
    print(f"Faces with opposing geometric normal vs vertex normal: {flipped_normal_count} / {len(f_list)}")

    # 3. Anti-Mirroring & Horizontal Mapping Direction
    print("\n--- 3. Comprehensive Horizontal Anti-Mirroring Test ---")
    # Scan at multiple Y heights: Chest (y in [0.0, 0.3]), Waist (y in [-0.5, -0.2])
    test_zones = [
        ("Upper Chest", 0.1, 0.3),
        ("Mid Chest", -0.1, 0.1),
        ("Waist", -0.4, -0.2),
        ("Hem", -0.7, -0.5),
    ]
    for zone_name, y_low, y_high in test_zones:
        # Front faces (Z > 0.05)
        zone_front_faces = [
            f for f in f_list
            if all(y_low <= v_list[fv[0]-1][1] <= y_high and v_list[fv[0]-1][2] > 0.05 and vt_list[fv[1]-1][0] < 0.5 for fv in f)
        ]
        # Check if dU / dX > 0 (screen left -X -> lower U, screen right +X -> higher U)
        front_correct_slopes = 0
        front_sampled = 0
        for f in zone_front_faces:
            # Sort 3 vertices by X
            sorted_v = sorted(f, key=lambda fv: v_list[fv[0]-1][0])
            dx = v_list[sorted_v[2][0]-1][0] - v_list[sorted_v[0][0]-1][0]
            du = vt_list[sorted_v[2][1]-1][0] - vt_list[sorted_v[0][1]-1][0]
            if dx > 0.01:
                front_sampled += 1
                if du > 0:
                    front_correct_slopes += 1
                    
        # Back faces (Z < -0.05)
        # When viewing the back from behind (camera looking along +Z), viewer-left is +X, viewer-right is -X.
        # ape-parel customizer maps back 2D canvas left-to-right.
        # Let's check worker's measured anti-mirroring:
        zone_back_faces = [
            f for f in f_list
            if all(y_low <= v_list[fv[0]-1][1] <= y_high and v_list[fv[0]-1][2] < -0.05 and vt_list[fv[1]-1][0] >= 0.5 for fv in f)
        ]
        back_correct_slopes = 0
        back_sampled = 0
        for f in zone_back_faces:
            sorted_v = sorted(f, key=lambda fv: v_list[fv[0]-1][0])
            dx = v_list[sorted_v[2][0]-1][0] - v_list[sorted_v[0][0]-1][0]
            du = vt_list[sorted_v[2][1]-1][0] - vt_list[sorted_v[0][1]-1][0]
            if dx > 0.01:
                back_sampled += 1
                if du > 0:
                    back_correct_slopes += 1
                    
        print(f"  [{zone_name}] Front: {front_correct_slopes}/{front_sampled} faces have positive dU/dX")
        print(f"  [{zone_name}] Back:  {back_correct_slopes}/{back_sampled} faces have positive dU/dX")

    # 4. Bilinear texture bleed margin analysis
    print("\n--- 4. Bilinear Texture Bleed Margin Analysis ---")
    front_max_u = max(vt_list[fv[1]-1][0] for f in f_list for fv in f if vt_list[fv[1]-1][0] < 0.5)
    back_min_u = min(vt_list[fv[1]-1][0] for f in f_list for fv in f if vt_list[fv[1]-1][0] >= 0.5)
    margin = back_min_u - front_max_u
    pixel_margin_1024 = margin * 1024.0
    pixel_margin_2048 = margin * 2048.0
    print(f"Front max U: {front_max_u:.6f}")
    print(f"Back min U:  {back_min_u:.6f}")
    print(f"Buffer gutter between partitions: {margin:.6f} UV units")
    print(f"At 1024x1024 resolution: {pixel_margin_1024:.2f} pixels safety gutter")
    print(f"At 2048x2048 resolution: {pixel_margin_2048:.2f} pixels safety gutter")
    if margin >= 0.003:
        print("PASS: Margin >= 0.003 (> 3 pixels at 1024x1024), safely precluding bilinear filtering bleed across partitions.")
    else:
        print("FAIL: Margin is too small for texture filtering.")

if __name__ == "__main__":
    stress_test()
