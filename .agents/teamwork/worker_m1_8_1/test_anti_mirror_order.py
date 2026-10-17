import sys
from test_transformation import new_vertices, new_uvs, triangles, faces, face_to_island

# Check anti-mirroring with triangles ordered:
# Option A: original order triangulated
# Option B: Torso faces first

def check_anti_mirror(tri_list):
    viewerLeftU = None
    viewerRightU = None
    frontLeftU = None
    frontRightU = None

    for tri in tri_list:
        for c in tri:
            v_idx, vt_idx, _ = c
            x, y, z = new_vertices[v_idx]
            u, v = new_uvs[vt_idx]
            if abs(y) < 0.1:
                if z > 0.1:
                    if x < -0.3 and frontLeftU is None: frontLeftU = u
                    if x > 0.3 and frontRightU is None: frontRightU = u
                elif z < -0.1:
                    if x > 0.3 and viewerLeftU is None: viewerLeftU = u
                    if x < -0.3 and viewerRightU is None: viewerRightU = u

    print(f"  Front Left U: {frontLeftU:.4f}, Front Right U: {frontRightU:.4f}")
    print(f"  Front Left < Front Right: {frontLeftU < frontRightU}")
    print(f"  Viewer Left U: {viewerLeftU:.4f}, Viewer Right U: {viewerRightU:.4f}")
    print(f"  Viewer Left < Viewer Right: {viewerLeftU < viewerRightU}")
    print(f"  Viewer Left close to 0.58: {abs(viewerLeftU - 0.58) < 0.05}")
    print(f"  Viewer Right close to 0.92: {abs(viewerRightU - 0.92) < 0.05}")

print("Testing Triangles with Torso faces first:")
# Order: Island 9 (Front Torso) and Island 12 (Back Torso) first, then other islands
torso_tris = []
other_tris = []

for f_idx, f in enumerate(faces):
    isl = face_to_island[f_idx]
    if len(f) == 4:
        tris = [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]
    else:
        tris = [f]
    if isl in (8, 11): # Island 9 and 12
        torso_tris.extend(tris)
    else:
        other_tris.extend(tris)

ordered_tris = torso_tris + other_tris
check_anti_mirror(ordered_tris)
