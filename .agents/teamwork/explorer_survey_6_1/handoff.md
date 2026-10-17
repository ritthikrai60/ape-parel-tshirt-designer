# Handoff Report: 3D Studio Viewer & Canvas Texture Mapping Investigation

## Summary
The 3D studio viewer in ape-parel utilizes Three.js (`GarmentPreview3D.tsx`) to render an OBJ model (`public/models/tshirt.obj`) textured dynamically via an offscreen 1024x1024 HTML canvas (`textureSync.ts`). UV space is strictly partitioned 50/50: Front surface maps to $u \in [0.0, 0.5]$ and Back surface maps to $u \in [0.5, 1.0]$. The viewer dynamically centers the imported mesh at $(0, 0, 0)$ and normalizes its maximum bounding dimension to $1.9$ units, floating over a shadow floor plane fixed at $y = -1.1$.

---

## 1. Observation

### 1.1 Architecture & Component Hierarchy
- **`src/app/studio/new/page.tsx`**:
  - Server Component querying `prisma.garmentProduct` and `prisma.artwork` (lines 21-88), with resilient fallbacks if the database is unseeded (lines 94-148).
  - Renders `<DesignStudioClient initialGarments={garments} initialArtworks={artworks} />` (line 152).
- **`src/components/studio/DesignStudioClient.tsx`**:
  - Manages studio UI, garment selection, color state (`#131718`, `#FFFFFF`, `#F5F0E8`, `#DABA98`), surface mode (`'FRONT' | 'BACK'`), view layout (`'SPLIT' | '2D' | '3D'`), and camera presets (`'FRONT' | 'BACK' | 'ISOMETRIC'`).
  - Holds `offscreenCanvasRef` (1024x1024 HTML canvas) and `imageCacheRef` (`Map<string, HTMLImageElement>`) (lines 120-132).
  - Hooks `preloadArtworkImages` and `bakeCompositeTexture` trigger on state changes, incrementing `textureVersion` (lines 135-163).
  - Embeds `<GarmentPreview3D>` in lines 527-533:
    ```tsx
    <GarmentPreview3D
      textureCanvas={offscreenCanvasRef.current}
      garmentColorHex={selectedColor}
      textureVersion={textureVersion}
      activePreset={viewPreset}
      onPresetChange={setViewPreset}
    />
    ```

### 1.2 Three.js Viewport, Loader, Material & Texture Setup (`GarmentPreview3D.tsx`)
- **Loader**:
  - Imports `OBJLoader` from `'three/examples/jsm/loaders/OBJLoader.js'` (line 6).
  - Loads `/models/tshirt.obj` (lines 251-283).
  - On error, falls back to `createProceduralTShirtGeometry()` from `@/lib/tshirtGeometry` (lines 287-304).
- **Bounding Box Centering & Scaling (Lines 257-265)**:
  ```typescript
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  obj.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1.9 / (maxDim || 1);
  obj.scale.setScalar(scale);
  ```
- **Material**:
  - Uses `THREE.MeshStandardMaterial` (lines 239-245):
    ```typescript
    const garmentMaterial = new THREE.MeshStandardMaterial({
      map: canvasTexture,
      roughness: 0.85,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    ```
  - Standard PBR material simulating 240 GSM combed cotton. No custom vertex/fragment shader.
  - Traverse loop sets `mesh.material = garmentMaterial`, `mesh.castShadow = true`, `mesh.receiveShadow = true`, and recomputes vertex normals (lines 266-276).
- **Texture Setup & Updates**:
  - `CanvasTexture` created with `SRGBColorSpace`, `ClampToEdgeWrapping`, `LinearMipmapLinearFilter`, and `generateMipmaps = true` (lines 229-236).
  - Default Three.js `CanvasTexture.flipY` is `true`.
  - Updated synchronously when `[textureCanvas, textureVersion, garmentColorHex]` changes (lines 101-106):
    ```typescript
    if (canvasTextureRef.current && textureCanvas) {
      canvasTextureRef.current.image = textureCanvas;
      canvasTextureRef.current.needsUpdate = true;
    }
    ```

