# Royalty Ledger & Settlement Service Specification Report

## 1. Observation

### 1.1 Existing Database Models & Relations
In `prisma/schema.prisma`:
- Lines 24–37: `CreatorProfile` defines `id` (cuid), `userId` (unique), `slug` (unique), `displayName`, `payoutDetails`, and relation to `artworks`.
- Lines 194–210: `RoyaltyObligation`:
  ```prisma
  model RoyaltyObligation {
    id              String                @id @default(cuid())
    orderId         String
    order           Order                 @relation(fields: [orderId], references: [id], onDelete: Cascade)
    creatorId       String
    artworkId       String
    artwork         Artwork               @relation(fields: [artworkId], references: [id])
    licenseOptionId String
    licenseOption   LicenseOption         @relation(fields: [licenseOptionId], references: [id])
    unitRoyalty     Int // in THB
    quantity        Int                   @default(1)
    totalAmount     Int // in THB
    status          String                @default("PENDING") // PENDING, ELIGIBLE, SETTLED, CANCELLED
    createdAt       DateTime              @default(now())
    updatedAt       DateTime              @updatedAt
    ledgerEntries   RoyaltyLedgerEntry[]
  }
  ```
- Lines 212–223: `RoyaltyLedgerEntry`:
  ```prisma
  model RoyaltyLedgerEntry {
    id           String             @id @default(cuid())
    creatorId    String
    obligationId String?
    obligation   RoyaltyObligation? @relation(fields: [obligationId], references: [id], onDelete: SetNull)
    entryType    String // EARNING, PAYOUT_SETTLEMENT, ADJUSTMENT
    amount       Int // in THB (positive or negative)
    balanceAfter Int // in THB
    reference    String?
    notes        String?
    createdAt    DateTime           @default(now())
  }
  ```
- Lines 225–234: `CreatorSettlement`:
  ```prisma
  model CreatorSettlement {
    id               String   @id @default(cuid())
    creatorId        String
    settlementNumber String   @unique
    totalAmount      Int // in THB
    status           String   @default("COMPLETED") // PENDING, COMPLETED, CANCELLED
    payoutReference  String?
    createdAt        DateTime @default(now())
    updatedAt        DateTime @updatedAt
  }
  ```
- Lines 236–245: `AuditEvent`:
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

### 1.2 Seeded Ground Truth Data in `dev.db`
Verified by live inspection query:
```
CREATORS:
- id: 'cmv1l9gp000048lk7wp6q51n8', slug: 'dash-ape', name: 'Dash Ape Studio'
- id: 'cmv1l9gpa00078lk7kiisri99', slug: 'cyber-monk', name: 'Cyber Monk'
- id: 'cmv1l9gpl000a8lk7zm8fd56i', slug: 'soma-botanica', name: 'Soma Botanica'

OBLIGATIONS:
- id: 'cmv1l9gtg001h8lk77efntfuo', creatorId: 'cmv1l9gp000048lk7wp6q51n8', unitRoyalty: 40, totalAmount: 40, status: 'ELIGIBLE'
- id: 'cmv1l9gtz001l8lk7d5ibv148', creatorId: 'cmv1l9gp000048lk7wp6q51n8', unitRoyalty: 60, totalAmount: 60, status: 'ELIGIBLE'
- id: 'cmv1l9gug001p8lk75rc5imwz', creatorId: 'cmv1l9gpa00078lk7kiisri99', unitRoyalty: 25, totalAmount: 25, status: 'ELIGIBLE'

LEDGERS:
- entry 1: creatorId: 'cmv1l9gp000048lk7wp6q51n8', amount: 40, balanceAfter: 40, entryType: 'EARNING'
- entry 2: creatorId: 'cmv1l9gp000048lk7wp6q51n8', amount: 60, balanceAfter: 100, entryType: 'EARNING'
- entry 3: creatorId: 'cmv1l9gpa00078lk7kiisri99', amount: 25, balanceAfter: 25, entryType: 'EARNING'
```

