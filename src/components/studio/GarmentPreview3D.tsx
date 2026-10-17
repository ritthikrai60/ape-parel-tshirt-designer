'use client';

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Maximize2, Move3d } from 'lucide-react';
import { createProceduralTShirtGeometry } from '@/lib/tshirtGeometry';
import { GarmentPhysicsSimulator, attachGarmentPhysicsShader } from '@/lib/garmentPhysics';
import { useSettings } from '@/components/providers/SettingsProvider';

export type ViewPreset = 'FRONT' | 'BACK' | 'ISOMETRIC';

/**
 * Calculates optimal camera distance to frame the entire garment (full body)
 * with comfortable margins in both width (1.9m sleeves) and height (1.78m + floor shadow),
 * delivering a clean max-zoomed-out full-body studio framing.
 */
export function getOptimalCameraDistance(aspect: number = 1): number {
  const baseDistance = 3.5;
  if (aspect < 1.1) {
    return Math.min(6.5, Math.max(baseDistance, (baseDistance * 1.08) / Math.max(aspect, 0.45)));
  }
  return baseDistance;
}

export interface GarmentPreview3DHandle {
  captureOrthographicSnapshot: (
    surface?: 'FRONT' | 'BACK',
    width?: number,
    height?: number,
    cleanBlank?: boolean
  ) => Promise<string>;
  getCanvas: () => HTMLCanvasElement | null;
  getPhysicsSimulator?: () => GarmentPhysicsSimulator | null;
  getInertiaLag?: () => number;
}

export interface GarmentPreview3DProps {
  textureCanvas: HTMLCanvasElement | null;
  garmentColorHex: string;
  textureVersion?: number;
  className?: string;
  autoRotate?: boolean;
  onLoaded?: () => void;
  activePreset?: ViewPreset;
  onPresetChange?: (preset: ViewPreset) => void;
}

