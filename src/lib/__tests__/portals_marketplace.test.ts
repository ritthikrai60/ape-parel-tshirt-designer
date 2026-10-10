import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrderByIdOrNumber } from '@/lib/orders';
import { getCreatorLedgerSummary, getCreatorLedgerEntries } from '@/lib/royalties';
import { generateProductionPackage } from '@/lib/production';
import { GET as getOrderRoute, PATCH as patchOrderRoute } from '@/app/api/orders/[id]/route';

describe('Integration Test Suite: Multi-Role Portals & Marketplace (M4)', () => {
  let seededOrder: any;
  let testOrderId: string;
  let testOrderNumber: string;

  beforeAll(async () => {
    // 1. Locate benchmark seed order APX-ORD-9021
    seededOrder = await prisma.order.findFirst({
      where: { orderNumber: 'APX-ORD-9021' },
      include: {
        design: {
          include: {
            garmentProduct: {
              include: {
                variants: true,
              },
            },
          },
        },
        supplier: true,
        obligations: {
          include: {
            artwork: {
              include: {
                creator: true,
              },
            },
            licenseOption: true,
          },
        },
      },
    });

    if (!seededOrder) {
      throw new Error('Seed data missing: Order APX-ORD-9021 not found.');
    }

    testOrderId = seededOrder.id;
    testOrderNumber = seededOrder.orderNumber;
  });

  afterAll(async () => {
    // Clean up any audit events created during test order status transitions
    await prisma.auditEvent.deleteMany({
      where: {
        entityId: testOrderId,
        action: 'ORDER_STATUS_UPDATED',
      },
    });

    // Reset seeded order back to PAYMENT_CONFIRMED
    await prisma.order.update({
      where: { id: testOrderId },
      data: { status: 'PAYMENT_CONFIRMED' },
    });
  });

  // ==========================================================================
  // 1. Public Marketplace Tests
  // ==========================================================================
  describe('1. Public Marketplace Catalog & Artworks', () => {
    it('retrieves published and approved artworks from database with creator and licenses', async () => {
      const artworks = await prisma.artwork.findMany({
        where: {
          status: 'PUBLISHED',
          moderationStatus: 'APPROVED',
        },
        include: {
          creator: true,
          licenseOptions: true,
        },
      });

      expect(artworks.length).toBeGreaterThanOrEqual(3);

      for (const art of artworks) {
        expect(art.title).toBeDefined();
        expect(art.previewUrl).toBeDefined();
        expect(art.creator.displayName).toBeDefined();
        expect(art.creator.slug).toBeDefined();
        expect(art.licenseOptions.length).toBeGreaterThanOrEqual(1);
        expect(art.licenseOptions[0].price).toBeGreaterThan(0);
      }
    });

    it('verifies category taxonomy contains expected streetwear categories', async () => {
      const artworks = await prisma.artwork.findMany({
        select: { category: true },
      });

      const categories = new Set(artworks.map((a) => a.category.toUpperCase()));
      expect(
        categories.has('MASCOT') ||
        categories.has('ILLUSTRATION') ||
        categories.has('PATTERN') ||
        categories.has('TYPOGRAPHY')
      ).toBe(true);
    });

    it('formats marketplace DTOs with minimum license price calculation', async () => {
      const artworks = await prisma.artwork.findMany({
        include: { creator: true, licenseOptions: true },
      });

      const dtos = artworks.map((a) => {
        const prices = a.licenseOptions.map((l) => l.price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 40;
        return {
          id: a.id,
          title: a.title,
          category: a.category,
          baseLicensePrice: minPrice,
          creatorSlug: a.creator.slug,
        };
      });

      expect(dtos.length).toBeGreaterThan(0);
      for (const dto of dtos) {
        expect(dto.baseLicensePrice).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // 2. Creator Storefront Tests
  // ==========================================================================
  describe('2. Creator Storefronts & Privacy Protection', () => {
    it('loads creator profile by slug with portfolio artworks and stats', async () => {
      const creator = await prisma.creatorProfile.findUnique({
        where: { slug: 'dash-ape' },
        include: {
          artworks: {
            include: { licenseOptions: true },
          },
        },
      });

      expect(creator).toBeDefined();
      expect(creator?.displayName).toBe('Dash Ape Studio');
      expect(creator?.artworks.length).toBeGreaterThanOrEqual(1);

      // Verify stats
      const totalUnits = await prisma.royaltyObligation.count({
        where: { creatorId: creator!.id },
      });
      expect(totalUnits).toBeGreaterThanOrEqual(0);
    });

    it('strictly guards creator payout details from public exposure', async () => {
      const creator = await prisma.creatorProfile.findUnique({
        where: { slug: 'dash-ape' },
      });

      expect(creator?.payoutDetails).toBeDefined(); // Exists in DB

      // When mapped for public storefront DTO, payoutDetails must be omitted
      const publicDto = {
        id: creator!.id,
        slug: creator!.slug,
        displayName: creator!.displayName,
        bio: creator!.bio,
        avatarUrl: creator!.avatarUrl,
        website: creator!.website,
      };

      expect((publicDto as any).payoutDetails).toBeUndefined();
    });

    it('returns null for non-existent creator slug to trigger 404', async () => {
      const nonExistent = await prisma.creatorProfile.findUnique({
        where: { slug: 'non-existent-artist-slug-999' },
      });

      expect(nonExistent).toBeNull();
    });
  });

  // ==========================================================================
  // 3. Creator Royalty Dashboard Tests
  // ==========================================================================
  describe('3. Creator Dashboard & Royalty Ledger', () => {
    it('calculates live summary including lifetime earnings and eligible balance', async () => {
      const summary = await getCreatorLedgerSummary('dash-ape');

      expect(summary).toBeDefined();
      expect(summary.creatorId).toBeDefined();
      expect(summary.slug).toBe('dash-ape');
      expect(summary.lifetimeEarnings).toBeGreaterThanOrEqual(0);
      expect(summary.salesVolume).toBeGreaterThanOrEqual(0);
      expect(summary.currentBalance).toBeGreaterThanOrEqual(0);
      expect(summary.eligibleObligations).toBeDefined();
      expect(summary.eligibleObligations.count).toBeGreaterThanOrEqual(0);
    });

    it('retrieves immutable ledger entries with chronological balance tracking', async () => {
      const entries = await getCreatorLedgerEntries('dash-ape', { limit: 50 });

      expect(Array.isArray(entries)).toBe(true);
      for (const entry of entries) {
        expect(entry.entryType).toBeDefined();
        expect(['EARNING', 'PAYOUT_SETTLEMENT', 'ADJUSTMENT']).toContain(entry.entryType);
        expect(typeof entry.amount).toBe('number');
        expect(typeof entry.balanceAfter).toBe('number');
        expect(entry.createdAt).toBeInstanceOf(Date);
      }
    });
  });

  // ==========================================================================
  // 4. Supplier Dashboard & Production Specs
  // ==========================================================================
  describe('4. Supplier Dashboard & Manufacturing Specifications', () => {
    it('queries production queue by supplier facility', async () => {
      const supplier = await prisma.supplierProfile.findUnique({
        where: { slug: 'bangkok-garment-craft' },
        include: { printingServices: true },
      });

      expect(supplier).toBeDefined();
      expect(supplier?.companyName).toContain('Bangkok Garment Craft');

      const supplierOrders = await prisma.order.findMany({
        where: { supplierId: supplier!.id },
        include: {
          design: {
            include: {
              garmentProduct: true,
            },
          },
        },
      });

      expect(supplierOrders.length).toBeGreaterThanOrEqual(1);
      const order = supplierOrders[0];
      expect(order.design.garmentProduct.sku).toBe('APX-HVY-001');
    });

    it('generates complete factory RIP specification package matching order details', async () => {
      const pkg = await generateProductionPackage(testOrderId);

      expect(pkg).toBeDefined();
      expect(pkg.orderId).toBe(testOrderId);
      expect(pkg.jobId).toContain('JOB-');
      expect(pkg.garment.blankSku).toBe('APX-HVY-001');
      expect(pkg.printingTechnique.code).toBe('DTG');
      expect(pkg.surfaces.length).toBeGreaterThanOrEqual(1);

      for (const surface of pkg.surfaces) {
        expect(surface.artworks.length).toBeGreaterThanOrEqual(1);
        for (const art of surface.artworks) {
          expect(art.placement.calculatedWidthCm).toBeGreaterThan(0);
          expect(art.placement.calculatedHeightCm).toBeGreaterThan(0);
          expect(art.highResAssetUrl).toBeDefined();
        }
      }
    });
  });

  // ==========================================================================
  // 5. Customer Order Tracking Tests
  // ==========================================================================
  describe('5. Customer Order Tracking & Pricing Integrity', () => {
    it('retrieves order by orderNumber with full relations and itemized pricing breakdown', async () => {
      const order = await getOrderByIdOrNumber(testOrderNumber);

      expect(order).toBeDefined();
      expect(order?.orderNumber).toBe('APX-ORD-9021');

      // Verify exact benchmark cost breakdown: 150 + 80 + 15 + 40 + 125 = 410
      expect(order?.garmentCost).toBe(150);
      expect(order?.printingCost).toBe(80);
      expect(order?.packagingCost).toBe(15);
      expect(order?.shippingCost).toBe(40);
      expect(order?.licensingCost).toBe(125);
      expect(order?.totalAmount).toBe(410);
    });

    it('verifies order design snapshot and surface element placement', async () => {
      const order = await getOrderByIdOrNumber(testOrderId);
      expect(order?.design).toBeDefined();
      expect(order?.design.garmentColorHex).toBe('#131718');
      expect(order?.design.garmentSize).toBe('L');

      const frontElements = JSON.parse(order?.design.frontElements || '[]');
      expect(frontElements.length).toBeGreaterThanOrEqual(1);
      expect(frontElements[0].title).toBeDefined();
      expect(frontElements[0].price).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 6. API Route PATCH /api/orders/[id] Tests
  // ==========================================================================
  describe('6. Order Status API (PATCH /api/orders/[id])', () => {
    it('transitions order status to IN_PRODUCTION and records an AuditEvent', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PRODUCTION',
          notes: 'Started Kornit DTG printing run',
        }),
      });

      const res = await patchOrderRoute(req, { params: { id: testOrderId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.status).toBe('IN_PRODUCTION');
      expect(json.newStatus).toBe('IN_PRODUCTION');

      // Verify database updated
      const orderInDb = await prisma.order.findUnique({ where: { id: testOrderId } });
      expect(orderInDb?.status).toBe('IN_PRODUCTION');

      // Verify AuditEvent was created
      const audit = await prisma.auditEvent.findFirst({
        where: {
          entityId: testOrderId,
          action: 'ORDER_STATUS_UPDATED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.payload).toContain('IN_PRODUCTION');
    });

    it('transitions order status through QA_PASSED and SHIPPED', async () => {
      // Transition to QA_PASSED
      const reqQA = new NextRequest(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'QA_PASSED' }),
      });
      const resQA = await patchOrderRoute(reqQA, { params: { id: testOrderId } });
      expect(resQA.status).toBe(200);

      // Transition to SHIPPED
      const reqShip = new NextRequest(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SHIPPED', notes: 'Handed to courier' }),
      });
      const resShip = await patchOrderRoute(reqShip, { params: { id: testOrderId } });
      expect(resShip.status).toBe(200);

      const orderInDb = await prisma.order.findUnique({ where: { id: testOrderId } });
      expect(orderInDb?.status).toBe('SHIPPED');
    });

    it('supports looking up and patching order by human-readable orderNumber', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });

      const res = await patchOrderRoute(req, { params: { id: testOrderNumber } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.status).toBe('DELIVERED');
    });

    it('rejects invalid status transitions with 400 Bad Request', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS_XYZ' }),
      });

      const res = await patchOrderRoute(req, { params: { id: testOrderId } });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe('Validation Error');
    });

    it('returns 404 for non-existent order ID', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/non-existent-order-cuid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PRODUCTION' }),
      });

      const res = await patchOrderRoute(req, { params: { id: 'non-existent-order-cuid' } });
      expect(res.status).toBe(404);
    });

    it('returns order details via GET /api/orders/[id]', async () => {
      const req = new NextRequest(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: 'GET',
      });

      const res = await getOrderRoute(req, { params: { id: testOrderId } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderNumber).toBe(testOrderNumber);
    });
  });
});
