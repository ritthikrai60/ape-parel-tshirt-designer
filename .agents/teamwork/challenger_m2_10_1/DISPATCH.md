# Dispatch Instructions: challenger_m2_10_1

## Mission
Adversarial stress-testing of 2D-to-3D visual alignment, seam stress, zero cross-border bleed, and orientation verification across `public/models/tshirt.obj` and the studio test suites.

## Working Directory
`d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_10_1`

## Inputs
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically request dated ## 2026-10-10T21:53:26Z)
- `d:\Coding Projects\ape-parel tshirt\PROJECT.md`
- `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_9_1\handoff.md`
- `d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj`
- All 4 test files under `src/lib/__tests__/`

## Scope & Instructions
1. Adversarially challenge the 2D-to-3D mapping:
   - Challenge 1: Check every single triangle in `public/models/tshirt.obj` for boundary violations (any vertex with $U \in (0.498, 0.502)$ or triangles spanning across $U=0.50$).
   - Challenge 2: Test anatomical placement under extreme conditions:
     * Chest placement: Does $(50\%, 35\%)$ land strictly on the torso sternum, and NOT on sleeves or collar?
     * Hem placement: Does $(50\%, 87\%)$ land strictly at the bottom hem, and NOT on chest or neck?
     * Sleeve boundary: Do side seams have triangle distortion or inverted UV windings?
   - Challenge 3: Run targeted and full test executions:
     `npx vitest run src/lib/__tests__/studio_challenger.test.ts src/lib/__tests__/m5_graphics_production_challenger.test.ts`
2. Write your complete handoff report to `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_10_1\handoff.md` with explicit verdict `APPROVE` or `REQUEST_CHANGES`. Include detailed stress-testing findings and empirical data.


## 2026-10-11T01:34:20Z
You are challenger_m2_10_1. Your working directory is d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_10_1.

Read your dispatch instructions and inputs:
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_10_1\DISPATCH.md
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md (specifically request dated ## 2026-10-10T21:53:26Z)
- d:\Coding Projects\ape-parel tshirt\PROJECT.md
- d:\Coding Projects\ape-parel tshirt\.agents\teamwork\worker_m2_9_1\handoff.md
- d:\Coding Projects\ape-parel tshirt\public\models\tshirt.obj
- All 4 test files under src\lib\__tests__\

Task:
Adversarial stress-testing of 2D-to-3D visual alignment (chest placement, hem placement, sleeve placement), ensuring 0 cross-border bleed and correct orientation across public/models/tshirt.obj.
Test boundary conditions and run vitest tests.
Write your complete handoff report to d:\Coding Projects\ape-parel tshirt\.agents\teamwork\challenger_m2_10_1\handoff.md with explicit verdict APPROVE or REQUEST_CHANGES. Then notify parent via send_message.
