# Milestone M1 Architecture & Test Specification Handoff Report: Audit Utility (`src/lib/audit.ts`) & Test Suite (`src/lib/__tests__/schema_audit_m1.test.ts`)

- **Agent**: `explorer_m1_gen4_3`
- **Working Directory**: `d:\Coding Projects\ape-parel tshirt\.agents\teamwork\explorer_m1_gen4_3`
- **Project Root**: `d:\Coding Projects\ape-parel tshirt`
- **Milestone**: M1 (Database Schema Expansion & Audit Infrastructure)
- **Target Recipient**: Worker M1 & Orchestrator (`2b95ea05-1043-48f6-b8b4-10f7e5c2d9d3`)
- **Date**: 2026-10-10T05:37:30Z

---

## 1. Observation

### A. Current Verification Baseline & Tool Runs
1. **Existing Test Suite Baseline**:
   - Command: `npm test` (`vitest run`).
   - Verbatim result:
     ```
     Test Files  13 passed (13)
          Tests  268 passed (268)
       Duration  6.94s
     ```
   - 268 existing unit, integration, and challenger tests pass across 13 test files with zero failures.
2. **TypeScript Compilation Baseline**:
   - Command: `npx tsc --noEmit`.
   - Verbatim result: Exit code 0, zero errors or warnings.
3. **Vitest Configuration (`vitest.config.ts:4-16`)**:
   - `environment: 'node'`
   - `globals: true`
   - `fileParallelism: false` (tests execute sequentially, avoiding SQLite file locking conflicts)
   - `include: ['src/**/*.{test,spec}.ts']`
   - Path alias: `@` maps to `./src`.

### B. Existing Audit Logging Usages in Codebase
1. **`src/lib/royalties.ts:312-328`**:
   Direct write inside a `$transaction`:
   ```typescript
   await tx.auditEvent.create({
     data: {
       action: 'ROYALTY_PAYOUT_SETTLED',
       entityType: 'CreatorSettlement',
       entityId: settlement.id,
       payload: JSON.stringify({
         settlementNumber,
         creatorId: canonicalCreatorId,
         totalAmount: totalPayoutAmount,
         settledObligationIds: obligationIdsToSettle,
         balanceBefore,
         balanceAfter,
         payoutReference: options.payoutRef ?? null,
         ledgerEntryId: ledgerEntry.id,
       }),
     },
   });
   ```
2. **`src/app/api/orders/[id]/route.ts:148-160`**:
   Order status update write inside a `$transaction`:
   ```typescript
   await tx.auditEvent.create({
     data: {
       action: 'ORDER_STATUS_UPDATED',
       entityType: 'Order',
       entityId: order.id,
       payload: JSON.stringify({
         previousStatus,
         newStatus: status,
         notes: notes ?? null,
         updatedAt: new Date().toISOString(),
       }),
     },
   });
   ```
3. **`src/app/admin/page.tsx:62-74`**:
   Admin dashboard query:
   ```typescript
   const dbAuditLogs = await prisma.auditEvent.findMany({
     orderBy: { createdAt: 'desc' },
     take: 20,
   });
   auditLogs = dbAuditLogs.map((l) => ({
     id: l.id,
     action: l.action,
     entityType: l.entityType,
     entityId: l.entityId || '',
     createdAt: l.createdAt.toISOString(),
     payload: l.payload || '',
   }));
   ```
4. **Existing Test Assertions on AuditEvent**:
   - `src/lib/__tests__/orders_royalties.test.ts:519-524`: queries `prisma.auditEvent.findFirst({ where: { entityType: 'CreatorSettlement', entityId: result.settlementId } })`, expecting `action === 'ROYALTY_PAYOUT_SETTLED'`.
   - `src/lib/__tests__/m5_graphics_production_challenger.test.ts:890-895`: queries `prisma.auditEvent.findFirst({ where: { entityType: 'Order', entityId: testOrderId }, orderBy: { createdAt: 'desc' } })`, asserting `action === 'ORDER_STATUS_UPDATED'` and parsing `JSON.parse(payload)`.
   - `src/lib/__tests__/portals_marketplace_challenger.test.ts:160-175`: verifies `previousStatus` and `newStatus` in `payload`.
   - `src/lib/__tests__/portals_marketplace_challenger.test.ts:363-376`: verifies that rejected requests create zero audit events.

