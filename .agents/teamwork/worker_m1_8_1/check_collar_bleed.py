import sys
from test_face_order import norm_v, uvs, faces, face_to_island

for isl_idx in [0, 7]: # Islands 1 and 8 (indices 0 and 7)
    bleed_back = 0
    bleed_front = 0
    for f_idx, f in enumerate(faces):
        if face_to_island[f_idx] == isl_idx:
            for c in f:
                v_idx, vt_idx, _ = c
                x, y, z = norm_v[v_idx]
                u, v = uvs[vt_idx]
                if abs(x) <= 0.52:
                    if z > 0.02 and u >= 0.5:
                        bleed_front += 1
                    elif z < -0.02 and u < 0.5:
                        bleed_back += 1

    print(f"Island {isl_idx+1}: with raw u: bleed_front={bleed_front}, bleed_back={bleed_back}")
