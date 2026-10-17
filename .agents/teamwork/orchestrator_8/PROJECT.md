# Project: ape-parel 3D T-Shirt Model Adaptation & Web Integration (Generation 8)

## Architecture
This project adapts and integrates the authentic high-quality asset `prep_models/various size/Low_T-shirt.obj` (5,355 vertices, 5,097 faces, 5,761 UVs) into the ape-parel 3D studio viewer. The workflow normalizes its coordinate frame (meters, centered at origin `(0, 0, 0)`, normalized to ~1.90 units, $+Y$ Up, $+Z$ Forward), triangulates quads to 10,192 triangles, tags headers `o TShirt` and `usemtl GarmentBase`, and normalizes its UV map to enforce a strict 50/50 Front/Back partition ($U \in [0.0, 0.5]$ Front, $U \in [0.5, 1.0]$ Back) with 0 crossing faces and horizontal anti-mirroring. It replaces `public/models/tshirt.obj`, verifies Three.js rendering in `GarmentPreview3D.tsx`, aligns test assertions in all test suites, and verifies full project health with an adversarial QA swarm and forensic audit.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Low_T-shirt.obj Model Ingestion & Geometry Normalization | Ingest 5,355-vertex model, convert mm to meters, pre-center at (0,0,0), scale max dimension to 1.90, triangulate quads to 10,192 triangles | M1 | Survey R1 |
| 2 | Strict 50/50 UV Partition Normalization | Swap front/back partitions, normalize front to U in [0.0, 0.5] and back to U in [0.5, 1.0], ensure 0 crossing faces across U=0.50 | M1 | Survey R1 |
| 3 | Clean OBJ Export to `public/models/tshirt.obj` | Format standard Wavefront OBJ with `o TShirt`, `usemtl GarmentBase`, `v/vt/vn` face loops, and replace `public/models/tshirt.obj` | M1 | Survey R2 |
| 4 | Three.js Studio Viewer Integration Verification | Verify `GarmentPreview3D.tsx` loads adapted model cleanly, centers without displacement, clears shadow floor with +0.20 units margin | M2 | Survey R2 |
| 5 | Test Suite Alignment across All 4 Test Files | Align topology counts (5,355 vertices, 10,192 triangles, 5,761 UVs) and float anti-mirroring assertions in `m5_graphics_production_challenger.test.ts`, `studio_pipeline.test.ts`, `studio_challenger.test.ts`, `m5_adversarial_final.test.ts` | M2 | Survey R2 |
| 6 | Procedural Geometry Fallback Alignment | Ensure `src/lib/tshirtGeometry.ts` remains consistent with 50/50 UV partitioning | M2 | Survey R2 |
| 7 | Multi-Agent Adversarial QA Swarm | Independent Reviewers and Challengers stress-testing seams, UV bleeding, orientation, and Three.js loading | M3 | Survey R3 |
| 8 | Forensic Integrity Verification | `teamwork_preview_auditor` verifying asset provenance, procedural validity, and zero dummy/facade implementations | M3 | Survey R3 |
| 9 | Full Build & Test Hardening | Verify `npm test` (all tests passing), `npx tsc --noEmit` (0 errors), and `npm run build` (exit code 0) | M3 | Survey R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Model Adaptation, UV Normalization & OBJ Export | Process `prep_models/various size/Low_T-shirt.obj`, triangulate, normalize UVs to 50/50 partition with 0 cross faces, export to `public/models/tshirt.obj` | none | **IN_PROGRESS** |
| M2 | 3D Studio Integration & Test Alignment | Verify Three.js viewer loading, align all 4 test suites to new topology, verify fallback geometry | M1 | **PLANNED** |
| M3 | Full QA, Build Hardening & Victory Audit | Full Vitest run, TypeScript check, Next.js build, and independent Forensic Audit verification | M2 | **PLANNED** |

## Interface Contracts
### Model Asset (`public/models/tshirt.obj`) ↔ Three.js Viewer (`GarmentPreview3D.tsx`)
- Object name: `o TShirt`
- Material name: `usemtl GarmentBase`
- Vertex Count: 5,355 vertices
- Face Count: 10,192 triangles (`f v/vt/vn`)
- UV Coordinates: 5,761 texture coordinates
- Coordinate Frame: Pre-centered at $(0, 0, 0)$, Width $X \in [-0.95, +0.95]$, Height $Y \in [-0.89, +0.89]$, Depth $Z \in [-0.43, +0.43]$ meters
- Orientation: $+Y$ Up, $-Y$ Down (hem), $+Z$ Forward (chest), $-Z$ Backward (back)
- Floor Clearance: Hem at $y \approx -0.8915\text{ m}$, shadow plane at $y = -1.10\text{ m}$ ($> 0.20\text{ m}$ clearance)

### 2D Canvas (`textureSync.ts`) ↔ 3D Texture Mapping
- Dimensions: $1024 \times 1024$
- Front partition ($U \in [0.0, 0.5]$): Front Torso Body, Front Bottom Hems, Right Sleeve & Cuffs, Collar Stand (all strictly $U \le 0.4980$)
- Back partition ($U \in [0.5, 1.0]$): Back Torso Body, Back Bottom Hems, Left Sleeve & Cuffs, Back Brand Patch (all strictly $U \ge 0.5020$)
- Cross faces across $U = 0.50$: Exactly 0 (`crossFaces === 0`) across all 10,192 triangles
- Buffer Safety Gutter: $\Delta U \ge 0.0040$ ($4.096$ pixels at $1024 \times 1024$) deadband buffer across $U = 0.50$
- Primary Print Zones (Chest $|X| \le 0.25, Y \in [-0.2, 0.4], Z > 0.15$ and Upper Back $|X| \le 0.25, Y \in [-0.2, 0.4], Z < -0.15$): 100% normal correlation to Front ($U \le 0.498$) and Back ($U \ge 0.502$) partitions respectively
- Side Seams: Physically welded in 3D geometry (54 shared vertices) with decoupled UV coordinates

## Code Layout
- `prep_models/various size/Low_T-shirt.obj`: Source raw model asset (5,355 vertices)
- `public/models/tshirt.obj`: Target 3D model asset integrated into Next.js public directory
- `src/components/studio/GarmentPreview3D.tsx`: Three.js OBJ loader, scene setup, lighting, shadow plane
- `src/components/studio/textureSync.ts`: Dual-zone 1024x1024 canvas texture baker
- `src/lib/tshirtGeometry.ts`: Offline procedural Three.js geometry fallback
- `src/lib/__tests__/m5_graphics_production_challenger.test.ts`: Graphics production challenger test suite
- `src/lib/__tests__/studio_pipeline.test.ts`: Studio pipeline integration test suite
- `src/lib/__tests__/studio_challenger.test.ts`: Adversarial studio test suite
- `src/lib/__tests__/m5_adversarial_final.test.ts`: Final adversarial test suite
