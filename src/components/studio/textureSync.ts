/**
 * src/components/studio/textureSync.ts
 * Dual-zone 1024x1024 texture baking engine for 2D Canvas -> 3D Three.js sync.
 *
 * UV Unwrapping Contract:
 * - Front Surface: u in [0.0, 0.5] -> Pixels x in [0, 512], y in [0, 1024]
 * - Back Surface:  u in [0.5, 1.0] -> Pixels x in [512, 1024], y in [0, 1024]
 *
 * Placement Coordinates Contract:
 * - element.x, element.y: Center of artwork as percentage [0, 100] of surface half
 * - element.width, element.height: Width and height as percentage [0, 100] of surface half
 * Strictly aligns with physical coordinates in src/lib/production.ts:computePlacement()
 */
import { DesignElement } from '@/lib/types';

export interface TextureBakeOptions {
  garmentColorHex: string;
  frontElements: DesignElement[];
  backElements: DesignElement[];
  imageCache: Map<string, HTMLImageElement>;
}

/**
 * Draws an artwork image onto the canvas, automatically keying out solid dark
 * backgrounds if all 4 corners of the image are opaque black (e.g. from JPEG/unclipped assets).
 */
function drawArtworkWithSmartTransparency(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  // Safe environment check (browser vs node)
  if (typeof document === 'undefined') {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }

  try {
    const tempCanvas = document.createElement('canvas');
    const sampleW = Math.min(512, Math.max(64, Math.round(dw)));
    const sampleH = Math.min(512, Math.max(64, Math.round(dh)));
    tempCanvas.width = sampleW;
    tempCanvas.height = sampleH;

    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) {
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }

    tempCtx.drawImage(img, 0, 0, sampleW, sampleH);
    const imgData = tempCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // Check four corners: if all 4 corners are dark black (R, G, B < 25 and A > 200)
    const corners = [
      0,
      (sampleW - 1) * 4,
      ((sampleH - 1) * sampleW) * 4,
      ((sampleH - 1) * sampleW + (sampleW - 1)) * 4,
    ];

    const hasBlackCorners = corners.every((idx) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      return a > 200 && r < 25 && g < 25 && b < 25;
    });

    if (hasBlackCorners) {
      // Key out dark pixels with smooth alpha feathering
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxBright = Math.max(r, g, b);
        if (maxBright < 20) {
          data[i + 3] = 0; // Transparent
        } else if (maxBright < 36) {
          data[i + 3] = Math.round(((maxBright - 20) / 16) * data[i + 3]);
        }
      }
      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, dx, dy, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  } catch {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

/**
 * Draws artwork elements for a given surface onto the 2D canvas context.
 * surfaceOffsetX: 0 for FRONT (left half 0..512), 512 for BACK (right half 512..1024)
 */
function renderSurfaceArtworkLayers(
  ctx: CanvasRenderingContext2D,
  elements: DesignElement[],
  imageCache: Map<string, HTMLImageElement>,
  surfaceOffsetX: number
): void {
  // Sort elements by zIndex ascending (lowest first, highest on top)
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

    // Draw image centered around (0, 0) with smart transparency
    drawArtworkWithSmartTransparency(ctx, img, -elemW / 2, -elemH / 2, elemW, elemH);
    ctx.restore();
  }
}

/**
 * Bakes the complete 1024x1024 dual-zone texture onto an HTMLCanvasElement.
 * Synchronous and optimized for real-time manipulation without dropped frames.
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
 * Preloads artwork preview images into an in-memory cache to guarantee synchronous texture baking.
 */
export function preloadArtworkImages(
  urls: string[],
  cache: Map<string, HTMLImageElement>,
  onAllLoaded?: () => void
): void {
  const urlsToLoad = urls.filter((url) => !cache.has(url));

  if (urlsToLoad.length === 0 || typeof Image === 'undefined') {
    onAllLoaded?.();
    return;
  }

  let loadedCount = 0;
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
      console.warn(`[textureSync] Failed to load preview image: ${url}`);
      loadedCount++;
      if (loadedCount === urlsToLoad.length) {
        onAllLoaded?.();
      }
    };
    img.src = url;
  });
}
