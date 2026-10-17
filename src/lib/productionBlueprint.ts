/**
 * src/lib/productionBlueprint.ts
 * 3D Print Placement Guide & Physical Ruler Engine for DTG Kornit printing.
 *
 * Physical Measurement Contract:
 * - Standard Kornit DTG Platen: 35.0 cm (width) x 45.0 cm (height)
 * - Center Chest Axis: Vertical line at X = 17.5 cm (platenWidthCm / 2)
 * - Collar Reference: Lowest front neckline / collar dip point at Y = 0.0 cm (top edge of printable platen)
 * - Hem Reference: Bottom edge of printable platen at Y = 45.0 cm
 *
 * Computes:
 * - offsetTopCollarCm: Distance from lowest collar center point to top of graphic
 * - offsetCenterCm: Distance from center chest line to graphic center (+ = Right, - = Left, 0 = Centered)
 * - widthCm & heightCm: Physical graphic print dimensions in cm
 * - offsetHemCm: Clearance distance from bottom of graphic to hem
 */

import { DesignElement, PrintSurface } from '@/lib/types';

export interface BlueprintPlatenConfig {
  platenWidthCm: number;
  platenHeightCm: number;
  collarDipYCm: number;
  garmentLengthCm: number;
}

export const DEFAULT_PLATEN_CONFIG: BlueprintPlatenConfig = {
  platenWidthCm: 35.0,
  platenHeightCm: 45.0,
  collarDipYCm: 0.0,
  garmentLengthCm: 45.0,
};

export type CenterOffsetDirection = 'CENTER' | 'LEFT' | 'RIGHT';

export interface BlueprintMeasurements {
  elementId: string;
  artworkId: string;
  title: string;
  previewUrl?: string;
  widthCm: number;
  heightCm: number;
  xCenterCm: number;
  yCenterCm: number;
  xLeftCm: number;
  xRightCm: number;
  yTopCm: number;
  yBottomCm: number;
  offsetTopCollarCm: number;
  offsetCenterCm: number;
  offsetCenterDirection: CenterOffsetDirection;
  offsetHemCm: number;
  rotationDeg: number;
  zIndex: number;
  isClamped: boolean;
  aabbWidthCm?: number;
  aabbHeightCm?: number;
}

export interface PlatenBoundaryValidation {
  isValid: boolean;
  overflowLeftCm: number;
  overflowRightCm: number;
  overflowTopCm: number;
  overflowBottomCm: number;
  warnings: string[];
}

export interface SurfaceBlueprint {
  surface: PrintSurface;
  surfaceName: string;
  platen: BlueprintPlatenConfig;
  centerChestXCm: number;
  measurements: BlueprintMeasurements[];
  totalArtworks: number;
  hasOverflow: boolean;
  boundingBox?: {
    xLeftCm: number;
    yTopCm: number;
    xRightCm: number;
    yBottomCm: number;
    totalWidthCm: number;
    totalHeightCm: number;
  };
}

export interface BlueprintRenderOptions {
  surface: PrintSurface;
  blueprint: SurfaceBlueprint;
  garmentColorHex?: string;
  garmentSku?: string;
  garmentName?: string;
  orderNumber?: string;
  jobId?: string;
  variantSku?: string;
  garmentSize?: string;
  printingTechnique?: string;
  includeRulers?: boolean;
  includeCenterAxis?: boolean;
  includeDimensionCallouts?: boolean;
  includeBoundingBoxes?: boolean;
  renderWidth?: number;
  renderHeight?: number;
  garmentSnapshotDataUrl?: string | null;
  monochrome?: boolean;
}

/**
 * Authentic Vector Silhouettes for Apex Heavyweight Tee (1000x1000 coordinate space)
 * Print Safe Platen Zone: X: [260, 740] (width: 480), Y: [180, 800] (height: 620)
 */
export const GARMENT_SILHOUETTES = {
  FRONT: {
    viewBox: '0 0 1000 1000',
    outlinePath:
      'M 390 130 C 440 210, 560 210, 610 130 L 810 220 L 920 420 L 790 490 L 740 430 L 730 870 L 270 870 L 260 430 L 210 490 L 80 420 L 190 220 Z',
    collarPath: 'M 390 130 C 440 210, 560 210, 610 130 C 560 110, 440 110, 390 130 Z',
    collarRibPath: 'M 395 140 C 445 200, 555 200, 605 140',
    seamLines: [
      { d: 'M 190 220 L 390 130', strokeWidth: 2, opacity: 0.25 }, // Left shoulder seam
      { d: 'M 610 130 L 810 220', strokeWidth: 2, opacity: 0.25 }, // Right shoulder seam
      { d: 'M 190 220 L 260 430', strokeWidth: 2, opacity: 0.2 }, // Left armhole drop seam
      { d: 'M 810 220 L 740 430', strokeWidth: 2, opacity: 0.2 }, // Right armhole drop seam
      { d: 'M 80 420 L 210 490', strokeWidth: 2, opacity: 0.3 }, // Left cuff hem
      { d: 'M 920 420 L 790 490', strokeWidth: 2, opacity: 0.3 }, // Right cuff hem
      { d: 'M 270 855 L 730 855', strokeWidth: 2, opacity: 0.3 }, // Bottom double-stitch hem
    ],
  },
  BACK: {
    viewBox: '0 0 1000 1000',
    outlinePath:
      'M 390 130 C 450 155, 550 155, 610 130 L 810 220 L 920 420 L 790 490 L 740 430 L 730 870 L 270 870 L 260 430 L 210 490 L 80 420 L 190 220 Z',
    collarPath: 'M 390 130 C 450 155, 550 155, 610 130 C 550 120, 450 120, 390 130 Z',
    collarRibPath: 'M 395 136 C 450 150, 550 150, 605 136',
    seamLines: [
      { d: 'M 190 220 L 390 130', strokeWidth: 2, opacity: 0.25 },
      { d: 'M 610 130 L 810 220', strokeWidth: 2, opacity: 0.25 },
      { d: 'M 190 220 L 260 430', strokeWidth: 2, opacity: 0.2 },
      { d: 'M 810 220 L 740 430', strokeWidth: 2, opacity: 0.2 },
      { d: 'M 390 180 C 500 190, 500 190, 610 180', strokeWidth: 1.5, opacity: 0.2 },
      { d: 'M 270 855 L 730 855', strokeWidth: 2, opacity: 0.3 },
    ],
  },
};


/**
 * Round numerical value to 2 decimal places for physical cm dimensions
 */
