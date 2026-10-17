import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  recordAuditEvent,
  getAuditEventsForEntity,
  getLatestAuditEvent,
  parseAuditPayload,
  parseAuditMetadata,
  AuditAction,
} from '@/lib/audit';

describe('Milestone M1: Database Schema Expansion & Audit Infrastructure', () => {
  // Test entity tracking for cleanup
  const createdUserIds: string[] = [];
  const createdCreatorIds: string[] = [];
  const createdArtworkIds: string[] = [];
  const createdStorefrontSettingIds: string[] = [];
  const createdArtworkFileSpecIds: string[] = [];
  const createdCommissionRuleIds: string[] = [];
  const createdJournalEntryIds: string[] = [];
  const createdFinancialAccountIds: string[] = [];
  const createdReconciliationReportIds: string[] = [];
  const createdAuditEventIds: string[] = [];

  let baselineCreatorId: string;
  let baselineArtworkId: string;
  let baselineOrderId: string;

  beforeAll(async () => {
    // 1. Locate baseline seeded creator
    const creator = await prisma.creatorProfile.findFirst({
      where: { slug: 'dash-ape' },
    });
    if (!creator) {
      throw new Error('Baseline seed data missing: Creator dash-ape not found.');
    }
    baselineCreatorId = creator.id;

    // 2. Locate baseline seeded artwork
    const artwork = await prisma.artwork.findFirst({
      where: { creatorId: baselineCreatorId },
    });
    if (!artwork) {
      throw new Error('Baseline seed data missing: Artwork for dash-ape not found.');
    }
    baselineArtworkId = artwork.id;

    // 3. Locate baseline seeded benchmark order
    const order = await prisma.order.findFirst({
      where: { orderNumber: 'APX-ORD-9021' },
    });
    if (!order) {
      throw new Error('Baseline seed data missing: Order APX-ORD-9021 not found.');
    }
    baselineOrderId = order.id;
  });

  afterAll(async () => {
    // Clean up created test entities in strict reverse dependency order
    if (createdAuditEventIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { id: { in: createdAuditEventIds } },
      });
    }
    if (createdReconciliationReportIds.length > 0) {
      await prisma.reconciliationReport.deleteMany({
        where: { id: { in: createdReconciliationReportIds } },
      });
    }
    if (createdJournalEntryIds.length > 0) {
      await prisma.journalEntry.deleteMany({
        where: { id: { in: createdJournalEntryIds } },
      });
    }
    if (createdFinancialAccountIds.length > 0) {
      await prisma.financialAccount.deleteMany({
        where: { id: { in: createdFinancialAccountIds } },
      });
    }
    if (createdCommissionRuleIds.length > 0) {
      await prisma.commissionRule.deleteMany({
        where: { id: { in: createdCommissionRuleIds } },
      });
    }
    if (createdArtworkFileSpecIds.length > 0) {
      await prisma.artworkFileSpec.deleteMany({
        where: { id: { in: createdArtworkFileSpecIds } },
      });
    }
    if (createdStorefrontSettingIds.length > 0) {
      await prisma.creatorStorefrontSettings.deleteMany({
        where: { id: { in: createdStorefrontSettingIds } },
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
  });

  // ==========================================================================
  // SECTION 1: Baseline Seed Verification
  // ==========================================================================
  describe('1. Baseline Seed Verification & Environment Integrity', () => {
    it('verifies seeded creators and benchmark order exist and are unmodified', async () => {
      const creators = await prisma.creatorProfile.findMany();
      expect(creators.length).toBeGreaterThanOrEqual(3);

      const benchmarkOrder = await prisma.order.findUnique({
        where: { id: baselineOrderId },
      });
      expect(benchmarkOrder).not.toBeNull();
      expect(benchmarkOrder?.totalAmount).toBe(410);
    });

    it('verifies standard commission rule is present or active', async () => {
      const standardRule = await prisma.commissionRule.findFirst({
        where: { name: 'STANDARD_15_85' },
      });
      expect(standardRule).not.toBeNull();
      expect(standardRule?.platformRate).toBeCloseTo(0.15);
      expect(standardRule?.creatorRate).toBeCloseTo(0.85);
      expect(standardRule?.isActive).toBe(true);
    });

    it('verifies seeded storefront settings, file specs, and financial accounts exist', async () => {
      const dashApeSettings = await prisma.creatorStorefrontSettings.findUnique({
        where: { creatorId: baselineCreatorId },
      });
      expect(dashApeSettings).not.toBeNull();
      expect(dashApeSettings?.customSlug).toBe('dash-ape');
      expect(dashApeSettings?.badgeVerified).toBe(true);

      const art1Spec = await prisma.artworkFileSpec.findUnique({
        where: { artworkId: baselineArtworkId },
      });
      expect(art1Spec).not.toBeNull();
      expect(art1Spec?.dpi).toBe(300);
      expect(art1Spec?.hasTransparency).toBe(true);

      const dashApeAccount = await prisma.financialAccount.findUnique({
        where: { creatorId: baselineCreatorId },
      });
      expect(dashApeAccount).not.toBeNull();
      expect(dashApeAccount?.balance).toBe(85);
    });
  });

  // ==========================================================================
  // SECTION 2: Model 1 — CreatorStorefrontSettings
  // ==========================================================================
  describe('2. CreatorStorefrontSettings Model', () => {
    let testCreator1Id: string;
    let testCreator2Id: string;

    beforeAll(async () => {
      // Create isolated test creators to avoid modifying seeded data
      const user1 = await prisma.user.create({
        data: {
          email: `test-storefront-1-${Date.now()}@ape-parel.com`,
          name: 'Storefront Test Creator 1',
          role: 'CREATOR',
        },
      });
      createdUserIds.push(user1.id);

      const creator1 = await prisma.creatorProfile.create({
        data: {
          userId: user1.id,
          slug: `storefront-test-1-${Date.now()}`,
          displayName: 'Storefront Test 1',
        },
      });
      createdCreatorIds.push(creator1.id);
      testCreator1Id = creator1.id;

      const user2 = await prisma.user.create({
        data: {
          email: `test-storefront-2-${Date.now()}@ape-parel.com`,
          name: 'Storefront Test Creator 2',
          role: 'CREATOR',
        },
      });
      createdUserIds.push(user2.id);

      const creator2 = await prisma.creatorProfile.create({
        data: {
          userId: user2.id,
          slug: `storefront-test-2-${Date.now()}`,
          displayName: 'Storefront Test 2',
        },
      });
      createdCreatorIds.push(creator2.id);
      testCreator2Id = creator2.id;
    });

    it('creates, queries, and updates 1:1 storefront settings for a creator', async () => {
      const socialLinksJson = JSON.stringify({
        instagram: '@dashape_flagship',
        twitter: '@dashape_art',
        behance: 'dashape',
      });
      const themePrefsJson = JSON.stringify({
        primaryColor: '#131718',
        accentColor: '#DABA98',
        layout: 'grid',
      });
      const featuredArtworksJson = JSON.stringify([baselineArtworkId]);
      const uniqueSlug = `flagship-test-${Date.now()}`;

      const settings = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: testCreator1Id,
          customSlug: uniqueSlug,
          bio: 'Underground cybernetic streetwear creator and digital print pioneer.',
          bannerUrl: '/uploads/banners/dash-ape-banner-test.png',
          avatarUrl: '/uploads/avatars/dash-ape-avatar-test.png',
          socialLinks: socialLinksJson,
          themePreferences: themePrefsJson,
          featuredArtworkIds: featuredArtworksJson,
          badgeVerified: true,
        },
      });

      createdStorefrontSettingIds.push(settings.id);

      expect(settings.id).toBeDefined();
      expect(settings.customSlug).toBe(uniqueSlug);
      expect(settings.creatorId).toBe(testCreator1Id);
      expect(settings.badgeVerified).toBe(true);

      // Verify 1:1 relation retrieval via CreatorProfile
      const creatorWithSettings = await prisma.creatorProfile.findUnique({
        where: { id: testCreator1Id },
        include: { storefrontSettings: true },
      });

      expect(creatorWithSettings?.storefrontSettings).not.toBeNull();
      expect(creatorWithSettings?.storefrontSettings?.customSlug).toBe(uniqueSlug);

      // Verify update
      const updated = await prisma.creatorStorefrontSettings.update({
        where: { id: settings.id },
        data: { bio: 'Updated bio for streetwear studio.' },
      });
      expect(updated.bio).toBe('Updated bio for streetwear studio.');
    });

    it('enforces uniqueness on customSlug', async () => {
      const existingSettings = await prisma.creatorStorefrontSettings.findFirst({
        where: { creatorId: testCreator1Id },
      });
      if (!existingSettings || !existingSettings.customSlug) return;

      // Attempting to reuse customSlug on creator2 should throw
      await expect(
        prisma.creatorStorefrontSettings.create({
          data: {
            creatorId: testCreator2Id,
            customSlug: existingSettings.customSlug, // duplicate slug
          },
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SECTION 3: Model 2 — ArtworkFileSpec
  // ==========================================================================
  describe('3. ArtworkFileSpec Model', () => {
    let testIsolatedArtworkId: string;

    beforeAll(async () => {
      // Create an isolated test artwork under baseline creator
      const testArtwork = await prisma.artwork.create({
        data: {
          creatorId: baselineCreatorId,
          title: `Isolated Test Artwork ${Date.now()}`,
          previewUrl: 'https://example.com/test-artwork.png',
          category: 'ILLUSTRATION',
          status: 'PUBLISHED',
          moderationStatus: 'APPROVED',
        },
      });
      createdArtworkIds.push(testArtwork.id);
      testIsolatedArtworkId = testArtwork.id;
    });

    it('creates, queries, and validates 1:1 ArtworkFileSpec for master assets', async () => {
      const fileSpec = await prisma.artworkFileSpec.create({
        data: {
          artworkId: testIsolatedArtworkId,
          storagePath: 'public/uploads/masters/art-benchmark-master.png',
          storageKey: 'masters/art-benchmark-master.png',
          mimeType: 'image/png',
          width: 3600,
          height: 4800,
          dpi: 300,
          colorSpace: 'sRGB',
          hasTransparency: true,
          isVector: false,
          previewWatermarkedPath: 'public/uploads/previews/art-benchmark-watermarked.png',
          fileSize: 4194304, // 4 MB
        },
      });

      createdArtworkFileSpecIds.push(fileSpec.id);

      expect(fileSpec.id).toBeDefined();
      expect(fileSpec.dpi).toBe(300);
      expect(fileSpec.hasTransparency).toBe(true);

      // Verify 1:1 relation retrieval via Artwork
      const artworkWithSpec = await prisma.artwork.findUnique({
        where: { id: testIsolatedArtworkId },
        include: { fileSpec: true },
      });

      expect(artworkWithSpec?.fileSpec).not.toBeNull();
      expect(artworkWithSpec?.fileSpec?.dpi).toBe(300);
      expect(artworkWithSpec?.fileSpec?.width).toBe(3600);
    });
  });

  // ==========================================================================
  // SECTION 4: Model 3 — CommissionRule
  // ==========================================================================
  describe('4. CommissionRule Model', () => {
    it('creates and validates custom CommissionRule rates and status', async () => {
      const ruleName = `TEST_TIER_VIP_${Date.now()}`;
      const customRule = await prisma.commissionRule.create({
        data: {
          name: ruleName,
          platformRate: 0.10,
          creatorRate: 0.90,
          isActive: true,
          description: 'Special VIP creator tier: 10% platform, 90% creator.',
        },
      });

      createdCommissionRuleIds.push(customRule.id);

      expect(customRule.name).toBe(ruleName);
      expect(customRule.platformRate).toBeCloseTo(0.10);
      expect(customRule.creatorRate).toBeCloseTo(0.90);
      expect(customRule.platformRate + customRule.creatorRate).toBeCloseTo(1.0);

      // Verify unique constraint on rule name
      await expect(
        prisma.commissionRule.create({
          data: {
            name: ruleName,
            platformRate: 0.20,
            creatorRate: 0.80,
          },
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SECTION 5: Models 4 & 5 — FinancialAccount & JournalEntry (Double-Entry)
  // ==========================================================================
  describe('5. Double-Entry Accounting Models (FinancialAccount & JournalEntry)', () => {
    let platformAccount: any;
    let escrowAccount: any;
    let creatorAccount: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      // Dedicated test user & creator for double-entry accounting
      const user = await prisma.user.create({
        data: {
          email: `test-accounting-${timestamp}@ape-parel.com`,
          name: 'Accounting Test Creator',
          role: 'CREATOR',
        },
      });
      createdUserIds.push(user.id);

      const creator = await prisma.creatorProfile.create({
        data: {
          userId: user.id,
          slug: `accounting-test-${timestamp}`,
          displayName: 'Accounting Test Creator',
        },
      });
      createdCreatorIds.push(creator.id);

      platformAccount = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-TEST-PLATFORM-${timestamp}`,
          accountType: 'PLATFORM',
          balance: 0,
          currency: 'THB',
        },
      });
      createdFinancialAccountIds.push(platformAccount.id);

      escrowAccount = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-TEST-ESCROW-${timestamp}`,
          accountType: 'ESCROW',
          balance: 0,
          currency: 'THB',
        },
      });
      createdFinancialAccountIds.push(escrowAccount.id);

      creatorAccount = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-TEST-CREATOR-${creator.id}`,
          accountType: 'CREATOR',
          creatorId: creator.id,
          balance: 0,
          currency: 'THB',
        },
      });
      createdFinancialAccountIds.push(creatorAccount.id);
    });

    it('records double-entry journal entries and maintains balance conservation', async () => {
      const grossAmount = 100; // 100 THB license GMV
      const platformShare = 15; // 15% platform commission
      const creatorShare = 85; // 85% creator royalty

      // 1. Customer order pays 100 THB into Escrow
      const entry1 = await prisma.journalEntry.create({
        data: {
          accountId: escrowAccount.id,
          entryType: 'CREDIT',
          amount: grossAmount,
          balanceAfter: grossAmount,
          orderId: baselineOrderId,
          reference: 'APX-ORD-9021',
          description: 'Customer payment received into escrow',
        },
      });
      createdJournalEntryIds.push(entry1.id);

      // 2. Escrow disburses 100 THB (Debit 100 -> balance 0)
      const entry2 = await prisma.journalEntry.create({
        data: {
          accountId: escrowAccount.id,
          entryType: 'DEBIT',
          amount: grossAmount,
          balanceAfter: 0,
          orderId: baselineOrderId,
          reference: 'APX-ORD-9021-SPLIT',
          description: 'Escrow split allocation',
        },
      });
      createdJournalEntryIds.push(entry2.id);

      // 3. Platform account receives 15 THB commission (Credit 15)
      const entry3 = await prisma.journalEntry.create({
        data: {
          accountId: platformAccount.id,
          entryType: 'CREDIT',
          amount: platformShare,
          balanceAfter: platformShare,
          orderId: baselineOrderId,
          reference: 'APX-ORD-9021-COMMISSION',
          description: '15% platform commission earned',
        },
      });
      createdJournalEntryIds.push(entry3.id);

      // 4. Creator account receives 85 THB royalty (Credit 85)
      const entry4 = await prisma.journalEntry.create({
        data: {
          accountId: creatorAccount.id,
          entryType: 'CREDIT',
          amount: creatorShare,
          balanceAfter: creatorShare,
          orderId: baselineOrderId,
          reference: 'APX-ORD-9021-ROYALTY',
          description: '85% creator royalty accrual',
        },
      });
      createdJournalEntryIds.push(entry4.id);

      // Conservation Check 1: Total Debits == Total Credits across the split transaction
      const splitDebits = entry2.amount; // 100
      const splitCredits = entry3.amount + entry4.amount; // 15 + 85 = 100
      expect(splitDebits).toBe(splitCredits);

      // Conservation Check 2: Account balance formula sum(Credits) - sum(Debits)
      const creatorEntries = await prisma.journalEntry.findMany({
        where: { accountId: creatorAccount.id },
      });
      const creditsSum = creatorEntries
        .filter((e) => e.entryType === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0);
      const debitsSum = creatorEntries
        .filter((e) => e.entryType === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0);

      expect(creditsSum - debitsSum).toBe(85);
    });
  });

  // ==========================================================================
  // SECTION 6: Model 6 — ReconciliationReport
  // ==========================================================================
  describe('6. ReconciliationReport Model', () => {
    it('creates, queries, and validates a periodic financial reconciliation report', async () => {
      const report = await prisma.reconciliationReport.create({
        data: {
          period: `2026-10-TEST-${Date.now()}`,
          periodStart: new Date('2026-10-01T00:00:00Z'),
          periodEnd: new Date('2026-10-31T23:59:59Z'),
          totalGmv: 410,
          totalCommission: 62,
          totalCreatorRoyalties: 348,
          matchedItemsCount: 3,
          discrepancyCount: 0,
          status: 'BALANCED',
          balanceConservationVerified: true,
          generatedBy: 'SYSTEM',
        },
      });

      createdReconciliationReportIds.push(report.id);

      expect(report.id).toBeDefined();
      expect(report.status).toBe('BALANCED');
      expect(report.balanceConservationVerified).toBe(true);
      expect(report.totalGmv).toBe(410);

      // Query report
      const fetched = await prisma.reconciliationReport.findUnique({
        where: { id: report.id },
      });
      expect(fetched?.matchedItemsCount).toBe(3);
      expect(fetched?.discrepancyCount).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 7: Audit Infrastructure & src/lib/audit.ts
  // ==========================================================================
  describe('7. Centralized Audit Service (src/lib/audit.ts)', () => {
    it('records standalone audit events with structured payload and metadata', async () => {
      const payloadData = {
        oldPrice: 40,
        newPrice: 55,
        currency: 'THB',
        updatedFields: ['price'],
      };
      const metadataData = {
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest/TestRunner',
        source: 'CREATOR_PORTAL',
      };

      const audit = await recordAuditEvent({
        action: AuditAction.LICENSE_PRICE_UPDATED,
        entityType: 'LicenseOption',
        entityId: 'lic-test-m1-id',
        actorId: 'CREATOR_SYSTEM',
        payload: payloadData,
        metadata: metadataData,
      });

      createdAuditEventIds.push(audit.id);

      expect(audit.id).toBeDefined();
      expect(audit.action).toBe(AuditAction.LICENSE_PRICE_UPDATED);
      expect(audit.entityType).toBe('LicenseOption');
      expect(audit.entityId).toBe('lic-test-m1-id');
      expect(audit.actorId).toBe('CREATOR_SYSTEM');

      // Verify payload and metadata parsing helpers
      const parsedPayload = parseAuditPayload(audit);
      expect(parsedPayload).toEqual(payloadData);

      const parsedMeta = parseAuditMetadata(audit);
      expect(parsedMeta).toEqual(metadataData);
    });

    it('records audit events inside a successful Prisma transaction', async () => {
      let createdAuditId = '';

      await prisma.$transaction(async (tx) => {
        const audit = await recordAuditEvent(
          {
            action: AuditAction.ORDER_STATUS_UPDATED,
            entityType: 'Order',
            entityId: baselineOrderId,
            actorId: 'ADMIN_OPERATOR',
            payload: { previousStatus: 'QUEUED', newStatus: 'IN_PRODUCTION' },
          },
          tx
        );
        createdAuditId = audit.id;
      });

      createdAuditEventIds.push(createdAuditId);

      // Confirm record exists in DB
      const dbRecord = await prisma.auditEvent.findUnique({
        where: { id: createdAuditId },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.action).toBe(AuditAction.ORDER_STATUS_UPDATED);
    });

    it('rolls back audit events atomically when a Prisma transaction fails (ACID Rollback)', async () => {
      let uncommittedAuditId = '';

      const failingTx = prisma.$transaction(async (tx) => {
        const audit = await recordAuditEvent(
          {
            action: 'ROLLBACK_TEST_ACTION',
            entityType: 'Order',
            entityId: baselineOrderId,
            actorId: 'SYSTEM',
            payload: { shouldRollback: true },
          },
          tx
        );
        uncommittedAuditId = audit.id;

        // Force a transaction failure
        throw new Error('Simulated transaction failure to test atomic rollback.');
      });

      await expect(failingTx).rejects.toThrow('Simulated transaction failure');

      // Verify uncommittedAuditId does NOT exist in the database
      expect(uncommittedAuditId).not.toBe('');
      const dbRecord = await prisma.auditEvent.findUnique({
        where: { id: uncommittedAuditId },
      });
      expect(dbRecord).toBeNull();
    });

    it('queries entity audit events with getAuditEventsForEntity and getLatestAuditEvent', async () => {
      const entityId = `entity-query-test-${Date.now()}`;

      const audit1 = await recordAuditEvent({
        action: 'STEP_1_INITIATED',
        entityType: 'TestWorkflow',
        entityId,
        payload: { step: 1 },
      });
      createdAuditEventIds.push(audit1.id);

      const audit2 = await recordAuditEvent({
        action: 'STEP_2_PROCESSED',
        entityType: 'TestWorkflow',
        entityId,
        payload: { step: 2 },
      });
      createdAuditEventIds.push(audit2.id);

      const events = await getAuditEventsForEntity('TestWorkflow', entityId, { order: 'asc' });
      expect(events.length).toBe(2);
      expect(events[0].action).toBe('STEP_1_INITIATED');
      expect(events[1].action).toBe('STEP_2_PROCESSED');

      const latest = await getLatestAuditEvent('TestWorkflow', entityId);
      expect(latest).not.toBeNull();
      expect(latest?.action).toBe('STEP_2_PROCESSED');
    });

    it('maintains backwards compatibility with existing legacy AuditEvent writes and queries', async () => {
      // Legacy code pattern: direct prisma.auditEvent.create without actorId or metadata
      const legacyAudit = await prisma.auditEvent.create({
        data: {
          action: 'LEGACY_DIRECT_WRITE',
          entityType: 'Order',
          entityId: baselineOrderId,
          payload: JSON.stringify({ legacy: true }),
        },
      });
      createdAuditEventIds.push(legacyAudit.id);

      expect(legacyAudit.id).toBeDefined();
      expect(legacyAudit.action).toBe('LEGACY_DIRECT_WRITE');

      // Legacy query pattern: findFirst with where clause
      const queryResult = await prisma.auditEvent.findFirst({
        where: { entityType: 'Order', entityId: baselineOrderId, action: 'LEGACY_DIRECT_WRITE' },
      });
      expect(queryResult).not.toBeNull();
      expect(JSON.parse(queryResult?.payload || '{}')).toEqual({ legacy: true });
    });
  });
});
