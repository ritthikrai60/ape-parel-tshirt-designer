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
export async function resolveCreatorProfile(identifier: string) {
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
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
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

    if (options.obligationIds && options.obligationIds.length > 0) {
      const foundIds = new Set(eligibleObligations.map((o) => o.id));
      const missingIds = options.obligationIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new Error(
          `Obligations [${missingIds.join(', ')}] are not in ELIGIBLE status or do not belong to creator "${creator.displayName}". (No eligible royalty obligations found for settlement.)`
        );
      }
    }

    if (eligibleObligations.length === 0) {
      throw new Error(
        `No eligible royalty obligations found for settlement for creator "${creator.displayName}" (${canonicalCreatorId}).`
      );
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
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
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