### 1.3 Existing Route Conventions
In `src/app/api/pricing/calculate/route.ts`:
- Uses `NextRequest`, `NextResponse` from `next/server`.
- Enforces `export const dynamic = 'force-dynamic';`.
- Uses Zod schema `safeParse(rawBody)`. Returns status 400 on parse error.
- Uses semantic HTTP status codes: 400 Bad Request, 404 Not Found, 500 Internal Server Error.

---

## 2. Logic Chain

1. **Relation Target for `creatorId`**:
   In `schema.prisma`, `RoyaltyObligation.creatorId`, `RoyaltyLedgerEntry.creatorId`, and `CreatorSettlement.creatorId` store the `CreatorProfile.id` (as demonstrated in `seed.mjs` lines 548, 560, 574, 586). However, callers from UI dashboards or API requests may pass either `creatorProfile.id`, `creatorProfile.slug` (e.g. `dash-ape`), or `user.id`. To make the library resilient, functions should resolve the input identifier against `id`, `slug`, or `userId` to find the canonical `CreatorProfile`, then use `creator.id` for all queries.

2. **Ledger Double-Entry Invariants & Running Balance**:
   - `RoyaltyLedgerEntry` represents an append-only transaction ledger.
   - Initial earning entries are positive: `entryType: 'EARNING'`, `amount > 0`.
   - Batch payout settlements are negative: `entryType: 'PAYOUT_SETTLEMENT'`, `amount = -totalPayoutAmount`.
   - `balanceAfter` is strictly: `previousBalance + amount`.
   - Current balance for a creator is determined by the most recent entry's `balanceAfter` (or `0` if no entries exist).
   - Invariant check: `balanceAfter === sum(all ledger amounts)` must hold across every order and payout transaction.

3. **Settlement Atomic Transaction (`prisma.$transaction`)**:
   Settlement must execute as an all-or-nothing transaction with the following exact steps:
   - **Step A: Find eligible obligations**: Query obligations with `creatorId: canonicalCreatorId` and `status: 'ELIGIBLE'` (with optional `obligationIds` filter). If count is 0, throw a business error ("No eligible royalty obligations found for settlement").
   - **Step B: Verify balance**: Compute `totalPayoutAmount = sum(eligibleObligations.totalAmount)`. Retrieve `balanceBefore` from the latest `RoyaltyLedgerEntry`. Verify `balanceBefore >= totalPayoutAmount`.
   - **Step C: Generate settlement number**: Generate a human-readable unique identifier formatted as `APX-STL-{YYYYMMDD}-{RANDOM5}` matching project standards (`APX-ORD-9021`).
   - **Step D: Create `CreatorSettlement`**: Insert record with `creatorId`, `settlementNumber`, `totalAmount: totalPayoutAmount`, `status: 'COMPLETED'`, `payoutReference`.
   - **Step E: Update obligations**: Execute `tx.royaltyObligation.updateMany` setting `status: 'SETTLED'` for the settled obligations.
   - **Step F: Write negative ledger entry**: Insert `RoyaltyLedgerEntry` with `entryType: 'PAYOUT_SETTLEMENT'`, `amount: -totalPayoutAmount`, `balanceAfter: balanceBefore - totalPayoutAmount`, `reference: settlementNumber`, and descriptive notes.
   - **Step G: Write AuditEvent**: Insert `AuditEvent` recording `action: 'ROYALTY_PAYOUT_SETTLED'`, `entityType: 'CreatorSettlement'`, and payload JSON for end-to-end traceability.

4. **Summary Metrics Calculation (`getCreatorLedgerSummary`)**:
   The Creator Dashboard requires:
   - `currentBalance`: from latest ledger `balanceAfter`.
   - `lifetimeEarnings`: sum of all positive `EARNING` ledger amounts (or fallback to eligible + settled obligations sum).
   - `totalSettled`: sum of `COMPLETED` settlements.
   - `salesVolume`: sum of quantities for eligible and settled obligations.
   - Breakdown of obligations: `pendingObligations`, `eligibleObligations`, `settledObligations` (counts and sums).
   - Recent 10 ledger entries and recent 5 settlements.

