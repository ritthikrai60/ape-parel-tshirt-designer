import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { createProceduralTShirtGeometry } from '@/lib/tshirtGeometry';
import { AUTHENTIC_COLORS } from '@/components/studio/DesignStudioClient';
import { bakeCompositeTexture, TextureBakeOptions } from '@/components/studio/textureSync';
import { calculateLivePricing } from '@/lib/pricing';
import { DesignElement } from '@/lib/types';

describe('Milestone 3: Studio Pipeline Test Suite', () => {
  describe('1. T-Shirt Mesh & UV Unwrapping Contract', () => {
    const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');

    it('generates a valid public/models/tshirt.obj file with correct structure', () => {
      expect(fs.existsSync(objPath)).toBe(true);
      const content = fs.readFileSync(objPath, 'utf8');
      expect(content.length).toBeGreaterThan(50000);

      const lines = content.split('\n');
      const vLines = lines.filter((l) => l.startsWith('v '));
      const vtLines = lines.filter((l) => l.startsWith('vt '));
      const vnLines = lines.filter((l) => l.startsWith('vn '));
      const fLines = lines.filter((l) => l.startsWith('f '));

      expect(vLines.length).toBeGreaterThan(1000);
      expect(vtLines.length).toBeGreaterThan(1000);
      expect(vnLines.length).toBeGreaterThan(1000);
      expect(fLines.length).toBeGreaterThan(2000);
    });

    it('enforces strict UV boundaries on public/models/tshirt.obj texture coordinates', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const vtLines = content.split('\n').filter((l) => l.startsWith('vt '));

      let frontUVCount = 0;
      let backUVCount = 0;
      let middleBufferCount = 0;

      for (const line of vtLines) {
        const parts = line.trim().split(/\s+/);
        const u = parseFloat(parts[1]);
        const v = parseFloat(parts[2]);

        expect(u).toBeGreaterThanOrEqual(0.0);
        expect(u).toBeLessThanOrEqual(1.0);
        expect(v).toBeGreaterThanOrEqual(0.0);
        expect(v).toBeLessThanOrEqual(1.0);

        if (u <= 0.46) {
          expect(u).toBeGreaterThanOrEqual(0.039);
          frontUVCount++;
        } else if (u >= 0.54) {
          expect(u).toBeLessThanOrEqual(0.961);
          backUVCount++;
        } else {
          middleBufferCount++;
        }
      }

      expect(frontUVCount).toBeGreaterThan(500);
      expect(backUVCount).toBeGreaterThan(500);
      // Zero cross-bleed margin between 0.46 and 0.54
      expect(middleBufferCount).toBe(0);
    });

    it('createProceduralTShirtGeometry() produces valid Three.js geometry with exact UV partitions', () => {
      const geom = createProceduralTShirtGeometry();
      expect(geom).toBeDefined();

      const posAttr = geom.getAttribute('position');
      const uvAttr = geom.getAttribute('uv');
      const normalAttr = geom.getAttribute('normal');
      const indexAttr = geom.getIndex();

      expect(posAttr).toBeDefined();
      expect(uvAttr).toBeDefined();
      expect(normalAttr).toBeDefined();
      expect(indexAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(1000);
      expect(indexAttr!.count).toBeGreaterThan(2000);

      let frontVertexCount = 0;
      let backVertexCount = 0;
      let bleedCount = 0;

      for (let i = 0; i < posAttr.count; i++) {
        const z = posAttr.getZ(i);
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);

        expect(u).toBeGreaterThanOrEqual(0.039);
        expect(u).toBeLessThanOrEqual(0.961);
        expect(v).toBeGreaterThanOrEqual(0.049);
        expect(v).toBeLessThanOrEqual(0.971);

        // Front torso check (z > 0.05)
        if (z > 0.05) {
          frontVertexCount++;
          if (u >= 0.5) bleedCount++;
          expect(u).toBeLessThan(0.5);
          expect(u).toBeGreaterThanOrEqual(0.039);
          expect(u).toBeLessThanOrEqual(0.461);
        }

        // Back torso check (z < -0.05)
        if (z < -0.05) {
          backVertexCount++;
          if (u < 0.5) bleedCount++;
          expect(u).toBeGreaterThanOrEqual(0.5);
          expect(u).toBeGreaterThanOrEqual(0.539);
          expect(u).toBeLessThanOrEqual(0.961);
        }
      }

      expect(frontVertexCount).toBeGreaterThan(200);
      expect(backVertexCount).toBeGreaterThan(200);
      expect(bleedCount).toBe(0);
    });

    it('enforces horizontal anti-mirroring orientation on front and back surfaces', () => {
      const geom = createProceduralTShirtGeometry();
      const posAttr = geom.getAttribute('position');
      const uvAttr = geom.getAttribute('uv');

      let frontLeftU: number | null = null;
      let frontRightU: number | null = null;
      let backLeftU: number | null = null;
      let backRightU: number | null = null;

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const u = uvAttr.getX(i);

        // Sample near mid-chest level y around 0.0
        if (Math.abs(y) < 0.1) {
          if (z > 0.1) {
            // Front surface
            if (x < -0.3 && frontLeftU === null) frontLeftU = u;
            if (x > 0.3 && frontRightU === null) frontRightU = u;
          } else if (z < -0.1) {
            // Back surface (from behind, x > 0.3 is screen-left)
            if (x > 0.3 && backLeftU === null) backLeftU = u;
            if (x < -0.3 && backRightU === null) backRightU = u;
          }
        }
      }

      expect(frontLeftU).not.toBeNull();
      expect(frontRightU).not.toBeNull();
      expect(backLeftU).not.toBeNull();
      expect(backRightU).not.toBeNull();

      // On Front: screen-left (negative X) maps to smaller u
      expect(frontLeftU!).toBeLessThan(frontRightU!);

      // On Back: screen-left from behind (positive X) maps to smaller u (anti-mirroring)
      expect(backLeftU!).toBeLessThan(backRightU!);
    });
  });

  describe('2. Authentic Garment Color Palette Definitions', () => {
    it('defines exactly the 4 authentic streetwear colors', () => {
      expect(AUTHENTIC_COLORS.length).toBe(4);

      const colorMap = new Map(AUTHENTIC_COLORS.map((c) => [c.id, c.hex]));
      expect(colorMap.get('BLK')).toBe('#131718'); // Ink Black
      expect(colorMap.get('WHT')).toBe('#FFFFFF'); // Optic White
      expect(colorMap.get('BGE')).toBe('#F5F0E8'); // Paper Beige
      expect(colorMap.get('WRM')).toBe('#DABA98'); // Warm Kraft
    });

    it('provides accessible contrast text colors for all authentic garment colors', () => {
      for (const color of AUTHENTIC_COLORS) {
        expect(color.name).toBeTruthy();
        expect(color.hex.startsWith('#')).toBe(true);
        expect(color.textCol.startsWith('#')).toBe(true);
        if (color.hex === '#131718') {
          expect(color.textCol).toBe('#FFFFFF');
        } else {
          expect(color.textCol).toBe('#131718');
        }
      }
    });
  });

  describe('3. Texture Baking Coordinate Calculations & Aspect Ratios', () => {
    it('accurately converts front center percentages to dual-zone canvas coordinates', () => {
      const frontElement: DesignElement = {
        id: 'el-1',
        artworkId: 'art-1',
        licenseOptionId: 'lic-1',
        title: 'Front Center Print',
        previewUrl: 'https://example.com/art1.png',
        creatorName: 'Artist 1',
        creatorId: 'c-1',
        surface: 'FRONT',
        x: 50, // 50% = center of front half
        y: 40, // 40% = chest level
        width: 30, // 30% of surface width
        height: 30, // 30% of surface height
        rotation: 0,
        zIndex: 1,
        price: 40,
      };

      const surfaceOffsetX = 0; // Front surface offset
      const surfaceWidth = 512;
      const surfaceHeight = 1024;

      const centerX = surfaceOffsetX + (frontElement.x / 100) * surfaceWidth;
      const centerY = (frontElement.y / 100) * surfaceHeight;
      const w = (frontElement.width / 100) * surfaceWidth;
      const h = (frontElement.height / 100) * surfaceHeight;

      expect(centerX).toBe(256);
      expect(centerY).toBe(409.6);
      expect(w).toBe(153.6);
      expect(h).toBe(307.2);

      // Boundaries must strictly remain within left half [0, 512]
      expect(centerX - w / 2).toBeGreaterThanOrEqual(0);
      expect(centerX + w / 2).toBeLessThanOrEqual(512);
    });

    it('accurately converts back center percentages to dual-zone canvas coordinates', () => {
      const backElement: DesignElement = {
        id: 'el-2',
        artworkId: 'art-2',
        licenseOptionId: 'lic-2',
        title: 'Back Center Print',
        previewUrl: 'https://example.com/art2.png',
        creatorName: 'Artist 2',
        creatorId: 'c-2',
        surface: 'BACK',
        x: 50,
        y: 45,
        width: 35,
        height: 35,
        rotation: 15,
        zIndex: 2,
        price: 25,
      };

      const surfaceOffsetX = 512; // Back surface offset (right half)
      const surfaceWidth = 512;
      const surfaceHeight = 1024;

      const centerX = surfaceOffsetX + (backElement.x / 100) * surfaceWidth;
      const centerY = (backElement.y / 100) * surfaceHeight;
      const w = (backElement.width / 100) * surfaceWidth;
      const h = (backElement.height / 100) * surfaceHeight;

      expect(centerX).toBe(768);
      expect(centerY).toBe(460.8);
      expect(w).toBe(179.2);
      expect(h).toBe(358.4);

      // Boundaries must strictly remain within right half [512, 1024]
      expect(centerX - w / 2).toBeGreaterThanOrEqual(512);
      expect(centerX + w / 2).toBeLessThanOrEqual(1024);
    });

    it('preserves element aspect ratio under proportional scaling transformations', () => {
      const initialWidth = 40;
      const initialHeight = 30;
      const aspect = initialWidth / initialHeight;

      const newWidth = 60;
      const scaledHeight = Math.round(newWidth / aspect);

      expect(scaledHeight).toBe(45);
      expect(newWidth / scaledHeight).toBeCloseTo(aspect, 2);
    });

    it('executes bakeCompositeTexture() onto a canvas context with base color fill and zone rendering', () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      const options: TextureBakeOptions = {
        garmentColorHex: '#131718',
        frontElements: [],
        backElements: [],
        imageCache: new Map(),
      };

      bakeCompositeTexture(mockCanvas, options);

      expect(mockCanvas.width).toBe(1024);
      expect(mockCanvas.height).toBe(1024);
      expect(mockCtx.fillStyle).toBe('#131718');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
    });
  });

  describe('4. Authoritative Benchmark Pricing Integration (THB 410)', () => {
    let garmentApexId: string;
    let licDashApeId: string;
    let licCyberPrimateId: string;
    let licStaticGlitchId: string;
    let artDashApeId: string;
    let artCyberPrimateId: string;
    let artStaticGlitchId: string;

    beforeAll(async () => {
      const garment = await prisma.garmentProduct.findUnique({
        where: { sku: 'APX-HVY-001' },
      });
      if (!garment) throw new Error('Seeded garment APX-HVY-001 missing');
      garmentApexId = garment.id;

      const art1 = await prisma.artwork.findFirst({
        where: { title: { contains: 'Dash Ape Classic' } },
        include: { licenseOptions: true },
      });
      const art2 = await prisma.artwork.findFirst({
        where: { title: { contains: 'Cyber Primate' } },
        include: { licenseOptions: true },
      });
      const art3 = await prisma.artwork.findFirst({
        where: { title: { contains: 'Static Glitch' } },
        include: { licenseOptions: true },
      });

      if (!art1 || !art2 || !art3) throw new Error('Seeded artworks missing');

      artDashApeId = art1.id;
      artCyberPrimateId = art2.id;
      artStaticGlitchId = art3.id;

      licDashApeId = art1.licenseOptions.find((l) => l.price === 40)!.id;
      licCyberPrimateId = art2.licenseOptions.find((l) => l.price === 60)!.id;
      licStaticGlitchId = art3.licenseOptions.find((l) => l.price === 25)!.id;
    });

    it('matches the exact R2 benchmark: 1 surface DTG + APX-HVY-001 + 3 licenses = THB 410', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApexId,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: artDashApeId,
            licenseOptionId: licDashApeId, // ฿40
          },
          {
            artworkId: artCyberPrimateId,
            licenseOptionId: licCyberPrimateId, // ฿60
          },
          {
            artworkId: artStaticGlitchId,
            licenseOptionId: licStaticGlitchId, // ฿25
          },
        ],
        backArtworkLicenses: [],
      });

      expect(result.garmentCost).toBe(150);
      expect(result.printingCost).toBe(80); // 1 surface DTG = ฿80
      expect(result.packagingCost).toBe(15);
      expect(result.shippingCost).toBe(40);
      expect(result.licensingCost).toBe(125); // 40 + 60 + 25 = 125
      expect(result.totalAmount).toBe(410); // 150 + 80 + 15 + 40 + 125 = 410
    });

    it('calculates 2-surface printing correctly when licenses span front and back surfaces', async () => {
      const result = await calculateLivePricing({
        garmentProductId: garmentApexId,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: artDashApeId,
            licenseOptionId: licDashApeId, // ฿40
          },
          {
            artworkId: artCyberPrimateId,
            licenseOptionId: licCyberPrimateId, // ฿60
          },
        ],
        backArtworkLicenses: [
          {
            artworkId: artStaticGlitchId,
            licenseOptionId: licStaticGlitchId, // ฿25
          },
        ],
      });

      expect(result.garmentCost).toBe(150);
      expect(result.printingCost).toBe(160); // 2 surfaces * ฿80 = ฿160
      expect(result.packagingCost).toBe(15);
      expect(result.shippingCost).toBe(40);
      expect(result.licensingCost).toBe(125);
      expect(result.totalAmount).toBe(490); // 150 + 160 + 15 + 40 + 125 = 490
    });
  });
});
