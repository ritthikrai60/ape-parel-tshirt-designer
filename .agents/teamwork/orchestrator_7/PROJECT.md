# Project: ape-parel 3D T-Shirt Model Generation & Web Integration (Generation 7)

## Architecture
This project replaces the legacy `public/models/tshirt.obj` (which contained 4 disconnected mesh islands, 282 open boundary edges, and 79 cross-border bleed faces) with a web-optimized, procedurally engineered 3D T-Shirt model generated via Blender MCP 5.1.2. The new model strictly enforces a 50/50 UV partition matching the ape-parel 2D/3D studio viewer canvas architecture, eliminating all texture bleed between front and back surfaces.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Blender 5.1.2 MCP Pipeline                      │
│ - Procedural Mesh Construction (bmesh, continuous drape, welded seams) │
│ - Strict UV Partition Assignment:                                      │
│     • Front Torso & Sleeves: U in [0.0, 0.5], V in [0.0, 1.0]          │
│     • Back Torso & Sleeves:  U in [0.5, 1.0], V in [0.0, 1.0]          │
│     • Seam Vertex Loop Splitting (0 cross-border bleed faces)          │
│     • Horizontal Anti-Mirroring (U increases screen-L to screen-R)     │
│ - Triangulation & Normal Smoothing (use_smooth = True)                 │
│ - bpy.ops.wm.obj_export (Y-Forward, Z-Up -> +Y Up, +Z Forward)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exports to
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    public/models/tshirt.obj Asset                      │
│ - Low-poly target: ~1,300 - 1,500 vertices, ~2,500 - 2,700 triangles   │
│ - Object tag: "o TShirt", Material tag: "usemtl GarmentBase"           │
│ - Web-optimized payload: ~150 - 220 KB                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Loaded by
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Three.js Web Viewer (GarmentPreview3D.tsx)                 │
│ - OBJLoader -> dynamic bounding box centering at (0, 0, 0)             │
│ - Uniform scale normalization: scale = 1.9 / maxDim                    │
│ - Dynamic texture sync from 1024x1024 dual-zone HTML Canvas:           │
│     • Front surface [0..512] -> U in [0.0, 0.5]                        │
│     • Back surface [512..1024] -> U in [0.5, 1.0]                      │
│ - Shadow floor clearance at y = -1.1 (zero clipping)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Verified by
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Multi-Agent QA & Forensic Integrity                  │
│ - Programmatic UV partition verification script                        │
│ - Vitest suite (323+ tests passing, 0 skipped, 0 failing)              │
│ - TypeScript type-check (npx tsc --noEmit: 0 errors)                   │
│ - Production build (npm run build: exit code 0)                        │
│ - Forensic Integrity Audit (teamwork_preview_auditor: CLEAN)           │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Blender Procedural T-Shirt Mesh Generator | Scripted `bmesh` creation of welded-seam torso with realistic drape, neck cutouts, and 16-radial cylindrical sleeves | M1 | Survey R1 |
| 2 | Strict 50/50 UV Partition & Loop Splitting | Assign front faces to $U \in [0.0, 0.5]$ and back faces to $U \in [0.5, 1.0]$ with split UV loops at $Z=0$ seams, yielding exactly 0 cross-border bleed faces | M1 | Survey R1 |
| 3 | Horizontal Anti-Mirroring | UV coordinate layout ensuring text on front and back both read left-to-right without mirroring | M1 | Survey R1 |
| 4 | Clean Wavefront OBJ Export | Export via `bpy.ops.wm.obj_export` with normal smoothing and coordinate alignment to `public/models/tshirt.obj` | M1 | Survey R2 |
| 5 | Three.js Studio Viewer Integration | Verify `GarmentPreview3D.tsx` loads the new model, centers at origin, scales uniformly, and maps canvas texture cleanly | M2 | Survey R2 |
| 6 | Test Suite Alignment & Un-Skipping | Update legacy 8% buffer margin assertions ($u \ge 0.539$) to strict 50/50 ($u \ge 0.500$) in `studio_pipeline.test.ts` and un-skip 7 tests in challenger suites | M2 | Survey R3 |
| 7 | Procedural Geometry Fallback Alignment | Ensure `src/lib/tshirtGeometry.ts` adheres to the exact same 50/50 partition contracts | M2 | Survey R3 |
| 8 | Programmatic UV Partition Verification | Execute deterministic Node.js audit script verifying UV bounds $[0, 1]$, zero cross-border faces, torso Z-to-U correlation, and unit normals | M3 | Survey R3 |
| 9 | End-to-End Build & Test Hardening | Verify `npm test`, `npx tsc --noEmit`, and `npm run build` pass with zero errors across the entire codebase | M3 | Survey R3 |
| 10 | Independent Forensic Integrity Audit | Execute comprehensive forensic integrity checks with `teamwork_preview_auditor` to guarantee authentic implementation | M3 | Survey R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 3D Model Generation via Blender MCP & UV Partitioning | Generate low-poly model in Blender 5.1.2, split UV seams, ensure 0 leak faces, export to `public/models/tshirt.obj` | none | **DONE** (Unanimous APPROVE + CLEAN) |
| M2 | Test Alignment & 3D Studio Integration Verification | Align test assertions to 50/50 partition, un-skip skipped tests, verify procedural fallback and Three.js viewer loading | M1 | **DONE** (Unanimous APPROVE + CLEAN) |
| M3 | Programmatic UV QA, Full Suite Hardening & Victory Audit | Deterministic UV script check, full test suite pass, typecheck, Next.js build, and independent Forensic Audit | M2 | **DONE** (Unanimous APPROVE + CLEAN) |

