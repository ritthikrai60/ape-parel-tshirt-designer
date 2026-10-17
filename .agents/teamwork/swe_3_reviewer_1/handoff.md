# Adversarial Reviewer Handoff Report: 3D Print Placement Guide & Centimeter Ruler Exporter

## Overview
Reviewer: reviewer@swe_3_reviewer_1
Target: 3D Print Placement Guide & Physical Centimeter Ruler Exporter (Milestone Feature)
Integrity mode: development

---

## 1. What the Prior Attempt Got Wrong

### Defect 1: Graphic Rotation Ignored in Physical Dimensions, Spatial Envelope (AABB), and Boundary Clamping
- **Input:** Design elements with non-zero rotation degrees (e.g. 45° diamond or 90° orientation) placed on garment surfaces.
- **Expected:** Physical bounding box extents (`xLeftCm`, `yTopCm`, `yBottomCm`), collar offset (`offsetTopCollarCm`), hem clearance (`offsetHemCm`), boundary validation, and clamping (`clampPlacement`) must calculate the true rotated spatial footprint $W |\cos\theta| + H |\sin\theta|$ so that rotated corners do not clip into the collar dip, hem, or side platen boundaries.
- **Actual:** Prior code completely ignored `element.rotation`. A 10x10 cm graphic rotated 45° has an actual spatial extent of 14.14x14.14 cm. The prior code calculated spatial extent as 10x10 cm, allowed the top corner to come 2.07 cm closer to the collar than reported, and permitted the rotated graphic to extend 2.07 cm past the physical 35 cm platen boundary without clamping or boundary warnings.
- **Root Cause:** Absence of rotation trigonometry in `clampPlacement` and `computeBlueprintMeasurements`, which assumed axis-aligned rectangles.

### Defect 2: SVG Callout Badges, Rulers, and Dimension Bars Clipping Outside Canvas Borders
- **Input:** Graphic elements placed near platen edges ($x \ge 33\text{ cm}$, $y \ge 43\text{ cm}$, or $y \le 0.5\text{ cm}$).
- **Expected:** SVG dimension callout labels, tick markings, layer badges, width/height dimension bars, and hem clearance indicators must never clip past canvas boundaries ($[0, \text{renderWidth}] \times [0, \text{renderHeight}]$) or collide with rulers and legends.
- **Actual:**
  - Far-right elements ($x = 34\text{ cm}$): Collar offset badge (`x = artCenterX + 6`, `width = 130`) reached $x = 1036.8\text{ px}$ (exceeding canvas width 1000). Height dimension bar (`x = artLeft + artWidth + 18`, `width = 75`) reached $x = 1043\text{ px}$, clipping 43 px off the canvas.
  - Bottom-hem elements ($y \ge 43\text{ cm}$): Width dimension bar was placed at `artBottom + 12`, directly overlapping the tech sheet footer legend ($y \ge 1195$).
  - Neckline flush elements ($y \le 0.5\text{ cm}$): Layer badge at `y = artTop - 20` collided directly into the top horizontal ruler ticks and numbers ($y \in [130, 158]$).
- **Root Cause:** Unclamped fixed directional coordinate offsets without boundary awareness or directional flipping when near edges.

### Defect 3: 3D Viewport Unmounted in 2D View Mode, Breaking Orthographic Snapshot Export
- **Input:** User designing a garment in `2D Canvas` mode (`viewMode === '2D'`) and clicking "Export Print Guide & Ruler".
- **Expected:** Orthographic 3D render snapshot captured from `GarmentPreview3D` and embedded in the blueprint sheet.
- **Actual:** `GarmentPreview3D` was conditionally unmounted in `2D` view mode (`{(viewMode === '3D' || viewMode === 'SPLIT') && ...}`), causing `preview3DRef.current` to be `null` and failing to capture any 3D snapshot when exported from the 2D studio view.
- **Root Cause:** Conditional DOM unmounting instead of keeping the 3D canvas mounted and visually hidden via CSS `hidden`.

### Defect 4: Single Snapshot Bound to Both Front and Back Surfaces
- **Input:** User switching between "Front" and "Back" tabs inside `ProductionBlueprintSheet` modal in studio.
- **Expected:** Blueprint displays the front 3D snapshot on the Front sheet, and back 3D snapshot on the Back sheet.
- **Actual:** Only a single snapshot was captured on modal open (`orthoSnapshotUrl`), so switching to the Back tab displayed Back measurements over the FRONT 3D garment render.
- **Root Cause:** `ProductionBlueprintSheet` only supported a single `garmentSnapshotDataUrl` prop without front/back separation.

