import sys

from test_face_order import islands, faces, vertices, uvs

isl9 = islands[8]
isl12 = islands[11]

# For each of the 54 shared vertices, get vt indices used in isl9 and isl12
v_to_isl9_vt = {}
for f in isl9:
    for c in faces[f]:
        v_to_isl9_vt[c[0]] = c[1]

v_to_isl12_vt = {}
for f in isl12:
    for c in faces[f]:
        v_to_isl12_vt[c[0]] = c[1]

shared = set(v_to_isl9_vt.keys()).intersection(set(v_to_isl12_vt.keys()))
print(f"Shared vertices count: {len(shared)}")

any_shared_vt = False
for v_idx in shared:
    vt9 = v_to_isl9_vt[v_idx]
    vt12 = v_to_isl12_vt[v_idx]
    if vt9 == vt12:
        any_shared_vt = True

print(f"Any shared vt between Front and Back at seam vertices: {any_shared_vt}")
