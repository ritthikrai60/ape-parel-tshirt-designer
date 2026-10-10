import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic } from '@/lib/orders';
import {
  executeCreatorPayoutSettlement,
  getCreatorLedgerSummary,
} from '@/lib/royalties';
import { CreateOrderInput } from '@/lib/types';

describe('Challenger M2: Empirical Adversarial Stress Test Suite', () => {
  let garmentApex: any;

  // Dedicated test-isolated entities so challenger tests never collide with worker tests
  let challengerUser: any;
  let challengerCreator: any;
  let artChallengerAlpha: any;
  let artChallengerBeta: any;
  let licAlpha40: any;
  let licBeta60: any;

  // Rogue second creator for cross-creator security checks
  let rogueUser: any;
  let rogueCreator: any;
  let artRogue: any;
  let licRogue25: any;

  // Tracking arrays for clean, deterministic teardown
  const createdUserIds: string[] = [];
  const createdCreatorIds: string[] = [];
  const createdArtworkIds: string[] = [];
  const createdLicenseIds: string[] = [];
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
        supplier: true,
      },
    });
    if (!garmentApex) {
      throw new Error('Garment APX-HVY-001 not found in database.');
    }

    // 2. Create isolated test creator 1 (Challenger Lab)
    challengerUser = await prisma.user.create({
      data: {
        email: `challenger-test-${Date.now()}@ape-parel.com`,
        name: 'Challenger Studio',
        role: 'CREATOR',
      },
    });
    createdUserIds.push(challengerUser.id);

    challengerCreator = await prisma.creatorProfile.create({
      data: {
        userId: challengerUser.id,
        slug: `challenger-studio-${Date.now()}`,
        displayName: 'Challenger Test Studio',
        bio: 'Isolated test creator for adversarial validation.',
      },
    });
    createdCreatorIds.push(challengerCreator.id);

    // Create 2 artworks for Challenger Creator
    artChallengerAlpha = await prisma.artwork.create({
      data: {
        creatorId: challengerCreator.id,
        title: 'Challenger Stress Alpha',
        previewUrl: 'https://example.com/alpha.png',
        category: 'ILLUSTRATION',
      },
    });
    createdArtworkIds.push(artChallengerAlpha.id);

    licAlpha40 = await prisma.licenseOption.create({
      data: {
        artworkId: artChallengerAlpha.id,
        name: 'Alpha 40 THB License',
        price: 40,
      },
    });
    createdLicenseIds.push(licAlpha40.id);

    artChallengerBeta = await prisma.artwork.create({
      data: {
        creatorId: challengerCreator.id,
        title: 'Challenger Stress Beta',
        previewUrl: 'https://example.com/beta.png',
        category: 'ILLUSTRATION',
      },
    });
    createdArtworkIds.push(artChallengerBeta.id);

    licBeta60 = await prisma.licenseOption.create({
      data: {
        artworkId: artChallengerBeta.id,
        name: 'Beta 60 THB License',
        price: 60,
      },
    });
    createdLicenseIds.push(licBeta60.id);

    // 3. Create isolated test creator 2 (Rogue Studio)
    rogueUser = await prisma.user.create({
      data: {
        email: `challenger-rogue-${Date.now()}@ape-parel.com`,
        name: 'Rogue Creator',
        role: 'CREATOR',
      },
    });
    createdUserIds.push(rogueUser.id);

    rogueCreator = await prisma.creatorProfile.create({
      data: {
        userId: rogueUser.id,
        slug: `rogue-studio-${Date.now()}`,
        displayName: 'Rogue Test Studio',
        bio: 'Isolated rogue creator for cross-tenant validation.',
      },
    });
    createdCreatorIds.push(rogueCreator.id);

    artRogue = await prisma.artwork.create({
      data: {
        creatorId: rogueCreator.id,
        title: 'Rogue Artwork',
        previewUrl: 'https://example.com/rogue.png',
        category: 'PATTERN',
      },
    });
    createdArtworkIds.push(artRogue.id);

    licRogue25 = await prisma.licenseOption.create({
      data: {
        artworkId: artRogue.id,
        name: 'Rogue 25 THB License',
        price: 25,
      },
    });
    createdLicenseIds.push(licRogue25.id);
  });

  afterAll(async () => {
    // Teardown all entities created during this test run in reverse dependency order
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

    // Also delete any ledger entries specifically for our test creators
    if (createdCreatorIds.length > 0) {
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { creatorId: { in: createdCreatorIds } },
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
  // SECTION 1: ATOMIC ROLLBACK ON ERROR (ZERO ORPHAN ENTITY VERIFICATION)
  // =========================================================================
  describe('1. Atomic Rollback on Error & Zero Orphan Entities', () => {
    it('rolls back completely on simulated failure before Design creation (step: design)', async () => {
      const shippingName = 'Rollback-Step-Design';
      const designTitle = 'Rollback-Design-Test-1';

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        designTitle,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName,
        shippingAddress: 'Rollback Way 1',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'design',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure before designdocument creation/i
      );

      // Verify ZERO records created for this attempted transaction
      expect(await prisma.order.findFirst({ where: { shippingName } })).toBeNull();
      expect(await prisma.designDocument.findFirst({ where: { title: designTitle } })).toBeNull();
      expect(await prisma.royaltyObligation.count({ where: { artworkId: artChallengerAlpha.id } })).toBe(0);
      expect(await prisma.royaltyLedgerEntry.count({ where: { creatorId: challengerCreator.id } })).toBe(0);
    });

    it('rolls back completely on simulated failure before Order creation (step: order)', async () => {
      const shippingName = 'Rollback-Step-Order';
      const designTitle = 'Rollback-Design-Test-2';

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        designTitle,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName,
        shippingAddress: 'Rollback Way 2',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'order',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure before order creation/i
      );

      expect(await prisma.order.findFirst({ where: { shippingName } })).toBeNull();
      expect(await prisma.designDocument.findFirst({ where: { title: designTitle } })).toBeNull();
      expect(await prisma.royaltyObligation.count({ where: { artworkId: artChallengerAlpha.id } })).toBe(0);
      expect(await prisma.royaltyLedgerEntry.count({ where: { creatorId: challengerCreator.id } })).toBe(0);
    });

    it('rolls back completely on simulated failure before RoyaltyObligation creation (step: obligation)', async () => {
      const shippingName = 'Rollback-Step-Obligation';
      const designTitle = 'Rollback-Design-Test-3';

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        designTitle,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName,
        shippingAddress: 'Rollback Way 3',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'obligation',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure before royaltyobligation creation/i
      );

      expect(await prisma.order.findFirst({ where: { shippingName } })).toBeNull();
      expect(await prisma.designDocument.findFirst({ where: { title: designTitle } })).toBeNull();
      expect(await prisma.royaltyObligation.count({ where: { artworkId: artChallengerAlpha.id } })).toBe(0);
      expect(await prisma.royaltyLedgerEntry.count({ where: { creatorId: challengerCreator.id } })).toBe(0);
    });

    it('rolls back completely on simulated failure during RoyaltyLedgerEntry creation (step: ledger)', async () => {
      const shippingName = 'Rollback-Step-Ledger';
      const designTitle = 'Rollback-Design-Test-4';

      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        designTitle,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
          { artworkId: artChallengerBeta.id, licenseOptionId: licBeta60.id },
        ],
        shippingName,
        shippingAddress: 'Rollback Way 4',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        _simulateFailureAtStep: 'ledger',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /simulated failure during royaltyledgerentry creation/i
      );

      expect(await prisma.order.findFirst({ where: { shippingName } })).toBeNull();
      expect(await prisma.designDocument.findFirst({ where: { title: designTitle } })).toBeNull();
      expect(await prisma.royaltyObligation.count({ where: { artworkId: artChallengerAlpha.id } })).toBe(0);
      expect(await prisma.royaltyLedgerEntry.count({ where: { creatorId: challengerCreator.id } })).toBe(0);
    });

    it('rolls back completely when an unhandled database error occurs without simulation hooks', async () => {
      const shippingName = 'Rollback-Step-Unhandled';
      const designTitle = 'Rollback-Design-Test-5';

      const input: CreateOrderInput = {
        garmentProductId: 'non_existent_garment_cuid_99999',
        quantity: 1,
        designTitle,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName,
        shippingAddress: 'Stress Test Way',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      };

      await expect(createOrderAtomic(input)).rejects.toThrow();

      expect(await prisma.order.findFirst({ where: { shippingName } })).toBeNull();
      expect(await prisma.designDocument.findFirst({ where: { title: designTitle } })).toBeNull();
      expect(await prisma.royaltyObligation.count({ where: { artworkId: artChallengerAlpha.id } })).toBe(0);
      expect(await prisma.royaltyLedgerEntry.count({ where: { creatorId: challengerCreator.id } })).toBe(0);
    });
  });

  // =========================================================================
  // SECTION 2: CUMULATIVE RUNNING BALANCE ACCURACY & MULTI-ITEM INTEGRITY
  // =========================================================================
  describe('2. Cumulative Running Ledger Balance Accuracy', () => {
    it('maintains strict mathematical balance progression across 5 consecutive orders without drift', async () => {
      const creatorId = challengerCreator.id;

      // Start at 0 for this isolated creator
      let expectedBalance = 0;
      const amounts = [40, 60, 40, 60, 40];
      const licenses = [licAlpha40, licBeta60, licAlpha40, licBeta60, licAlpha40];
      const artworks = [
        artChallengerAlpha,
        artChallengerBeta,
        artChallengerAlpha,
        artChallengerBeta,
        artChallengerAlpha,
      ];

      for (let i = 0; i < amounts.length; i++) {
        const order = await createOrderAtomic({
          garmentProductId: garmentApex.id,
          quantity: 1,
          frontArtworkLicenses: [
            {
              artworkId: artworks[i].id,
              licenseOptionId: licenses[i].id,
            },
          ],
          shippingName: `Consecutive Buyer ${i + 1}`,
          shippingAddress: `Seq St ${i + 1}`,
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        });

        createdOrderIds.push(order.orderId);
        createdDesignIds.push(order.designId);
        createdOrderNumbers.push(order.orderNumber);

        expectedBalance += amounts[i];

        const latestEntry = await prisma.royaltyLedgerEntry.findFirst({
          where: { reference: order.orderNumber },
        });
        expect(latestEntry).not.toBeNull();
        expect(latestEntry?.amount).toBe(amounts[i]);
        expect(latestEntry?.balanceAfter).toBe(expectedBalance);
      }

      // Final summary check matches exact arithmetic sum
      const summary = await getCreatorLedgerSummary(creatorId);
      expect(summary.currentBalance).toBe(240); // 40 + 60 + 40 + 60 + 40
      expect(summary.lifetimeEarnings).toBe(240);
      expect(summary.totalSettled).toBe(0);
    });

    it('correctly updates in-transaction running balance when order contains multiple licenses for same creator', async () => {
      const creatorId = challengerCreator.id;
      const baseSummary = await getCreatorLedgerSummary(creatorId);
      const startBalance = baseSummary.currentBalance;

      // Order with Alpha (40 THB) and Beta (60 THB) in the same cart
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
          { artworkId: artChallengerBeta.id, licenseOptionId: licBeta60.id },
        ],
        shippingName: 'Multi License Single Order',
        shippingAddress: 'Multi St 1',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const entries = await prisma.royaltyLedgerEntry.findMany({
        where: { reference: order.orderNumber },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(entries).toHaveLength(2);

      // In-transaction stepping: first entry gets startBalance + 40, second entry gets startBalance + 100
      expect(entries[0].balanceAfter).toBe(startBalance + 40);
      expect(entries[1].balanceAfter).toBe(startBalance + 100);

      const postSummary = await getCreatorLedgerSummary(creatorId);
      expect(postSummary.currentBalance).toBe(startBalance + 100);
    });

    it('tracks distinct creators across front, back, and side surfaces without cross-contamination', async () => {
      const creator1Id = challengerCreator.id;
      const creator2Id = rogueCreator.id;

      const base1 = (await getCreatorLedgerSummary(creator1Id)).currentBalance;
      const base2 = (await getCreatorLedgerSummary(creator2Id)).currentBalance;

      // Multi-surface order:
      // Front: Alpha (40) [Creator 1]
      // Back: Beta (60) [Creator 1]
      // Side: Rogue (25) [Creator 2]
      const multiOrder = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        backArtworkLicenses: [
          { artworkId: artChallengerBeta.id, licenseOptionId: licBeta60.id },
        ],
        sideArtworkLicenses: [
          { artworkId: artRogue.id, licenseOptionId: licRogue25.id },
        ],
        shippingName: 'Multi Creator Surface Test',
        shippingAddress: 'Cross St 10',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(multiOrder.orderId);
      createdDesignIds.push(multiOrder.designId);
      createdOrderNumbers.push(multiOrder.orderNumber);

      expect(multiOrder.obligationsCount).toBe(3);
      expect(multiOrder.ledgerEntriesCount).toBe(3);

      // Verify Creator 1 ledger progression: +40, then +60
      const c1Entries = await prisma.royaltyLedgerEntry.findMany({
        where: { creatorId: creator1Id, reference: multiOrder.orderNumber },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(c1Entries).toHaveLength(2);
      expect(c1Entries[0].amount).toBe(40);
      expect(c1Entries[0].balanceAfter).toBe(base1 + 40);
      expect(c1Entries[1].amount).toBe(60);
      expect(c1Entries[1].balanceAfter).toBe(base1 + 100);

      // Verify Creator 2 ledger: +25 only
      const c2Entries = await prisma.royaltyLedgerEntry.findMany({
        where: { creatorId: creator2Id, reference: multiOrder.orderNumber },
      });
      expect(c2Entries).toHaveLength(1);
      expect(c2Entries[0].amount).toBe(25);
      expect(c2Entries[0].balanceAfter).toBe(base2 + 25);
    });

    it('interleaves earnings and settlements with perfect balance fidelity', async () => {
      // Test full lifecycle for Rogue Creator
      const creatorId = rogueCreator.id;
      const startBalance = (await getCreatorLedgerSummary(creatorId)).currentBalance;

      // 1. Order 1: +50 THB (qty 2 * 25 THB)
      const order1 = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 2,
        frontArtworkLicenses: [
          { artworkId: artRogue.id, licenseOptionId: licRogue25.id },
        ],
        shippingName: 'Interleave 1',
        shippingAddress: 'Interleave Ln',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order1.orderId);
      createdDesignIds.push(order1.designId);
      createdOrderNumbers.push(order1.orderNumber);

      const balAfterOrder1 = startBalance + 50;
      expect((await getCreatorLedgerSummary(creatorId)).currentBalance).toBe(balAfterOrder1);

      // 2. Partial Settlement of Order 1: -50 THB
      const settle1 = await executeCreatorPayoutSettlement(creatorId, {
        obligationIds: [order1.obligations[0].id],
        payoutRef: 'INTERLEAVE-PAYOUT-1',
      });
      createdSettlementIds.push(settle1.settlementId);
      createdSettlementNumbers.push(settle1.settlementNumber);

      expect(settle1.balanceAfter).toBe(startBalance);
      expect((await getCreatorLedgerSummary(creatorId)).currentBalance).toBe(startBalance);

      // 3. Order 2: +75 THB (qty 3 * 25 THB)
      const order2 = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 3,
        frontArtworkLicenses: [
          { artworkId: artRogue.id, licenseOptionId: licRogue25.id },
        ],
        shippingName: 'Interleave 2',
        shippingAddress: 'Interleave Ln',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order2.orderId);
      createdDesignIds.push(order2.designId);
      createdOrderNumbers.push(order2.orderNumber);

      expect((await getCreatorLedgerSummary(creatorId)).currentBalance).toBe(startBalance + 75);

      // 4. Full Settlement of remaining: -75 THB
      const settle2 = await executeCreatorPayoutSettlement(creatorId, {
        obligationIds: [order2.obligations[0].id],
        payoutRef: 'INTERLEAVE-PAYOUT-2',
      });
      createdSettlementIds.push(settle2.settlementId);
      createdSettlementNumbers.push(settle2.settlementNumber);

      expect(settle2.balanceAfter).toBe(startBalance);
      expect((await getCreatorLedgerSummary(creatorId)).currentBalance).toBe(startBalance);
    });
  });

  // =========================================================================
  // SECTION 3: PAYOUT SETTLEMENT DEFENSES & INVARIANT VERIFICATION
  // =========================================================================
  describe('3. Payout Settlement Defenses & Financial Invariants', () => {
    it('rejects payout settlement if creator has zero eligible obligations', async () => {
      // Create a brand new creator with zero orders
      const emptyUser = await prisma.user.create({
        data: {
          email: `empty-creator-${Date.now()}@ape-parel.com`,
          name: 'Zero Obligations Creator',
          role: 'CREATOR',
        },
      });
      createdUserIds.push(emptyUser.id);

      const emptyCreator = await prisma.creatorProfile.create({
        data: {
          userId: emptyUser.id,
          slug: `zero-creator-${Date.now()}`,
          displayName: 'Zero Creator',
        },
      });
      createdCreatorIds.push(emptyCreator.id);

      await expect(
        executeCreatorPayoutSettlement(emptyCreator.id)
      ).rejects.toThrow(/no eligible royalty obligations found/i);
    });

    it('strictly prevents double-settlement of already SETTLED obligations', async () => {
      // Create an order for Challenger Creator
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName: 'Double Spend Target',
        shippingAddress: 'Defense Lane',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const targetObId = order.obligations[0].id;

      // Settlement 1: MUST succeed
      const s1 = await executeCreatorPayoutSettlement(challengerCreator.id, {
        obligationIds: [targetObId],
        payoutRef: 'LEGIT-PAYOUT-001',
      });
      createdSettlementIds.push(s1.settlementId);
      createdSettlementNumbers.push(s1.settlementNumber);
      expect(s1.status).toBe('COMPLETED');

      // Settlement 2 on the exact same obligation: MUST fail and be rejected
      await expect(
        executeCreatorPayoutSettlement(challengerCreator.id, {
          obligationIds: [targetObId],
          payoutRef: 'DOUBLE-SPEND-ATTEMPT',
        })
      ).rejects.toThrow(/no eligible royalty obligations found/i);
    });

    it('rejects cross-creator obligation hijacking attempt', async () => {
      // Order belonging to Challenger Creator
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName: 'Victim Order',
        shippingAddress: 'Victim Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const victimObligationId = order.obligations[0].id;

      // Rogue Creator attempts to claim Challenger Creator's obligation
      await expect(
        executeCreatorPayoutSettlement(rogueCreator.id, {
          obligationIds: [victimObligationId],
          payoutRef: 'HIJACK-ATTEMPT',
        })
      ).rejects.toThrow(/no eligible royalty obligations found/i);
    });

    it('rejects settlement when mixed valid and invalid obligations are requested', async () => {
      // Create 1 legitimate obligation for Challenger Creator
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName: 'Mixed Obligation Test',
        shippingAddress: 'Mixed Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const validId = order.obligations[0].id;
      const fakeId = 'cmv_fake_obligation_id_99999';

      // Request includes 1 valid and 1 non-existent/invalid obligation
      await expect(
        executeCreatorPayoutSettlement(challengerCreator.id, {
          obligationIds: [validId, fakeId],
          payoutRef: 'MIXED-ATTEMPT',
        })
      ).rejects.toThrow(/not in ELIGIBLE status or do not belong to creator/i);
    });

    it('strictly preserves the fundamental financial invariant: currentBalance === lifetimeEarnings - totalSettled', async () => {
      const summary1 = await getCreatorLedgerSummary(challengerCreator.id);
      expect(summary1.currentBalance).toBe(
        summary1.lifetimeEarnings - summary1.totalSettled
      );

      const summary2 = await getCreatorLedgerSummary(rogueCreator.id);
      expect(summary2.currentBalance).toBe(
        summary2.lifetimeEarnings - summary2.totalSettled
      );
    });
  });

  // =========================================================================
  // SECTION 4: CONCURRENCY & RACE CONDITIONS UNDER SQLITE
  // =========================================================================
  describe('4. Concurrency & Race Condition Defenses under SQLite', () => {
    it('handles concurrent order placements with Promise.all without balance drift', async () => {
      const creatorId = challengerCreator.id;
      const preSummary = await getCreatorLedgerSummary(creatorId);
      const preBalance = preSummary.currentBalance;

      // Dispatch 3 concurrent orders
      const promises = [1, 2, 3].map((i) =>
        createOrderAtomic({
          garmentProductId: garmentApex.id,
          quantity: 1,
          frontArtworkLicenses: [
            { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
          ],
          shippingName: `Concurrent Buyer ${i}`,
          shippingAddress: `Race Track ${i}`,
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        })
      );

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
      );

      for (const res of fulfilled) {
        createdOrderIds.push(res.value.orderId);
        createdDesignIds.push(res.value.designId);
        createdOrderNumbers.push(res.value.orderNumber);
      }

      // SQLite serialized transactions: final balance must match exactly preBalance + (fulfilledCount * 40)
      const postSummary = await getCreatorLedgerSummary(creatorId);
      expect(postSummary.currentBalance).toBe(preBalance + fulfilled.length * 40);

      // Verify each fulfilled order persisted all its relations
      for (const res of fulfilled) {
        const orderInDb = await prisma.order.findUnique({
          where: { id: res.value.orderId },
          include: { obligations: true },
        });
        expect(orderInDb).not.toBeNull();
        expect(orderInDb?.obligations).toHaveLength(1);
      }
    });

    it('safely handles concurrent double-settlement calls without double-paying', async () => {
      // Create a single order to generate exactly 1 eligible obligation
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerBeta.id, licenseOptionId: licBeta60.id },
        ],
        shippingName: 'Concurrent Race Settle',
        shippingAddress: 'Single Settle Ln',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });
      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      const targetObId = order.obligations[0].id;
      const targetAmount = order.obligations[0].totalAmount;

      const preBalance = (await getCreatorLedgerSummary(challengerCreator.id)).currentBalance;

      // Fire 2 concurrent settlement requests for the exact same obligation
      const results = await Promise.allSettled([
        executeCreatorPayoutSettlement(challengerCreator.id, {
          obligationIds: [targetObId],
          payoutRef: 'RACE-SETTLE-A',
        }),
        executeCreatorPayoutSettlement(challengerCreator.id, {
          obligationIds: [targetObId],
          payoutRef: 'RACE-SETTLE-B',
        }),
      ]);

      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
      );
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      );

      for (const f of fulfilled) {
        createdSettlementIds.push(f.value.settlementId);
        createdSettlementNumbers.push(f.value.settlementNumber);
      }

      // CRITICAL INVARIANT: Exactly 1 succeeds, exactly 1 fails
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Balance must decrease by targetAmount exactly ONCE
      const postBalance = (await getCreatorLedgerSummary(challengerCreator.id)).currentBalance;
      expect(postBalance).toBe(preBalance - targetAmount);
    });
  });

  // =========================================================================
  // SECTION 5: BOUNDARY INPUTS & SERVER ANTI-TAMPERING VALIDATION
  // =========================================================================
  describe('5. Boundary Inputs & Anti-Tampering Defenses', () => {
    it('rejects order with clientClaimedTotal off by even 1 THB (409 instead of 410)', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName: 'Tamperer 1',
        shippingAddress: 'Cheat St',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 324, // Real total: 150 + 80 + 15 + 40 + 40 = 325
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /price tampering detected/i
      );
    });

    it('rejects order with clientClaimedTotal 326 instead of 325', async () => {
      const input: CreateOrderInput = {
        garmentProductId: garmentApex.id,
        quantity: 1,
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName: 'Tamperer 2',
        shippingAddress: 'Cheat St',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        clientClaimedTotal: 326,
      };

      await expect(createOrderAtomic(input)).rejects.toThrow(
        /price tampering detected/i
      );
    });

    it('clamps quantity <= 0 to at least 1 unit safely', async () => {
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        quantity: 0, // Clamped to 1
        frontArtworkLicenses: [
          { artworkId: artChallengerAlpha.id, licenseOptionId: licAlpha40.id },
        ],
        shippingName: 'Zero Qty Buyer',
        shippingAddress: 'Clamp St 1',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(order.orderId);
      createdDesignIds.push(order.designId);
      createdOrderNumbers.push(order.orderNumber);

      expect(order.order.quantity).toBe(1);
      expect(order.totalAmount).toBe(325);
    });
  });
});
