import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic, getOrderByIdOrNumber } from '@/lib/orders';
import { POST as postOrder, GET as getOrders } from '@/app/api/orders/route';
import { GET as getOrderById } from '@/app/api/orders/[id]/route';
import { GET as getOrderProduction } from '@/app/api/orders/[id]/production/route';
import {
  POST as postSettle,
  GET as getSettleSummary,
} from '@/app/api/royalties/settle/route';
import { CreateOrderInput } from '@/lib/types';

describe('Challenger M2: Adversarial API Probes & Tamper Resistance Suite', () => {
  let garmentApex: any;
  let artDashApe: any;
  let artCyberPrimate: any;
  let artStaticGlitch: any;
  let licDashApe40: any;
  let licCyberPrimate60: any;
  let licStaticGlitch25: any;
  let creatorDashApe: any;

  // Track created entities for deterministic teardown
  const createdOrderIds: string[] = [];
  const createdDesignIds: string[] = [];
  const createdSettlementIds: string[] = [];
  const createdOrderNumbers: string[] = [];
  const createdSettlementNumbers: string[] = [];

  beforeAll(async () => {
    // 1. Fetch benchmark garment APX-HVY-001
    garmentApex = await prisma.garmentProduct.findUnique({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: {
          include: {
            printingServices: true,
          },
        },
      },
    });
    if (!garmentApex) {
      throw new Error('Garment APX-HVY-001 not found in database.');
    }

    // 2. Fetch benchmark artworks and licenses
    const art1 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Dash Ape Classic' } },
      include: { licenseOptions: true, creator: true },
    });
    const art2 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Cyber Primate' } },
      include: { licenseOptions: true, creator: true },
    });
    const art3 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Static Glitch' } },
      include: { licenseOptions: true, creator: true },
    });

    if (!art1 || !art2 || !art3) {
      throw new Error('Benchmark artworks not found in database.');
    }

    artDashApe = art1;
    artCyberPrimate = art2;
    artStaticGlitch = art3;
    creatorDashApe = art1.creator;

    licDashApe40 = art1.licenseOptions.find((l) => l.price === 40);
    licCyberPrimate60 = art2.licenseOptions.find((l) => l.price === 60);
    licStaticGlitch25 = art3.licenseOptions.find((l) => l.price === 25);

    if (!licDashApe40 || !licCyberPrimate60 || !licStaticGlitch25) {
      throw new Error('Benchmark licenses (40, 60, 25) missing.');
    }
  });

  afterAll(async () => {
    // Comprehensive teardown of all test-created entities
    if (createdSettlementIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: createdSettlementIds } },
      });
      await prisma.creatorSettlement.deleteMany({
        where: { id: { in: createdSettlementIds } },
      });
    }

    const allRefs = [...createdOrderNumbers, ...createdSettlementNumbers];
    if (allRefs.length > 0) {
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: allRefs } },
      });
    }

    if (createdOrderIds.length > 0) {
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

    await prisma.$disconnect();
  });

  // Helper to call POST /api/orders
  async function invokePostOrders(body: any, rawString = false) {
    const payloadStr = rawString ? body : JSON.stringify(body);
    const req = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payloadStr,
    });
    const res = await postOrder(req);
    const data = await res.json();
    return { status: res.status, data };
  }

  // Standard valid 1-unit benchmark order payload
  function createBenchmarkPayload(overrides: Partial<any> = {}) {
    return {
      garmentProductId: garmentApex.id,
      quantity: 1,
      shippingName: 'Adversarial Tester',
      shippingAddress: '404 Exploit Ave',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      frontArtworkLicenses: [
        { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
      ],
      ...overrides,
    };
  }

  // =========================================================================
  // SECTION 1: PRICE TAMPERING PROBING (/api/orders & createOrderAtomic)
  // =========================================================================
  describe('1. Price Tampering Probing (clientClaimedTotal)', () => {
    it('strictly rejects clientClaimedTotal lower than server total with HTTP 400', async () => {
      // Benchmark true price is 410 THB; client claims 409 THB
      const payload = createBenchmarkPayload({ clientClaimedTotal: 409 });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Price Tampering Detected');
      expect(data.message).toMatch(/Price tampering detected/i);
      expect(data.message).toContain('409 THB');
      expect(data.message).toContain('410 THB');
    });

    it('strictly rejects clientClaimedTotal higher than server total with HTTP 400', async () => {
      // Client claims 411 THB
      const payload = createBenchmarkPayload({ clientClaimedTotal: 411 });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Price Tampering Detected');
      expect(data.message).toMatch(/Price tampering detected/i);
    });

    it('strictly rejects extreme tampered clientClaimedTotal (0, 1, 999999) with HTTP 400', async () => {
      for (const tamperedVal of [0, 1, 999999]) {
        const payload = createBenchmarkPayload({ clientClaimedTotal: tamperedVal });
        const { status, data } = await invokePostOrders(payload);

        expect(status).toBe(400);
        expect(data).toHaveProperty('error', 'Price Tampering Detected');
      }
    });

    it('strictly rejects negative clientClaimedTotal with HTTP 400', async () => {
      const payload = createBenchmarkPayload({ clientClaimedTotal: -500 });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Price Tampering Detected');
    });

    it('accepts exact benchmark clientClaimedTotal (410 THB) with HTTP 201 Created', async () => {
      const payload = createBenchmarkPayload({ clientClaimedTotal: 410 });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.order.totalAmount).toBe(410);

      createdOrderIds.push(data.order.orderId);
      createdDesignIds.push(data.order.designId);
      createdOrderNumbers.push(data.order.orderNumber);
    });

    it('accepts order without clientClaimedTotal and authoritatively charges 410 THB', async () => {
      const payload = createBenchmarkPayload(); // omitted clientClaimedTotal
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.order.totalAmount).toBe(410);

      createdOrderIds.push(data.order.orderId);
      createdDesignIds.push(data.order.designId);
      createdOrderNumbers.push(data.order.orderNumber);
    });
  });

  // =========================================================================
  // SECTION 2: FORGED & INVALID IDENTIFIERS (Licenses & Garments)
  // =========================================================================
  describe('2. Forged & Invalid Identifier Probing', () => {
    it('rejects forged/non-existent licenseOptionId with HTTP 400', async () => {
      const payload = createBenchmarkPayload({
        frontArtworkLicenses: [
          {
            artworkId: artDashApe.id,
            licenseOptionId: 'forged_license_cuid_999999',
          },
        ],
      });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toMatch(/License option not found/i);
    });

    it('rejects license option belonging to another artwork with HTTP 400', async () => {
      // licDashApe40 belongs to Dash Ape, but claimed under Cyber Primate
      const payload = createBenchmarkPayload({
        frontArtworkLicenses: [
          {
            artworkId: artCyberPrimate.id,
            licenseOptionId: licDashApe40.id,
          },
        ],
      });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toMatch(/does not belong to artwork/i);
    });

    it('rejects forged/non-existent garmentProductId with HTTP 404', async () => {
      const payload = createBenchmarkPayload({
        garmentProductId: 'non_existent_garment_cuid_00000',
      });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(404);
      expect(data).toHaveProperty('error', 'Not Found');
      expect(data.message).toMatch(/Garment product not found/i);
    });

    it('rejects forged/non-existent garmentVariantId with HTTP 400', async () => {
      const payload = createBenchmarkPayload({
        garmentVariantId: 'forged_variant_cuid_88888',
      });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toMatch(/Garment variant not found/i);
    });
  });

  // =========================================================================
  // SECTION 3: MALFORMED PAYLOADS, MISSING FIELDS & QUANTITY BOUNDARIES
  // =========================================================================
  describe('3. Malformed Payloads, Missing Fields & Quantity Boundaries', () => {
    it('rejects invalid JSON syntax cleanly with HTTP 400', async () => {
      const { status, data } = await invokePostOrders('{"garmentProductId": broken', true);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid JSON');
      expect(data.message).toContain('valid JSON');
    });

    it('rejects empty request body cleanly with HTTP 400', async () => {
      const { status, data } = await invokePostOrders('', true);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid JSON');
    });

    it('rejects empty JSON object payload with HTTP 400 validation error', async () => {
      const { status, data } = await invokePostOrders({});

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
      expect(data).toHaveProperty('issues');
    });

    it('rejects payload missing shipping fields with HTTP 400', async () => {
      const requiredFields = [
        'shippingName',
        'shippingAddress',
        'shippingCity',
        'shippingPostal',
        'garmentProductId',
      ];

      for (const field of requiredFields) {
        const payload = createBenchmarkPayload();
        delete (payload as any)[field];
        const { status, data } = await invokePostOrders(payload);

        expect(status).toBe(400);
        expect(data).toHaveProperty('error', 'Validation Error');
      }
    });

    it('rejects empty string values for required shipping fields with HTTP 400', async () => {
      for (const field of ['shippingName', 'shippingAddress', 'shippingCity', 'shippingPostal']) {
        const payload = createBenchmarkPayload({ [field]: '' });
        const { status, data } = await invokePostOrders(payload);

        expect(status).toBe(400);
        expect(data).toHaveProperty('error', 'Validation Error');
      }
    });

    it('rejects negative quantity (-1, -10) with HTTP 400', async () => {
      for (const badQty of [-1, -10]) {
        const payload = createBenchmarkPayload({ quantity: badQty });
        const { status, data } = await invokePostOrders(payload);

        expect(status).toBe(400);
        expect(data).toHaveProperty('error', 'Validation Error');
      }
    });

    it('rejects zero quantity (0) with HTTP 400', async () => {
      const payload = createBenchmarkPayload({ quantity: 0 });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects non-integer floating quantity (2.5) with HTTP 400', async () => {
      const payload = createBenchmarkPayload({ quantity: 2.5 });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects string quantity ("five") with HTTP 400', async () => {
      const payload = createBenchmarkPayload({ quantity: 'five' });
      const { status, data } = await invokePostOrders(payload);

      expect(status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });
  });

  // =========================================================================
  // SECTION 4: ORDER DETAILS & ORDER LISTING (/api/orders/[id] & /api/orders)
  // =========================================================================
  describe('4. Order Inspection Endpoint (/api/orders/[id])', () => {
    it('returns 404 Not Found for non-existent order ID cleanly', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/non-existent-order-id-999');
      const res = await getOrderById(req, {
        params: { id: 'non-existent-order-id-999' },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error', 'Not Found');
      expect(data.message).toContain('Order not found');
    });

    it('returns 400 Bad Request for empty or whitespace order ID parameter', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/%20%20');
      const res = await getOrderById(req, { params: { id: '   ' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
    });

    it('returns 200 OK with complete order relations for valid order ID', async () => {
      // First create a legitimate order
      const payload = createBenchmarkPayload();
      const createRes = await invokePostOrders(payload);
      expect(createRes.status).toBe(201);

      const orderId = createRes.data.order.orderId;
      const orderNumber = createRes.data.order.orderNumber;
      createdOrderIds.push(orderId);
      createdDesignIds.push(createRes.data.order.designId);
      createdOrderNumbers.push(orderNumber);

      // Query by internal cuid
      const reqById = new NextRequest(`http://localhost:3000/api/orders/${orderId}`);
      const resById = await getOrderById(reqById, { params: { id: orderId } });
      const dataById = await resById.json();

      expect(resById.status).toBe(200);
      expect(dataById.success).toBe(true);
      expect(dataById.order.id).toBe(orderId);
      expect(dataById.order.orderNumber).toBe(orderNumber);
      expect(dataById.order.obligations).toHaveLength(3);

      // Query by human-readable orderNumber
      const reqByNum = new NextRequest(`http://localhost:3000/api/orders/${orderNumber}`);
      const resByNum = await getOrderById(reqByNum, { params: { id: orderNumber } });
      const dataByNum = await resByNum.json();

      expect(resByNum.status).toBe(200);
      expect(dataByNum.success).toBe(true);
      expect(dataByNum.order.id).toBe(orderId);
    });

    it('supports GET /api/orders with pagination parameters', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders?page=1&limit=5');
      const res = await getOrders(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.orders)).toBe(true);
      expect(data.pagination).toHaveProperty('page', 1);
      expect(data.pagination).toHaveProperty('limit', 5);
      expect(data.pagination).toHaveProperty('total');
    });
  });

  // =========================================================================
  // SECTION 5: SUPPLIER PRODUCTION SPECIFICATION (/api/orders/[id]/production)
  // =========================================================================
  describe('5. Supplier Production Spec Export (/api/orders/[id]/production)', () => {
    it('returns 404 cleanly for non-existent order ID without server exceptions', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/ghost-order-404/production');
      const res = await getOrderProduction(req, {
        params: { id: 'ghost-order-404' },
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error', 'Not Found');
      expect(data.message).toMatch(/Order not found/i);
    });

    it('returns 400 for empty or whitespace ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/%20/production');
      const res = await getOrderProduction(req, { params: { id: ' ' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
    });

    it('exports complete ProductionJobPackage with JSON attachment header for valid order', async () => {
      // Create a valid order with frontElements placement
      const payload = createBenchmarkPayload({
        frontElements: [
          {
            id: 'el-dash-1',
            artworkId: artDashApe.id,
            licenseOptionId: licDashApe40.id,
            title: 'Dash Ape Classic',
            previewUrl: 'https://cdn.ape-parel.com/artworks/dash-ape.png',
            creatorName: 'Dash Ape Studio',
            creatorId: creatorDashApe.id,
            surface: 'FRONT',
            x: 50,
            y: 35,
            width: 32,
            height: 32,
            rotation: 0,
            zIndex: 1,
            price: 40,
          },
        ],
      });

      const createRes = await invokePostOrders(payload);
      expect(createRes.status).toBe(201);

      const orderId = createRes.data.order.orderId;
      const orderNumber = createRes.data.order.orderNumber;
      createdOrderIds.push(orderId);
      createdDesignIds.push(createRes.data.order.designId);
      createdOrderNumbers.push(orderNumber);

      const req = new NextRequest(`http://localhost:3000/api/orders/${orderId}/production`);
      const res = await getOrderProduction(req, { params: { id: orderId } });

      expect(res.status).toBe(200);

      // Verify Content-Disposition attachment header
      const disposition = res.headers.get('Content-Disposition');
      expect(disposition).toBe(`attachment; filename="JOB-${orderNumber}.json"`);

      const jsonPackage = await res.json();

      // Verify schema conformity
      expect(jsonPackage).toHaveProperty('jobId', `JOB-${orderNumber}`);
      expect(jsonPackage).toHaveProperty('orderNumber', orderNumber);
      expect(jsonPackage).toHaveProperty('garment');
      expect(jsonPackage.garment.blankSku).toBe('APX-HVY-001');
      expect(jsonPackage).toHaveProperty('printingTechnique');
      expect(jsonPackage.printingTechnique.code).toBe('DTG');

      // Verify physical surface calculations
      expect(jsonPackage.surfaces).toHaveLength(1);
      const frontJob = jsonPackage.surfaces[0];
      expect(frontJob.surface).toBe('FRONT');
      expect(frontJob.printableAreaCm.width).toBe(35);
      expect(frontJob.printableAreaCm.height).toBe(45);

      const layer = frontJob.artworks[0];
      expect(layer.artworkId).toBe(artDashApe.id);
      expect(layer.placement.calculatedWidthCm).toBe(11.2); // (32 / 100) * 35 = 11.2
      expect(layer.placement.calculatedHeightCm).toBe(14.4); // (32 / 100) * 45 = 14.4
      expect(layer.placement.xCenterCm).toBe(17.5); // (50 / 100) * 35 = 17.5
      expect(layer.placement.yCenterCm).toBe(15.75); // (35 / 100) * 45 = 15.75
    });
  });

  // =========================================================================
  // SECTION 6: ROYALTY SETTLEMENT ENDPOINT (/api/royalties/settle)
  // =========================================================================
  describe('6. Royalty Settlement Endpoint (/api/royalties/settle)', () => {
    it('rejects POST /api/royalties/settle with non-existent creatorId with HTTP 404', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          creatorId: 'non-existent-creator-cuid-999',
        }),
      });
      const res = await postSettle(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error', 'Not Found');
    });

    it('rejects POST /api/royalties/settle with missing creatorId with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await postSettle(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error', 'Validation Error');
    });

    it('rejects POST /api/royalties/settle with invalid JSON with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{ corrupted',
      });
      const res = await postSettle(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error', 'Invalid JSON');
    });

    it('rejects POST /api/royalties/settle with invalid obligationId (hijack/mismatched) with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          creatorId: creatorDashApe.id,
          obligationIds: ['forged-obligation-id-not-belonging-to-creator'],
        }),
      });
      const res = await postSettle(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
    });

    it('rejects GET /api/royalties/settle without creatorId with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle');
      const res = await getSettleSummary(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty('error', 'Bad Request');
      expect(data.message).toContain('creatorId');
    });

    it('rejects GET /api/royalties/settle with non-existent creatorId with HTTP 404', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/royalties/settle?creatorId=non_existent_creator_999'
      );
      const res = await getSettleSummary(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data).toHaveProperty('error', 'Not Found');
    });

    it('returns 200 OK with complete CreatorLedgerSummary for legitimate creator', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/royalties/settle?creatorId=${creatorDashApe.id}`
      );
      const res = await getSettleSummary(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.creatorId).toBe(creatorDashApe.id);
      expect(data).toHaveProperty('currentBalance');
      expect(data).toHaveProperty('lifetimeEarnings');
      expect(data).toHaveProperty('totalSettled');
      expect(data).toHaveProperty('eligibleObligations');
      expect(data).toHaveProperty('settledObligations');
      expect(Array.isArray(data.recentLedgerEntries)).toBe(true);
    });
  });
});
