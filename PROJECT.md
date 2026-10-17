# Project: ape-parel 3D T-Shirt Planar UV Projection & Studio Alignment (Generation 9)

## Architecture
This project re-unwraps and adapts `prep_models/various size/Low_T-shirt.obj` (5,355 vertices, 5,097 faces, 10,192 triangles) into the ape-parel 3D studio customizer using continuous Frontal and Rear Planar UV Projections to achieve 1:1 pixel-accurate anatomical alignment with the 2D Studio Canvas.

The pipeline replaces `public/models/tshirt.obj`, eliminates legacy vertical inversion and sleeve island fragmentation, guarantees horizontal anti-mirroring, enforces 0 crossing faces across $U = 0.50$ with a $\Delta U \ge 0.004$ buffer gutter, verifies Three.js rendering in `GarmentPreview3D.tsx`, aligns test suites to the new planar topology, and completes full adversarial verification and forensic auditing.

```
┌────────────────────────────────────────────────────────────────────────┐
│             Input Model: prep_models/various size/Low_T-shirt.obj       │
│ - 5,355 vertices, 5,761 UVs, 5,355 normals, 5,097 faces (quads/tris)    │
│ - 54 welded side seam vertices physically joined in 3D geometry        │
│ - Raw scale in mm: X [-371.98, +376.94], Y [931.98, 1634.91], Z [-157.39, +180.74] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Model Adaptation Pipeline
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│         Blender MCP & Continuous Planar UV Projection Engine            │
│ - Coordinate scaling: mm -> meters, pre-centered at origin (0, 0, 0)   │
│   Normalized bounds: X in [-0.950, +0.950], Y in [-0.892, +0.892]      │
│ - Triangulation: 5,095 quads + 2 tris -> exactly 10,192 triangles      │
│ - Frontal Planar Projection (Z >= 0, Front Torso, Front Sleeves, Collar):│
│   U_front(x) = 0.002 + 0.496 * (x - (-0.95)) / 1.90                    │
│   V(y)       = 0.002 + 0.996 * (y - (-0.891669)) / 1.783338             │
│   dU/dx > 0 (text reads unmirrored from left to right)                 │
│ - Rear Planar Projection (Z <= 0, Back Torso, Rear Sleeves, Back Collar):│
│   U_back(x)  = 0.502 + 0.496 * (0.95 - x) / 1.90                       │
│   V(y)       = 0.002 + 0.996 * (y - (-0.891669)) / 1.783338             │
│   dU/dx < 0 (viewed from behind, text reads unmirrored left to right)  │
│ - Zero Crossing Invariant: Wholesale triangle partition guarantees      │
│   crossFaces === 0 across U = 0.50 with Delta U >= 0.004 buffer gutter │
│ - Headers: "o TShirt", "mtllib tshirt.mtl", "usemtl GarmentBase"       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Exports to
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    public/models/tshirt.obj Asset                      │
│ - Continuous Planar UV mapped geometry replacing legacy pattern model   │
│ - 5,355 vertices, 10,192 triangles, clean v/vt/vn face loops           │
│ - 1:1 Pixel-Accurate Alignment with 2D Canvas (Chest, Hem, Sleeves)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Loaded by & Tested against
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Three.js Web Viewer & Studio Integration                   │
│ - GarmentPreview3D.tsx: OBJLoader, centering at origin, scale 1.9/maxDim│
│ - Dual-zone 1024x1024 texture sync (textureSync.ts)                    │
│ - 2D Canvas Chest (50%, 35%) -> Baked (U=0.250, V=0.650) -> 3D Sternum │
│ - 2D Canvas Hem (50%, 87%)  -> Baked (U=0.250, V=0.130) -> 3D Hem      │
│ - Test Suites: studio_pipeline, m5_graphics_production_challenger,     │
│   studio_challenger, m5_adversarial_final                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Verified by
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Multi-Agent QA & Forensic Integrity Swarm            │
│ - Reviewer: OBJ syntax, 50/50 partition bounds, Three.js attributes     │
│ - Challenger: 2D-to-3D visual alignment, seam stress, anti-mirroring   │
│ - Forensic Auditor: Asset authenticity, mathematical planar provenance │
│ - Full Test Pass (npm test), TypeScript (npx tsc), Build (npm run build)│
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Low_T-shirt.obj Geometry Ingestion & Normalization | Ingest 5,355-vertex model, convert mm to meters, pre-center at (0,0,0), scale max dimension to 1.90, triangulate quads to 10,192 triangles | M1 | Request R1 (DONE) |
| 2 | Frontal Planar UV Projection ($Z \ge 0$) | Compute continuous planar projection into $U \in [0.002, 0.498], V \in [0.002, 0.998]$ with $V=0$ at hem and $V=1$ at collar | M1 | Request R1 (DONE) |
| 3 | Rear Planar UV Projection ($Z \le 0$) & Anti-Mirroring | Compute continuous planar projection into $U \in [0.502, 0.998], V \in [0.002, 0.998]$ with horizontal anti-mirroring | M1 | Request R1 (DONE) |
| 4 | Zero Crossing Faces & Gutter Buffer | Partition triangles wholesale to guarantee `crossFaces === 0` across $U = 0.50$ with $\Delta U \ge 0.004$ buffer gutter | M1 | Request R1 (DONE) |
| 5 | Clean OBJ Export to `public/models/tshirt.obj` | Export adapted model with headers `o TShirt`, `mtllib tshirt.mtl`, `usemtl GarmentBase` | M1 | Request R2 (DONE) |
| 6 | Three.js Studio Viewer Integration | Verify `GarmentPreview3D.tsx` loads adapted model cleanly, centers without displacement, and renders chest/hem/sleeves without distortion | M2 | Request R2 |
| 7 | Test Suite Alignment Across All 4 Test Files | Align legacy pattern UV assertions in `m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`, `m5_adversarial_final.test.ts` to planar coordinates and add explicit anatomical tests | M2 | Request R2 |
| 8 | Multi-Agent Adversarial QA Swarm | Independent Reviewers and Challengers stress-testing seams, UV bleeding, orientation, and 2D-to-3D anatomical alignment | M3 | Request R3 |
| 9 | Forensic Integrity Verification | `teamwork_preview_auditor` verifying asset provenance, planar projection mathematical rigor, and zero dummy implementations | M3 | Request R3 |
| 10 | Full Build & Test Hardening | Verify `npm test` (all 323 tests passing), `npx tsc --noEmit` (0 errors), and `npm run build` (exit code 0) | M3 | Request R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Planar UV Projection Unwrapping & OBJ Export | Process `prep_models/various size/Low_T-shirt.obj`, triangulate, compute Frontal & Rear Planar UVs with 0 crossing faces and anti-mirroring, export to `public/models/tshirt.obj` | none | **DONE** (Unanimous APPROVE + CLEAN) |
| M2 | 3D Studio Integration & Test Alignment | Verify Three.js viewer loading, align test suites to new planar topology, add anatomical alignment tests | M1 | **IN_PROGRESS** |
| M3 | Full QA, Build Hardening & Victory Audit | Full Vitest run (323 tests), TypeScript check, Next.js production build, independent Forensic Audit verification | M2 | PLANNED |

## Interface Contracts
### Model Asset (`public/models/tshirt.obj`) ↔ Three.js Viewer (`GarmentPreview3D.tsx`)
- Object name: `o TShirt`
- Material name: `usemtl GarmentBase`
- Vertex Count: 5,355 vertices (`v`)
- Face Count: Exactly 10,192 triangles (`f v/vt/vn`)
- Coordinate Frame: Pre-centered at $(0, 0, 0)$, Width $X \in [-0.950, +0.950]$, Height $Y \in [-0.892, +0.892]$, Depth $Z \in [-0.429, +0.429]$ meters
- Orientation: $+Y$ Up, $-Y$ Down (hem), $+Z$ Forward (chest), $-Z$ Backward (back)
- Floor Clearance: Bottom hem at $y \approx -0.8917\text{ m}$, shadow plane at $y = -1.10\text{ m}$ ($> 0.20\text{ m}$ clearance)

### 2D Canvas (`textureSync.ts`) ↔ 3D Planar Texture Mapping
- Dimensions: $1024 \times 1024$ pixels
- Front partition ($U \in [0.0, 0.5]$):
  - Formula: $U_{front}(x) = 0.002 + 0.496 \cdot \frac{x - (-0.95)}{1.90}$, $V(y) = 0.002 + 0.996 \cdot \frac{y - (-0.891669)}{1.783338}$
  - Center chest ($x=0, y=1389\text{mm} \implies y_{norm}=0.266\text{m}$): $U = 0.250, V = 0.650$ (Exact 1:1 match with 2D canvas preset at $x=50\%, y=35\%$)
  - Bottom hem ($y_{min} = -0.8917\text{m}$): $V = 0.002 \le 0.15$
  - Front sleeves ($x < -0.48$ or $x > +0.48$): mapped strictly into $U \in [0.002, 0.498]$
- Back partition ($U \in [0.5, 1.0]$):
  - Formula: $U_{back}(x) = 0.502 + 0.496 \cdot \frac{0.95 - x}{1.90}$, $V(y) = 0.002 + 0.996 \cdot \frac{y - (-0.891669)}{1.783338}$
  - Anti-mirroring: $\frac{dU_{back}}{dx} < 0$, guaranteeing left-to-right reading when viewed from behind
  - Rear sleeves: mapped strictly into $U \in [0.502, 0.998]$
- Crossing Faces across $U = 0.50$: Exactly 0 (`crossFaces === 0`) across all 10,192 triangles
- Deadband Buffer Gutter: $\Delta U \ge 0.004$ ($4.096$ pixels at $1024 \times 1024$) between Front ($U \le 0.498$) and Back ($U \ge 0.502$)

## Code Layout
- `prep_models/various size/Low_T-shirt.obj`: Source raw model asset (5,355 vertices)
- `scripts/generate_planar_tshirt.py`: Deterministic companion planar projection generator script
- `public/models/tshirt.obj`: Target 3D model asset integrated into Next.js public directory
- `src/components/studio/GarmentPreview3D.tsx`: Three.js OBJ loader, scene setup, lighting, shadow plane
- `src/components/studio/textureSync.ts`: Dual-zone 1024x1024 canvas texture baker
- `src/lib/tshirtGeometry.ts`: Offline procedural Three.js geometry fallback
- `src/lib/__tests__/m5_graphics_production_challenger.test.ts`: Graphics production challenger test suite
- `src/lib/__tests__/studio_pipeline.test.ts`: Studio pipeline integration test suite
- `src/lib/__tests__/studio_challenger.test.ts`: Adversarial studio test suite
- `src/lib/__tests__/m5_adversarial_final.test.ts`: Final adversarial test suite
