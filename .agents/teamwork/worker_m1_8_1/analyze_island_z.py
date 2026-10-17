import sys
from collections import defaultdict

input_path = "prep_models/various size/Low_T-shirt.obj"

# Let's inspect the 3D normals and positions of all 15 islands
from test_face_order import islands, face_to_island, norm_v, uvs, vertices, faces

print("Detailed Island Analysis:")
for idx, comp in enumerate(islands):
    comp_uv_indices = set()
    comp_v_indices = set()
    for f in comp:
        for corner in faces[f]:
            comp_v_indices.add(corner[0])
            comp_uv_indices.add(corner[1])
    
    comp_uvs = [uvs[i] for i in comp_uv_indices]
    comp_verts = [norm_v[i] for i in comp_v_indices]
    
    min_u = min(u[0] for u in comp_uvs)
    max_u = max(u[0] for u in comp_uvs)
    min_v = min(u[1] for u in comp_uvs)
    max_v = max(u[1] for u in comp_uvs)
    
    min_x = min(v[0] for v in comp_verts)
    max_x = max(v[0] for v in comp_verts)
    min_y = min(v[1] for v in comp_verts)
    max_y = max(v[1] for v in comp_verts)
    min_z = min(v[2] for v in comp_verts)
    max_z = max(v[2] for v in comp_verts)
    
    # Check front vs back distribution of vertices
    front_verts = sum(1 for v in comp_verts if v[2] > 0)
    back_verts = sum(1 for v in comp_verts if v[2] < 0)
    
    print(f"Island {idx+1:2d} ({len(comp):4d} faces):")
    print(f"  UV: U [{min_u:.4f}, {max_u:.4f}], V [{min_v:.4f}, {max_v:.4f}]")
    print(f"  3D: X [{min_x:.3f}, {max_x:.3f}], Y [{min_y:.3f}, {max_y:.3f}], Z [{min_z:.3f}, {max_z:.3f}]")
    print(f"  Verts: {len(comp_v_indices)} total, {front_verts} with Z>0, {back_verts} with Z<0")