## Interface Contracts
### Blender Model ↔ Three.js Viewer (`GarmentPreview3D.tsx`)
- Object name: `o TShirt`
- Material name: `usemtl GarmentBase`
- Bounding Box: Width $X \in [-0.95, +0.95]$, Height $Y \in [-0.85, +0.70]$, Depth $Z \in [-0.25, +0.25]$
- Coordinate Orientation: $+Y$ Up (collar), $-Y$ Down (hem), $+Z$ Forward (chest), $-Z$ Backward (back)
- Scaling: Fits dynamically within $1.9$ units via `scale = 1.9 / maxDim`
- Floor Clearance: Hem clears contact shadow plane at $y = -1.1$ with $> 0.15$ clearance

### 2D Canvas (`textureSync.ts`) ↔ 3D Texture Mapping
- Dimensions: $1024 \times 1024$
- Front partition: $X \in [0, 512], Y \in [0, 1024] \iff U \in [0.0, 0.5], V \in [0.0, 1.0]$
- Back partition: $X \in [512, 1024], Y \in [0, 1024] \iff U \in [0.5, 1.0], V \in [0.0, 1.0]$
- Flip Y: Three.js `CanvasTexture.flipY = true` (Canvas $Y=0 \implies V=1.0$, Canvas $Y=1024 \implies V=0.0$)
- Invariant: Zero faces reference UV coordinates crossing $u = 0.5$ (`crossFaces === 0`)

## Code Layout
- `public/models/tshirt.obj`: Target 3D model file (verified in M1, sealed in M2/M3)
- `src/components/studio/GarmentPreview3D.tsx`: Three.js OBJ loader, scene setup, lighting, and shadow floor
- `src/components/studio/textureSync.ts`: Dual-zone 1024x1024 canvas texture baker
- `src/lib/tshirtGeometry.ts`: Offline procedural Three.js geometry fallback (aligned in M2)
- `src/lib/__tests__/studio_pipeline.test.ts`: Studio pipeline integration test suite (aligned in M2)
- `src/lib/__tests__/studio_challenger.test.ts`: Adversarial studio test suite (un-skipped in M2)
- `src/lib/__tests__/m5_graphics_production_challenger.test.ts`: Graphics production challenger test suite (un-skipped in M2)
- `src/lib/__tests__/m5_adversarial_final.test.ts`: Final adversarial test suite (un-skipped in M2)
