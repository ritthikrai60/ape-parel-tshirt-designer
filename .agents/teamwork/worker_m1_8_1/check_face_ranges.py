import sys
from collections import defaultdict

input_path = "prep_models/various size/Low_T-shirt.obj"

# Let's check face indices for each island in Low_T-shirt.obj
# and what order the islands appear in the file.
from test_face_order import islands, face_to_island

for isl_idx, comp in enumerate(islands):
    min_f = min(comp)
    max_f = max(comp)
    print(f"Island {isl_idx+1:2d}: {len(comp):4d} faces, face range [{min_f:4d}, {max_f:4d}]")
