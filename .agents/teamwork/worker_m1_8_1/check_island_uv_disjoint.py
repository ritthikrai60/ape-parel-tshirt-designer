import sys
from test_face_order import islands, faces

# Check if any vt index is shared across islands
island_vts = []
all_vts = set()
overlap = False

for idx, comp in enumerate(islands):
    comp_vts = set()
    for f in comp:
        for c in faces[f]:
            comp_vts.add(c[1])
    island_vts.append(comp_vts)
    if all_vts.intersection(comp_vts):
        overlap = True
        print(f"Overlap detected at island {idx+1}!")
    all_vts.update(comp_vts)

print(f"Total unique UVs across all islands: {len(all_vts)}")
print(f"Any overlap between islands: {overlap}")