5. **API Route Architecture (`src/app/api/royalties/settle/route.ts`)**:
   - `POST` endpoint receives `{ creatorId, payoutReference?, obligationIds?, notes? }`.
   - Validates using Zod (`settleRoyaltiesSchema`).
   - Executes `executeCreatorPayoutSettlement`. Returns HTTP 200 with `{ success: true, settlement }`.
   - Translates domain errors: 404 (creator missing), 400 (validation error, zero balance, no eligible obligations), 500 (internal error).
   - Companion `GET` endpoint accepts `?creatorId=...` and returns the `CreatorLedgerSummary` for easy client inspection and dashboard polling.

---

## 3. Caveats

1. **Concurrency in SQLite**: In SQLite, concurrent write transactions are queued via file lock. In production PostgreSQL/MySQL, row-level locking or optimistic locking would be recommended. For the current SQLite engine, `prisma.$transaction` provides full ACID serializability.
2. **Partial vs Full Settlement**: By default, `executeCreatorPayoutSettlement` settles all obligations currently in `ELIGIBLE` status for the creator. An optional `obligationIds` array parameter is supported if partial settlement of specific line items is requested.
3. **Foreign Keys**: `RoyaltyObligation.creatorId` and `RoyaltyLedgerEntry.creatorId` are plain strings in SQLite rather than formal foreign key constraints in `schema.prisma`. Therefore, explicit application-level verification that `creatorId` resolves to an existing `CreatorProfile` is strictly enforced before running transactions.

---

## 4. Conclusion & Complete Implementation Specifications

### 4.1 Type Definitions (`src/lib/types.ts` additions)
The following interfaces must be appended to `src/lib/types.ts`:

```typescript
export interface ObligationStatusSummary {
  count: number;
  totalAmount: number;
}

export interface CreatorLedgerSummary {
  creatorId: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  payoutDetails: string | null;
  currentBalance: number; // In THB, available for withdrawal
  lifetimeEarnings: number; // In THB, all historical gross earnings
  totalSettled: number; // In THB, all settled payouts
  salesVolume: number; // Total units of licensed garments sold
  pendingObligations: ObligationStatusSummary;
  eligibleObligations: ObligationStatusSummary;
  settledObligations: ObligationStatusSummary;
  recentLedgerEntries: Array<{
    id: string;
    obligationId: string | null;
    entryType: string;
    amount: number;
    balanceAfter: number;
    reference: string | null;
    notes: string | null;
    createdAt: Date;
  }>;
  recentSettlements: Array<{
    id: string;
    settlementNumber: string;
    totalAmount: number;
    status: string;
    payoutReference: string | null;
    createdAt: Date;
  }>;
}

export interface SettlementResult {
  settlementId: string;
  settlementNumber: string;
  creatorId: string;
  creatorName: string;
  totalAmount: number; // In THB
  settledObligationsCount: number;
  settledObligationIds: string[];
  balanceBefore: number;
  balanceAfter: number;
  ledgerEntryId: string;
  payoutReference: string | null;
  status: 'COMPLETED';
  settledAt: Date;
}

export interface PayoutSettlementOptions {
  payoutRef?: string;
  obligationIds?: string[];
  notes?: string;
}

export interface RoyaltyLedgerEntryDetails {
  id: string;
  creatorId: string;
  obligationId: string | null;
  entryType: string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  obligation?: {
    id: string;
    orderId: string;
    unitRoyalty: number;
    quantity: number;
    status: string;
    artwork: {
      id: string;
      title: string;
      previewUrl: string;
    };
  } | null;
}
```

---