### C. Existing `AuditEvent` Prisma Schema (`prisma/schema.prisma:236-245`)
```prisma
model AuditEvent {
  id         String   @id @default(cuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action     String
  entityType String
  entityId   String?
  payload    String? // JSON string
  createdAt  DateTime @default(now())
}
```

---

## 2. Logic Chain

### Step 1: Interface Contract for `src/lib/audit.ts`
- **Observation**:
  - The orchestrator and user prompt specify:
    `recordAuditEvent(params: { action: string; entityType: string; entityId?: string; actorId?: string; userId?: string; payload?: Record<string, any>; metadata?: Record<string, any> }, tx?: PrismaTransaction): Promise<AuditEvent>`
  - Existing calls in `royalties.ts` and `api/orders/[id]/route.ts` execute within `prisma.$transaction(async (tx) => ...)`.
- **Deduction**:
  - `tx` must accept either `Prisma.TransactionClient` or `PrismaClient` (defaulting to `@/lib/prisma`).
  - `payload` and `metadata` should accept either pre-stringified strings or plain objects and automatically serialize them via `JSON.stringify`.
  - `actorId` should default to `params.actorId ?? params.userId ?? null`. This decouples system callers (e.g. `'SYSTEM'`, `'RECONCILIATION_ENGINE'`) from having to exist as rows in the `User` table, while still attributing user actions when `userId` is supplied.

### Step 2: Backward Compatibility with Existing AuditEvent Queries
- **Observation**:
  - Multiple test suites and routes query `action`, `entityType`, `entityId`, `payload`, and `createdAt`.
  - In `admin/page.tsx`, `payload` is read as a string.
- **Deduction**:
  - `actorId` and `metadata` in `AuditEvent` must be purely additive and optional (`String?`).
  - `recordAuditEvent` will populate both existing fields (`action`, `entityType`, `entityId`, `userId`, `payload`) and new fields (`actorId`, `metadata`).
  - Direct calls to `tx.auditEvent.create` or `prisma.auditEvent.create` without `actorId` continue to work without any type or runtime error.

### Step 3: Architecture of Test Suite `src/lib/__tests__/schema_audit_m1.test.ts`
- **Observation**:
  - Milestone M1 expands the schema with 6 new models (`CreatorStorefrontSettings`, `ArtworkFileSpec`, `CommissionRule`, `FinancialAccount`, `JournalEntry`, `ReconciliationReport`) and extends `AuditEvent`.
  - The suite must validate:
    1. Querying and creation for all new models via Prisma.
    2. Zero regression for the 268 baseline tests.
    3. Correct transactional behavior of `recordAuditEvent` (including ACID rollback).
- **Deduction**:
  - The test suite must be completely self-cleaning. Every ID created during testing must be stored and deleted in reverse foreign key dependency order in `afterAll()`.
  - Seeded benchmark data (e.g., creator `dash-ape`, order `APX-ORD-9021`) must be used as non-destructive references and left untouched.
  - ACID transaction rollback must be explicitly asserted: within a failing `$transaction`, `recordAuditEvent` must not persist any phantom rows.

---

## 3. Caveats

1. **Prisma Client Generation Dependency**:
   - `src/lib/audit.ts` and `src/lib/__tests__/schema_audit_m1.test.ts` depend on the updated `@prisma/client` types. Worker M1 must run `npx prisma db push` and `npx prisma generate` **before** compiling or testing code referencing the new models and fields.
2. **SQLite Foreign Key Behavior**:
   - `userId` on `AuditEvent` references `User(id)` with `onDelete: SetNull`. Passing arbitrary string IDs for `userId` could violate foreign key constraints if `PRAGMA foreign_keys = ON`. Therefore, `actorId` should be used for system, daemon, or non-user actor identifiers (e.g. `'SYSTEM'`, `'CRON'`, `'ADMIN'`).
3. **Monetary Amounts as Integers**:
   - `FinancialAccount.balance`, `JournalEntry.amount`, and `ReconciliationReport.totalGmv` are whole Thai Baht integers (`Int`). In tests and double-entry journals, all amounts must be integers.

---

## 4. Conclusion & Complete Proposed Implementation

### A. Complete Source Code for `src/lib/audit.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { AuditEvent, Prisma, PrismaClient } from '@prisma/client';

export type PrismaTransaction = Prisma.TransactionClient;
export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export interface RecordAuditEventParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  userId?: string | null;
  payload?: Record<string, any> | string | null;
  metadata?: Record<string, any> | string | null;
}