### 1.3 Camera, OrbitControls, Lighting & Scene Hierarchy
- **Camera Setup**:
  - `PerspectiveCamera(fov: 42, aspect: width / height, near: 0.1, far: 100)` (line 127).
  - Initial position: `camera.position.set(0, 0.1, 2.3);` (line 128).
  - Responsive resizing handled by `ResizeObserver` (lines 325-336).
- **Camera Presets (`applyPreset`, lines 81-94)**:
  - `FRONT`: target camera position `(0, 0.1, 2.3)`, controls target `(0, 0, 0)`.
  - `BACK`: target camera position `(0, 0.1, -2.3)`, controls target `(0, 0, 0)`.
  - `ISOMETRIC`: target camera position `(1.6, 0.8, 1.6)`, controls target `(0, 0, 0)`.
  - Render loop smoothly lerps `camera.position` toward `targetCamPosRef` with damping factor `0.08` (lines 312-317).
- **OrbitControls**:
  - Target locked to `(0, 0, 0)` with damping factor `0.05` (lines 149-160).
  - Limits: `minDistance = 1.2`, `maxDistance = 4.0`.
  - Polar angles: `minPolarAngle = Math.PI * 0.15` (~27°), `maxPolarAngle = Math.PI * 0.6` (~108°).
  - Panning disabled: `enablePan = false`.
  - Auto-rotate toggle: `autoRotateSpeed = 2.0`.
- **Neutral 3-Point Studio Lighting (Lines 163-192)**:
  - `AmbientLight`: color `0xfcfbf9`, intensity `0.45`.
  - `KeyLight` (Directional): color `0xffffff`, intensity `1.2`, at `(3.2, 4.5, 3.5)`, shadow map 1024x1024, bias `-0.0005`, radius `2.5`.
  - `FillLight` (Directional): color `0xfff6ea`, intensity `0.6`, at `(-3.2, 2.5, 2.8)`.
  - `RimLight` (Directional Back): color `0xffffff`, intensity `0.8`, at `(0.0, 4.0, -4.0)`.
  - `HemisphereLight`: ground bounce color `0xd8d3cb`, sky `0xffffff`, intensity `0.2`.
- **Floor Shadow Plane (Lines 194-215)**:
  - Contact Shadow: `PlaneGeometry(2.4, 2.4)` with radial gradient canvas texture, `position.y = -1.1`, `rotation.x = -Math.PI / 2`, `opacity = 0.85`.
  - Directional Shadow Receiver: `PlaneGeometry(8, 8)` with `ShadowMaterial(opacity: 0.12)`, `position.y = -1.105`, `rotation.x = -Math.PI / 2`.

### 1.4 2D Canvas Mapping & UV Space Utilization (`textureSync.ts`)
- **Canvas Dimensions**: Exactly 1024 x 1024 pixels.
- **Partitioning Contract (lines 5-13)**:
  - **Front Surface**: Left half pixels $x \in [0, 512]$, $y \in [0, 1024] \implies u \in [0.0, 0.5], v \in [0.0, 1.0]$.
  - **Back Surface**: Right half pixels $x \in [512, 1024]$, $y \in [0, 1024] \implies u \in [0.5, 1.0], v \in [0.0, 1.0]$.
- **Placement Coordinate Math (lines 43-47)**:
  - `el.x` and `el.y` represent center percentages $[0, 100]$ of each surface half.
  - `el.width` and `el.height` represent size percentages $[0, 100]$ of each surface half.
  - Front Surface (`surfaceOffsetX = 0`):
    - $\text{centerX} = 0 + (\text{el.x} / 100) \times 512$
    - $\text{centerY} = (\text{el.y} / 100) \times 1024$
    - $\text{elemW} = (\text{el.width} / 100) \times 512$
    - $\text{elemH} = (\text{el.height} / 100) \times 1024$
  - Back Surface (`surfaceOffsetX = 512`):
    - $\text{centerX} = 512 + (\text{el.x} / 100) \times 512$
    - $\text{centerY} = (\text{el.y} / 100) \times 1024$
    - $\text{elemW} = (\text{el.width} / 100) \times 512$
    - $\text{elemH} = (\text{el.height} / 100) \times 1024$
