import sys

input_path = "public/models/tshirt.obj"

# Let's inspect the correlation between z and u in existing model
with open(input_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

pos = []
uvs = []
for l in lines:
    tokens = l.split()
    if not tokens: continue
    if tokens[0] == 'v':
        pos.append([float(tokens[1]), float(tokens[2]), float(tokens[3])])
    elif tokens[0] == 'vt':
        uvs.append([float(tokens[1]), float(tokens[2])])

# Let's check: in existing model, if z > 0, what is u?
# If z < 0, what is u?
front_u = []
back_u = []
for l in lines:
    tokens = l.split()
    if not tokens or tokens[0] != 'f': continue
    for corner in tokens[1:]:
        p = corner.split('/')
        v = pos[int(p[0]) - 1]
        uv = uvs[int(p[1]) - 1]
        if v[2] > 0.0:
            front_u.append(uv[0])
        elif v[2] < 0.0:
            back_u.append(uv[0])

print(f"Existing model: when z > 0, U in [{min(front_u):.4f}, {max(front_u):.4f}]")
print(f"Existing model: when z < 0, U in [{min(back_u):.4f}, {max(back_u):.4f}]")
