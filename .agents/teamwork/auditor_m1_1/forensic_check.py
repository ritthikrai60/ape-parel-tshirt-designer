import math, sys
from collections import defaultdict

obj_path = r'public/models/tshirt.obj'

with open(obj_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

v_list = []
vt_list = []
vn_list = []
faces = [] # list of [(v_idx, vt_idx, vn_idx), ...]
tag_counts = defaultdict(int)
comments = []

for line in lines:
    line_s = line.strip()
    if not line_s:
        continue
    if line_s.startswith('#'):
        tag_counts['#'] += 1
        comments.append(line_s)
        continue
    parts = line_s.split()
    tag = parts[0]
    tag_counts[tag] += 1
    if tag == 'v':
        v_list.append([float(x) for x in parts[1:4]])
    elif tag == 'vt':
        vt_list.append([float(x) for x in parts[1:3]])
    elif tag == 'vn':
        vn_list.append([float(x) for x in parts[1:4]])
    elif tag == 'f':
        corners = []
        for p in parts[1:]:
            sub = [int(x) if x else None for x in p.split('/')]
            corners.append(sub)
        faces.append(corners)

print("=== 1. FILE STRUCTURE & TAG COUNTS ===")
for k in sorted(tag_counts.keys()):
    print(f"Tag '{k}': {tag_counts[k]}")
print(f"Comments: {comments[:5]}")

print("\n=== 2. ELEMENT COUNTS ===")
print(f"Total vertices (v): {len(v_list)}")
print(f"Total UVs (vt): {len(vt_list)}")
print(f"Total normals (vn): {len(vn_list)}")
print(f"Total faces (f): {len(faces)}")

all_triangles = all(len(f) == 3 for f in faces)
print(f"All faces are triangles (3 corners): {all_triangles}")

v_max = len(v_list)
vt_max = len(vt_list)
vn_max = len(vn_list)
referenced_v = set()
referenced_vt = set()
referenced_vn = set()

for f in faces:
    for c in f:
        assert 1 <= c[0] <= v_max, f"v out of bounds: {c[0]}"
        assert 1 <= c[1] <= vt_max, f"vt out of bounds: {c[1]}"
        assert 1 <= c[2] <= vn_max, f"vn out of bounds: {c[2]}"
        referenced_v.add(c[0])
        referenced_vt.add(c[1])
        referenced_vn.add(c[2])

loose_v = set(range(1, v_max + 1)) - referenced_v
unused_vt = set(range(1, vt_max + 1)) - referenced_vt
unused_vn = set(range(1, vn_max + 1)) - referenced_vn
print(f"Loose vertices (unreferenced): {len(loose_v)}")
print(f"Unused UV coordinates: {len(unused_vt)}")
print(f"Unused Normals: {len(unused_vn)}")

print("\n=== 3. TOPOLOGY & MESH INTEGRITY ===")
edge_to_faces = defaultdict(list)
for fi, f in enumerate(faces):
    v_idxs = [c[0] for c in f]
    for i in range(3):
        v1, v2 = v_idxs[i], v_idxs[(i+1)%3]
        e = (min(v1, v2), max(v1, v2))
        edge_to_faces[e].append(fi)

boundary_edges = [e for e, fl in edge_to_faces.items() if len(fl) == 1]
manifold_edges = [e for e, fl in edge_to_faces.items() if len(fl) == 2]
non_manifold_edges = [e for e, fl in edge_to_faces.items() if len(fl) > 2]

print(f"Total unique edges: {len(edge_to_faces)}")
print(f"Manifold edges (2 faces): {len(manifold_edges)}")
print(f"Boundary edges (1 face): {len(boundary_edges)}")
print(f"Non-manifold edges (>2 faces): {len(non_manifold_edges)}")

# Boundary edge connected components (boundary loops)
boundary_adj = defaultdict(set)
for v1, v2 in boundary_edges:
    boundary_adj[v1].add(v2)
    boundary_adj[v2].add(v1)

b_visited = set()
boundary_loops = []
for bv in boundary_adj.keys():
    if bv not in b_visited:
        b_comp = []
        stack = [bv]
        b_visited.add(bv)
        while stack:
            curr = stack.pop()
            b_comp.append(curr)
            for nbr in boundary_adj[curr]:
                if nbr not in b_visited:
                    b_visited.add(nbr)
                    stack.append(nbr)
        boundary_loops.append(b_comp)

print(f"Boundary loops / openings count: {len(boundary_loops)}")
for idx, loop in enumerate(boundary_loops):
    ys = [v_list[i-1][1] for i in loop]
    xs = [v_list[i-1][0] for i in loop]
    zs = [v_list[i-1][2] for i in loop]
    print(f" Boundary Opening {idx+1}: {len(loop)} vertices, Y:[{min(ys):.3f}, {max(ys):.3f}], X:[{min(xs):.3f}, {max(xs):.3f}], Z:[{min(zs):.3f}, {max(zs):.3f}]")

# Connected components (mesh islands)
adj = defaultdict(set)
for v1, v2 in edge_to_faces.keys():
    adj[v1].add(v2)
    adj[v2].add(v1)

visited = set()
islands = []
island_faces = []
for v_idx in range(1, v_max + 1):
    if v_idx not in visited:
        comp = []
        stack = [v_idx]
        visited.add(v_idx)
        while stack:
            curr = stack.pop()
            comp.append(curr)
            for nbr in adj[curr]:
                if nbr not in visited:
                    visited.add(nbr)
                    stack.append(nbr)
        comp_set = set(comp)
        c_faces = [fi for fi, f in enumerate(faces) if f[0][0] in comp_set]
        islands.append(comp)
        island_faces.append(c_faces)

print(f"\n=== 4. MESH SHELLS / ISLANDS ===")
print(f"Total mesh islands: {len(islands)}")
for idx, comp in enumerate(islands):
    xs = [v_list[i-1][0] for i in comp]
    ys = [v_list[i-1][1] for i in comp]
    zs = [v_list[i-1][2] for i in comp]
    print(f" Island {idx+1}: {len(comp)} verts, {len(island_faces[idx])} faces, X:[{min(xs):.3f}, {max(xs):.3f}], Y:[{min(ys):.3f}, {max(ys):.3f}], Z:[{min(zs):.3f}, {max(zs):.3f}]")

print("\n=== 5. TRIANGLE GEOMETRY & DEGENERACY AUDIT ===")
def calc_area(p1, p2, p3):
    ax, ay, az = p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]
    bx, by, bz = p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]
    cx = ay*bz - az*by
    cy = az*bx - ax*bz
    cz = ax*by - ay*bx
    return 0.5 * math.sqrt(cx*cx + cy*cy + cz*cz)

