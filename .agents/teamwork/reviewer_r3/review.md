# Reviewer R3 Adversarial Audit Report

## 1. What the Prior Attempt Got Wrong

1. **Upper Shoulder Seam Anchor Truncation & Unpinned Outer Ridge Deformation**:
   - **Input**: Model vertices located on the top ridge / shoulder seam of the t-shirt mesh where $y \ge 0.50$ and $|x| \in (0.50, 0.65]$ (e.g. vertices at $x = 0.55, y = 0.60$ or $x = -0.57, y = 0.66$ in `public/models/tshirt.obj`).
   - **Expected**: Complete 0% deformation across all shoulder seam and neckline vertices, as required by Requirement R1 ("collar dip, ribbing, and shoulder seams remain rigidly anchored (0% deformation)").
   - **Actual**: 229 vertices on the upper shoulder ridge of `public/models/tshirt.obj` were evaluated as sleeve cloth and deformed by up to 27.5% deflection, creating a visible seam tear/shear discontinuity across $|x| = 0.50$ where weight jumped from 0.0 to 0.17+.
   - **Root Cause**: `computeAnchorPinningWeight` and GLSL shader hardcoded an overly narrow shoulder boundary clamp `absX <= 0.50` at $y \ge 0.50$, ignoring the true anatomical width ($|x| \approx 0.65$) of the shoulder seam down to the armhole junction in the 3D model.
   - **Fix**: Extended `AnchorPinningBounds` with `xShoulder` (default 0.65) and updated both CPU `computeAnchorPinningWeight` and GLSL `computeGarmentPhysicsWeight` to pin all points with $y \ge 0.50$ and $|x| \le 0.65$ to 0.0 weight.

2. **Frame-Rate Dependent Low-Pass Filter & Multi-Substep Torque Accumulation on Hitches**:
   - **Input**: Client device frame rate drops or stutters (e.g. $\Delta t = 0.25$s hitch at 4 FPS) immediately after camera rotation stops.
   - **Expected**: Spring-damper settle physics naturally progresses and dissipates external torque over the 0.25s duration.
   - **Actual**: The simulator sustained an unrelaxed external torque (e.g. ~38 rad/s^2) across all 16 substeps of the 0.25s frame, driving fabric deflection all the way up to the maximum 0.35 rad clamp rather than settling.
   - **Root Cause**: Discrete filter alpha `0.65` was frame-rate dependent (assumed constant 60 FPS), decaying 15x slower during hitches, and external torque was held constant across all ODE substeps instead of decaying over physical time.
   - **Fix**: Replaced discrete alpha with continuous time-corrected filter $\alpha = 0.65^{\Delta t / 0.016}$ and relaxed transient external torque across substeps via $\tau_{decay} = 0.65^{\Delta t_{sub} / 0.016}$.

3. **`autoRotate` Prop Desynchronization in `GarmentPreview3D`**:
   - **Input**: Parent component changes the `autoRotate` prop dynamically (e.g. passing `autoRotate={true}` or toggling).
   - **Expected**: Turntable starts or stops spinning in response to the prop update.
   - **Actual**: `isRotating` internal state was only initialized on mount and never synchronized when `autoRotate` prop changed.
   - **Root Cause**: Missing `useEffect` synchronizing `autoRotate` prop to `isRotating` state.
   - **Fix**: Added `useEffect(() => { setIsRotating(autoRotate); }, [autoRotate]);`.

4. **Component Unmount Stale Reference Retention**:
   - **Input**: Component unmounts while asynchronous operations or external hooks hold handle refs.
   - **Expected**: Internal Three.js references (`rendererRef`, `sceneRef`, `cameraRef`, `controlsRef`, etc.) nulled out to avoid use-after-free and memory retention.
   - **Actual**: Refs remained populated with disposed Three.js objects.
   - **Root Cause**: Incomplete teardown in the `useEffect` cleanup return function.
   - **Fix**: Explicitly set all Three.js refs to `null` in unmount cleanup.

## 2. What I Changed
- `src/lib/garmentPhysics.ts`:
  - Added `xShoulder` (default 0.65) to `AnchorPinningBounds` and updated `computeAnchorPinningWeight` to rigidly anchor $y \ge 0.50, |x| \le 0.65$.
  - Updated GLSL vertex shader `computeGarmentPhysicsWeight` to use `pos.y >= 0.50 && absX <= 0.65`.
  - Implemented continuous time-corrected filter $\alpha = 0.65^{\Delta t / 0.016}$ in `GarmentPhysicsSimulator.update`.
  - Added substep torque relaxation across multi-substep hitches and increased ODE advancement clamp to 0.5s.
  - Dissipated velocity when `yaw` is static during snapshot freeze.
- `src/components/studio/GarmentPreview3D.tsx`:
  - Added `useEffect` syncing `autoRotate` prop changes to `isRotating`.
  - Added complete Three.js ref nullification in unmount cleanup.
- `src/lib/__tests__/garment_physics.test.ts`:
  - Expanded shoulder seam test to verify full upper ridge pinning out to $|x| = 0.65$.
  - Added 4 adversarial test cases: non-degenerate triangle area preservation under rapid reversals, low-FPS frame drop advancement, freeze deceleration tracking, and turntable snapshot zero-deformation guarantee. Total tests increased to 40.

## 3. Verification Record
- Dedicated physics suite: `npx vitest run src/lib/__tests__/garment_physics.test.ts` (40/40 passed in 62ms).
- Full repository test suite: `npx vitest run` (586/586 passed across 24 suites in 14.80s, 0 regressions).
- TypeScript check: `npx tsc --noEmit` (0 errors).
- Production build: `npm run build` (24/24 routes compiled, exit code 0).