export function roundCm(val: number): number {
  const rounded = Math.round(val * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Sanitizes unsafe XML characters to prevent SVG XML entity injection or parsing errors.
 */
export function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Validates whether a placement exceeds the boundaries of the physical platen.
 */
export function validatePlatenBoundary(
  m: {
    xLeftCm: number;
    yTopCm: number;
    widthCm: number;
    heightCm: number;
    aabbWidthCm?: number;
    aabbHeightCm?: number;
  },
  platenWidthCm = DEFAULT_PLATEN_CONFIG.platenWidthCm,
  platenHeightCm = DEFAULT_PLATEN_CONFIG.platenHeightCm
): PlatenBoundaryValidation {
  const effectiveWidthCm = m.aabbWidthCm ?? m.widthCm;
  const effectiveHeightCm = m.aabbHeightCm ?? m.heightCm;
  const xRightCm = roundCm(m.xLeftCm + effectiveWidthCm);
  const yBottomCm = roundCm(m.yTopCm + effectiveHeightCm);

  const overflowLeftCm = m.xLeftCm < 0 ? roundCm(-m.xLeftCm) : 0;
  const overflowRightCm = xRightCm > platenWidthCm ? roundCm(xRightCm - platenWidthCm) : 0;
  const overflowTopCm = m.yTopCm < 0 ? roundCm(-m.yTopCm) : 0;
  const overflowBottomCm = yBottomCm > platenHeightCm ? roundCm(yBottomCm - platenHeightCm) : 0;

  const warnings: string[] = [];
  if (overflowLeftCm > 0) warnings.push(`Graphic exceeds left platen boundary by ${overflowLeftCm} cm`);
  if (overflowRightCm > 0) warnings.push(`Graphic exceeds right platen boundary by ${overflowRightCm} cm`);
  if (overflowTopCm > 0) warnings.push(`Graphic exceeds top collar platen boundary by ${overflowTopCm} cm`);
  if (overflowBottomCm > 0) warnings.push(`Graphic exceeds bottom hem platen boundary by ${overflowBottomCm} cm`);

  return {
    isValid: warnings.length === 0,
    overflowLeftCm,
    overflowRightCm,
    overflowTopCm,
    overflowBottomCm,
    warnings,
  };
}

/**
 * Computes Axis-Aligned Bounding Box (AABB) extents in physical cm for an element,
 * accounting for rotation degrees around its center.
 */
export function computeRotatedAabb(
  widthCm: number,
  heightCm: number,
  rotationDeg = 0
): { aabbWidthCm: number; aabbHeightCm: number } {
  if (!rotationDeg || rotationDeg % 360 === 0) {
    return { aabbWidthCm: roundCm(widthCm), aabbHeightCm: roundCm(heightCm) };
  }
  const rad = (Math.abs(rotationDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const aabbWidthCm = roundCm(widthCm * cos + heightCm * sin);
  const aabbHeightCm = roundCm(widthCm * sin + heightCm * cos);
  return { aabbWidthCm, aabbHeightCm };
}

/**
 * Clamps a design element so its bounding box strictly stays within physical platen boundaries,
 * taking element rotation into account.
 */
export function clampPlacement(
  element: Partial<DesignElement>,
  platenWidthCm = DEFAULT_PLATEN_CONFIG.platenWidthCm,
  platenHeightCm = DEFAULT_PLATEN_CONFIG.platenHeightCm
): {
  clampedElement: Partial<DesignElement>;
  isClamped: boolean;
  clampedWidthCm: number;
  clampedHeightCm: number;
  clampedCenterXCm: number;
  clampedCenterYCm: number;
  aabbWidthCm: number;
  aabbHeightCm: number;
} {
  const rawWidthPct = Math.max(0, Number(element.width) || 0);
  const rawHeightPct = Math.max(0, Number(element.height) || 0);
  const rawXPct = Number(element.x) || 0;
  const rawYPct = Number(element.y) || 0;
  const rotationDeg = Number(element.rotation) || 0;

  // Maximum allowed dimension is 100% of platen
  const clampedWidthPct = Math.min(100, rawWidthPct);
  const clampedHeightPct = Math.min(100, rawHeightPct);

  // Compute physical dimensions of unrotated element
  const widthCm = (clampedWidthPct / 100) * platenWidthCm;
  const heightCm = (clampedHeightPct / 100) * platenHeightCm;

  // Compute rotated AABB extents
  const { aabbWidthCm, aabbHeightCm } = computeRotatedAabb(widthCm, heightCm, rotationDeg);

  const halfAabbWidthCm = aabbWidthCm / 2;
  const halfAabbHeightCm = aabbHeightCm / 2;

  // Current center in physical cm
  let centerXCm = (rawXPct / 100) * platenWidthCm;
  let centerYCm = (rawYPct / 100) * platenHeightCm;

  // Clamp center so rotated AABB edges do not exceed [0, platenWidthCm] and [0, platenHeightCm]
  const minX = halfAabbWidthCm;
  const maxX = platenWidthCm - halfAabbWidthCm;
  const minY = halfAabbHeightCm;
  const maxY = platenHeightCm - halfAabbHeightCm;

  if (minX <= maxX) {
    centerXCm = Math.max(minX, Math.min(maxX, centerXCm));
  } else {
    centerXCm = platenWidthCm / 2;
  }

  if (minY <= maxY) {
    centerYCm = Math.max(minY, Math.min(maxY, centerYCm));
  } else {
    centerYCm = platenHeightCm / 2;
  }

  const finalXPct = roundCm((centerXCm / platenWidthCm) * 100);
  const finalYPct = roundCm((centerYCm / platenHeightCm) * 100);
  const finalWidthPct = roundCm(clampedWidthPct);
  const finalHeightPct = roundCm(clampedHeightPct);

  const isClamped =
    finalXPct !== roundCm(rawXPct) ||
    finalYPct !== roundCm(rawYPct) ||
    finalWidthPct !== roundCm(rawWidthPct) ||
    finalHeightPct !== roundCm(rawHeightPct);

  return {
    clampedElement: {
      ...element,
      x: finalXPct,
      y: finalYPct,
      width: finalWidthPct,
      height: finalHeightPct,
    },
    isClamped,
    clampedWidthCm: roundCm(widthCm),
    clampedHeightCm: roundCm(heightCm),
    clampedCenterXCm: roundCm(centerXCm),
    clampedCenterYCm: roundCm(centerYCm),
    aabbWidthCm: roundCm(aabbWidthCm),
    aabbHeightCm: roundCm(aabbHeightCm),
  };
}

/**
 * Computes exact physical centimeter dimensions & offsets for a single design element.
 */
export function computeBlueprintMeasurements(
  element: Partial<DesignElement>,
  config?: Partial<BlueprintPlatenConfig>
): BlueprintMeasurements {
  const platenWidthCm =
    config?.platenWidthCm && config.platenWidthCm > 0
      ? config.platenWidthCm
      : DEFAULT_PLATEN_CONFIG.platenWidthCm;
  const platenHeightCm =
    config?.platenHeightCm && config.platenHeightCm > 0
      ? config.platenHeightCm
      : DEFAULT_PLATEN_CONFIG.platenHeightCm;
  const collarDipYCm =
    typeof config?.collarDipYCm === 'number'
      ? config.collarDipYCm
      : DEFAULT_PLATEN_CONFIG.collarDipYCm;
  const garmentLengthCm =
    config?.garmentLengthCm && config.garmentLengthCm > 0
      ? config.garmentLengthCm
      : DEFAULT_PLATEN_CONFIG.garmentLengthCm;

  const widthPercent = Math.max(0, Number(element.width) || 0);
  const heightPercent = Math.max(0, Number(element.height) || 0);
  const xPercent = Number(element.x) || 0;
  const yPercent = Number(element.y) || 0;
  const rotationDeg = Number(element.rotation) || 0;
  const zIndex = Number(element.zIndex) || 1;

  // 1. Physical dimensions in cm
  const widthCm = roundCm((widthPercent / 100) * platenWidthCm);
  const heightCm = roundCm((heightPercent / 100) * platenHeightCm);

  // 2. Physical center on platen
  const xCenterCm = roundCm((xPercent / 100) * platenWidthCm);
  const yCenterCm = roundCm((yPercent / 100) * platenHeightCm);

  // 3. Rotated Axis-Aligned Bounding Box (AABB)
  const { aabbWidthCm, aabbHeightCm } = computeRotatedAabb(widthCm, heightCm, rotationDeg);

  // 4. Physical bounding box on platen
  const xLeftCm = roundCm(xCenterCm - aabbWidthCm / 2);
  const xRightCm = roundCm(xLeftCm + aabbWidthCm);
  const yTopCm = roundCm(yCenterCm - aabbHeightCm / 2);
  const yBottomCm = roundCm(yTopCm + aabbHeightCm);

  // 5. Distance from lowest collar center point to top of graphic (offsetTopCollarCm)
  const offsetTopCollarCm = roundCm(yTopCm - collarDipYCm);

  // 6. Center chest alignment (platen width / 2)
  const centerChestXCm = roundCm(platenWidthCm / 2);
  const rawOffsetCenter = roundCm(xCenterCm - centerChestXCm);
  const offsetCenterCm = rawOffsetCenter === 0 ? 0 : rawOffsetCenter;

  let offsetCenterDirection: CenterOffsetDirection = 'CENTER';
  if (offsetCenterCm > 0.05) {
    offsetCenterDirection = 'RIGHT';
  } else if (offsetCenterCm < -0.05) {
    offsetCenterDirection = 'LEFT';
  }

  // 7. Clearance distance to hem (offsetHemCm)
  const offsetHemCm = roundCm(garmentLengthCm - yBottomCm);

  // Check if clamped using actual spatial footprint
  const validation = validatePlatenBoundary(
    { xLeftCm, yTopCm, widthCm: aabbWidthCm, heightCm: aabbHeightCm },
    platenWidthCm,
    platenHeightCm
  );

  return {
    elementId: element.id || 'elem-unknown',
    artworkId: element.artworkId || 'art-unknown',
    title: element.title || 'Artwork Layer',
    previewUrl: element.previewUrl || undefined,
    widthCm,
    heightCm,
    xCenterCm,
    yCenterCm,
    xLeftCm,
    xRightCm,
    yTopCm,
    yBottomCm,
    offsetTopCollarCm,
    offsetCenterCm,
    offsetCenterDirection,
    offsetHemCm,
    rotationDeg,
    zIndex,
    isClamped: !validation.isValid,
    aabbWidthCm,
    aabbHeightCm,
  };
}

/**
 * Computes a full SurfaceBlueprint for all design elements placed on a garment surface.
 */
export function computeSurfaceBlueprint(
  surface: PrintSurface,
  elements: Array<Partial<DesignElement>>,
  config?: Partial<BlueprintPlatenConfig>
): SurfaceBlueprint {
  const platen: BlueprintPlatenConfig = {
    platenWidthCm:
      config?.platenWidthCm && config.platenWidthCm > 0
        ? config.platenWidthCm
        : DEFAULT_PLATEN_CONFIG.platenWidthCm,
    platenHeightCm:
      config?.platenHeightCm && config.platenHeightCm > 0
        ? config.platenHeightCm
        : DEFAULT_PLATEN_CONFIG.platenHeightCm,
    collarDipYCm:
      typeof config?.collarDipYCm === 'number'
        ? config.collarDipYCm
        : DEFAULT_PLATEN_CONFIG.collarDipYCm,
    garmentLengthCm:
      config?.garmentLengthCm && config.garmentLengthCm > 0
        ? config.garmentLengthCm
        : DEFAULT_PLATEN_CONFIG.garmentLengthCm,
  };
  const centerChestXCm = roundCm(platen.platenWidthCm / 2);

  const sortedElements = [...elements].sort(
    (a, b) => (Number(a.zIndex) || 1) - (Number(b.zIndex) || 1)
  );

  const measurements = sortedElements.map((el) => computeBlueprintMeasurements(el, platen));

  const hasOverflow = measurements.some((m) => {
    const val = validatePlatenBoundary(m, platen.platenWidthCm, platen.platenHeightCm);
    return !val.isValid;
  });

  let boundingBox: SurfaceBlueprint['boundingBox'] | undefined;
  if (measurements.length > 0) {
    const minLeft = Math.min(...measurements.map((m) => m.xLeftCm));
    const minTop = Math.min(...measurements.map((m) => m.yTopCm));
    const maxRight = Math.max(...measurements.map((m) => m.xRightCm));
    const maxBottom = Math.max(...measurements.map((m) => m.yBottomCm));

    boundingBox = {
      xLeftCm: roundCm(minLeft),
      yTopCm: roundCm(minTop),
      xRightCm: roundCm(maxRight),
      yBottomCm: roundCm(maxBottom),
      totalWidthCm: roundCm(maxRight - minLeft),
      totalHeightCm: roundCm(maxBottom - minTop),
    };
  }

  const surfaceName =
    surface === 'FRONT'
      ? 'Front Chest Print Zone'
      : surface === 'BACK'
      ? 'Back Torso Print Zone'
      : 'Sleeve / Side Print Zone';

  return {
    surface,
    surfaceName,
    platen,
    centerChestXCm,
    measurements,
    totalArtworks: measurements.length,
    hasOverflow,
    boundingBox,
  };
}

/**
 * Generates an SVG string representation of the Print Placement Blueprint & Centimeter Rulers.
 */
export function generateBlueprintSvg(options: BlueprintRenderOptions): string {
  const {
    surface,
    blueprint,
    garmentColorHex = '#131718',
    garmentSku = 'APX-HVY-001',
    garmentName = 'Apex Heavyweight Tee',
    orderNumber,
    jobId,
    variantSku,
    garmentSize = 'L',
    printingTechnique = 'Kornit Digital HD DTG (Water-based pigment)',
    includeRulers = true,
    includeCenterAxis = true,
    includeDimensionCallouts = true,
    includeBoundingBoxes = true,
    renderWidth = 1000,
    renderHeight = 1250,
    garmentSnapshotDataUrl,
    monochrome = false,
  } = options;

  const platenW = blueprint.platen.platenWidthCm; // 35 cm
  const platenH = blueprint.platen.platenHeightCm; // 45 cm

  // Layout Margins for Rulers & Tech Sheet Header
  const rulerThickness = includeRulers ? 60 : 20;
  const headerHeight = 110;
  const footerHeight = 70;
  const marginX = rulerThickness + 30;
  const marginY = headerHeight + rulerThickness;

  const drawableWidth = renderWidth - marginX - 50;
  const drawableHeight = renderHeight - marginY - footerHeight;

  // Scale factors: pixels per cm
  const scaleX = drawableWidth / platenW;
  const scaleY = drawableHeight / platenH;

  // Convert platen cm coordinates to SVG canvas pixels
  const toSvgX = (cmX: number) => marginX + cmX * scaleX;
  const toSvgY = (cmY: number) => marginY + cmY * scaleY;

  // Platen origin in SVG
  const platenSvgLeft = toSvgX(0);
  const platenSvgTop = toSvgY(0);
  const platenSvgWidth = platenW * scaleX;
  const platenSvgHeight = platenH * scaleY;
  const centerAxisSvgX = toSvgX(platenW / 2);

  // SVG Elements Accumulators
  const defs: string[] = [];
  const backgroundLayers: string[] = [];
  const rulerElements: string[] = [];
  const overlayElements: string[] = [];
  const annotationElements: string[] = [];

  // Marker definitions for dimension arrows
  defs.push(`
    <marker id="arrowhead-red" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#DC2626" />
    </marker>
    <marker id="arrowhead-start-red" markerWidth="8" markerHeight="8" refX="1" refY="3" orient="auto">
      <polygon points="6 0, 0 3, 6 6" fill="#DC2626" />
    </marker>
    <marker id="arrowhead-blue" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#2563EB" />
    </marker>
    <marker id="arrowhead-start-blue" markerWidth="8" markerHeight="8" refX="1" refY="3" orient="auto">
      <polygon points="6 0, 0 3, 6 6" fill="#2563EB" />
    </marker>
    <marker id="arrowhead-mono" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#FFFFFF" />
    </marker>
    <marker id="arrowhead-start-mono" markerWidth="8" markerHeight="8" refX="1" refY="3" orient="auto">
      <polygon points="6 0, 0 3, 6 6" fill="#FFFFFF" />
    </marker>
    <pattern id="platen-grid" width="${scaleX * 5}" height="${scaleY * 5}" patternUnits="userSpaceOnUse">
      <path d="M ${scaleX * 5} 0 L 0 0 0 ${scaleY * 5}" fill="none" stroke="${monochrome ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}" stroke-width="1" />
    </pattern>
  `);

  // 1. Overall Sheet Backdrop
  backgroundLayers.push(`
    <!-- Blueprint Outer Container -->
    <rect width="${renderWidth}" height="${renderHeight}" fill="${monochrome ? '#09090b' : '#0F172A'}" rx="16" />
  `);

  // 2. Real Garment Vector Silhouette & Snapshot Base in Platen Zone
  const silhouette = surface === 'BACK' ? GARMENT_SILHOUETTES.BACK : GARMENT_SILHOUETTES.FRONT;
  // Scaled relative to the 1000x1000 garment canvas where print safe zone is [260, 180, 480, 620]
  const shirtScaleX = platenSvgWidth / 480;
  const shirtScaleY = platenSvgHeight / 620;
  const shirtSvgX = platenSvgLeft - 260 * shirtScaleX;
  const shirtSvgY = platenSvgTop - 180 * shirtScaleY;

  const isGarmentWhite =
    garmentColorHex.toLowerCase() === '#ffffff' || garmentColorHex.toLowerCase() === '#fff';
  const shirtBodyFill = monochrome
    ? isGarmentWhite
      ? '#27272a'
      : '#141416'
    : garmentColorHex || '#131718';
  const shirtStroke = monochrome ? '#52525b' : '#334155';
  const collarFill = monochrome
    ? isGarmentWhite
      ? '#3f3f46'
      : '#1f1f23'
    : garmentColorHex || '#131718';
  const ribStroke = monochrome ? '#71717a' : 'rgba(255,255,255,0.25)';
  const seamStroke = monochrome
    ? '#52525b'
    : garmentColorHex === '#131718'
    ? '#FFFFFF'
    : '#000000';

  backgroundLayers.push(`
    <!-- Authentic T-Shirt Vector Garment Silhouette -->
    <g transform="translate(${shirtSvgX}, ${shirtSvgY}) scale(${shirtScaleX}, ${shirtScaleY})">
      <path d="${silhouette.outlinePath}" fill="${shirtBodyFill}" stroke="${shirtStroke}" stroke-width="${monochrome ? '2' : '1.5'}" />
      <path d="${silhouette.collarPath}" fill="${collarFill}" />
      <path d="${silhouette.collarRibPath}" fill="none" stroke="${ribStroke}" stroke-width="3" />
      ${silhouette.seamLines
        .map(
          (seam) =>
            `<path d="${seam.d}" fill="none" stroke="${seamStroke}" stroke-width="${seam.strokeWidth}" stroke-opacity="${monochrome ? '0.45' : String(seam.opacity)}" ${monochrome ? 'stroke-dasharray="4 2"' : ''} />`
        )
        .join('\n')}
    </g>
  `);

  if (garmentSnapshotDataUrl) {
    backgroundLayers.push(`
      <!-- Authentic 3D Garment Model Orthographic Backdrop -->
      <image href="${escapeXml(garmentSnapshotDataUrl)}" x="${shirtSvgX}" y="${shirtSvgY}" width="${1000 * shirtScaleX}" height="${1000 * shirtScaleY}" preserveAspectRatio="xMidYMid meet" opacity="${monochrome ? '0.92' : '0.85'}" ${monochrome ? 'style="filter: grayscale(100%) contrast(1.15);"' : ''} />
    `);
  }

  // 3. Platen Bounding Rect & Grid
  backgroundLayers.push(`
    <!-- Printable Platen Grid -->
    <rect x="${platenSvgLeft}" y="${platenSvgTop}" width="${platenSvgWidth}" height="${platenSvgHeight}" fill="url(#platen-grid)" stroke="${monochrome ? '#FFFFFF' : '#38BDF8'}" stroke-width="1.5" stroke-dasharray="6 4" rx="6" />
  `);

  // 4. Center Axis Line (CL)
  if (includeCenterAxis) {
    const clLineStroke = monochrome ? '#FFFFFF' : '#EF4444';
    const clBadgeFill = monochrome ? '#FFFFFF' : '#EF4444';
    const clBadgeText = monochrome ? '#000000' : '#FFFFFF';
    overlayElements.push(`
      <!-- Center Chest Axis -->
      <line x1="${centerAxisSvgX}" y1="${platenSvgTop - 20}" x2="${centerAxisSvgX}" y2="${platenSvgTop + platenSvgHeight + 20}" stroke="${clLineStroke}" stroke-width="2" stroke-dasharray="8 4" />
      <rect x="${centerAxisSvgX - 45}" y="${platenSvgTop - 26}" width="90" height="18" fill="${clBadgeFill}" rx="3" />
      <text x="${centerAxisSvgX}" y="${platenSvgTop - 13}" fill="${clBadgeText}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">CENTER CHEST (CL)</text>
    `);
  }

  // 5. Centimeter Rulers
  if (includeRulers) {
    const rulerBg = monochrome ? '#18181b' : '#1E293B';
    const rulerBorder = monochrome ? '#3f3f46' : '#475569';
    const rulerLabelColor = monochrome ? '#FFFFFF' : '#94A3B8';
    const rulerNumberColor = monochrome ? '#FFFFFF' : '#CBD5E1';
    const rulerMajorTick = '#F8FAFC';
    const rulerMinorTick = monochrome ? '#71717a' : '#64748B';
    const rulerCenterMark = monochrome ? '#FFFFFF' : '#EF4444';
    const rulerCenterText = monochrome ? '#FFFFFF' : '#F87171';

    // Top Horizontal Ruler (Width: 0 to 35 cm)
    const rulerTopY = platenSvgTop - 40;
    rulerElements.push(`
      <!-- Top Horizontal Ruler Background -->
      <rect x="${platenSvgLeft}" y="${rulerTopY}" width="${platenSvgWidth}" height="28" fill="${rulerBg}" stroke="${rulerBorder}" stroke-width="1" rx="4" />
      <text x="${platenSvgLeft - 10}" y="${rulerTopY + 18}" fill="${rulerLabelColor}" font-family="monospace" font-size="10" font-weight="bold" text-anchor="end">0 cm</text>
    `);

    for (let cm = 0; cm <= platenW; cm++) {
      const tickX = toSvgX(cm);
      const isMajor = cm % 5 === 0;
      const tickH = isMajor ? 14 : 7;
      rulerElements.push(`
        <line x1="${tickX}" y1="${rulerTopY + 28 - tickH}" x2="${tickX}" y2="${rulerTopY + 28}" stroke="${isMajor ? rulerMajorTick : rulerMinorTick}" stroke-width="${isMajor ? '1.5' : '1'}" />
      `);
      if (isMajor && cm > 0 && cm < platenW) {
        rulerElements.push(`
          <text x="${tickX}" y="${rulerTopY + 12}" fill="${rulerNumberColor}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">${cm}</text>
        `);
      }
    }

    // Explicit 17.5 cm center mark
    const centerTickX = toSvgX(17.5);
    rulerElements.push(`
      <line x1="${centerTickX}" y1="${rulerTopY + 10}" x2="${centerTickX}" y2="${rulerTopY + 28}" stroke="${rulerCenterMark}" stroke-width="2" />
      <text x="${centerTickX}" y="${rulerTopY + 8}" fill="${rulerCenterText}" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">17.5</text>
      <text x="${platenSvgLeft + platenSvgWidth + 10}" y="${rulerTopY + 18}" fill="${rulerLabelColor}" font-family="monospace" font-size="10" font-weight="bold">${platenW} cm</text>
    `);

    // Left Vertical Ruler (Height: 0 to 45 cm)
    const rulerLeftX = platenSvgLeft - 40;
    rulerElements.push(`
      <!-- Left Vertical Ruler Background -->
      <rect x="${rulerLeftX}" y="${platenSvgTop}" width="28" height="${platenSvgHeight}" fill="${rulerBg}" stroke="${rulerBorder}" stroke-width="1" rx="4" />
      <text x="${rulerLeftX + 14}" y="${platenSvgTop - 8}" fill="${rulerLabelColor}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">Collar</text>
    `);

    for (let cm = 0; cm <= platenH; cm++) {
      const tickY = toSvgY(cm);
      const isMajor = cm % 5 === 0;
      const tickW = isMajor ? 14 : 7;
      rulerElements.push(`
        <line x1="${rulerLeftX + 28 - tickW}" y1="${tickY}" x2="${rulerLeftX + 28}" y2="${tickY}" stroke="${isMajor ? rulerMajorTick : rulerMinorTick}" stroke-width="${isMajor ? '1.5' : '1'}" />
      `);
      if (isMajor && cm > 0 && cm < platenH) {
        rulerElements.push(`
          <text x="${rulerLeftX + 8}" y="${tickY + 3}" fill="${rulerNumberColor}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">${cm}</text>
        `);
      }
    }
    rulerElements.push(`
      <text x="${rulerLeftX + 14}" y="${platenSvgTop + platenSvgHeight + 16}" fill="${rulerLabelColor}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">Hem</text>
    `);
  }

  // 6. Artwork Layers (Real Stickers + Precision Bounding Boxes + Dimension Callouts)
  blueprint.measurements.forEach((m, idx) => {
    const artLeft = toSvgX(m.xLeftCm);
    const artTop = toSvgY(m.yTopCm);
    const artCenterX = toSvgX(m.xCenterCm);
    const artCenterY = toSvgY(m.yCenterCm);
    const artAabbWidth = (m.aabbWidthCm ?? m.widthCm) * scaleX;
    const artAabbHeight = (m.aabbHeightCm ?? m.heightCm) * scaleY;
    const unrotatedWidth = m.widthCm * scaleX;
    const unrotatedHeight = m.heightCm * scaleY;
    const artBottom = artTop + artAabbHeight;

    // A. Render Real Sticker Artwork Graphic if previewUrl is available
    if (m.previewUrl) {
      overlayElements.push(`
        <!-- Real Sticker Artwork Graphic Layer ${idx + 1} -->
        <g transform="rotate(${m.rotationDeg || 0}, ${artCenterX}, ${artCenterY})">
          <image href="${escapeXml(m.previewUrl)}" x="${artCenterX - unrotatedWidth / 2}" y="${artCenterY - unrotatedHeight / 2}" width="${unrotatedWidth}" height="${unrotatedHeight}" preserveAspectRatio="xMidYMid meet" opacity="0.95" />
        </g>
      `);
    }

    // B. Artwork Bounding Box & Crosshairs
    const boxStroke = monochrome ? '#FFFFFF' : '#38BDF8';
    const boxFill = monochrome ? 'rgba(255, 255, 255, 0.05)' : 'rgba(56, 189, 248, 0.12)';
    const badgeBg = monochrome ? '#FFFFFF' : '#0284C7';
    const badgeText = monochrome ? '#000000' : '#FFFFFF';

    if (includeBoundingBoxes) {
      if (m.rotationDeg && m.rotationDeg % 360 !== 0) {
        overlayElements.push(`
          <!-- Artwork Layer ${idx + 1} Rotated Box (${m.rotationDeg} deg) -->
          <g transform="rotate(${m.rotationDeg}, ${artCenterX}, ${artCenterY})">
            <rect x="${artCenterX - unrotatedWidth / 2}" y="${artCenterY - unrotatedHeight / 2}" width="${unrotatedWidth}" height="${unrotatedHeight}" fill="${boxFill}" stroke="${boxStroke}" stroke-width="2" rx="4" />
          </g>
          <!-- AABB Spatial Envelope -->
          <rect x="${artLeft}" y="${artTop}" width="${artAabbWidth}" height="${artAabbHeight}" fill="none" stroke="${boxStroke}" stroke-width="1" stroke-dasharray="3 3" opacity="0.6" rx="2" />
        `);
      } else {
        overlayElements.push(`
          <!-- Artwork Layer ${idx + 1} Bounding Box -->
          <rect x="${artLeft}" y="${artTop}" width="${artAabbWidth}" height="${artAabbHeight}" fill="${boxFill}" stroke="${boxStroke}" stroke-width="2" rx="4" />
        `);
      }

      // Corner Crosshairs & Layer Badge
      const layerBadgeX = Math.max(platenSvgLeft, Math.min(renderWidth - 175, artLeft));
      const layerBadgeY = artTop - 20 < platenSvgTop ? artTop + 4 : artTop - 20;
      const layerTextY = layerBadgeY + 13;

      overlayElements.push(`
        <!-- Corner Crosshairs -->
        <line x1="${artLeft - 4}" y1="${artTop}" x2="${artLeft + 4}" y2="${artTop}" stroke="${boxStroke}" stroke-width="2" />
        <line x1="${artLeft}" y1="${artTop - 4}" x2="${artLeft}" y2="${artTop + 4}" stroke="${boxStroke}" stroke-width="2" />
        <line x1="${artLeft + artAabbWidth - 4}" y1="${artBottom}" x2="${artLeft + artAabbWidth + 4}" y2="${artBottom}" stroke="${boxStroke}" stroke-width="2" />
        <line x1="${artLeft + artAabbWidth}" y1="${artBottom - 4}" x2="${artLeft + artAabbWidth}" y2="${artBottom + 4}" stroke="${boxStroke}" stroke-width="2" />
        <!-- Layer Badge -->
        <rect x="${layerBadgeX}" y="${layerBadgeY}" width="160" height="18" fill="${badgeBg}" rx="3" />
        <text x="${layerBadgeX + 6}" y="${layerTextY}" fill="${badgeText}" font-family="monospace" font-size="9" font-weight="bold">#${idx + 1} ${escapeXml((m.title || 'Artwork Layer').slice(0, 18))}</text>
      `);
    }

    // C. Dimension Callouts & Arrows
    if (includeDimensionCallouts) {
      const isMultiLayer = blueprint.measurements.length > 1;
      const lowestIdx = blueprint.measurements.reduce(
        (maxIdx, curr, i, arr) => (curr.yBottomCm > arr[maxIdx].yBottomCm ? i : maxIdx),
        0
      );
      const isLowestArtwork = idx === lowestIdx;

      const collarLineStroke = monochrome ? '#FFFFFF' : '#DC2626';
      const collarMarkerEnd = monochrome ? 'url(#arrowhead-mono)' : 'url(#arrowhead-red)';
      const collarMarkerStart = monochrome ? 'url(#arrowhead-start-mono)' : 'url(#arrowhead-start-red)';
      const collarBadgeBg = monochrome ? '#18181b' : '#1E293B';
      const collarBadgeStroke = monochrome ? '#FFFFFF' : '#DC2626';
      const collarBadgeText = monochrome ? '#FFFFFF' : '#FCA5A5';

      const centerLineStroke = monochrome ? '#FFFFFF' : '#DC2626';
      const centerMarkerEnd = monochrome ? 'url(#arrowhead-mono)' : 'url(#arrowhead-red)';
      const centerMarkerStart = monochrome ? 'url(#arrowhead-start-mono)' : 'url(#arrowhead-start-red)';
      const centerBadgeBg = monochrome ? '#18181b' : '#1E293B';
      const centerBadgeStroke = monochrome ? '#FFFFFF' : '#DC2626';
      const centerBadgeText = monochrome ? '#FFFFFF' : '#FCA5A5';

      const dimLineStroke = monochrome ? '#FFFFFF' : '#2563EB';
      const dimMarkerEnd = monochrome ? 'url(#arrowhead-mono)' : 'url(#arrowhead-blue)';
      const dimMarkerStart = monochrome ? 'url(#arrowhead-start-mono)' : 'url(#arrowhead-start-blue)';
      const dimBadgeBg = monochrome ? '#18181b' : '#1E293B';
      const dimBadgeStroke = monochrome ? '#FFFFFF' : '#2563EB';
      const dimBadgeText = monochrome ? '#FFFFFF' : '#93C5FD';

      // Dimension 1: Collar Offset (Staggered to prevent overlap on multi-layer)
      const collarArrowX = !isMultiLayer
        ? artCenterX
        : idx % 2 === 0
        ? artCenterX - 24
        : artCenterX + 24;

      if (m.offsetTopCollarCm > 0.5) {
        const collarBadgeX = !isMultiLayer
          ? artCenterX + 140 > renderWidth - 30
            ? artCenterX - 136
            : artCenterX + 6
          : idx % 2 === 0
          ? collarArrowX - 134
          : collarArrowX + 8;
        const collarBadgeY = (platenSvgTop + artTop) / 2 - 10;

        annotationElements.push(`
          <!-- Collar Offset Arrow (Layer ${idx + 1}) -->
          <line x1="${collarArrowX}" y1="${platenSvgTop}" x2="${collarArrowX}" y2="${artTop}" stroke="${collarLineStroke}" stroke-width="2" marker-start="${collarMarkerStart}" marker-end="${collarMarkerEnd}" />
          <rect x="${collarBadgeX}" y="${collarBadgeY}" width="130" height="20" fill="${collarBadgeBg}" stroke="${collarBadgeStroke}" stroke-width="1" rx="4" />
          <text x="${collarBadgeX + 6}" y="${collarBadgeY + 14}" fill="${collarBadgeText}" font-family="monospace" font-size="9" font-weight="bold">Collar: ${m.offsetTopCollarCm.toFixed(2)} cm</text>
        `);
      } else {
        const flushBadgeX = Math.max(platenSvgLeft, Math.min(renderWidth - 145, artCenterX - 65));
        const flushFill = monochrome ? '#27272a' : '#B91C1C';
        annotationElements.push(`
          <!-- Collar Offset Flush / Zero Badge -->
          <rect x="${flushBadgeX}" y="${platenSvgTop - 10}" width="130" height="18" fill="${flushFill}" ${monochrome ? 'stroke="#FFFFFF" stroke-width="1"' : ''} rx="3" />
          <text x="${flushBadgeX + 65}" y="${platenSvgTop + 2}" fill="#FFFFFF" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="middle">Collar: ${m.offsetTopCollarCm.toFixed(2)} cm (${m.offsetTopCollarCm < 0 ? 'Over' : 'Flush'})</text>
        `);
      }

      // Dimension 2: Center Offset (Compact indicator placed at top edge to not block artwork)
      if (Math.abs(m.offsetCenterCm) > 0.05) {
        const arrowEndX = artCenterX;
        const midX = (centerAxisSvgX + arrowEndX) / 2;
        const clBadgeX = Math.max(platenSvgLeft, Math.min(renderWidth - 120, midX - 55));
        const clBadgeY = artTop + artAabbHeight / 2 - 20;
        annotationElements.push(`
          <!-- Center Chest Offset Arrow -->
          <line x1="${centerAxisSvgX}" y1="${artTop + artAabbHeight / 2}" x2="${arrowEndX}" y2="${artTop + artAabbHeight / 2}" stroke="${centerLineStroke}" stroke-width="1.5" marker-start="${centerMarkerStart}" marker-end="${centerMarkerEnd}" stroke-dasharray="3 3" />
          <rect x="${clBadgeX}" y="${clBadgeY}" width="110" height="18" fill="${centerBadgeBg}" stroke="${centerBadgeStroke}" stroke-width="1" rx="3" />
          <text x="${clBadgeX + 55}" y="${clBadgeY + 12}" fill="${centerBadgeText}" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="middle">CL Offset: ${m.offsetCenterCm > 0 ? '+' : ''}${m.offsetCenterCm.toFixed(2)} cm</text>
        `);
      } else {
        const clBadgeX = Math.max(platenSvgLeft, Math.min(renderWidth - 85, artCenterX - 40));
        const clCenterFill = monochrome ? '#27272a' : '#047857';
        annotationElements.push(`
          <!-- Compact Center Chest Alignment Indicator -->
          <rect x="${clBadgeX}" y="${artTop + 4}" width="80" height="17" fill="${clCenterFill}" ${monochrome ? 'stroke="#FFFFFF" stroke-width="1"' : ''} rx="3" opacity="0.9" />
          <text x="${clBadgeX + 40}" y="${artTop + 16}" fill="#FFFFFF" font-family="monospace" font-size="8" font-weight="bold" text-anchor="middle">CL: 0 cm</text>
        `);
      }

      // Dimension 3: Graphic Print Dimensions (Width x Height)
      const platenBottomY = platenSvgTop + platenSvgHeight;
      const widthBarBelow = artBottom + 25 <= platenBottomY && (!isMultiLayer || isLowestArtwork);
      const widthLineY = widthBarBelow ? artBottom + 12 : artTop - 12;
      const widthBadgeY = widthBarBelow ? artBottom + 3 : artTop - 22;
      const widthBadgeX = Math.max(platenSvgLeft, Math.min(renderWidth - 105, artCenterX - 45));

      annotationElements.push(`
        <!-- Width Dimension Bar -->
        <line x1="${artLeft}" y1="${widthLineY}" x2="${artLeft + artAabbWidth}" y2="${widthLineY}" stroke="${dimLineStroke}" stroke-width="1.5" marker-start="${dimMarkerStart}" marker-end="${dimMarkerEnd}" />
        <rect x="${widthBadgeX}" y="${widthBadgeY}" width="90" height="18" fill="${dimBadgeBg}" stroke="${dimBadgeStroke}" stroke-width="1" rx="3" />
        <text x="${widthBadgeX + 45}" y="${widthBadgeY + 12}" fill="${dimBadgeText}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">W: ${m.widthCm.toFixed(2)} cm</text>
      `);

      // Height Dimension Bar
      const heightBarOnRight = artLeft + artAabbWidth + 95 <= renderWidth - 25;
      const heightLineX = heightBarOnRight ? artLeft + artAabbWidth + 14 : artLeft - 14;
      const heightBadgeX = heightBarOnRight ? heightLineX + 4 : Math.max(10, heightLineX - 84);
      const heightBadgeY = Math.max(platenSvgTop + 5, Math.min(platenBottomY - 25, artTop + artAabbHeight / 2 - 9));

      annotationElements.push(`
        <!-- Height Dimension Bar -->
        <line x1="${heightLineX}" y1="${artTop}" x2="${heightLineX}" y2="${artBottom}" stroke="${dimLineStroke}" stroke-width="1.5" marker-start="${dimMarkerStart}" marker-end="${dimMarkerEnd}" />
        <rect x="${heightBadgeX}" y="${heightBadgeY}" width="80" height="18" fill="${dimBadgeBg}" stroke="${dimBadgeStroke}" stroke-width="1" rx="3" />
        <text x="${heightBadgeX + 6}" y="${heightBadgeY + 12}" fill="${dimBadgeText}" font-family="monospace" font-size="9" font-weight="bold">H: ${m.heightCm.toFixed(2)} cm</text>
      `);

      // Dimension 4: Hem Clearance (Exclusively on lowest artwork to eliminate multi-layer clutter)
      if (isLowestArtwork || !isMultiLayer) {
        const hemLineStroke = monochrome ? '#FFFFFF' : '#DC2626';
        const hemMarkerEnd = monochrome ? 'url(#arrowhead-mono)' : 'url(#arrowhead-red)';
        const hemMarkerStart = monochrome ? 'url(#arrowhead-start-mono)' : 'url(#arrowhead-start-red)';
        const hemBadgeBg = monochrome ? '#18181b' : '#1E293B';
        const hemBadgeStroke = monochrome ? '#FFFFFF' : '#DC2626';
        const hemBadgeText = monochrome ? '#FFFFFF' : '#FCA5A5';

        if (platenBottomY - artBottom > 20) {
          const hemBadgeX = artCenterX + 130 > renderWidth - 30 ? artCenterX - 126 : artCenterX + 6;
          const hemBadgeY = (artBottom + platenBottomY) / 2 - 10;
          annotationElements.push(`
            <!-- Hem Clearance Arrow -->
            <line x1="${artCenterX}" y1="${artBottom}" x2="${artCenterX}" y2="${platenBottomY}" stroke="${hemLineStroke}" stroke-width="2" marker-start="${hemMarkerStart}" marker-end="${hemMarkerEnd}" />
            <rect x="${hemBadgeX}" y="${hemBadgeY}" width="120" height="20" fill="${hemBadgeBg}" stroke="${hemBadgeStroke}" stroke-width="1" rx="4" />
            <text x="${hemBadgeX + 6}" y="${hemBadgeY + 14}" fill="${hemBadgeText}" font-family="monospace" font-size="9" font-weight="bold">Hem: ${m.offsetHemCm.toFixed(2)} cm</text>
          `);
        } else {
          const hemFlushX = Math.max(platenSvgLeft, Math.min(renderWidth - 130, artCenterX - 55));
          const hemFlushFill = monochrome ? '#27272a' : '#B91C1C';
          annotationElements.push(`
            <!-- Hem Clearance Flush / Zero Badge -->
            <rect x="${hemFlushX}" y="${platenBottomY - 22}" width="110" height="18" fill="${hemFlushFill}" ${monochrome ? 'stroke="#FFFFFF" stroke-width="1"' : ''} rx="3" />
            <text x="${hemFlushX + 55}" y="${platenBottomY - 10}" fill="#FFFFFF" font-family="monospace" font-size="8.5" font-weight="bold" text-anchor="middle">Hem: ${m.offsetHemCm.toFixed(2)} cm (${m.offsetHemCm < 0 ? 'Over' : 'Flush'})</text>
          `);
        }
      }
    }
  });

  // 7. Tech Sheet Header & Production Metadata
  const headerSvg = monochrome
    ? `
    <!-- Tech Sheet Header (Monochrome Blueprint Spec) -->
    <g transform="translate(30, 20)">
      <rect width="${renderWidth - 60}" height="75" fill="#18181b" stroke="#3f3f46" stroke-width="1.5" rx="8" />
      <text x="20" y="28" fill="#FFFFFF" font-family="sans-serif" font-size="16" font-weight="bold">
        DTG PRINT PLACEMENT BLUEPRINT &#8226; ${escapeXml(surface)} SURFACE (B&amp;W SPEC)
      </text>
      <text x="20" y="48" fill="#a1a1aa" font-family="monospace" font-size="11">
        Garment: <tspan fill="#FFFFFF" font-weight="bold">${escapeXml(garmentName)} (${escapeXml(garmentSku)})</tspan> &#8226; Variant: <tspan fill="#FFFFFF">${escapeXml(variantSku || garmentSku)}</tspan> &#8226; Size: <tspan fill="#FFFFFF">${escapeXml(garmentSize)}</tspan>
      </text>
      <text x="20" y="66" fill="#a1a1aa" font-family="monospace" font-size="11">
        Platen: <tspan fill="#FFFFFF" font-weight="bold">${platenW} x ${platenH} cm</tspan> &#8226; Method: <tspan fill="#FFFFFF">${escapeXml(printingTechnique)}</tspan>
      </text>

      ${
        orderNumber
          ? `<rect x="${renderWidth - 260}" y="15" width="180" height="45" fill="#09090b" stroke="#3f3f46" rx="6" />
             <text x="${renderWidth - 250}" y="32" fill="#71717a" font-family="monospace" font-size="9" font-weight="bold">ORDER REFERENCE</text>
             <text x="${renderWidth - 250}" y="50" fill="#FFFFFF" font-family="monospace" font-size="13" font-weight="bold">${escapeXml(orderNumber)}</text>`
          : ''
      }
    </g>
  `
    : `
    <!-- Tech Sheet Header -->
    <g transform="translate(30, 20)">
      <rect width="${renderWidth - 60}" height="75" fill="#1E293B" stroke="#334155" stroke-width="1.5" rx="8" />
      <text x="20" y="28" fill="#F8FAFC" font-family="sans-serif" font-size="16" font-weight="bold">
        DTG PRINT PLACEMENT BLUEPRINT &#8226; ${escapeXml(surface)} SURFACE
      </text>
      <text x="20" y="48" fill="#94A3B8" font-family="monospace" font-size="11">
        Garment: <tspan fill="#F1F5F9" font-weight="bold">${escapeXml(garmentName)} (${escapeXml(garmentSku)})</tspan> &#8226; Variant: <tspan fill="#F1F5F9">${escapeXml(variantSku || garmentSku)}</tspan> &#8226; Size: <tspan fill="#F1F5F9">${escapeXml(garmentSize)}</tspan>
      </text>
      <text x="20" y="66" fill="#94A3B8" font-family="monospace" font-size="11">
        Platen: <tspan fill="#38BDF8" font-weight="bold">${platenW} x ${platenH} cm</tspan> &#8226; Method: <tspan fill="#38BDF8">${escapeXml(printingTechnique)}</tspan>
      </text>

      ${
        orderNumber
          ? `<rect x="${renderWidth - 260}" y="15" width="180" height="45" fill="#0F172A" stroke="#475569" rx="6" />
             <text x="${renderWidth - 250}" y="32" fill="#64748B" font-family="monospace" font-size="9" font-weight="bold">ORDER REFERENCE</text>
             <text x="${renderWidth - 250}" y="50" fill="#38BDF8" font-family="monospace" font-size="13" font-weight="bold">${escapeXml(orderNumber)}</text>`
          : ''
      }
    </g>
  `;

  // 8. Footer Spec Legend
  const footerSvg = monochrome
    ? `
    <!-- Tech Sheet Footer Legend (Monochrome Blueprint) -->
    <g transform="translate(30, ${renderHeight - 55})">
      <rect width="${renderWidth - 60}" height="40" fill="#18181b" stroke="#3f3f46" stroke-width="1" rx="6" />
      <line x1="20" y1="20" x2="35" y2="20" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 2" />
      <text x="42" y="24" fill="#FFFFFF" font-family="monospace" font-size="10">Dashed Axis: Center Chest (CL)</text>

      <line x1="250" y1="20" x2="265" y2="20" stroke="#FFFFFF" stroke-width="2" />
      <text x="272" y="24" fill="#FFFFFF" font-family="monospace" font-size="10">Solid Lines: Collar / Hem Offsets</text>

      <rect x="510" y="14" width="12" height="12" fill="none" stroke="#FFFFFF" stroke-width="1.5" />
      <text x="528" y="24" fill="#FFFFFF" font-family="monospace" font-size="10">Box: Platen &amp; Artwork Bounding</text>

      <text x="${renderWidth - 80}" y="24" fill="#71717a" font-family="monospace" font-size="10" text-anchor="end">ape-parel precision tech sheet (B&amp;W spec)</text>
    </g>
  `
    : `
    <!-- Tech Sheet Footer Legend -->
    <g transform="translate(30, ${renderHeight - 55})">
      <rect width="${renderWidth - 60}" height="40" fill="#1E293B" stroke="#334155" stroke-width="1" rx="6" />
      <circle cx="20" cy="20" r="5" fill="#EF4444" />
      <text x="32" y="24" fill="#E2E8F0" font-family="monospace" font-size="10">Red Axis: Center Chest</text>

      <circle cx="210" cy="20" r="5" fill="#DC2626" />
      <text x="222" y="24" fill="#E2E8F0" font-family="monospace" font-size="10">Red Lines: Collar / Hem Distance</text>

      <circle cx="460" cy="20" r="5" fill="#2563EB" />
      <text x="472" y="24" fill="#E2E8F0" font-family="monospace" font-size="10">Blue Lines: Artwork Width / Height</text>

      <text x="${renderWidth - 80}" y="24" fill="#64748B" font-family="monospace" font-size="10" text-anchor="end">ape-parel precision tech sheet</text>
    </g>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${renderWidth} ${renderHeight}" width="${renderWidth}" height="${renderHeight}">
      <defs>${defs.join('\n')}</defs>
      ${backgroundLayers.join('\n')}
      ${headerSvg}
      ${overlayElements.join('\n')}
      ${rulerElements.join('\n')}
      ${annotationElements.join('\n')}
      ${footerSvg}
    </svg>
  `.trim();
}

/**
 * Draws the Print Placement Blueprint directly onto an HTML5 2D Canvas context.
 */
export function drawBlueprintCanvas(
  ctx: CanvasRenderingContext2D,
  options: BlueprintRenderOptions
): void {
  const {
    surface,
    blueprint,
    garmentColorHex = '#131718',
    garmentSku = 'APX-HVY-001',
    garmentName = 'Apex Heavyweight Tee',
    orderNumber,
    renderWidth = 1000,
    renderHeight = 1250,
    includeRulers = true,
    includeCenterAxis = true,
    includeDimensionCallouts = true,
    includeBoundingBoxes = true,
  } = options;

  const platenW = blueprint.platen.platenWidthCm;
  const platenH = blueprint.platen.platenHeightCm;

  const marginX = includeRulers ? 90 : 40;
  const marginY = 170;
  const drawableWidth = renderWidth - marginX - 50;
  const drawableHeight = renderHeight - marginY - 70;

  const scaleX = drawableWidth / platenW;
  const scaleY = drawableHeight / platenH;

  const toX = (cmX: number) => marginX + cmX * scaleX;
  const toY = (cmY: number) => marginY + cmY * scaleY;

  // 1. Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, renderWidth, renderHeight);

  // 2. Header
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.fillRect(30, 20, renderWidth - 60, 75);
  ctx.strokeRect(30, 20, renderWidth - 60, 75);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`DTG PRINT PLACEMENT BLUEPRINT • ${surface} SURFACE`, 50, 48);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px monospace';
  ctx.fillText(`Garment: ${garmentName} (${garmentSku}) | Platen: ${platenW} x ${platenH} cm`, 50, 68);
  if (orderNumber) {
    ctx.fillText(`Order Ref: ${orderNumber}`, 50, 84);
  }

  // 3. Garment Platen Zone
  const pLeft = toX(0);
  const pTop = toY(0);
  const pWidth = platenW * scaleX;
  const pHeight = platenH * scaleY;

  ctx.fillStyle = garmentColorHex;
  ctx.fillRect(pLeft, pTop, pWidth, pHeight);

  // Platen Border
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(pLeft, pTop, pWidth, pHeight);
  ctx.setLineDash([]);

  // 4. Centimeter Rulers
  if (includeRulers) {
    // Top Horizontal Ruler
    const rulerTopY = pTop - 36;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(pLeft, rulerTopY, pWidth, 26);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(pLeft, rulerTopY, pWidth, 26);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('0 cm', pLeft - 6, rulerTopY + 17);

    for (let cm = 0; cm <= platenW; cm++) {
      const tickX = toX(cm);
      const isMajor = cm % 5 === 0;
      const tickH = isMajor ? 12 : 6;
      ctx.strokeStyle = isMajor ? '#F8FAFC' : '#64748B';
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(tickX, rulerTopY + 26 - tickH);
      ctx.lineTo(tickX, rulerTopY + 26);
      ctx.stroke();

      if (isMajor && cm > 0 && cm < platenW) {
        ctx.fillStyle = '#CBD5E1';
        ctx.textAlign = 'center';
        ctx.fillText(String(cm), tickX, rulerTopY + 11);
      }
    }

    // Explicit 17.5 cm center mark on top ruler
    const cTickX = toX(17.5);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cTickX, rulerTopY + 8);
    ctx.lineTo(cTickX, rulerTopY + 26);
    ctx.stroke();

    // Left Vertical Ruler
    const rulerLeftX = pLeft - 36;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(rulerLeftX, pTop, 26, pHeight);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(rulerLeftX, pTop, 26, pHeight);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Collar', rulerLeftX + 13, pTop - 6);

    for (let cm = 0; cm <= platenH; cm++) {
      const tickY = toY(cm);
      const isMajor = cm % 5 === 0;
      const tickW = isMajor ? 12 : 6;
      ctx.strokeStyle = isMajor ? '#F8FAFC' : '#64748B';
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(rulerLeftX + 26 - tickW, tickY);
      ctx.lineTo(rulerLeftX + 26, tickY);
      ctx.stroke();

      if (isMajor && cm > 0 && cm < platenH) {
        ctx.fillStyle = '#CBD5E1';
        ctx.textAlign = 'center';
        ctx.fillText(String(cm), rulerLeftX + 8, tickY + 3);
      }
    }
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('Hem', rulerLeftX + 13, pTop + pHeight + 14);
  }

  // 5. Red Center Axis
  if (includeCenterAxis) {
    const cX = toX(platenW / 2);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(cX, pTop - 15);
    ctx.lineTo(cX, pTop + pHeight + 15);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#EF4444';
    ctx.fillRect(cX - 45, pTop - 25, 90, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CENTER CHEST (CL)', cX, pTop - 13);
  }

  // 6. Artwork Bounding Boxes & Callouts
  blueprint.measurements.forEach((m, idx) => {
    const aX = toX(m.xLeftCm);
    const aY = toY(m.yTopCm);
    const cX = toX(m.xCenterCm);
    const cY = toY(m.yCenterCm);
    const uW = m.widthCm * scaleX;
    const uH = m.heightCm * scaleY;
    const aabbW = (m.aabbWidthCm ?? m.widthCm) * scaleX;
    const aabbH = (m.aabbHeightCm ?? m.heightCm) * scaleY;
    const aBottom = aY + aabbH;

    if (includeBoundingBoxes) {
      ctx.save();
      if (m.rotationDeg && m.rotationDeg % 360 !== 0) {
        ctx.translate(cX, cY);
        ctx.rotate((m.rotationDeg * Math.PI) / 180);
        ctx.translate(-cX, -cY);
      }
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(cX - uW / 2, cY - uH / 2, uW, uH);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.strokeRect(cX - uW / 2, cY - uH / 2, uW, uH);
      ctx.restore();

      // If rotated, draw AABB outline
      if (m.rotationDeg && m.rotationDeg % 360 !== 0) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(aX, aY, aabbW, aabbH);
        ctx.setLineDash([]);
      }

      // Layer Title Badge
      const title = m.title || 'Artwork Layer';
      const badgeY = aY - 18 < pTop ? aY + 4 : aY - 18;
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(aX, badgeY, Math.min(160, Math.max(100, title.length * 8)), 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`#${idx + 1} ${title.slice(0, 18)}`, aX + 4, badgeY + 12);
    }

    if (includeDimensionCallouts) {
      const pBottom = pTop + pHeight;
      const centerAxisX = toX(platenW / 2);

      // 1. Collar Offset
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cX, pTop);
      ctx.lineTo(cX, aY);
      ctx.stroke();

      ctx.fillStyle = '#FCA5A5';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Collar: ${(m.offsetTopCollarCm ?? 0).toFixed(2)} cm`, aX + 4, Math.max(pTop + 14, aY - 6));

      // 2. Center Chest (CL) Offset
      if (Math.abs(m.offsetCenterCm ?? 0) > 0.05) {
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(centerAxisX, cY);
        ctx.lineTo(cX, cY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#FCA5A5';
        ctx.fillText(
          `CL: ${m.offsetCenterCm > 0 ? '+' : ''}${(m.offsetCenterCm ?? 0).toFixed(2)} cm (${m.offsetCenterDirection ?? 'CENTER'})`,
          Math.min(cX, centerAxisX) + 4,
          cY - 4
        );
      } else {
        ctx.fillStyle = '#6EE7B7';
        ctx.fillText('CENTER CHEST (0 cm)', cX - 40, cY - 4);
      }

      // 3. Graphic Dimensions
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(aX, aBottom + 4);
      ctx.lineTo(aX + aabbW, aBottom + 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(aX + aabbW + 4, aY);
      ctx.lineTo(aX + aabbW + 4, aBottom);
      ctx.stroke();

      ctx.fillStyle = '#93C5FD';
      ctx.fillText(`W: ${(m.widthCm ?? 0).toFixed(2)} cm x H: ${(m.heightCm ?? 0).toFixed(2)} cm`, aX + 4, aBottom + 16);

      // 4. Hem Clearance
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cX, aBottom);
      ctx.lineTo(cX, pBottom);
      ctx.stroke();

      ctx.fillStyle = '#FCA5A5';
      ctx.fillText(`Hem: ${(m.offsetHemCm ?? 0).toFixed(2)} cm`, aX + 4, Math.min(pBottom - 6, aBottom + 28));
    }
  });
}

/**
 * Inlines all external or relative <image href="..."> in an SVG string as base64 data URLs.
 * Crucial for rendering SVGs via Blob URLs to Canvas or downloading standalone SVGs,
 * preventing browser sandbox security blocks and broken-image placeholder graphics.
 */
export async function inlineSvgImages(svgString: string): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return svgString;
  }

  const hrefRegex = /<(?:image|IMAGE)[^>]+?(?:href|xlink:href)=["']([^"']+)["'][^>]*?>/g;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(svgString)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('data:')) {
      urls.add(url);
    }
  }

  if (urls.size === 0) return svgString;

  const urlMap = new Map<string, string>();
  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 512;
        canvas.height = img.naturalHeight || img.height || 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          urlMap.set(url, dataUrl);
        }
      } catch {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          urlMap.set(url, dataUrl);
        } catch (e) {
          console.warn('[inlineSvgImages] Failed to inline image:', url, e);
        }
      }
    })
  );

  let inlined = svgString;
  urlMap.forEach((dataUrl, originalUrl) => {
    inlined = inlined.split(originalUrl).join(dataUrl);
  });

  return inlined;
}

/**
 * Triggers a browser download of an SVG string or Canvas as a high-resolution PNG file.
 */
export async function downloadBlueprintAsPng(
  svgString: string,
  filename = 'print-guide-ruler.png',
  targetWidth = 2000,
  targetHeight = 2500
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'data:image/png;base64,';
  }

  // Pre-inline all images to base64 so browser Blob security doesn't block them
  const inlinedSvg = await inlineSvgImages(svgString);

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'));
      return;
    }

    const img = new Image();
    const svgBlob = new Blob([inlinedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(url);
      const pngDataUrl = canvas.toDataURL('image/png');

      const a = document.createElement('a');
      a.href = pngDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      resolve(pngDataUrl);
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}

/**
 * Triggers a browser download of an SVG string as a vector .svg file.
 */
export async function downloadBlueprintAsSvg(
  svgString: string,
  filename = 'print-guide-ruler.svg'
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const inlinedSvg = await inlineSvgImages(svgString);
  const blob = new Blob([inlinedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * R4: Zero-Deformation Guarantee for Blueprint & Technical Exporters.
 * Asserts that manufacturing tech sheets and centimeter ruler guidelines operate
 * with strictly 0.0 dynamic cloth deformation (uInertiaLag = 0.0), preserving exact
 * collar offset (offsetTopCollarCm), center-chest alignment, and graphic dimensions.
 */
export const BLUEPRINT_ZERO_DEFORMATION = {
  uInertiaLag: 0.0,
  isZeroDeformation: true,
  collarOffsetPreserved: true,
  centerChestAligned: true,
} as const;

export function verifyBlueprintUndistortedAccuracy(uInertiaLag?: number): boolean {
  return uInertiaLag === undefined || Math.abs(uInertiaLag) < 1e-7;
}
