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
describe('Adversarial Challenge Suite: Milestone M1 Schema Expansion & Audit Infrastructure', () => {
  // Track all test entities created for isolated, clean teardown
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

  afterAll(async () => {
    // Strict topological teardown
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

  // Helper to create an isolated creator
  async function createTestCreator(prefix: string) {
    const ts = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-${ts}@test-adversarial.ape-parel.com`,
        name: `${prefix} User ${ts}`,
        role: 'CREATOR',
      },
    });
    createdUserIds.push(user.id);

    const creator = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        slug: `${prefix}-slug-${ts}`,
        displayName: `${prefix} Display ${ts}`,
      },
    });
    createdCreatorIds.push(creator.id);
    return creator;
  }

  // =========================================================================
  // CHALLENGE SECTION 1: UNIQUE CONSTRAINTS UNDER ADVERSARIAL STRESS
  // =========================================================================
  describe('1. Unique Constraints Under Adversarial Stress', () => {
    it('CHALLENGE 1.1: Rejects duplicate CreatorStorefrontSettings.customSlug across creators', async () => {
      const creator1 = await createTestCreator('slug-test-1');
      const creator2 = await createTestCreator('slug-test-2');
      const sharedSlug = `custom-boutique-${Date.now()}`;

      // First creation must succeed
      const settings1 = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creator1.id,
          customSlug: sharedSlug,
          bio: 'First boutique',
        },
      });
      createdStorefrontSettingIds.push(settings1.id);
      expect(settings1.customSlug).toBe(sharedSlug);

      // Second creation with exact duplicate customSlug MUST throw unique constraint violation
      await expect(
        prisma.creatorStorefrontSettings.create({
          data: {
            creatorId: creator2.id,
            customSlug: sharedSlug,
            bio: 'Second boutique attempting to steal slug',
          },
        })
      ).rejects.toThrow();

      // Updating creator2 to duplicate slug MUST also throw
      const settings2 = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creator2.id,
          customSlug: `unique-slug-${Date.now()}`,
          bio: 'Second boutique initial',
        },
      });
      createdStorefrontSettingIds.push(settings2.id);

      await expect(
        prisma.creatorStorefrontSettings.update({
          where: { id: settings2.id },
          data: { customSlug: sharedSlug },
        })
      ).rejects.toThrow();
    });

    it('CHALLENGE 1.2: Allows multiple CreatorStorefrontSettings with null customSlug', async () => {
      const creatorA = await createTestCreator('null-slug-a');
      const creatorB = await createTestCreator('null-slug-b');

      const settingsA = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creatorA.id,
          customSlug: null,
          bio: 'Boutique without custom slug A',
        },
      });
      createdStorefrontSettingIds.push(settingsA.id);

      const settingsB = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creatorB.id,
          customSlug: null,
          bio: 'Boutique without custom slug B',
        },
      });
      createdStorefrontSettingIds.push(settingsB.id);

      expect(settingsA.customSlug).toBeNull();
      expect(settingsB.customSlug).toBeNull();
      expect(settingsA.id).not.toBe(settingsB.id);
    });

    it('CHALLENGE 1.3: Rejects duplicate CreatorStorefrontSettings for the same creator (1:1 constraint)', async () => {
      const creator = await createTestCreator('one-to-one-settings');

      const settings1 = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creator.id,
          customSlug: `slug-one-${Date.now()}`,
        },
      });
      createdStorefrontSettingIds.push(settings1.id);

      // Attempting to create a second settings record for the same creatorId must reject
      await expect(
        prisma.creatorStorefrontSettings.create({
          data: {
            creatorId: creator.id,
            customSlug: `slug-two-${Date.now()}`,
          },
        })
      ).rejects.toThrow();
    });

    it('CHALLENGE 1.4: Rejects duplicate FinancialAccount.accountNumber across accounts', async () => {
      const sharedAccountNumber = `ACC-STRESS-DUPLICATE-${Date.now()}`;

      const acc1 = await prisma.financialAccount.create({
        data: {
          accountNumber: sharedAccountNumber,
          accountType: 'PLATFORM',
        },
      });
      createdFinancialAccountIds.push(acc1.id);

      await expect(
        prisma.financialAccount.create({
          data: {
            accountNumber: sharedAccountNumber,
            accountType: 'ESCROW',
          },
        })
      ).rejects.toThrow();
    });

    it('CHALLENGE 1.5: Rejects duplicate FinancialAccount for the same creator (1:1 constraint)', async () => {
      const creator = await createTestCreator('one-to-one-fin');

      const acc1 = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-CREATOR-1-${Date.now()}`,
          accountType: 'CREATOR',
          creatorId: creator.id,
        },
      });
      createdFinancialAccountIds.push(acc1.id);

      await expect(
        prisma.financialAccount.create({
          data: {
            accountNumber: `ACC-CREATOR-2-${Date.now()}`,
            accountType: 'CREATOR',
            creatorId: creator.id,
          },
        })
      ).rejects.toThrow();
    });

    it('CHALLENGE 1.6: Rejects duplicate CommissionRule.name', async () => {
      const ruleName = `COMMISSION_RULE_DUP_${Date.now()}`;

      const rule1 = await prisma.commissionRule.create({
        data: {
          name: ruleName,
          platformRate: 0.20,
          creatorRate: 0.80,
        },
      });
      createdCommissionRuleIds.push(rule1.id);

      await expect(
        prisma.commissionRule.create({
          data: {
            name: ruleName,
            platformRate: 0.30,
            creatorRate: 0.70,
          },
        })
      ).rejects.toThrow();
    });

    it('CHALLENGE 1.7: Concurrency race condition probe on unique customSlug', async () => {
      // 5 concurrent requests attempting to claim the exact same customSlug
      const contestedSlug = `contested-slug-${Date.now()}`;
      const creators = await Promise.all([
        createTestCreator('race-1'),
        createTestCreator('race-2'),
        createTestCreator('race-3'),
        createTestCreator('race-4'),
        createTestCreator('race-5'),
      ]);

      const results = await Promise.allSettled(
        creators.map((c) =>
          prisma.creatorStorefrontSettings.create({
            data: {
              creatorId: c.id,
              customSlug: contestedSlug,
            },
          })
        )
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly ONE must succeed and FOUR must fail with unique constraint violations
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(4);

      if (fulfilled[0].status === 'fulfilled') {
        createdStorefrontSettingIds.push(fulfilled[0].value.id);
      }
    });
  });

  // =========================================================================
  // CHALLENGE SECTION 2: CASCADING DELETES & REFERENTIAL INTEGRITY
  // =========================================================================
  describe('2. Cascading Deletes & Order Safety Probes', () => {
    it('CHALLENGE 2.1: Deleting a test creator cascades to CreatorStorefrontSettings', async () => {
      const creator = await createTestCreator('cascade-storefront');

      const settings = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creator.id,
          customSlug: `cascade-slug-${Date.now()}`,
          bio: 'Ephemeral creator bio',
        },
      });
      const settingsId = settings.id;

      // Confirm settings exist
      expect(await prisma.creatorStorefrontSettings.findUnique({ where: { id: settingsId } })).not.toBeNull();

      // Delete the creator
      await prisma.creatorProfile.delete({
        where: { id: creator.id },
      });

      // Creator must be gone
      expect(await prisma.creatorProfile.findUnique({ where: { id: creator.id } })).toBeNull();
      // Settings must be CASCADE deleted
      expect(await prisma.creatorStorefrontSettings.findUnique({ where: { id: settingsId } })).toBeNull();
    });

    it('CHALLENGE 2.2: Deleting a test creator cascades to FinancialAccount and JournalEntries', async () => {
      const creator = await createTestCreator('cascade-fin');

      const account = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-CASCADE-${Date.now()}`,
          accountType: 'CREATOR',
          creatorId: creator.id,
          balance: 85,
        },
      });
      const accountId = account.id;

      const journal = await prisma.journalEntry.create({
        data: {
          accountId,
          entryType: 'CREDIT',
          amount: 85,
          balanceAfter: 85,
          reference: 'INITIAL_ACCRUAL',
        },
      });
      const journalId = journal.id;

      // Verify records exist
      expect(await prisma.financialAccount.findUnique({ where: { id: accountId } })).not.toBeNull();
      expect(await prisma.journalEntry.findUnique({ where: { id: journalId } })).not.toBeNull();

      // Delete creator
      await prisma.creatorProfile.delete({
        where: { id: creator.id },
      });

      // Creator, Account, and JournalEntry must all be cascaded
      expect(await prisma.creatorProfile.findUnique({ where: { id: creator.id } })).toBeNull();
      expect(await prisma.financialAccount.findUnique({ where: { id: accountId } })).toBeNull();
      expect(await prisma.journalEntry.findUnique({ where: { id: journalId } })).toBeNull();
    });

    it('CHALLENGE 2.3: Deleting a test creator linked to an Order cascades account/journal, but DOES NOT delete or corrupt the Order', async () => {
      // 1. Locate baseline seeded benchmark order
      const benchmarkOrder = await prisma.order.findUnique({
        where: { orderNumber: 'APX-ORD-9021' },
        include: { obligations: true },
      });
      if (!benchmarkOrder) {
        throw new Error('Pre-flight check failed: Benchmark order APX-ORD-9021 not found.');
      }

      const testOrderId = benchmarkOrder.id;
      const originalTotalAmount = benchmarkOrder.totalAmount;
      const originalOrderNumber = benchmarkOrder.orderNumber;
      const obligationsCountBefore = benchmarkOrder.obligations.length;

      // 2. Create a test creator with storefront and financial account
      const creator = await createTestCreator('cascade-order-safety');

      const storefront = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creator.id,
          customSlug: `slug-safety-${Date.now()}`,
        },
      });

      const account = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-ORD-SAFETY-${Date.now()}`,
          accountType: 'CREATOR',
          creatorId: creator.id,
          balance: 100,
        },
      });

      // 3. Attach a test journal entry referencing the benchmark order
      const journal = await prisma.journalEntry.create({
        data: {
          accountId: account.id,
          entryType: 'CREDIT',
          amount: 100,
          balanceAfter: 100,
          orderId: testOrderId,
          reference: originalOrderNumber,
          description: 'Payment for order attached to test creator',
        },
      });

      // Verify link exists
      const orderBefore = await prisma.order.findUnique({
        where: { id: testOrderId },
        include: { journalEntries: true },
      });
      expect(orderBefore).not.toBeNull();
      expect(orderBefore?.journalEntries.some((j) => j.id === journal.id)).toBe(true);

      // 4. NOW DELETE THE TEST CREATOR
      await prisma.creatorProfile.delete({
        where: { id: creator.id },
      });

      // 5. VERIFY CASCADES
      expect(await prisma.creatorProfile.findUnique({ where: { id: creator.id } })).toBeNull();
      expect(await prisma.creatorStorefrontSettings.findUnique({ where: { id: storefront.id } })).toBeNull();
      expect(await prisma.financialAccount.findUnique({ where: { id: account.id } })).toBeNull();
      expect(await prisma.journalEntry.findUnique({ where: { id: journal.id } })).toBeNull();

      // 6. CRITICAL VERIFICATION: The Order STILL EXISTS and is 100% UNCORRUPTED
      const orderAfter = await prisma.order.findUnique({
        where: { id: testOrderId },
        include: { obligations: true, journalEntries: true },
      });

      expect(orderAfter).not.toBeNull();
      expect(orderAfter?.id).toBe(testOrderId);
      expect(orderAfter?.orderNumber).toBe(originalOrderNumber);
      expect(orderAfter?.totalAmount).toBe(originalTotalAmount);
      expect(orderAfter?.status).toBe(benchmarkOrder.status);
      expect(orderAfter?.shippingName).toBe(benchmarkOrder.shippingName);
      // Journal entry was deleted with the creator account, so order's journalEntries no longer contains it
      expect(orderAfter?.journalEntries.some((j) => j.id === journal.id)).toBe(false);
      // Order obligations remain untouched
      expect(orderAfter?.obligations.length).toBe(obligationsCountBefore);
    });
  });

  // =========================================================================
  // CHALLENGE SECTION 3: NULLABLE FIELDS & DEFAULT VALUE INTEGRITY
  // =========================================================================
  describe('3. Nullable Fields & Model Defaults Under Adversarial Probes', () => {
    it('CHALLENGE 3.1: Minimal CreatorStorefrontSettings with omitted optional fields', async () => {
      const creator = await createTestCreator('minimal-storefront');

      // Create with ONLY creatorId (all other fields omitted)
      const settings = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: creator.id,
        },
      });
      createdStorefrontSettingIds.push(settings.id);

      expect(settings.id).toBeDefined();
      expect(settings.customSlug).toBeNull();
      expect(settings.bio).toBeNull();
      expect(settings.bannerUrl).toBeNull();
      expect(settings.avatarUrl).toBeNull();
      expect(settings.socialLinks).toBeNull();
      expect(settings.themePreferences).toBeNull();
      expect(settings.featuredArtworkIds).toBeNull();
      // Default verification
      expect(settings.badgeVerified).toBe(false);
      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.updatedAt).toBeInstanceOf(Date);
    });

    it('CHALLENGE 3.2: Minimal ArtworkFileSpec with omitted optional fields', async () => {
      const creator = await createTestCreator('minimal-filespec');
      const testArtwork = await prisma.artwork.create({
        data: {
          creatorId: creator.id,
          title: `FileSpec Test Art ${Date.now()}`,
          previewUrl: 'https://example.com/art.png',
        },
      });
      createdArtworkIds.push(testArtwork.id);

      // Create with required fields, omit storageKey and previewWatermarkedPath
      const fileSpec = await prisma.artworkFileSpec.create({
        data: {
          artworkId: testArtwork.id,
          storagePath: 'public/uploads/masters/art-minimal.png',
          mimeType: 'image/png',
          width: 2400,
          height: 3200,
          fileSize: 1048576,
        },
      });
      createdArtworkFileSpecIds.push(fileSpec.id);

      expect(fileSpec.storageKey).toBeNull();
      expect(fileSpec.previewWatermarkedPath).toBeNull();
      // Verify defaults
      expect(fileSpec.dpi).toBe(300);
      expect(fileSpec.colorSpace).toBe('sRGB');
      expect(fileSpec.hasTransparency).toBe(false);
      expect(fileSpec.isVector).toBe(false);
    });

    it('CHALLENGE 3.3: Minimal CommissionRule with omitted optional fields', async () => {
      const rule = await prisma.commissionRule.create({
        data: {
          name: `MINIMAL_RULE_${Date.now()}`,
        },
      });
      createdCommissionRuleIds.push(rule.id);

      expect(rule.description).toBeNull();
      expect(rule.effectiveTo).toBeNull();
      // Verify defaults
      expect(rule.platformRate).toBeCloseTo(0.15);
      expect(rule.creatorRate).toBeCloseTo(0.85);
      expect(rule.isActive).toBe(true);
      expect(rule.effectiveFrom).toBeInstanceOf(Date);
    });

    it('CHALLENGE 3.4: Minimal FinancialAccount without creatorId', async () => {
      const account = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-MINIMAL-${Date.now()}`,
          accountType: 'ESCROW',
        },
      });
      createdFinancialAccountIds.push(account.id);

      expect(account.creatorId).toBeNull();
      // Verify defaults
      expect(account.balance).toBe(0);
      expect(account.currency).toBe('THB');
      expect(account.status).toBe('ACTIVE');
    });

    it('CHALLENGE 3.5: Minimal JournalEntry with omitted optional relations and metadata', async () => {
      const account = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-MIN-JOURNAL-${Date.now()}`,
          accountType: 'PLATFORM',
        },
      });
      createdFinancialAccountIds.push(account.id);

      const entry = await prisma.journalEntry.create({
        data: {
          accountId: account.id,
          entryType: 'CREDIT',
          amount: 50,
          balanceAfter: 50,
        },
      });
      createdJournalEntryIds.push(entry.id);

      expect(entry.orderId).toBeNull();
      expect(entry.reference).toBeNull();
      expect(entry.description).toBeNull();
      expect(entry.amount).toBe(50);
      expect(entry.entryType).toBe('CREDIT');
    });

    it('CHALLENGE 3.6: Minimal ReconciliationReport with omitted optional fields', async () => {
      const report = await prisma.reconciliationReport.create({
        data: {
          period: `2026-MIN-${Date.now()}`,
        },
      });
      createdReconciliationReportIds.push(report.id);

      expect(report.periodStart).toBeNull();
      expect(report.periodEnd).toBeNull();
      expect(report.discrepancyDetails).toBeNull();
      expect(report.generatedBy).toBeNull();
      // Verify defaults
      expect(report.totalGmv).toBe(0);
      expect(report.totalCommission).toBe(0);
      expect(report.totalCreatorRoyalties).toBe(0);
      expect(report.matchedItemsCount).toBe(0);
      expect(report.discrepancyCount).toBe(0);
      expect(report.status).toBe('BALANCED');
      expect(report.balanceConservationVerified).toBe(true);
    });

    it('CHALLENGE 3.7: Minimal AuditEvent with omitted optional fields', async () => {
      const audit = await prisma.auditEvent.create({
        data: {
          action: 'TEST_MINIMAL_AUDIT',
          entityType: 'SystemTest',
        },
      });
      createdAuditEventIds.push(audit.id);

      expect(audit.userId).toBeNull();
      expect(audit.actorId).toBeNull();
      expect(audit.entityId).toBeNull();
      expect(audit.payload).toBeNull();
      expect(audit.metadata).toBeNull();
      expect(audit.createdAt).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // CHALLENGE SECTION 4: AUDIT SERVICE ADVERSARIAL STRESS & CORRUPTION RECOVERY
  // =========================================================================
  describe('4. Audit Service Adversarial Stress & Corruption Recovery', () => {
    it('CHALLENGE 4.1: Gracefully recovers from malformed and corrupted JSON without crashing', () => {
      const corruptedPayloadAudit = { payload: '{ invalid json: bad syntax: [[[' };
      const emptyPayloadAudit = { payload: null };
      const corruptedMetaAudit = { metadata: 'not even json' };

      expect(parseAuditPayload(corruptedPayloadAudit)).toBeNull();
      expect(parseAuditPayload(emptyPayloadAudit)).toBeNull();
      expect(parseAuditMetadata(corruptedMetaAudit)).toBeNull();
    });

    it('CHALLENGE 4.2: Handles complex nested objects, unicode Thai strings, and emojis without loss', async () => {
      const complexPayload = {
        thaiTitle: 'อะไหล่ร่ำรวย แฟชั่นสตรีทแวร์',
        emoji: '🦍💎🔥🇹🇭',
        deepTree: {
          level1: {
            level2: {
              numbers: [1, 2, 3, 4.5678],
              flags: { active: true, verified: false, nullVal: null },
            },
          },
        },
      };

      const complexMetadata = {
        clientHeaders: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Vitest Adversarial',
          ip: '203.150.100.1',
        },
        tags: ['stress', 'adversarial', 'thai_unicode'],
      };

      const audit = await recordAuditEvent({
        action: 'COMPLEX_STRUCTURE_AUDIT',
        entityType: 'StressTest',
        entityId: 'complex-123',
        payload: complexPayload,
        metadata: complexMetadata,
      });
      createdAuditEventIds.push(audit.id);

      const parsedPayload = parseAuditPayload(audit);
      const parsedMetadata = parseAuditMetadata(audit);

      expect(parsedPayload).toEqual(complexPayload);
      expect(parsedMetadata).toEqual(complexMetadata);
      expect((parsedPayload as any).thaiTitle).toBe('อะไหล่ร่ำรวย แฟชั่นสตรีทแวร์');
      expect((parsedPayload as any).emoji).toBe('🦍💎🔥🇹🇭');
    });

    it('CHALLENGE 4.3: Correctly resolves actorId vs userId precedence, fallback, and foreign key enforcement', async () => {
      const testUser = await prisma.user.create({
        data: {
          email: `actor-test-${Date.now()}@ape-parel.com`,
          name: 'Actor Test User',
          role: 'CREATOR',
        },
      });
      createdUserIds.push(testUser.id);

      // Case A: Only userId provided (with valid User FK) -> actorId falls back to userId
      const auditA = await recordAuditEvent({
        action: 'FALLBACK_ACTOR_TEST',
        entityType: 'User',
        userId: testUser.id,
      });
      createdAuditEventIds.push(auditA.id);
      expect(auditA.actorId).toBe(testUser.id);
      expect(auditA.userId).toBe(testUser.id);

      // Case B: Both actorId and userId provided -> actorId preserved, userId linked
      const auditB = await recordAuditEvent({
        action: 'OVERRIDE_ACTOR_TEST',
        entityType: 'User',
        userId: testUser.id,
        actorId: 'ADMIN_SUPERUSER',
      });
      createdAuditEventIds.push(auditB.id);
      expect(auditB.actorId).toBe('ADMIN_SUPERUSER');
      expect(auditB.userId).toBe(testUser.id);

      // Case C: Non-user actorId provided without userId (e.g. SYSTEM actor) -> works without FK constraint
      const auditC = await recordAuditEvent({
        action: 'SYSTEM_ACTOR_TEST',
        entityType: 'System',
        actorId: 'RECONCILIATION_ENGINE',
      });
      createdAuditEventIds.push(auditC.id);
      expect(auditC.actorId).toBe('RECONCILIATION_ENGINE');
      expect(auditC.userId).toBeNull();

      // Case D: Invalid/fictional userId MUST be rejected by foreign key constraint
      await expect(
        recordAuditEvent({
          action: 'INVALID_FK_TEST',
          entityType: 'User',
          userId: 'non-existent-user-id-99999',
        })
      ).rejects.toThrow();
    });

    it('CHALLENGE 4.4: High-volume concurrent audit writes under transaction', async () => {
      const batchSize = 10;
      const targetEntityId = `concurrent-audit-batch-${Date.now()}`;

      // Write batchSize audit events inside a single transaction
      const createdEvents = await prisma.$transaction(async (tx) => {
        const events = [];
        for (let i = 0; i < batchSize; i++) {
          const ev = await recordAuditEvent(
            {
              action: `BATCH_EVENT_${i}`,
              entityType: 'BatchStress',
              entityId: targetEntityId,
              payload: { batchIndex: i },
            },
            tx
          );
          events.push(ev);
        }
        return events;
      });

      for (const ev of createdEvents) {
        createdAuditEventIds.push(ev.id);
      }

      expect(createdEvents.length).toBe(batchSize);

      // Verify querying with limit and order
      const fetched = await getAuditEventsForEntity('BatchStress', targetEntityId, {
        limit: 5,
        order: 'asc',
      });
      expect(fetched.length).toBe(5);
      expect(fetched[0].action).toBe('BATCH_EVENT_0');
      expect(fetched[4].action).toBe('BATCH_EVENT_4');
    });
  });

  // =========================================================================
  // CHALLENGE SECTION 5: DOUBLE-ENTRY CONSERVATION & FINANCIAL BOUNDARY VALUES
  // =========================================================================
  describe('5. Double-Entry Conservation & Financial Boundary Values', () => {
    it('CHALLENGE 5.1: Supports negative balance on FinancialAccount (e.g. chargeback/adjustment)', async () => {
      const account = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-NEG-BAL-${Date.now()}`,
          accountType: 'CREATOR',
          balance: -50, // Negative balance after chargeback
        },
      });
      createdFinancialAccountIds.push(account.id);

      expect(account.balance).toBe(-50);

      // Verify update to deeper negative
      const updated = await prisma.financialAccount.update({
        where: { id: account.id },
        data: { balance: -120 },
      });
      expect(updated.balance).toBe(-120);
    });

    it('CHALLENGE 5.2: Multi-step interleaved journal balance conservation', async () => {
      const account = await prisma.financialAccount.create({
        data: {
          accountNumber: `ACC-MULTI-STEP-${Date.now()}`,
          accountType: 'CREATOR',
          balance: 0,
        },
      });
      createdFinancialAccountIds.push(account.id);

      // Sequence of transactions:
      // +100 credit -> 100
      // -30 debit -> 70
      // +50 credit -> 120
      // -40 debit -> 80
      // +10 credit -> 90
      const steps: Array<{ type: 'CREDIT' | 'DEBIT'; amount: number; expectedAfter: number }> = [
        { type: 'CREDIT', amount: 100, expectedAfter: 100 },
        { type: 'DEBIT', amount: 30, expectedAfter: 70 },
        { type: 'CREDIT', amount: 50, expectedAfter: 120 },
        { type: 'DEBIT', amount: 40, expectedAfter: 80 },
        { type: 'CREDIT', amount: 10, expectedAfter: 90 },
      ];

      for (const step of steps) {
        const j = await prisma.journalEntry.create({
          data: {
            accountId: account.id,
            entryType: step.type,
            amount: step.amount,
            balanceAfter: step.expectedAfter,
          },
        });
        createdJournalEntryIds.push(j.id);
      }

      // Query all entries for this account
      const allEntries = await prisma.journalEntry.findMany({
        where: { accountId: account.id },
      });

      const totalCredits = allEntries
        .filter((e) => e.entryType === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0); // 100 + 50 + 10 = 160

      const totalDebits = allEntries
        .filter((e) => e.entryType === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0); // 30 + 40 = 70

      const netBalance = totalCredits - totalDebits; // 160 - 70 = 90
      expect(netBalance).toBe(90);

      // Update account balance to netBalance and confirm match
      const updatedAccount = await prisma.financialAccount.update({
        where: { id: account.id },
        data: { balance: netBalance },
      });
      expect(updatedAccount.balance).toBe(netBalance);
    });
  });
});