areas = []
degenerate_faces = []
for fi, f in enumerate(faces):
    p1 = v_list[f[0][0]-1]
    p2 = v_list[f[1][0]-1]
    p3 = v_list[f[2][0]-1]
    area = calc_area(p1, p2, p3)
    areas.append(area)
    if area < 1e-8:
        degenerate_faces.append(fi)

print(f"Total faces checked: {len(areas)}")
print(f"Min face area: {min(areas):.8f}")
print(f"Max face area: {max(areas):.8f}")
print(f"Mean face area: {sum(areas)/len(areas):.8f}")
print(f"Degenerate faces (area < 1e-8): {len(degenerate_faces)}")

print("\n=== 6. UV PARTITION & LOOP SPLIT AUDIT ===")
cross_faces = []
front_faces = []
back_faces = []
ambiguous_faces = []

front_bleed_corners = 0
back_bleed_corners = 0

for fi, f in enumerate(faces):
    us = [vt_list[c[1]-1][0] for c in f]
    vs = [vt_list[c[1]-1][1] for c in f]
    
    # Check if face crosses u=0.5
    min_u = min(us)
    max_u = max(us)
    
    if min_u < 0.49999 and max_u > 0.50001:
        cross_faces.append((fi, us))
    elif max_u <= 0.50001:
        front_faces.append(fi)
    elif min_u >= 0.49999:
        back_faces.append(fi)
    else:
        ambiguous_faces.append(fi)

print(f"Front faces (U <= 0.50): {len(front_faces)}")
print(f"Back faces (U >= 0.50): {len(back_faces)}")
print(f"Cross faces (U spanning across 0.5): {len(cross_faces)}")
print(f"Ambiguous faces: {len(ambiguous_faces)}")

# Check seam vertices sharing:
# Do seam vertices at z approx 0 have both front and back faces using them?
seam_verts = [i for i, v in enumerate(v_list, 1) if abs(v[2]) < 1e-4]
print(f"\nVertices near Z=0 (potential seam vertices): {len(seam_verts)}")

