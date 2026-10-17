# Milestone M2 Analysis: Graphic Asset Upload & Strict Format Enforcement

## Executive Summary
This document analyzes the storage architecture, Sharp image processing pipeline, validation rules, and watermarking engine required for Milestone M2 of ape-parel. It grounds every design decision in empirical measurements taken against the Windows x64 host running Sharp `v0.33.5` (backed by libvips `8.15.3` and librsvg `2.58.93`).

---

## 1. Environment & Sharp Verification on Windows x64

### 1.1 Sharp Binary Verification
- **Host**: Windows 11 x64
- **Runtime**: Node.js `v24.16.0`
- **Native Dependency**: `@img/sharp-win32-x64`
- **Sharp Version**: `0.33.5`
- **Linked Libraries**:
  - `vips`: `8.15.3`
  - `rsvg`: `2.58.93` (full SVG vector parsing and rasterization support)
  - `png`: `1.6.43` (spng: `0.7.4`)
  - `tiff`: `4.6.0`
  - `mozjpeg`: `4.1.5`
  - `webp`: `1.4.0`
- **Result**: Sharp initialized cleanly with zero native binding errors.

---

## 2. Storage Architecture Design (`src/lib/storage.ts`)

### 2.1 Pluggable Interface Contract
```typescript
export interface StorageResult {
  storageKey: string;     // Unique relative storage identifier (e.g., "masters/1728540000_hash_filename.png")
  relativeUrl: string;    // Web-accessible public URL with forward slashes (e.g., "/uploads/masters/...")
  absolutePath: string;   // Full resolved OS filesystem path
}

export interface StorageService {
  saveMaster(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult>;
  savePreview(buffer: Buffer, filename: string, mimeType?: string): Promise<StorageResult>;
  getMasterBuffer(storageKeyOrPath: string): Promise<Buffer>;
  getPreviewBuffer(storageKeyOrPath: string): Promise<Buffer>;
  deleteFile(storageKeyOrPath: string): Promise<boolean>;
  exists(storageKeyOrPath: string): Promise<boolean>;
  getPublicUrl(storageKeyOrPath: string): string;
  resolveAbsolutePath(storageKeyOrPath: string): string;
}
```

### 2.2 LocalFilesystem Storage Directory Topology
- Project root: `d:\Coding Projects\ape-parel tshirt`
- Base upload directory: `public/uploads`
  - `public/uploads/masters/`: High-resolution print-ready original master files (PNG, SVG, TIFF, JPEG).
  - `public/uploads/previews/`: Web-optimized watermarked previews (`.webp` / `.png`).
- Cross-Platform URL Normalization:
  - Windows backslashes (`\`) are strictly converted to POSIX forward slashes (`/`) so that web previews and master URLs always resolve as `/uploads/masters/...` and `/uploads/previews/...`.
- Path Traversal Defense:
  - Any access through `resolveAbsolutePath()` is tested against `path.relative(baseUploadDir, resolved)`. If the resolved path attempts to escape the root upload folder (e.g. `../../package.json`), a `Path traversal violation` exception is thrown.

---

## 3. Asset Validation & Watermarking Engine (`src/lib/assetValidation.ts`)

### 3.1 Format Support & Strict MIME Validation
Supported formats:
1. `image/png` (`.png`)
2. `image/svg+xml` / `image/svg` (`.svg`)
3. `image/tiff` / `image/x-tiff` (`.tiff`, `.tif`)
4. `image/jpeg` / `image/pjpeg` (`.jpeg`, `.jpg`)

Any other format (GIF, WebP uploads, BMP, PDF, executables) is rejected immediately. Furthermore, the format is verified against Sharp's buffer inspection to prevent extension spoofing.

### 3.2 Strict Alpha Transparency Enforcement (PNG)
- Print garments require transparent PNG artwork so that the shirt fabric color shows through without an unwanted white bounding rectangle.
- Sharp inspects `metadata.hasAlpha`.
- For `format === 'png'`: If `!metadata.hasAlpha`, upload is rejected with:
  `"PNG artwork must include a transparent background (alpha channel required; hasAlpha === true)."`

### 3.3 DPI Verification (Print Standards)
- Commercial direct-to-garment (DTG) and screen printing require 300 DPI for crisp print quality without pixelation.
- For raster formats (PNG, TIFF, JPEG):
  - Sharp inspects `metadata.density`.
  - If `metadata.density < 300` or undefined, upload is rejected with:
    `"Raster artwork must have a print resolution of at least 300 DPI (received ${receivedDpi}). SVG vector images are exempt from raster DPI checks."`
- For vector format (SVG):
  - SVG is mathematical geometry and scales to any DPI losslessly.
  - `isVector = true` bypasses raster DPI check; recorded `dpi = 0`.

### 3.4 Dimension & Aspect Ratio Boundaries
- Raster minimum dimensions:
  - Shortest side (`Math.min(width, height)`) must be `>= 1000px`.
  - Rejects low-resolution web icons/thumbnails.
  - SVG vector is exempt from minimum pixel dimensions.
- Aspect ratio boundaries:
  - `aspectRatio = width / height`
  - Allowed range: `[0.2, 5.0]` (between 1:5 tall banner and 5:1 wide panorama).
  - Extreme slivers/lines outside this range are rejected to prevent canvas rendering distortion.

### 3.5 Automated Preview Generation with Watermark
- Preview dimensions: Resized to maximum 1024x1024 using Sharp (`fit: 'inside'`, `withoutEnlargement: true`).
- Watermark overlay:
  - Semi-transparent SVG banner rendered dynamically matching the resized image's exact dimensions.
  - Styling:
    - Angled (-30 degrees) Ink Black (`rgba(19, 23, 24, 0.40)`) ribbon.
    - High-contrast crisp white typography (`rgba(255, 255, 255, 0.85)`) with drop shadow (`feDropShadow`).
    - Prominent text: `APE-PAREL • ROYALTY PROTECTED`.
    - Fully visible on transparent, white, black, or complex patterned backgrounds.
  - Output format: WebP (`quality: 85`) with fallback/option for PNG.
  - Compositing: Applied via `sharp.composite([{ input: watermarkSvg, blend: 'over' }])`.

---

## 4. Empirical Test Verification
A 10-point test harness was executed against Sharp and the storage system:
1. Valid 300 DPI Transparent PNG (1500x1200): PASSED
2. Opaque PNG without alpha channel: REJECTED with clear transparency error
3. Low-resolution PNG (150 DPI): REJECTED with clear DPI error
4. Undersized PNG (800x600): REJECTED with minimum dimension error
5. Extreme aspect ratio PNG (6000x1000): REJECTED with aspect ratio error
6. Vector SVG: PASSED with vector exemption
7. Valid 300 DPI TIFF (1600x1200): PASSED
8. Valid 300 DPI JPEG (1600x1200): PASSED
9. Unsupported format (GIF): REJECTED with format error
10. Directory traversal attack (`../../package.json`): BLOCKED with traversal error
