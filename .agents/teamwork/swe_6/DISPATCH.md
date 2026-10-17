## 2026-10-12T09:22:00Z
You are the SWE Light Orchestrator for ape-parel.
Your working directory is: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_6
Your task context is located at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_6\context.md
The dispatch file is at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_6\DISPATCH.md
The authoritative original request is at: d:\Coding Projects\ape-parel tshirt\.agents\teamwork\ORIGINAL_REQUEST.md
The project root directory is: d:\Coding Projects\ape-parel tshirt

## Task Summary
Implement a realistic rotational inertia and cloth sway physics system in the ape-parel 3D design studio (GarmentPreview3D.tsx) where rotating the garment around the left-right axis induces natural inertial cloth lag and spring-damper settling without compromising 2D/3D print blueprint measurement accuracy.

Working directory: d:\Coding Projects\ape-parel tshirt
Integrity mode: development

## Requirements

### R1. Rotational Inertia & Angular Velocity Cloth Sway
Implement rotational cloth dynamics in GarmentPreview3D.tsx:
- Compute real-time angular velocity (omega = delta theta / delta t) around the Y-axis (yaw) as the garment / camera rotates.
- Anchor pinning: The collar dip, ribbing, and shoulder seams remain rigidly anchored (0% deformation).
- Cloth lag deformation: Lower torso hem and sleeve cuffs dynamically lag behind the rotational direction proportional to angular acceleration and distance from anchors, simulating heavy 240 GSM combed cotton drape.

### R2. Spring-Damper Harmonic Settle Oscillation
Implement realistic fabric damping physics:
- When rotation slows or stops, the garment exhibits a subtle damped harmonic oscillation (spring overshoot and settle wave) rather than snapping to rest abruptly.
- Tuned damping coefficients (c) and spring stiffness (k) calibrated specifically for heavyweight 240 GSM cotton (stiff drape with low fluttering frequency).

### R3. Universal Rotational Interaction Support
Integrate rotational physics across all studio interaction modalities:
- Manual user interaction: Mouse drag and mobile touch swipe via OrbitControls.
- Preset transitions: Smooth camera view transitions (Front / Back / Isometric buttons) induce rotational inertia.
- Turntable mode: Continuous turntable auto-rotate maintains a gentle, natural centrifugal sway.

### R4. Zero-Deformation Guarantee for Blueprint & Technical Exporters
Guarantee print guide precision:
- When captureOrthographicSnapshot or productionBlueprint.ts executes to generate manufacturing tech sheets and centimeter ruler guidelines, immediately zero out / freeze dynamic deformation (uInertiaLag = 0.0) during the capture frame.
- Ensure that collar offset (offsetTopCollarCm), center-chest alignment, and graphic width/height in centimeters remain 100% mathematically exact and undistorted.

### R5. Automated Testing & Verification
Author a dedicated test suite (src/lib/__tests__/garment_physics.test.ts):
- Test angular velocity and inertia lag calculations across varying rotation speeds and directions.
- Test spring-damper decay behavior and convergence to neutral rest state.
- Test anchor pinning weights (collar = 0 displacement, hem = maximum displacement).
- Verify that snapshot capture functions guarantee zero deformation during export.
- Ensure all 546 existing Vitest tests continue to pass with 0 regressions.
- Verify npx tsc --noEmit (0 errors) and npm run build succeeds (exit code 0).

## Acceptance Criteria

### Physics & Visual Dynamics
- [ ] Rotating the 3D t-shirt left or right causes the hem and sleeves to sway and lag naturally behind the rotation direction.
- [ ] Stopping rotation triggers a smooth, damped spring settle back to neutral pose without jarring snaps.
- [ ] Collar and shoulders remain securely pinned and undistorted during all movements.
- [ ] Physics activates consistently across mouse drag, view preset switches, and auto-rotate turntable.
- [ ] Blueprint export snapshots (captureOrthographicSnapshot) capture the neutral undistorted garment with 100% centimeter accuracy.

### Quality & Verification
- [ ] Dedicated Vitest test suite src/lib/__tests__/garment_physics.test.ts passes with exit code 0.
- [ ] All 546 existing Vitest tests across the 23 suites pass with 0 regressions.
- [ ] npx tsc --noEmit passes with 0 type errors.
- [ ] npm run build succeeds with exit code 0.

Please read d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_6\DISPATCH.md and d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_6\context.md carefully, initialize your workspace in d:\Coding Projects\ape-parel tshirt\.agents\teamwork\swe_6, maintain progress.md and BRIEFING.md, and run the SWE Light loop to implement and verify all requirements. When completed, write handoff.md and report completion.