# Check if any vertex is shared by both front and back faces (evidence of welded mesh with loop UVs)
vert_to_faces = defaultdict(list)
for fi, f in enumerate(faces):
    for c in f:
        vert_to_faces[c[0]].append(fi)

welded_seam_verts = []
for v_idx in seam_verts:
    f_list = vert_to_faces[v_idx]
    has_front = any(fi in set(front_faces) for fi in f_list)
    has_back = any(fi in set(back_faces) for fi in f_list)
    if has_front and has_back:
        welded_seam_verts.append(v_idx)

print(f"Seam vertices shared by BOTH front and back faces (welded manifold seams): {len(welded_seam_verts)}")

# For these welded seam vertices, check their UV coordinates across face corners
split_uv_verified = True
for v_idx in welded_seam_verts:
    # Get all (vt, fi) pairs for this vertex
    vt_used = []
    for fi in vert_to_faces[v_idx]:
        for c in faces[fi]:
            if c[0] == v_idx:
                vt_used.append((c[1], vt_list[c[1]-1][0], fi in set(front_faces)))
    front_us = [u for vt, u, is_f in vt_used if is_f]
    back_us = [u for vt, u, is_f in vt_used if not is_f]
    if any(u > 0.5 for u in front_us) or any(u < 0.5 for u in back_us):
        split_uv_verified = False

print(f"Loop UV split on welded seam vertices verified (front U <= 0.5, back U >= 0.5): {split_uv_verified}")

# Check Anti-mirroring
# Chest center / sides
front_chest_verts = [v_idx for v_idx in range(1, v_max+1) if v_list[v_idx-1][2] > 0.1 and -0.2 < v_list[v_idx-1][1] < 0.2]
back_chest_verts = [v_idx for v_idx in range(1, v_max+1) if v_list[v_idx-1][2] < -0.1 and -0.2 < v_list[v_idx-1][1] < 0.2]

# Let's inspect x vs u correlation
# Front: as x increases (left to right from front viewpoint, x goes from negative to positive?),
# Wait, let's see how x relates to U in front and back faces
f_x_u = []
for fi in front_faces:
    for c in faces[fi]:
        f_x_u.append((v_list[c[0]-1][0], vt_list[c[1]-1][0]))

b_x_u = []
for fi in back_faces:
    for c in faces[fi]:
        b_x_u.append((v_list[c[0]-1][0], vt_list[c[1]-1][0]))

# Check correlation: when viewing front (looking towards -Z), viewer right is model +X.
# In UV space, U goes 0 -> 0.5 (left to right).
# Does +X have higher U on front?
# Let's check min and max U for negative X vs positive X
f_neg_x_u = [u for x, u in f_x_u if x < -0.2]
f_pos_x_u = [u for x, u in f_x_u if x > 0.2]
print(f"Front U for X < -0.2 (model right): mean = {sum(f_neg_x_u)/len(f_neg_x_u):.4f}")
print(f"Front U for X > +0.2 (model left): mean = {sum(f_pos_x_u)/len(f_pos_x_u):.4f}")

b_neg_x_u = [u for x, u in b_x_u if x < -0.2]
b_pos_x_u = [u for x, u in b_x_u if x > 0.2]
print(f"Back U for X < -0.2: mean = {sum(b_neg_x_u)/len(b_neg_x_u):.4f}")
print(f"Back U for X > +0.2: mean = {sum(b_pos_x_u)/len(b_pos_x_u):.4f}")

print("\n=== 7. OVERALL INTEGRITY SUMMARY ===")
clean = True
if len(loose_v) != 0:
    print("FAIL: Loose vertices detected!"); clean = False
if len(cross_faces) != 0:
    print("FAIL: Cross-faces detected!"); clean = False
if len(degenerate_faces) != 0:
    print("FAIL: Degenerate faces detected!"); clean = False
if len(non_manifold_edges) != 0:
    print("FAIL: Non-manifold edges detected!"); clean = False
if len(faces) != 2680:
    print(f"FAIL: Expected 2680 faces, got {len(faces)}"); clean = False
if len(boundary_edges) != 244:
    print(f"FAIL: Expected 244 boundary edges, got {len(boundary_edges)}"); clean = False
if len(islands) != 4:
    print(f"FAIL: Expected 4 mesh islands, got {len(islands)}"); clean = False
if not split_uv_verified:
    print("FAIL: Seam UV splitting failed!"); clean = False

print(f"FORENSIC CHECK VERDICT: {'CLEAN' if clean else 'INTEGRITY VIOLATION'}")
