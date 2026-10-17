/**
 * src/lib/garmentPhysics.ts
 * Rotational Inertia & Cloth Sway Physics Engine for ape-parel 3D studio.
 *
 * Implements real-time angular velocity tracking around the Y-axis (yaw),
 * anchored vertex pinning (0% deformation at collar dip and shoulder seams),
 * and damped harmonic oscillation calibrated for heavyweight 240 GSM combed cotton.
 *
 * Guarantees zero deformation (uInertiaLag = 0.0) during blueprint & snapshot export.
 */

import * as THREE from 'three';

export interface FabricPhysicsConfig {
  gsm: number; // Fabric mass per area (240 GSM combed cotton)
  stiffnessK: number; // Spring stiffness k (rad^2 / s^2)
  dampingC: number; // Fabric damping coefficient c (rad / s)
  maxLagAngleRad: number; // Maximum cloth sway angle clamp (~20 degrees)
  velocityDriveFactor: number; // Torque factor driven by angular velocity
  accelDriveFactor: number; // Inertial torque factor driven by angular acceleration
  settleTolerance: number; // Convergence tolerance for resting state
}

/**
 * Physical calibration specifically tuned for heavyweight 240 GSM combed cotton:
 * - Natural angular frequency ~11.83 rad/s (low fluttering frequency ~1.88 Hz)
 * - Underdamped ratio zeta ~0.465 (1 subtle overshoot wave and gentle settle)
 * - Maximum deflection clamped to ~0.35 rad (approx 20 deg)
 */
export const FABRIC_CONFIG_240GSM: FabricPhysicsConfig = {
  gsm: 240,
  stiffnessK: 140.0,
  dampingC: 11.0,
  maxLagAngleRad: 0.35,
  velocityDriveFactor: 16.0,
  accelDriveFactor: 1.2,
  settleTolerance: 0.0005,
};

export interface AnchorPinningBounds {
  yHem?: number; // Torso lower hem vertical coordinate (default: -0.85)
  yAnchor?: number; // Collar/shoulder seam anchor height (default: 0.50)
  xTorso?: number; // Torso boundary half-width (default: 0.40)
  xCuff?: number; // Sleeve cuff extent (default: 0.95)
  xShoulder?: number; // Shoulder seam extent (default: 0.65)
}

/**
 * Computes the anchor pinning weight for a point on the garment mesh.
 * - Collar dip, ribbing, and shoulder seams: returns exactly 0.0 (0% deformation / rigidly anchored).
 * - Lower torso hem: returns 1.0 (maximum displacement).
 * - Sleeve cuffs: returns ~1.0 (maximum displacement).
 * - Intermediate regions: smooth monotonic progression based on distance from anchors.
 */
export function computeAnchorPinningWeight(
  x: number,
  y: number,
  _z = 0,
  bounds: AnchorPinningBounds = {}
): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return 0.0;
  }

  const yHem = bounds.yHem ?? -0.85;
  const yAnchor = bounds.yAnchor ?? 0.50;
  const xTorso = bounds.xTorso ?? 0.40;
  const xCuff = bounds.xCuff ?? 0.95;
  const xShoulder = bounds.xShoulder ?? 0.65;

  const absX = Math.abs(x);

  // Rigid Collar Dip & Ribbing: center front/back neckline area
  // Collar dip is at center (|x| <= 0.22) above y = 0.42
  if (y >= 0.42 && absX <= 0.22) {
    return 0.0;
  }

  // Rigid Shoulder Seams: top ridge of garment across neck to armhole
  if (y >= yAnchor && absX <= xShoulder) {
    return 0.0;
  }

  // Torso vertical progression down to hem:
  // 0 at yAnchor, increasing to 1.0 at yHem
  let torsoWeight = 0.0;
  if (y < yAnchor) {
    const t = Math.min(1.0, Math.max(0.0, (yAnchor - y) / (yAnchor - yHem)));
    torsoWeight = Math.pow(t, 1.25); // Heavy cotton drape curve
  }

  // Sleeve horizontal/radial progression out to cuffs:
  // 0 at xTorso, increasing to 1.0 at xCuff
  let sleeveWeight = 0.0;
  if (absX > xTorso) {
    const tSleeve = Math.min(1.0, Math.max(0.0, (absX - xTorso) / (xCuff - xTorso)));
    sleeveWeight = Math.pow(tSleeve, 1.1);
  }

  // Combine torso and sleeve lag weights
  let combined = Math.max(torsoWeight, sleeveWeight);

  // Final check for neck/shoulder anchor protection
  if (y >= yAnchor && absX <= xShoulder) {
    combined = 0.0;
  }

  return Math.min(1.0, Math.max(0.0, combined));
}

