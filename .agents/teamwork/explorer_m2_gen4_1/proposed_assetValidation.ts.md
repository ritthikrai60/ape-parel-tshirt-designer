# Proposed Implementation: `src/lib/assetValidation.ts`

```typescript
import sharp from 'sharp';
import path from 'path';
import { storageService, StorageService } from '@/lib/storage';

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/svg',
  'image/tiff',
  'image/x-tiff',
  'image/jpeg',
  'image/pjpeg',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const SUPPORTED_FORMATS = ['png', 'svg', 'tiff', 'jpeg'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

export interface ArtworkValidatedMetadata {
  format: SupportedFormat;
  mimeType: string;
  width: number;
  height: number;
  dpi: number;
  hasTransparency: boolean;
  isVector: boolean;
  colorSpace: string;
  aspectRatio: number;
  fileSize: number;
  channels?: number;
}

export interface ArtworkValidationOptions {
  minDpi?: number;                 // default: 300
  minShortestSide?: number;        // default: 1000
  minAspectRatio?: number;         // default: 0.2
  maxAspectRatio?: number;         // default: 5.0
  maxFileSize?: number;            // default: 50 * 1024 * 1024 (50MB)
  previewMaxWidth?: number;        // default: 1024
  previewMaxHeight?: number;       // default: 1024
  previewFormat?: 'webp' | 'png';  // default: 'webp'
  watermarkText?: string;          // default: 'APE-PAREL • ROYALTY PROTECTED'
  skipStorage?: boolean;           // default: false
  storageService?: StorageService; // optional custom storage instance
}

export interface ArtworkValidationResult {
  isValid: boolean;
  metadata?: ArtworkValidatedMetadata;
  previewBuffer?: Buffer;
  masterStorageKey?: string;
  previewStorageKey?: string;
  masterAbsolutePath?: string;
  previewAbsolutePath?: string;
  relativeMasterUrl?: string;
  relativePreviewUrl?: string;
  error?: string;
}

/**
 * Escapes XML/SVG special characters in text strings.
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates a semi-transparent SVG watermark overlay.
 * Uses ape-parel brand colors: Ink Black (#131718) background ribbon
 * and crisp high-contrast white text (#FFFFFF) with subtle drop shadow.
 */
export function createWatermarkSvg(
  width: number,
  height: number,
  text: string = 'APE-PAREL • ROYALTY PROTECTED'
): Buffer {
  const safeW = Math.max(100, width);
  const safeH = Math.max(100, height);
  const fontSize = Math.max(18, Math.min(54, Math.round(safeW / 20)));
  const letterSpacing = Math.round(fontSize * 0.12);
  const angle = -30;
  const bannerHeight = fontSize * 2.2;
  const bannerWidth = safeW * 3;

  const svg = `
<svg width="${safeW}" height="${safeH}" viewBox="0 0 ${safeW} ${safeH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="wm-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g transform="rotate(${angle} ${safeW / 2} ${safeH / 2})">
    <rect
      x="${-safeW}"
      y="${safeH / 2 - bannerHeight / 2}"
      width="${bannerWidth}"
      height="${bannerHeight}"
      fill="rgba(19, 23, 24, 0.40)"
    />
    <text
      x="${safeW / 2}"
      y="${safeH / 2 + fontSize * 0.35}"
      text-anchor="middle"
      fill="rgba(255, 255, 255, 0.85)"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      font-size="${fontSize}px"
      font-weight="900"
      letter-spacing="${letterSpacing}px"
      filter="url(#wm-shadow)"
    >
      ${escapeXml(text)}
    </text>
  </g>
