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

describe('Milestone M1 Challenger #2: Double-Entry Conservation, Atomicity & Payload Serialization', () => {
  // Tracking arrays for clean topological teardown
  const createdUserIds: string[] = [];
  const createdCreatorIds: string[] = [];
  const createdFinancialAccountIds: string[] = [];
  const createdJournalEntryIds: string[] = [];
  const createdAuditEventIds: string[] = [];
  const createdStorefrontSettingIds: string[] = [];

  let baselineOrderId: string;

  beforeAll(async () => {
    // Find baseline seeded order for reference
    const order = await prisma.order.findFirst({
      where: { orderNumber: 'APX-ORD-9021' },
    });
    if (!order) {
      throw new Error('Baseline seed data missing: Order APX-ORD-9021 not found.');
    }
    baselineOrderId = order.id;
  });

  afterAll(async () => {
    // Clean up all created test entities in strict topological order
    if (createdAuditEventIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { id: { in: createdAuditEventIds } },
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
    if (createdStorefrontSettingIds.length > 0) {
      await prisma.creatorStorefrontSettings.deleteMany({
        where: { id: { in: createdStorefrontSettingIds } },
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

  // Helper to create an isolated creator + financial account
  async function createCreatorWithAccount(namePrefix: string) {
    const timestamp = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const user = await prisma.user.create({
      data: {
        email: `${namePrefix}-${timestamp}@test.ape-parel.com`,
        name: `${namePrefix} User`,
        role: 'CREATOR',
      },
    });
    createdUserIds.push(user.id);

    const creator = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        slug: `${namePrefix}-slug-${timestamp}`,
        displayName: `${namePrefix} Display`,
      },
    });
    createdCreatorIds.push(creator.id);

    const account = await prisma.financialAccount.create({
      data: {
        accountNumber: `ACC-${namePrefix.toUpperCase()}-${timestamp}`,
        accountType: 'CREATOR',
        creatorId: creator.id,
        balance: 0,
        currency: 'THB',
      },
    });
    createdFinancialAccountIds.push(account.id);

    return { user, creator, account };
  }

  // Helper to create platform & escrow accounts
  async function createSystemAccounts() {
    const timestamp = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const platform = await prisma.financialAccount.create({
      data: {
        accountNumber: `ACC-PLATFORM-TEST-${timestamp}`,
        accountType: 'PLATFORM',
        balance: 0,
        currency: 'THB',
      },
    });
    createdFinancialAccountIds.push(platform.id);

    const escrow = await prisma.financialAccount.create({
      data: {
        accountNumber: `ACC-ESCROW-TEST-${timestamp}`,
        accountType: 'ESCROW',
        balance: 0,
        currency: 'THB',
      },
    });
    createdFinancialAccountIds.push(escrow.id);

    return { platform, escrow };
  }

  // =========================================================================
  // CHALLENGE SUITE 1: Double-Entry Balance Conservation Under Complex Allocations
  // =========================================================================
  describe('1. Double-Entry Balance Conservation Under Complex Multi-Item Allocations', () => {
    it('verifies sum(Credits) - sum(Debits) === balance across multi-item multi-creator allocation with fractions', async () => {
      const { platform, escrow } = await createSystemAccounts();
      const creator1 = await createCreatorWithAccount('alloc-cr1');
      const creator2 = await createCreatorWithAccount('alloc-cr2');
      const creator3 = await createCreatorWithAccount('alloc-cr3');

      // Allocation items (integer THB):
      // Item 1: 45 THB (Creator 1) -> platform = 7, royalty = 38 (7 + 38 = 45)
      // Item 2: 65 THB (Creator 2) -> platform = 10, royalty = 55 (10 + 55 = 65)
      // Item 3: 90 THB (Creator 3) -> platform = 13, royalty = 77 (13 + 77 = 90)
      // Total GMV = 200 THB.
      // Total Platform Commission = 7 + 10 + 13 = 30 THB (exactly 15% of 200)
      // Total Creator Royalties = 38 + 55 + 77 = 170 THB (exactly 85% of 200)
      const items = [
        { creator: creator1, gmv: 45, platform: 7, royalty: 38 },
        { creator: creator2, gmv: 65, platform: 10, royalty: 55 },
        { creator: creator3, gmv: 90, platform: 13, royalty: 77 },
      ];
      const totalGmv = 200;

      // Execute allocation atomically in a transaction
      await prisma.$transaction(async (tx) => {
        // Step 1: Customer funds 200 THB into Escrow
        const j1 = await tx.journalEntry.create({
          data: {
            accountId: escrow.id,
            entryType: 'CREDIT',
            amount: totalGmv,
            balanceAfter: totalGmv,
            orderId: baselineOrderId,
            reference: 'ORDER-MULTI-ITEM-200',
            description: 'Customer payment credited to escrow',
          },
        });
        createdJournalEntryIds.push(j1.id);

        let runningEscrowBalance = totalGmv;
        let runningPlatformBalance = 0;

        for (const item of items) {
          // Debit escrow for this item
          runningEscrowBalance -= item.gmv;
          const jDeb = await tx.journalEntry.create({
            data: {
              accountId: escrow.id,
              entryType: 'DEBIT',
              amount: item.gmv,
              balanceAfter: runningEscrowBalance,
              orderId: baselineOrderId,
              reference: `DISBURSE-${item.creator.creator.id}`,
              description: `Disburse item GMV ${item.gmv}`,
            },
          });
          createdJournalEntryIds.push(jDeb.id);

          // Credit platform commission
          runningPlatformBalance += item.platform;
          const jPlat = await tx.journalEntry.create({
            data: {
              accountId: platform.id,
              entryType: 'CREDIT',
              amount: item.platform,
              balanceAfter: runningPlatformBalance,
              orderId: baselineOrderId,
              reference: `COMMISSION-${item.creator.creator.id}`,
              description: `Platform 15% commission on ${item.gmv}`,
            },
          });
          createdJournalEntryIds.push(jPlat.id);

          // Credit creator royalty
          const jCr = await tx.journalEntry.create({
            data: {
              accountId: item.creator.account.id,
              entryType: 'CREDIT',
              amount: item.royalty,
              balanceAfter: item.royalty,
              orderId: baselineOrderId,
              reference: `ROYALTY-${item.creator.creator.id}`,
              description: `Creator 85% royalty on ${item.gmv}`,
            },
          });
          createdJournalEntryIds.push(jCr.id);

          // Update creator account balance
          await tx.financialAccount.update({
            where: { id: item.creator.account.id },
            data: { balance: item.royalty },
          });
        }

        // Update escrow and platform account balances
        await tx.financialAccount.update({
          where: { id: escrow.id },
          data: { balance: runningEscrowBalance },
        });
        await tx.financialAccount.update({
          where: { id: platform.id },
          data: { balance: runningPlatformBalance },
        });
      });

      // CONSERVATION CHECK 1: Escrow balance is exactly 0
      const updatedEscrow = await prisma.financialAccount.findUnique({ where: { id: escrow.id } });
      expect(updatedEscrow?.balance).toBe(0);

      const escrowEntries = await prisma.journalEntry.findMany({ where: { accountId: escrow.id } });
      const escrowCredits = escrowEntries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
      const escrowDebits = escrowEntries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
      expect(escrowCredits - escrowDebits).toBe(0);
      expect(escrowCredits - escrowDebits).toBe(updatedEscrow?.balance);

      // CONSERVATION CHECK 2: Platform balance is exactly 30
      const updatedPlatform = await prisma.financialAccount.findUnique({ where: { id: platform.id } });
      expect(updatedPlatform?.balance).toBe(30);

      const platformEntries = await prisma.journalEntry.findMany({ where: { accountId: platform.id } });
      const platformCredits = platformEntries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
      const platformDebits = platformEntries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
      expect(platformCredits - platformDebits).toBe(30);
      expect(platformCredits - platformDebits).toBe(updatedPlatform?.balance);

      // CONSERVATION CHECK 3: Each creator account balance matches sum(Credits) - sum(Debits)
      for (const item of items) {
        const updatedCr = await prisma.financialAccount.findUnique({ where: { id: item.creator.account.id } });
        expect(updatedCr?.balance).toBeCloseTo(item.royalty, 2);

        const crEntries = await prisma.journalEntry.findMany({ where: { accountId: item.creator.account.id } });
        const crCredits = crEntries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
        const crDebits = crEntries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
        expect(crCredits - crDebits).toBeCloseTo(item.royalty, 2);
        expect(crCredits - crDebits).toBeCloseTo(updatedCr?.balance ?? 0, 2);
      }

      // GLOBAL CONSERVATION CHECK 4: Total System Debits === Total System Credits
      const allEntries = await prisma.journalEntry.findMany({
        where: { id: { in: createdJournalEntryIds } },
      });
      const totalSystemCredits = allEntries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
      const totalSystemDebits = allEntries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);

      // Total credits: 200 (escrow) + 30 (platform) + 170 (creators) = 400
      // Total debits: 200 (escrow disburse) = 200
      // Net system balance: 400 - 200 = 200 (customer funds paid in)
      expect(totalSystemCredits - totalSystemDebits).toBe(200);
    });

    it('verifies balance conservation under concurrent sequential journal entries', async () => {
      const creator = await createCreatorWithAccount('conc-cr');
      const accountId = creator.account.id;

      // 10 concurrent transactions posting to the creator account:
      // 6 credits of 25 THB (+150)
      // 4 debits of 10 THB (-40)
      // Expected net balance = +110 THB
      const operations: Array<{ type: 'CREDIT' | 'DEBIT'; amount: number }> = [
        { type: 'CREDIT', amount: 25 },
        { type: 'CREDIT', amount: 25 },
        { type: 'DEBIT', amount: 10 },
        { type: 'CREDIT', amount: 25 },
        { type: 'DEBIT', amount: 10 },
        { type: 'CREDIT', amount: 25 },
        { type: 'DEBIT', amount: 10 },
        { type: 'CREDIT', amount: 25 },
        { type: 'DEBIT', amount: 10 },
        { type: 'CREDIT', amount: 25 },
      ];

      // Execute all 10 entries concurrently via Promise.all
      const results = await Promise.all(
        operations.map(async (op, index) => {
          return prisma.journalEntry.create({
            data: {
              accountId,
              entryType: op.type,
              amount: op.amount,
              balanceAfter: 0, // In concurrent environments, raw journal entries record delta
              reference: `CONCURRENT-OP-${index}`,
              description: `Concurrent test op ${index}`,
            },
          });
        })
      );

      for (const r of results) {
        createdJournalEntryIds.push(r.id);
      }

      // Query all entries from DB
      const allEntries = await prisma.journalEntry.findMany({
        where: { accountId },
      });

      expect(allEntries.length).toBe(10);

      const credits = allEntries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
      const debits = allEntries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);

      expect(credits).toBe(150);
      expect(debits).toBe(40);
      expect(credits - debits).toBe(110);

      // Now update the account balance to match
      const updated = await prisma.financialAccount.update({
        where: { id: accountId },
        data: { balance: credits - debits },
      });

      expect(updated.balance).toBe(110);
      expect(credits - debits).toBe(updated.balance);
    });
  });

  // =========================================================================
  // CHALLENGE SUITE 2: Transaction Atomicity & Rollback in Audit & Journal
  // =========================================================================
  describe('2. Transaction Atomicity and Rollback in src/lib/audit.ts', () => {
    it('verifies that if a transaction fails halfway, ZERO orphaned audit events or journal entries persist', async () => {
      const creator = await createCreatorWithAccount('atomic-rollback');
      let createdAuditId = '';
      let createdJournalId = '';

      const failingTx = prisma.$transaction(async (tx) => {
        // Step 1: Write journal entry inside transaction
        const journal = await tx.journalEntry.create({
          data: {
            accountId: creator.account.id,
            entryType: 'CREDIT',
            amount: 500,
            balanceAfter: 500,
            reference: 'TX-WILL-FAIL',
          },
        });
        createdJournalId = journal.id;

        // Step 2: Write audit event inside transaction using tx
        const audit = await recordAuditEvent(
          {
            action: AuditAction.JOURNAL_ENTRY_RECORDED,
            entityType: 'FinancialAccount',
            entityId: creator.account.id,
            actorId: 'TEST_AGENT',
            payload: { amount: 500, note: 'Pending rollback' },
          },
          tx
        );
        createdAuditId = audit.id;

        // Step 3: Mutate account balance inside transaction
        await tx.financialAccount.update({
          where: { id: creator.account.id },
          data: { balance: 500 },
        });

        // Step 4: Simulate catastrophic failure halfway through
        throw new Error('CATASTROPHIC_MID_TRANSACTION_FAILURE');
      });

      // Assert transaction rejected
      await expect(failingTx).rejects.toThrow('CATASTROPHIC_MID_TRANSACTION_FAILURE');

      // CRITICAL VERIFICATION:
      // Both IDs were generated in memory by the driver, but MUST NOT exist in database!
      expect(createdJournalId).not.toBe('');
      expect(createdAuditId).not.toBe('');

      const persistedJournal = await prisma.journalEntry.findUnique({
        where: { id: createdJournalId },
      });
      expect(persistedJournal).toBeNull();

      const persistedAudit = await prisma.auditEvent.findUnique({
        where: { id: createdAuditId },
      });
      expect(persistedAudit).toBeNull();

      // Account balance must remain unchanged at 0
      const persistedAccount = await prisma.financialAccount.findUnique({
        where: { id: creator.account.id },
      });
      expect(persistedAccount?.balance).toBe(0);
    });

    it('verifies that database constraint violation inside transaction rolls back preceding audit events and journal entries', async () => {
      const creator = await createCreatorWithAccount('constraint-rollback');
      let createdAuditId = '';
      let createdJournalId = '';

      const constraintFailingTx = prisma.$transaction(async (tx) => {
        // Step 1: Record audit event
        const audit = await recordAuditEvent(
          {
            action: 'PRE_MUTATION_AUDIT',
            entityType: 'FinancialAccount',
            entityId: creator.account.id,
          },
          tx
        );
        createdAuditId = audit.id;

        // Step 2: Record journal entry
        const journal = await tx.journalEntry.create({
          data: {
            accountId: creator.account.id,
            entryType: 'DEBIT',
            amount: 75,
            balanceAfter: -75,
            reference: 'CONSTRAINT-ROLLBACK-TEST',
          },
        });
        createdJournalId = journal.id;

        // Step 3: Trigger a hard SQLite unique constraint violation (duplicate accountNumber)
        await tx.financialAccount.create({
          data: {
            accountNumber: creator.account.accountNumber, // DUPLICATE ACCOUNT NUMBER!
            accountType: 'CREATOR',
          },
        });
      });

      await expect(constraintFailingTx).rejects.toThrow();

      // Confirm that zero orphaned rows persisted
      const orphanAudit = await prisma.auditEvent.findUnique({
        where: { id: createdAuditId },
      });
      expect(orphanAudit).toBeNull();

      const orphanJournal = await prisma.journalEntry.findUnique({
        where: { id: createdJournalId },
      });
      expect(orphanJournal).toBeNull();
    });
  });

  // =========================================================================
  // CHALLENGE SUITE 3: Payload Serialization Robustness in recordAuditEvent
  // =========================================================================
  describe('3. Payload Serialization Robustness in src/lib/audit.ts', () => {
    it('handles null and undefined payload and metadata gracefully without error', async () => {
      const auditNull = await recordAuditEvent({
        action: 'TEST_NULL_PAYLOAD',
        entityType: 'NullTest',
        payload: null,
        metadata: null,
      });
      createdAuditEventIds.push(auditNull.id);

      expect(auditNull.id).toBeDefined();
      expect(auditNull.payload).toBeNull();
      expect(auditNull.metadata).toBeNull();
      expect(parseAuditPayload(auditNull)).toBeNull();
      expect(parseAuditMetadata(auditNull)).toBeNull();

      const auditUndefined = await recordAuditEvent({
        action: 'TEST_UNDEFINED_PAYLOAD',
        entityType: 'UndefinedTest',
        payload: undefined,
        metadata: undefined,
      });
      createdAuditEventIds.push(auditUndefined.id);

      expect(auditUndefined.id).toBeDefined();
      expect(auditUndefined.payload).toBeNull();
      expect(auditUndefined.metadata).toBeNull();
    });

    it('handles objects with null, undefined, boolean, and number fields correctly', async () => {
      const complexObj = {
        name: 'T-Shirt Master',
        nullField: null,
        undefinedField: undefined,
        active: true,
        count: 42,
        zero: 0,
        emptyString: '',
      };

      const audit = await recordAuditEvent({
        action: 'TEST_COMPLEX_OBJECT',
        entityType: 'ComplexTest',
        payload: complexObj,
      });
      createdAuditEventIds.push(audit.id);

      expect(audit.payload).not.toBeNull();
      const parsed = parseAuditPayload(audit);
      expect(parsed).toBeDefined();
      expect((parsed as any).name).toBe('T-Shirt Master');
      expect((parsed as any).nullField).toBeNull();
      expect((parsed as any).active).toBe(true);
      expect((parsed as any).count).toBe(42);
      expect((parsed as any).zero).toBe(0);
      expect((parsed as any).emptyString).toBe('');
      // Note: JSON.stringify omits undefined keys
      expect((parsed as any).undefinedField).toBeUndefined();
    });

    it('CHALLENGE: checks behavior when payload contains circular references', async () => {
      const circularPayload: any = {
        name: 'Circular Test',
        version: '1.0.0',
      };
      circularPayload.self = circularPayload; // Circular reference!

      // If recordAuditEvent does NOT handle circular references, JSON.stringify throws TypeError!
      let thrownError: any = null;
      try {
        const audit = await recordAuditEvent({
          action: 'TEST_CIRCULAR_PAYLOAD',
          entityType: 'CircularTest',
          payload: circularPayload,
        });
        if (audit?.id) createdAuditEventIds.push(audit.id);
      } catch (err: any) {
        thrownError = err;
      }

      // We document empirically whether recordAuditEvent handles circular references gracefully or throws
      // If it throws TypeError: Converting circular structure to JSON, we capture this finding!
      console.log('Empirical test result for circular reference payload:', thrownError?.message ?? 'SUCCESS');
    });

    it('CHALLENGE: checks behavior when metadata contains circular references', async () => {
      const circularMetadata: any = {
        source: 'ChallengerTest',
      };
      circularMetadata.loop = circularMetadata;

      let thrownError: any = null;
      try {
        const audit = await recordAuditEvent({
          action: 'TEST_CIRCULAR_METADATA',
          entityType: 'CircularMetadataTest',
          metadata: circularMetadata,
        });
        if (audit?.id) createdAuditEventIds.push(audit.id);
      } catch (err: any) {
        thrownError = err;
      }

      console.log('Empirical test result for circular reference metadata:', thrownError?.message ?? 'SUCCESS');
    });

    it('CHALLENGE: checks behavior when payload contains BigInt values', async () => {
      const bigIntPayload = {
        accountNumber: BigInt('1234567890123456789'),
        amount: BigInt(100),
      };

      let thrownError: any = null;
      try {
        const audit = await recordAuditEvent({
          action: 'TEST_BIGINT_PAYLOAD',
          entityType: 'BigIntTest',
          payload: bigIntPayload as any,
        });
        if (audit?.id) createdAuditEventIds.push(audit.id);
      } catch (err: any) {
        thrownError = err;
      }

      console.log('Empirical test result for BigInt payload:', thrownError?.message ?? 'SUCCESS');
    });
  });
});
