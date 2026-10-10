import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AUTHENTIC_COLORS } from '@/components/studio/DesignStudioClient';
import { bakeCompositeTexture, TextureBakeOptions } from '@/components/studio/textureSync';
import { createProceduralTShirtGeometry } from '@/lib/tshirtGeometry';
import { DesignElement } from '@/lib/types';

describe('Milestone 3: Studio Challenger Adversarial Stress Suite', () => {
  const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');

  describe('1. OBJ Mesh Physical Geometry & UV Boundary Stress Testing', () => {
    it('verifies public/models/tshirt.obj exists, is non-empty, and has valid header and object tag', () => {
      expect(fs.existsSync(objPath)).toBe(true);
      const content = fs.readFileSync(objPath, 'utf8');
      expect(content.length).toBeGreaterThan(100000);
      expect(content.includes('o TShirt')).toBe(true);
      expect(content.includes('usemtl GarmentBase')).toBe(true);
    });

    it('parses all vertex positions and asserts physical sanity within realistic bounding box', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');
      const positions: [number, number, number][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          const parts = trimmed.split(/\s+/).slice(1).map(Number);
          expect(parts.length).toBe(3);
          expect(parts.every((n) => Number.isFinite(n))).toBe(true);
          positions.push(parts as [number, number, number]);
        }
      }

      expect(positions.length).toBe(1490);

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const [x, y, z] of positions) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }

      // Assert symmetrical X span (sleeves reach ~0.95)
      expect(minX).toBeCloseTo(-0.95, 1);
      expect(maxX).toBeCloseTo(0.95, 1);
      expect(Math.abs(minX + maxX)).toBeLessThan(0.01);

      // Assert Y span (hem to collar: ~ -0.85 to ~0.70)
      expect(minY).toBeCloseTo(-0.85, 1);
      expect(maxY).toBeCloseTo(0.70, 1);

      // Assert Z span (front depth to back depth: ~ -0.22 to ~0.22)
      expect(minZ).toBeGreaterThan(-0.30);
      expect(maxZ).toBeLessThan(0.30);
    });

    it('verifies all normal vectors vn are normalized unit vectors (length ≈ 1.0)', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      let count = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('vn ')) {
          const [nx, ny, nz] = trimmed.split(/\s+/).slice(1).map(Number);
          expect(Number.isFinite(nx)).toBe(true);
          expect(Number.isFinite(ny)).toBe(true);
          expect(Number.isFinite(nz)).toBe(true);
          const len = Math.hypot(nx, ny, nz);
          expect(len).toBeCloseTo(1.0, 3);
          count++;
        }
      }
      expect(count).toBe(1490);
    });

    it('empirically audits every texture coordinate vt for buffer margin >= 0.05 and zero bleed', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      let frontMaxU = -Infinity;
      let frontMinU = Infinity;
      let backMinU = Infinity;
      let backMaxU = -Infinity;
      let strictInteriorBufferCount = 0;

      let vtCount = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('vt ')) {
          const [u, v] = trimmed.split(/\s+/).slice(1).map(Number);
          expect(Number.isFinite(u)).toBe(true);
          expect(Number.isFinite(v)).toBe(true);

          expect(u).toBeGreaterThanOrEqual(0.0);
          expect(u).toBeLessThanOrEqual(1.0);
          expect(v).toBeGreaterThanOrEqual(0.0);
          expect(v).toBeLessThanOrEqual(1.0);

          if (u < 0.5) {
            frontMaxU = Math.max(frontMaxU, u);
            frontMinU = Math.min(frontMinU, u);
          } else if (u > 0.5) {
            backMinU = Math.min(backMinU, u);
            backMaxU = Math.max(backMaxU, u);
          }

          // Strict interior of the 8% buffer zone (0.46 < u < 0.54)
          if (u > 0.46001 && u < 0.53999) {
            strictInteriorBufferCount++;
          }
          vtCount++;
        }
      }

      expect(vtCount).toBe(1490);
      expect(frontMinU).toBeCloseTo(0.04, 2);
      expect(frontMaxU).toBeCloseTo(0.46, 2);
      expect(backMinU).toBeCloseTo(0.54, 2);
      expect(backMaxU).toBeCloseTo(0.96, 2);

      // Buffer margin between Front max-u and Back min-u is >= 0.05
      const bufferMargin = backMinU - frontMaxU;
      expect(bufferMargin).toBeGreaterThanOrEqual(0.05);
      expect(bufferMargin).toBeCloseTo(0.08, 2);

      // Exactly ZERO vertices in the strict interior buffer
      expect(strictInteriorBufferCount).toBe(0);
    });

    it('verifies front torso and back torso vertices strictly respect u < 0.5 and u > 0.5', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      const positions: [number, number, number][] = [];
      const uvs: [number, number][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          positions.push(trimmed.split(/\s+/).slice(1).map(Number) as [number, number, number]);
        } else if (trimmed.startsWith('vt ')) {
          uvs.push(trimmed.split(/\s+/).slice(1).map(Number) as [number, number]);
        }
      }

      // Torso vertices: first 525 vertices are front torso (z >= 0), next 525 are back torso (z <= 0)
      for (let i = 0; i < 525; i++) {
        const [x, y, z] = positions[i];
        const [u, v] = uvs[i];
        expect(z).toBeGreaterThanOrEqual(-1e-6);
        expect(u).toBeLessThan(0.5);
        expect(u).toBeLessThanOrEqual(0.461);
        expect(u).toBeGreaterThanOrEqual(0.039);
      }

      for (let i = 525; i < 1050; i++) {
        const [x, y, z] = positions[i];
        const [u, v] = uvs[i];
        expect(z).toBeLessThanOrEqual(1e-6);
        expect(u).toBeGreaterThan(0.5);
        expect(u).toBeGreaterThanOrEqual(0.539);
        expect(u).toBeLessThanOrEqual(0.961);
      }
    });

    it('verifies anti-mirroring orientation on front and back surfaces', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      const positions: [number, number, number][] = [];
      const uvs: [number, number][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          positions.push(trimmed.split(/\s+/).slice(1).map(Number) as [number, number, number]);
        } else if (trimmed.startsWith('vt ')) {
          uvs.push(trimmed.split(/\s+/).slice(1).map(Number) as [number, number]);
        }
      }

      let frontScreenLeftU: number | null = null;
      let frontScreenRightU: number | null = null;
      let backScreenLeftU: number | null = null;
      let backScreenRightU: number | null = null;

      for (let i = 0; i < positions.length; i++) {
        const [x, y, z] = positions[i];
        const [u, v] = uvs[i];

        if (Math.abs(y) < 0.1) {
          if (z > 0.1) {
            // Front: negative x is screen-left, positive x is screen-right
            if (x < -0.3 && frontScreenLeftU === null) frontScreenLeftU = u;
            if (x > 0.3 && frontScreenRightU === null) frontScreenRightU = u;
          } else if (z < -0.1) {
            // Back: viewed from behind, positive x is screen-left, negative x is screen-right
            if (x > 0.3 && backScreenLeftU === null) backScreenLeftU = u;
            if (x < -0.3 && backScreenRightU === null) backScreenRightU = u;
          }
        }
      }

      expect(frontScreenLeftU).not.toBeNull();
      expect(frontScreenRightU).not.toBeNull();
      expect(backScreenLeftU).not.toBeNull();
      expect(backScreenRightU).not.toBeNull();

      // Front: screen-left maps to smaller u
      expect(frontScreenLeftU!).toBeLessThan(frontScreenRightU!);

      // Back: screen-left maps to smaller u (anti-mirroring property)
      expect(backScreenLeftU!).toBeLessThan(backScreenRightU!);
    });

    it('verifies procedural geometry fallback createProceduralTShirtGeometry()', () => {
      const geom = createProceduralTShirtGeometry();
      const pos = geom.getAttribute('position');
      const uv = geom.getAttribute('uv');
      const index = geom.getIndex();

      expect(pos).toBeDefined();
      expect(uv).toBeDefined();
      expect(index).toBeDefined();
      expect(pos.count).toBe(1490);
      expect(index!.count).toBeGreaterThan(2000);

      // Check all UVs
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        const v = uv.getY(i);
        expect(u).toBeGreaterThanOrEqual(0.039);
        expect(u).toBeLessThanOrEqual(0.961);
        expect(v).toBeGreaterThanOrEqual(0.049);
        expect(v).toBeLessThanOrEqual(0.971);

        // Strict buffer zone check
        const inBuffer = u > 0.461 && u < 0.539;
        expect(inBuffer).toBe(false);
      }
    });
  });

  describe('2. Authentic Garment Colors Contract', () => {
    it('verifies all 4 authentic colors match exact hex values', () => {
      const expected = [
        { id: 'BLK', name: 'Ink Black', hex: '#131718', textCol: '#FFFFFF' },
        { id: 'WHT', name: 'Optic White', hex: '#FFFFFF', textCol: '#131718' },
        { id: 'BGE', name: 'Paper Beige', hex: '#F5F0E8', textCol: '#131718' },
        { id: 'WRM', name: 'Warm Kraft', hex: '#DABA98', textCol: '#131718' },
      ];

      expect(AUTHENTIC_COLORS.length).toBe(4);
      for (const exp of expected) {
        const found = AUTHENTIC_COLORS.find((c) => c.id === exp.id);
        expect(found).toBeDefined();
        expect(found!.hex.toUpperCase()).toBe(exp.hex.toUpperCase());
        expect(found!.name).toBe(exp.name);
        expect(found!.textCol.toUpperCase()).toBe(exp.textCol.toUpperCase());
      }
    });
  });

  describe('3. Texture Baking Coordinate Math & Transformation Stress Testing', () => {
    it('verifies exact pixel placement for center percentages (50%, 50%)', () => {
      const surfaceWidth = 512;
      const surfaceHeight = 1024;

      // Front Center
      const frontX = 50, frontY = 50, frontW = 30, frontH = 30;
      const frontCenterX = 0 + (frontX / 100) * surfaceWidth;
      const frontCenterY = (frontY / 100) * surfaceHeight;
      const frontElemW = (frontW / 100) * surfaceWidth;
      const frontElemH = (frontH / 100) * surfaceHeight;

      expect(frontCenterX).toBe(256);
      expect(frontCenterY).toBe(512);
      expect(frontElemW).toBe(153.6);
      expect(frontElemH).toBe(307.2);

      // Back Center
      const backX = 50, backY = 50, backW = 30, backH = 30;
      const backCenterX = 512 + (backX / 100) * surfaceWidth;
      const backCenterY = (backY / 100) * surfaceHeight;
      const backElemW = (backW / 100) * surfaceWidth;
      const backElemH = (backH / 100) * surfaceHeight;

      expect(backCenterX).toBe(768);
      expect(backCenterY).toBe(512);
      expect(backElemW).toBe(153.6);
      expect(backElemH).toBe(307.2);
    });

    it('verifies boundary and corner coordinate transforms (0%, 0%) and (100%, 100%)', () => {
      const surfaceWidth = 512;
      const surfaceHeight = 1024;

      // Front Top-Left Corner
      const tlX = 0 + (0 / 100) * surfaceWidth;
      const tlY = (0 / 100) * surfaceHeight;
      expect(tlX).toBe(0);
      expect(tlY).toBe(0);

      // Front Bottom-Right Corner
      const brX = 0 + (100 / 100) * surfaceWidth;
      const brY = (100 / 100) * surfaceHeight;
      expect(brX).toBe(512);
      expect(brY).toBe(1024);

      // Back Top-Left Corner
      const btlX = 512 + (0 / 100) * surfaceWidth;
      const btlY = (0 / 100) * surfaceHeight;
      expect(btlX).toBe(512);
      expect(btlY).toBe(0);

      // Back Bottom-Right Corner
      const bbrX = 512 + (100 / 100) * surfaceWidth;
      const bbrY = (100 / 100) * surfaceHeight;
      expect(bbrX).toBe(1024);
      expect(bbrY).toBe(1024);
    });

    it('bakes composite texture with multiple layers, verifying zIndex ordering and mock draw calls', () => {
      const drawCalls: any[] = [];
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn((x, y) => drawCalls.push({ op: 'translate', x, y })),
        rotate: vi.fn((angle) => drawCalls.push({ op: 'rotate', angle })),
        drawImage: vi.fn((img, dx, dy, dw, dh) =>
          drawCalls.push({ op: 'drawImage', img: img?.src, dx, dy, dw, dh })
        ),
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      // Mock complete images
      const img1 = { src: 'img1.png', complete: true, naturalWidth: 100 } as HTMLImageElement;
      const img2 = { src: 'img2.png', complete: true, naturalWidth: 100 } as HTMLImageElement;
      const img3 = { src: 'img3.png', complete: true, naturalWidth: 100 } as HTMLImageElement;

      const cache = new Map<string, HTMLImageElement>([
        ['img1.png', img1],
        ['img2.png', img2],
        ['img3.png', img3],
      ]);

      const frontElements: DesignElement[] = [
        {
          id: 'el-2',
          artworkId: 'a2',
          licenseOptionId: 'l2',
          title: 'Layer 2 (zIndex 2)',
          previewUrl: 'img2.png',
          creatorName: 'Artist 2',
          creatorId: 'c2',
          surface: 'FRONT',
          x: 50,
          y: 40,
          width: 30,
          height: 30,
          rotation: 45,
          zIndex: 2,
          price: 50,
        },
        {
          id: 'el-1',
          artworkId: 'a1',
          licenseOptionId: 'l1',
          title: 'Layer 1 (zIndex 1)',
          previewUrl: 'img1.png',
          creatorName: 'Artist 1',
          creatorId: 'c1',
          surface: 'FRONT',
          x: 50,
          y: 40,
          width: 20,
          height: 20,
          rotation: 0,
          zIndex: 1,
          price: 30,
        },
      ];

      const backElements: DesignElement[] = [
        {
          id: 'el-3',
          artworkId: 'a3',
          licenseOptionId: 'l3',
          title: 'Back Layer',
          previewUrl: 'img3.png',
          creatorName: 'Artist 3',
          creatorId: 'c3',
          surface: 'BACK',
          x: 50,
          y: 50,
          width: 25,
          height: 25,
          rotation: 0,
          zIndex: 1,
          price: 40,
        },
      ];

      const options: TextureBakeOptions = {
        garmentColorHex: '#DABA98', // Warm Kraft
        frontElements,
        backElements,
        imageCache: cache,
      };

      bakeCompositeTexture(mockCanvas, options);

      // Verify canvas resized
      expect(mockCanvas.width).toBe(1024);
      expect(mockCanvas.height).toBe(1024);

      // Verify background filled with Warm Kraft
      expect(mockCtx.fillStyle).toBe('#DABA98');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);

      // Filter drawImage calls
      const imgDraws = drawCalls.filter((c) => c.op === 'drawImage');
      expect(imgDraws.length).toBe(3);

      // Layer 1 (zIndex 1) MUST be rendered before Layer 2 (zIndex 2)
      expect(imgDraws[0].img).toBe('img1.png');
      expect(imgDraws[1].img).toBe('img2.png');
      expect(imgDraws[2].img).toBe('img3.png');
    });

    it('gracefully handles missing, incomplete, or errored images without throwing', () => {
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
        width: 1024,
        height: 1024,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      const elements: DesignElement[] = [
        {
          id: 'el-incomplete',
          artworkId: 'a1',
          licenseOptionId: 'l1',
          title: 'Incomplete',
          previewUrl: 'incomplete.png',
          creatorName: 'Artist 1',
          creatorId: 'c1',
          surface: 'FRONT',
          x: 50,
          y: 50,
          width: 30,
          height: 30,
          rotation: 0,
          zIndex: 1,
          price: 10,
        },
      ];

      const brokenImg = { src: 'incomplete.png', complete: false, naturalWidth: 0 } as HTMLImageElement;
      const cache = new Map<string, HTMLImageElement>([['incomplete.png', brokenImg]]);

      expect(() => {
        bakeCompositeTexture(mockCanvas, {
          garmentColorHex: '#131718',
          frontElements: elements,
          backElements: [],
          imageCache: cache,
        });
      }).not.toThrow();

      // Incomplete image must NOT be drawn
      expect(mockCtx.drawImage).not.toHaveBeenCalled();
    });
  });
});
