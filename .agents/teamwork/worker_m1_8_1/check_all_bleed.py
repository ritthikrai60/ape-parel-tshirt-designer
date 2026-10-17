import sys
from test_face_order import norm_v, uvs, faces, face_to_island, islands

for isl_idx in range(len(islands)):
    z_pos_count = 0
    z_neg_count = 0
    for f_idx in islands[isl_idx]:
        for c in faces[f_idx]:
            v_idx, vt_idx, _ = c
            x, y, z = norm_v[v_idx]
            if abs(x) <= 0.52:
                if z > 0.02:
                    z_pos_count += 1
                elif z < -0.02:
                    z_neg_count += 1
    print(f"Island {isl_idx+1:2d}: inside |x|<=0.52: Z>0.02 has {z_pos_count:4d} corners, Z<-0.02 has {z_neg_count:4d} corners")
