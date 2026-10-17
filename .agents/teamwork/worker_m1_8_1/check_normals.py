import math

input_path = "prep_models/various size/Low_T-shirt.obj"

non_unit_normals = 0
with open(input_path, 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('vn '):
            parts = line.strip().split()[1:]
            nx, ny, nz = float(parts[0]), float(parts[1]), float(parts[2])
            length = math.sqrt(nx*nx + ny*ny + nz*nz)
            if abs(length - 1.0) > 1e-3:
                non_unit_normals += 1

print(f"Non-unit normals in raw file: {non_unit_normals}")
