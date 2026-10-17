import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  getCreatorJournalData,
  calculateWithholdingTax,
  generate50TawiSummary,
  MIN_PAYOUT_THRESHOLD_THB,
} from '@/lib/creatorJournal';
import { CreatorJournalClient } from '@/components/portal/CreatorJournalClient';
import { CreatorLedgerSummary, RoyaltyLedgerEntryDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creator Royalty Journal & Payouts | ape-parel',
  description:
    'Transparent double-entry royalty ledger, 3% Withholding Tax (WHT) calculations with digital 50 Tawi tax summaries, and real-time PromptPay/bank settlement.',
};

interface CreatorJournalPageProps {
  searchParams?: {
    creator?: string | string[];
    creatorId?: string | string[];
    onboard?: string;
    onboarding?: string;
  };
}

export default async function CreatorJournalPage({
  searchParams,
}: CreatorJournalPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/creator/journal');
  }

  if (role !== 'CREATOR' && role !== 'ADMIN') {
    redirect('/403');
  }

  const userId = (session.user as any).id as string;
  // ─────────────────────────────────────────────────────────────────────────

  let userCreatorProfile = null;
  try {
    userCreatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId },
    });
  } catch (e) {
    console.error('[CreatorJournalPage] Error checking profile:', e);
  }

  const needsOnboarding =
    !userCreatorProfile ||
    searchParams?.onboard === 'true' ||
    searchParams?.onboarding === 'true' ||
    searchParams?.creator === 'onboard';

  // Admins see all creators; regular creators see only their own
  let allCreators: Array<{
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    payoutDetails: string | null;
  }> = [];

  try {
    if (role === 'ADMIN') {
      const dbCreators = await prisma.creatorProfile.findMany({
        orderBy: { createdAt: 'asc' },
      });
      allCreators = dbCreators.map((c) => ({
        id: c.id,
        slug: c.slug,
        displayName: c.displayName,
        avatarUrl: c.avatarUrl,
        payoutDetails: c.payoutDetails,
      }));
    } else if (userCreatorProfile) {
      allCreators = [
        {
          id: userCreatorProfile.id,
          slug: userCreatorProfile.slug,
          displayName: userCreatorProfile.displayName,
          avatarUrl: userCreatorProfile.avatarUrl,
          payoutDetails: userCreatorProfile.payoutDetails,
        },
      ];
    }
  } catch (err) {
    console.error('[CreatorJournalPage] Failed to load creators from DB:', err);
  }

  // Determine the active creator slug
  const queryParam = searchParams?.creator ?? searchParams?.creatorId;
  const rawCreator = Array.isArray(queryParam) ? queryParam[0] : queryParam;
  const trimmedCreator = typeof rawCreator === 'string' ? rawCreator.trim() : undefined;

  const activeSlug =
    role === 'ADMIN'
      ? trimmedCreator || allCreators[0]?.slug || ''
      : userCreatorProfile?.slug || '';

  let summary: CreatorLedgerSummary;
  let entries: RoyaltyLedgerEntryDetails[] = [];

  try {
    const journalData = await getCreatorJournalData(activeSlug);
    summary = journalData.summary;
    entries = journalData.entries;
  } catch (err) {
    console.error(`[CreatorJournalPage] Failed to query journal data for ${activeSlug}:`, err);
    const activeCreator =
      allCreators.find((c) => c.slug === activeSlug || c.id === activeSlug) ||
      allCreators[0] || {
        id: 'creator-unknown',
        slug: 'unknown',
        displayName: 'Creator',
        avatarUrl: null,
        payoutDetails: null,
      };
    summary = {
      creatorId: activeCreator.id,
      displayName: activeCreator.displayName,
      slug: activeCreator.slug,
      avatarUrl: activeCreator.avatarUrl,
      payoutDetails: activeCreator.payoutDetails,
      currentBalance: 0,
      lifetimeEarnings: 0,
      totalSettled: 0,
      salesVolume: 0,
      pendingObligations: { count: 0, totalAmount: 0 },
      eligibleObligations: { count: 0, totalAmount: 0 },
      settledObligations: { count: 0, totalAmount: 0 },
      recentLedgerEntries: [],
      recentSettlements: [],
    };
  }

  // Ensure allCreators includes active summary creator for the dropdown selector
  if (
    summary &&
    allCreators.every((c) => c.slug !== summary.slug && c.id !== summary.creatorId)
  ) {
    allCreators = [
      {
        id: summary.creatorId,
        slug: summary.slug,
        displayName: summary.displayName,
        avatarUrl: summary.avatarUrl,
        payoutDetails: summary.payoutDetails,
      },
      ...allCreators,
    ];
  }

  const tax = calculateWithholdingTax(summary.lifetimeEarnings);
  const taxSlip = generate50TawiSummary(
    {
      id: summary.creatorId,
      displayName: summary.displayName,
      slug: summary.slug,
      payoutDetails: summary.payoutDetails,
    },
    summary.lifetimeEarnings
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none">
      <CreatorJournalClient
        key={summary?.slug || activeSlug}
        initialSummary={summary}
        initialEntries={entries}
        initialTax={tax}
        initialTaxSlip={taxSlip}
        allCreators={allCreators}
        currentSlug={summary?.slug || activeSlug}
        needsOnboarding={needsOnboarding}
        initialUser={session?.user}
      />
    </div>
  );
}
