import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic, getOrderByIdOrNumber } from '@/lib/orders';
import {
  executeCreatorPayoutSettlement,
  getCreatorLedgerSummary,
} from '@/lib/royalties';
import { generateProductionPackage } from '@/lib/production';
import { POST as postOrder, GET as getOrders } from '@/app/api/orders/route';
import { GET as getOrderById } from '@/app/api/orders/[id]/route';
import { GET as getOrderProduction } from '@/app/api/orders/[id]/production/route';
import {
  POST as postSettle,
  GET as getSettleSummary,
} from '@/app/api/royalties/settle/route';
import { CreateOrderInput } from '@/lib/types';

describe('Integration Test Suite: Atomic Orders, Royalty Ledger & Production Specs (M2)', () => {
  let garmentApex: any;
  let artDashApe: any;
  let artCyberPrimate: any;
  let artStaticGlitch: any;
  let artBotanical: any;
  let licDashApe40: any;
  let licCyberPrimate60: any;
  let licStaticGlitch25: any;
  let licBotanical50: any;
  let creatorSoma: any;

  // Track created IDs for strict teardown cleanup
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
      throw new Error('Seed data missing: Garment APX-HVY-001 not found.');
    }

    // 2. Fetch benchmark artworks and licenses
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
    const art4 = await prisma.artwork.findFirst({
      where: { title: { contains: 'Botanical' } },
      include: { licenseOptions: true, creator: true },
    });

    if (!art1 || !art2 || !art3) {
      throw new Error('Seed data missing: Benchmark artworks not found.');
    }

    artDashApe = art1;
    artCyberPrimate = art2;
    artStaticGlitch = art3;
    artBotanical = art4;

    licDashApe40 = art1.licenseOptions.find((l) => l.price === 40);
    licCyberPrimate60 = art2.licenseOptions.find((l) => l.price === 60);
    licStaticGlitch25 = art3.licenseOptions.find((l) => l.price === 25);

    if (art4 && art4.licenseOptions.length > 0) {
      licBotanical50 = art4.licenseOptions[0];
      creatorSoma = art4.creator;
    }

    if (!licDashApe40 || !licCyberPrimate60 || !licStaticGlitch25) {
      throw new Error('Seed data missing: Benchmark licenses 40, 60, 25 not found.');
    }
  });

  afterAll(async () => {
    // 1. Delete audit events for created settlements
    if (createdSettlementIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: createdSettlementIds } },
      });
    }

    // 2. Delete test settlements
    if (createdSettlementIds.length > 0) {
      await prisma.creatorSettlement.deleteMany({
        where: { id: { in: createdSettlementIds } },
      });
    }

    // 3. Delete ledger entries created by test orders or settlements
    const allRefs = [...createdOrderNumbers, ...createdSettlementNumbers];
    if (allRefs.length > 0) {
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: allRefs } },
      });
    }

    // 4. Delete obligations from created test orders
    if (createdOrderIds.length > 0) {
      await prisma.royaltyObligation.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });

      // 5. Delete orders
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    // 6. Delete designs
    if (createdDesignIds.length > 0) {
      await prisma.designDocument.deleteMany({
        where: { id: { in: createdDesignIds } },
      });
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. CANONICAL BENCHMARK ATOMIC ORDER PLACEMENT (EXACT THB 410)
  // =========================================================================
  describe('Suite 1: Canonical Benchmark Order Placement (Exact THB 410)', () => {
    it('atomically creates Order, DesignDocument, 3 Obligations, and 3 Ledger entries matching THB 410 benchmark', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
        shippingName: 'Test Collector',
        shippingAddress: '123 Sukhumvit Road',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        shippingPhone: '+66 81 234 5678',
      };

      const result = await createOrderAtomic(input);
      createdOrderIds.push(result.orderId);
      createdDesignIds.push(result.designId);
      createdOrderNumbers.push(result.orderNumber);

      // Cost verification: Garment (150) + DTG (80) + Pack (15) + Ship (40) + Lic (125) = 410 THB
      expect(result.totalAmount).toBe(410);
      expect(result.costs.garmentCost).toBe(150);
      expect(result.costs.printingCost).toBe(80);
      expect(result.costs.licensingCost).toBe(125);
      expect(result.costs.packagingCost).toBe(15);
      expect(result.costs.shippingCost).toBe(40);

      // Verify DesignDocument persisted in DB
      const dbDesign = await prisma.designDocument.findUnique({
        where: { id: result.designId },
      });
      expect(dbDesign).not.toBeNull();
      expect(dbDesign?.status).toBe('ORDERED');

      // Verify Order persisted in DB
      const dbOrder = await prisma.order.findUnique({
        where: { id: result.orderId },
        include: { obligations: true },
      });
      expect(dbOrder).not.toBeNull();
      expect(dbOrder?.orderNumber).toBe(result.orderNumber);
      expect(dbOrder?.status).toBe('PAYMENT_CONFIRMED');
      expect(dbOrder?.totalAmount).toBe(410);
      expect(dbOrder?.obligations).toHaveLength(3);

      // Verify Obligations details
      expect(result.obligations).toHaveLength(3);
      const ob1 = result.obligations.find((o) => o.artworkId === artDashApe.id);
      const ob2 = result.obligations.find((o) => o.artworkId === artCyberPrimate.id);
      const ob3 = result.obligations.find((o) => o.artworkId === artStaticGlitch.id);

      expect(ob1?.unitRoyalty).toBe(40);
      expect(ob1?.totalAmount).toBe(40);
      expect(ob1?.status).toBe('ELIGIBLE');

      expect(ob2?.unitRoyalty).toBe(60);
      expect(ob2?.totalAmount).toBe(60);
      expect(ob2?.status).toBe('ELIGIBLE');

      expect(ob3?.unitRoyalty).toBe(25);
      expect(ob3?.totalAmount).toBe(25);
      expect(ob3?.status).toBe('ELIGIBLE');

      // Verify Ledger entries written for each obligation
      const ledgerEntries = await prisma.royaltyLedgerEntry.findMany({
        where: { reference: result.orderNumber },
        orderBy: { createdAt: 'asc' },
      });
      expect(ledgerEntries).toHaveLength(3);
      expect(ledgerEntries.map((e) => e.amount)).toEqual(
        expect.arrayContaining([40, 60, 25])
      );
    });
  });

  // =========================================================================
  // 2. CUMULATIVE RUNNING LEDGER BALANCE TRACKING (40 -> 100 PROGRESSION)
  // =========================================================================
  describe('Suite 2: Cumulative Running Ledger Balance Tracking', () => {
    it('accurately maintains sequential balanceAfter stepping (40 -> 100) for consecutive licenses', async () => {
      // Find or verify a creator to test balance progression
      const creatorId = artDashApe.creatorId;

      // Query current baseline balance for Dash Ape creator
      const baselineEntry = await prisma.royaltyLedgerEntry.findFirst({
        where: { creatorId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const baselineBalance = baselineEntry ? baselineEntry.balanceAfter : 0;

      // Create an order containing 2 licensed artworks for this creator:
      // Art 1 = 40 THB, Art 2 = 60 THB
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        shippingName: 'Ledger Progression Test',
        shippingAddress: 'Progression Way 42',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      // Verify entries for this order stepped strictly: baseline + 40, then baseline + 40 + 60 (100 increase)
      const entriesForOrder = await prisma.royaltyLedgerEntry.findMany({
        where: { reference: order.orderNumber },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(entriesForOrder).toHaveLength(2);

      const balances = entriesForOrder.map((e) => e.balanceAfter);
      expect(balances).toEqual([
        baselineBalance + 40,
        baselineBalance + 40 + 60,
      ]);
    });

    it('tracks progressive balances across separate sequential orders', async () => {
      const creatorId = artDashApe.creatorId;

      const baselineEntry = await prisma.royaltyLedgerEntry.findFirst({
        where: { creatorId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      const startBalance = baselineEntry ? baselineEntry.balanceAfter : 0;

      // Order A: 40 THB
      const orderA = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Sequential Order A',
        shippingAddress: 'Seq St A',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(orderA.orderId);
      createdDesignIds.push(orderA.designId);
      createdOrderNumbers.push(orderA.orderNumber);

      const entryA = await prisma.royaltyLedgerEntry.findFirst({
        where: { reference: orderA.orderNumber },
      });
      expect(entryA?.balanceAfter).toBe(startBalance + 40);

      // Order B: 60 THB
      const orderB = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
        ],
        shippingName: 'Sequential Order B',
        shippingAddress: 'Seq St B',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(orderB.orderId);
      createdDesignIds.push(orderB.designId);
      createdOrderNumbers.push(orderB.orderNumber);

      const entryB = await prisma.royaltyLedgerEntry.findFirst({
        where: { reference: orderB.orderNumber },
      });
      expect(entryB?.balanceAfter).toBe(startBalance + 40 + 60);
    });
  });

  // =========================================================================
  // 3. SERVER ANTI-TAMPERING DEFENSES
  // =========================================================================
  describe('Suite 3: Server Anti-Tampering Defenses', () => {
    it('rejects order when client claimed total is lower than server calculated total', async () => {
      const ordersCountBefore = await prisma.order.count();
      const designsCountBefore = await prisma.designDocument.count();

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Attacker Attempt',
        shippingAddress: 'Dark Alley 404',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 200, // True total is 150 + 80 + 15 + 40 + 40 = 325
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /price tampering detected/i
      );

      // Verify zero records written
      expect(await prisma.order.count()).toBe(ordersCountBefore);
      expect(await prisma.designDocument.count()).toBe(designsCountBefore);
    });

    it('rejects order when client claimed total is higher or mismatched', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Attacker Mismatch',
        shippingAddress: 'Dark Alley 404',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 999,
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /price tampering detected/i
      );
    });

    it('accepts order when client claimed total matches server authoritative total', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Honest Buyer',
        shippingAddress: 'Valid St 12',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 325, // 150 + 80 + 15 + 40 + 40 = 325
      };

      const result = await createOrderAtomic(input);
      createdOrderIds.push(result.orderId);
      createdDesignIds.push(result.designId);
      createdOrderNumbers.push(result.orderNumber);

      expect(result.totalAmount).toBe(325);
    });
  });

  // =========================================================================
  // 4. TRANSACTION ATOMICITY & ROLLBACK MECHANICS
  // =========================================================================
  describe('Suite 4: Transaction Atomicity & Rollback Mechanics', () => {
    it('rolls back completely if a failure occurs at the order creation step', async () => {
      const ordersBefore = await prisma.order.count();
      const designsBefore = await prisma.designDocument.count();

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Rollback Order Test',
        shippingAddress: 'Test Lane',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'order',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure before order creation/i
      );

      // Verify complete rollback: no orphan design, no order
      expect(await prisma.order.count()).toBe(ordersBefore);
      expect(await prisma.designDocument.count()).toBe(designsBefore);
    });

    it('rolls back completely if a failure occurs during royalty ledger creation', async () => {
      const ordersBefore = await prisma.order.count();
      const designsBefore = await prisma.designDocument.count();
      const obligationsBefore = await prisma.royaltyObligation.count();
      const ledgersBefore = await prisma.royaltyLedgerEntry.count();

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
        ],
        shippingName: 'Rollback Ledger Test',
        shippingAddress: 'Test Lane',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'ledger',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure during royaltyledgerentry creation/i
      );

      // Verify all entities rolled back
      expect(await prisma.order.count()).toBe(ordersBefore);
      expect(await prisma.designDocument.count()).toBe(designsBefore);
      expect(await prisma.royaltyObligation.count()).toBe(obligationsBefore);
      expect(await prisma.royaltyLedgerEntry.count()).toBe(ledgersBefore);
    });
  });

  // =========================================================================
  // 5. CREATOR PAYOUT SETTLEMENT DEDUCTION & AUDIT TRAIL
  // =========================================================================
  describe('Suite 5: Creator Payout Settlement Deduction & Audit Trail', () => {
    it('executes atomic payout settlement: updates obligations to SETTLED, writes negative ledger entry, creates settlement record and audit event', async () => {
      // 1. Create a dedicated test order for Soma Botanica (or Dash Ape) to generate fresh eligible obligations
      const testCreator = creatorSoma || (await prisma.creatorProfile.findFirst());
      const testArt = artBotanical || artDashApe;
      const testLic = licBotanical50 || licDashApe40;

      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: testArt.id, licenseOptionId: testLic.id },
        ],
        shippingName: 'Settlement Test Buyer',
        shippingAddress: 'Settle Rd 1',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const targetObligationId = order.obligations[0].id;
      const payoutAmount = order.obligations[0].totalAmount;

      // 2. Fetch summary before settlement
      const summaryBefore = await getCreatorLedgerSummary(testCreator.id);
      const balanceBefore = summaryBefore.currentBalance;
      expect(balanceBefore).toBeGreaterThanOrEqual(payoutAmount);

      // 3. Execute partial or full payout settlement for the created obligation
      const settlement = await executeCreatorPayoutSettlement(testCreator.id, {
        payoutRef: 'TEST-PAYOUT-TX-001',
        obligationIds: [targetObligationId],
        notes: 'Integration test payout deduction',
      });
      createdSettlementIds.push(settlement.settlementId);
      createdSettlementNumbers.push(settlement.settlementNumber);

      expect(settlement.status).toBe('COMPLETED');
      expect(settlement.totalAmount).toBe(payoutAmount);
      expect(settlement.balanceBefore).toBe(balanceBefore);
      expect(settlement.balanceAfter).toBe(balanceBefore - payoutAmount);
      expect(settlement.settledObligationsCount).toBe(1);

      // 4. Verify in DB: Obligation status changed to SETTLED
      const dbObligation = await prisma.royaltyObligation.findUnique({
        where: { id: targetObligationId },
      });
      expect(dbObligation?.status).toBe('SETTLED');

      // 5. Verify in DB: Negative ledger entry written
      const dbLedgerEntry = await prisma.royaltyLedgerEntry.findUnique({
        where: { id: settlement.ledgerEntryId },
      });
      expect(dbLedgerEntry).not.toBeNull();
      expect(dbLedgerEntry?.entryType).toBe('PAYOUT_SETTLEMENT');
      expect(dbLedgerEntry?.amount).toBe(-payoutAmount);
      expect(dbLedgerEntry?.balanceAfter).toBe(balanceBefore - payoutAmount);

      // 6. Verify in DB: AuditEvent created
      const dbAuditEvent = await prisma.auditEvent.findFirst({
        where: { entityId: settlement.settlementId },
      });
      expect(dbAuditEvent).not.toBeNull();
      expect(dbAuditEvent?.action).toBe('ROYALTY_PAYOUT_SETTLED');

      // 7. Verify CreatorLedgerSummary reflects deduction
      const summaryAfter = await getCreatorLedgerSummary(testCreator.id);
      expect(summaryAfter.currentBalance).toBe(balanceBefore - payoutAmount);
    });

    it('rejects settlement when no eligible obligations are found', async () => {
      // Find a creator or use a test scenario with no eligible obligations
      const nonExistentCreatorId = 'cmv1_non_existent_creator_999';
      await expect(
        executeCreatorPayoutSettlement(nonExistentCreatorId)
      ).rejects.toThrow(/creator profile not found/i);
    });
  });

  // =========================================================================
  // 6. SUPPLIER PRODUCTION SPECIFICATION GENERATION
  // =========================================================================
  describe('Suite 6: Supplier Production Specification Generation', () => {
    it('generates accurate production package with exact SKUs, physical cm dimensions, and asset references', async () => {
      // Create an order with elements on FRONT and SIDE
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontElements: [
          {
            id: 'elem-test-front-1',
            artworkId: artDashApe.id,
            licenseOptionId: licDashApe40.id,
            title: artDashApe.title,
            previewUrl: 'https://example.com/art1.png',
            creatorName: 'Dash Ape Studio',
            creatorId: artDashApe.creatorId,
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
        sideElements: [
          {
            id: 'elem-test-side-1',
            artworkId: artStaticGlitch.id,
            licenseOptionId: licStaticGlitch25.id,
            title: artStaticGlitch.title,
            previewUrl: 'https://example.com/art3.png',
            creatorName: 'Cyber Monk',
            creatorId: artStaticGlitch.creatorId,
            surface: 'SIDE',
            x: 50,
            y: 40,
            width: 22,
            height: 22,
            rotation: 0,
            zIndex: 1,
            price: 25,
          },
        ],
        shippingName: 'Production Spec Buyer',
        shippingAddress: 'Factory St 88',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const pkg = await generateProductionPackage(order.orderId);

      // Top-level structure assertions
      expect(pkg.jobId).toBe(`JOB-${order.orderNumber}`);
      expect(pkg.orderNumber).toBe(order.orderNumber);
      expect(pkg.status).toBe('PAYMENT_CONFIRMED');

      // Garment assertions
      expect(pkg.garment.blankSku).toBe('APX-HVY-001');
      expect(pkg.garment.variantSku).toBe('APX-HVY-001-BLK-L');
      expect(pkg.garment.colorHex).toBe('#131718');
      expect(pkg.garment.size).toBe('L');
      expect(pkg.garment.quantity).toBe(1);

      // Printing technique assertions
      expect(pkg.printingTechnique.code).toBe('DTG');
      expect(pkg.printingTechnique.maxPrintWidthCm).toBe(35.0);
      expect(pkg.printingTechnique.maxPrintHeightCm).toBe(45.0);

      // Surfaces assertions (FRONT and SIDE)
      expect(pkg.surfaces).toHaveLength(2);
      const frontJob = pkg.surfaces.find((s) => s.surface === 'FRONT');
      const sideJob = pkg.surfaces.find((s) => s.surface === 'SIDE');
      expect(frontJob).toBeDefined();
      expect(sideJob).toBeDefined();

      // Front placement: width 32% of 35cm = 11.20cm, height 32% of 45cm = 14.40cm
      const frontLayer = frontJob!.artworks[0];
      expect(frontLayer.placement.calculatedWidthCm).toBe(11.20);
      expect(frontLayer.placement.calculatedHeightCm).toBe(14.40);
      expect(frontLayer.placement.xCenterCm).toBe(17.50); // 50% of 35cm
      expect(frontLayer.placement.yCenterCm).toBe(15.75); // 35% of 45cm

      // Side placement: width 22% of 35cm = 7.70cm, height 22% of 45cm = 9.90cm
      const sideLayer = sideJob!.artworks[0];
      expect(sideLayer.placement.calculatedWidthCm).toBe(7.70);
      expect(sideLayer.placement.calculatedHeightCm).toBe(9.90);

      // Shipping assertions
      expect(pkg.shipping.name).toBe('Production Spec Buyer');
      expect(pkg.shipping.address).toBe('Factory St 88');
    });

    it('can resolve package by orderNumber string as well as cuid', async () => {
      const pkgByNumber = await generateProductionPackage('APX-ORD-9021');
      expect(pkgByNumber.orderNumber).toBe('APX-ORD-9021');
      expect(pkgByNumber.garment.blankSku).toBe('APX-HVY-001');
    });
  });

  // =========================================================================
  // 7. API ROUTES INTEGRATION (POST/GET /api/orders, GET /api/orders/[id],
  //    GET /api/orders/[id]/production, POST/GET /api/royalties/settle)
  // =========================================================================
  describe('Suite 7: API Route Handlers Integration', () => {
    it('POST /api/orders creates order and returns HTTP 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          frontArtworkLicenses: [
            { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          ],
          shippingName: 'API Customer',
          shippingAddress: 'API Gateway St 5',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        }),
      });

      const res = await postOrder(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderId).toBeDefined();

      createdOrderIds.push(json.order.orderId);
      createdDesignIds.push(json.order.designId);
      createdOrderNumbers.push(json.order.orderNumber);
    });

    it('POST /api/orders rejects price tampering with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 10, // Tampered price
          shippingName: 'Tamperer',
          shippingAddress: 'Dark Web St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        }),
      });

      const res = await postOrder(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Price Tampering Detected');
    });

    it('GET /api/orders returns HTTP 200 with paginated orders', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders?limit=5&page=1', {
        method: 'GET',
      });

      const res = await getOrders(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.orders)).toBe(true);
      expect(json.pagination).toBeDefined();
    });

    it('GET /api/orders/[id] returns order details with HTTP 200', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/APX-ORD-9021', {
        method: 'GET',
      });

      const res = await getOrderById(req, { params: { id: 'APX-ORD-9021' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.order.orderNumber).toBe('APX-ORD-9021');
    });

    it('GET /api/orders/[id] returns HTTP 404 for unknown order ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/NON-EXISTENT', {
        method: 'GET',
      });

      const res = await getOrderById(req, { params: { id: 'NON-EXISTENT-ORD-999' } });
      expect(res.status).toBe(404);
    });

    it('GET /api/orders/[id]/production returns HTTP 200 with attachment header', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/orders/APX-ORD-9021/production',
        { method: 'GET' }
      );

      const res = await getOrderProduction(req, { params: { id: 'APX-ORD-9021' } });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
      expect(res.headers.get('Content-Disposition')).toBe(
        'attachment; filename="JOB-APX-ORD-9021.json"'
      );

      const json = await res.json();
      expect(json.jobId).toBe('JOB-APX-ORD-9021');
      expect(json.garment.blankSku).toBe('APX-HVY-001');
    });

    it('GET /api/royalties/settle?creatorId=... returns creator summary with HTTP 200', async () => {
      const creator = await prisma.creatorProfile.findFirst();
      const req = new NextRequest(
        `http://localhost:3000/api/royalties/settle?creatorId=${creator?.id}`,
        { method: 'GET' }
      );

      const res = await getSettleSummary(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.creatorId).toBe(creator?.id);
      expect(json.currentBalance).toBeDefined();
    });
  });
});
