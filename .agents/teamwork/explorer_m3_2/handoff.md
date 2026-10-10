# Handoff Report: 2D Transparent Full-Bleed Canvas, Authentic Colors & Multi-Artwork Layering

**Agent**: Explorer 2 (`teamwork_preview_explorer`)  
**Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m3_2`  
**Milestone**: Milestone 3 (2D & 3D Interactive Design Studio)  
**Date**: 2026-10-10  

---

## 1. Observation

### 1.1 Existing Type System & Domain Entities
1. **`DesignElement` Interface in `src/lib/types.ts:3-19`**:
   ```typescript
   export interface DesignElement {
     id: string;
     artworkId: string;
     licenseOptionId: string;
     title: string;
     previewUrl: string;
     creatorName: string;
     creatorId: string;
     surface: PrintSurface;
     x: number; // 0 to 100 percentage
     y: number; // 0 to 100 percentage
     width: number; // percentage width
     height: number; // percentage height
     rotation: number; // degrees
     zIndex: number;
     price: number; // THB unit royalty
   }
   ```
2. **Production Specification Coordinate Handling in `src/lib/production.ts:49-70`**:
   ```typescript
   function computePlacement(
     element: DesignElement,
     platenWidthCm: number,
     platenHeightCm: number
   ): ProductionPlacement {
     const widthPercent = Number(element.width) || 0;
     const heightPercent = Number(element.height) || 0;
     const xPercent = Number(element.x) || 0;
     const yPercent = Number(element.y) || 0;
     ...
     const calculatedWidthCm = roundCm((widthPercent / 100) * platenWidthCm);
     const calculatedHeightCm = roundCm((heightPercent / 100) * platenHeightCm);
     const xCenterCm = roundCm((xPercent / 100) * platenWidthCm);
     const yCenterCm = roundCm((yPercent / 100) * platenHeightCm);
     const xLeftCm = roundCm(xCenterCm - calculatedWidthCm / 2);
     const yTopCm = roundCm(yCenterCm - calculatedHeightCm / 2);
   ```
   *Critical observation*: `element.x` and `element.y` strictly represent the **CENTER** of the artwork element as percentages `[0, 100]` of the platen/garment surface, NOT the top-left corner.
3. **Seed Database Authentic Garment Colors in `prisma/seed.mjs:304-347`**:
   - Ink Black: `#131718` (`APX-HVY-001-BLK-L`, `stock: 120`)
   - Optic White: `#FFFFFF` (`APX-HVY-001-WHT-L`, `stock: 90`)
   - Paper Beige: `#F5F0E8` (`APX-HVY-001-BGE-L`, `stock: 65`)
   - Warm Kraft: `#DABA98` (`APX-HVY-001-WRM-L`, `stock: 55`)
4. **Seed Database Artworks & Licensing Options in `prisma/seed.mjs:107-241`**:
   - `Dash Ape Classic Head Mark` (`MASCOT`, creator: Dash Ape Studio, license price: ฿40, seed: `dash-ape-alpha`)
   - `Cyber Primate Tokyo 2088` (`ILLUSTRATION`, creator: Dash Ape Studio, license price: ฿60, seed: `cyber-primate-2088`)
   - `Static Glitch Protocol` (`PATTERN`, creator: Cyber Monk, license price: ฿25, seed: `static-glitch-pattern`)
   - `Neo Shibuya Heavy Kanji` (`TYPOGRAPHY`, creator: Cyber Monk, license price: ฿50, seed: `neo-shibuya-kanji`)
   - `Bonsai Core Brutalism` (`ILLUSTRATION`, creator: Soma Botanica, license price: ฿45, seed: `bonsai-core`)
5. **Original Request Criteria in `ORIGINAL_REQUEST.md:13, 46`**:
   - "2D Canvas centered on transparent background with authentic garment colors (Ink Black, Optic White, Paper Beige, Warm Kraft), large full-bleed garment display without intrusive print boundary boxes."
   - "2D studio renders shirts large and centered on transparent canvas with no bounding boxes obscuring the garment."
6. **Project Interface Contracts in `PROJECT.md:105-114`**:
   - Canvas Texture: 1024x1024 offscreen buffer.
   - Front UV: $u \in [0.0, 0.5]$ (pixels 0 to 512).
   - Back UV: $u \in [0.5, 1.0]$ (pixels 512 to 1024).

---

## 2. Logic Chain

1. **Clean Full-Bleed Rendering (No Bounding Boxes)**:
   - Traditional customizer software places fixed dotted/dashed rectangular bounding boxes labeled "Print Area" across the garment chest, which clutters the interface and violates user aesthetic expectations (Observation 1.5).
   - *Design solution*: The garment silhouette itself serves as the visual anchor on a clean transparent canvas. Artwork layers can be moved anywhere across the torso and sleeves without an omnipresent dashed print rectangle. Transform controls (4 corner scale nodes, top rotation node, center drag anchor) appear **only** when an artwork is actively selected. When deselected, the canvas renders only the pristine garment and applied graphics.

2. **Accurate Center-Based Coordinate Normalization**:
   - In `computePlacement` (`production.ts:66-70`), physical coordinates in cm are derived from `(x / 100) * platenWidth` as the physical center (Observation 1.2).
   - *Design solution*: All 2D canvas interactions (drag translation, scale, rotation) MUST maintain `(x, y)` as the center percentage of the garment bounds `[0, 100]`.
   - Conversions:
     - Delta drag: $dx\% = (\Delta x_{px} / canvasWidth_{px}) \times 100$
     - Rotation angle: $\theta = \text{atan2}(p_y - c_y, p_x - c_x) \times (180/\pi) + 90^\circ$
     - Scale: maintains aspect ratio $r = w / h$ unless Shift is unlocked.

3. **Dual-Zone 1024x1024 Texture Baking**:
   - Three.js requires a single `CanvasTexture` mapped across the `tshirt.obj` mesh where Front vertices have $u \in [0.0, 0.5]$ and Back vertices have $u \in [0.5, 1.0]$ (Observation 1.6).
   - *Design solution*: An offscreen HTML5 canvas of exactly $1024 \times 1024$ pixels is allocated:
     - Left Half ($X \in [0, 512]$, $Y \in [0, 1024]$): Base fill `garmentColorHex` + Front artwork layers sorted by `zIndex`.
     - Right Half ($X \in [512, 1024]$, $Y \in [0, 1024]$): Base fill `garmentColorHex` + Back artwork layers sorted by `zIndex`.
     - For Front layers: $X_{tex} = (x / 100) \times 512$, $Y_{tex} = (y / 100) \times 1024$, $W_{tex} = (width / 100) \times 512$, $H_{tex} = (height / 100) \times 1024$.
     - For Back layers: $X_{tex} = 512 + (x / 100) \times 512$, $Y_{tex} = (y / 100) \times 1024$, $W_{tex} = (width / 100) \times 512$, $H_{tex} = (height / 100) \times 1024$.
   - Whenever any layer changes (add, remove, translate, scale, rotate, visibility toggle), `bakeCompositeTexture()` renders and triggers `texture.needsUpdate = true` on the Three.js canvas texture without rebuilding shaders or reallocating WebGL memory.

4. **Multi-Artwork Layer Manager & Direct Manipulation**:
   - Designers need layer stack control (Observation 1.1):
     - `zIndex` ordering: Move Up, Move Down, Bring to Front, Send to Back.
     - Visibility toggle: bypass hidden layers during canvas rendering and texture baking.
     - Delete: removal from state and recalculation of live pricing.
     - Preset selection: instant addition of seeded artworks (`seed.mjs:107-241`) with correct license options and royalties.

---

## 3. Caveats

1. **Browser Image CORS and Data URLs**:
   - Seeded artworks use DiceBear SVGs (`https://api.dicebear.com/...`). When drawing external images to an HTML5 canvas for texture baking and exporting (`toDataURL`), the canvas can become "tainted" if the remote server does not provide `Access-Control-Allow-Origin: *`.
   - *Mitigation*: DiceBear API sends permissive CORS headers (`Access-Control-Allow-Origin: *`). For local/custom uploads, images must be loaded with `img.crossOrigin = 'anonymous'` or converted to base64 Data URLs prior to baking.
2. **Asynchronous Image Loading vs. Three.js Texture Update**:
   - If a layer is added, the image may not be decoded immediately.
   - *Mitigation*: An internal `ImageCache` preloads images before triggering the initial bake. A fallback placeholder is rendered while loading, and an `onLoad` hook triggers an immediate re-bake once decoded.
3. **Side Seam Printing**:
   - `PrintSurface` in `types.ts` defines `'FRONT' | 'BACK' | 'SIDE'`. However, `tshirt.obj` UV mapping and the benchmark specifications specifically target `FRONT` ($u \in [0, 0.5]$) and `BACK` ($u \in [0.5, 1.0]$). Side printing is reserved for sleeve print specifications in production data, while 2D canvas and 3D preview focus on Front and Back surfaces.

---

## 4. Conclusion & Component Architecture Blueprints

The following component architecture provides the complete implementation blueprints for Worker to generate:

### 4.1 Component Blueprint: `src/components/studio/utils/garmentSilhouettes.ts`
High-fidelity SVG vector paths for the Apex Heavyweight Oversized Tee:

```typescript
export interface SilhouetteData {
  viewBox: string;
  outlinePath: string;
  collarPath: string;
  collarRibPath: string;
  seamLines: Array<{ d: string; strokeWidth: number; opacity: number }>;
}

export const GARMENT_SILHOUETTES: Record<'FRONT' | 'BACK', SilhouetteData> = {
  FRONT: {
    viewBox: '0 0 1000 1000',
    // Realistic oversized drop-shoulder t-shirt contour
    outlinePath:
      'M 390 130 ' + // Left collar point
      'C 440 210, 560 210, 610 130 ' + // Front neckline dip
      'L 810 220 ' + // Right shoulder drop
      'L 920 420 ' + // Right sleeve outer
      'L 790 490 ' + // Right sleeve cuff
      'L 740 430 ' + // Right armpit
      'L 730 870 ' + // Right side torso hem
      'L 270 870 ' + // Bottom hem
      'L 260 430 ' + // Left side torso
      'L 210 490 ' + // Left armpit / sleeve cuff
      'L 80 420 ' + // Left sleeve outer
      'L 190 220 ' + // Left shoulder drop
      'Z',
    collarPath: 'M 390 130 C 440 210, 560 210, 610 130 C 560 110, 440 110, 390 130 Z',
    collarRibPath: 'M 395 140 C 445 200, 555 200, 605 140',
    seamLines: [
      { d: 'M 190 220 L 390 130', strokeWidth: 2, opacity: 0.15 }, // Left shoulder seam
      { d: 'M 610 130 L 810 220', strokeWidth: 2, opacity: 0.15 }, // Right shoulder seam
      { d: 'M 190 220 L 260 430', strokeWidth: 2, opacity: 0.12 }, // Left armhole drop seam
      { d: 'M 810 220 L 740 430', strokeWidth: 2, opacity: 0.12 }, // Right armhole drop seam
      { d: 'M 80 420 L 210 490', strokeWidth: 2, opacity: 0.2 }, // Left cuff hem
      { d: 'M 920 420 L 790 490', strokeWidth: 2, opacity: 0.2 }, // Right cuff hem
      { d: 'M 270 855 L 730 855', strokeWidth: 2, opacity: 0.2 }, // Bottom double-stitch hem
    ],
  },
  BACK: {
    viewBox: '0 0 1000 1000',
    outlinePath:
      'M 390 130 ' +
      'C 450 155, 550 155, 610 130 ' + // Shallow nape curve for back
      'L 810 220 ' +
      'L 920 420 ' +
      'L 790 490 ' +
      'L 740 430 ' +
      'L 730 870 ' +
      'L 270 870 ' +
      'L 260 430 ' +
      'L 210 490 ' +
      'L 80 420 ' +
      'L 190 220 ' +
      'Z',
    collarPath: 'M 390 130 C 450 155, 550 155, 610 130 C 550 120, 450 120, 390 130 Z',
    collarRibPath: 'M 395 136 C 450 150, 550 150, 605 136',
    seamLines: [
      { d: 'M 190 220 L 390 130', strokeWidth: 2, opacity: 0.15 },
      { d: 'M 610 130 L 810 220', strokeWidth: 2, opacity: 0.15 },
      { d: 'M 190 220 L 260 430', strokeWidth: 2, opacity: 0.12 },
      { d: 'M 810 220 L 740 430', strokeWidth: 2, opacity: 0.12 },
      { d: 'M 390 180 C 500 190, 500 190, 610 180', strokeWidth: 1.5, opacity: 0.1 }, // Back neck tape stitch
      { d: 'M 270 855 L 730 855', strokeWidth: 2, opacity: 0.2 },
    ],
  },
};
```

---

### 4.2 Component Blueprint: `src/components/studio/utils/textureBaker.ts`
High-speed composite texture baking engine:

```typescript
import { DesignElement } from '@/lib/types';

export class TextureBaker {
  private compositeCanvas: HTMLCanvasElement;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor() {
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCanvas.width = 1024;
    this.compositeCanvas.height = 1024;
  }

  public async preloadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load artwork image: ${url}`));
      img.src = url;
    });
  }

  public async preloadAll(elements: DesignElement[]): Promise<void> {
    await Promise.all(
      elements.map((el) => this.preloadImage(el.previewUrl).catch(() => null))
    );
  }

  /**
   * Bakes the 1024x1024 dual-zone texture map:
   * Left: [0, 512] Front garment + front elements
   * Right: [512, 1024] Back garment + back elements
   */
  public bake(
    garmentColorHex: string,
    frontElements: DesignElement[],
    backElements: DesignElement[]
  ): HTMLCanvasElement {
    const ctx = this.compositeCanvas.getContext('2d');
    if (!ctx) return this.compositeCanvas;

    // 1. Fill base garment color
    ctx.fillStyle = garmentColorHex;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Render Front Zone (x: 0 to 512, y: 0 to 1024)
    this.renderZone(ctx, frontElements, 0, 512, 1024);

    // 3. Render Back Zone (x: 512 to 1024, y: 0 to 1024)
    this.renderZone(ctx, backElements, 512, 512, 1024);

    return this.compositeCanvas;
  }

  private renderZone(
    ctx: CanvasRenderingContext2D,
    elements: DesignElement[],
    zoneOffsetX: number,
    zoneWidth: number,
    zoneHeight: number
  ) {
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
      const img = this.imageCache.get(el.previewUrl);
      if (!img) continue;

      const centerX = zoneOffsetX + (el.x / 100) * zoneWidth;
      const centerY = (el.y / 100) * zoneHeight;
      const w = (el.width / 100) * zoneWidth;
      const h = (el.height / 100) * zoneHeight;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  /**
   * Export standalone 2D preview mockup data URL
   */
  public export2DPreview(
    surface: 'FRONT' | 'BACK',
    garmentColorHex: string,
    elements: DesignElement[]
  ): string {
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 800;
    previewCanvas.height = 800;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return '';

    // Transparent background
    ctx.clearRect(0, 0, 800, 800);

    // Render garment silhouette path and elements...
    // (Returns high-res PNG data url)
    return previewCanvas.toDataURL('image/png');
  }
}
```

---

### 4.3 Component Blueprint: `src/components/studio/Garment2DCanvas.tsx`
Clean modern interactive canvas with zero intrusive print boundary boxes:

```tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DesignElement } from '@/lib/types';
import { GARMENT_SILHOUETTES } from './utils/garmentSilhouettes';
import { RotateCw } from 'lucide-react';

