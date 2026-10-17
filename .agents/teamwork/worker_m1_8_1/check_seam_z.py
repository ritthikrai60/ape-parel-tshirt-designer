import sys

input_path = "prep_models/various size/Low_T-shirt.obj"

from test_face_order import islands, faces, vertices

isl9 = islands[8] # Front
isl12 = islands[11] # Back

# Shared vertices between Front and Back (the side seams)
v_isl9 = set(c[0] for f in isl9 for c in faces[f])
v_isl12 = set(c[0] for f in isl12 for c in faces[f])
shared_v = v_isl9.intersection(v_isl12)

print(f"Shared vertices between Front and Back (side seams): {len(shared_v)}")
shared_z = [vertices[i][2] for i in shared_v]
print(f"Original side seam Z range: [{min(shared_z):.2f}, {max(shared_z):.2f}], avg={sum(shared_z)/len(shared_z):.2f} mm")

# What about all Front vertices?
front_z = [vertices[i][2] for i in v_isl9]
print(f"Original Front Torso Z range: [{min(front_z):.2f}, {max(front_z):.2f}], avg={sum(front_z)/len(front_z):.2f} mm")

# What about all Back vertices?
back_z = [vertices[i][2] for i in v_isl12]
print(f"Original Back Torso Z range: [{min(back_z):.2f}, {max(back_z):.2f}], avg={sum(back_z)/len(back_z):.2f} mm")