/**
 * Calculates vertex displacement under rotational cloth inertia lag.
 * When uInertiaLag === 0.0 or pinning weight === 0.0, returns exact original coordinates.
 */
export function computeDeformedVertex(
  position: { x: number; y: number; z: number },
  uInertiaLag: number,
  bounds: AnchorPinningBounds = {}
): { x: number; y: number; z: number } {
  if (
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    !Number.isFinite(position.z) ||
    !Number.isFinite(uInertiaLag) ||
    Math.abs(uInertiaLag) < 1e-7
  ) {
    return { x: position.x, y: position.y, z: position.z };
  }

  const weight = computeAnchorPinningWeight(position.x, position.y, position.z, bounds);
  if (weight <= 0.0) {
    return { x: position.x, y: position.y, z: position.z };
  }

  const theta = -uInertiaLag * weight;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Tangential rotation around Y-axis preserving cylindrical radius and fabric volume
  return {
    x: position.x * cosT - position.z * sinT,
    y: position.y,
    z: position.x * sinT + position.z * cosT,
  };
}

/**
 * Applies CPU-side rotational cloth lag deformation to a Three.js BufferGeometry.
 * Useful for headless testing, geometry export, or CPU fallback.
 */
export function applyGarmentPhysicsDeformation(
  geometry: THREE.BufferGeometry,
  uInertiaLag: number,
  bounds: AnchorPinningBounds = {}
): void {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return;

  // Cache or retrieve pristine initial position to avoid compounding deformation
  let origPos = geometry.getAttribute('initialPosition') as THREE.BufferAttribute | undefined;
  if (!origPos) {
    origPos = posAttr.clone() as THREE.BufferAttribute;
    geometry.setAttribute('initialPosition', origPos);
  }

  const count = posAttr.count;
  for (let i = 0; i < count; i++) {
    const x = origPos.getX(i);
    const y = origPos.getY(i);
    const z = origPos.getZ(i);

    const deformed = computeDeformedVertex({ x, y, z }, uInertiaLag, bounds);
    posAttr.setXYZ(i, deformed.x, deformed.y, deformed.z);
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Injects the rotational cloth sway vertex shader modifications into a Three.js MeshStandardMaterial.
 * Connects the `uInertiaLag` uniform to material.userData.uInertiaLag.
 * Rotates both vertex positions (transformed) and surface normals (objectNormal) synchronously.
 */
export function attachGarmentPhysicsShader(
  material: THREE.MeshStandardMaterial,
  initialLag = 0.0
): THREE.IUniform<number> {
  if (!material.userData.uInertiaLag) {
    material.userData.uInertiaLag = { value: initialLag };
  }
  const lagUniform = material.userData.uInertiaLag;

  material.customProgramCacheKey = () => 'garmentPhysicsShader_v2';

  const prevOnBeforeCompile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prevOnBeforeCompile?.(shader, renderer);

    shader.uniforms.uInertiaLag = lagUniform;

    shader.vertexShader = `
      uniform float uInertiaLag;
      // APX-HVY-001 Rotational Cloth Sway & Inertia Lag for 240 GSM Cotton
      float computeGarmentPhysicsWeight(vec3 pos) {
        float yNorm = clamp((pos.y - (-0.85)) / (0.50 - (-0.85)), 0.0, 1.0);
        float torsoWeight = pow(1.0 - yNorm, 1.25);

        float absX = abs(pos.x);
        float sleeveWeight = 0.0;
        if (absX > 0.40) {
          sleeveWeight = pow(clamp((absX - 0.40) / (0.95 - 0.40), 0.0, 1.0), 1.1);
        }

        float combinedWeight = max(torsoWeight, sleeveWeight);

        if ((pos.y >= 0.42 && absX <= 0.22) || (pos.y >= 0.50 && absX <= 0.65)) {
          combinedWeight = 0.0;
        }

        return combinedWeight;
      }
    ` + shader.vertexShader;

    // 1. Rotate surface normal in beginnormal_vertex BEFORE defaultnormal_vertex & normal_vertex
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
      #include <beginnormal_vertex>
      if (abs(uInertiaLag) > 0.00001) {
        float weightN = computeGarmentPhysicsWeight(position);
        float thetaN = -uInertiaLag * weightN;
        float cosTN = cos(thetaN);
        float sinTN = sin(thetaN);
        float newNx = objectNormal.x * cosTN - objectNormal.z * sinTN;
        float newNz = objectNormal.x * sinTN + objectNormal.z * cosTN;
        objectNormal.x = newNx;
        objectNormal.z = newNz;
      }
      `
    );

    // 2. Rotate vertex position in begin_vertex synchronously
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      if (abs(uInertiaLag) > 0.00001) {
        float weightV = computeGarmentPhysicsWeight(position);
        float thetaV = -uInertiaLag * weightV;
        float cosTV = cos(thetaV);
        float sinTV = sin(thetaV);
        float newX = transformed.x * cosTV - transformed.z * sinTV;
        float newZ = transformed.x * sinTV + transformed.z * cosTV;
        transformed.x = newX;
        transformed.z = newZ;
      }
      `
    );
  };

  material.needsUpdate = true;
  return lagUniform;
}