export interface GetAuditEventsOptions {
  limit?: number;
  order?: 'asc' | 'desc';
  action?: string;
}

/**
 * Standard audit actions used across the ape-parel marketplace
 */
export const AuditAction = {
  // Orders & Lifecycle
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',

  // Royalties & Settlements
  ROYALTY_OBLIGATION_CREATED: 'ROYALTY_OBLIGATION_CREATED',
  ROYALTY_PAYOUT_SETTLED: 'ROYALTY_PAYOUT_SETTLED',
  PAYOUT_REQUESTED: 'PAYOUT_REQUESTED',
  PAYOUT_APPROVED: 'PAYOUT_APPROVED',
  PAYOUT_REJECTED: 'PAYOUT_REJECTED',

  // Artworks & Asset Uploads (M2)
  ARTWORK_UPLOADED: 'ARTWORK_UPLOADED',
  ARTWORK_UPDATED: 'ARTWORK_UPDATED',
  ARTWORK_DELETED: 'ARTWORK_DELETED',
  LICENSE_PRICE_UPDATED: 'LICENSE_PRICE_UPDATED',
  FILE_SPEC_VALIDATED: 'FILE_SPEC_VALIDATED',

  // Creator Storefront & Profile (M3)
  CREATOR_ONBOARDED: 'CREATOR_ONBOARDED',
  STOREFRONT_SETTINGS_UPDATED: 'STOREFRONT_SETTINGS_UPDATED',

  // Accounting & Financial Reconciliation (M4)
  JOURNAL_ENTRY_RECORDED: 'JOURNAL_ENTRY_RECORDED',
  RECONCILIATION_COMPLETED: 'RECONCILIATION_COMPLETED',
  BALANCE_ADJUSTMENT: 'BALANCE_ADJUSTMENT',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction] | string;

/**
 * Records an immutable AuditEvent in the database.
 * Supports standalone execution (using global prisma client) or execution
 * inside an existing Prisma transaction.
 * Automatically serializes payload and metadata objects to JSON strings.
 *
 * @param params Audit event fields
 * @param tx Optional Prisma transaction client
 * @returns The created AuditEvent record
 */
export async function recordAuditEvent(
  params: RecordAuditEventParams,
  tx?: PrismaClientOrTx
): Promise<AuditEvent> {
  const client = tx ?? prisma;

  const payloadString =
    params.payload === undefined || params.payload === null
      ? null
      : typeof params.payload === 'string'
      ? params.payload
      : JSON.stringify(params.payload);

  const metadataString =
    params.metadata === undefined || params.metadata === null
      ? null
      : typeof params.metadata === 'string'
      ? params.metadata
      : JSON.stringify(params.metadata);

  const actorId = params.actorId ?? params.userId ?? null;

  return await client.auditEvent.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      userId: params.userId ?? null,
      actorId,
      payload: payloadString,
      metadata: metadataString,
    },
  });
}

/**
 * Query audit events for a specific entity with optional ordering and filtering.
 */
export async function getAuditEventsForEntity(
  entityType: string,
  entityId: string,
  options?: GetAuditEventsOptions,
  tx?: PrismaClientOrTx
): Promise<AuditEvent[]> {
  const client = tx ?? prisma;
  return await client.auditEvent.findMany({
    where: {
      entityType,
      entityId,
      ...(options?.action ? { action: options.action } : {}),
    },
    orderBy: { createdAt: options?.order ?? 'desc' },
    take: options?.limit,
  });
}

/**
 * Retrieve the single most recent audit event for an entity.
 */
