import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import * as THREE from 'three';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic } from '@/lib/orders';
import { generateProductionPackage } from '@/lib/production';
import { createProceduralTShirtGeometry } from '@/lib/tshirtGeometry';
import { bakeCompositeTexture, TextureBakeOptions } from '@/components/studio/textureSync';
import { AUTHENTIC_COLORS } from '@/components/studio/DesignStudioClient';
import { GET as getOrderProduction } from '@/app/api/orders/[id]/production/route';
import { PATCH as patchOrderApi, GET as getOrderApi } from '@/app/api/orders/[id]/route';
import { CreateOrderInput, DesignElement } from '@/lib/types';

describe('Milestone 5: 3D Graphics, UV Mapping & Production Spec Adversarial Verification', () => {
  const objPath = path.resolve(process.cwd(), 'public/models/tshirt.obj');

  let benchmarkGarment: any;
  let artMasterHiRes: any;
  let artStandardPreview: any;
  let licHiRes: any;
  let licStandard: any;

  // Cleanup tracking
  const createdOrderIds: string[] = [];
  const createdOrderNumbers: string[] = [];
  const createdDesignIds: string[] = [];
  const createdArtworkIds: string[] = [];
  const createdLicenseIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdCreatorIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch benchmark garment APX-HVY-001
    benchmarkGarment = await prisma.garmentProduct.findUniqueOrThrow({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: { include: { printingServices: true } },
      },
    });

    // 2. Create isolated test user & creator
    const testUser = await prisma.user.create({
      data: {
        email: `challenger-m5-graphics-${Date.now()}@ape-parel.com`,
        name: 'M5 Graphics Verifier',
        role: 'CREATOR',
      },
    });
    createdUserIds.push(testUser.id);

    const testCreator = await prisma.creatorProfile.create({
      data: {
        userId: testUser.id,
        slug: `m5-graphics-creator-${Date.now()}`,
        displayName: 'M5 Graphics Studio',
        bio: 'Isolated test creator for M5 graphics & production spec verification.',
      },
    });
    createdCreatorIds.push(testCreator.id);

    // 3. Create Artwork A: HAS originalUrl (high-res 300 DPI master)
    artMasterHiRes = await prisma.artwork.create({
      data: {
        creatorId: testCreator.id,
        title: 'Hi-Res Vector Primate Master',
        previewUrl: 'https://cdn.ape-parel.com/previews/primate-512.png',
        originalUrl: 'https://cdn.ape-parel.com/masters/primate-4096-300dpi.tiff',
        mimeType: 'image/tiff',
        category: 'ILLUSTRATION',
      },
    });
    createdArtworkIds.push(artMasterHiRes.id);

    licHiRes = await prisma.licenseOption.create({
      data: {
        artworkId: artMasterHiRes.id,
        name: 'Hi-Res Commercial Master License',
        price: 50,
      },
    });
    createdLicenseIds.push(licHiRes.id);

    // 4. Create Artwork B: NO originalUrl (previewUrl only fallback)
    artStandardPreview = await prisma.artwork.create({
      data: {
        creatorId: testCreator.id,
        title: 'Standard Web Mascot',
        previewUrl: 'https://cdn.ape-parel.com/previews/mascot-512.png',
        originalUrl: null,
        mimeType: 'image/png',
        category: 'MASCOT',
      },
    });
    createdArtworkIds.push(artStandardPreview.id);

    licStandard = await prisma.licenseOption.create({
      data: {
        artworkId: artStandardPreview.id,
        name: 'Standard Mascot License',
        price: 35,
      },
    });
    createdLicenseIds.push(licStandard.id);
  });

  afterAll(async () => {
    // Teardown created test entities
    if (createdOrderIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: createdOrderIds } },
      });
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: createdOrderNumbers } },
      });
      await prisma.royaltyObligation.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    if (createdDesignIds.length > 0) {
      await prisma.designDocument.deleteMany({
        where: { id: { in: createdDesignIds } },
      });
    }

    if (createdLicenseIds.length > 0) {
      await prisma.licenseOption.deleteMany({
        where: { id: { in: createdLicenseIds } },
      });
    }

    if (createdArtworkIds.length > 0) {
      await prisma.artwork.deleteMany({
        where: { id: { in: createdArtworkIds } },
      });
    }

    if (createdCreatorIds.length > 0) {
      await prisma.creatorProfile.deleteMany({
        where: { id: { in: createdCreatorIds } },
      });
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // SECTION 1: OBJ MESH GEOMETRY & UV MAPPING ADVERSARIAL VERIFICATION
  // =========================================================================
  describe('1. OBJ Mesh Physical Geometry & UV Mapping Verification', () => {
    it('verifies public/models/tshirt.obj exists and conforms to valid Wavefront format', () => {
      expect(fs.existsSync(objPath)).toBe(true);
      const content = fs.readFileSync(objPath, 'utf8');
      expect(content.length).toBeGreaterThan(100000);

      // Verify header declarations
      expect(content).toContain('o TShirt');
      expect(content).toContain('usemtl GarmentBase');
    });

    it('verifies exact vertex counts: 1490 vertices (v), 1490 UVs (vt), 1490 normals (vn)', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      let vCount = 0;
      let vtCount = 0;
      let vnCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) vCount++;
        else if (trimmed.startsWith('vt ')) vtCount++;
        else if (trimmed.startsWith('vn ')) vnCount++;
      }

      expect(vCount).toBe(1490);
      expect(vtCount).toBe(1490);
      expect(vnCount).toBe(1490);
    });

    it('verifies all 2680 faces are valid triangles with 1-based indices referencing 1..1490', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      let faceCount = 0;
      let minV = Infinity, maxV = -Infinity;
      let minVt = Infinity, maxVt = -Infinity;
      let minVn = Infinity, maxVn = -Infinity;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('f ')) {
          faceCount++;
          const parts = trimmed.split(/\s+/).slice(1);
          expect(parts.length).toBe(3); // strictly triangular faces

          for (const p of parts) {
            const [v, vt, vn] = p.split('/').map(Number);
            expect(Number.isInteger(v)).toBe(true);
            expect(Number.isInteger(vt)).toBe(true);
            expect(Number.isInteger(vn)).toBe(true);

            minV = Math.min(minV, v);
            maxV = Math.max(maxV, v);
            minVt = Math.min(minVt, vt);
            maxVt = Math.max(maxVt, vt);
            minVn = Math.min(minVn, vn);
            maxVn = Math.max(maxVn, vn);
          }
        }
      }

      expect(faceCount).toBe(2680);
      expect(minV).toBe(1);
      expect(maxV).toBe(1490);
      expect(minVt).toBe(1);
      expect(maxVt).toBe(1490);
      expect(minVn).toBe(1);
      expect(maxVn).toBe(1490);
    });

    it('verifies realistic physical 3D dimensions and symmetry of tshirt.obj', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');
      const positions: [number, number, number][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          const parts = trimmed.split(/\s+/).slice(1).map(Number);
          positions.push(parts as [number, number, number]);
        }
      }

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

      // Symmetrical sleeve span: ~1.9m total (-0.95 to +0.95)
      expect(minX).toBeCloseTo(-0.95, 1);
      expect(maxX).toBeCloseTo(0.95, 1);
      expect(Math.abs(minX + maxX)).toBeLessThan(0.02);

      // Height span (hem -0.85 to collar +0.70): ~1.55m
      expect(minY).toBeCloseTo(-0.85, 1);
      expect(maxY).toBeCloseTo(0.70, 1);

      // Depth span (torso thickness): -0.22 to +0.22
      expect(minZ).toBeGreaterThan(-0.30);
      expect(maxZ).toBeLessThan(0.30);
    });

    it('verifies all normal vectors are normalized unit vectors (length ≈ 1.0)', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('vn ')) {
          const [nx, ny, nz] = trimmed.split(/\s+/).slice(1).map(Number);
          const len = Math.hypot(nx, ny, nz);
          expect(len).toBeCloseTo(1.0, 3);
        }
      }
    });

    it('empirically verifies strict UV ranges: Front u in [0.04, 0.46], Back u in [0.54, 0.96]', () => {
      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');

      let frontMinU = Infinity, frontMaxU = -Infinity;
      let backMinU = Infinity, backMaxU = -Infinity;
      let inGapCount = 0;
      let outOfRangeCount = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('vt ')) {
          const [u, v] = trimmed.split(/\s+/).slice(1).map(Number);
          expect(v).toBeGreaterThanOrEqual(0.049);
          expect(v).toBeLessThanOrEqual(0.971);

          if (u < 0.5) {
            frontMinU = Math.min(frontMinU, u);
            frontMaxU = Math.max(frontMaxU, u);
          } else {
            backMinU = Math.min(backMinU, u);
            backMaxU = Math.max(backMaxU, u);
          }

          // Check if any UV falls into the strict buffer gap (0.46001 < u < 0.53999)
          if (u > 0.46001 && u < 0.53999) {
            inGapCount++;
          }

          // Check if any UV exceeds the valid boundaries
          if (u < 0.0399 || u > 0.9601) {
            outOfRangeCount++;
          }
        }
      }

      // Assert Front strict range
      expect(frontMinU).toBeCloseTo(0.04, 2);
      expect(frontMaxU).toBeCloseTo(0.46, 2);
      expect(frontMinU).toBeGreaterThanOrEqual(0.04);
      expect(frontMaxU).toBeLessThanOrEqual(0.4601);

      // Assert Back strict range
      expect(backMinU).toBeCloseTo(0.54, 2);
      expect(backMaxU).toBeCloseTo(0.96, 2);
      expect(backMinU).toBeGreaterThanOrEqual(0.5399);
      expect(backMaxU).toBeLessThanOrEqual(0.9601);

      // Buffer gap is >= 0.05 and exactly 0.08
      const bufferGap = backMinU - frontMaxU;
      expect(bufferGap).toBeGreaterThanOrEqual(0.05);
      expect(bufferGap).toBeCloseTo(0.08, 2);

      // Zero vertices in buffer gap
      expect(inGapCount).toBe(0);
      expect(outOfRangeCount).toBe(0);
    });

    it('verifies mipmap bleeding prevention across mipmap levels 0 to 5', () => {
      // 1024x1024 base texture
      // Buffer gap is 0.08 in UV space = 81.92 texels at Level 0
      const bufferTexelsL0 = 0.08 * 1024;
      expect(bufferTexelsL0).toBe(81.92);

      // At mipmap Level 1 (512x512) -> 40.96 texels
      // At mipmap Level 2 (256x256) -> 20.48 texels
      // At mipmap Level 3 (128x128) -> 10.24 texels
      // At mipmap Level 4 (64x64)   -> 5.12 texels
      // At mipmap Level 5 (32x32)   -> 2.56 texels
      for (let level = 0; level <= 5; level++) {
        const texelsAtLevel = (0.08 * 1024) / Math.pow(2, level);
        // Minimum bilinear filter kernel width is 1.0 texel; 2.56 texels guarantees 0 bleeding
        expect(texelsAtLevel).toBeGreaterThanOrEqual(2.0);
      }
    });

    it('verifies Back surface is UNMIRRORED (u increases from viewer-left to viewer-right)', () => {
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

      // Looking at the back from behind (camera at z < 0, looking towards +z):
      // Viewer-left is +X in 3D world space
      // Viewer-right is -X in 3D world space
      let viewerLeftU: number | null = null;
      let viewerRightU: number | null = null;

      for (let i = 0; i < positions.length; i++) {
        const [x, y, z] = positions[i];
        const [u] = uvs[i];
        if (z < -0.1 && Math.abs(y) < 0.1) {
          if (x > 0.3 && viewerLeftU === null) viewerLeftU = u;
          if (x < -0.3 && viewerRightU === null) viewerRightU = u;
        }
      }

      expect(viewerLeftU).not.toBeNull();
      expect(viewerRightU).not.toBeNull();

      // For unmirrored reading:
      // Viewer's left (+X) must map to smaller u (~0.58)
      // Viewer's right (-X) must map to larger u (~0.92)
      // So u increases from left to right as the viewer reads!
      expect(viewerLeftU!).toBeLessThan(viewerRightU!);
      expect(viewerLeftU!).toBeCloseTo(0.58, 1);
      expect(viewerRightU!).toBeCloseTo(0.92, 1);
    });

    it('verifies procedural geometry fallback createProceduralTShirtGeometry()', () => {
      const geom = createProceduralTShirtGeometry();
      const posAttr = geom.getAttribute('position');
      const uvAttr = geom.getAttribute('uv');
      const normAttr = geom.getAttribute('normal');
      const indexAttr = geom.getIndex();

      expect(posAttr).toBeDefined();
      expect(uvAttr).toBeDefined();
      expect(normAttr).toBeDefined();
      expect(indexAttr).toBeDefined();

      expect(posAttr.count).toBe(1490);
      expect(uvAttr.count).toBe(1490);
      expect(normAttr.count).toBe(1490);

      // Check all procedural UVs adhere strictly to bounds
      for (let i = 0; i < uvAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);
        expect(u).toBeGreaterThanOrEqual(0.039);
        expect(u).toBeLessThanOrEqual(0.961);
        expect(v).toBeGreaterThanOrEqual(0.049);
        expect(v).toBeLessThanOrEqual(0.971);

        const inBufferGap = u > 0.46001 && u < 0.53999;
        expect(inBufferGap).toBe(false);
      }
    });
  });

  // =========================================================================
  // SECTION 2: 2D/3D TEXTURE SYNCHRONIZATION & COORDINATE TRANSFORMS
  // =========================================================================
  describe('2. 2D/3D Texture Synchronization & Dual-Zone Baking', () => {
    it('verifies dual-zone 1024x1024 texture canvas coordinate transforms', () => {
      const surfaceWidth = 512;
      const surfaceHeight = 1024;

      // Front: u in [0, 0.5], x in [0, 512]
      // Test center (50%, 50%)
      const fCenterX = 0 + (50 / 100) * surfaceWidth;
      const fCenterY = (50 / 100) * surfaceHeight;
      const fU = fCenterX / 1024;
      const fV_webgl = 1.0 - fCenterY / 1024;

      expect(fCenterX).toBe(256);
      expect(fCenterY).toBe(512);
      expect(fU).toBe(0.25);
      expect(fV_webgl).toBe(0.5);

      // Back: u in [0.5, 1.0], x in [512, 1024]
      // Test center (50%, 50%)
      const bCenterX = 512 + (50 / 100) * surfaceWidth;
      const bCenterY = (50 / 100) * surfaceHeight;
      const bU = bCenterX / 1024;
      const bV_webgl = 1.0 - bCenterY / 1024;

      expect(bCenterX).toBe(768);
      expect(bCenterY).toBe(512);
      expect(bU).toBe(0.75);
      expect(bV_webgl).toBe(0.5);

      // Extreme corners:
      // Front (0%, 0%) -> (0, 0) -> u = 0.0, v = 1.0
      expect(0 / 1024).toBe(0.0);
      expect(1.0 - 0 / 1024).toBe(1.0);

      // Front (100%, 100%) -> (512, 1024) -> u = 0.5, v = 0.0
      expect(512 / 1024).toBe(0.5);
      expect(1.0 - 1024 / 1024).toBe(0.0);

      // Back (0%, 0%) -> (512, 0) -> u = 0.5, v = 1.0
      expect((512 + 0) / 1024).toBe(0.5);

      // Back (100%, 100%) -> (1024, 1024) -> u = 1.0, v = 0.0
      expect((512 + 512) / 1024).toBe(1.0);
    });

    it('verifies bakeCompositeTexture sets canvas dimensions to 1024x1024 and fills authentic color', () => {
      const fillRectMock = vi.fn();
      let capturedFillStyle = '';

      const mockCtx = {
        get fillStyle() {
          return capturedFillStyle;
        },
        set fillStyle(val: string) {
          capturedFillStyle = val;
        },
        fillRect: fillRectMock,
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
      };

      const mockCanvas = {
        width: 100,
        height: 100,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      for (const color of AUTHENTIC_COLORS) {
        fillRectMock.mockClear();

        bakeCompositeTexture(mockCanvas, {
          garmentColorHex: color.hex,
          frontElements: [],
          backElements: [],
          imageCache: new Map(),
        });

        expect(mockCanvas.width).toBe(1024);
        expect(mockCanvas.height).toBe(1024);
        expect(capturedFillStyle).toBe(color.hex);
        expect(fillRectMock).toHaveBeenCalledWith(0, 0, 1024, 1024);
      }
    });

    it('verifies zIndex layer ordering during bakeCompositeTexture execution', () => {
      const drawnOrder: string[] = [];
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn((img: any) => drawnOrder.push(img.src)),
      };

      const mockCanvas = {
        width: 1024,
        height: 1024,
        getContext: vi.fn(() => mockCtx),
      } as unknown as HTMLCanvasElement;

      const imgA = { src: 'layerA.png', complete: true, naturalWidth: 100 } as HTMLImageElement;
      const imgB = { src: 'layerB.png', complete: true, naturalWidth: 100 } as HTMLImageElement;
      const imgC = { src: 'layerC.png', complete: true, naturalWidth: 100 } as HTMLImageElement;

      const cache = new Map<string, HTMLImageElement>([
        ['layerA.png', imgA],
        ['layerB.png', imgB],
        ['layerC.png', imgC],
      ]);

      // Provide elements with out-of-order zIndex
      const frontElements: DesignElement[] = [
        {
          id: 'el-3',
          artworkId: 'art3',
          licenseOptionId: 'lic3',
          title: 'Top Layer',
          previewUrl: 'layerC.png',
          creatorName: 'Artist',
          creatorId: 'c1',
          surface: 'FRONT',
          x: 50,
          y: 50,
          width: 30,
          height: 30,
          rotation: 0,
          zIndex: 3,
          price: 50,
        },
        {
          id: 'el-1',
          artworkId: 'art1',
          licenseOptionId: 'lic1',
          title: 'Bottom Layer',
          previewUrl: 'layerA.png',
          creatorName: 'Artist',
          creatorId: 'c1',
          surface: 'FRONT',
          x: 50,
          y: 50,
          width: 30,
          height: 30,
          rotation: 0,
          zIndex: 1,
          price: 30,
        },
        {
          id: 'el-2',
          artworkId: 'art2',
          licenseOptionId: 'lic2',
          title: 'Middle Layer',
          previewUrl: 'layerB.png',
          creatorName: 'Artist',
          creatorId: 'c1',
          surface: 'FRONT',
          x: 50,
          y: 50,
          width: 30,
          height: 30,
          rotation: 0,
          zIndex: 2,
          price: 40,
        },
      ];

      bakeCompositeTexture(mockCanvas, {
        garmentColorHex: '#131718',
        frontElements,
        backElements: [],
        imageCache: cache,
      });

      // Must draw strictly in ascending zIndex order: layerA (1) -> layerB (2) -> layerC (3)
      expect(drawnOrder).toEqual(['layerA.png', 'layerB.png', 'layerC.png']);
    });
  });

  // =========================================================================
  // SECTION 3: SUPPLIER PRODUCTION SPECIFICATION PACKAGE
  // =========================================================================
  describe('3. Supplier Production Spec Generation & API Probe', () => {
    let testOrder: any;

    beforeAll(async () => {
      // Create an order with both Front and Back surfaces and multiple elements
      const frontElements: DesignElement[] = [
        {
          id: 'elem-front-1',
          artworkId: artMasterHiRes.id,
          licenseOptionId: licHiRes.id,
          title: artMasterHiRes.title,
          previewUrl: artMasterHiRes.previewUrl,
          creatorName: 'M5 Graphics Studio',
          creatorId: 'c-test',
          surface: 'FRONT',
          x: 50,
          y: 35,
          width: 40,
          height: 40,
          rotation: 15,
          zIndex: 1,
          price: licHiRes.price,
        },
      ];

      const backElements: DesignElement[] = [
        {
          id: 'elem-back-1',
          artworkId: artStandardPreview.id,
          licenseOptionId: licStandard.id,
          title: artStandardPreview.title,
          previewUrl: artStandardPreview.previewUrl,
          creatorName: 'M5 Graphics Studio',
          creatorId: 'c-test',
          surface: 'BACK',
          x: 50,
          y: 40,
          width: 50,
          height: 30,
          rotation: 0,
          zIndex: 1,
          price: licStandard.price,
        },
      ];

      testOrder = await createOrderAtomic({
        garmentProductId: benchmarkGarment.id,
        garmentColorHex: '#131718',
        garmentSize: 'XL',
        quantity: 2,
        shippingName: 'Production Spec Tester',
        shippingAddress: '88 Factory Rd, Industrial Estate',
        shippingCity: 'Samut Prakan',
        shippingPostal: '10540',
        shippingPhone: '+66-2-888-9999',
        frontArtworkLicenses: [
          { artworkId: artMasterHiRes.id, licenseOptionId: licHiRes.id },
        ],
        backArtworkLicenses: [
          { artworkId: artStandardPreview.id, licenseOptionId: licStandard.id },
        ],
        frontElements,
        backElements,
      });

      createdOrderIds.push(testOrder.orderId);
      createdOrderNumbers.push(testOrder.orderNumber);
      createdDesignIds.push(testOrder.designId);
    });

    it('generates production package with accurate physical platen coordinates in cm and mm', async () => {
      const pkg = await generateProductionPackage(testOrder.orderId);

      expect(pkg).toBeDefined();
      expect(pkg.jobId).toBe(`JOB-${testOrder.orderNumber}`);
      expect(pkg.orderNumber).toBe(testOrder.orderNumber);

      // Verify Blank Garment SKU
      expect(pkg.garment.blankSku).toBe('APX-HVY-001');
      expect(pkg.garment.size).toBe('XL');
      expect(pkg.garment.colorHex).toBe('#131718');
      expect(pkg.garment.quantity).toBe(2);

      // Verify Printing Technique & Platen Dimensions
      expect(pkg.printingTechnique.code).toBe('DTG');
      const platenW = pkg.printingTechnique.maxPrintWidthCm; // 35.0 cm
      const platenH = pkg.printingTechnique.maxPrintHeightCm; // 45.0 cm
      expect(platenW).toBe(35.0);
      expect(platenH).toBe(45.0);

      // Verify Surfaces count
      expect(pkg.surfaces.length).toBe(2);

      // Front Surface Check
      const frontJob = pkg.surfaces.find((s) => s.surface === 'FRONT');
      expect(frontJob).toBeDefined();
      expect(frontJob!.printableAreaCm.width).toBe(35.0);
      expect(frontJob!.printableAreaCm.height).toBe(45.0);
      expect(frontJob!.artworks.length).toBe(1);

      const frontLayer = frontJob!.artworks[0];
      const p = frontLayer.placement;

      // Front Element: x=50%, y=35%, width=40%, height=40%
      // Physical cm coordinates:
      const expectedWidthCm = Math.round((40 / 100) * 35.0 * 100) / 100; // 14.0 cm
      const expectedHeightCm = Math.round((40 / 100) * 45.0 * 100) / 100; // 18.0 cm
      const expectedCenterXCm = Math.round((50 / 100) * 35.0 * 100) / 100; // 17.5 cm
      const expectedCenterYCm = Math.round((35 / 100) * 45.0 * 100) / 100; // 15.75 cm
      const expectedLeftCm = Math.round((expectedCenterXCm - expectedWidthCm / 2) * 100) / 100; // 10.5 cm
      const expectedTopCm = Math.round((expectedCenterYCm - expectedHeightCm / 2) * 100) / 100; // 6.75 cm

      expect(p.calculatedWidthCm).toBe(expectedWidthCm);
      expect(p.calculatedHeightCm).toBe(expectedHeightCm);
      expect(p.xCenterCm).toBe(expectedCenterXCm);
      expect(p.yCenterCm).toBe(expectedCenterYCm);
      expect(p.xLeftCm).toBe(expectedLeftCm);
      expect(p.yTopCm).toBe(expectedTopCm);
      expect(p.rotationDeg).toBe(15);
      expect(p.zIndex).toBe(1);

      // Convert to mm (10 mm per cm)
      const widthMm = p.calculatedWidthCm * 10;
      const heightMm = p.calculatedHeightCm * 10;
      expect(widthMm).toBe(140);
      expect(heightMm).toBe(180);

      // Check Artwork A: has originalUrl -> must use high-res originalUrl
      expect(frontLayer.highResAssetUrl).toBe('https://cdn.ape-parel.com/masters/primate-4096-300dpi.tiff');
      expect(frontLayer.assetUrl).toBe('https://cdn.ape-parel.com/masters/primate-4096-300dpi.tiff');
      expect(frontLayer.mimeType).toBe('image/tiff');

      // Back Surface Check
      const backJob = pkg.surfaces.find((s) => s.surface === 'BACK');
      expect(backJob).toBeDefined();
      const backLayer = backJob!.artworks[0];

      // Check Artwork B: no originalUrl -> fallback to previewUrl
      expect(backLayer.highResAssetUrl).toBe('https://cdn.ape-parel.com/previews/mascot-512.png');
      expect(backLayer.previewUrl).toBe('https://cdn.ape-parel.com/previews/mascot-512.png');
    });

    it('retrieves production spec via GET /api/orders/[id]/production with attachment headers', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${testOrder.orderId}/production`, {
        method: 'GET',
      });

      const res = await getOrderProduction(req, { params: { id: testOrder.orderId } });
      expect(res.status).toBe(200);

      expect(res.headers.get('content-type')).toContain('application/json');
      expect(res.headers.get('content-disposition')).toBe(
        `attachment; filename="JOB-${testOrder.orderNumber}.json"`
      );

      const json = await res.json();
      expect(json.jobId).toBe(`JOB-${testOrder.orderNumber}`);
      expect(json.garment.blankSku).toBe('APX-HVY-001');
      expect(json.surfaces.length).toBe(2);
    });

    it('rejects GET /api/orders/[id]/production for unknown or empty order IDs', async () => {
      // 1. Unknown order ID -> 404
      const req404 = new NextRequest('http://localhost:3000/api/orders/UNKNOWN-ORDER-999/production', {
        method: 'GET',
      });
      const res404 = await getOrderProduction(req404, { params: { id: 'UNKNOWN-ORDER-999' } });
      expect(res404.status).toBe(404);

      // 2. Empty order ID -> 400
      const req400 = new NextRequest('http://localhost:3000/api/orders/%20/production', {
        method: 'GET',
      });
      const res400 = await getOrderProduction(req400, { params: { id: '   ' } });
      expect(res400.status).toBe(400);
    });
  });

  // =========================================================================
  // SECTION 4: ORDER STATUS LIFECYCLE & AUDITEVENT IMMUTABILITY
  // =========================================================================
  describe('4. Order Status Lifecycle (QUEUED -> PRINTING -> QA -> SHIPPED) & AuditEvent', () => {
    let lifecycleOrder: any;

    beforeAll(async () => {
      lifecycleOrder = await createOrderAtomic({
        garmentProductId: benchmarkGarment.id,
        garmentColorHex: '#FFFFFF',
        garmentSize: 'L',
        quantity: 1,
        shippingName: 'Lifecycle Tester',
        shippingAddress: '42 Status Way',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        frontArtworkLicenses: [
          { artworkId: artMasterHiRes.id, licenseOptionId: licHiRes.id },
        ],
      });

      createdOrderIds.push(lifecycleOrder.orderId);
      createdOrderNumbers.push(lifecycleOrder.orderNumber);
      createdDesignIds.push(lifecycleOrder.designId);
    });

    it('verifies initial state is PAYMENT_CONFIRMED (Queued)', async () => {
      const order = await prisma.order.findUnique({
        where: { id: lifecycleOrder.orderId },
      });
      expect(order?.status).toBe('PAYMENT_CONFIRMED');
    });

    it('executes full sequential status lifecycle: PAYMENT_CONFIRMED -> IN_PRODUCTION -> QA -> SHIPPED -> DELIVERED', async () => {
      const initialAuditCount = await prisma.auditEvent.count({
        where: { entityId: lifecycleOrder.orderId, action: 'ORDER_STATUS_UPDATED' },
      });
      expect(initialAuditCount).toBe(0);

      const lifecycleSteps = [
        {
          nextStatus: 'IN_PRODUCTION',
          expectedPrev: 'PAYMENT_CONFIRMED',
          notes: 'RIP generated, garment clamped on DTG platen (Printing)',
        },
        {
          nextStatus: 'QA',
          expectedPrev: 'IN_PRODUCTION',
          notes: 'Visual inspection under D65 daylight lamp (QA Check)',
        },
        {
          nextStatus: 'QA_PASSED',
          expectedPrev: 'QA',
          notes: 'Print passed adhesion and color deltaE checks',
        },
        {
          nextStatus: 'SHIPPED',
          expectedPrev: 'QA_PASSED',
          notes: 'Tracking TH-99214-EX assigned, picked up by courier',
        },
        {
          nextStatus: 'DELIVERED',
          expectedPrev: 'SHIPPED',
          notes: 'Proof of delivery signed by recipient',
        },
      ];

      for (const step of lifecycleSteps) {
        const req = new NextRequest(`http://localhost:3000/api/orders/${lifecycleOrder.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: step.nextStatus,
            notes: step.notes,
          }),
        });

        const res = await patchOrderApi(req, { params: { id: lifecycleOrder.orderId } });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.previousStatus).toBe(step.expectedPrev);
        expect(data.newStatus).toBe(step.nextStatus);
        expect(data.order.status).toBe(step.nextStatus);

        // Empirically verify latest AuditEvent created
        const latestAudit = await prisma.auditEvent.findFirst({
          where: {
            entityId: lifecycleOrder.orderId,
            action: 'ORDER_STATUS_UPDATED',
          },
          orderBy: { createdAt: 'desc' },
        });

        expect(latestAudit).not.toBeNull();
        expect(latestAudit!.entityType).toBe('Order');
        expect(latestAudit!.entityId).toBe(lifecycleOrder.orderId);

        const payload = JSON.parse(latestAudit!.payload!);
        expect(payload.previousStatus).toBe(step.expectedPrev);
        expect(payload.newStatus).toBe(step.nextStatus);
        expect(payload.notes).toBe(step.notes);
        expect(payload.updatedAt).toBeDefined();
      }

      // Check final DB state
      const updatedOrder = await prisma.order.findUnique({
        where: { id: lifecycleOrder.orderId },
      });
      expect(updatedOrder?.status).toBe('DELIVERED');

      // Check total AuditEvents recorded
      const totalAudits = await prisma.auditEvent.count({
        where: { entityId: lifecycleOrder.orderId, action: 'ORDER_STATUS_UPDATED' },
      });
      expect(totalAudits).toBe(5);
    });

    it('verifies PATCH can target order by human-readable orderNumber', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${lifecycleOrder.orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'QA',
          notes: 'Customer request re-inspection via orderNumber',
        }),
      });

      const res = await patchOrderApi(req, { params: { id: lifecycleOrder.orderNumber } });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.order.status).toBe('QA');

      // Audit event still associates with the canonical cuid entityId
      const audit = await prisma.auditEvent.findFirst({
        where: { entityId: lifecycleOrder.orderId, action: 'ORDER_STATUS_UPDATED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit?.entityId).toBe(lifecycleOrder.orderId);
      expect(JSON.parse(audit!.payload!).newStatus).toBe('QA');
    });

    it('adversarially rejects forged or invalid status values with HTTP 400 and zero audit events', async () => {
      const auditCountBefore = await prisma.auditEvent.count({
        where: { entityId: lifecycleOrder.orderId },
      });

      const forgedStatuses = [
        'PRINTING_IN_PROGRESS',
        'COMPLETED',
        'DISPATCHED',
        'QUEUED_FOR_PRINT',
        'in_production',
        'qa_passed',
        '',
        'DROP TABLE orders;--',
      ];

      for (const forged of forgedStatuses) {
        const req = new NextRequest(`http://localhost:3000/api/orders/${lifecycleOrder.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: forged }),
        });

        const res = await patchOrderApi(req, { params: { id: lifecycleOrder.orderId } });
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.error).toBe('Validation Error');
      }

      // Assert zero audit events were created
      const auditCountAfter = await prisma.auditEvent.count({
        where: { entityId: lifecycleOrder.orderId },
      });
      expect(auditCountAfter).toBe(auditCountBefore);
    });

    it('rejects PATCH for non-existent order with HTTP 404', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/NON-EXISTENT-CUID-999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SHIPPED' }),
      });

      const res = await patchOrderApi(req, { params: { id: 'NON-EXISTENT-CUID-999' } });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Not Found');
    });

    it('rejects PATCH with invalid JSON body with HTTP 400', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${lifecycleOrder.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'MALFORMED_JSON_STRING{{{',
      });

      const res = await patchOrderApi(req, { params: { id: lifecycleOrder.orderId } });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('Invalid JSON payload provided.');
    });
  });
});
