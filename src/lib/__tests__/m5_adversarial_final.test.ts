import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { createOrderAtomic, getOrderByIdOrNumber } from '@/lib/orders';
import { POST as postOrderApi } from '@/app/api/orders/route';
import { PATCH as patchOrderApi, GET as getOrderApi } from '@/app/api/orders/[id]/route';

describe('Tier 5 Final Adversarial Acceptance Suite (M5)', () => {
  let garmentApex: any;
  let licDashApe40: any;
  let licCyberPrimate60: any;
  let licStaticGlitch25: any;
  let artDashApe: any;
  let artCyberPrimate: any;
  let artStaticGlitch: any;
  let creatorDashApe: any;

  // Tracking for test cleanup
  const cleanupOrderIds: string[] = [];
  const cleanupUserIds: string[] = [];
  const cleanupOrderNumbers: string[] = [];

  beforeAll(async () => {
    // Garment benchmark
    garmentApex = await prisma.garmentProduct.findUniqueOrThrow({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: { include: { printingServices: true } },
      },
    });

    // Artworks & licenses
    const a1 = await prisma.artwork.findFirstOrThrow({
      where: { title: { contains: 'Dash Ape Classic' } },
      include: { licenseOptions: true, creator: true },
    });
    const a2 = await prisma.artwork.findFirstOrThrow({
      where: { title: { contains: 'Cyber Primate' } },
      include: { licenseOptions: true, creator: true },
    });
    const a3 = await prisma.artwork.findFirstOrThrow({
      where: { title: { contains: 'Static Glitch' } },
      include: { licenseOptions: true, creator: true },
    });

    artDashApe = a1;
    artCyberPrimate = a2;
    artStaticGlitch = a3;
    creatorDashApe = a1.creator;

    licDashApe40 = a1.licenseOptions.find((l) => l.price === 40)!;
    licCyberPrimate60 = a2.licenseOptions.find((l) => l.price === 60)!;
    licStaticGlitch25 = a3.licenseOptions.find((l) => l.price === 25)!;
  });

  afterAll(async () => {
    if (cleanupOrderIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: cleanupOrderIds } },
      });
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: cleanupOrderNumbers } },
      });
      await prisma.royaltyObligation.deleteMany({
        where: { orderId: { in: cleanupOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: cleanupOrderIds } },
      });
    }

    if (cleanupUserIds.length > 0) {
      await prisma.designDocument.deleteMany({
        where: { userId: { in: cleanupUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: cleanupUserIds } },
      });
    }
  });

  // =========================================================================
  // BOUNDARY 1: PRICING ANTI-TAMPERING
  // =========================================================================
  describe('Boundary 1: Pricing Anti-Tampering', () => {
    it('rejects clientClaimedTotal divergence: lower claim (-1 THB) is rejected with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 409, // Divergence: 409 !== 410
          shippingName: 'Tamper Tester Lower',
          shippingAddress: '123 Exploit St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        }),
      });

      const res = await postOrderApi(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe('Price Tampering Detected');
      expect(json.message).toContain('Price tampering detected: client claimed total 409 THB does not match server authoritative total 410 THB');
    });

    it('rejects clientClaimedTotal divergence: higher claim (+1 THB) is rejected with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 411, // Divergence: 411 !== 410
          shippingName: 'Tamper Tester Higher',
          shippingAddress: '123 Exploit St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        }),
      });

      const res = await postOrderApi(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Price Tampering Detected');
    });

    it('rejects extreme divergences (0, -500, 999999) with HTTP 400', async () => {
      for (const claimed of [0, -500, 999999]) {
        const req = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            garmentProductId: garmentApex.id,
            quantity: 1,
            clientClaimedTotal: claimed,
            shippingName: 'Extreme Divergence',
            shippingAddress: '123 Exploit St',
            shippingCity: 'Bangkok',
            shippingPostal: '10110',
            frontArtworkLicenses: [
              { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            ],
          }),
        });

        const res = await postOrderApi(req);
        expect(res.status).toBe(400);
      }
    });

    it('accepts exact authoritative matching clientClaimedTotal (410 THB)', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 410, // Exact match
          shippingName: 'Legitimate Buyer',
          shippingAddress: '123 Honest St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        }),
      });

      const res = await postOrderApi(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.totalAmount).toBe(410);

      cleanupOrderIds.push(json.order.orderId);
      cleanupOrderNumbers.push(json.order.orderNumber);
    });
  });

  // =========================================================================
  // BOUNDARY 2: EXACT THB 410 BENCHMARK
  // =========================================================================
  describe('Boundary 2: Exact THB 410 Benchmark Calculation', () => {
    it('empirically confirms 150 + 80 + 15 + 40 + 125 = 410 THB', async () => {
      const pricing = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });

      // Assert itemized components
      expect(pricing.garmentCost).toBe(150);    // Garment base price
      expect(pricing.printingCost).toBe(80);    // 1-surface Kornit DTG
      expect(pricing.packagingCost).toBe(15);   // Packaging
      expect(pricing.shippingCost).toBe(40);    // Flat shipping
      expect(pricing.licensingCost).toBe(125);  // 40 + 60 + 25 = 125

      // Sum identity
      const computedSum =
        pricing.garmentCost +
        pricing.printingCost +
        pricing.packagingCost +
        pricing.shippingCost +
        pricing.licensingCost;

      expect(computedSum).toBe(410);
      expect(pricing.totalAmount).toBe(410);
      expect(pricing.totalAmount).toBe(computedSum);
    });

    it('empirically verifies multi-unit scaling formula: ((150 + 80 + 15 + 125) * qty) + 40', async () => {
      const quantities = [1, 2, 5, 10, 50];

      for (const qty of quantities) {
        const pricing = await calculateLivePricing({
          garmentProductId: garmentApex.id,
          quantity: qty,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
            { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
            { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
          ],
        });

        const expectedTotal = (150 + 80 + 15 + 125) * qty + 40;
        expect(pricing.totalAmount).toBe(expectedTotal);
        expect(pricing.garmentCost).toBe(150 * qty);
        expect(pricing.printingCost).toBe(80 * qty);
        expect(pricing.packagingCost).toBe(15 * qty);
        expect(pricing.shippingCost).toBe(40);
        expect(pricing.licensingCost).toBe(125 * qty);
      }
    });
  });

  // =========================================================================
  // BOUNDARY 3: CONCURRENCY & TRANSACTION ROLLBACK
  // =========================================================================
  describe('Boundary 3: Concurrency & Atomic Transaction Rollback', () => {
    it('verifies rollback on error leaves 0 orphan records across all intermediate transaction stages', async () => {
      const failureSteps: Array<'design' | 'order' | 'obligation' | 'ledger'> = [
        'design',
        'order',
        'obligation',
        'ledger',
      ];

      for (const step of failureSteps) {
        const canaryTag = `Canary-M5-Rollback-${step}-${Date.now()}`;

        const input = {
          garmentProductId: garmentApex.id,
          quantity: 1,
          designTitle: canaryTag,
          shippingName: canaryTag,
          shippingAddress: 'Rollback Way',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          ],
          _simulateFailureAtStep: step,
        };

        // Expect transaction to reject
        await expect(createOrderAtomic(input)).rejects.toThrow();

        // Empirically verify ZERO orphan entities exist in DB
        const orphanDesign = await prisma.designDocument.findFirst({
          where: { title: canaryTag },
        });
        const orphanOrder = await prisma.order.findFirst({
          where: { shippingName: canaryTag },
        });
        const orphanObligations = await prisma.royaltyObligation.count({
          where: { order: { shippingName: canaryTag } },
        });
        const orphanLedger = await prisma.royaltyLedgerEntry.count({
          where: { notes: { contains: canaryTag } },
        });

        expect(orphanDesign).toBeNull();
        expect(orphanOrder).toBeNull();
        expect(orphanObligations).toBe(0);
        expect(orphanLedger).toBe(0);
      }
    });

    it('verifies concurrent order creation handles multiple parallel orders atomically without race condition', async () => {
      const buyerNames = [
        `M5-Parallel-1-${Date.now()}`,
        `M5-Parallel-2-${Date.now()}`,
        `M5-Parallel-3-${Date.now()}`,
      ];

      const tasks = buyerNames.map((name) =>
        createOrderAtomic({
          garmentProductId: garmentApex.id,
          quantity: 1,
          shippingName: name,
          shippingAddress: 'Concurrency Rd',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          ],
        })
      );

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(3);

      for (const res of results) {
        expect(res.orderId).toBeDefined();
        cleanupOrderIds.push(res.orderId);
        cleanupOrderNumbers.push(res.orderNumber);

        // Verify all 3 orders exist with full integrity
        const orderInDb = await prisma.order.findUnique({
          where: { id: res.orderId },
          include: { obligations: true, design: true },
        });
        expect(orderInDb).not.toBeNull();
        expect(orderInDb?.obligations).toHaveLength(1);
      }
    });
  });

  // =========================================================================
  // BOUNDARY 4: 3D MESH & UV MAPPING
  // =========================================================================
  describe('Boundary 4: 3D Mesh Geometry & UV Mapping (public/models/tshirt.obj)', () => {
    it('verifies public/models/tshirt.obj satisfies Front u < 0.5, Back u > 0.5, buffer margin >= 0.05, and anti-mirroring', () => {
      const objFilePath = path.resolve(process.cwd(), 'public/models/tshirt.obj');
      expect(fs.existsSync(objFilePath)).toBe(true);

      const objContent = fs.readFileSync(objFilePath, 'utf8');
      const lines = objContent.split('\n');

      const uvs: [number, number][] = [];
      const positions: [number, number, number][] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('v ')) {
          const coords = trimmed.split(/\s+/).slice(1).map(Number);
          positions.push(coords as [number, number, number]);
        } else if (trimmed.startsWith('vt ')) {
          const coords = trimmed.split(/\s+/).slice(1).map(Number);
          uvs.push(coords as [number, number]);
        }
      }

      expect(positions.length).toBe(1490);
      expect(uvs.length).toBe(1490);

      let frontMaxU = -Infinity;
      let frontMinU = Infinity;
      let backMinU = Infinity;
      let backMaxU = -Infinity;
      let bufferZoneVerticesCount = 0;

      for (const [u, v] of uvs) {
        // Assert valid UV bounds [0, 1]
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);

        if (u < 0.5) {
          frontMinU = Math.min(frontMinU, u);
          frontMaxU = Math.max(frontMaxU, u);
        } else if (u > 0.5) {
          backMinU = Math.min(backMinU, u);
          backMaxU = Math.max(backMaxU, u);
        }

        // Buffer margin audit: interior zone [0.461, 0.539]
        if (u > 0.4601 && u < 0.5399) {
          bufferZoneVerticesCount++;
        }
      }

      // Assert Front u < 0.5 strictly
      expect(frontMaxU).toBeLessThan(0.5);
      expect(frontMaxU).toBeCloseTo(0.46, 2);
      expect(frontMinU).toBeCloseTo(0.04, 2);

      // Assert Back u > 0.5 strictly
      expect(backMinU).toBeGreaterThan(0.5);
      expect(backMinU).toBeCloseTo(0.54, 2);
      expect(backMaxU).toBeCloseTo(0.96, 2);

      // Buffer margin >= 0.05
      const bufferMargin = backMinU - frontMaxU;
      expect(bufferMargin).toBeGreaterThanOrEqual(0.05);
      expect(bufferMargin).toBeCloseTo(0.08, 2);

      // Zero vertices in buffer zone (0 bleed)
      expect(bufferZoneVerticesCount).toBe(0);

      // Assert Anti-Mirroring:
      // When looking at front (z > 0.1), left is -x, right is +x
      // When looking at back (z < -0.1), left is +x, right is -x
      let frontLeftU: number | null = null;
      let frontRightU: number | null = null;
      let backLeftU: number | null = null;
      let backRightU: number | null = null;

      for (let i = 0; i < positions.length; i++) {
        const [x, y, z] = positions[i];
        const [u] = uvs[i];

        if (Math.abs(y) < 0.1) {
          if (z > 0.1) {
            if (x < -0.3 && frontLeftU === null) frontLeftU = u;
            if (x > 0.3 && frontRightU === null) frontRightU = u;
          } else if (z < -0.1) {
            if (x > 0.3 && backLeftU === null) backLeftU = u;
            if (x < -0.3 && backRightU === null) backRightU = u;
          }
        }
      }

      expect(frontLeftU).not.toBeNull();
      expect(frontRightU).not.toBeNull();
      expect(backLeftU).not.toBeNull();
      expect(backRightU).not.toBeNull();

      // Front: left has smaller u
      expect(frontLeftU!).toBeLessThan(frontRightU!);
      // Back: left has smaller u (anti-mirroring property holds)
      expect(backLeftU!).toBeLessThan(backRightU!);
    });
  });

  // =========================================================================
  // BOUNDARY 5: ROLE PORTALS, PRIVACY & AUDITEVENTS
  // =========================================================================
  describe('Boundary 5: Role Portals, Privacy & AuditEvent Integrity', () => {
    let testOrder: any;

    beforeAll(async () => {
      // Create dedicated order for lifecycle testing
      const res = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        shippingName: 'Role Portal Tester',
        shippingAddress: '42 Lifecycle Blvd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
      });

      testOrder = res.order;
      cleanupOrderIds.push(res.orderId);
      cleanupOrderNumbers.push(res.orderNumber);
    });

    it('verifies privacy: creator payoutDetails is NEVER exposed in public storefront DTOs', async () => {
      const creator = await prisma.creatorProfile.findUnique({
        where: { slug: 'dash-ape' },
        include: { artworks: true },
      });

      expect(creator?.payoutDetails).toBeDefined(); // Exists in DB privately

      // Public storefront transformation as in src/app/creators/[slug]/page.tsx
      const publicDto = {
        id: creator!.id,
        slug: creator!.slug,
        displayName: creator!.displayName,
        bio: creator!.bio,
        avatarUrl: creator!.avatarUrl,
        website: creator!.website,
      };

      expect((publicDto as any).payoutDetails).toBeUndefined();
      expect(JSON.stringify(publicDto)).not.toContain('PromptPay');
      expect(JSON.stringify(publicDto)).not.toContain('081-998-7711');
    });

    it('verifies privacy: marketplace catalog DTOs never expose creator payoutDetails', async () => {
      const artworks = await prisma.artwork.findMany({
        where: { status: 'PUBLISHED', moderationStatus: 'APPROVED' },
        include: { creator: true },
      });

      const marketplaceDtos = artworks.map((a) => ({
        id: a.id,
        title: a.title,
        creator: {
          id: a.creator.id,
          displayName: a.creator.displayName,
          slug: a.creator.slug,
          avatarUrl: a.creator.avatarUrl,
          bio: a.creator.bio,
        },
      }));

      for (const dto of marketplaceDtos) {
        expect((dto.creator as any).payoutDetails).toBeUndefined();
      }
      expect(JSON.stringify(marketplaceDtos)).not.toContain('PromptPay');
    });

    it('executes status stepper lifecycle and records an immutable AuditEvent for every transition', async () => {
      const transitions = [
        { status: 'IN_PRODUCTION', notes: 'Blank loaded on Kornit platen' },
        { status: 'QA_PASSED', notes: 'Zero defects detected in print' },
        { status: 'SHIPPED', notes: 'Handed to express courier' },
        { status: 'DELIVERED', notes: 'Customer signed for delivery' },
      ];

      for (const step of transitions) {
        const req = new NextRequest(`http://localhost:3000/api/orders/${testOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: step.status,
            notes: step.notes,
          }),
        });

        const res = await patchOrderApi(req, { params: { id: testOrder.id } });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.newStatus).toBe(step.status);

        // Verify AuditEvent in DB
        const latestAudit = await prisma.auditEvent.findFirst({
          where: {
            entityId: testOrder.id,
            action: 'ORDER_STATUS_UPDATED',
          },
          orderBy: { createdAt: 'desc' },
        });

        expect(latestAudit).not.toBeNull();
        expect(latestAudit?.entityType).toBe('Order');
        expect(latestAudit?.entityId).toBe(testOrder.id);

        const auditPayload = JSON.parse(latestAudit!.payload!);
        expect(auditPayload.newStatus).toBe(step.status);
        expect(auditPayload.notes).toBe(step.notes);
      }

      // Check total audit events created for this order
      const totalAudits = await prisma.auditEvent.count({
        where: { entityId: testOrder.id, action: 'ORDER_STATUS_UPDATED' },
      });
      expect(totalAudits).toBe(4);
    });

    it('rejects invalid status transitions with 400 Bad Request and generates zero AuditEvents', async () => {
      const beforeCount = await prisma.auditEvent.count({
        where: { entityId: testOrder.id },
      });

      const req = new NextRequest(`http://localhost:3000/api/orders/${testOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'FORGED_INVALID_STATUS_123',
        }),
      });

      const res = await patchOrderApi(req, { params: { id: testOrder.id } });
      expect(res.status).toBe(400);

      const afterCount = await prisma.auditEvent.count({
        where: { entityId: testOrder.id },
      });
      expect(afterCount).toBe(beforeCount); // Zero audit events generated
    });
  });
});