/**
 * Real-time physics simulator managing rotational inertia, angular velocity derivation,
 * and damped harmonic spring-damper settling.
 */
export class GarmentPhysicsSimulator {
  private config: FabricPhysicsConfig;
  private currentYaw: number = 0;
  private previousYaw: number = 0;
  private angularVelocity: number = 0; // rad/s
  private previousVelocity: number = 0;
  private angularAcceleration: number = 0; // rad/s^2
  private inertiaLag: number = 0; // radians
  private lagVelocity: number = 0; // rad/s
  private isFrozen: boolean = false;
  private frozenLagSnapshot: number = 0;
  private hasInitializedYaw: boolean = false;

  constructor(customConfig?: Partial<FabricPhysicsConfig>) {
    this.config = { ...FABRIC_CONFIG_240GSM, ...customConfig };
  }

  /**
   * Updates the simulator with current azimuthal yaw angle and time step.
   * Computes angular velocity omega = delta yaw / delta t and integrates cloth lag.
   */
  public update(yaw: number, dt: number): number {
    if (this.isFrozen) {
      if (Number.isFinite(yaw)) {
        let deltaYaw = yaw - this.currentYaw;
        while (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
        while (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;
        this.currentYaw = yaw;
        this.previousYaw = yaw;
        if (Math.abs(deltaYaw) < 1e-5) {
          this.angularVelocity = 0.65 * this.angularVelocity;
          this.previousVelocity = this.angularVelocity;
        }
      }
      return 0.0;
    }

    if (!Number.isFinite(yaw) || !Number.isFinite(dt) || dt <= 0) {
      return this.inertiaLag;
    }

    if (!this.hasInitializedYaw) {
      this.currentYaw = yaw;
      this.previousYaw = yaw;
      this.hasInitializedYaw = true;
      return 0.0;
    }

    // If frame drop / tab switch exceeds 0.5s, smoothly resync reference yaw without jerk
    if (dt > 0.5) {
      this.previousYaw = yaw;
      this.currentYaw = yaw;
      this.angularVelocity = 0.0;
      this.previousVelocity = 0.0;
      this.angularAcceleration = 0.0;
      return this.inertiaLag;
    }

    // Shortest circular angular difference across [-PI, PI]
    let deltaYaw = yaw - this.currentYaw;
    while (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
    while (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;

    this.previousYaw = this.currentYaw;
    this.currentYaw = yaw;

    // Authentic angular velocity omega = delta theta / delta t using true elapsed time
    const effectiveDt = Math.max(dt, 0.001);
    const newVelocity = deltaYaw / effectiveDt;

    // Low-pass filter velocity for authentic fabric inertia with frame-rate independent time constant
    const filterAlpha = Math.pow(0.65, effectiveDt / 0.016);
    this.angularVelocity = filterAlpha * this.angularVelocity + (1 - filterAlpha) * newVelocity;

    // Angular acceleration alpha = d(omega) / dt
    this.angularAcceleration = (this.angularVelocity - this.previousVelocity) / effectiveDt;
    this.previousVelocity = this.angularVelocity;

    // External torque driven by rotation
    const externalTorque =
      this.config.velocityDriveFactor * this.angularVelocity +
      this.config.accelDriveFactor * this.angularAcceleration;

    // Substep integration for numerical stability (clamped to 0.5s max ODE advancement to avoid slow-motion dilation during frame drops)
    const clampedDt = Math.min(effectiveDt, 0.5);
    const maxSubstep = 0.016;
    let remainingDt = clampedDt;
    let torque = externalTorque;
    while (remainingDt > 1e-6) {
      const stepDt = Math.min(remainingDt, maxSubstep);

      // Spring-damper ODE: a = -k * x - c * v + F
      const accel =
        -this.config.stiffnessK * this.inertiaLag -
        this.config.dampingC * this.lagVelocity +
        torque;

      this.lagVelocity += accel * stepDt;
      this.inertiaLag += this.lagVelocity * stepDt;

      // Transient torque naturally relaxes across multi-substep frame hitches
      torque *= Math.pow(0.65, stepDt / 0.016);

      remainingDt -= stepDt;
    }

    // Clamp maximum deflection
    this.inertiaLag = Math.max(
      -this.config.maxLagAngleRad,
      Math.min(this.config.maxLagAngleRad, this.inertiaLag)
    );

    // Smooth resting settle: clamp to exact 0 when motion has dissipated
    if (
      Math.abs(this.angularVelocity) < 0.001 &&
      Math.abs(this.inertiaLag) < this.config.settleTolerance &&
      Math.abs(this.lagVelocity) < this.config.settleTolerance
    ) {
      this.inertiaLag = 0.0;
      this.lagVelocity = 0.0;
      this.angularVelocity = 0.0;
      this.angularAcceleration = 0.0;
    }

    return this.inertiaLag;
  }

  /**
   * Helper for headless simulations and testing: steps the simulator with an explicit angular velocity.
   */
  public stepManual(angularVelocity: number, dt: number): number {
    const nextYaw = this.currentYaw + angularVelocity * dt;
    return this.update(nextYaw, dt);
  }

  /**
   * Freezes dynamic deformation immediately (uInertiaLag = 0.0) for snapshot / blueprint capture.
   * Idempotent: repeated calls will not overwrite the cached pre-freeze lag snapshot.
   */
  public freeze(): void {
    if (this.isFrozen) {
      return;
    }
    this.isFrozen = true;
    this.frozenLagSnapshot = this.inertiaLag;
    this.inertiaLag = 0.0;
  }

  /**
   * Unfreezes dynamic deformation and restores physics state.
   * Idempotent: ignored if simulator is not currently frozen.
   */
  public unfreeze(): void {
    if (!this.isFrozen) {
      return;
    }
    this.isFrozen = false;
    this.inertiaLag = this.frozenLagSnapshot;
  }

  /**
   * Resets simulator to neutral rest state.
   */
  public reset(): void {
    this.currentYaw = 0;
    this.previousYaw = 0;
    this.angularVelocity = 0;
    this.previousVelocity = 0;
    this.angularAcceleration = 0;
    this.inertiaLag = 0;
    this.lagVelocity = 0;
    this.isFrozen = false;
    this.frozenLagSnapshot = 0;
    this.hasInitializedYaw = false;
  }

  public getInertiaLag(): number {
    return this.isFrozen ? 0.0 : this.inertiaLag;
  }

  public getAngularVelocity(): number {
    return this.angularVelocity;
  }

  public getAngularAcceleration(): number {
    return this.angularAcceleration;
  }

  public isAtRest(tolerance = 0.001): boolean {
    return (
      Math.abs(this.inertiaLag) < tolerance &&
      Math.abs(this.lagVelocity) < tolerance &&
      Math.abs(this.angularVelocity) < tolerance
    );
  }

  public getConfig(): Readonly<FabricPhysicsConfig> {
    return this.config;
  }
}

/**
 * Blueprint & Technical Exporter Zero-Deformation Contract.
 */
export const BLUEPRINT_ZERO_DEFORMATION = {
  uInertiaLag: 0.0,
  isZeroDeformation: true,
  collarOffsetPreserved: true,
};

export function assertZeroDeformationSnapshot(uInertiaLag?: number): boolean {
  return uInertiaLag === undefined || Math.abs(uInertiaLag) < 1e-7;
}