- **Orientation & Vertical Flip**:
  - 2D Canvas top-left has $y = 0$, bottom has $y = 1024$.
  - Three.js `CanvasTexture` has `flipY = true`, which inverts Y so row 0 maps to UV $v = 1.0$ (collar), and row 1024 maps to UV $v = 0.0$ (hem).
  - Anti-mirroring:
    - Front (+Z facing): Screen-left (negative X) maps to lower $u$ (approaching 0.0); screen-right (positive X) maps to higher $u$ (approaching 0.5).
    - Back (-Z facing): Screen-left viewed from behind (positive X in 3D world) maps to lower $u$ (approaching 0.5); screen-right (negative X in 3D world) maps to higher $u$ (approaching 1.0).

### 1.5 Inspection of Existing `public/models/tshirt.obj`
- **File size & line count**: 226,883 bytes, 7,160 lines.
- **Topology**:
  - Vertices (`v`): 1490 (symmetric across X: $x \in [-0.95, +0.95]$, $y \in [-0.85, +0.70]$, $z \in [-0.22, +0.22]$).
  - Texture coordinates (`vt`): 1490.
  - Normals (`vn`): 1490 (unit length $\approx 1.0$).
  - Faces (`f`): 2680 triangular faces formatted as `v/vt/vn` referencing `1..1490`.
- **UV distribution**:
  - Minimum U: 0.0, Maximum U: 1.0.
  - Front UV count ($u \le 0.5$): 790 coordinates. Front max $u = 0.500000$.
  - Back UV count ($u \ge 0.5$): 700 coordinates. Back min $u = 0.502381$.
  - Minimum V: 0.0, Maximum V: 1.0.
  - Torso $z > 0.05$ with $u > 0.5$: 0 (zero bleed).
  - Torso $z < -0.05$ with $u < 0.5$: 0 (zero bleed).

### 1.6 Existing Test Suite Status
- Running `npx vitest run`:
  - 15 test files passed, 2 failed (314 passed, 7 skipped, 2 failed).
  - Failure 1: `src/lib/__tests__/studio_pipeline.test.ts:111`: `createProceduralTShirtGeometry()` has `expect(u).toBeGreaterThanOrEqual(0.539)` which failed because procedural geometry back torso UV started at 0.525 instead of 0.539. (Note: The prompt in `ORIGINAL_REQUEST.md` explicitly specifies the UV mappings strictly obey the 50/50 split without requiring arbitrary padding).
  - Failure 2: `src/lib/__tests__/portals_marketplace.test.ts:89`: Missing artwork license option in local sqlite test seed.
- Running `npx tsc --noEmit`: Exited 0 with zero type errors.
- Running `npm run build`: Exited 0 with successful Next.js production build.

---

## 2. Logic Chain

1. **Model Loader & Dimension Normalization**:
   - `GarmentPreview3D.tsx` lines 257-265 compute `box = new THREE.Box3().setFromObject(obj)` and execute `obj.position.sub(center)`.
   - Therefore, the 3D model will always be centered at world origin $(0, 0, 0)$ regardless of its native origin in Blender, provided its bounding box is centered around its visual mass.
   - The scale is dynamically computed: `scale = 1.9 / Math.max(size.x, size.y, size.z)`.
   - This ensures any model whose maximum dimension (typically sleeve-to-sleeve width or collar-to-hem height) is scaled to exactly 1.9 units.

2. **Floor Clearance**:
   - Because the model is scaled to $\text{maxDim} = 1.9$ and centered at $y = 0$, its bottom cannot extend below $y = -1.9 / 2 = -0.95$.
   - The contact shadow plane is positioned at $y = -1.10$, and the shadow receiver floor is at $y = -1.105$.
   - Consequently, the hem of the shirt will hover naturally 0.15 to 0.32 units above the floor, ensuring shadows render without clipping through the garment.

3. **Coordinate Frame & Orientation**:
   - The Three.js camera looks at $(0, 0, 0)$ from $+Z = 2.3$ for the `FRONT` view and from $-Z = -2.3$ for the `BACK` view.
   - Therefore, the model must be exported with:
     - $+Y$ pointing upward (collar).
     - $-Y$ pointing downward (hem).
     - $+Z$ pointing forward (chest).
     - $-Z$ pointing backward (back).
     - $+X$ to model's left (viewer's right when looking at front).
     - $-X$ to model's right (viewer's left when looking at front).

