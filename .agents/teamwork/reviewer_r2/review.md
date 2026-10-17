# Adversarial Review 2 Report: APX-HVY-001 Garment Physics System

> [!WARNING] **Skepticism Disclaimer**
> The mathematical formulations for rotational yaw derivation, symplectic Euler ODE cloth sway, Three.js ShaderLib normal chunk sequencing, and orthographic snapshot freeze contracts have been exhaustively tested with 36 dedicated tests and 582 full-suite tests. However, subjective human aesthetic preference for 240 GSM combed cotton drape under custom studio light rigs remains visual.

## 1. What the prior attempt got wrong

1. **Dead-Code Shader Normal Transformation**:
   - **Input**: Garment rotates with dynamic cloth lag up to 20° deflection (`uInertiaLag > 0`).
   - **Expected**: Surface normal vectors rotate together with vertex positions to ensure physically accurate 3-point studio lighting, rim reflections, and shadow terminators on the fabric.
   - **Actual**: The prior reviewer replaced `#include <begin_vertex>` and rotated `objectNormal.x` and `objectNormal.z`. However, in Three.js standard vertex shader pipeline, `#include <defaultnormal_vertex>` (which builds `transformedNormal = normalMatrix * objectNormal;`) and `#include <normal_vertex>` (which computes `vNormal = normalize(transformedNormal);`) execute **BEFORE** `#include <begin_vertex>`. `objectNormal` is never referenced again after `<begin_vertex>`. Mutating `objectNormal` inside `<begin_vertex>` was 100% dead code; `vNormal` (passed to fragment shader) and `transformedNormal` remained completely unrotated!
   - **Root Cause**: Injected GLSL shader chunk modified `objectNormal` after Three.js had already finished building the view-space normal vectors.
   - **Fix**: Injected normal vector rotation into `#include <beginnormal_vertex>` where `objectNormal` is initially declared in object space, ensuring `defaultnormal_vertex` and `normal_vertex` downstream automatically calculate `transformedNormal` and `vNormal` from the properly rotated object normal.

2. **Spherical Boundary Wrap Flip & 360-Degree Camera Reversal**:
   - **Input**: User clicks a view preset (or orbits) crossing the spherical azimuth boundary near $\pm\pi$ (e.g. from yaw $3.10$ to $-3.10$).
   - **Expected**: Camera smoothly orbits along the short $0.08$ rad arc across the boundary without reversing or jittering.
   - **Actual**: `animate()` computed `currentSph = new THREE.Spherical().setFromVector3(offset)`. Because `THREE.Spherical.setFromVector3` uses `Math.atan2(x, z)`, as soon as the camera crossed $\pi$, `currentSph.theta` wrapped to negative $-3.139$. Because `targetSphericalRef.current.theta` was held as an unwrapped scalar ($3.185$), the per-frame lerp calculated `(3.185 - (-3.139)) * 0.08 = +0.50` rad in the reverse direction! The camera reversed all the way around the entire 360-degree sphere, creating an artificial $30+$ rad/s angular velocity surge in the physics simulator.
   - **Root Cause**: `targetSphericalRef.current` did not compute shortest-angle wrapping `while (deltaTheta > Math.PI) deltaTheta -= 2*Math.PI` on each animation frame.
   - **Fix**: Re-wrapped `deltaTheta` to $[-\pi, \pi]$ on every animation frame in `animate()`.

3. **Frame Drop / Hitch Derivative Amplification**:
   - **Input**: Client device frame rate drops or stutters (e.g. $\Delta t = 0.5$s hitch).
   - **Expected**: Angular velocity reflects the true rate of rotation over the actual elapsed time ($0.2 / 0.5 = 0.4$ rad/s).
   - **Actual**: `clampedDt` was clamped to $0.1$s before calculating velocity `newVelocity = deltaYaw / clampedDt`, artificially amplifying velocity by $5\times$ to $2.0$ rad/s and triggering a spurious acceleration surge.
   - **Root Cause**: Clamping $\Delta t$ before derivative calculation rather than decoupling the derivative time-scale from the numerical ODE substep limit.
   - **Fix**: Calculated `effectiveDt = Math.max(dt, 0.001)` for angular velocity and acceleration derivatives, decoupled from `clampedDt = Math.min(effectiveDt, 0.1)` used for ODE substep integration. Handled $>0.5$s pauses (tab backgrounding) with smooth reference resync.

4. **Stale Yaw Tracking During Frozen Simulation**:
   - **Input**: Turntable rotates while simulator is frozen for snapshot/blueprint capture.
   - **Expected**: Unfreezing resumes smooth tracking without discontinuous delta yaw.
   - **Actual**: While `isFrozen` was true, `update(yaw, dt)` returned $0.0$ without updating `this.currentYaw`. On unfreeze, `deltaYaw = yaw - this.currentYaw` used the stale pre-freeze yaw, causing an artificial velocity spike.
   - **Root Cause**: Missing reference yaw tracking inside `if (this.isFrozen)`.
   - **Fix**: Updated `this.currentYaw = yaw; this.previousYaw = yaw;` when `isFrozen` is true.

5. **Snapshot Exception Resource Leak**:
   - **Input**: Calling `captureOrthographicSnapshot` when WebGL context or `toDataURL` throws.
   - **Expected**: Floor shadows restored, renderer dimensions restored, simulator unfrozen.
   - **Actual**: Errors before `simulator.unfreeze()` left the simulator permanently frozen, floor shadows hidden, and renderer dimensions corrupted.
   - **Root Cause**: Missing `try ... finally` block.
   - **Fix**: Wrapped snapshot rendering in `try ... finally`.

## 2. What I changed
- `src/lib/garmentPhysics.ts`:
  - Added `computeGarmentPhysicsWeight` helper in vertex shader header.
  - Injected normal rotation into `#include <beginnormal_vertex>` so downstream Three.js normal chunks receive rotated normals.
  - Set `material.customProgramCacheKey = () => 'garmentPhysicsShader_v2'`.
  - Fixed angular velocity and acceleration derivation to use `effectiveDt` preventing frame-drop amplification.
  - Added $>0.5$s suspension guard for clean tab switching.
  - Updated `isFrozen` branch to track `currentYaw` and `previousYaw`.
- `src/components/studio/GarmentPreview3D.tsx`:
  - Implemented per-frame wrapped `deltaTheta` lerp in `animate()`.
  - Simplified `applyPreset` target representation.
  - Wrapped `captureOrthographicSnapshot` in `try ... finally`.
  - Added `touchAction = 'none'` to renderer canvas.
- `src/lib/__tests__/garment_physics.test.ts`:
  - Added 4 new adversarial test cases covering Three.js shader normal chunk ordering, spherical boundary wrap traversal without reversal, frame-drop derivative scaling, and frozen yaw tracking. Total tests increased to 36.

## 3. Verification Record
- Dedicated physics suite: `npx vitest run src/lib/__tests__/garment_physics.test.ts` (36/36 passed in 22ms).
- Full regression suite: `npx vitest run` (582 passed across all 24 suites in 14.72s).
- Type check: `npx tsc --noEmit` (0 errors).
- Production build: `npm run build` (all 24 Next.js app routes compiled successfully).