### 4.2 Royalty Service Implementation (`src/lib/royalties.ts`)
The complete, production-ready specification for `src/lib/royalties.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  CreatorLedgerSummary,
  SettlementResult,
  PayoutSettlementOptions,
  RoyaltyLedgerEntryDetails,
} from '@/lib/types';

/**
 * Generate human-readable, auditable settlement reference number
 * Example: APX-STL-20261010-9F2KA
 */
export function generateSettlementNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `APX-STL-${dateStr}-${randomSuffix}`;
}

/**
 * Resolve creator profile from either ID, slug, or userId
 */
async function resolveCreatorProfile(identifier: string) {
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      OR: [
        { id: identifier },
        { slug: identifier },
        { userId: identifier },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return creator;
}

/**
 * Calculate comprehensive creator ledger summary:
 * - Current available balance
 * - Gross lifetime earnings
 * - Total settled payouts
 * - Obligation counts & amounts (pending, eligible, settled)
 * - Sales volume (units sold)
 * - Recent ledger entries and settlements
 */
export async function getCreatorLedgerSummary(
  creatorIdOrSlug: string
): Promise<CreatorLedgerSummary> {
  const creator = await resolveCreatorProfile(creatorIdOrSlug);
  if (!creator) {
    throw new Error(`Creator profile not found for identifier "${creatorIdOrSlug}".`);
  }

  const canonicalCreatorId = creator.id;

  // 1. Group obligations by status
  const obligationStats = await prisma.royaltyObligation.groupBy({
    by: ['status'],
    where: { creatorId: canonicalCreatorId },
    _count: { id: true },
    _sum: { totalAmount: true },
  });

  let pendingObligations = { count: 0, totalAmount: 0 };
  let eligibleObligations = { count: 0, totalAmount: 0 };
  let settledObligations = { count: 0, totalAmount: 0 };

  for (const stat of obligationStats) {
    const count = stat._count.id;
    const total = stat._sum.totalAmount ?? 0;
    if (stat.status === 'PENDING') {
      pendingObligations = { count, totalAmount: total };
    } else if (stat.status === 'ELIGIBLE') {
      eligibleObligations = { count, totalAmount: total };
    } else if (stat.status === 'SETTLED') {
      settledObligations = { count, totalAmount: total };
    }
  }

  // 2. Query running balance from latest ledger entry
  const latestLedgerEntry = await prisma.royaltyLedgerEntry.findFirst({
    where: { creatorId: canonicalCreatorId },
    orderBy: { createdAt: 'desc' },
  });

  const currentBalance = latestLedgerEntry?.balanceAfter ?? 0;

  // 3. Compute gross lifetime earnings from EARNING entries
  const earningsAgg = await prisma.royaltyLedgerEntry.aggregate({
    where: {
      creatorId: canonicalCreatorId,
      entryType: 'EARNING',
    },
    _sum: { amount: true },
  });

  const lifetimeEarnings =
    earningsAgg._sum.amount ?? (eligibleObligations.totalAmount + settledObligations.totalAmount);

  // 4. Compute total settled amount from COMPLETED settlements
  const settlementAgg = await prisma.creatorSettlement.aggregate({
    where: {
      creatorId: canonicalCreatorId,
      status: 'COMPLETED',
    },
    _sum: { totalAmount: true },
  });

  const totalSettled = settlementAgg._sum.totalAmount ?? settledObligations.totalAmount;

  // 5. Total sales volume in units
  const salesVolumeAgg = await prisma.royaltyObligation.aggregate({
    where: {
      creatorId: canonicalCreatorId,
      status: { in: ['ELIGIBLE', 'SETTLED'] },
    },
    _sum: { quantity: true },
  });

  const salesVolume = salesVolumeAgg._sum.quantity ?? 0;

  // 6. Recent ledger entries
  const recentLedgerEntries = await prisma.royaltyLedgerEntry.findMany({
    where: { creatorId: canonicalCreatorId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      obligationId: true,
      entryType: true,
      amount: true,
      balanceAfter: true,
      reference: true,
      notes: true,
      createdAt: true,
    },
  });

  // 7. Recent settlements
  const recentSettlements = await prisma.creatorSettlement.findMany({
    where: { creatorId: canonicalCreatorId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      settlementNumber: true,
      totalAmount: true,
      status: true,
      payoutReference: true,
      createdAt: true,
    },
  });

  return {
    creatorId: canonicalCreatorId,
    displayName: creator.displayName,
    slug: creator.slug,
    avatarUrl: creator.avatarUrl,
    payoutDetails: creator.payoutDetails,
    currentBalance,
    lifetimeEarnings,
    totalSettled,
    salesVolume,
    pendingObligations,
    eligibleObligations,
    settledObligations,
    recentLedgerEntries,
    recentSettlements,
  };
}

/**
 * Execute atomic batch payout settlement transaction:
 * 1. Validates creator and eligible obligations
 * 2. Checks sufficient ledger balance
 * 3. Updates eligible obligations to SETTLED
 * 4. Creates CreatorSettlement record
 * 5. Writes negative RoyaltyLedgerEntry (entryType: 'PAYOUT_SETTLEMENT')
 * 6. Records AuditEvent
 */
export async function executeCreatorPayoutSettlement(
  creatorIdOrSlug: string,
  optionsOrPayoutRef?: string | PayoutSettlementOptions
): Promise<SettlementResult> {
  const options: PayoutSettlementOptions =
    typeof optionsOrPayoutRef === 'string'
      ? { payoutRef: optionsOrPayoutRef }
      : optionsOrPayoutRef ?? {};

  // 1. Resolve creator profile
  const creator = await resolveCreatorProfile(creatorIdOrSlug);
  if (!creator) {
    throw new Error(`Creator profile not found for identifier "${creatorIdOrSlug}".`);
  }

  const canonicalCreatorId = creator.id;

  // 2. Execute within ACID transaction
  return await prisma.$transaction(async (tx) => {
    // 2a. Query obligations eligible for settlement
    const whereClause: Prisma.RoyaltyObligationWhereInput = {
      creatorId: canonicalCreatorId,
      status: 'ELIGIBLE',
    };

    if (options.obligationIds && options.obligationIds.length > 0) {
      whereClause.id = { in: options.obligationIds };
    }

    const eligibleObligations = await tx.royaltyObligation.findMany({
      where: whereClause,
    });

    if (eligibleObligations.length === 0) {
      throw new Error(
        `No eligible royalty obligations found for settlement for creator "${creator.displayName}" (${canonicalCreatorId}).`
      );
    }

    if (options.obligationIds && options.obligationIds.length > 0) {
      const foundIds = new Set(eligibleObligations.map((o) => o.id));
      const missingIds = options.obligationIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new Error(
          `Obligations [${missingIds.join(', ')}] are not in ELIGIBLE status or do not belong to creator "${creator.displayName}".`
        );
      }
    }

    // 2b. Compute total payout amount
    const totalPayoutAmount = eligibleObligations.reduce(
      (sum, ob) => sum + ob.totalAmount,
      0
    );

    if (totalPayoutAmount <= 0) {
      throw new Error(
        `Settlement amount must be greater than zero. Found ${totalPayoutAmount} THB.`
      );
    }

    // 2c. Get current balance from latest ledger entry
    const latestLedgerEntry = await tx.royaltyLedgerEntry.findFirst({
      where: { creatorId: canonicalCreatorId },
      orderBy: { createdAt: 'desc' },
    });

    const balanceBefore = latestLedgerEntry?.balanceAfter ?? 0;

    if (balanceBefore < totalPayoutAmount) {
      throw new Error(
        `Insufficient ledger balance. Current balance (${balanceBefore} THB) is less than settlement amount (${totalPayoutAmount} THB).`
      );
    }

    const balanceAfter = balanceBefore - totalPayoutAmount;

    // 2d. Generate unique settlement number
    const settlementNumber = generateSettlementNumber();

    // 2e. Create CreatorSettlement record
    const settlement = await tx.creatorSettlement.create({
      data: {
        creatorId: canonicalCreatorId,
        settlementNumber,
        totalAmount: totalPayoutAmount,
        status: 'COMPLETED',
        payoutReference: options.payoutRef ?? null,
      },
    });

    // 2f. Transition obligations to SETTLED
    const obligationIdsToSettle = eligibleObligations.map((o) => o.id);
    await tx.royaltyObligation.updateMany({
      where: { id: { in: obligationIdsToSettle } },
      data: { status: 'SETTLED' },
    });

    // 2g. Post negative RoyaltyLedgerEntry
    const ledgerNotes =
      options.notes ??
      `Payout settlement ${settlementNumber} for ${obligationIdsToSettle.length} obligations (${totalPayoutAmount} THB)` +
        (options.payoutRef ? ` [Ref: ${options.payoutRef}]` : '');

    const ledgerEntry = await tx.royaltyLedgerEntry.create({
      data: {
        creatorId: canonicalCreatorId,
        obligationId: null, // Aggregated settlement line item
        entryType: 'PAYOUT_SETTLEMENT',
        amount: -totalPayoutAmount,
        balanceAfter,
        reference: settlementNumber,
        notes: ledgerNotes,
      },
    });

    // 2h. Create audit trail event
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

    return {
      settlementId: settlement.id,
      settlementNumber,
      creatorId: canonicalCreatorId,
      creatorName: creator.displayName,
      totalAmount: totalPayoutAmount,
      settledObligationsCount: obligationIdsToSettle.length,
      settledObligationIds: obligationIdsToSettle,
      balanceBefore,
      balanceAfter,
      ledgerEntryId: ledgerEntry.id,
      payoutReference: settlement.payoutReference,
      status: 'COMPLETED',
      settledAt: settlement.createdAt,
    };
  });
}

/**
 * Query itemized ledger entries for creator dashboard pagination
 */
export async function getCreatorLedgerEntries(
  creatorIdOrSlug: string,
  options?: { limit?: number; offset?: number; entryType?: string }
): Promise<RoyaltyLedgerEntryDetails[]> {
  const creator = await resolveCreatorProfile(creatorIdOrSlug);
  if (!creator) {
    throw new Error(`Creator profile not found for identifier "${creatorIdOrSlug}".`);
  }

  const entries = await prisma.royaltyLedgerEntry.findMany({
    where: {
      creatorId: creator.id,
      ...(options?.entryType ? { entryType: options.entryType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      obligation: {
        select: {
          id: true,
          orderId: true,
          unitRoyalty: true,
          quantity: true,
          status: true,
          artwork: {
            select: {
              id: true,
              title: true,
              previewUrl: true,
            },
          },
        },
      },
    },
  });

  return entries;
}

/**
 * Query settlement history for creator
 */
export async function getCreatorSettlements(
  creatorIdOrSlug: string,
  options?: { limit?: number; offset?: number }
) {
  const creator = await resolveCreatorProfile(creatorIdOrSlug);
  if (!creator) {
    throw new Error(`Creator profile not found for identifier "${creatorIdOrSlug}".`);
  }

  return await prisma.creatorSettlement.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 20,
    skip: options?.offset ?? 0,
  });
}
```