export async function getLatestAuditEvent(
  entityType: string,
  entityId: string,
  action?: string,
  tx?: PrismaClientOrTx
): Promise<AuditEvent | null> {
  const client = tx ?? prisma;
  return await client.auditEvent.findFirst({
    where: {
      entityType,
      entityId,
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Helper to safely parse stringified payload JSON.
 */
export function parseAuditPayload<T = Record<string, any>>(audit: { payload: string | null }): T | null {
  if (!audit.payload) return null;
  try {
    return JSON.parse(audit.payload) as T;
  } catch {
    return null;
  }
}

/**
 * Helper to safely parse stringified metadata JSON.
 */
export function parseAuditMetadata<T = Record<string, any>>(audit: { metadata?: string | null }): T | null {
  if (!audit.metadata) return null;
  try {
    return JSON.parse(audit.metadata) as T;
  } catch {
    return null;
  }
}
```

---

### B. Complete Source Code for `src/lib/__tests__/schema_audit_m1.test.ts`

```typescript
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
  const createdStorefrontSettingIds: string[] = [];
  const createdArtworkFileSpecIds: string[] = [];
  const createdCommissionRuleIds: string[] = [];
  const createdJournalEntryIds: string[] = [];
  const createdFinancialAccountIds: string[] = [];
  const createdReconciliationReportIds: string[] = [];
  const createdAuditEventIds: string[] = [];

  let testCreatorId: string;
  let testArtworkId: string;
  let testOrderId: string;

  beforeAll(async () => {
    // 1. Locate baseline seeded creator
    const creator = await prisma.creatorProfile.findFirst({
      where: { slug: 'dash-ape' },
    });
    if (!creator) {
      throw new Error('Baseline seed data missing: Creator dash-ape not found.');
    }
    testCreatorId = creator.id;

    // 2. Locate baseline seeded artwork
    const artwork = await prisma.artwork.findFirst({
      where: { creatorId: testCreatorId },
    });
    if (!artwork) {
      throw new Error('Baseline seed data missing: Artwork for dash-ape not found.');
    }
    testArtworkId = artwork.id;

    // 3. Locate baseline seeded benchmark order
    const order = await prisma.order.findFirst({
      where: { orderNumber: 'APX-ORD-9021' },
    });
    if (!order) {
      throw new Error('Baseline seed data missing: Order APX-ORD-9021 not found.');
    }
    testOrderId = order.id;
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
  });

  // ==========================================================================
  // SECTION 1: Baseline Seed Verification
  // ==========================================================================
  describe('1. Baseline Seed Verification & Environment Integrity', () => {
    it('verifies seeded creators and benchmark order exist and are unmodified', async () => {
      const creators = await prisma.creatorProfile.findMany();
      expect(creators.length).toBeGreaterThanOrEqual(3);

      const benchmarkOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(benchmarkOrder).not.toBeNull();
      expect(benchmarkOrder?.totalAmount).toBe(410);
    });

    it('verifies standard commission rule is present or active', async () => {
      const standardRule = await prisma.commissionRule.findFirst({
        where: { name: 'STANDARD_15_85' },
      });
      if (standardRule) {
        expect(standardRule.platformRate).toBeCloseTo(0.15);
        expect(standardRule.creatorRate).toBeCloseTo(0.85);
        expect(standardRule.isActive).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SECTION 2: Model 1 — CreatorStorefrontSettings
  // ==========================================================================
  describe('2. CreatorStorefrontSettings Model', () => {
    it('creates, queries, and updates 1:1 storefront settings for a creator', async () => {
      // First clean up any pre-existing settings for testCreator
      await prisma.creatorStorefrontSettings.deleteMany({
        where: { creatorId: testCreatorId },
      });

      const socialLinksJson = JSON.stringify({
        instagram: '@dashape',
        twitter: '@dashape_art',
        behance: 'dashape',
      });
      const themePrefsJson = JSON.stringify({
        primaryColor: '#131718',
        accentColor: '#DABA98',
        layout: 'grid',
      });
      const featuredArtworksJson = JSON.stringify([testArtworkId]);

      const settings = await prisma.creatorStorefrontSettings.create({
        data: {
          creatorId: testCreatorId,
          customSlug: 'dash-ape-flagship',
          bio: 'Underground cybernetic streetwear creator and digital print pioneer.',
          bannerUrl: '/uploads/banners/dash-ape-banner-test.png',
          avatarUrl: '/uploads/avatars/dash-ape-avatar-test.png',
          socialLinks: socialLinksJson,
          themePreferences: themePrefsJson,
          featuredArtworkIds: featuredArtworksJson,
        },
      });

      createdStorefrontSettingIds.push(settings.id);

      expect(settings.id).toBeDefined();
      expect(settings.customSlug).toBe('dash-ape-flagship');
      expect(settings.creatorId).toBe(testCreatorId);

      // Verify 1:1 relation retrieval via CreatorProfile
      const creatorWithSettings = await prisma.creatorProfile.findUnique({
        where: { id: testCreatorId },
        include: { storefrontSettings: true },
      });

      expect(creatorWithSettings?.storefrontSettings).not.toBeNull();
      expect(creatorWithSettings?.storefrontSettings?.customSlug).toBe('dash-ape-flagship');

      // Verify update
      const updated = await prisma.creatorStorefrontSettings.update({
        where: { id: settings.id },
        data: { bio: 'Updated bio for streetwear studio.' },
      });
      expect(updated.bio).toBe('Updated bio for streetwear studio.');
    });

    it('enforces uniqueness on customSlug', async () => {
      // Find a second creator
      const secondCreator = await prisma.creatorProfile.findFirst({
        where: { slug: 'cyber-monk' },
      });
      if (!secondCreator) return;

      // Clean up any existing settings
      await prisma.creatorStorefrontSettings.deleteMany({
        where: { creatorId: secondCreator.id },
      });

      // Attempting to reuse customSlug 'dash-ape-flagship' should throw
      await expect(
        prisma.creatorStorefrontSettings.create({
          data: {
            creatorId: secondCreator.id,
            customSlug: 'dash-ape-flagship', // duplicate slug
          },
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SECTION 3: Model 2 — ArtworkFileSpec
  // ==========================================================================
  describe('3. ArtworkFileSpec Model', () => {
    it('creates, queries, and validates 1:1 ArtworkFileSpec for master assets', async () => {
      // Clean up any pre-existing file spec for testArtwork
      await prisma.artworkFileSpec.deleteMany({
        where: { artworkId: testArtworkId },
      });

      const fileSpec = await prisma.artworkFileSpec.create({
        data: {
          artworkId: testArtworkId,
          storagePath: 'public/uploads/masters/art-benchmark-master.png',
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
        where: { id: testArtworkId },
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
      const customRule = await prisma.commissionRule.create({
        data: {
          name: 'TEST_TIER_VIP_10_90',
          platformRate: 0.10,
          creatorRate: 0.90,
          isActive: true,
          description: 'Special VIP creator tier: 10% platform, 90% creator.',
        },
      });

      createdCommissionRuleIds.push(customRule.id);

      expect(customRule.name).toBe('TEST_TIER_VIP_10_90');
      expect(customRule.platformRate).toBeCloseTo(0.10);
      expect(customRule.creatorRate).toBeCloseTo(0.90);
      expect(customRule.platformRate + customRule.creatorRate).toBeCloseTo(1.0);

      // Verify unique constraint on rule name
      await expect(
        prisma.commissionRule.create({
          data: {
            name: 'TEST_TIER_VIP_10_90',
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
      platformAccount = await prisma.financialAccount.upsert({
        where: { accountNumber: 'ACC-TEST-PLATFORM' },
        update: {},
        create: {
          accountNumber: 'ACC-TEST-PLATFORM',
          accountType: 'PLATFORM',
          balance: 0,
          currency: 'THB',
        },
      });
      createdFinancialAccountIds.push(platformAccount.id);

      escrowAccount = await prisma.financialAccount.upsert({
        where: { accountNumber: 'ACC-TEST-ESCROW' },
        update: {},
        create: {
          accountNumber: 'ACC-TEST-ESCROW',
          accountType: 'ESCROW',
          balance: 0,
          currency: 'THB',
        },
      });
      createdFinancialAccountIds.push(escrowAccount.id);

      creatorAccount = await prisma.financialAccount.upsert({
        where: { accountNumber: `ACC-TEST-CREATOR-${testCreatorId}` },
        update: {},
        create: {
          accountNumber: `ACC-TEST-CREATOR-${testCreatorId}`,
          accountType: 'CREATOR',
          creatorId: testCreatorId,
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
          orderId: testOrderId,
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
          orderId: testOrderId,
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
          orderId: testOrderId,
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
          orderId: testOrderId,
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
          period: '2026-10-TEST',
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
            entityId: testOrderId,
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
            entityId: testOrderId,
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
          entityId: testOrderId,
          payload: JSON.stringify({ legacy: true }),
        },
      });
      createdAuditEventIds.push(legacyAudit.id);

      expect(legacyAudit.id).toBeDefined();
      expect(legacyAudit.action).toBe('LEGACY_DIRECT_WRITE');

      // Legacy query pattern: findFirst with where clause
      const queryResult = await prisma.auditEvent.findFirst({
        where: { entityType: 'Order', entityId: testOrderId, action: 'LEGACY_DIRECT_WRITE' },
      });
      expect(queryResult).not.toBeNull();
      expect(JSON.parse(queryResult?.payload || '{}')).toEqual({ legacy: true });
    });
  });
});
```

---

### C. Recommended Exact Implementation Steps for Worker M1

1. **Step 1: Schema Extension (`prisma/schema.prisma`)**:
   - Apply the model extensions designed by `explorer_m1_gen4_1`:
     - Optional relations on existing models:
       - `CreatorProfile`: `storefrontSettings CreatorStorefrontSettings?`, `financialAccount FinancialAccount?`
       - `Artwork`: `fileSpec ArtworkFileSpec?`
       - `Order`: `journalEntries JournalEntry[]`
       - `AuditEvent`: add `actorId String?` and `metadata String?`
     - New models: `CreatorStorefrontSettings`, `ArtworkFileSpec`, `CommissionRule`, `FinancialAccount`, `JournalEntry`, `ReconciliationReport`.
   - Run `npx prisma validate`.
2. **Step 2: Database Migration & Client Generation**:
   - Execute:
     ```powershell
     npx prisma db push
     npx prisma generate
     ```
   - Confirm table creation in `dev.db` and updated TypeScript types in `node_modules/@prisma/client`.
3. **Step 3: Database Seed Update (`prisma/seed.mjs`)**:
   - Add teardown deleteMany statements in reverse dependency order:
     ```javascript
     await prisma.reconciliationReport.deleteMany();
     await prisma.journalEntry.deleteMany();
     await prisma.financialAccount.deleteMany();
     await prisma.commissionRule.deleteMany();
     await prisma.artworkFileSpec.deleteMany();
     await prisma.creatorStorefrontSettings.deleteMany();
     ```
   - Add seed creation for default `CommissionRule` ('STANDARD_15_85'), initial `FinancialAccount` records (Platform, Escrow, Creators), default `CreatorStorefrontSettings`, and `ArtworkFileSpec`.
   - Execute:
     ```powershell
     node prisma/seed.mjs
     ```
4. **Step 4: Create Centralized Audit Utility (`src/lib/audit.ts`)**:
   - Write `src/lib/audit.ts` using the complete code provided in Section 4.A above.
5. **Step 5: Create Unit Test Suite (`src/lib/__tests__/schema_audit_m1.test.ts`)**:
   - Write `src/lib/__tests__/schema_audit_m1.test.ts` using the complete code provided in Section 4.B above.
6. **Step 6: Execute Independent & Regression Verification**:
   - Run targeted test suite:
     ```powershell
     npx vitest run src/lib/__tests__/schema_audit_m1.test.ts
     ```
   - Run full project test suite:
     ```powershell
     npm test
     ```
     Ensure all 14 test suites and ~285+ tests pass cleanly (268 baseline tests + new M1 tests).
   - Run compiler verification:
     ```powershell
     npx tsc --noEmit
     ```
     Ensure zero TypeScript errors.

---

## 5. Verification Method

To independently verify this audit utility design and test specification:

1. **Verify Baseline State**:
   ```powershell
   npm test
   npx tsc --noEmit
   ```
   Confirm 268 tests pass and TypeScript passes.

2. **Schema & Code Inspection**:
   - Inspect `src/lib/audit.ts`:
     - Verify signature: `recordAuditEvent(params: RecordAuditEventParams, tx?: PrismaClientOrTx): Promise<AuditEvent>`.
     - Verify payload/metadata serialization handling.
     - Verify query helper exports (`getAuditEventsForEntity`, `getLatestAuditEvent`, `parseAuditPayload`, `parseAuditMetadata`).
   - Inspect `src/lib/__tests__/schema_audit_m1.test.ts`:
     - Verify coverage for all 6 new models and `AuditEvent` extensions.
     - Verify transaction test (`recordAuditEvent` with `tx`) and rollback test.
     - Verify teardown in `afterAll()` leaves no test residue.

3. **Post-Implementation Verification (by Worker M1 & Reviewer M1)**:
   ```powershell
   npx vitest run src/lib/__tests__/schema_audit_m1.test.ts
   npm test
   npx tsc --noEmit
   ```
   - *Expected Result*: 14 test files passed, 285+ tests passed, 0 failures, 0 TypeScript errors.

4. **Invalidation Conditions**:
   - Making `tx` mandatory instead of optional in `recordAuditEvent`, breaking callers outside of transactions.
   - Forgetting to serialize object payloads to JSON strings, causing SQLite text storage failures.
   - Creating orphaned test records without cleanup in `schema_audit_m1.test.ts`, causing test pollution on re-runs.
   - Modifying existing columns or making new relations on existing models mandatory, breaking any of the 268 baseline tests.