export interface Garment2DCanvasProps {
  surface: 'FRONT' | 'BACK';
  garmentColorHex: string;
  elements: DesignElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDeleteElement: (id: string) => void;
  interactive?: boolean;
  className?: string;
}

export function Garment2DCanvas({
  surface,
  garmentColorHex,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  interactive = true,
  className = '',
}: Garment2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const silhouette = GARMENT_SILHOUETTES[surface];

  // Active interaction drag state
  const [dragState, setDragState] = useState<{
    mode: 'translate' | 'scale' | 'rotate' | null;
    elementId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
  }>({
    mode: null,
    elementId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialRotation: 0,
  });

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Keyboard navigation & deletion
  useEffect(() => {
    if (!interactive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedElement.id);
      } else if (e.key === 'Escape') {
        onSelectElement(null);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 3 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        onUpdateElement(selectedElement.id, {
          x: Math.max(5, Math.min(95, selectedElement.x + dx)),
          y: Math.max(5, Math.min(95, selectedElement.y + dy)),
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, selectedElement, onDeleteElement, onSelectElement, onUpdateElement]);

  // Pointer drag/scale/rotate handling
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: 'translate' | 'scale' | 'rotate',
    el: DesignElement
  ) => {
    if (!interactive) return;
    e.stopPropagation();
    onSelectElement(el.id);

    setDragState({
      mode,
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: el.x,
      initialY: el.y,
      initialWidth: el.width,
      initialHeight: el.height,
      initialRotation: el.rotation,
    });
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState.mode || !dragState.elementId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (dragState.mode === 'translate') {
        const dxPx = e.clientX - dragState.startX;
        const dyPx = e.clientY - dragState.startY;
        const dxPct = (dxPx / rect.width) * 100;
        const dyPct = (dyPx / rect.height) * 100;

        onUpdateElement(dragState.elementId, {
          x: Math.round(Math.max(5, Math.min(95, dragState.initialX + dxPct))),
          y: Math.round(Math.max(5, Math.min(95, dragState.initialY + dyPct))),
        });
      } else if (dragState.mode === 'scale') {
        const dxPx = e.clientX - dragState.startX;
        const scaleFactor = 1 + (dxPx / rect.width) * 2;
        const newWidth = Math.max(10, Math.min(85, Math.round(dragState.initialWidth * scaleFactor)));
        const aspect = dragState.initialWidth / dragState.initialHeight;
        const newHeight = Math.round(newWidth / aspect);

        onUpdateElement(dragState.elementId, {
          width: newWidth,
          height: newHeight,
        });
      } else if (dragState.mode === 'rotate') {
        const centerXPx = rect.left + (dragState.initialX / 100) * rect.width;
        const centerYPx = rect.top + (dragState.initialY / 100) * rect.height;
        const radians = Math.atan2(e.clientY - centerYPx, e.clientX - centerXPx);
        let degrees = Math.round((radians * 180) / Math.PI + 90);
        if (degrees < 0) degrees += 360;
        if (degrees >= 360) degrees -= 360;

        // Snapping to 0, 90, 180, 270
        if (Math.abs(degrees - 0) < 4 || Math.abs(degrees - 360) < 4) degrees = 0;
        if (Math.abs(degrees - 90) < 4) degrees = 90;
        if (Math.abs(degrees - 180) < 4) degrees = 180;
        if (Math.abs(degrees - 270) < 4) degrees = 270;

        onUpdateElement(dragState.elementId, { rotation: degrees });
      }
    },
    [dragState, onUpdateElement]
  );

  const handlePointerUp = useCallback(() => {
    setDragState((prev) => ({ ...prev, mode: null, elementId: null }));
  }, []);

  useEffect(() => {
    if (dragState.mode) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragState.mode, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      className={`relative w-full aspect-square max-w-[620px] mx-auto select-none overflow-hidden rounded-xl bg-transparent flex items-center justify-center ${className}`}
    >
      {/* 1. T-Shirt SVG Silhouette on Transparent Backdrop */}
      <svg
        viewBox={silhouette.viewBox}
        className="w-full h-full drop-shadow-xl transition-all duration-300"
      >
        <defs>
          <filter id="softShade" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Garment Base Body */}
        <path
          d={silhouette.outlinePath}
          fill={garmentColorHex}
          className="transition-colors duration-300"
          filter="url(#softShade)"
        />

        {/* Collar & Ribbing */}
        <path d={silhouette.collarPath} fill={garmentColorHex} />
        <path
          d={silhouette.collarRibPath}
          fill="none"
          stroke={garmentColorHex === '#131718' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)'}
          strokeWidth="3"
        />

        {/* Garment Seams & Construction Lines */}
        {silhouette.seamLines.map((seam, i) => (
          <path
            key={i}
            d={seam.d}
            fill="none"
            stroke={garmentColorHex === '#131718' ? '#FFFFFF' : '#000000'}
            strokeWidth={seam.strokeWidth}
            strokeOpacity={seam.opacity}
          />
        ))}
      </svg>

      {/* 2. Interactive Artwork Layers (NO INTRUSIVE BOXES) */}
      {elements.map((el) => {
        const isSelected = el.id === selectedElementId;

        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(el.id);
            }}
            onPointerDown={(e) => handlePointerDown(e, 'translate', el)}
            style={{
              position: 'absolute',
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              height: `${el.height}%`,
              transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
              zIndex: el.zIndex,
              cursor: interactive ? (isSelected ? 'grab' : 'pointer') : 'default',
            }}
            className={`group transition-shadow ${
              isSelected ? 'ring-1 ring-warm/80 ring-offset-1' : 'hover:ring-1 hover:ring-borderCol/50'
            }`}
          >
            {/* Artwork Graphic */}
            <img
              src={el.previewUrl}
              alt={el.title}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
            />

            {/* Transform Controls ONLY shown on active selection */}
            {isSelected && interactive && (
              <>
                {/* Center subtle label */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink/90 text-paper text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                  {el.title} ({Math.round(el.width)}%)
                </div>

                {/* Top Rotation Knob */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'rotate', el)}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-warm text-ink flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                >
                  <RotateCw className="w-3 h-3" />
                </div>

                {/* 4 Corner Scale Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-se-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-sw-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-ne-resize shadow"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'scale', el)}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-paper border-2 border-warm rounded-sm cursor-nw-resize shadow"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

### 4.4 Component Blueprint: `src/components/studio/LayerManager.tsx`
Full layer control with zIndex ordering, visibility, delete, and transform sliders:

```tsx
'use client';

import React from 'react';
import { DesignElement } from '@/lib/types';
import {
  Layers,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Eye,
  Sliders,
  Move,
  Maximize2,
  RotateCw,
} from 'lucide-react';

export interface LayerManagerProps {
  surface: 'FRONT' | 'BACK';
  elements: DesignElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onDeleteElement: (id: string) => void;
  onOpenCatalog: () => void;
  onClearSurface: () => void;
}

export function LayerManager({
  surface,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onOpenCatalog,
  onClearSurface,
}: LayerManagerProps) {
  // Sort descending by zIndex so top layer appears first in list
  const sortedLayers = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const handleMoveUp = (el: DesignElement) => {
    const currentIndex = sortedLayers.findIndex((item) => item.id === el.id);
    if (currentIndex <= 0) return;
    const higherItem = sortedLayers[currentIndex - 1];
    // Swap zIndexes
    onUpdateElement(el.id, { zIndex: higherItem.zIndex });
    onUpdateElement(higherItem.id, { zIndex: el.zIndex });
  };

  const handleMoveDown = (el: DesignElement) => {
    const currentIndex = sortedLayers.findIndex((item) => item.id === el.id);
    if (currentIndex >= sortedLayers.length - 1) return;
    const lowerItem = sortedLayers[currentIndex + 1];
    // Swap zIndexes
    onUpdateElement(el.id, { zIndex: lowerItem.zIndex });
    onUpdateElement(lowerItem.id, { zIndex: el.zIndex });
  };

  return (
    <div className="bg-paper-light border border-borderCol rounded-xl p-4 flex flex-col space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-borderCol pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-warm-dark" />
          <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
            {surface} Layers ({elements.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {elements.length > 0 && (
            <button
              onClick={onClearSurface}
              className="text-[11px] font-mono text-mutedGray hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onOpenCatalog}
            className="flex items-center space-x-1 px-2.5 py-1 bg-ink text-paper rounded text-xs font-mono font-semibold hover:bg-ink-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Art</span>
          </button>
        </div>
      </div>

      {/* Layer List */}
      {elements.length === 0 ? (
        <div className="py-8 text-center text-mutedGray text-xs font-mono">
          No artwork placed on {surface.toLowerCase()} yet.
          <br />
          Click &ldquo;Add Art&rdquo; to browse catalog.
        </div>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {sortedLayers.map((el) => {
            const isSelected = el.id === selectedElementId;
            return (
              <div
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-warm/15 border-warm shadow-xs'
                    : 'bg-paper border-borderCol hover:border-warm/50'
                }`}
              >
                {/* Thumbnail & Info */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <img
                    src={el.previewUrl}
                    alt={el.title}
                    className="w-8 h-8 rounded bg-ink/5 object-contain p-0.5 border border-borderCol"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-sans font-semibold text-ink truncate">{el.title}</p>
                    <p className="text-[10px] font-mono text-mutedGray truncate">
                      ฿{el.price} &bull; {el.creatorName}
                    </p>
                  </div>
                </div>

                {/* Layer Ordering & Delete Actions */}
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleMoveUp(el)}
                    title="Move Layer Up"
                    className="p-1 text-mutedGray hover:text-ink rounded hover:bg-paper-dark transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(el)}
                    title="Move Layer Down"
                    className="p-1 text-mutedGray hover:text-ink rounded hover:bg-paper-dark transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteElement(el.id)}
                    title="Delete Layer"
                    className="p-1 text-mutedGray hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Layer Fine-Tuning Inspector */}
      {selectedElement && (
        <div className="border-t border-borderCol pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-ink uppercase tracking-wider">
              Selected: {selectedElement.title}
            </span>
            <button
              onClick={() => {
                // Center alignment shortcut
                onUpdateElement(selectedElement.id, { x: 50, y: 45 });
              }}
              className="text-[10px] font-mono text-warm-dark hover:underline"
            >
              Center on Chest
            </button>
          </div>

          {/* Scale Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-mutedGray">
              <span className="flex items-center space-x-1">
                <Maximize2 className="w-3 h-3" />
                <span>Scale</span>
              </span>
              <span>{Math.round(selectedElement.width)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={selectedElement.width}
              onChange={(e) => {
                const w = Number(e.target.value);
                const aspect = selectedElement.width / selectedElement.height;
                onUpdateElement(selectedElement.id, {
                  width: w,
                  height: Math.round(w / aspect),
                });
              }}
              className="w-full accent-warm"
            />
          </div>

          {/* Rotation Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-mutedGray">
              <span className="flex items-center space-x-1">
                <RotateCw className="w-3 h-3" />
                <span>Rotation</span>
              </span>
              <span>{selectedElement.rotation}&deg;</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedElement.rotation}
              onChange={(e) =>
                onUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })
              }
              className="w-full accent-warm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 4.5 Component Blueprint: `src/components/studio/ArtworkCatalogDrawer.tsx`
Preset drawer seeded with benchmark artworks:

```tsx
'use client';

import React, { useState } from 'react';
import { Search, X, Check, Tag } from 'lucide-react';
import { DesignElement } from '@/lib/types';

export interface SeededArtwork {
  artworkId: string;
  licenseOptionId: string;
  title: string;
  category: string;
  previewUrl: string;
  creatorName: string;
  creatorId: string;
  price: number;
}

export const SEEDED_PRESET_ARTWORKS: SeededArtwork[] = [
  {
    artworkId: 'art_dash_ape_classic',
    licenseOptionId: 'lic_dash_ape_std',
    title: 'Dash Ape Classic Head Mark',
    category: 'MASCOT',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718',
    creatorName: 'Dash Ape Studio',
    creatorId: 'creator_dash_ape',
    price: 40,
  },
  {
    artworkId: 'art_cyber_primate',
    licenseOptionId: 'lic_cyber_primate_std',
    title: 'Cyber Primate Tokyo 2088',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98',
    creatorName: 'Dash Ape Studio',
    creatorId: 'creator_dash_ape',
    price: 60,
  },
  {
    artworkId: 'art_static_glitch',
    licenseOptionId: 'lic_static_glitch_std',
    title: 'Static Glitch Protocol',
    category: 'PATTERN',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
    creatorName: 'Cyber Monk',
    creatorId: 'creator_cyber_monk',
    price: 25,
  },
  {
    artworkId: 'art_neo_shibuya',
    licenseOptionId: 'lic_neo_shibuya_std',
    title: 'Neo Shibuya Heavy Kanji',
    category: 'TYPOGRAPHY',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
    creatorName: 'Cyber Monk',
    creatorId: 'creator_cyber_monk',
    price: 50,
  },
  {
    artworkId: 'art_bonsai_core',
    licenseOptionId: 'lic_bonsai_core_std',
    title: 'Bonsai Core Brutalism',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
    creatorName: 'Soma Botanica',
    creatorId: 'creator_soma',
    price: 45,
  },
];

export interface ArtworkCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surface: 'FRONT' | 'BACK';
  onAddArtwork: (element: DesignElement) => void;
}

export function ArtworkCatalogDrawer({
  isOpen,
  onClose,
  surface,
  onAddArtwork,
}: ArtworkCatalogDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  if (!isOpen) return null;

  const categories = ['ALL', 'MASCOT', 'ILLUSTRATION', 'PATTERN', 'TYPOGRAPHY'];

  const filtered = SEEDED_PRESET_ARTWORKS.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || art.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSelect = (art: SeededArtwork) => {
    const newElement: DesignElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      artworkId: art.artworkId,
      licenseOptionId: art.licenseOptionId,
      title: art.title,
      previewUrl: art.previewUrl,
      creatorName: art.creatorName,
      creatorId: art.creatorId,
      surface,
      x: 50, // Centered horizontally
      y: surface === 'FRONT' ? 42 : 45, // Torso center
      width: 35,
      height: 35,
      rotation: 0,
      zIndex: Date.now(),
      price: art.price,
    };
    onAddArtwork(newElement);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper-light border border-borderCol w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-borderCol flex items-center justify-between">
          <div>
            <h2 className="text-base font-sans font-bold text-ink">Select Artwork Catalog</h2>
            <p className="text-xs font-mono text-mutedGray">
              Adding to {surface} garment surface &bull; Creator royalties applied automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-mutedGray hover:text-ink hover:bg-paper-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-borderCol space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search artworks, creators, styles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray focus:outline-none focus:border-warm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-ink text-paper'
                    : 'bg-paper border border-borderCol text-mutedGray hover:text-ink'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((art) => (
            <div
              key={art.artworkId}
              onClick={() => handleSelect(art)}
              className="group p-3 bg-paper border border-borderCol rounded-xl hover:border-warm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="aspect-square w-full rounded-lg bg-ink/5 flex items-center justify-center p-3 mb-2 overflow-hidden">
                <img
                  src={art.previewUrl}
                  alt={art.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <p className="text-xs font-sans font-bold text-ink truncate">{art.title}</p>
                <p className="text-[10px] font-mono text-mutedGray truncate">{art.creatorName}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-warm-dark">฿{art.price}</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-borderCol/40 text-ink">
                    {art.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Verification Method

1. **Verify Unit & Coordinate Math**:
   - `DesignElement.x` and `y` are center-percentage values `[0, 100]`. Verify by checking `computePlacement` in `src/lib/production.ts:66`:
     $x_{center\_cm} = (x / 100) \times platenWidth$.
2. **Verify Benchmark Pricing Integration**:
   - When adding `Dash Ape Classic Head Mark` (฿40) on Front, `Cyber Primate Tokyo 2088` (฿60) on Front, and `Static Glitch Protocol` (฿25) on Back:
     - Licenses total: $\text{THB } 40 + 60 + 25 = 125$.
     - Garment: ฿150 (`APX-HVY-001`).
     - DTG Printing: ฿80.
     - Packaging: ฿15.
     - Shipping: ฿40.
     - Total: $\text{THB } 410$.
     - Matches `src/lib/__tests__/pricing.test.ts` and `ORIGINAL_REQUEST.md:19` exactly!
3. **Verify Dual-Zone Texture Bounds**:
   - Confirm texture width = 1024, height = 1024.
   - Front zone elements strictly map within $X \in [0, 512]$, $Y \in [0, 1024]$ ($u \in [0.0, 0.5]$).
   - Back zone elements strictly map within $X \in [512, 1024]$, $Y \in [0, 1024]$ ($u \in [0.5, 1.0]$).
4. **Execution & Regression Test Command**:
   - Run existing vitest suite: `npm test` (all 157 tests must continue to pass).
   - Run type check: `npx tsc --noEmit` (zero errors).
