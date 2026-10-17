import numpy as np
from collections import defaultdict

def audit_side_seams():
    target_path = r"d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj"
    raw_path = r"d:\Coding Projects\ape-parel tshirt\prep_models\various size\Low_T-shirt.obj"

    # In target OBJ, find all 3D vertices that are referenced by BOTH Front triangles (U < 0.5) and Back triangles (U >= 0.5)
    triangles = []
    v_pos = []
    vt_coords = []

    with open(target_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            p = line.split()
            if p[0] == 'v':
                v_pos.append([float(p[1]), float(p[2]), float(p[3])])
            elif p[0] == 'vt':
                vt_coords.append([float(p[1]), float(p[2])])
            elif p[0] == 'f':
                tri = []
                for corner in p[1:]:
                    toks = corner.split('/')
                    tri.append((int(toks[0]) - 1, int(toks[1]) - 1))
                triangles.append(tri)

    vt_coords = np.array(vt_coords)
    v_to_partitions = defaultdict(set)
    v_to_vts = defaultdict(set)

    for tri in triangles:
        u_vals = [vt_coords[c[1]][0] for c in tri]
        is_front = all(u < 0.50 for u in u_vals)
        is_back = all(u >= 0.50 for u in u_vals)
        part = 'FRONT' if is_front else ('BACK' if is_back else 'CROSS')
        for c in tri:
            v_to_partitions[c[0]].add(part)
            v_to_vts[c[0]].add(c[1])

    boundary_vertices = [v for v, parts in v_to_partitions.items() if 'FRONT' in parts and 'BACK' in parts]
    print(f"Total 3D Boundary / Seam Vertices shared between Front & Back meshes: {len(boundary_vertices)}")
    
    # Check if these vertices have separate UV coordinates for Front and Back
    properly_decoupled = 0
    for v in boundary_vertices:
        vts = list(v_to_vts[v])
        front_vts = [vt for vt in vts if vt_coords[vt][0] < 0.50]
        back_vts = [vt for vt in vts if vt_coords[vt][0] >= 0.50]
        if len(front_vts) >= 1 and len(back_vts) >= 1:
            properly_decoupled += 1

    print(f"Boundary vertices with decoupled UV coordinates (Front U < 0.5, Back U >= 0.5): {properly_decoupled}")
    print(f"Decoupled percentage: {properly_decoupled / len(boundary_vertices) * 100:.2f}%")

if __name__ == "__main__":
    audit_side_seams()
