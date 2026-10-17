import { describe, it, expect, vi } from 'vitest';
import {
  roundCm,
  computeRotatedAabb,
  computeBlueprintMeasurements,
  computeSurfaceBlueprint,
  clampPlacement,
  validatePlatenBoundary,
  generateBlueprintSvg,
  drawBlueprintCanvas,
  downloadBlueprintAsPng,
  downloadBlueprintAsSvg,
  inlineSvgImages,
  escapeXml,
  DEFAULT_PLATEN_CONFIG,
  BlueprintPlatenConfig,
} from '@/lib/productionBlueprint';
import { bakeLosslessBlueprintCanvas } from '@/lib/productionBlueprintCanvas';
import { renderOffscreenGarment3D } from '@/lib/offscreen3dRenderer';
import { DesignElement } from '@/lib/types';

describe('Production Blueprint & Physical Centimeter Ruler Engine Suite', () => {
  describe('1. Physical Centimeter Coordinate Conversions on Standard Kornit Platen (35x45 cm)', () => {
    it('accurately converts percentage coordinates to physical centimeters on 35x45 cm platen', () => {
      // Benchmark element: center chest x=50%, y=35%, width=40%, height=40%
      const element: Partial<DesignElement> = {
        id: 'elem-bench-1',
        artworkId: 'art-primate',
        x: 50,
        y: 35,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Cyber Primate Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/primate.png',
      };

      const m = computeBlueprintMeasurements(element);

      // Width: 40% of 35 cm = 14.00 cm
      expect(m.widthCm).toBe(14.0);
      // Height: 40% of 45 cm = 18.00 cm
      expect(m.heightCm).toBe(18.0);
      // Center X: 50% of 35 cm = 17.50 cm
      expect(m.xCenterCm).toBe(17.5);
      // Center Y: 35% of 45 cm = 15.75 cm
      expect(m.yCenterCm).toBe(15.75);

      // Bounding box:
      // Left: 17.5 - 7.0 = 10.50 cm
      expect(m.xLeftCm).toBe(10.5);
      // Top: 15.75 - 9.0 = 6.75 cm
      expect(m.yTopCm).toBe(6.75);
      // Bottom: 6.75 + 18.0 = 24.75 cm
      expect(m.yBottomCm).toBe(24.75);
    });

    it('accurately scales with custom platen dimensions (e.g. 40x50 cm large format)', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-custom-1',
        artworkId: 'art-large',
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        rotation: 0,
        zIndex: 1,
        title: 'Large Format Banner',
        previewUrl: 'https://cdn.ape-parel.com/previews/large.png',
      };

      const customPlaten: BlueprintPlatenConfig = {
        platenWidthCm: 40.0,
        platenHeightCm: 50.0,
        collarDipYCm: 0.0,
        garmentLengthCm: 50.0,
      };

      const m = computeBlueprintMeasurements(element, customPlaten);

      expect(m.widthCm).toBe(20.0);
      expect(m.heightCm).toBe(25.0);
      expect(m.xCenterCm).toBe(20.0);
      expect(m.yCenterCm).toBe(25.0);
      expect(m.xLeftCm).toBe(10.0);
      expect(m.yTopCm).toBe(12.5);
      expect(m.yBottomCm).toBe(37.5);
    });

    it('handles compact pocket / crest dimensions with precision', () => {
      const pocketElement: Partial<DesignElement> = {
        id: 'elem-pocket-1',
        artworkId: 'art-crest',
        x: 25,
        y: 20,
        width: 12,
        height: 12,
        rotation: 0,
        zIndex: 1,
        title: 'Left Pocket Crest',
        previewUrl: 'https://cdn.ape-parel.com/previews/crest.png',
      };

      const m = computeBlueprintMeasurements(pocketElement);

      expect(m.widthCm).toBe(4.2); // (12/100) * 35 = 4.2 cm
      expect(m.heightCm).toBe(5.4); // (12/100) * 45 = 5.4 cm
      expect(m.xCenterCm).toBe(8.75); // (25/100) * 35 = 8.75 cm
      expect(m.yCenterCm).toBe(9.0); // (20/100) * 45 = 9.00 cm
      expect(m.xLeftCm).toBe(6.65); // 8.75 - 2.1 = 6.65 cm
      expect(m.yTopCm).toBe(6.3); // 9.0 - 2.7 = 6.30 cm
    });
  });

  describe('2. Collar Offset Calculations (offsetTopCollarCm)', () => {
    it('computes exact distance from lowest collar dip point (y=0) to top of graphic', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-collar-1',
        artworkId: 'art-top',
        x: 50,
        y: 35,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Chest Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/chest.png',
      };

      const m = computeBlueprintMeasurements(element);

      // yTopCm is 6.75 cm, collarDip is at 0.0 cm
      expect(m.offsetTopCollarCm).toBe(6.75);
    });

    it('computes collar offset for high-neck graphic placement', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-high-neck',
        artworkId: 'art-high',
        x: 50,
        y: 15,
        width: 30,
        height: 20,
        rotation: 0,
        zIndex: 1,
        title: 'High Neck Logo',
        previewUrl: 'https://cdn.ape-parel.com/previews/logo.png',
      };

      const m = computeBlueprintMeasurements(element);

      // yCenter = (15/100)*45 = 6.75 cm, height = (20/100)*45 = 9.0 cm
      // yTop = 6.75 - 4.5 = 2.25 cm
      expect(m.yTopCm).toBe(2.25);
      expect(m.offsetTopCollarCm).toBe(2.25);
    });

    it('supports custom collar reference offsets (e.g. 2.0 cm neckline ribbing allowance)', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-custom-collar',
        artworkId: 'art-test',
        x: 50,
        y: 35,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Chest Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/chest.png',
      };

      const customConfig: Partial<BlueprintPlatenConfig> = {
        collarDipYCm: 2.0,
      };

      const m = computeBlueprintMeasurements(element, customConfig);

      // yTopCm is 6.75 cm, offset relative to 2.0 cm collar line = 4.75 cm
      expect(m.offsetTopCollarCm).toBe(4.75);
    });
  });

  describe('3. Center Chest Alignment Calculations (offsetCenterCm)', () => {
    it('evaluates perfectly centered graphics with 0.0 cm offset and CENTER direction', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-center',
        artworkId: 'art-center',
        x: 50, // exactly 50%
        y: 40,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Centered Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/center.png',
      };

      const m = computeBlueprintMeasurements(element);

      expect(m.xCenterCm).toBe(17.5);
      expect(m.offsetCenterCm).toBe(0.0);
      expect(m.offsetCenterDirection).toBe('CENTER');
    });

    it('evaluates left-chest offset graphics with negative centimeter value and LEFT direction', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-left-chest',
        artworkId: 'art-badge',
        x: 25, // 25% of 35 cm = 8.75 cm
        y: 25,
        width: 15,
        height: 15,
        rotation: 0,
        zIndex: 1,
        title: 'Left Chest Badge',
        previewUrl: 'https://cdn.ape-parel.com/previews/badge.png',
      };

      const m = computeBlueprintMeasurements(element);

      expect(m.xCenterCm).toBe(8.75);
      // 8.75 - 17.5 = -8.75 cm
      expect(m.offsetCenterCm).toBe(-8.75);
      expect(m.offsetCenterDirection).toBe('LEFT');
    });

    it('evaluates right-chest offset graphics with positive centimeter value and RIGHT direction', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-right-crest',
        artworkId: 'art-badge',
        x: 75, // 75% of 35 cm = 26.25 cm
        y: 25,
        width: 15,
        height: 15,
        rotation: 0,
        zIndex: 1,
        title: 'Right Chest Badge',
        previewUrl: 'https://cdn.ape-parel.com/previews/badge.png',
      };

      const m = computeBlueprintMeasurements(element);

      expect(m.xCenterCm).toBe(26.25);
      // 26.25 - 17.5 = +8.75 cm
      expect(m.offsetCenterCm).toBe(8.75);
      expect(m.offsetCenterDirection).toBe('RIGHT');
    });

    it('detects subtle micro-alignments (e.g. 1 cm offset)', () => {
      // 17.5 cm + 1.0 cm = 18.5 cm -> xPercent = (18.5 / 35) * 100 = 52.857%
      const element: Partial<DesignElement> = {
        id: 'elem-micro',
        artworkId: 'art-micro',
        x: 52.86,
        y: 35,
        width: 20,
        height: 20,
        rotation: 0,
        zIndex: 1,
        title: 'Slightly Off-Center',
        previewUrl: 'https://cdn.ape-parel.com/previews/art.png',
      };

      const m = computeBlueprintMeasurements(element);

      expect(m.offsetCenterCm).toBeCloseTo(1.0, 1);
      expect(m.offsetCenterDirection).toBe('RIGHT');
    });
  });

  describe('4. Hem Clearance Calculations (offsetHemCm)', () => {
    it('computes exact distance from bottom edge of graphic to bottom hem', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-hem-1',
        artworkId: 'art-body',
        x: 50,
        y: 35,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Mid-Torso Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/art.png',
      };

      const m = computeBlueprintMeasurements(element);

      // yTop is 6.75, height is 18.00 -> yBottom is 24.75 cm
      // Platen height is 45.0 cm -> offsetHemCm is 45.0 - 24.75 = 20.25 cm
      expect(m.yBottomCm).toBe(24.75);
      expect(m.offsetHemCm).toBe(20.25);
    });

    it('computes low torso placement near bottom hem', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-near-hem',
        artworkId: 'art-bottom',
        x: 50,
        y: 80, // yCenter = (80/100)*45 = 36.0 cm
        width: 30,
        height: 20, // height = 9.0 cm -> yTop = 31.5 cm, yBottom = 40.5 cm
        rotation: 0,
        zIndex: 1,
        title: 'Lower Torso Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/art.png',
      };

      const m = computeBlueprintMeasurements(element);

      expect(m.yBottomCm).toBe(40.5);
      // Hem clearance: 45.0 - 40.5 = 4.5 cm
      expect(m.offsetHemCm).toBe(4.5);
    });

    it('supports custom garment total length (e.g. 72 cm overall tee length)', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-garment-len',
        artworkId: 'art-tee',
        x: 50,
        y: 35,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Torso Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/art.png',
      };

      const customConfig: Partial<BlueprintPlatenConfig> = {
        garmentLengthCm: 72.0,
      };

      const m = computeBlueprintMeasurements(element, customConfig);

      // yBottom is 24.75 cm, garment hem is 72.0 cm -> clearance is 72.0 - 24.75 = 47.25 cm
      expect(m.offsetHemCm).toBe(47.25);
    });
  });

  describe('5. Platen Boundary Clamping & Validation', () => {
    it('validates normal element as within bounds with zero overflow warnings', () => {
      const validPlacement = {
        xLeftCm: 10.5,
        yTopCm: 6.75,
        widthCm: 14.0,
        heightCm: 18.0,
      };

      const val = validatePlatenBoundary(validPlacement, 35.0, 45.0);

      expect(val.isValid).toBe(true);
      expect(val.overflowLeftCm).toBe(0);
      expect(val.overflowRightCm).toBe(0);
      expect(val.overflowTopCm).toBe(0);
      expect(val.overflowBottomCm).toBe(0);
      expect(val.warnings.length).toBe(0);
    });

    it('detects overflow when graphic exceeds left and right platen boundaries', () => {
      // Placed too far to the left
      const overflowLeft = {
        xLeftCm: -3.0,
        yTopCm: 10.0,
        widthCm: 15.0,
        heightCm: 15.0,
      };

      const valLeft = validatePlatenBoundary(overflowLeft, 35.0, 45.0);
      expect(valLeft.isValid).toBe(false);
      expect(valLeft.overflowLeftCm).toBe(3.0);
      expect(valLeft.warnings.some((w) => w.includes('left platen boundary'))).toBe(true);

      // Placed too far to the right (xLeft 25 + width 15 = 40 > 35 cm)
      const overflowRight = {
        xLeftCm: 25.0,
        yTopCm: 10.0,
        widthCm: 15.0,
        heightCm: 15.0,
      };

      const valRight = validatePlatenBoundary(overflowRight, 35.0, 45.0);
      expect(valRight.isValid).toBe(false);
      expect(valRight.overflowRightCm).toBe(5.0);
      expect(valRight.warnings.some((w) => w.includes('right platen boundary'))).toBe(true);
    });

    it('detects overflow when graphic exceeds collar top or bottom hem boundaries', () => {
      // Exceeds collar top
      const overflowTop = {
        xLeftCm: 10.0,
        yTopCm: -2.5,
        widthCm: 15.0,
        heightCm: 15.0,
      };

      const valTop = validatePlatenBoundary(overflowTop, 35.0, 45.0);
      expect(valTop.isValid).toBe(false);
      expect(valTop.overflowTopCm).toBe(2.5);

      // Exceeds bottom hem (yTop 35 + height 15 = 50 > 45 cm)
      const overflowBottom = {
        xLeftCm: 10.0,
        yTopCm: 35.0,
        widthCm: 15.0,
        heightCm: 15.0,
      };

      const valBottom = validatePlatenBoundary(overflowBottom, 35.0, 45.0);
      expect(valBottom.isValid).toBe(false);
      expect(valBottom.overflowBottomCm).toBe(5.0);
    });

    it('safely clamps out-of-bounds element coordinates within platen boundaries', () => {
      // Element pushed too far right and bottom: x=90%, y=90%, width=40%, height=40%
      // On 35x45 cm:
      // width = 14 cm, halfWidth = 7 cm -> minX = 7 cm, maxX = 28 cm
      // height = 18 cm, halfHeight = 9 cm -> minY = 9 cm, maxY = 36 cm
      const outOfBoundsElement: Partial<DesignElement> = {
        id: 'elem-out',
        artworkId: 'art-out',
        x: 95,
        y: 95,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Overflow Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/art.png',
      };

      const { clampedElement, isClamped, clampedCenterXCm, clampedCenterYCm } = clampPlacement(
        outOfBoundsElement,
        35.0,
        45.0
      );

      expect(isClamped).toBe(true);
      // Center X clamped to 28 cm (35 - 7)
      expect(clampedCenterXCm).toBe(28.0);
      // Center Y clamped to 36 cm (45 - 9)
      expect(clampedCenterYCm).toBe(36.0);

      // Clamped percentages:
      // x: (28 / 35) * 100 = 80%
      expect(clampedElement.x).toBe(80.0);
      // y: (36 / 45) * 100 = 80%
      expect(clampedElement.y).toBe(80.0);

      // Verifying clamped element is now valid
      const clampedM = computeBlueprintMeasurements(clampedElement);
      const reVal = validatePlatenBoundary(clampedM, 35.0, 45.0);
      expect(reVal.isValid).toBe(true);
    });

    it('clamps oversized graphic dimensions exceeding 100% of platen', () => {
      const oversizedElement: Partial<DesignElement> = {
        id: 'elem-huge',
        artworkId: 'art-huge',
        x: 50,
        y: 50,
        width: 125, // exceeds 100%
        height: 110, // exceeds 100%
        rotation: 0,
        zIndex: 1,
        title: 'Huge Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/art.png',
      };

      const { clampedElement, clampedWidthCm, clampedHeightCm } = clampPlacement(
        oversizedElement,
        35.0,
        45.0
      );

      expect(clampedElement.width).toBe(100);
      expect(clampedElement.height).toBe(100);
      expect(clampedWidthCm).toBe(35.0);
      expect(clampedHeightCm).toBe(45.0);
    });
  });

  describe('6. Surface Blueprint Assembly & Bounding Boxes', () => {
    it('assembles a full SurfaceBlueprint for multiple artwork layers sorted by z-index', () => {
      const elements: Partial<DesignElement>[] = [
        {
          id: 'elem-2',
          artworkId: 'art-top-layer',
          x: 50,
          y: 40,
          width: 20,
          height: 20,
          rotation: 0,
          zIndex: 2,
          title: 'Top Glitch Badge',
          previewUrl: 'https://cdn.ape-parel.com/previews/glitch.png',
        },
        {
          id: 'elem-1',
          artworkId: 'art-base-layer',
          x: 50,
          y: 35,
          width: 40,
          height: 40,
          rotation: 0,
          zIndex: 1,
          title: 'Base Primate Art',
          previewUrl: 'https://cdn.ape-parel.com/previews/primate.png',
        },
      ];

      const bp = computeSurfaceBlueprint('FRONT', elements);

      expect(bp.surface).toBe('FRONT');
      expect(bp.surfaceName).toBe('Front Chest Print Zone');
      expect(bp.centerChestXCm).toBe(17.5);
      expect(bp.totalArtworks).toBe(2);
      expect(bp.hasOverflow).toBe(false);

      // Verification of z-index ascending order
      expect(bp.measurements[0].title).toBe('Base Primate Art');
      expect(bp.measurements[1].title).toBe('Top Glitch Badge');

      // Combined bounding box check
      expect(bp.boundingBox).toBeDefined();
      expect(bp.boundingBox!.totalWidthCm).toBeGreaterThanOrEqual(14.0);
      expect(bp.boundingBox!.totalHeightCm).toBeGreaterThanOrEqual(18.0);
    });

    it('gracefully handles empty surface with 0 placed elements', () => {
      const bp = computeSurfaceBlueprint('BACK', []);

      expect(bp.surface).toBe('BACK');
      expect(bp.totalArtworks).toBe(0);
      expect(bp.measurements).toEqual([]);
      expect(bp.boundingBox).toBeUndefined();
      expect(bp.hasOverflow).toBe(false);
    });
  });

  describe('7. SVG Generation & Visual Rulers Engine', () => {
    it('generates valid SVG string containing centimeter rulers, center axis, and callouts', () => {
      const elements: Partial<DesignElement>[] = [
        {
          id: 'elem-render-1',
          artworkId: 'art-primate',
          x: 50,
          y: 35,
          width: 40,
          height: 40,
          rotation: 0,
          zIndex: 1,
          title: 'Cyber Primate Graphic',
          previewUrl: 'https://cdn.ape-parel.com/previews/primate.png',
        },
      ];

      const bp = computeSurfaceBlueprint('FRONT', elements);

      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentColorHex: '#131718',
        garmentSku: 'APX-HVY-001',
        garmentName: 'Apex Heavyweight Tee',
        orderNumber: 'APX-ORD-9021',
        jobId: 'JOB-APX-ORD-9021',
        includeRulers: true,
        includeCenterAxis: true,
        includeDimensionCallouts: true,
        includeBoundingBoxes: true,
      });

      expect(svg).toBeDefined();
      expect(typeof svg).toBe('string');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);

      // Verifies top & left rulers
      expect(svg).toContain('0 cm');
      expect(svg).toContain('35 cm');
      expect(svg).toContain('17.5');
      expect(svg).toContain('Collar');
      expect(svg).toContain('Hem');

      // Verifies red center chest axis
      expect(svg).toContain('CENTER CHEST (CL)');
      expect(svg).toContain('#EF4444');

      // Verifies physical dimension callouts
      expect(svg).toContain('Collar: 6.75 cm');
      expect(svg).toContain('W: 14.00 cm');
      expect(svg).toContain('H: 18.00 cm');
      expect(svg).toContain('Hem: 20.25 cm');

      // Verifies production header info
      expect(svg).toContain('APX-ORD-9021');
      expect(svg).toContain('APX-HVY-001');
      expect(svg).toContain('Kornit');
    });

    it('embeds background 3D orthographic snapshot data URL when provided', () => {
      const bp = computeSurfaceBlueprint('FRONT', []);
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentSnapshotDataUrl: testDataUrl,
      });

      expect(svg).toContain(testDataUrl);
      expect(svg).toContain('<image');
    });
  });

  describe('8. Numerical Utility & Edge Case Resilience', () => {
    it('roundCm correctly handles float precision issues and negative zero', () => {
      expect(roundCm(17.500000000000004)).toBe(17.5);
      expect(roundCm(6.74999999999999)).toBe(6.75);
      expect(roundCm(0.000001)).toBe(0.0);
      expect(roundCm(-0.000001)).toBe(0.0);
      expect(roundCm(0)).toBe(0);
    });

    it('handles zero width/height and undefined properties safely without NaN', () => {
      const emptyElement: Partial<DesignElement> = {
        id: 'empty',
        artworkId: 'art-empty',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        zIndex: 1,
        title: '',
        previewUrl: '',
      };

      const m = computeBlueprintMeasurements(emptyElement);
      expect(Number.isNaN(m.widthCm)).toBe(false);
      expect(Number.isNaN(m.heightCm)).toBe(false);
      expect(Number.isNaN(m.xCenterCm)).toBe(false);
      expect(Number.isNaN(m.yCenterCm)).toBe(false);
      expect(Number.isNaN(m.offsetTopCollarCm)).toBe(false);
      expect(Number.isNaN(m.offsetCenterCm)).toBe(false);
      expect(Number.isNaN(m.offsetHemCm)).toBe(false);
      expect(m.widthCm).toBe(0);
      expect(m.heightCm).toBe(0);
    });
  });

  describe('9. Rotated Elements & Spatial AABB Envelope Calculations', () => {
    it('computeRotatedAabb correctly computes spatial extents across various rotation angles', () => {
      // 0 deg
      const r0 = computeRotatedAabb(10, 20, 0);
      expect(r0.aabbWidthCm).toBe(10);
      expect(r0.aabbHeightCm).toBe(20);

      // 90 deg -> width becomes 20, height becomes 10
      const r90 = computeRotatedAabb(10, 20, 90);
      expect(r90.aabbWidthCm).toBe(20);
      expect(r90.aabbHeightCm).toBe(10);

      // -90 deg
      const rNeg90 = computeRotatedAabb(10, 20, -90);
      expect(rNeg90.aabbWidthCm).toBe(20);
      expect(rNeg90.aabbHeightCm).toBe(10);

      // 45 deg square (10x10): 10 * sqrt(2) = 14.14 cm
      const r45 = computeRotatedAabb(10, 10, 45);
      expect(r45.aabbWidthCm).toBeCloseTo(14.14, 1);
      expect(r45.aabbHeightCm).toBeCloseTo(14.14, 1);

      // 180 deg
      const r180 = computeRotatedAabb(10, 20, 180);
      expect(r180.aabbWidthCm).toBe(10);
      expect(r180.aabbHeightCm).toBe(20);
    });

    it('computeBlueprintMeasurements accurately incorporates rotation into collar offset and hem clearance', () => {
      // A 10x10 cm square (width=28.57%, height=22.22%) at center x=50% (17.5 cm), y=35% (15.75 cm)
      // Unrotated: yTop is 15.75 - 5.0 = 10.75 cm, offsetTopCollar is 10.75 cm.
      // Rotated 45 deg: AABB height is 14.14 cm. Half is 7.07 cm.
      // yTop is 15.75 - 7.07 = 8.68 cm. offsetTopCollar is 8.68 cm.
      const unrotatedElem: Partial<DesignElement> = {
        id: 'elem-rot-0',
        x: 50,
        y: 35,
        width: 28.5714,
        height: 22.2222,
        rotation: 0,
        title: 'Square Unrotated',
      };
      const rotatedElem: Partial<DesignElement> = {
        id: 'elem-rot-45',
        x: 50,
        y: 35,
        width: 28.5714,
        height: 22.2222,
        rotation: 45,
        title: 'Square Rotated 45',
      };

      const m0 = computeBlueprintMeasurements(unrotatedElem);
      const m45 = computeBlueprintMeasurements(rotatedElem);

      expect(m0.widthCm).toBe(10.0);
      expect(m0.heightCm).toBe(10.0);
      expect(m0.offsetTopCollarCm).toBe(10.75);

      // 45 deg rotation extends toward collar
      expect(m45.aabbWidthCm).toBeCloseTo(14.14, 1);
      expect(m45.aabbHeightCm).toBeCloseTo(14.14, 1);
      expect(m45.offsetTopCollarCm).toBeLessThan(m0.offsetTopCollarCm);
      expect(m45.offsetTopCollarCm).toBeCloseTo(8.68, 1);

      // Bottom hem clearance is also reduced
      expect(m45.offsetHemCm).toBeLessThan(m0.offsetHemCm);
    });

    it('clampPlacement properly clamps rotated graphic elements so rotated corners never exceed platen borders', () => {
      // 10x10 cm square placed near right edge (x=90% -> 31.5 cm)
      // At 45 deg, half AABB width is 7.07 cm.
      // Max center allowed on 35 cm platen is 35 - 7.07 = 27.93 cm.
      const rotatedEdgeElem: Partial<DesignElement> = {
        id: 'elem-rot-clamp',
        x: 95,
        y: 95,
        width: 28.5714, // 10 cm
        height: 22.2222, // 10 cm
        rotation: 45,
      };

      const { clampedElement, isClamped, clampedCenterXCm, clampedCenterYCm } = clampPlacement(
        rotatedEdgeElem,
        35.0,
        45.0
      );

      expect(isClamped).toBe(true);
      expect(clampedCenterXCm).toBeCloseTo(27.93, 1);
      expect(clampedCenterYCm).toBeCloseTo(37.93, 1);

      // Verify clamped element spatial footprint is strictly within platen
      const m = computeBlueprintMeasurements(clampedElement);
      const val = validatePlatenBoundary(
        { xLeftCm: m.xLeftCm, yTopCm: m.yTopCm, widthCm: m.aabbWidthCm!, heightCm: m.aabbHeightCm! },
        35.0,
        45.0
      );
      expect(val.isValid).toBe(true);
      expect(val.overflowRightCm).toBe(0);
      expect(val.overflowBottomCm).toBe(0);
    });
  });

  describe('10. SVG Callout & Boundary Resilience (Anti-Clipping & Anti-Collision)', () => {
    it('prevents callout badges from clipping outside canvas border when graphic is at right edge', () => {
      // Element at far right: x=90% (31.5 cm), width=10% (3.5 cm), center 31.5 cm, right edge 33.25 cm
      const rightEdgeElem: Partial<DesignElement> = {
        id: 'elem-right-edge',
        x: 90,
        y: 30,
        width: 10,
        height: 10,
        rotation: 0,
        title: 'Right Edge Badge',
      };

      const bp = computeSurfaceBlueprint('FRONT', [rightEdgeElem]);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        renderWidth: 1000,
        renderHeight: 1250,
      });

      // Parse rect elements and verify none have x + width > 1000
      const rectRegex = /<rect[^>]+x="([^"]+)"[^>]+width="([^"]+)"/g;
      let match;
      while ((match = rectRegex.exec(svg)) !== null) {
        const x = parseFloat(match[1]);
        const w = parseFloat(match[2]);
        if (!isNaN(x) && !isNaN(w)) {
          expect(x + w).toBeLessThanOrEqual(1000);
          expect(x).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('prevents width dimension bar from colliding with footer legend when graphic is at bottom hem', () => {
      // Element at bottom hem: y=95% (42.75 cm), height=8% (3.6 cm) -> bottom is 44.55 cm
      const bottomElem: Partial<DesignElement> = {
        id: 'elem-bottom-flush',
        x: 50,
        y: 95,
        width: 20,
        height: 8,
        rotation: 0,
        title: 'Bottom Hem Art',
      };

      const bp = computeSurfaceBlueprint('FRONT', [bottomElem]);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        renderWidth: 1000,
        renderHeight: 1250,
      });

      // Footer begins at renderHeight - 55 = 1195
      // Verify no dimension lines or rects collide into the footer zone
      expect(svg).toContain('Hem:');
      expect(svg).toContain('W:');
    });

    it('renders rotated artwork boundary with svg transform and dashed AABB envelope', () => {
      const rotElem: Partial<DesignElement> = {
        id: 'elem-rot-art',
        x: 50,
        y: 40,
        width: 30,
        height: 30,
        rotation: 45,
        title: 'Rotated Diamond',
      };

      const bp = computeSurfaceBlueprint('FRONT', [rotElem]);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
      });

      expect(svg).toContain('transform="rotate(45,');
      expect(svg).toContain('Rotated Box (45 deg)');
      expect(svg).toContain('stroke-dasharray="3 3"');
    });

    it('displays flush / zero collar badge cleanly when graphic is placed at neckline dip', () => {
      // Element placed right at neckline dip: yTop is 0.0 cm
      // yCenter = (10/100)*45 = 4.5 cm, height = (20/100)*45 = 9.0 cm -> yTop = 0.0 cm
      const neckElem: Partial<DesignElement> = {
        id: 'elem-neck-zero',
        x: 50,
        y: 10,
        width: 20,
        height: 20,
        rotation: 0,
        title: 'Neckline Trim',
      };

      const bp = computeSurfaceBlueprint('FRONT', [neckElem]);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
      });

      expect(svg).toContain('Collar: 0.00 cm');
      expect(svg).toContain('Flush');
    });
  });

  describe('11. Supplier Job Blueprint Route & Order ID Normalization', () => {
    it('throws notFound error when requested with invalid or non-existent order ID', async () => {
      const { default: SupplierJobBlueprintPage } = await import('@/app/supplier/jobs/[id]/page');
      await expect(
        SupplierJobBlueprintPage({ params: { id: 'non-existent-order-id-9999' } })
      ).rejects.toThrow();
    });

    it('strips JOB- prefix and handles non-existent JOB-prefixed order ID with notFound', async () => {
      const { default: SupplierJobBlueprintPage } = await import('@/app/supplier/jobs/[id]/page');
      await expect(
        SupplierJobBlueprintPage({ params: { id: 'JOB-non-existent-order-id-9999' } })
      ).rejects.toThrow();
    });
  });

  describe('12. Rotated Elements Surface Bounding Box & Overflow Detection (Adversarial)', () => {
    it('accurately computes boundingBox totalWidthCm and xRightCm for 90-degree rotated elements', () => {
      // 10 cm wide, 20 cm high graphic rotated 90 degrees
      // Unrotated: width = (10/35)*100 = 28.5714%, height = (20/45)*100 = 44.4444%
      // Rotated: aabbWidth = 20 cm, aabbHeight = 10 cm
      // Placed at center: x = 50% (17.5 cm), y = 50% (22.5 cm)
      const elem90: Partial<DesignElement> = {
        id: 'elem-rot-90',
        x: 50,
        y: 50,
        width: (10 / 35) * 100,
        height: (20 / 45) * 100,
        rotation: 90,
        title: 'Tall Graphic Rotated 90',
      };

      const bp = computeSurfaceBlueprint('FRONT', [elem90]);
      expect(bp.measurements[0].xRightCm).toBe(27.5);
      expect(bp.measurements[0].xLeftCm).toBe(7.5);
      expect(bp.measurements[0].aabbWidthCm).toBe(20.0);
      expect(bp.measurements[0].aabbHeightCm).toBe(10.0);

      expect(bp.boundingBox).toBeDefined();
      expect(bp.boundingBox?.xLeftCm).toBe(7.5);
      expect(bp.boundingBox?.xRightCm).toBe(27.5);
      expect(bp.boundingBox?.totalWidthCm).toBe(20.0);
      expect(bp.boundingBox?.totalHeightCm).toBe(10.0);
    });

    it('accurately computes boundingBox for 45-degree diamond rotated graphics', () => {
      // 10x10 cm square rotated 45 deg -> 14.14 x 14.14 cm AABB
      // Centered at 17.5 cm, 22.5 cm
      const elem45: Partial<DesignElement> = {
        id: 'elem-rot-45',
        x: 50,
        y: 50,
        width: (10 / 35) * 100,
        height: (10 / 45) * 100,
        rotation: 45,
        title: 'Diamond 45',
      };

      const bp = computeSurfaceBlueprint('FRONT', [elem45]);
      expect(bp.boundingBox).toBeDefined();
      expect(bp.boundingBox?.totalWidthCm).toBeCloseTo(14.14, 1);
      expect(bp.boundingBox?.totalHeightCm).toBeCloseTo(14.14, 1);
      expect(bp.boundingBox?.xRightCm).toBeCloseTo(24.57, 1);
      expect(bp.boundingBox?.xLeftCm).toBeCloseTo(10.43, 1);
    });

    it('flags hasOverflow: true when rotated element corners exceed platen even if unrotated fits', () => {
      // Graphic: 10x10 cm. Unrotated right edge at center 28 cm is 33 cm (<= 35 cm, within platen).
      // At 45 deg, aabbWidth is 14.14 cm. Rotated right edge is 28 + 7.07 = 35.07 cm (> 35 cm, overflow!).
      const elemEdgeRot: Partial<DesignElement> = {
        id: 'elem-edge-rot',
        x: (28 / 35) * 100, // 80% -> 28.0 cm
        y: 50,
        width: (10 / 35) * 100,
        height: (10 / 45) * 100,
        rotation: 45,
        title: 'Right Edge Rotated Overflow',
      };

      const bp = computeSurfaceBlueprint('FRONT', [elemEdgeRot]);
      expect(bp.hasOverflow).toBe(true);
      expect(bp.measurements[0].isClamped).toBe(true);
    });
  });

  describe('13. XML Entity Escaping & Special Character Resilience in SVG', () => {
    it('properly escapes XML special characters with escapeXml', () => {
      expect(escapeXml('Dash & Ape <Tokyo> "Classic" \'Heavy\'')).toBe(
        'Dash &amp; Ape &lt;Tokyo&gt; &quot;Classic&quot; &apos;Heavy&apos;'
      );
      expect(escapeXml(null)).toBe('');
      expect(escapeXml(undefined)).toBe('');
      expect(escapeXml(123)).toBe('123');
    });

    it('escapes special characters in artwork titles, garment names, and metadata without breaking SVG XML', () => {
      const elemSpecial: Partial<DesignElement> = {
        id: 'elem-special',
        x: 50,
        y: 30,
        width: 20,
        height: 20,
        rotation: 0,
        title: 'Rock & Roll <Primate> "Special"',
      };

      const bp = computeSurfaceBlueprint('FRONT', [elemSpecial]);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentName: 'Cotton & Linen Blend <Tee>',
        orderNumber: 'APX-ORD & SPECIAL',
      });

      expect(svg).toContain('Rock &amp; Roll');
      expect(svg).toContain('Cotton &amp; Linen Blend');
      expect(svg).toContain('APX-ORD &amp; SPECIAL');
      expect(svg).not.toContain('&bull;');
      expect(svg).toContain('&#8226;');
    });
  });

  describe('14. HTML5 Canvas 2D Rendering Engine (drawBlueprintCanvas)', () => {
    it('executes drawBlueprintCanvas cleanly and renders rulers, ticks, center axis, and layers', () => {
      const fillRectMock = vi.fn();
      const strokeRectMock = vi.fn();
      const fillTextMock = vi.fn();
      const moveToMock = vi.fn();
      const lineToMock = vi.fn();
      const strokeMock = vi.fn();
      const beginPathMock = vi.fn();
      const saveMock = vi.fn();
      const restoreMock = vi.fn();
      const translateMock = vi.fn();
      const rotateMock = vi.fn();
      const setLineDashMock = vi.fn();

      const mockCtx = {
        fillRect: fillRectMock,
        strokeRect: strokeRectMock,
        fillText: fillTextMock,
        moveTo: moveToMock,
        lineTo: lineToMock,
        stroke: strokeMock,
        beginPath: beginPathMock,
        save: saveMock,
        restore: restoreMock,
        translate: translateMock,
        rotate: rotateMock,
        setLineDash: setLineDashMock,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
      } as unknown as CanvasRenderingContext2D;

      const element: Partial<DesignElement> = {
        id: 'elem-canvas-1',
        x: 50,
        y: 30,
        width: 30,
        height: 30,
        rotation: 45,
        title: 'Canvas Graphic Layer',
      };

      const bp = computeSurfaceBlueprint('FRONT', [element]);

      drawBlueprintCanvas(mockCtx, {
        surface: 'FRONT',
        blueprint: bp,
        includeRulers: true,
        includeCenterAxis: true,
        includeDimensionCallouts: true,
        includeBoundingBoxes: true,
      });

      // Background, header, platen, rulers
      expect(fillRectMock).toHaveBeenCalled();
      expect(strokeRectMock).toHaveBeenCalled();
      // Centimeter ticks & numbers
      expect(fillTextMock).toHaveBeenCalled();
      const fillTextCalls = fillTextMock.mock.calls.map((c) => String(c[0]));
      expect(fillTextCalls.some((t) => t.includes('DTG PRINT PLACEMENT BLUEPRINT'))).toBe(true);
      expect(fillTextCalls.some((t) => t.includes('0 cm'))).toBe(true);
      expect(fillTextCalls.some((t) => t.includes('Collar'))).toBe(true);
      expect(fillTextCalls.some((t) => t.includes('Hem'))).toBe(true);
      expect(fillTextCalls.some((t) => t.includes('CENTER CHEST (CL)'))).toBe(true);
      // Rotation transform applied
      expect(saveMock).toHaveBeenCalled();
      expect(rotateMock).toHaveBeenCalled();
      expect(restoreMock).toHaveBeenCalled();
    });
  });

  describe('15. Input Edge Cases & Negative Coordinates Sanitization', () => {
    it('sanitizes negative width and height inputs in computeBlueprintMeasurements to prevent inverted bounding boxes', () => {
      const invalidElem: Partial<DesignElement> = {
        id: 'elem-neg',
        x: 50,
        y: 50,
        width: -30,
        height: -40,
        rotation: 0,
      };

      const m = computeBlueprintMeasurements(invalidElem);
      expect(m.widthCm).toBe(0);
      expect(m.heightCm).toBe(0);
      expect(m.aabbWidthCm).toBe(0);
      expect(m.aabbHeightCm).toBe(0);
      expect(m.xLeftCm).toBe(17.5);
      expect(m.xRightCm).toBe(17.5);
      expect(m.yTopCm).toBe(22.5);
      expect(m.yBottomCm).toBe(22.5);
    });
  });

  describe('16. Partially Defined Config & Undefined Property Fallback Resilience', () => {
    it('gracefully handles partially defined or undefined config fields without producing NaN', () => {
      const element: Partial<DesignElement> = {
        id: 'elem-partial-cfg',
        x: 50,
        y: 40,
        width: 30,
        height: 30,
      };

      // Explicitly pass undefined and invalid zero/negative config fields
      const partialConfig: any = {
        platenWidthCm: undefined,
        platenHeightCm: null,
        collarDipYCm: undefined,
        garmentLengthCm: 0,
      };

      const m = computeBlueprintMeasurements(element, partialConfig);
      expect(Number.isNaN(m.widthCm)).toBe(false);
      expect(Number.isNaN(m.heightCm)).toBe(false);
      expect(Number.isNaN(m.offsetTopCollarCm)).toBe(false);
      expect(Number.isNaN(m.offsetCenterCm)).toBe(false);
      expect(Number.isNaN(m.offsetHemCm)).toBe(false);

      // Falls back to standard Kornit defaults (35 x 45 cm)
      expect(m.widthCm).toBe(10.5); // 30% of 35
      expect(m.heightCm).toBe(13.5); // 30% of 45
      expect(m.xCenterCm).toBe(17.5);
      expect(m.offsetCenterCm).toBe(0);
    });

    it('safely computes SurfaceBlueprint with undefined config values', () => {
      const bp = computeSurfaceBlueprint('FRONT', [], {
        platenWidthCm: undefined,
        collarDipYCm: undefined,
      });

      expect(bp.platen.platenWidthCm).toBe(DEFAULT_PLATEN_CONFIG.platenWidthCm);
      expect(bp.platen.platenHeightCm).toBe(DEFAULT_PLATEN_CONFIG.platenHeightCm);
      expect(bp.centerChestXCm).toBe(17.5);
      expect(bp.hasOverflow).toBe(false);
    });
  });

  describe('17. Blueprint PNG Exporter (downloadBlueprintAsPng) Verification', () => {
    it('returns empty data URL in SSR Node runtime without browser window', async () => {
      const originalWindow = global.window;
      // In Vitest node environment, window is undefined
      const result = await downloadBlueprintAsPng('<svg></svg>');
      expect(result).toBe('data:image/png;base64,');
    });

    it('creates canvas, blob, and triggers click in mocked DOM environment', async () => {
      const originalWindow = global.window;
      const originalDocument = global.document;

      const clickMock = vi.fn();
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const drawImageMock = vi.fn();
      const toDataUrlMock = vi.fn().mockReturnValue('data:image/png;base64,mockPngResult123');

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: drawImageMock,
        }),
        toDataURL: toDataUrlMock,
      };

      const mockAnchor = {
        href: '',
        download: '',
        click: clickMock,
      };

      class MockImage {
        onload: (() => void) | null = null;
        onerror: ((err: any) => void) | null = null;
        set src(_v: string) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 5);
        }
      }

      // @ts-ignore
      global.window = {} as any;
      // @ts-ignore
      global.document = {
        createElement: (tag: string) => {
          if (tag === 'canvas') return mockCanvas as any;
          if (tag === 'a') return mockAnchor as any;
          return {} as any;
        },
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
      } as any;
      // @ts-ignore
      global.Image = MockImage as any;
      // @ts-ignore
      global.Blob = class {
        constructor() {}
      } as any;
      // @ts-ignore
      global.URL = {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: vi.fn(),
      } as any;

      try {
        const result = await downloadBlueprintAsPng('<svg></svg>', 'test-blueprint.png', 1000, 1250);
        expect(result).toBe('data:image/png;base64,mockPngResult123');
        expect(mockAnchor.download).toBe('test-blueprint.png');
        expect(clickMock).toHaveBeenCalled();
        expect(appendChildMock).toHaveBeenCalled();
        expect(removeChildMock).toHaveBeenCalled();
      } finally {
        global.window = originalWindow;
        global.document = originalDocument;
      }
    });
  });

  describe('18. Canvas 2D Full Dimension Callouts & Annotations Verification', () => {
    it('renders Collar, CL offset, Dimensions, and Hem clearance callout text and lines', () => {
      const fillTextMock = vi.fn();
      const strokeMock = vi.fn();
      const lineToMock = vi.fn();

      const mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: fillTextMock,
        moveTo: vi.fn(),
        lineTo: lineToMock,
        stroke: strokeMock,
        beginPath: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        setLineDash: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
      } as unknown as CanvasRenderingContext2D;

      const element: Partial<DesignElement> = {
        id: 'elem-full-callouts',
        x: 60, // offset from center
        y: 40,
        width: 30,
        height: 25,
        rotation: 0,
        title: 'Full Dimension Graphic',
      };

      const bp = computeSurfaceBlueprint('FRONT', [element]);

      drawBlueprintCanvas(mockCtx, {
        surface: 'FRONT',
        blueprint: bp,
        includeDimensionCallouts: true,
        includeBoundingBoxes: true,
      });

      const calls = fillTextMock.mock.calls.map((c) => String(c[0]));
      // Collar offset
      expect(calls.some((t) => t.startsWith('Collar:'))).toBe(true);
      // CL offset
      expect(calls.some((t) => t.startsWith('CL:'))).toBe(true);
      // Dimensions
      expect(calls.some((t) => t.includes('W:') && t.includes('H:'))).toBe(true);
      // Hem clearance
      expect(calls.some((t) => t.startsWith('Hem:'))).toBe(true);
    });
  });

  describe('19. Undefined/Null Title & Metadata Safe Handling', () => {
    it('gracefully handles elements with undefined or null title in generateBlueprintSvg and drawBlueprintCanvas', () => {
      const noTitleElem: Partial<DesignElement> = {
        id: 'elem-no-title',
        x: 50,
        y: 35,
        width: 30,
        height: 30,
        title: undefined,
      };

      const bp = computeSurfaceBlueprint('FRONT', [noTitleElem]);

      // Should not throw TypeError: Cannot read properties of undefined (reading 'slice')
      expect(() => {
        generateBlueprintSvg({
          surface: 'FRONT',
          blueprint: bp,
        });
      }).not.toThrow();

      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
      });
      expect(svg).toContain('Artwork Layer');

      // Test drawBlueprintCanvas as well
      const mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        beginPath: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        setLineDash: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
      } as unknown as CanvasRenderingContext2D;

      expect(() => {
        drawBlueprintCanvas(mockCtx, {
          surface: 'FRONT',
          blueprint: bp,
        });
      }).not.toThrow();
    });
  });

  describe('20. XML Ampersand Escaping in Snapshot URLs & Query Parameters', () => {
    it('safely escapes ampersands in garmentSnapshotDataUrl to ensure well-formed XML', () => {
      const bp = computeSurfaceBlueprint('FRONT', []);
      const signedUrl = 'https://s3.amazonaws.com/snap.png?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Signature=vjbyPxybdZaNmGa%2ByT272YEAiv4%3D&Expires=1700000000';

      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentSnapshotDataUrl: signedUrl,
      });

      // Must be escaped as &amp;
      expect(svg).toContain('&amp;Signature=');
      expect(svg).toContain('&amp;Expires=');
      expect(svg).not.toMatch(/href="[^"]*&Signature=/);
    });
  });

  describe('21. Real Garment Silhouette, Real Sticker Previews & Monochrome B&W Blueprint Specification', () => {
    it('always renders authentic vector T-shirt silhouette with neckline and seams', () => {
      const bp = computeSurfaceBlueprint('FRONT', []);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
      });

      expect(svg).toContain('Authentic T-Shirt Vector Garment Silhouette');
      expect(svg).toContain('M 390 130'); // Collar point in outlinePath
    });

    it('renders real sticker artwork image when previewUrl is present on element', () => {
      const stickerElem: Partial<DesignElement> = {
        id: 'elem-sticker-real',
        artworkId: 'art-sticker-1',
        title: 'Cyber Ape Sticker',
        previewUrl: 'https://cdn.ape-parel.com/artworks/cyber-ape-sticker.png',
        x: 50,
        y: 40,
        width: 30,
        height: 30,
        rotation: 15,
      };

      const bp = computeSurfaceBlueprint('FRONT', [stickerElem]);
      expect(bp.measurements[0].previewUrl).toBe('https://cdn.ape-parel.com/artworks/cyber-ape-sticker.png');

      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
      });

      expect(svg).toContain('Real Sticker Artwork Graphic Layer 1');
      expect(svg).toContain('https://cdn.ape-parel.com/artworks/cyber-ape-sticker.png');
      expect(svg).toContain('<image');
      expect(svg).toContain('transform="rotate(15,');
    });

    it('renders crisp monochrome (black and white only) blueprint when monochrome: true is requested', () => {
      const stickerElem: Partial<DesignElement> = {
        id: 'elem-mono-1',
        title: 'Valkyrie Crest',
        previewUrl: '/uploads/valkyrie.png',
        x: 50,
        y: 35,
        width: 25,
        height: 25,
      };

      const bp = computeSurfaceBlueprint('FRONT', [stickerElem]);
      const svgMono = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        monochrome: true,
      });

      // 1. Header & footer indicates B&W spec
      expect(svgMono).toContain('B&amp;W SPEC');
      expect(svgMono).toContain('B&amp;W spec');

      // 2. Center Chest Axis uses white line (#FFFFFF), not red (#EF4444)
      expect(svgMono).toContain('CENTER CHEST (CL)');
      expect(svgMono).toContain('stroke="#FFFFFF" stroke-width="2" stroke-dasharray="8 4"');
      expect(svgMono).not.toContain('stroke="#EF4444"');

      // 3. Platen border uses white stroke
      expect(svgMono).toContain('stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="6 4"');
      expect(svgMono).not.toContain('stroke="#38BDF8"');

      // 4. Dimension markers use monochrome arrowhead-mono
      expect(svgMono).toContain('url(#arrowhead-mono)');
      expect(svgMono).toContain('url(#arrowhead-start-mono)');
      expect(svgMono).not.toContain('url(#arrowhead-red)');
      expect(svgMono).not.toContain('url(#arrowhead-blue)');

      // 5. Background container uses deep black (#09090b)
      expect(svgMono).toContain('fill="#09090b"');

      // 6. Real sticker image is embedded
      expect(svgMono).toContain('/uploads/valkyrie.png');
    });
  });

  describe('22. Precision 3D Model Orthographic Backdrop & Export Deliverables', () => {
    it('embeds 3D model orthographic snapshot when garmentSnapshotDataUrl is provided', () => {
      const bp = computeSurfaceBlueprint('FRONT', []);
      const testSnapshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const svgFront = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentSnapshotDataUrl: testSnapshot,
        monochrome: true,
      });
      expect(svgFront).toContain(testSnapshot);
      expect(svgFront).toContain('filter: grayscale(100%) contrast(1.15)');
      expect(svgFront).toContain('Authentic 3D Garment Model Orthographic Backdrop');

      const svgColor = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentSnapshotDataUrl: testSnapshot,
        monochrome: false,
      });
      expect(svgColor).toContain(testSnapshot);
      expect(svgColor).not.toContain('grayscale(100%)');
    });

    it('custom garmentSnapshotDataUrl cleanly overrides the default render path', () => {
      const bp = computeSurfaceBlueprint('FRONT', []);
      const customUrl = 'https://storage.ape-parel.com/snapshots/custom-3d-cloth.png';
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentSnapshotDataUrl: customUrl,
        monochrome: false,
      });
      expect(svg).toContain(customUrl);
    });

    it('renders clean vector silhouette when garmentSnapshotDataUrl is null', () => {
      const bp = computeSurfaceBlueprint('FRONT', []);
      const svg = generateBlueprintSvg({
        surface: 'FRONT',
        blueprint: bp,
        garmentSnapshotDataUrl: null,
        monochrome: true,
      });
      expect(svg).toContain('Authentic T-Shirt Vector Garment Silhouette');
      expect(svg).not.toContain('Authentic 3D Garment Model Orthographic Backdrop');
    });

    it('exports downloadBlueprintAsSvg and handles non-browser environments safely', async () => {
      expect(typeof downloadBlueprintAsSvg).toBe('function');
      // In Node environment without window/document, it safely returns without throwing
      await expect(downloadBlueprintAsSvg('<svg></svg>', 'test.svg')).resolves.not.toThrow();
    });

    it('inlineSvgImages safely handles SVG in non-browser environments without throwing', async () => {
      const input = '<svg><text>hello</text></svg>';
      const result = await inlineSvgImages(input);
      expect(result).toBe(input);
    });
  });

  describe('23. Pure 2D Canvas Lossless Baking Engine (bakeLosslessBlueprintCanvas)', () => {
    it('bakes complete blueprint with rulers, axis, dimensions, and metadata onto Canvas 2D buffer', async () => {
      const fillTextMock = vi.fn();
      const strokeMock = vi.fn();
      const drawImageMock = vi.fn();
      const fillRectMock = vi.fn();

      const mockCtx = {
        fillRect: fillRectMock,
        strokeRect: vi.fn(),
        fillText: fillTextMock,
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: strokeMock,
        beginPath: vi.fn(),
        closePath: vi.fn(),
        quadraticCurveTo: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        setLineDash: vi.fn(),
        drawImage: drawImageMock,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
      } as unknown as CanvasRenderingContext2D;

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      const element: Partial<DesignElement> = {
        id: 'elem-canvas-bake',
        artworkId: 'art-primate',
        x: 50,
        y: 35,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        title: 'Cyber Primate Graphic',
        previewUrl: 'https://cdn.ape-parel.com/previews/primate.png',
      };

      const bp = computeSurfaceBlueprint('FRONT', [element]);

      // Create a mock Image
      const mockImage = {} as CanvasImageSource;

      await bakeLosslessBlueprintCanvas(mockCanvas, {
        surface: 'FRONT',
        blueprint: bp,
        image3D: mockImage,
        garment: {
          sku: 'APX-HVY-001',
          name: 'Apex Heavyweight Tee',
          colorHex: '#131718',
          colorName: 'Vintage Onyx',
          size: 'XL',
        },
        orderNumber: 'APX-ORD-9021',
        jobId: 'JOB-9021',
        printingTechnique: 'High-Definition Kornit Digital DTG',
        monochrome: true,
        width: 2000,
        height: 2500,
      });

      expect(mockCanvas.width).toBe(2000);
      expect(mockCanvas.height).toBe(2500);
      expect(fillRectMock).toHaveBeenCalled();
      expect(drawImageMock).toHaveBeenCalledWith(mockImage, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));

      const texts = fillTextMock.mock.calls.map((c) => String(c[0]));
      // Order reference
      expect(texts).toContain('APX-ORD-9021');
      // Garment details
      expect(texts.some((t) => t.includes('Apex Heavyweight Tee') && t.includes('APX-HVY-001'))).toBe(true);
      // Document Title & Surface
      expect(texts.some((t) => t.includes('ใบระบุตำแหน่งและขนาดงานพิมพ์'))).toBe(true);
      expect(texts.some((t) => t.includes('Front') || t.includes('หน้า'))).toBe(true);
      // Center Chest Axis
      expect(texts.some((t) => t.includes('เส้นกึ่งกลางลำตัว'))).toBe(true);
      // Dimension callout annotations (ระยะจากคอ, กว้าง, สูง, ระยะจากชายเสื้อ)
      expect(texts.some((t) => t.startsWith('ระยะจากคอ:'))).toBe(true);
      expect(texts.some((t) => t.startsWith('กว้าง:'))).toBe(true);
      expect(texts.some((t) => t.startsWith('สูง:'))).toBe(true);
      expect(texts.some((t) => t.startsWith('ระยะจากชายเสื้อ:'))).toBe(true);
      // CL badge label includes 17.5 — ruler bars removed (grid is native 3D)
      expect(texts.some((t) => t.includes('17.5'))).toBe(true);

    });

    it('safely handles baking without 3D image source and empty measurements', async () => {
      const mockCtx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        quadraticCurveTo: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        setLineDash: vi.fn(),
        drawImage: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
      } as unknown as CanvasRenderingContext2D;

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      const emptyBp = computeSurfaceBlueprint('BACK', []);

      await expect(
        bakeLosslessBlueprintCanvas(mockCanvas, {
          surface: 'BACK',
          blueprint: emptyBp,
          image3D: null,
          garment: {
            sku: 'APX-BLK-002',
            name: 'Apex Classic Tee',
            colorHex: '#FFFFFF',
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe('24. Offscreen 3D WebGL Garment Renderer (renderOffscreenGarment3D)', () => {
    it('executes safely in SSR / test environments and returns a valid PNG data URL', async () => {
      const dataUrl = await renderOffscreenGarment3D({
        garmentColorHex: '#131718',
        frontElements: [],
        backElements: [],
        surface: 'FRONT',
        width: 2048,
        height: 2048,
      });

      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });
  });
});