### Defect 5: Unhandled `JOB-` Prefix in Supplier Job Blueprint Route & Missing Job Link
- **Input:** Supplier navigating to `/supplier/jobs/JOB-APX-ORD-XXXX` (using job IDs displayed on the supplier dashboard).
- **Expected:** Job blueprint page resolves the order and renders the full-page tech sheet.
- **Actual:** `getOrderByIdOrNumber("JOB-APX-ORD-XXXX")` looked for exact matches against `orderNumber` (`APX-ORD-XXXX`), failed to match, and triggered `notFound()`. Additionally, job IDs in `SupplierDashboardClient` were static spans rather than navigational links.
- **Root Cause:** Missing prefix normalization on `params.id` in `src/app/supplier/jobs/[id]/page.tsx` and absence of `Link` in `SupplierDashboardClient.tsx`.

---

## 2. What I Changed

1. **`src/lib/productionBlueprint.ts`**:
   - Added `computeRotatedAabb(widthCm, heightCm, rotationDeg)` computing precise diagonal spatial extents via $W|\cos\theta| + H|\sin\theta|$.
   - Updated `clampPlacement` to account for rotated AABB extents, ensuring rotated graphic corners never exceed platen boundaries.
   - Updated `computeBlueprintMeasurements` to incorporate rotation into `xLeftCm`, `yTopCm`, `yBottomCm`, `offsetTopCollarCm`, `offsetHemCm`, boundary validation, and export `aabbWidthCm` / `aabbHeightCm`.
   - Updated `generateBlueprintSvg` with boundary-safe callout placement:
     - Collar offset label flips to left if approaching canvas right border ($x + w > 975$), and renders flush/zero/negative badges when graphic is at or above neckline dip.
     - Center chest offset badge is clamped horizontally within $[10, \text{renderWidth} - 120]$.
     - Width dimension bar flips above artwork when artwork bottom is within 25 px of platen bottom, avoiding footer collisions.
     - Height dimension bar flips to left of artwork when artwork right edge is within 95 px of canvas right border.
     - Hem clearance badge flips to left if approaching canvas right border, and renders flush/zero/negative badges when graphic is near hem.
     - Layer badge moves inside top of artwork when graphic top is within 20 px of top ruler.
     - Rotated graphics render rotated `<g transform="rotate(...)">` oriented boxes alongside dashed AABB envelopes.
   - Updated `drawBlueprintCanvas` to rotate bounding boxes on 2D canvas when `rotationDeg` is non-zero.

2. **`src/components/portal/ProductionBlueprintSheet.tsx`**:
   - Added `frontSnapshotDataUrl` and `backSnapshotDataUrl` props.
   - Dynamically selects the appropriate snapshot based on active surface (`activeSurface === 'FRONT' ? frontSnapshot : backSnapshot`).

3. **`src/components/studio/DesignStudioClient.tsx`**:
   - Replaced conditional unmounting of `GarmentPreview3D` with CSS `hidden` when `viewMode === '2D'`, keeping `preview3DRef` alive across all view modes.
   - Updated `handleExportPrintGuide` to capture both Front and Back orthographic snapshots in parallel and pass them to `ProductionBlueprintSheet`.

4. **`src/app/supplier/jobs/[id]/page.tsx`**:
   - Added prefix normalization stripping `JOB-` if present before querying order via `getOrderByIdOrNumber`.

5. **`src/components/portal/SupplierDashboardClient.tsx`**:
   - Wrapped `JOB-{order.orderNumber}` in `<Link href={`/supplier/jobs/${order.orderNumber}`}>` enabling 1-click navigation to the dedicated job blueprint sheet.

6. **`src/lib/__tests__/production_blueprint.test.ts`**:
   - Added 9 new tests across Section 9 (Rotated Elements & Spatial AABB), Section 10 (SVG Anti-Clipping & Anti-Collision Resilience), and Section 11 (Supplier Job Blueprint Route & Normalization), expanding test count from 24 to 33 passed tests.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Ran `npx vitest run src/lib/__tests__/production_blueprint.test.ts`: **33 passed (100%)**.
  - Ran full test suite `npm test` (`vitest run`): **21 test files passed, 445 passed tests (0 regressions)**.
  - Ran `npx tsc --noEmit`: **0 TypeScript errors (clean)**.
  - Ran `npm run build`: **Next.js 14 production build succeeded with exit code 0**, compiling all 13 routes including `/supplier/jobs/[id]` and `/studio/new`.
- **Shallow Verification (manual inspection):**
  - Inspected SVG viewBox coordinates to confirm rect boundaries strictly satisfy $0 \le x \le x + w \le 1000$ and $0 \le y \le y + h \le 1250$.
- **Unverified aspects:**
  - Physical DTG machine operator clamping with physical Kornit vacuum platen on real factory floor.
  - Hardware GPU performance on low-end mobile devices without WebGL2.

---

## 4. Known Issues
- `Minor Robustness Risk`: In browser environments with WebGL disabled or hardware acceleration blocked by security policies, orthographic canvas snapshot falls back to the stylized 2D garment silhouette.

---

## 5. Remaining Risk & Next Step
- The 3D Print Placement Guide & Physical Centimeter Ruler Exporter feature is verified, functionally complete, and mathematically validated across rotations, edge boundaries, view modes, and supplier portal routes. Zero regressions exist across all 445 unit and integration tests.