---

### 4.3 API Route Specification (`src/app/api/royalties/settle/route.ts`)
The complete, production-ready specification for `src/app/api/royalties/settle/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  executeCreatorPayoutSettlement,
  getCreatorLedgerSummary,
} from '@/lib/royalties';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

/**
 * Zod validation schema for payout settlement
 */
const settleRoyaltiesSchema = z.object({
  creatorId: z
    .string({ required_error: 'creatorId is required' })
    .min(1, 'creatorId cannot be empty'),
  payoutReference: z
    .string()
    .trim()
    .max(100, 'payoutReference cannot exceed 100 characters')
    .optional(),
  obligationIds: z
    .array(z.string().min(1, 'obligationId cannot be empty'))
    .optional(),
  notes: z
    .string()
    .max(500, 'notes cannot exceed 500 characters')
    .optional(),
});

/**
 * POST /api/royalties/settle
 * Executes an atomic batch payout settlement for eligible creator royalties
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        message: 'Request body must be a valid JSON object.',
      },
      { status: 400 }
    );
  }

  // 2. Validate payload with Zod
  const parseResult = settleRoyaltiesSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid settlement payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const { creatorId, payoutReference, obligationIds, notes } = parseResult.data;

  // 3. Execute settlement transaction
  try {
    const result = await executeCreatorPayoutSettlement(creatorId, {
      payoutRef: payoutReference,
      obligationIds,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        settlement: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown settlement error occurred';

    // Creator not found -> 404
    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Business validation errors -> 400
    if (
      message.includes('No eligible royalty obligations') ||
      message.includes('Insufficient ledger balance') ||
      message.includes('Settlement amount must be greater than zero') ||
      message.includes('not in ELIGIBLE status')
    ) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message,
        },
        { status: 400 }
      );
    }

    // Internal Server Error -> 500
    console.error('[POST /api/royalties/settle] Settlement failure:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process royalty settlement transaction.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/royalties/settle?creatorId=...
 * Query creator ledger summary & settlement status preview
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creatorId');

  if (!creatorId) {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Query parameter "creatorId" is required.',
      },
      { status: 400 }
    );
  }

  try {
    const summary = await getCreatorLedgerSummary(creatorId);
    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown query error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    console.error('[GET /api/royalties/settle] Summary query error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch creator royalty summary.',
      },
      { status: 500 }
    );
  }
}
```

