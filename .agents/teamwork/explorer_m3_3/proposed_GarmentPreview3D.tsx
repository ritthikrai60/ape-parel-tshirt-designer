'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export type ViewPreset = 'FRONT' | 'BACK' | 'ISOMETRIC';

export interface GarmentPreview3DProps {
  textureCanvas: HTMLCanvasElement | null;
  garmentColorHex: string;
  textureVersion?: number; // increments on layer edits to trigger texture update
  className?: string;
  autoRotate?: boolean;
  onLoaded?: () => void;
  activePreset?: ViewPreset;
  onPresetChange?: (preset: ViewPreset) => void;
}

/**
 * Procedural t-shirt fallback geometry generator with correct Front/Back UV mapping.
 * Front surface: u in [0.0, 0.5]
 * Back surface:  u in [0.5, 1.0]
 */
function createProceduralTShirtGeometry(): THREE.BufferGeometry {
  const geom = new THREE.CylinderGeometry(0.55, 0.65, 1.5, 48, 24, true);

  // Remap cylinder UV coordinates:
  // cylinder u originally spans [0, 1] continuously around circumference.
  // We map front half (angle -PI/2 to PI/2) to u in [0.0, 0.5],
  // and back half to u in [0.5, 1.0].
  const uvAttr = geom.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);

    if (u <= 0.5) {
      // Front half: re-scale to [0.05, 0.45] with padding
      uvAttr.setXY(i, 0.05 + u * 0.8, v);
    } else {
      // Back half: re-scale to [0.55, 0.95] with padding
      uvAttr.setXY(i, 0.55 + (u - 0.5) * 0.8, v);
    }
  }
  uvAttr.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a soft radial contact shadow texture for the floor plane.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0.0, 'rgba(19, 23, 24, 0.35)');
  gradient.addColorStop(0.3, 'rgba(19, 23, 24, 0.20)');
  gradient.addColorStop(0.65, 'rgba(19, 23, 24, 0.06)');
  gradient.addColorStop(1.0, 'rgba(19, 23, 24, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const GarmentPreview3D: React.FC<GarmentPreview3DProps> = ({
  textureCanvas,
  garmentColorHex,
  textureVersion = 0,
  className = '',
  autoRotate = false,
  onLoaded,
  activePreset = 'FRONT',
  onPresetChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const canvasTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const garmentMeshRef = useRef<THREE.Object3D | null>(null);
  const garmentMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(autoRotate);

  // Target camera position for smooth view switching
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);

  /**
   * Smoothly switch camera to preset orientation
   */
  const applyPreset = useCallback((preset: ViewPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const controls = controlsRef.current;

    switch (preset) {
      case 'FRONT':
        targetCamPosRef.current = new THREE.Vector3(0, 0.1, 2.3);
        controls.target.set(0, 0, 0);
        break;
      case 'BACK':
        targetCamPosRef.current = new THREE.Vector3(0, 0.1, -2.3);
        controls.target.set(0, 0, 0);
        break;
      case 'ISOMETRIC':
        targetCamPosRef.current = new THREE.Vector3(1.6, 0.8, 1.6);
        controls.target.set(0, 0, 0);
        break;
    }
    onPresetChange?.(preset);
  }, [onPresetChange]);

  // Synchronous texture update when canvas contents or textureVersion changes
  useEffect(() => {
    if (canvasTextureRef.current && textureCanvas) {
      canvasTextureRef.current.image = textureCanvas;
      canvasTextureRef.current.needsUpdate = true;
    }
  }, [textureCanvas, textureVersion, garmentColorHex]);

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

    // 2. Camera Setup
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 2.3);
    cameraRef.current = camera;

    // 3. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
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
    rendererRef.current = renderer;

    // 4. OrbitControls with damping and limits
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.2;
    controls.maxDistance = 4.0;
    controls.minPolarAngle = Math.PI * 0.15; // Limit top angle
    controls.maxPolarAngle = Math.PI * 0.60; // Limit below floor angle
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.autoRotate = isRotating;
    controls.autoRotateSpeed = 2.0;
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

    // Optional ShadowReceiver floor for directional light
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floorPlane = new THREE.Mesh(floorGeo, floorMat);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -1.105;
    floorPlane.receiveShadow = true;
    scene.add(floorPlane);

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
      map: canvasTexture,
      roughness: 0.85,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
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

        obj.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.9 / (maxDim || 1);
        obj.scale.setScalar(scale);

        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = garmentMaterial;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.geometry) {
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
          '[GarmentPreview3D] /models/tshirt.obj not found. Using procedural fallback mesh.',
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

    // 10. ResizeObserver for responsive auto-sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 11. Animation Render Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Smooth camera transition if preset active
      if (targetCamPosRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.08);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.01) {
          targetCamPosRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 12. Cleanup on Unmount
    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }

      controls.dispose();
      renderer.dispose();

      canvasTexture.dispose();
      shadowTexture.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      garmentMaterial.dispose();

      if (garmentMeshRef.current) {
        scene.remove(garmentMeshRef.current);
      }

      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[420px] bg-paper-light select-none ${className}`}>
      {/* Three.js Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating View Controls & Presets */}
      <div className="absolute top-4 left-4 flex items-center space-x-1.5 bg-paper/90 backdrop-blur border border-borderCol px-2 py-1.5 rounded shadow-sm">
        <button
          type="button"
          onClick={() => applyPreset('FRONT')}
          className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded transition-colors ${
            activePreset === 'FRONT'
              ? 'bg-ink text-paper font-bold'
              : 'text-ink hover:bg-paper-dark'
          }`}
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => applyPreset('BACK')}
          className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded transition-colors ${
            activePreset === 'BACK'
              ? 'bg-ink text-paper font-bold'
              : 'text-ink hover:bg-paper-dark'
          }`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => applyPreset('ISOMETRIC')}
          className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded transition-colors ${
            activePreset === 'ISOMETRIC'
              ? 'bg-ink text-paper font-bold'
              : 'text-ink hover:bg-paper-dark'
          }`}
        >
          3/4 Angle
        </button>
      </div>

      {/* Viewport Control Badges & Auto-Rotate Toggle */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsRotating((prev) => !prev)}
          className={`px-3 py-1 text-[11px] font-mono uppercase tracking-wider rounded border transition-colors ${
            isRotating
              ? 'bg-warm text-ink font-bold border-warm-dark shadow-sm'
              : 'bg-paper/90 text-mutedGray border-borderCol hover:text-ink'
          }`}
        >
          {isRotating ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
        </button>

        {usingFallback && (
          <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
            Procedural Viewport
          </span>
        )}
      </div>

      {/* Interaction Hint */}
      <div className="absolute bottom-4 right-4 pointer-events-none hidden sm:block text-[11px] font-mono text-mutedGray bg-paper/80 px-2 py-1 rounded border border-borderCol/60">
        Drag to Orbit • Pinch/Scroll to Zoom
      </div>

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/70 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mb-3" />
          <span className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
            Initializing 3D Viewport...
          </span>
        </div>
      )}
    </div>
  );
};

export default GarmentPreview3D;
