/**
 * proposed_texture_sync.ts
 * Offscreen 1024x1024 texture baking pipeline for 2D -> 3D Three.js sync.
 *
 * UV Contract:
 * - Front Surface: u in [0.0, 0.5] -> Pixels x in [0, 512], y in [0, 1024]
 * - Back Surface:  u in [0.5, 1.0] -> Pixels x in [512, 1024], y in [0, 1024]
 *
 * Coordinate Convention:
 * - element.x, element.y: Center of artwork as percentage [0, 100] of surface half
 * - element.width, element.height: Width and height as percentage [0, 100] of surface half
 * Matches src/lib/production.ts:computePlacement() exactly!
 */

import { DesignElement } from '@/lib/types';

export interface TextureBakeOptions {
  garmentColorHex: string;
  frontElements: DesignElement[];
  backElements: DesignElement[];
  imageCache: Map<string, HTMLImageElement>;
}

/**
 * Renders design element layers onto a 2D canvas context within a target surface offset.
 * surfaceOffsetX: 0 for FRONT (left half 0..512), 512 for BACK (right half 512..1024)
 */
function renderSurfaceArtworkLayers(
  ctx: CanvasRenderingContext2D,
  elements: DesignElement[],
  imageCache: Map<string, HTMLImageElement>,
  surfaceOffsetX: number // 0 for FRONT, 512 for BACK
): void {
  // Sort elements by zIndex ascending
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const surfaceWidth = 512;
  const surfaceHeight = 1024;

  for (const el of sorted) {
    const img = imageCache.get(el.previewUrl);
    if (!img || !img.complete || img.naturalWidth === 0) continue;

    // element.x and element.y are CENTER percentages [0, 100]
    const centerX = surfaceOffsetX + (el.x / 100) * surfaceWidth;
    const centerY = (el.y / 100) * surfaceHeight;
    const elemW = (el.width / 100) * surfaceWidth;
    const elemH = (el.height / 100) * surfaceHeight;

    ctx.save();
    // Translate directly to element center for clean rotation & positioning
    ctx.translate(centerX, centerY);

    if (el.rotation) {
      ctx.rotate((el.rotation * Math.PI) / 180);
    }

    // Draw image centered around (0, 0)
    ctx.drawImage(img, -elemW / 2, -elemH / 2, elemW, elemH);
    ctx.restore();
  }
}

/**
 * Bakes the entire 1024x1024 dual-surface texture onto an HTMLCanvasElement.
 * Synchronous and optimized for 60fps real-time dragging.
 */
export function bakeCompositeTexture(
  canvas: HTMLCanvasElement,
  options: TextureBakeOptions
): void {
  const { garmentColorHex, frontElements, backElements, imageCache } = options;

  if (canvas.width !== 1024) canvas.width = 1024;
  if (canvas.height !== 1024) canvas.height = 1024;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Fill entire base texture with authentic garment color
  ctx.fillStyle = garmentColorHex;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Render FRONT artwork layers on left half (x: 0 to 512, u in [0, 0.5])
  renderSurfaceArtworkLayers(ctx, frontElements, imageCache, 0);

  // 3. Render BACK artwork layers on right half (x: 512 to 1024, u in [0.5, 1.0])
  renderSurfaceArtworkLayers(ctx, backElements, imageCache, 512);
}

/**
 * Preloads images into an in-memory cache to guarantee synchronous 60fps texture baking.
 */
export function preloadArtworkImages(
  urls: string[],
  cache: Map<string, HTMLImageElement>,
  onAllLoaded?: () => void
): void {
  let loadedCount = 0;
  const urlsToLoad = urls.filter((url) => !cache.has(url));

  if (urlsToLoad.length === 0) {
    onAllLoaded?.();
    return;
  }

  urlsToLoad.forEach((url) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cache.set(url, img);
      loadedCount++;
      if (loadedCount === urlsToLoad.length) {
        onAllLoaded?.();
      }
    };
    img.onerror = () => {
      console.warn(`[texture_sync] Failed to load preview image: ${url}`);
      loadedCount++;
      if (loadedCount === urlsToLoad.length) {
        onAllLoaded?.();
      }
    };
    img.src = url;
  });
}