---

### 4.4 Test Specifications for `src/lib/__tests__/orders_royalties.test.ts`
The implementer of Milestone 2 should include these integration test suites to verify `royalties.ts`:

1. **Pre-Settlement Ledger Summary Verification**:
   - Query `getCreatorLedgerSummary('dash-ape')`.
   - Assert `currentBalance === 100`, `lifetimeEarnings === 100`, `totalSettled === 0`.
   - Assert `eligibleObligations.count === 2`, `eligibleObligations.totalAmount === 100`.

2. **Execution of Payout Settlement**:
   - Call `executeCreatorPayoutSettlement('dash-ape', 'PP-TEST-1002')`.
   - Assert returned `SettlementResult.totalAmount === 100`.
   - Assert `settledObligationsCount === 2`.
   - Assert `balanceBefore === 100`, `balanceAfter === 0`.
   - Assert `settlementNumber` matches regex `/^APX-STL-\d{8}-[A-Z0-9]{5}$/`.

3. **Post-Settlement Ledger Summary Verification**:
   - Re-query `getCreatorLedgerSummary('dash-ape')`.
   - Assert `currentBalance === 0`.
   - Assert `lifetimeEarnings === 100` (unchanged gross earnings).
   - Assert `totalSettled === 100`.
   - Assert `eligibleObligations.count === 0`, `settledObligations.count === 2`.

