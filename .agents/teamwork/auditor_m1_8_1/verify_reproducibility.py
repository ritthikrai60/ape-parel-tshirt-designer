import hashlib
import os
import subprocess
import sys

worker_script = os.path.abspath(".agents/teamwork/worker_m1_8_1/generate_tshirt_obj.py")
reproduced_obj = os.path.abspath(".agents/teamwork/auditor_m1_8_1/reproduced_tshirt.obj")
target_obj = os.path.abspath("public/models/tshirt.obj")

with open(worker_script, "r", encoding="utf-8") as f:
    code = f.read()

# Replace output path
modified_code = code.replace(
    'OUTPUT_PATH = os.path.abspath("public/models/tshirt.obj")',
    f'OUTPUT_PATH = r"{reproduced_obj}"'
)

runner_path = os.path.abspath(".agents/teamwork/auditor_m1_8_1/run_reproduce.py")
with open(runner_path, "w", encoding="utf-8") as f:
    f.write(modified_code)

res = subprocess.run([sys.executable, runner_path], capture_output=True, text=True)
print("Return code:", res.returncode)
if res.returncode != 0:
    print("Stderr:", res.stderr)
    sys.exit(1)

with open(target_obj, "rb") as f:
    hash_target = hashlib.sha256(f.read()).hexdigest()

with open(reproduced_obj, "rb") as f:
    hash_repro = hashlib.sha256(f.read()).hexdigest()

print(f"Target SHA256:     {hash_target}")
print(f"Reproduced SHA256: {hash_repro}")
print(f"Exact Byte Match:  {hash_target == hash_repro}")

# Clean up temporary reproduced files
if os.path.exists(reproduced_obj):
    os.remove(reproduced_obj)
if os.path.exists(runner_path):
    os.remove(runner_path)
