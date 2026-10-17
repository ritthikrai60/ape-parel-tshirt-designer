import sys
from test_anti_mirror_order import check_anti_mirror, faces, face_to_island

orig_tris = []
for f_idx, f in enumerate(faces):
    if len(f) == 4:
        tris = [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]
    else:
        tris = [f]
    orig_tris.extend(tris)

print("Testing Triangles with ORIGINAL face order:")
check_anti_mirror(orig_tris)
