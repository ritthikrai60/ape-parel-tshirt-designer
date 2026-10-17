/**
 * src/lib/offscreen3dRenderer.ts
 * High-performance offscreen Three.js WebGL renderer for capturing lossless 2048x2048
 * orthographic 3D garment renders with authentic fabric drape and graphics texture-mapped.
 */
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createProceduralTShirtGeometry } from './tshirtGeometry';
import { bakeCompositeTexture } from '@/components/studio/textureSync';
import { DesignElement, PrintSurface } from '@/lib/types';

export interface RenderOffscreenGarmentOptions {
  garmentColorHex: string;
  frontElements: DesignElement[];
  backElements: DesignElement[];
  surface: PrintSurface;
  width?: number;
  height?: number;
  cleanBlank?: boolean;
}

// In-memory geometry cache to avoid re-fetching and parsing /models/tshirt.obj repeatedly
let cachedGeometry: THREE.BufferGeometry | null = null;
let isLoadingGeometry = false;
const geometryWaiters: Array<(geo: THREE.BufferGeometry) => void> = [];

// Snapshot memory cache
const snapshotCache = new Map<string, string>();

/**
 * Loads or returns cached T-Shirt geometry (OBJ or procedural fallback).
 */
async function getTShirtGeometry(): Promise<THREE.BufferGeometry> {
  if (cachedGeometry) return cachedGeometry;

  if (isLoadingGeometry) {
    return new Promise((resolve) => geometryWaiters.push(resolve));
  }

  isLoadingGeometry = true;

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      const fallback = createProceduralTShirtGeometry();
      cachedGeometry = fallback;
      resolve(fallback);
      return;
    }

    const loader = new OBJLoader();
    loader.load(
      '/models/tshirt.obj',
      (obj) => {
        let foundGeo: THREE.BufferGeometry | null = null;
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry && !foundGeo) {
            const rawGeo = (child as THREE.Mesh).geometry;
            // Merge duplicate unindexed vertices to form continuous smooth surface normals
            const merged = BufferGeometryUtils.mergeVertices(rawGeo, 1e-4);
            merged.computeVertexNormals();
            foundGeo = merged;
          }
        });

        const geo = foundGeo || createProceduralTShirtGeometry();
        // Normalize geometry to standard 1.9 max-dimension bounds
        geo.computeBoundingBox();
        if (geo.boundingBox) {
          const center = new THREE.Vector3();
          geo.boundingBox.getCenter(center);
          const size = new THREE.Vector3();
          geo.boundingBox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 1.9 / maxDim;
          geo.scale(scale, scale, scale);
          geo.translate(-center.x * scale, -center.y * scale, -center.z * scale);
        }

        cachedGeometry = geo;
        isLoadingGeometry = false;
        resolve(geo);
        geometryWaiters.forEach((cb) => cb(geo));
        geometryWaiters.length = 0;
      },
      undefined,
      (err) => {
        console.warn('[offscreen3dRenderer] Could not load /models/tshirt.obj, using procedural fallback:', err);
        const fallback = createProceduralTShirtGeometry();
        cachedGeometry = fallback;
        isLoadingGeometry = false;
        resolve(fallback);
        geometryWaiters.forEach((cb) => cb(fallback));
        geometryWaiters.length = 0;
      }
    );
  });
}

/**
 * Preloads artwork images into an Image cache map.
 */
async function preloadImages(elements: DesignElement[]): Promise<Map<string, HTMLImageElement>> {
  const cache = new Map<string, HTMLImageElement>();
  if (typeof window === 'undefined' || typeof Image === 'undefined') return cache;

  const validUrls = Array.from(
    new Set(elements.map((e) => e.previewUrl).filter((url): url is string => Boolean(url)))
  );

  await Promise.all(
    validUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            cache.set(url, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`[offscreen3dRenderer] Image failed to load: ${url}`);
            resolve();
          };
          img.src = url;
        })
    )
  );

  return cache;
}

/**
 * Renders an orthographic 3D snapshot of the garment (FRONT or BACK) offscreen.
 * Returns a high-resolution lossless PNG data URL.
 */
export async function renderOffscreenGarment3D(
  options: RenderOffscreenGarmentOptions
): Promise<string> {
  const {
    garmentColorHex,
    frontElements = [],
    backElements = [],
    surface = 'FRONT',
    width = 2048,
    height = 2048,
    cleanBlank = false,
  } = options;

  // Safe SSR / Node testing fallback
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  }

  // Cache key
  const relevantElements = surface === 'FRONT' ? frontElements : backElements;
  const cacheKey = `${surface}_${garmentColorHex}_${cleanBlank}_${width}x${height}_${JSON.stringify(
    relevantElements.map((e) => ({ id: e.id, x: e.x, y: e.y, w: e.width, h: e.height, r: e.rotation, u: e.previewUrl }))
  )}`;

  if (snapshotCache.has(cacheKey)) {
    return snapshotCache.get(cacheKey)!;
  }

  const geometry = await getTShirtGeometry();
  const imageCache = await preloadImages([...frontElements, ...backElements]);

  // 1. Bake dual-zone texture canvas (1024x1024)
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 1024;
  texCanvas.height = 1024;

  if (!cleanBlank) {
    bakeCompositeTexture(texCanvas, {
      garmentColorHex,
      frontElements,
      backElements,
      imageCache,
    });
  } else {
    const ctx = texCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = garmentColorHex;
      ctx.fillRect(0, 0, 1024, 1024);
    }
  }

  const texture = new THREE.CanvasTexture(texCanvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  // 2. Scene & Material Setup
  const scene = new THREE.Scene();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 0.82,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);


  // 4. Studio Lighting (Consistent with GarmentPreview3D)
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(2, 4, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff6ea, 1.1);
  fillLight.position.set(-3, 2, 3);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
  backLight.position.set(0, 3, -4);
  scene.add(backLight);

  // 4. Orthographic Camera Setup (Zero perspective distortion)
  const aspect = width / height;
  const frustumHeight = 2.3;
  const frustumWidth = frustumHeight * aspect;
  const camera = new THREE.OrthographicCamera(
    -frustumWidth / 2,
    frustumWidth / 2,
    frustumHeight / 2,
    -frustumHeight / 2,
    0.1,
    20
  );

  if (surface === 'FRONT') {
    camera.position.set(0, 0, 5);
  } else {
    camera.position.set(0, 0, -5);
  }
  camera.lookAt(0, 0, 0);

  // 5. Render
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = width;
  renderCanvas.height = height;

  const renderer = new THREE.WebGLRenderer({
    canvas: renderCanvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.render(scene, camera);

  const dataUrl = renderCanvas.toDataURL('image/png');

  // Cleanup WebGL resources
  renderer.dispose();
  texture.dispose();
  material.dispose();

  snapshotCache.set(cacheKey, dataUrl);
  return dataUrl;
}