4. **UV Partitioning & 2D-to-3D Alignment**:
   - In `textureSync.ts`, Front graphics are baked to $[0..512] \times [0..1024]$, corresponding to UV $u \in [0.0, 0.5], v \in [0.0, 1.0]$.
   - Back graphics are baked to $[512..1024] \times [0..1024]$, corresponding to UV $u \in [0.5, 1.0], v \in [0.0, 1.0]$.
   - Because the 2D canvas treats the garment as a 1:1 square while the UV partition allocates a 1:2 rectangle ($0.5 \times 1.0$), artwork dimensions are baked at $w \propto 512$ and $h \propto 1024$.
   - When mapped to the 3D mesh, the torso height (~1.55) to width (~1.0) ratio un-stretches this texture back to normal proportions.
   - For anti-mirroring, text on the front must read left-to-right (increasing $u$ as $x$ increases from $-X$ to $+X$), and text on the back must also read left-to-right when viewed from behind (increasing $u$ as $x$ decreases from $+X$ to $-X$).

5. **Test Assertions on Model Geometry**:
   - Existing adversarial tests in `src/lib/__tests__/m5_graphics_production_challenger.test.ts` lines 173-232 and `src/lib/__tests__/studio_challenger.test.ts` line 36 assert exact vertex counts (1490), face counts (2680), and dimensions.
   - When replacing `public/models/tshirt.obj`, the team must be aware whether tests expect the exact topology of the original generated mesh or if test assertions should be adjusted to accept any compliant low-poly model.

---

## 3. Caveats

- **No source code was modified**: Per read-only investigation constraints, no edits were made to production or test files.
- **Blender coordinate export convention**: Standard Blender exports default to $-Y$ Forward and $+Z$ Up. When generating or exporting the model from Blender, it is critical to ensure the coordinate transform maps to Three.js's $+Y$ Up and $+Z$ Forward, or the model will appear rotated 90 degrees face-down.
- **Sleeve and collar UVs**: In the current model, sleeves and collar are mapped into the respective front $[0, 0.5]$ or back $[0.5, 1.0]$ halves. Any new model must also map sleeve and collar triangles into these zones to prevent seam glitches or untextured polygons.

---

## 4. Conclusion

1. **Compatibility**: The Next.js frontend is fully prepared to load any `.obj` file placed at `public/models/tshirt.obj`. The dynamic bounding box centering (`obj.position.sub(center)`) and automatic scale normalization (`scale = 1.9 / maxDim`) ensure that any model with reasonable proportions will automatically fit the camera view and float above the shadow floor plane.
2. **UV Requirements**:
   - Front surface vertices: strictly $u \in [0.0, 0.5]$.
   - Back surface vertices: strictly $u \in [0.5, 1.0]$.
   - Zero UV coordinates may span across the $u = 0.5$ boundary on a single triangle face (which would cause texture stretching/bleeding).
   - Horizontal anti-mirroring must be maintained on both front and back.
3. **Materials**: Single standard material (`MeshStandardMaterial`) with roughness 0.85, metalness 0.04, and double-sided rendering. No custom shaders are required.

---

## 5. Verification Method

To independently verify these observations:

1. **Verify Three.js viewer and scaling logic**:
   - Inspect `src/components/studio/GarmentPreview3D.tsx` lines 251-276 to verify bounding box centering and 1.9 scaling factor.
   - Inspect `src/components/studio/GarmentPreview3D.tsx` lines 194-215 to verify floor shadow plane position at $y = -1.1$.
2. **Verify texture baking and UV boundaries**:
   - Inspect `src/components/studio/textureSync.ts` lines 5-13 and 36-61 to verify 1024x1024 dual-zone coordinate math.
3. **Verify model dimensions and UV distribution**:
   - Run Node inspection script:
     ```powershell
     node -e "const fs = require('fs'); const content = fs.readFileSync('public/models/tshirt.obj', 'utf8'); console.log('Lines:', content.split('\n').length);"
     ```
4. **Verify TypeScript compilation and Next.js build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