</svg>
  `.trim();

  return Buffer.from(svg);
}

/**
 * Generates an automated watermarked web preview of an artwork buffer using Sharp.
 * Resizes the image to fit within max dimensions (default 1024x1024),
 * composites the semi-transparent SVG watermark overlay,
 * and encodes to WebP (or PNG).
 */
export async function generateWatermarkedPreview(
  fileBuffer: Buffer,
  options?: Pick<
    ArtworkValidationOptions,
    'previewMaxWidth' | 'previewMaxHeight' | 'previewFormat' | 'watermarkText'
  >
): Promise<Buffer> {
  const maxWidth = options?.previewMaxWidth ?? 1024;
  const maxHeight = options?.previewMaxHeight ?? 1024;
  const previewFormat = options?.previewFormat ?? 'webp';
  const watermarkText = options?.watermarkText ?? 'APE-PAREL • ROYALTY PROTECTED';

  // 1. Resize master image to fit inside preview dimensions
  const resizedPipeline = sharp(fileBuffer).resize(maxWidth, maxHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Convert to intermediate buffer to determine exact resized dimensions
  const resizedBuffer = await resizedPipeline.toBuffer();
  const meta = await sharp(resizedBuffer).metadata();
  const width = meta.width ?? maxWidth;
  const height = meta.height ?? maxHeight;

  // 2. Generate SVG watermark overlay matching exact resized dimensions
  const watermarkSvg = createWatermarkSvg(width, height, watermarkText);

  // 3. Composite watermark over the resized image
  let outputPipeline = sharp(resizedBuffer).composite([
    { input: watermarkSvg, blend: 'over' },
  ]);

  if (previewFormat === 'png') {
    outputPipeline = outputPipeline.png({ compressionLevel: 8 });
  } else {
    outputPipeline = outputPipeline.webp({ quality: 85 });
  }

  return await outputPipeline.toBuffer();
}

/**
 * Validates and inspects an artwork file buffer against ape-parel strict print standards.
 * Verifies format, DPI (>=300 for raster), transparency (for PNG), dimensions, and aspect ratio.
 * If valid and skipStorage is false, generates a watermarked preview and stores both master
 * and preview using StorageService.
 */
export async function validateAndProcessArtwork(
  fileBuffer: Buffer,
  originalFilename: string,
  declaredMimeType?: string,
  options?: ArtworkValidationOptions
): Promise<ArtworkValidationResult> {
  const minDpi = options?.minDpi ?? 300;
  const minShortestSide = options?.minShortestSide ?? 1000;
  const minAspectRatio = options?.minAspectRatio ?? 0.2;
  const maxAspectRatio = options?.maxAspectRatio ?? 5.0;
  const maxFileSize = options?.maxFileSize ?? 50 * 1024 * 1024; // 50MB
  const storage = options?.storageService ?? storageService;

  // 1. File size check
  if (!fileBuffer || fileBuffer.length === 0) {
    return {
      isValid: false,
      error: 'Artwork file is empty (0 bytes).',
    };
  }

  if (fileBuffer.length > maxFileSize) {
    const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(1);
    const limitMb = (maxFileSize / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size (${sizeMb}MB) exceeds maximum limit of ${limitMb}MB.`,
    };
  }

  // 2. MIME type check (if provided)
  let normalizedMime = declaredMimeType?.toLowerCase().trim();
  if (normalizedMime && !SUPPORTED_MIME_TYPES.includes(normalizedMime as any)) {
    return {
      isValid: false,
      error: `Unsupported MIME type "${declaredMimeType}". Allowed formats are PNG (transparent), SVG (vector), TIFF, and JPEG (>=300 DPI).`,
    };
  }

  // 3. Sharp metadata extraction & format detection
  let meta: sharp.Metadata;
  try {
    meta = await sharp(fileBuffer).metadata();
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to inspect image: ${err?.message || 'Invalid or corrupted image file format'}.`,
    };
  }

  const detectedFormat = meta.format as SupportedFormat | undefined;
  if (!detectedFormat || !SUPPORTED_FORMATS.includes(detectedFormat)) {
    return {
      isValid: false,
      error: `Unsupported image format "${meta.format || 'unknown'}". Allowed formats are PNG, SVG, TIFF, and JPEG.`,
    };
  }

  // Determine authoritative MIME type if not provided
  if (!normalizedMime) {
    switch (detectedFormat) {
      case 'png':
        normalizedMime = 'image/png';
        break;
      case 'svg':
        normalizedMime = 'image/svg+xml';
        break;
      case 'tiff':
        normalizedMime = 'image/tiff';
        break;
      case 'jpeg':
        normalizedMime = 'image/jpeg';
        break;
    }
  }

  const isVector = detectedFormat === 'svg';
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width <= 0 || height <= 0) {
    return {
      isValid: false,
      error: `Invalid image dimensions (${width}x${height}px).`,
    };
  }

  // 4. Aspect Ratio verification
  const aspectRatio = Number((width / height).toFixed(4));
  if (aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio) {
    return {
      isValid: false,
      error: `Artwork aspect ratio (${aspectRatio}) is outside acceptable bounds [${minAspectRatio}, ${maxAspectRatio}] (dimensions: ${width}x${height}px).`,
    };
  }

  // 5. Vector vs Raster specific validations
  let dpi = 0;
  let hasTransparency = false;

  if (isVector) {
    // SVG Vector: Exempt from raster DPI and raster shortest-side check
    dpi = 0; // Vector has infinite resolution
    hasTransparency = meta.hasAlpha ?? true;
  } else {
    // Raster: Check minimum shortest dimension
    const shortestSide = Math.min(width, height);
    if (shortestSide < minShortestSide) {
      return {
        isValid: false,
        error: `Raster artwork shortest dimension must be at least ${minShortestSide}px (received ${shortestSide}px; ${width}x${height}px).`,
      };
    }

    // Raster: DPI Check
    dpi = meta.density ?? 0;
    if (dpi < minDpi) {
      const receivedDpi = dpi > 0 ? `${dpi} DPI` : 'no DPI metadata detected';
      return {
        isValid: false,
        error: `Raster artwork must have a print resolution of at least ${minDpi} DPI (received ${receivedDpi}). SVG vector images are exempt from raster DPI checks.`,
      };
    }

    // Raster: PNG transparency enforcement
    if (detectedFormat === 'png') {
      hasTransparency = Boolean(meta.hasAlpha);
      if (!hasTransparency) {
        return {
          isValid: false,
          error: 'PNG artwork must include a transparent background (alpha channel required; hasAlpha === true).',
        };
      }
    } else {
      hasTransparency = Boolean(meta.hasAlpha);
    }
  }

  // Map color space
  let colorSpace = 'sRGB';
  if (meta.space) {
    const s = meta.space.toLowerCase();
    if (s === 'cmyk') colorSpace = 'CMYK';
    else if (s === 'display-p3' || s === 'p3') colorSpace = 'Display P3';
    else if (s === 'srgb') colorSpace = 'sRGB';
    else colorSpace = meta.space.toUpperCase();
  }

  const validatedMetadata: ArtworkValidatedMetadata = {
    format: detectedFormat,
    mimeType: normalizedMime,
    width,
    height,
    dpi,
    hasTransparency,
    isVector,
    colorSpace,
    aspectRatio,
    fileSize: fileBuffer.length,
    channels: meta.channels,
  };

  // 6. Automated Watermarked Preview Generation
  let previewBuffer: Buffer;
  try {
    previewBuffer = await generateWatermarkedPreview(fileBuffer, {
      previewMaxWidth: options?.previewMaxWidth,
      previewMaxHeight: options?.previewMaxHeight,
      previewFormat: options?.previewFormat,
      watermarkText: options?.watermarkText,
    });
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to generate watermarked preview: ${err?.message || 'Sharp processing error'}.`,
    };
  }

  // 7. Storage persistence (unless skipped)
  if (options?.skipStorage) {
    return {
      isValid: true,
      metadata: validatedMetadata,
      previewBuffer,
    };
  }

  try {
    // Save master file
    const masterResult = await storage.saveMaster(
      fileBuffer,
      originalFilename,
      normalizedMime
    );

    // Save preview file
    const parsed = path.parse(originalFilename);
    const previewExt = options?.previewFormat === 'png' ? 'png' : 'webp';
    const previewFilename = `${parsed.name}_preview.${previewExt}`;
    const previewMime = previewExt === 'png' ? 'image/png' : 'image/webp';

    const previewResult = await storage.savePreview(
      previewBuffer,
      previewFilename,
      previewMime
    );

    return {
      isValid: true,
      metadata: validatedMetadata,
      previewBuffer,
      masterStorageKey: masterResult.storageKey,
      previewStorageKey: previewResult.storageKey,
      masterAbsolutePath: masterResult.absolutePath,
      previewAbsolutePath: previewResult.absolutePath,
      relativeMasterUrl: masterResult.relativeUrl,
      relativePreviewUrl: previewResult.relativeUrl,
    };
  } catch (err: any) {
    return {
      isValid: false,
      metadata: validatedMetadata,
      error: `Storage error while saving files: ${err?.message || 'Filesystem error'}.`,
    };
  }
}
```
