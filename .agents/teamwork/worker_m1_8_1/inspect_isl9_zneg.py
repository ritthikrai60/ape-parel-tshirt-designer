import sys
from test_face_order import norm_v, uvs, faces, face_to_island, islands

isl9 = islands[8] # Island 9 (Front Torso)

z_neg_corners = []
for f_idx in isl9:
    for c in faces[f_idx]:
        v_idx, vt_idx, _ = c
        x, y, z = norm_v[v_idx]
        if abs(x) <= 0.52 and z < -0.02:
            z_neg_corners.append((v_idx, vt_idx, x, y, z, uvs[vt_idx][0], uvs[vt_idx][1]))

print(f"Island 9 has {len(z_neg_corners)} corners with |x|<=0.52 and z < -0.02:")
for c in z_neg_corners[:20]:
    print(f"  v={c[0]}, vt={c[1]}, pos=({c[2]:.3f}, {c[3]:.3f}, {c[4]:.3f}), uv=({c[5]:.4f}, {c[6]:.4f})")

min_z = min(c[4] for c in z_neg_corners)
max_z = max(c[4] for c in z_neg_corners)
min_y = min(c[3] for c in z_neg_corners)
max_y = max(c[3] for c in z_neg_corners)
min_x = min(c[2] for c in z_neg_corners)
max_x = max(c[2] for c in z_neg_corners)
print(f"Bounds of these corners: X [{min_x:.3f}, {max_x:.3f}], Y [{min_y:.3f}, {max_y:.3f}], Z [{min_z:.3f}, {max_z:.3f}]")
