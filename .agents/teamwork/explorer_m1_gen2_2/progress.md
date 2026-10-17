# Progress — explorer_m1_gen2_2

- Last visited: 2026-10-10T16:25:00Z
- Status: Investigation Complete
- Current step: Writing handoff.md and preparing orchestrator report

## Milestones Achieved:
1. Identified root cause of Blender 5.1.2 1,121 UV export count: loop-level deduplication of unique UV coordinates ($1462 \text{ connected vertices} - 341 \text{ shared UV coordinates} = 1121 \text{ distinct UVs}$).
2. Uncovered why Explorer 3 and Challenger verification scripts expected 1:1 mapping: flawed assumption that OBJ arrays are parallel, originating from legacy `scripts/generate-tshirt-obj.mjs`.
3. Proved mathematical impossibility of $v = vt$ on connected meshes with UV seams.
4. Demonstrated in Blender 5.1.2 how loop UV assignments on seam edges eliminate 100% of cross-border bleed faces while keeping geometry continuous and manifold.
5. Formulated the mathematically correct programmatic UV verification algorithm matching Three.js `OBJLoader` buffer attribute construction.