4. **Double-Settlement Defense**:
   - Call `executeCreatorPayoutSettlement('dash-ape')` a second time immediately.
   - Assert rejects with error matching `/No eligible royalty obligations/i`.

5. **Zero-Balance Creator Defense**:
   - Call `executeCreatorPayoutSettlement('soma-botanica')`.
   - Assert rejects with error matching `/No eligible royalty obligations/i`.

6. **Transaction Rollback & Isolation**:
   - Verify that any injected failure mid-transaction (e.g., duplicate settlement number or simulated error) rolls back obligations back to `ELIGIBLE` with zero orphan records in `CreatorSettlement` or `RoyaltyLedgerEntry`.

---

## 5. Verification Method

To independently verify the implementation:
1. **Type Checking**:
   ```powershell
   npx tsc --noEmit
   ```
   Must exit with code 0 and zero TypeScript diagnostic errors.

2. **Test Suite Execution**:
   ```powershell
   npm test
   ```
   Must execute all tests across `src/lib/__tests__/` including `pricing.test.ts` and the new `orders_royalties.test.ts` successfully with 100% pass rate.

3. **Database Reset & Seed Verification**:
   ```powershell
   node prisma/seed.mjs
   ```
   Must execute without errors, restoring the benchmark records.

4. **Invalidation Conditions**:
   - Any settlement that produces a negative `balanceAfter` (violating `balanceBefore >= totalPayoutAmount`).
   - Any obligation remaining in `ELIGIBLE` after a payout has completed.
   - Any settlement record created without an accompanying negative `RoyaltyLedgerEntry` or without `AuditEvent`.
   - Inability to query `getCreatorLedgerSummary` via creator `slug` or `id`.