/**
 * Creates a soft radial contact shadow texture for the floor plane.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0.0, 'rgba(19, 23, 24, 0.35)');
    gradient.addColorStop(0.3, 'rgba(19, 23, 24, 0.20)');
    gradient.addColorStop(0.65, 'rgba(19, 23, 24, 0.06)');
    gradient.addColorStop(1.0, 'rgba(19, 23, 24, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const GarmentPreview3D = forwardRef<GarmentPreview3DHandle, GarmentPreview3DProps>(
  (
    {
      textureCanvas,
      garmentColorHex,
      textureVersion = 0,
      className = '',
      autoRotate = false,
      onLoaded,
      activePreset = 'FRONT',
      onPresetChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const canvasTextureRef = useRef<THREE.CanvasTexture | null>(null);
    const garmentMeshRef = useRef<THREE.Object3D | null>(null);
    const garmentMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const animFrameIdRef = useRef<number | null>(null);
    const shadowPlaneRef = useRef<THREE.Mesh | null>(null);
    const floorPlaneRef = useRef<THREE.Mesh | null>(null);

    const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
    const [usingFallback, setUsingFallback] = useState<boolean>(false);
    const [isRotating, setIsRotating] = useState<boolean>(autoRotate);
    const [touchOrbitActive, setTouchOrbitActive] = useState<boolean>(false);
    const { t } = useSettings();

    const targetSphericalRef = useRef<{ radius: number; phi: number; theta: number } | null>(null);
    const simulatorRef = useRef<GarmentPhysicsSimulator>(new GarmentPhysicsSimulator());
    const lastFrameTimeRef = useRef<number>(0);

    /**
     * Captures a high-resolution orthographic snapshot from the front or back
     * perspective without perspective distortion.
     * R4 Guarantee: Strictly freezes dynamic cloth deformation (uInertiaLag = 0.0)
     * during the capture frame so blueprint millimeter measurements are 100% exact.
     */
    const captureOrthographicSnapshot = useCallback(
      async (
        surface: 'FRONT' | 'BACK' = 'FRONT',
        width = 1024,
        height = 1024,
        cleanBlank = true
      ): Promise<string> => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        if (!renderer || !scene) {
          return '';
        }

        const origSize = new THREE.Vector2();
        renderer.getSize(origSize);
        const origPixelRatio = renderer.getPixelRatio();

        // R4 Zero-Deformation Guarantee: Freeze physics and set uInertiaLag = 0.0
        const simulator = simulatorRef.current;
        simulator.freeze();
        if (garmentMaterialRef.current?.userData?.uInertiaLag) {
          garmentMaterialRef.current.userData.uInertiaLag.value = 0.0;
        }

        // Temporarily hide floor shadows for clean isolated garment capture
        if (shadowPlaneRef.current) shadowPlaneRef.current.visible = false;
        if (floorPlaneRef.current) floorPlaneRef.current.visible = false;

        // Clean Garment Blank Guarantee: Detach texture map temporarily so the 3D snapshot captures
        // the unblemished 3D fabric geometry, surface depth, folds, and lighting
        const originalMap = garmentMaterialRef.current?.map || null;
        if (cleanBlank && garmentMaterialRef.current) {
          garmentMaterialRef.current.map = null;
          garmentMaterialRef.current.needsUpdate = true;
        }

        let dataUrl = '';
        try {
          // Orthographic camera without perspective distortion
          const aspect = width / height;
          const frustumHeight = 2.3;
          const frustumWidth = frustumHeight * aspect;
          const orthoCamera = new THREE.OrthographicCamera(
            -frustumWidth / 2,
            frustumWidth / 2,
            frustumHeight / 2,
            -frustumHeight / 2,
            0.1,
            20
          );

          if (surface === 'FRONT') {
            orthoCamera.position.set(0, 0, 5);
          } else {
            orthoCamera.position.set(0, 0, -5);
          }
          orthoCamera.lookAt(0, 0, 0);

          // Ensure canvas texture is synchronized if keeping texture
          if (!cleanBlank && canvasTextureRef.current) {
            canvasTextureRef.current.needsUpdate = true;
          }

          renderer.setPixelRatio(1);
          renderer.setSize(width, height, false);
          renderer.render(scene, orthoCamera);

          dataUrl = renderer.domElement.toDataURL('image/png');
        } catch (e) {
          console.warn('[GarmentPreview3D] Failed to extract data URL:', e);
        } finally {
          // Restore texture map immediately
          if (cleanBlank && garmentMaterialRef.current && originalMap) {
            garmentMaterialRef.current.map = originalMap;
            garmentMaterialRef.current.needsUpdate = true;
          }

          // Restore floor shadows
          if (shadowPlaneRef.current) shadowPlaneRef.current.visible = true;
          if (floorPlaneRef.current) floorPlaneRef.current.visible = true;

          // Restore original size and pixel ratio
          renderer.setPixelRatio(origPixelRatio);
          renderer.setSize(origSize.x, origSize.y, false);

          // Restore dynamic cloth sway state
          simulator.unfreeze();
          if (garmentMaterialRef.current?.userData?.uInertiaLag) {
            garmentMaterialRef.current.userData.uInertiaLag.value = simulator.getInertiaLag();
          }

          // Immediately re-render perspective camera to avoid 1-frame visual flicker in UI
          if (cameraRef.current) {
            renderer.render(scene, cameraRef.current);
          }
        }

        return dataUrl;
      },
      []
    );

    useImperativeHandle(
      ref,
      () => ({
        captureOrthographicSnapshot,
        getCanvas: () => rendererRef.current?.domElement ?? null,
        getPhysicsSimulator: () => simulatorRef.current,
        getInertiaLag: () => garmentMaterialRef.current?.userData?.uInertiaLag?.value ?? 0,
      }),
      [captureOrthographicSnapshot]
    );

  /**
   * Smoothly switch camera to preset orientation along spherical orbit
   * around the target, preserving exterior radius and avoiding clipping through the mesh.
   */
  const applyPreset = useCallback(
    (preset: ViewPreset) => {
      if (!cameraRef.current || !controlsRef.current) return;
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      const container = containerRef.current;
      const aspect =
        container && container.clientHeight > 0
          ? container.clientWidth / container.clientHeight
          : (camera.aspect || 1);
      const dist = getOptimalCameraDistance(aspect);

      let targetPos: THREE.Vector3;
      switch (preset) {
        case 'FRONT':
          targetPos = new THREE.Vector3(0, 0.05, dist);
          break;
        case 'BACK':
          targetPos = new THREE.Vector3(0, 0.05, -dist);
          break;
        case 'ISOMETRIC': {
          const isoDistXZ = dist * 0.92;
          const isoY = dist * 0.38;
          const isoCoord = isoDistXZ * Math.SQRT1_2;
          targetPos = new THREE.Vector3(isoCoord, isoY, isoCoord);
          break;
        }
      }

      controls.target.set(0, 0, 0);

      const targetSph = new THREE.Spherical().setFromVector3(targetPos.clone().sub(controls.target));

      targetSphericalRef.current = {
        radius: targetSph.radius,
        phi: targetSph.phi,
        theta: targetSph.theta,
      };

      onPresetChange?.(preset);
    },
    [onPresetChange]
  );

  // Synchronous texture and garment color update when canvas contents or version changes
  useEffect(() => {
    if (canvasTextureRef.current && textureCanvas) {
      canvasTextureRef.current.image = textureCanvas;
      canvasTextureRef.current.needsUpdate = true;
    }
    if (garmentMaterialRef.current) {
      // The canvas texture already contains the authentic garmentColorHex base fill.
      // Keeping material.color as white (#ffffff) ensures the texture and all stickers
      // render at 100% full brightness and prevents dark garments from multiplying over graphics.
      garmentMaterialRef.current.color.set('#ffffff');
    }
  }, [textureCanvas, textureVersion, garmentColorHex]);

  // Synchronize autoRotate prop updates from parent
  useEffect(() => {
    setIsRotating(autoRotate);
  }, [autoRotate]);

  // Update auto-rotate state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup — Framed for full-body visibility (max zoomed-out view)
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;
    const aspect = width / height;
    const initDist = getOptimalCameraDistance(aspect);
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    camera.position.set(0, 0.05, initDist);
    cameraRef.current = camera;

    // 3. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);
    renderer.domElement.style.touchAction = touchOrbitActive ? 'none' : 'pan-y';
    rendererRef.current = renderer;

    // 4. OrbitControls with damping and wide limits for zoom freedom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.0;
    controls.maxDistance = 8.0;
    controls.minPolarAngle = Math.PI * 0.15; // Limit top angle
    controls.maxPolarAngle = Math.PI * 0.6; // Limit below floor angle
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 2.0;
    controls.touches = {
      ONE: touchOrbitActive ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    const onControlsStart = () => {
      targetSphericalRef.current = null;
    };
    const onControlsEnd = () => {
      if (!camera || !controls) return;
      const camZ = camera.position.z - controls.target.z;
      const camX = camera.position.x - controls.target.x;
      // If camera is predominantly front-facing (camZ > 0 and |camZ| > |camX|)
      if (camZ > 0.8 && Math.abs(camZ) > Math.abs(camX) * 1.2) {
        onPresetChange?.('FRONT');
      } else if (camZ < -0.8 && Math.abs(camZ) > Math.abs(camX) * 1.2) {
        onPresetChange?.('BACK');
      }
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('end', onControlsEnd);
    controlsRef.current = controls;

    // 5. Neutral 3-Point Studio Lighting
    // Ambient Light: subtle neutral fill
    const ambientLight = new THREE.AmbientLight(0xfcfbf9, 0.45);
    scene.add(ambientLight);

    // Key Light: Directional light from top-front-right (intensity ~1.2)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3.2, 4.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 2.5;
    scene.add(keyLight);

    // Fill Light: Directional light from front-left (intensity ~0.6, softer)
    const fillLight = new THREE.DirectionalLight(0xfff6ea, 0.6);
    fillLight.position.set(-3.2, 2.5, 2.8);
    scene.add(fillLight);

    // Rim / Back Light: Directional light from behind (intensity ~0.8) to define silhouette
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0.0, 4.0, -4.0);
    scene.add(rimLight);

    // Subtle Hemisphere Light for natural fabric ground bounce
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8d3cb, 0.2);
    scene.add(hemiLight);

    // 6. Floor Shadow Plane (Soft Contact Shadow)
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowTexture = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.1;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    shadowPlaneRef.current = shadowPlane;

    // Directional light floor shadow receiver
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floorPlane = new THREE.Mesh(floorGeo, floorMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -1.105;
    floorPlane.receiveShadow = true;
    scene.add(floorPlane);
    floorPlaneRef.current = floorPlane;

    // 7. Initialize Canvas Texture
    const initCanvas = textureCanvas ?? document.createElement('canvas');
    if (!textureCanvas) {
      initCanvas.width = 1024;
      initCanvas.height = 1024;
      const ctx = initCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = garmentColorHex;
        ctx.fillRect(0, 0, 1024, 1024);
      }
    }

    const canvasTexture = new THREE.CanvasTexture(initCanvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
    canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
    canvasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    canvasTexture.generateMipmaps = true;
    canvasTextureRef.current = canvasTexture;

    // 8. Material for T-Shirt (Realistic 240 GSM Combed Cotton)
    const garmentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: canvasTexture,
      roughness: 0.85,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    attachGarmentPhysicsShader(garmentMaterial);
    garmentMaterialRef.current = garmentMaterial;

    // 9. Load Mesh from public/models/tshirt.obj with fallback
    let isDisposed = false;
    const loader = new OBJLoader();

    loader.load(
      '/models/tshirt.obj',
      (obj) => {
        if (isDisposed) return;

        // Compute bounds to normalize and center the mesh
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.9 / (maxDim || 1);
        obj.scale.setScalar(scale);
        obj.position.copy(center).multiplyScalar(-scale);

        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = garmentMaterial;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.geometry) {
              mesh.geometry = BufferGeometryUtils.mergeVertices(mesh.geometry, 1e-4);
              mesh.geometry.computeVertexNormals();
            }
          }
        });

        scene.add(obj);
        garmentMeshRef.current = obj;
        setIsLoadingModel(false);
        setUsingFallback(false);
        onLoaded?.();
      },
      undefined,
      (error) => {
        if (isDisposed) return;
        console.warn(
          '[GarmentPreview3D] /models/tshirt.obj not loaded. Using procedural fallback mesh.',
          error
        );

        // Fallback procedural t-shirt mesh
        const fallbackGeo = createProceduralTShirtGeometry();
        const fallbackMesh = new THREE.Mesh(fallbackGeo, garmentMaterial);
        fallbackMesh.position.y = -0.15;
        fallbackMesh.castShadow = true;
        fallbackMesh.receiveShadow = true;

        scene.add(fallbackMesh);
        garmentMeshRef.current = fallbackMesh;
        setIsLoadingModel(false);
        setUsingFallback(true);
        onLoaded?.();
      }
    );

    // 10. Animation & Render Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Smooth spherical camera transition toward target preset orbit
      if (targetSphericalRef.current && camera && controls) {
        const offset = camera.position.clone().sub(controls.target);
        const currentSph = new THREE.Spherical().setFromVector3(offset);
        const targetSph = targetSphericalRef.current;

        let deltaTheta = targetSph.theta - currentSph.theta;
        while (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
        while (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;

        const dRadius = Math.abs(targetSph.radius - currentSph.radius);
        const dPhi = Math.abs(targetSph.phi - currentSph.phi);
        const dTheta = Math.abs(deltaTheta);

        if (dRadius < 0.005 && dPhi < 0.005 && dTheta < 0.005) {
          camera.position
            .setFromSpherical(new THREE.Spherical(targetSph.radius, targetSph.phi, targetSph.theta))
            .add(controls.target);
          targetSphericalRef.current = null;
        } else {
          const lerpFactor = 0.08;
          currentSph.radius += (targetSph.radius - currentSph.radius) * lerpFactor;
          currentSph.phi += (targetSph.phi - currentSph.phi) * lerpFactor;
          currentSph.theta += deltaTheta * lerpFactor;

          camera.position.setFromSpherical(currentSph).add(controls.target);
        }
      }

      controls.update();

      // R1-R3. Real-time Angular Velocity & Rotational Cloth Inertia Lag
      // Tracks azimuthal yaw across manual mouse/touch drag, preset transitions, and turntable mode
      if (camera && controls) {
        const camX = camera.position.x - controls.target.x;
        const camZ = camera.position.z - controls.target.z;
        const currentYaw = Math.atan2(camX, camZ);

        const now = performance.now() * 0.001;
        const dt = lastFrameTimeRef.current > 0 ? now - lastFrameTimeRef.current : 0.016;
        lastFrameTimeRef.current = now;

        const lag = simulatorRef.current.update(currentYaw, dt);

        if (garmentMaterialRef.current?.userData?.uInertiaLag) {
          garmentMaterialRef.current.userData.uInertiaLag.value = lag;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 11. Responsive Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('end', onControlsEnd);
      controls.dispose();
      renderer.dispose();
      shadowGeo.dispose();
      shadowTexture.dispose();
      shadowMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      canvasTexture.dispose();
      garmentMaterial.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      garmentMaterialRef.current = null;
      garmentMeshRef.current = null;
      shadowPlaneRef.current = null;
      floorPlaneRef.current = null;
    };
  }, [onLoaded]);

  // Handle activePreset prop updates
  useEffect(() => {
    if (activePreset) {
      applyPreset(activePreset);
    }
  }, [activePreset, applyPreset]);

  // Dynamically synchronize touchOrbitActive with OrbitControls and canvas touchAction
  useEffect(() => {
    if (!controlsRef.current || !rendererRef.current) return;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    if (touchOrbitActive) {
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
      renderer.domElement.style.touchAction = 'none';
    } else {
      controls.touches = {
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      };
      renderer.domElement.style.touchAction = 'pan-y';
    }
  }, [touchOrbitActive]);

  return (
    <div className={`relative w-full h-full min-h-0 select-none ${className}`}>
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 bg-paper/70 backdrop-blur-xs flex items-center justify-center rounded-xl z-20">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-ink uppercase tracking-wider">
              Loading 3D Garment...
            </span>
          </div>
        </div>
      )}

      {/* View Controls Overlay Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        {/* Preset Angle Buttons */}
        <div className="flex items-center space-x-1.5 bg-paper/90 backdrop-blur-md border border-borderCol/80 rounded-lg p-1 shadow-sm pointer-events-auto">
          <button
            type="button"
            onClick={() => applyPreset('FRONT')}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              activePreset === 'FRONT'
                ? 'bg-ink text-paper font-bold'
                : 'text-mutedGray hover:text-ink'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => applyPreset('BACK')}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              activePreset === 'BACK'
                ? 'bg-ink text-paper font-bold'
                : 'text-mutedGray hover:text-ink'
            }`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => applyPreset('ISOMETRIC')}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              activePreset === 'ISOMETRIC'
                ? 'bg-ink text-paper font-bold'
                : 'text-mutedGray hover:text-ink'
            }`}
          >
            Iso
          </button>
          <button
            type="button"
            onClick={() => applyPreset(activePreset || 'FRONT')}
            title="Fit Full Model (ซูมพอดีตัว)"
            className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors flex items-center space-x-1 border-l border-borderCol/50 pl-2"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            <span>Fit</span>
          </button>
        </div>

        {/* Auto-Rotate Toggle & Status Badge */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {usingFallback && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-mono uppercase">
              Procedural Fallback
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsRotating((prev) => !prev)}
            className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded border shadow-sm transition-colors backdrop-blur-md ${
              isRotating
                ? 'bg-warm text-ink border-warm-dark font-bold'
                : 'bg-paper/90 text-mutedGray border-borderCol/80 hover:text-ink'
            }`}
          >
            {isRotating ? 'Spinning' : 'Spin 360'}
          </button>
        </div>
      </div>

      {/* OrbitControls Responsive Hint & Touch-Gating Pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1.5 z-20 pointer-events-none">
        <button
          type="button"
          onClick={() => setTouchOrbitActive((prev) => !prev)}
          className={`pointer-events-auto flex items-center space-x-1.5 font-mono text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-full border shadow-md transition-all sm:hidden ${
            touchOrbitActive
              ? 'bg-ink text-paper border-ink'
              : 'bg-paper/95 text-ink border-borderCol hover:bg-paper-dark'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              touchOrbitActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>
            {touchOrbitActive
              ? (t?.studio?.tapToScroll || 'กำลังหมุน 3D • แตะเพื่อเลื่อนหน้า')
              : (t?.studio?.tapToOrbit || 'แตะเพื่อหมุน 3D (2 นิ้วหมุนอิสระ)')}
          </span>
        </button>
        <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-wider text-mutedGray bg-paper/80 backdrop-blur-xs px-2.5 py-1 rounded border border-borderCol/50 shadow-2xs">
          Drag to rotate &bull; Scroll to zoom
        </span>
      </div>
    </div>
  );
});

GarmentPreview3D.displayName = 'GarmentPreview3D';

export default GarmentPreview3D;
