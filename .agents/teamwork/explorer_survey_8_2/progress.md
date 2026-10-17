# Progress — Explorer 2 (Studio Viewer Explorer)

- Last visited: 2026-10-10T19:40:00Z
- Status: Investigation completed, synthesizing analysis.md and handoff.md
- Explored files:
  - src/components/studio/GarmentPreview3D.tsx
  - src/components/studio/DesignStudioClient.tsx
  - src/components/studio/textureSync.ts
  - src/lib/tshirtGeometry.ts
  - prep_models/various size/Low_T-shirt.obj
  - public/models/tshirt.obj
  - src/lib/__tests__/studio_pipeline.test.ts
  - src/lib/__tests__/studio_challenger.test.ts
  - src/lib/__tests__/m5_graphics_production_challenger.test.ts
  - src/lib/__tests__/m5_adversarial_final.test.ts
- Key discovery: Three.js matrix composition (T * S) causes raw non-centered OBJs (Y=1283) to shift to Y=-1270 when using `obj.position.sub(center)` with `scale = 1.9/maxDim`. Pre-centering at (0,0,0) in OBJ or `obj.position.copy(center).multiplyScalar(-scale)` is essential.
