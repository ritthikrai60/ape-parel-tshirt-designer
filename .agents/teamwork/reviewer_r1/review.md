# Reviewer R1 Audit Log: Garment Rotational Inertia Physics

## Defects Identified & Fixed

### 1. Preset Camera Transition Clipping & Angular Velocity Spike
- **Input**: User clicks 'BACK' preset button while viewing 'FRONT' (or vice versa).
- **Expected**: Camera orbits smoothly around the exterior of the garment at viewing radius (~2.3), smoothly changing azimuthal yaw and inducing natural rotational cloth sway and damped harmonic settle.
- **Actual**: Camera transitioned along a Cartesian straight-line `lerp` straight through the center of the garment. Camera distance dropped to 0.06 (penetrating inside the collar/torso), and as it crossed origin, `atan2` flipped 180 degrees in a single frame, creating a massive velocity spike of 68.7 rad/s that slammed into the physical clamp.
- **Root Cause**: `GarmentPreview3D.tsx` used Cartesian `camera.position.lerp(targetCamPosRef.current, 0.08)` instead of spherical coordinate interpolation around the orbit controls target.
- **Fix**: Replaced Cartesian `targetCamPosRef` with spherical coordinate interpolation (`targetSphericalRef`). Preset transitions now smoothly orbit along the exterior sphere ($R \approx 2.3$), yaw changes continuously with max velocity ~11.0 rad/s, and user touch/drag interactions cancel the animation cleanly.

### 2. Missing Normal Vector Transformation in Shader
- **Input**: Garment rotates with dynamic cloth lag up to 20 degrees deflection.
- **Expected**: Surface normal vectors rotate together with vertex positions to ensure physically accurate 3-point studio lighting and specular highlights on the fabric.
- **Actual**: `attachGarmentPhysicsShader` in `src/lib/garmentPhysics.ts` displaced `transformed.x` and `transformed.z` by angle `theta`, but left `objectNormal` unrotated. Surface normals pointed in the rest pose while vertices were deflected by 20 degrees, producing lighting and shading distortions.
- **Root Cause**: Injected GLSL shader chunk only modified vertex positions and omitted normal rotation.
- **Fix**: Injected synchronous rotation for `objectNormal.x` and `objectNormal.z` with the same angle $\theta$ in the vertex shader.

### 3. Non-Idempotent Freeze / Unfreeze State Wiping
- **Input**: Consecutive `simulator.freeze()` calls during snapshot export or nested export flows.
- **Expected**: `simulator.getInertiaLag()` remains 0.0 during frozen state, and subsequent `unfreeze()` restores the original pre-freeze inertia lag.
- **Actual**: Second `freeze()` overwrote `frozenLagSnapshot` with `this.inertiaLag = 0.0`, permanently wiping the saved cloth sway state upon `unfreeze()`.
- **Root Cause**: Missing idempotency guard `if (this.isFrozen) return;` in `freeze()`, and symmetric guard `if (!this.isFrozen) return;` in `unfreeze()`.
- **Fix**: Added idempotency guards in both `freeze()` and `unfreeze()`.

### 4. Geometry Corruption in CPU Deformation Utility
- **Input**: Calling `applyGarmentPhysicsDeformation(geo, lag)` followed by `applyGarmentPhysicsDeformation(geo, 0.0)`.
- **Expected**: Geometry returns to exact pristine neutral rest state.
- **Actual**: Mutated `geometry.attributes.position` in place without caching the neutral baseline, causing subsequent calls to compound deformations and leaving the geometry permanently warped.
- **Root Cause**: No cached `initialPosition` attribute.
- **Fix**: Cloned and cached `initialPosition` BufferAttribute on first call, and derived deformations from `origPos`.

### 5. Floating-point Residual Velocity on Settlement
- **Input**: Garment finishes damped harmonic oscillation and rests.
- **Expected**: Angular velocity and angular acceleration clamp to exact 0.0.
- **Actual**: While `inertiaLag` and `lagVelocity` were clamped to 0.0, `this.angularVelocity` and `this.angularAcceleration` were left with decaying floating point residuals ($10^{-5}$).
- **Root Cause**: Incomplete zeroing in the rest settlement block of `update()`.
- **Fix**: Set `this.angularVelocity = 0.0` and `this.angularAcceleration = 0.0` when resting conditions are met. Also added non-finite guards to `computeAnchorPinningWeight` and `computeDeformedVertex`.

### 6. Orthographic Snapshot 1-Frame UI Flicker
- **Input**: Calling `captureOrthographicSnapshot`.
- **Expected**: Smooth snapshot capture without visual jump on the 3D viewport.
- **Actual**: After rendering with `orthoCamera` and restoring size, canvas retained the orthographic image until the next animation tick.
- **Root Cause**: Perspective camera was not re-rendered synchronously before returning from snapshot capture.
- **Fix**: Called `renderer.render(scene, cameraRef.current)` before returning from `captureOrthographicSnapshot`.
