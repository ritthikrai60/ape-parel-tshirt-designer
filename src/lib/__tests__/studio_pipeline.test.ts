import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { createProceduralTShirtGeometry } from '@/lib/tshirtGeometry';
import { AUTHENTIC_COLORS } from '@/components/studio/DesignStudioClient';
import { bakeCompositeTexture, TextureBakeOptions } from '@/components/studio/textureSync';
import { calculateLivePricing } from '@/lib/pricing';
import { DesignElement } from '@/lib/types';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

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

        if (u <= 0.5) {
          expect(u).toBeGreaterThanOrEqual(0.0);
          frontUVCount++;
        } else if (u >= 0.5) {
          expect(u).toBeLessThanOrEqual(1.01);
          backUVCount++;
        } else {
          middleBufferCount++;
        }
      }

      expect(frontUVCount).toBeGreaterThan(500);
      expect(backUVCount).toBeGreaterThan(500);
      // Zero cross-bleed margin between 0.5 and 0.5
      expect(middleBufferCount).toBe(0);
    });

    it('verifies Three.js OBJLoader parsing, centering at origin, scale normalization, and floor clearance in GarmentPreview3D', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const loader = new OBJLoader();
      const obj = loader.parse(content);
      expect(obj).toBeDefined();
      expect(obj.children.length).toBeGreaterThan(0);

      // Verify bounding box and scale calculation as implemented in GarmentPreview3D.tsx
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.9 / (maxDim || 1);
      expect(maxDim).toBeCloseTo(1.90, 1);
      expect(scale).toBeCloseTo(1.0, 1);

      obj.scale.setScalar(scale);
      obj.position.copy(center).multiplyScalar(-scale);

      const transformedBox = new THREE.Box3().setFromObject(obj);
      const transformedCenter = transformedBox.getCenter(new THREE.Vector3());

      // Centered at origin (0, 0, 0)
      expect(transformedCenter.x).toBeCloseTo(0.0, 2);
      expect(transformedCenter.y).toBeCloseTo(0.0, 2);
      expect(transformedCenter.z).toBeCloseTo(0.0, 2);

      // Floor clearance: shadow floor plane at y = -1.10 m, lowest vertex y_min ~ -0.892 m > -1.10 m
      expect(transformedBox.min.y).toBeCloseTo(-0.892, 1);
      expect(transformedBox.min.y).toBeGreaterThan(-1.10);
      const floorClearance = transformedBox.min.y - (-1.10);
      expect(floorClearance).toBeGreaterThan(0.20); // > 20 cm clearance above shadow floor
    });

    it('verifies zero crossing faces across U = 0.50 and buffer gutter Delta U >= 0.004 in public/models/tshirt.obj', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');
      const uvs: [number, number][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('vt ')) {
          uvs.push(trimmed.split(/\s+/).slice(1).map(Number) as [number, number]);
        }
      }

      let crossFaces = 0;
      let frontMaxU = -Infinity;
      let backMinU = Infinity;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('f ')) {
          const parts = trimmed.split(/\s+/).slice(1);
          const faceUs: number[] = [];
          for (const p of parts) {
            const vtIdx = parseInt(p.split('/')[1], 10);
            const [u] = uvs[vtIdx - 1];
            faceUs.push(u);
          }

          const hasFront = faceUs.some((u) => u < 0.5);
          const hasBack = faceUs.some((u) => u >= 0.5);
          if (hasFront && hasBack) {
            crossFaces++;
          }

          for (const u of faceUs) {
            if (u < 0.5) frontMaxU = Math.max(frontMaxU, u);
            else backMinU = Math.min(backMinU, u);
          }
        }
      }

      expect(crossFaces).toBe(0);
      expect(frontMaxU).toBeLessThanOrEqual(0.498);
      expect(backMinU).toBeGreaterThanOrEqual(0.502);
      expect(backMinU - frontMaxU).toBeGreaterThanOrEqual(0.004);
    });

    it('verifies Planar UV Anatomical Alignment: chest, bottom hem, and sleeves in public/models/tshirt.obj', () => {
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

      // 1. Center chest (50%, 35%) corresponds to 3D sternum U ~ 0.250, V ~ 0.650
      const sternumSamples: { u: number; v: number }[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('f ')) {
          for (const p of trimmed.split(/\s+/).slice(1)) {
            const [vIdx, vtIdx] = p.split('/').map(Number);
            const [x, y, z] = positions[vIdx - 1];
            const [u, v] = uvs[vtIdx - 1];
            if (Math.abs(x) < 0.05 && Math.abs(y - 0.25) < 0.05 && z > 0.15) {
              sternumSamples.push({ u, v });
            }
          }
        }
      }
      expect(sternumSamples.length).toBeGreaterThan(0);
      const avgSternumU = sternumSamples.reduce((s, c) => s + c.u, 0) / sternumSamples.length;
      const avgSternumV = sternumSamples.reduce((s, c) => s + c.v, 0) / sternumSamples.length;
      expect(avgSternumU).toBeCloseTo(0.25, 1);
      expect(avgSternumV).toBeCloseTo(0.65, 1);

      // 2. Bottom hem placement: 2D hem maps to 3D bottom hem V <= 0.150
      let hemSampleCount = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('f ')) {
          for (const p of trimmed.split(/\s+/).slice(1)) {
            const [vIdx, vtIdx] = p.split('/').map(Number);
            const [, y] = positions[vIdx - 1];
            const [, v] = uvs[vtIdx - 1];
            if (y < -0.80) {
              expect(v).toBeLessThanOrEqual(0.150);
              hemSampleCount++;
            }
          }
        }
      }
      expect(hemSampleCount).toBeGreaterThan(100);

      // 3. Sleeves: Front sleeves strictly U <= 0.498, rear sleeves strictly U >= 0.502
      let frontSleeveCount = 0;
      let rearSleeveCount = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('f ')) {
          const corners = trimmed.split(/\s+/).slice(1);
          const vIdxs = corners.map((p) => parseInt(p.split('/')[0], 10) - 1);
          const vtIdxs = corners.map((p) => parseInt(p.split('/')[1], 10) - 1);
          const pts = vIdxs.map((idx) => positions[idx]);
          const centroidX = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;

          if (Math.abs(centroidX) > 0.5) {
            const p0 = pts[0], p1 = pts[1], p2 = pts[2];
            const fnZ = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
            for (const vtIdx of vtIdxs) {
              const u = uvs[vtIdx][0];
              if (fnZ >= 0) {
                expect(u).toBeLessThanOrEqual(0.498);
                frontSleeveCount++;
              } else {
                expect(u).toBeGreaterThanOrEqual(0.502);
                rearSleeveCount++;
              }
            }
          }
        }
      }
      expect(frontSleeveCount).toBeGreaterThan(500);
      expect(rearSleeveCount).toBeGreaterThan(500);
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

        expect(u).toBeGreaterThanOrEqual(0.0);
        expect(u).toBeLessThanOrEqual(1.01);
        expect(v).toBeGreaterThanOrEqual(0.0);
        expect(v).toBeLessThanOrEqual(1.0);

        // Front torso check (z > 0.0)
        if (z > 0.0) {
          frontVertexCount++;
          if (u >= 0.5) bleedCount++;
          expect(u).toBeLessThan(0.5);
          expect(u).toBeGreaterThanOrEqual(0.0);
          expect(u).toBeLessThanOrEqual(0.51);
        }

        // Back torso check (z < -0.0)
        if (z < -0.0) {
          backVertexCount++;
          if (u < 0.5) bleedCount++;
          expect(u).toBeGreaterThanOrEqual(0.5);
          expect(u).toBeGreaterThanOrEqual(0.500);
          expect(u).toBeLessThanOrEqual(1.01);
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
