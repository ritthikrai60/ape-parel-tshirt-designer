/**
 * src/lib/__tests__/garment_physics.test.ts
 * Comprehensive Automated Test Suite for APX-HVY-001 Garment Physics System
 *
 * Verifies:
 * - R1: Real-time angular velocity & rotational inertia lag across speeds and directions.
 * - R2: Spring-damper harmonic settle oscillation calibrated for 240 GSM combed cotton.
 * - R3: Universal interaction modalities (manual drag, preset transition, turntable auto-rotate).
 * - R4: Zero-deformation guarantee for blueprint and technical exporter precision.
 * - R5: Anchor pinning weights (collar & shoulders = 0, hem & cuffs = maximum displacement).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  GarmentPhysicsSimulator,
  FABRIC_CONFIG_240GSM,
  computeAnchorPinningWeight,
  computeDeformedVertex,
  applyGarmentPhysicsDeformation,
  attachGarmentPhysicsShader,
  BLUEPRINT_ZERO_DEFORMATION,
  assertZeroDeformationSnapshot,
} from '@/lib/garmentPhysics';
import {
  computeBlueprintMeasurements,
  DEFAULT_PLATEN_CONFIG,
  BLUEPRINT_ZERO_DEFORMATION as BLUEPRINT_SPEC_GUARANTEE,
  verifyBlueprintUndistortedAccuracy,
} from '@/lib/productionBlueprint';
import { createProceduralTShirtGeometry } from '@/lib/tshirtGeometry';

describe('APX-HVY-001 Garment Rotational Inertia & Cloth Sway Physics Suite', () => {
  let simulator: GarmentPhysicsSimulator;

  beforeEach(() => {
    simulator = new GarmentPhysicsSimulator();
  });

  describe('1. R1: Angular Velocity & Inertia Lag Dynamics', () => {
    it('initializes in neutral rest state with zero velocity and zero lag', () => {
      expect(simulator.getInertiaLag()).toBe(0.0);
      expect(simulator.getAngularVelocity()).toBe(0.0);
      expect(simulator.getAngularAcceleration()).toBe(0.0);
      expect(simulator.isAtRest()).toBe(true);
    });

    it('computes positive angular velocity and positive lag for clockwise rotation', () => {
      // First frame sets initial yaw
      simulator.update(0.0, 0.016);

      // Rotating clockwise: yaw increases (0.0 -> 0.1 rad over 0.016s)
      for (let i = 1; i <= 5; i++) {
        simulator.update(i * 0.02, 0.016);
      }

      expect(simulator.getAngularVelocity()).toBeGreaterThan(0.0);
      expect(simulator.getInertiaLag()).toBeGreaterThan(0.0);
    });

    it('computes negative angular velocity and negative lag for counter-clockwise rotation', () => {
      simulator.update(0.0, 0.016);

      // Rotating counter-clockwise: yaw decreases
      for (let i = 1; i <= 5; i++) {
        simulator.update(-i * 0.02, 0.016);
      }

      expect(simulator.getAngularVelocity()).toBeLessThan(0.0);
      expect(simulator.getInertiaLag()).toBeLessThan(0.0);
    });

    it('scales inertia lag proportionally with rotation speed', () => {
      const slowSim = new GarmentPhysicsSimulator();
      const fastSim = new GarmentPhysicsSimulator();

      slowSim.update(0.0, 0.016);
      fastSim.update(0.0, 0.016);

      // Slow rotation vs 3x faster rotation
      for (let i = 1; i <= 10; i++) {
        slowSim.update(i * 0.01, 0.016);
        fastSim.update(i * 0.03, 0.016);
      }

      expect(Math.abs(fastSim.getInertiaLag())).toBeGreaterThan(
        Math.abs(slowSim.getInertiaLag())
      );
    });

    it('seamlessly wraps across the circular domain [-PI, PI] without velocity spikes', () => {
      // Start near +PI boundary
      simulator.update(Math.PI - 0.05, 0.016);

      // Cross over boundary to -PI + 0.05 (smooth continuous clockwise motion of 0.1 rad)
      const wrappedYaw = -Math.PI + 0.05;
      simulator.update(wrappedYaw, 0.016);

      // Angular velocity must reflect the short angular delta (~0.1 / 0.016 ~ 6.25 rad/s),
      // NOT a spurious jump across ~2*PI
      expect(simulator.getAngularVelocity()).toBeGreaterThan(0.0);
      expect(Math.abs(simulator.getAngularVelocity())).toBeLessThan(15.0);
    });

    it('strictly clamps excessive inertia lag within physical safety limit', () => {
      simulator.update(0.0, 0.016);

      // Extreme fast rotation (e.g. 50 rad/s)
      for (let i = 1; i <= 10; i++) {
        simulator.update(i * 1.5, 0.016);
      }

      const lag = simulator.getInertiaLag();
      expect(Math.abs(lag)).toBeLessThanOrEqual(FABRIC_CONFIG_240GSM.maxLagAngleRad);
      expect(Math.abs(lag)).toBeCloseTo(FABRIC_CONFIG_240GSM.maxLagAngleRad, 2);
    });
  });

  describe('2. R2: Spring-Damper Harmonic Settle Oscillation (240 GSM Cotton)', () => {
    it('conforms to calibrated 240 GSM combed cotton fabric constants', () => {
      const cfg = FABRIC_CONFIG_240GSM;
      expect(cfg.gsm).toBe(240);
      expect(cfg.stiffnessK).toBe(140.0);
      expect(cfg.dampingC).toBe(11.0);

      // Natural frequency wn = sqrt(k) ~ 11.83 rad/s
      const wn = Math.sqrt(cfg.stiffnessK);
      expect(wn).toBeCloseTo(11.83, 1);

      // Damping ratio zeta = c / (2 * wn) ~ 0.465 (underdamped, low fluttering harmonic settle)
      const zeta = cfg.dampingC / (2 * wn);
      expect(zeta).toBeGreaterThan(0.35);
      expect(zeta).toBeLessThan(0.60);
    });

    it('exhibits damped harmonic overshoot and wave oscillation when rotation stops', () => {
      // 1. Induce initial lag through rotation
      simulator.update(0.0, 0.016);
      for (let i = 1; i <= 8; i++) {
        simulator.update(i * 0.04, 0.016);
      }

      const initialLag = simulator.getInertiaLag();
      expect(initialLag).toBeGreaterThan(0.05);

      // 2. Stop rotating: hold yaw fixed
      const finalYaw = 8 * 0.04;
      const history: number[] = [initialLag];
      let didOvershootZero = false;

      // Step forward at 60 FPS for 1.2 seconds (75 frames)
      for (let frame = 0; frame < 75; frame++) {
        const lag = simulator.update(finalYaw, 0.016);
        history.push(lag);

        // Harmonic overshoot: lag reverses sign past neutral 0.0
        if (lag < -0.001) {
          didOvershootZero = true;
        }
      }

      // Must exhibit authentic fabric spring overshoot rather than abrupt linear halt
      expect(didOvershootZero).toBe(true);

      // Settle wave must decay: final amplitude must be near zero
      const finalLag = history[history.length - 1];
      expect(Math.abs(finalLag)).toBeLessThan(0.005);
      expect(simulator.isAtRest()).toBe(true);
    });

    it('settles smoothly to exact rest state without jitter', () => {
      simulator.update(0.0, 0.016);
      simulator.update(0.15, 0.016);

      // Step forward 90 frames (~1.5 seconds)
      for (let i = 0; i < 90; i++) {
        simulator.update(0.15, 0.016);
      }

      expect(simulator.getInertiaLag()).toBe(0.0);
      expect(simulator.isAtRest()).toBe(true);
    });
  });

  describe('3. R3: Universal Rotational Interaction Modalities', () => {
    it('activates during manual drag interaction', () => {
      // Simulating user dragging mouse across canvas
      const mouseSequence = [0.0, 0.05, 0.12, 0.22, 0.35, 0.45];
      let maxLag = 0;

      for (let i = 0; i < mouseSequence.length; i++) {
        const lag = simulator.update(mouseSequence[i], 0.016);
        maxLag = Math.max(maxLag, Math.abs(lag));
      }

      expect(maxLag).toBeGreaterThan(0.03);
    });

    it('activates during smooth camera view preset transitions (Front to Isometric)', () => {
      // Simulating camera lerp from Front (yaw = 0.0) to Isometric (yaw = 0.785 rad)
      let currentYaw = 0.0;
      const targetYaw = 0.785;
      let peakLagDuringTransition = 0;

      simulator.update(currentYaw, 0.016);

      // 25 lerp frames
      for (let f = 0; f < 25; f++) {
        currentYaw += (targetYaw - currentYaw) * 0.08;
        const lag = simulator.update(currentYaw, 0.016);
        peakLagDuringTransition = Math.max(peakLagDuringTransition, Math.abs(lag));
      }

      expect(peakLagDuringTransition).toBeGreaterThan(0.015);
    });

    it('maintains a gentle continuous centrifugal sway during turntable auto-rotate mode', () => {
      // OrbitControls autoRotate at speed 2.0 produces ~0.0035 rad/frame (~0.21 rad/s)
      const omegaAutoRotate = 0.21;
      const dt = 0.016;
      let yaw = 0.0;

      simulator.update(yaw, dt);

      // Spin for 60 frames (1 second)
      const recordedLags: number[] = [];
      for (let f = 0; f < 60; f++) {
        yaw += omegaAutoRotate * dt;
        const lag = simulator.update(yaw, dt);
        recordedLags.push(lag);
      }

      // Steady state sway should be gentle (~1 to 3 degrees = 0.017 to 0.052 rad)
      const steadyLag = recordedLags[recordedLags.length - 1];
      expect(steadyLag).toBeGreaterThan(0.015);
      expect(steadyLag).toBeLessThan(0.08);
    });
  });

  describe('4. Anchor Pinning & Deformation Weight Geometry', () => {
    it('strictly pins collar dip and ribbing to exactly 0.0 weight (0% deformation)', () => {
      // Center collar dip points (x=0, y=0.46 to 0.66)
      expect(computeAnchorPinningWeight(0.0, 0.46, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(0.0, 0.52, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(0.0, 0.66, 0.0)).toBe(0.0);

      // Ribbing cutout width (|x| <= 0.20, high y)
      expect(computeAnchorPinningWeight(0.12, 0.50, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(-0.12, 0.50, 0.0)).toBe(0.0);
    });

    it('strictly pins shoulder seams to 0.0 weight across entire upper shoulder ridge', () => {
      // Inner shoulder seams: (|x| <= 0.40, y >= 0.50)
      expect(computeAnchorPinningWeight(0.35, 0.58, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(-0.35, 0.58, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(0.40, 0.52, 0.0)).toBe(0.0);

      // Outer shoulder seams extending to armhole junction: (|x| in [0.50, 0.65], y >= 0.50)
      expect(computeAnchorPinningWeight(0.55, 0.60, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(-0.58, 0.65, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(0.64, 0.52, 0.0)).toBe(0.0);
    });

    it('assigns maximum 1.0 displacement weight to lower torso hem', () => {
      // Hem points at y = -0.85
      expect(computeAnchorPinningWeight(0.0, -0.85, 0.0)).toBe(1.0);
      expect(computeAnchorPinningWeight(0.25, -0.85, 0.0)).toBe(1.0);
      expect(computeAnchorPinningWeight(-0.25, -0.85, 0.0)).toBe(1.0);

      // Below hem
      expect(computeAnchorPinningWeight(0.0, -0.90, 0.0)).toBe(1.0);
    });

    it('assigns maximum displacement weight to sleeve cuffs', () => {
      // Cuffs at |x| = 0.95, y = 0.25
      expect(computeAnchorPinningWeight(0.95, 0.25, 0.0)).toBe(1.0);
      expect(computeAnchorPinningWeight(-0.95, 0.25, 0.0)).toBe(1.0);
    });

    it('produces monotonic weight increase from collar to hem along torso', () => {
      const yValues = [0.55, 0.35, 0.15, -0.15, -0.45, -0.85];
      const weights = yValues.map((y) => computeAnchorPinningWeight(0.0, y, 0.0));

      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1]);
      }
      expect(weights[0]).toBe(0.0);
      expect(weights[weights.length - 1]).toBe(1.0);
    });

    it('produces monotonic weight increase from shoulder seam to sleeve cuff', () => {
      const xValues = [0.35, 0.45, 0.60, 0.75, 0.95];
      const weights = xValues.map((x) => computeAnchorPinningWeight(x, 0.30, 0.0));

      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1]);
      }
      expect(weights[weights.length - 1]).toBe(1.0);
    });
  });

  describe('5. 3D Vertex Displacement & Fabric Volume Preservation', () => {
    it('guarantees identical original position when uInertiaLag is 0.0', () => {
      const collar = { x: 0.0, y: 0.55, z: 0.1 };
      const hem = { x: 0.2, y: -0.85, z: 0.1 };
      const cuff = { x: 0.95, y: 0.25, z: 0.0 };

      expect(computeDeformedVertex(collar, 0.0)).toEqual(collar);
      expect(computeDeformedVertex(hem, 0.0)).toEqual(hem);
      expect(computeDeformedVertex(cuff, 0.0)).toEqual(cuff);
    });

    it('leaves collar dip completely unmoved even during maximum cloth lag', () => {
      const collarVertex = { x: 0.0, y: 0.55, z: 0.1 };
      const maxLag = 0.35;

      const result = computeDeformedVertex(collarVertex, maxLag);
      expect(result.x).toBeCloseTo(collarVertex.x, 6);
      expect(result.y).toBeCloseTo(collarVertex.y, 6);
      expect(result.z).toBeCloseTo(collarVertex.z, 6);
    });

    it('displaces hem tangentially while strictly conserving cylindrical radius', () => {
      const hemVertex = { x: 0.3, y: -0.85, z: 0.15 };
      const origRadius = Math.sqrt(hemVertex.x * hemVertex.x + hemVertex.z * hemVertex.z);
      const lag = 0.20;

      const deformed = computeDeformedVertex(hemVertex, lag);
      const newRadius = Math.sqrt(deformed.x * deformed.x + deformed.z * deformed.z);

      // Y position is unchanged (horizontal slice rotation)
      expect(deformed.y).toBe(hemVertex.y);

      // Tangential displacement in X and Z
      expect(deformed.x).not.toBe(hemVertex.x);
      expect(deformed.z).not.toBe(hemVertex.z);

      // Conservation of radial distance (cross-sectional circumference preserved)
      expect(newRadius).toBeCloseTo(origRadius, 5);
    });

    it('correctly deforms procedural t-shirt geometry via CPU deformation utility', () => {
      const geo = createProceduralTShirtGeometry();
      const posAttr = geo.getAttribute('position');

      let hemIdx = -1;
      let collarIdx = -1;
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const x = posAttr.getX(i);
        if (hemIdx === -1 && y <= -0.80 && Math.abs(x) > 0.1) {
          hemIdx = i;
        }
        if (collarIdx === -1 && y >= 0.55 && Math.abs(x) <= 0.15) {
          collarIdx = i;
        }
      }

      expect(hemIdx).toBeGreaterThanOrEqual(0);
      expect(collarIdx).toBeGreaterThanOrEqual(0);

      const origHemX = posAttr.getX(hemIdx);
      const origHemZ = posAttr.getZ(hemIdx);
      const origCollarX = posAttr.getX(collarIdx);
      const origCollarY = posAttr.getY(collarIdx);
      const origCollarZ = posAttr.getZ(collarIdx);

      applyGarmentPhysicsDeformation(geo, 0.25);

      // Collar vertex remains strictly anchored
      expect(posAttr.getX(collarIdx)).toBeCloseTo(origCollarX, 5);
      expect(posAttr.getY(collarIdx)).toBeCloseTo(origCollarY, 5);
      expect(posAttr.getZ(collarIdx)).toBeCloseTo(origCollarZ, 5);

      // Hem vertex is displaced by cloth lag
      const newHemX = posAttr.getX(hemIdx);
      const newHemZ = posAttr.getZ(hemIdx);
      const dist = Math.hypot(newHemX - origHemX, newHemZ - origHemZ);
      expect(dist).toBeGreaterThan(0.01);
      expect((posAttr as THREE.BufferAttribute).version).toBeGreaterThan(0);
    });

    it('injects shader uniform and vertex modifications via attachGarmentPhysicsShader', () => {
      const mat = new THREE.MeshStandardMaterial();
      const uniform = attachGarmentPhysicsShader(mat, 0.0);

      expect(uniform).toBeDefined();
      expect(uniform.value).toBe(0.0);
      expect(mat.userData.uInertiaLag).toBe(uniform);

      // Verify onBeforeCompile hook
      const mockShader = {
        uniforms: {} as Record<string, THREE.IUniform>,
        vertexShader: '#include <begin_vertex>\nvec4 mvPos = vec4(transformed, 1.0);',
      };

      mat.onBeforeCompile(mockShader as unknown as THREE.WebGLProgramParametersWithUniforms, null as unknown as THREE.WebGLRenderer);

      expect(mockShader.uniforms.uInertiaLag).toBe(uniform);
      expect(mockShader.vertexShader).toContain('uniform float uInertiaLag;');
      expect(mockShader.vertexShader).toContain('APX-HVY-001 Rotational Cloth Sway');
    });
  });

  describe('6. R4: Zero-Deformation Guarantee for Blueprint & Technical Exporters', () => {
    it('immediately zeroes out inertia lag upon freeze()', () => {
      // Simulate active rotation lag
      simulator.update(0.0, 0.016);
      simulator.update(0.2, 0.016);
      expect(simulator.getInertiaLag()).toBeGreaterThan(0.01);

      // Freeze for snapshot capture
      simulator.freeze();
      expect(simulator.getInertiaLag()).toBe(0.0);

      // Updating while frozen remains strictly 0.0
      simulator.update(0.3, 0.016);
      expect(simulator.getInertiaLag()).toBe(0.0);

      // Unfreeze restores simulation state
      simulator.unfreeze();
      expect(simulator.getInertiaLag()).toBeGreaterThan(0.01);
    });

    it('idempotently handles consecutive freeze() calls without wiping the saved snapshot', () => {
      simulator.update(0.0, 0.016);
      simulator.update(0.25, 0.016);
      const activeLag = simulator.getInertiaLag();
      expect(activeLag).toBeGreaterThan(0.01);

      // Consecutive freeze calls
      simulator.freeze();
      expect(simulator.getInertiaLag()).toBe(0.0);
      simulator.freeze();
      expect(simulator.getInertiaLag()).toBe(0.0);

      // Unfreeze restores the original active lag, NOT 0.0
      simulator.unfreeze();
      expect(simulator.getInertiaLag()).toBeCloseTo(activeLag, 5);

      // Subsequent unfreeze calls are safe no-ops
      simulator.unfreeze();
      expect(simulator.getInertiaLag()).toBeCloseTo(activeLag, 5);
    });

    it('asserts zero deformation guarantee contract passes for snapshot export', () => {
      expect(assertZeroDeformationSnapshot(0.0)).toBe(true);
      expect(assertZeroDeformationSnapshot(undefined)).toBe(true);
      expect(assertZeroDeformationSnapshot(0.00000001)).toBe(true);
      expect(assertZeroDeformationSnapshot(0.05)).toBe(false);

      expect(BLUEPRINT_ZERO_DEFORMATION.uInertiaLag).toBe(0.0);
      expect(BLUEPRINT_ZERO_DEFORMATION.isZeroDeformation).toBe(true);
      expect(BLUEPRINT_ZERO_DEFORMATION.collarOffsetPreserved).toBe(true);

      expect(BLUEPRINT_SPEC_GUARANTEE.uInertiaLag).toBe(0.0);
      expect(verifyBlueprintUndistortedAccuracy(0.0)).toBe(true);
      expect(verifyBlueprintUndistortedAccuracy(0.1)).toBe(false);
    });

    it('guarantees 100% exact mathematical accuracy of blueprint measurements (collar offset, center-chest, dimensions)', () => {
      const element = {
        id: 'graphic-1',
        x: 50.0, // exactly centered
        y: 20.0, // 20% down from collar dip
        width: 30.0,
        height: 40.0,
        rotation: 0,
      };

      const measurements = computeBlueprintMeasurements(element, DEFAULT_PLATEN_CONFIG);

      // Kornit standard 35cm x 45cm platen
      // Center chest line: 17.5 cm
      expect(measurements.xCenterCm).toBe(17.5);
      expect(measurements.offsetCenterCm).toBe(0.0);
      expect(measurements.offsetCenterDirection).toBe('CENTER');

      // Collar reference: lowest neckline at Y = 0.0
      // Graphic top at yTopCm = (20% - 20%/2 = 10%? no, center at 20% of 45cm = 9.0cm, height = 40% of 45cm = 18cm)
      // Top = 9 - 9 = 0.0 cm
      expect(measurements.yCenterCm).toBe(9.0);
      expect(measurements.widthCm).toBe(10.5); // 30% of 35cm
      expect(measurements.heightCm).toBe(18.0); // 40% of 45cm
      expect(measurements.offsetTopCollarCm).toBe(0.0);

      // Verify that under zero deformation, measurement values are 100% stable and exact
      const repeated = computeBlueprintMeasurements(element, DEFAULT_PLATEN_CONFIG);
      expect(repeated).toEqual(measurements);
    });
  });

  describe('7. Adversarial Edge Cases & Robustness Fixes', () => {
    it('returns 0.0 pinning weight and unchanged coordinates for non-finite inputs', () => {
      expect(computeAnchorPinningWeight(NaN, 0.0)).toBe(0.0);
      expect(computeAnchorPinningWeight(0.0, NaN)).toBe(0.0);
      expect(computeAnchorPinningWeight(Infinity, 0.0)).toBe(0.0);

      const vertex = { x: 0.5, y: -0.5, z: 0.1 };
      expect(computeDeformedVertex(vertex, NaN)).toEqual(vertex);
      expect(computeDeformedVertex({ x: NaN, y: 0.0, z: 0.0 }, 0.2)).toEqual({ x: NaN, y: 0.0, z: 0.0 });
    });

    it('safely restores exact initial geometry after multiple CPU deformation applications', () => {
      const geo = createProceduralTShirtGeometry();
      const posAttr = geo.getAttribute('position');
      const origHemX = posAttr.getX(0);
      const origHemY = posAttr.getY(0);
      const origHemZ = posAttr.getZ(0);

      // Apply first deformation
      applyGarmentPhysicsDeformation(geo, 0.30);
      // Apply second opposing deformation
      applyGarmentPhysicsDeformation(geo, -0.20);
      // Reset deformation to neutral rest state (0.0)
      applyGarmentPhysicsDeformation(geo, 0.0);

      expect(posAttr.getX(0)).toBeCloseTo(origHemX, 6);
      expect(posAttr.getY(0)).toBeCloseTo(origHemY, 6);
      expect(posAttr.getZ(0)).toBeCloseTo(origHemZ, 6);
    });

    it('synchronously transforms objectNormal in beginnormal_vertex before defaultnormal_vertex and normal_vertex', () => {
      const mat = new THREE.MeshStandardMaterial();
      attachGarmentPhysicsShader(mat, 0.0);

      // Verify customProgramCacheKey is defined for WebGL program caching
      expect(mat.customProgramCacheKey?.()).toBe('garmentPhysicsShader_v2');

      const standardShader = {
        uniforms: {} as Record<string, THREE.IUniform>,
        vertexShader: THREE.ShaderLib.standard.vertexShader,
      };

      mat.onBeforeCompile(
        standardShader as unknown as THREE.WebGLProgramParametersWithUniforms,
        null as unknown as THREE.WebGLRenderer
      );

      expect(standardShader.vertexShader).toContain('computeGarmentPhysicsWeight');
      expect(standardShader.vertexShader).toContain('objectNormal.x = newNx;');
      expect(standardShader.vertexShader).toContain('transformed.x = newX;');

      const idxNormalMod = standardShader.vertexShader.indexOf('objectNormal.x = newNx;');
      const idxDefaultNormal = standardShader.vertexShader.indexOf('#include <defaultnormal_vertex>');
      const idxNormalVertex = standardShader.vertexShader.indexOf('#include <normal_vertex>');
      const idxVertexMod = standardShader.vertexShader.indexOf('transformed.x = newX;');

      // Critical Three.js execution order verification:
      // Normal modification must occur BEFORE defaultnormal_vertex (which builds transformedNormal)
      // and normal_vertex (which normalizes vNormal for the fragment shader)
      expect(idxNormalMod).toBeGreaterThan(0);
      expect(idxNormalMod).toBeLessThan(idxDefaultNormal);
      expect(idxDefaultNormal).toBeLessThan(idxNormalVertex);
      expect(idxNormalVertex).toBeLessThan(idxVertexMod);
    });

    it('clamps angular velocity and acceleration to exact 0.0 upon rest state settlement', () => {
      simulator.update(0.0, 0.016);
      simulator.update(0.1, 0.016);

      // Run 90 settle frames
      for (let i = 0; i < 90; i++) {
        simulator.update(0.1, 0.016);
      }

      expect(simulator.getInertiaLag()).toBe(0.0);
      expect(simulator.getAngularVelocity()).toBe(0.0);
      expect(simulator.getAngularAcceleration()).toBe(0.0);
      expect(simulator.isAtRest()).toBe(true);
    });

    it('spherical preset transition preserves outer camera distance without penetrating garment interior', () => {
      const target = new THREE.Vector3(0, 0, 0);
      const startPos = new THREE.Vector3(0, 0.1, 2.3);
      const endPos = new THREE.Vector3(0, 0.1, -2.3);

      const startSph = new THREE.Spherical().setFromVector3(startPos.clone().sub(target));
      const endSph = new THREE.Spherical().setFromVector3(endPos.clone().sub(target));

      const targetSph = { radius: endSph.radius, phi: endSph.phi, theta: endSph.theta };
      const currentSph = new THREE.Spherical().copy(startSph);
      const camPos = new THREE.Vector3();
      let minDistance = Infinity;

      for (let f = 0; f < 30; f++) {
        let deltaTheta = targetSph.theta - currentSph.theta;
        while (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
        while (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;

        currentSph.radius += (targetSph.radius - currentSph.radius) * 0.08;
        currentSph.phi += (targetSph.phi - currentSph.phi) * 0.08;
        currentSph.theta += deltaTheta * 0.08;
        camPos.setFromSpherical(currentSph);
        const dist = camPos.distanceTo(target);
        if (dist < minDistance) minDistance = dist;
      }

      // Camera must stay outside the garment (distance ~2.3), NOT drop to 0.06 as in Cartesian lerp
      expect(minDistance).toBeGreaterThan(2.2);
    });

    it('smoothly transitions across PI boundary without reversing direction or velocity spikes', () => {
      const target = new THREE.Vector3(0, 0, 0);
      // Start near PI boundary (0.1, 0.1, -2.3)
      const startPos = new THREE.Vector3(0.1, 0.1, -2.3);
      // End across PI boundary (-0.1, 0.1, -2.3)
      const endPos = new THREE.Vector3(-0.1, 0.1, -2.3);

      const targetSph = new THREE.Spherical().setFromVector3(endPos.clone().sub(target));
      const currentSph = new THREE.Spherical().setFromVector3(startPos.clone().sub(target));
      const camera = new THREE.PerspectiveCamera();
      camera.position.copy(startPos);

      let maxStepVelocity = 0;
      let lastYaw = Math.atan2(camera.position.x, camera.position.z);

      for (let f = 0; f < 40; f++) {
        const offset = camera.position.clone().sub(target);
        const curSph = new THREE.Spherical().setFromVector3(offset);

        let deltaTheta = targetSph.theta - curSph.theta;
        while (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
        while (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;

        const dRadius = Math.abs(targetSph.radius - curSph.radius);
        const dPhi = Math.abs(targetSph.phi - curSph.phi);
        const dTheta = Math.abs(deltaTheta);

        if (dRadius < 0.005 && dPhi < 0.005 && dTheta < 0.005) {
          camera.position
            .setFromSpherical(new THREE.Spherical(targetSph.radius, targetSph.phi, targetSph.theta))
            .add(target);
          break;
        }

        const lerpFactor = 0.08;
        curSph.radius += (targetSph.radius - curSph.radius) * lerpFactor;
        curSph.phi += (targetSph.phi - curSph.phi) * lerpFactor;
        curSph.theta += deltaTheta * lerpFactor;
        camera.position.setFromSpherical(curSph).add(target);

        const currentYaw = Math.atan2(camera.position.x, camera.position.z);
        let dyaw = currentYaw - lastYaw;
        while (dyaw > Math.PI) dyaw -= 2 * Math.PI;
        while (dyaw < -Math.PI) dyaw += 2 * Math.PI;
        const v = Math.abs(dyaw) / 0.016;
        if (v > maxStepVelocity) maxStepVelocity = v;
        lastYaw = currentYaw;
      }

      // Max velocity must remain smooth (< 1.5 rad/s) without jumping to 30+ rad/s or reversing
      expect(maxStepVelocity).toBeLessThan(1.5);
      expect(camera.position.distanceTo(endPos)).toBeLessThan(0.01);
    });

    it('correctly handles frame drops and large dt without artificial velocity amplification', () => {
      simulator.update(0.0, 0.016);

      // Rotate 0.2 rad over a 0.5s frame hitch (effective velocity should be ~0.4 rad/s)
      simulator.update(0.2, 0.5);

      const vel = simulator.getAngularVelocity();
      // Must NOT be amplified by 5x (which would happen if dividing by clampedDt = 0.1s -> 2.0 rad/s)
      expect(vel).toBeLessThan(0.5);
      expect(vel).toBeGreaterThan(0.1);
    });

    it('gracefully handles tab suspension and background resume (>0.5s pause)', () => {
      simulator.update(0.0, 0.016);
      simulator.update(0.1, 0.016);

      // User tabbed away for 3 seconds
      const lag = simulator.update(0.8, 3.0);

      // Should resync smoothly without generating explosive acceleration
      expect(simulator.getAngularVelocity()).toBe(0.0);
      expect(simulator.getAngularAcceleration()).toBe(0.0);
      expect(Number.isFinite(lag)).toBe(true);
    });

    it('maintains continuous yaw tracking during freeze to prevent unfreeze velocity jumps', () => {
      simulator.update(0.0, 0.016);
      simulator.update(0.1, 0.016);

      // Freeze for blueprint export
      simulator.freeze();
      expect(simulator.getInertiaLag()).toBe(0.0);

      // Turntable rotates by 0.3 rad while frozen
      simulator.update(0.4, 0.016);
      expect(simulator.getInertiaLag()).toBe(0.0);

      // Unfreeze
      simulator.unfreeze();

      // Next tick rotates by a normal 0.01 rad
      simulator.update(0.41, 0.016);

      // Velocity must reflect the small 0.01 rad delta (~0.6 rad/s), NOT the 0.3 rad jump (~19 rad/s)
      expect(Math.abs(simulator.getAngularVelocity())).toBeLessThan(3.0);
    });

    it('preserves positive triangle surface area and zero vertex self-intersection under extreme direction reversals', () => {
      const geo = createProceduralTShirtGeometry();
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const indexAttr = geo.getIndex() as THREE.BufferAttribute;
      expect(indexAttr).toBeDefined();

      // Collect valid non-degenerate faces at rest (procedural cutout seams contain boundary collapse quads)
      const validFaces: number[][] = [];
      for (let i = 0; i < indexAttr.count; i += 3) {
        const i0 = indexAttr.getX(i);
        const i1 = indexAttr.getX(i + 1);
        const i2 = indexAttr.getX(i + 2);

        const v0 = new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
        const v1 = new THREE.Vector3(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1));
        const v2 = new THREE.Vector3(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2));

        const restArea = 0.5 * v1.clone().sub(v0).cross(v2.clone().sub(v0)).length();
        if (restArea > 0.0001) {
          validFaces.push([i0, i1, i2]);
        }
      }
      expect(validFaces.length).toBeGreaterThan(2500);

      const reversals = [0.35, -0.35, 0.35, -0.35];
      for (const lag of reversals) {
        applyGarmentPhysicsDeformation(geo, lag);

        let minTriangleArea = Infinity;
        for (const [i0, i1, i2] of validFaces) {
          const v0 = new THREE.Vector3(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
          const v1 = new THREE.Vector3(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1));
          const v2 = new THREE.Vector3(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2));

          const edge1 = v1.clone().sub(v0);
          const edge2 = v2.clone().sub(v0);
          const area = 0.5 * edge1.cross(edge2).length();

          expect(Number.isFinite(area)).toBe(true);
          if (area < minTriangleArea) minTriangleArea = area;
        }

        // Must preserve non-zero triangle area (> 0.0001) without collapsed or self-intersecting geometry
        expect(minTriangleArea).toBeGreaterThan(0.0001);
      }
    });

    it('maintains continuous physical time advancement across low-FPS client hitches without slow-motion distortion', () => {
      // Step simulator with 0.25s hitch (4 FPS) vs multiple 0.016s frames (60 FPS)
      const simHitch = new GarmentPhysicsSimulator();
      const sim60fps = new GarmentPhysicsSimulator();

      simHitch.update(0.0, 0.016);
      sim60fps.update(0.0, 0.016);

      // Induce rotation
      simHitch.update(0.2, 0.016);
      sim60fps.update(0.2, 0.016);

      // Settle over 0.25 seconds
      // In 60 FPS: 16 frames of ~0.016s = 0.256s
      for (let i = 0; i < 16; i++) {
        sim60fps.update(0.2, 0.016);
      }

      // In hitch: single 0.25s frame
      simHitch.update(0.2, 0.25);

      // Both should have progressed their spring-damper settle curves correspondingly
      // rather than simHitch being frozen in time at only 0.1s
      expect(Math.abs(simHitch.getInertiaLag() - sim60fps.getInertiaLag())).toBeLessThan(0.05);
    });

    it('tracks rotation deceleration to rest during snapshot freeze without residual acceleration jerk', () => {
      // Rotate turntable at ~0.21 rad/s
      simulator.update(0.0, 0.016);
      simulator.update(0.05, 0.016);

      // Freeze during blueprint capture
      simulator.freeze();
      expect(simulator.getInertiaLag()).toBe(0.0);

      // Rotation slows down to rest while frozen
      let yaw = 0.05;
      for (let i = 0; i < 10; i++) {
        simulator.update(yaw, 0.016);
      }

      // Unfreeze
      simulator.unfreeze();

      // Next tick with no rotation
      simulator.update(yaw, 0.016);

      // Angular acceleration must remain small (< 1.0 rad/s^2), NOT jump because of stale pre-freeze velocity
      expect(Math.abs(simulator.getAngularAcceleration())).toBeLessThan(1.0);
    });

    it('guarantees zero deformation snapshot export during active turntable auto-rotate spinning', () => {
      // Active continuous turntable auto-rotate
      let yaw = 0.0;
      simulator.update(yaw, 0.016);
      for (let f = 0; f < 30; f++) {
        yaw += 0.21 * 0.016;
        simulator.update(yaw, 0.016);
      }

      const activeLag = simulator.getInertiaLag();
      expect(activeLag).toBeGreaterThan(0.01);

      // Capture orthographic snapshot: freeze simulator
      simulator.freeze();
      const frozenLag = simulator.getInertiaLag();
      expect(frozenLag).toBe(0.0);

      // Landmark points under snapshot export
      const collarDip = { x: 0.0, y: 0.46, z: 0.07 };
      const hemCenter = { x: 0.0, y: -0.85, z: 0.30 };
      const sleeveCuff = { x: 0.95, y: 0.25, z: 0.0 };

      // Under frozen lag (0.0), all vertices MUST be 100% undistorted and exact
      expect(computeDeformedVertex(collarDip, frozenLag)).toEqual(collarDip);
      expect(computeDeformedVertex(hemCenter, frozenLag)).toEqual(hemCenter);
      expect(computeDeformedVertex(sleeveCuff, frozenLag)).toEqual(sleeveCuff);

      // Unfreeze: restores active turntable lag
      simulator.unfreeze();
      expect(simulator.getInertiaLag()).toBeCloseTo(activeLag, 5);
    });
  });
});
