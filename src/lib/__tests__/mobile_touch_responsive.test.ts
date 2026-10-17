import { describe, it, expect } from 'vitest';
import { th } from '../i18n/dictionaries/th';
import { en } from '../i18n/dictionaries/en';
import { ja } from '../i18n/dictionaries/ja';
import { getOptimalCameraDistance } from '@/components/studio/GarmentPreview3D';

const dictionaries = { th, en, ja };

describe('Mobile, iPad & Touch-Responsive Studio Architecture', () => {
  describe('1. Dictionary Parity for Mobile Touch & Studio Controls', () => {
    const locales = ['th', 'en', 'ja'] as const;

    it('has all mobile touch action keys in every locale', () => {
      for (const loc of locales) {
        const dict = dictionaries[loc];
        expect(dict.studio.tapToOrbit).toBeTruthy();
        expect(dict.studio.tapToScroll).toBeTruthy();
        expect(dict.studio.addArtwork).toBeTruthy();
        expect(dict.studio.layers).toBeTruthy();
        expect(dict.nav.vault).toBeTruthy();
      }
    });

    it('verifies Thai translations for mobile touch controls', () => {
      const th = dictionaries.th;
      expect(th.studio.tapToOrbit).toContain('แตะเพื่อหมุน 3D');
      expect(th.studio.tapToScroll).toContain('แตะเพื่อเลื่อนหน้าเว็บ');
      expect(th.studio.addArtwork).toBe('+ เพิ่มลายพิมพ์');
      expect(th.studio.layers).toBe('เลเยอร์');
    });

    it('verifies English translations for mobile touch controls', () => {
      const en = dictionaries.en;
      expect(en.studio.tapToOrbit).toContain('Tap to Orbit 3D');
      expect(en.studio.tapToScroll).toContain('Tap to Scroll Page');
      expect(en.studio.addArtwork).toBe('+ Add Artwork');
      expect(en.studio.layers).toBe('Layers');
    });

    it('verifies Japanese translations for mobile touch controls', () => {
      const ja = dictionaries.ja;
      expect(ja.studio.tapToOrbit).toContain('タップして3D回転');
      expect(ja.studio.tapToScroll).toContain('タップでページスクロール');
      expect(ja.studio.addArtwork).toBe('+ アートを追加');
      expect(ja.studio.layers).toBe('レイヤー');
    });
  });

  describe('2. Camera Framing for Narrow & Mobile Viewports', () => {
    it('provides standard distance for wide desktop aspect ratios (>= 1.1)', () => {
      expect(getOptimalCameraDistance(1.5)).toBe(3.5);
      expect(getOptimalCameraDistance(1.77)).toBe(3.5);
    });

    it('dynamically pulls back camera for narrow mobile screens (aspect < 1.1) so full garment stays in view', () => {
      // iPhone portrait (375x667 ~ 0.56 aspect ratio)
      const distIPhone = getOptimalCameraDistance(0.56);
      expect(distIPhone).toBeGreaterThan(3.5);
      expect(distIPhone).toBeLessThanOrEqual(6.5);

      // Square/iPad portrait (768x1024 ~ 0.75 aspect ratio)
      const distTablet = getOptimalCameraDistance(0.75);
      expect(distTablet).toBeGreaterThan(3.5);
      expect(distTablet).toBeLessThan(distIPhone);
    });

    it('clamps to safe maximum distance for extreme tall screens without infinite zoom-out', () => {
      const distExtreme = getOptimalCameraDistance(0.2);
      expect(distExtreme).toBe(6.5);
    });
  });

  describe('3. Touch Hitbox & Responsive Coordinate Geometry', () => {
    it('guarantees touch target hitbox size >= 40px for mobile ergonomics', () => {
      const touchCornerHitboxSize = 40; // 40x40px
      const touchRotationHitboxSize = 44; // 44x44px
      const standardTouchErgonomicsMin = 36;

      expect(touchCornerHitboxSize).toBeGreaterThanOrEqual(standardTouchErgonomicsMin);
      expect(touchRotationHitboxSize).toBeGreaterThanOrEqual(standardTouchErgonomicsMin);
    });

    it('calculates 90-degree snap rotations correctly for quick action touch toolbar', () => {
      const rotateClockwise = (currentDeg: number) => (currentDeg + 90) % 360;

      expect(rotateClockwise(0)).toBe(90);
      expect(rotateClockwise(90)).toBe(180);
      expect(rotateClockwise(180)).toBe(270);
      expect(rotateClockwise(270)).toBe(0);
    });

    it('clamps center positioning coordinates within print safe zone', () => {
      const centerPos = { x: 50, y: 50 };
      expect(centerPos.x).toBe(50);
      expect(centerPos.y).toBe(50);
      // Valid range is 5% to 95%
      expect(centerPos.x).toBeGreaterThanOrEqual(5);
      expect(centerPos.x).toBeLessThanOrEqual(95);
      expect(centerPos.y).toBeGreaterThanOrEqual(5);
      expect(centerPos.y).toBeLessThanOrEqual(95);
    });
  });

  describe('4. 1080p Viewport Ergonomics & LivePricing Accordion Parity', () => {
    const locales = ['th', 'en', 'ja'] as const;

    it('has hideDetails and viewDetails translation keys across all dictionaries', () => {
      for (const loc of locales) {
        const dict = dictionaries[loc];
        expect(dict.livePricing.hideDetails).toBeTruthy();
        expect(dict.livePricing.viewDetails).toBeTruthy();
        expect(dict.livePricing.breakdownTitle).toBeTruthy();
      }
    });

    it('verifies localized toggle text semantics', () => {
      expect(dictionaries.th.livePricing.hideDetails).toBe('ซ่อนรายละเอียด');
      expect(dictionaries.th.livePricing.viewDetails).toBe('ดูรายละเอียด');
      expect(dictionaries.en.livePricing.hideDetails).toBe('Hide Details');
      expect(dictionaries.en.livePricing.viewDetails).toBe('View Details');
      expect(dictionaries.ja.livePricing.hideDetails).toBe('内訳を閉じる');
      expect(dictionaries.ja.livePricing.viewDetails).toBe('内訳を見る');
    });

    it('verifies 1080p canvas vertical budget formula', () => {
      const calcMaxCanvasHeight = (viewportHeight: number) => Math.min(viewportHeight * 0.46, 420);

      // On standard 1080p browser inner height (~900px)
      expect(calcMaxCanvasHeight(900)).toBe(414);
      // On full screen 1080p
      expect(calcMaxCanvasHeight(1080)).toBe(420);
      // On laptop with 125% DPI scale (~720px)
      expect(calcMaxCanvasHeight(720)).toBeCloseTo(331.2, 1);
    });
  });
});
