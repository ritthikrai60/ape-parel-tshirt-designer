import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { createOrderAtomic } from '@/lib/orders';
import {
  executeCreatorPayoutSettlement,
  getCreatorLedgerSummary,
} from '@/lib/royalties';
import { POST as postPricingApi } from '@/app/api/pricing/calculate/route';
import { POST as postOrderApi } from '@/app/api/orders/route';
import {
  POST as postSettleApi,
  GET as getSettleSummaryApi,
} from '@/app/api/royalties/settle/route';
import { CreateOrderInput } from '@/lib/types';

describe('Challenger M5: Empirical Adversarial Stress Harness (Pricing, Orders, Ledger & Settlements)', () => {
  let garmentApex: any;
  let artDashApe: any;
  let artCyberPrimate: any;
  let artStaticGlitch: any;
  let licDashApe40: any;
  let licCyberPrimate60: any;
  let licStaticGlitch25: any;

  // Isolated test entities for zero-side-effect adversarial verification
  let isolatedUser1: any;
  let isolatedCreator1: any;
  let isolatedArt1: any;
  let isolatedLic1_40: any;
  let isolatedLic1_60: any;

  let isolatedUser2: any;
  let isolatedCreator2: any;
  let isolatedArt2: any;
  let isolatedLic2_25: any;

  // Teardown tracking arrays
  const testOrderIds: string[] = [];
  const testDesignIds: string[] = [];
  const testSettlementIds: string[] = [];
  const testOrderNumbers: string[] = [];
  const testSettlementNumbers: string[] = [];
  const testLicenseIds: string[] = [];
  const testArtworkIds: string[] = [];
  const testCreatorIds: string[] = [];
  const testUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch benchmark garment APX-HVY-001
    garmentApex = await prisma.garmentProduct.findUniqueOrThrow({
      where: { sku: 'APX-HVY-001' },
      include: {
        variants: true,
        supplier: { include: { printingServices: true } },
      },
    });

    // 2. Fetch benchmark artworks and licenses
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

    licDashApe40 = a1.licenseOptions.find((l) => l.price === 40)!;
    licCyberPrimate60 = a2.licenseOptions.find((l) => l.price === 60)!;
    licStaticGlitch25 = a3.licenseOptions.find((l) => l.price === 25)!;

    // 3. Setup isolated test creator 1
    isolatedUser1 = await prisma.user.create({
      data: {
        email: `emp-challenger-c1-${Date.now()}@ape-parel.com`,
        name: 'Empirical Challenger Studio 1',
        role: 'CREATOR',
      },
    });
    testUserIds.push(isolatedUser1.id);

    isolatedCreator1 = await prisma.creatorProfile.create({
      data: {
        userId: isolatedUser1.id,
        slug: `emp-challenger-c1-${Date.now()}`,
        displayName: 'Empirical Creator 1',
        bio: 'Isolated test creator for challenger M5',
        payoutDetails: 'PromptPay: 089-111-2233',
      },
    });
    testCreatorIds.push(isolatedCreator1.id);

    isolatedArt1 = await prisma.artwork.create({
      data: {
        creatorId: isolatedCreator1.id,
        title: 'Empirical Artwork 1',
        previewUrl: 'https://example.com/art1.png',
        category: 'ILLUSTRATION',
      },
    });
    testArtworkIds.push(isolatedArt1.id);

    isolatedLic1_40 = await prisma.licenseOption.create({
      data: {
        artworkId: isolatedArt1.id,
        name: 'Standard Commercial 40 THB',
        price: 40,
      },
    });
    testLicenseIds.push(isolatedLic1_40.id);

    isolatedLic1_60 = await prisma.licenseOption.create({
      data: {
        artworkId: isolatedArt1.id,
        name: 'Extended Commercial 60 THB',
        price: 60,
      },
    });
    testLicenseIds.push(isolatedLic1_60.id);

    // 4. Setup isolated test creator 2
    isolatedUser2 = await prisma.user.create({
      data: {
        email: `emp-challenger-c2-${Date.now()}@ape-parel.com`,
        name: 'Empirical Challenger Studio 2',
        role: 'CREATOR',
      },
    });
    testUserIds.push(isolatedUser2.id);

    isolatedCreator2 = await prisma.creatorProfile.create({
      data: {
        userId: isolatedUser2.id,
        slug: `emp-challenger-c2-${Date.now()}`,
        displayName: 'Empirical Creator 2',
        bio: 'Isolated test creator 2 for challenger M5',
        payoutDetails: 'Bank: KBank 123-4-56789-0',
      },
    });
    testCreatorIds.push(isolatedCreator2.id);

    isolatedArt2 = await prisma.artwork.create({
      data: {
        creatorId: isolatedCreator2.id,
        title: 'Empirical Artwork 2',
        previewUrl: 'https://example.com/art2.png',
        category: 'PATTERN',
      },
    });
    testArtworkIds.push(isolatedArt2.id);

    isolatedLic2_25 = await prisma.licenseOption.create({
      data: {
        artworkId: isolatedArt2.id,
        name: 'Standard Commercial 25 THB',
        price: 25,
      },
    });
    testLicenseIds.push(isolatedLic2_25.id);
  });

  afterAll(async () => {
    // Teardown audit events
    if (testSettlementIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: testSettlementIds } },
      });
      await prisma.creatorSettlement.deleteMany({
        where: { id: { in: testSettlementIds } },
      });
    }

    // Teardown ledger entries
    const allRefs = [...testOrderNumbers, ...testSettlementNumbers];
    if (allRefs.length > 0) {
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: allRefs } },
      });
    }
    if (testCreatorIds.length > 0) {
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { creatorId: { in: testCreatorIds } },
      });
    }

    // Teardown obligations
    if (testOrderIds.length > 0) {
      await prisma.royaltyObligation.deleteMany({
        where: { orderId: { in: testOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: testOrderIds } },
      });
    }

    // Teardown designs
    if (testDesignIds.length > 0) {
      await prisma.designDocument.deleteMany({
        where: { id: { in: testDesignIds } },
      });
    }

    // Teardown test licenses, artworks, creators, users
    if (testLicenseIds.length > 0) {
      await prisma.licenseOption.deleteMany({
        where: { id: { in: testLicenseIds } },
      });
    }
    if (testArtworkIds.length > 0) {
      await prisma.artwork.deleteMany({
        where: { id: { in: testArtworkIds } },
      });
    }
    if (testCreatorIds.length > 0) {
      await prisma.creatorProfile.deleteMany({
        where: { id: { in: testCreatorIds } },
      });
    }
    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. PRICING MATH & ANTI-TAMPERING ADVERSARIAL CHALLENGES
  // =========================================================================
  describe('1. Pricing Math & Anti-Tampering Adversarial Challenges', () => {
    it('empirically verifies THB 410 benchmark: Garment (150) + DTG (80) + Packaging (15) + Shipping (40) + Licenses (40+60+25=125) = 410', async () => {
      const pricing = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artDashApe.id, licenseOptionId: licDashApe40.id },
          { artworkId: artCyberPrimate.id, licenseOptionId: licCyberPrimate60.id },
          { artworkId: artStaticGlitch.id, licenseOptionId: licStaticGlitch25.id },
        ],
      });

      expect(pricing.garmentCost).toBe(150);
      expect(pricing.printingCost).toBe(80);
      expect(pricing.packagingCost).toBe(15);
      expect(pricing.shippingCost).toBe(40);
      expect(pricing.licensingCost).toBe(125);
      expect(pricing.totalAmount).toBe(410);

      // Verify exact sum identity
      const manualSum =
        pricing.garmentCost +
        pricing.printingCost +
        pricing.packagingCost +
        pricing.shippingCost +
        pricing.licensingCost;
      expect(pricing.totalAmount).toBe(manualSum);
    });

    it('rejects client price tampering with lower claimed total (e.g. 409 vs 410)', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 409, // 1 THB cheaper attempt
          shippingName: 'Tamper Lower',
          shippingAddress: '123 Exploit Way',
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
      expect(json.message).toContain('Price tampering detected');
    });

    it('rejects client price tampering with higher claimed total (e.g. 411 vs 410)', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          quantity: 1,
          clientClaimedTotal: 411, // 1 THB higher attempt
          shippingName: 'Tamper Higher',
          shippingAddress: '123 Exploit Way',
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

    it('rejects fee spoofing: custom price passed in design elements is completely ignored by server engine', async () => {
      // Attacker attempts to spoof license price as 1 THB in frontElements
      const spoofedOrderInput: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontElements: [
          {
            id: 'spoofed-elem-1',
            artworkId: artDashApe.id,
            licenseOptionId: licDashApe40.id,
            title: artDashApe.title,
            previewUrl: 'https://example.com/art.png',
            creatorName: 'Dash Ape',
            creatorId: artDashApe.creatorId,
            surface: 'FRONT',
            x: 50,
            y: 40,
            width: 30,
            height: 30,
            rotation: 0,
            zIndex: 1,
            price: 1, // Spoofed 1 THB instead of DB 40 THB
          },
        ],
        shippingName: 'Spoof Attacker',
        shippingAddress: '123 Cheat St',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      };

      const result = await createOrderAtomic(spoofedOrderInput);
      testOrderIds.push(result.orderId);
      testDesignIds.push(result.designId);
      testOrderNumbers.push(result.orderNumber);

      // Server must authoritatively charge DB price 40 THB:
      // Garment (150) + DTG (80) + Packaging (15) + Shipping (40) + License (40) = 325 THB
      expect(result.totalAmount).toBe(325);
      expect(result.costs.licensingCost).toBe(40);
      expect(result.obligations[0].unitRoyalty).toBe(40);
      expect(result.obligations[0].totalAmount).toBe(40);
    });

    it('rejects invalid or non-existent license option ID with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            {
              artworkId: artDashApe.id,
              licenseOptionId: 'cmv_non_existent_license_cuid_999',
            },
          ],
        }),
      });

      const res = await postPricingApi(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain('License option not found');
    });

    it('rejects mismatched license option (license belonging to artwork A claimed for artwork B)', async () => {
      const req = new NextRequest('http://localhost:3000/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentProductId: garmentApex.id,
          frontArtworkLicenses: [
            {
              artworkId: artCyberPrimate.id, // Mismatched artwork
              licenseOptionId: licDashApe40.id, // Belongs to Dash Ape
            },
          ],
        }),
      });

      const res = await postPricingApi(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain('does not belong to artwork');
    });

    it('safely handles boundary quantities: 0, negative, fractional, and huge numbers', async () => {
      // 1. Quantity 0 in pricing engine clamps to 1
      const zeroQtyResult = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 0,
      });
      expect(zeroQtyResult.quantity).toBe(1);
      expect(zeroQtyResult.totalAmount).toBe(285); // 150 + 80 + 15 + 40

      // 2. Negative quantity in pricing engine clamps to 1
      const negQtyResult = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: -50,
      });
      expect(negQtyResult.quantity).toBe(1);

      // 3. Fractional quantity in pricing engine floors to integer
      const floatQtyResult = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 3.7,
      });
      expect(floatQtyResult.quantity).toBe(3);

      // 4. API level validation strictly rejects non-integer or <= 0 quantities
      const apiZero = await postPricingApi(
        new NextRequest('http://localhost:3000/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            garmentProductId: garmentApex.id,
            quantity: 0,
          }),
        })
      );
      expect(apiZero.status).toBe(400);

      const apiNeg = await postPricingApi(
        new NextRequest('http://localhost:3000/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            garmentProductId: garmentApex.id,
            quantity: -5,
          }),
        })
      );
      expect(apiNeg.status).toBe(400);

      const apiFloat = await postPricingApi(
        new NextRequest('http://localhost:3000/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            garmentProductId: garmentApex.id,
            quantity: 2.5,
          }),
        })
      );
      expect(apiFloat.status).toBe(400);

      // 5. Huge quantity scales safely without integer overflow
      const hugeResult = await calculateLivePricing({
        garmentProductId: garmentApex.id,
        quantity: 1000000,
      });
      expect(hugeResult.quantity).toBe(1000000);
      expect(hugeResult.totalAmount).toBe(
        (150 + 80 + 15) * 1000000 + 40
      );
      expect(Number.isSafeInteger(hugeResult.totalAmount)).toBe(true);
    });
  });

  // =========================================================================
  // 2. ATOMIC ORDER CREATION & ACID ROLLBACK GUARANTEES
  // =========================================================================
  describe('2. Atomic Order Creation & ACID Rollback Guarantees', () => {
    it('verifies rollback on error leaves ZERO orphan records across all intermediate steps', async () => {
      const steps: Array<'design' | 'order' | 'obligation' | 'ledger'> = [
        'design',
        'order',
        'obligation',
        'ledger',
      ];

      for (const step of steps) {
        const canaryTag = `Empirical-Canary-${step}-${Date.now()}`;

        const input: CreateOrderInput = {
          garmentProductId: garmentApex.id,
          quantity: 1,
          designTitle: canaryTag,
          shippingName: canaryTag,
          shippingAddress: 'Rollback St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          frontArtworkLicenses: [
            { artworkId: isolatedArt1.id, licenseOptionId: isolatedLic1_40.id },
          ],
          _simulateFailureAtStep: step,
        };

        await expect(createOrderAtomic(input)).rejects.toThrow();

        // Check database for any partial records
        const orphanDesign = await prisma.designDocument.findFirst({
          where: { title: canaryTag },
        });
        const orphanOrder = await prisma.order.findFirst({
          where: { shippingName: canaryTag },
        });
        const orphanObligation = await prisma.royaltyObligation.count({
          where: { order: { shippingName: canaryTag } },
        });
        const orphanLedger = await prisma.royaltyLedgerEntry.count({
          where: { notes: { contains: canaryTag } },
        });

        expect(orphanDesign).toBeNull();
        expect(orphanOrder).toBeNull();
        expect(orphanObligation).toBe(0);
        expect(orphanLedger).toBe(0);
      }
    });

    it('empirically verifies sequential in-transaction balance stepping for multi-license orders (e.g. 40 -> 100)', async () => {
      const creatorId = isolatedCreator1.id;
      const initialSummary = await getCreatorLedgerSummary(creatorId);
      const initialBalance = initialSummary.currentBalance;

      // Create an order containing 2 license lines for isolatedCreator1: 40 THB + 60 THB
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: isolatedArt1.id, licenseOptionId: isolatedLic1_40.id },
          { artworkId: isolatedArt1.id, licenseOptionId: isolatedLic1_60.id },
        ],
        shippingName: 'In-Transaction Step Buyer',
        shippingAddress: '42 Step Ave',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      testOrderIds.push(order.orderId);
      testDesignIds.push(order.designId);
      testOrderNumbers.push(order.orderNumber);

      const entries = await prisma.royaltyLedgerEntry.findMany({
        where: { reference: order.orderNumber },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      expect(entries).toHaveLength(2);
      expect(entries[0].amount).toBe(40);
      expect(entries[0].balanceAfter).toBe(initialBalance + 40);
      expect(entries[1].amount).toBe(60);
      expect(entries[1].balanceAfter).toBe(initialBalance + 100);

      const postSummary = await getCreatorLedgerSummary(creatorId);
      expect(postSummary.currentBalance).toBe(initialBalance + 100);
    });

    it('verifies strict ledger immutability and mathematical balance integrity', async () => {
      const creatorId = isolatedCreator1.id;
      const summary = await getCreatorLedgerSummary(creatorId);

      // Verify that all ledger entries for this creator sum to currentBalance
      const entries = await prisma.royaltyLedgerEntry.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'asc' },
      });

      let runningCalc = 0;
      for (const entry of entries) {
        runningCalc += entry.amount;
        expect(entry.balanceAfter).toBe(runningCalc);
      }

      expect(summary.currentBalance).toBe(runningCalc);
      expect(summary.currentBalance).toBe(
        summary.lifetimeEarnings - summary.totalSettled
      );
    });
  });

  // =========================================================================
  // 3. CREATOR PAYOUT SETTLEMENT ADVERSARIAL STRESS TESTING
  // =========================================================================
  describe('3. Creator Payout Settlement Adversarial Stress Testing', () => {
    it('executes atomic creator payout settlement, transitions obligations to SETTLED, posts negative ledger entry and audit event', async () => {
      const creatorId = isolatedCreator1.id;
      const summaryBefore = await getCreatorLedgerSummary(creatorId);
      expect(summaryBefore.eligibleObligations.count).toBeGreaterThan(0);

      const eligibleAmount = summaryBefore.eligibleObligations.totalAmount;
      const balanceBefore = summaryBefore.currentBalance;

      // Settle all eligible obligations
      const settlement = await executeCreatorPayoutSettlement(creatorId, {
        payoutRef: 'CHALLENGER-PAYOUT-REF-001',
        notes: 'Challenger M5 Batch Settlement',
      });
      testSettlementIds.push(settlement.settlementId);
      testSettlementNumbers.push(settlement.settlementNumber);

      expect(settlement.status).toBe('COMPLETED');
      expect(settlement.totalAmount).toBe(eligibleAmount);
      expect(settlement.balanceBefore).toBe(balanceBefore);
      expect(settlement.balanceAfter).toBe(balanceBefore - eligibleAmount);

      // Verify all settled obligations in DB are now SETTLED
      for (const obId of settlement.settledObligationIds) {
        const ob = await prisma.royaltyObligation.findUnique({
          where: { id: obId },
        });
        expect(ob?.status).toBe('SETTLED');
      }

      // Verify negative ledger entry exists
      const dbLedger = await prisma.royaltyLedgerEntry.findUnique({
        where: { id: settlement.ledgerEntryId },
      });
      expect(dbLedger?.entryType).toBe('PAYOUT_SETTLEMENT');
      expect(dbLedger?.amount).toBe(-eligibleAmount);
      expect(dbLedger?.balanceAfter).toBe(balanceBefore - eligibleAmount);

      // Verify AuditEvent in DB
      const audit = await prisma.auditEvent.findFirst({
        where: { entityId: settlement.settlementId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.action).toBe('ROYALTY_PAYOUT_SETTLED');

      // Verify updated summary
      const summaryAfter = await getCreatorLedgerSummary(creatorId);
      expect(summaryAfter.currentBalance).toBe(balanceBefore - eligibleAmount);
      expect(summaryAfter.eligibleObligations.count).toBe(0);
      expect(summaryAfter.settledObligations.totalAmount).toBe(
        summaryBefore.settledObligations.totalAmount + eligibleAmount
      );
    });

    it('strictly prevents double-settlement of already-settled obligations', async () => {
      const creatorId = isolatedCreator1.id;

      // Attempting to settle again when 0 eligible obligations remain MUST throw
      await expect(
        executeCreatorPayoutSettlement(creatorId, {
          payoutRef: 'DOUBLE-SETTLE-ATTEMPT',
        })
      ).rejects.toThrow(/no eligible royalty obligations found/i);
    });

    it('rejects cross-creator obligation hijacking attempt', async () => {
      // Create an order for isolatedCreator2
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: isolatedArt2.id, licenseOptionId: isolatedLic2_25.id },
        ],
        shippingName: 'Cross Creator Victim',
        shippingAddress: 'Cross St',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      testOrderIds.push(order.orderId);
      testDesignIds.push(order.designId);
      testOrderNumbers.push(order.orderNumber);

      const targetObligationId = order.obligations[0].id;

      // isolatedCreator1 attempts to settle isolatedCreator2's obligation
      await expect(
        executeCreatorPayoutSettlement(isolatedCreator1.id, {
          obligationIds: [targetObligationId],
          payoutRef: 'HIJACK-ATTEMPT',
        })
      ).rejects.toThrow(/no eligible royalty obligations found/i);
    });

    it('protects against concurrent race double-settlement on the exact same obligation', async () => {
      // Create fresh obligation for isolatedCreator2
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: isolatedArt2.id, licenseOptionId: isolatedLic2_25.id },
        ],
        shippingName: 'Concurrent Race Target',
        shippingAddress: 'Race St',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      testOrderIds.push(order.orderId);
      testDesignIds.push(order.designId);
      testOrderNumbers.push(order.orderNumber);

      const obId = order.obligations[0].id;

      // Execute 2 concurrent settlements for the exact same obligation
      const [res1, res2] = await Promise.allSettled([
        executeCreatorPayoutSettlement(isolatedCreator2.id, {
          obligationIds: [obId],
          payoutRef: 'RACE-SETTLE-1',
        }),
        executeCreatorPayoutSettlement(isolatedCreator2.id, {
          obligationIds: [obId],
          payoutRef: 'RACE-SETTLE-2',
        }),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
      const rejected = [res1, res2].filter((r) => r.status === 'rejected');

      // Invariant: Exactly one must succeed, exactly one must fail
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      if (fulfilled[0].status === 'fulfilled') {
        testSettlementIds.push(fulfilled[0].value.settlementId);
        testSettlementNumbers.push(fulfilled[0].value.settlementNumber);
      }
    });

    it('rejects POST /api/royalties/settle with 400 Bad Request when non-eligible or invalid IDs are provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: isolatedCreator1.id,
          obligationIds: ['non_existent_obligation_id_999'],
        }),
      });

      const res = await postSettleApi(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Bad Request');
    });

    it('rejects POST /api/royalties/settle with 404 Not Found when creator does not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: 'non_existent_creator_cuid_999',
        }),
      });

      const res = await postSettleApi(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not Found');
    });
  });
});
