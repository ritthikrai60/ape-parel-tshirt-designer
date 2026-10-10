import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getCreatorLedgerSummary, getCreatorLedgerEntries } from '@/lib/royalties';
import { CreatorDashboardClient } from '@/components/portal/CreatorDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creator Royalty Dashboard | ape-parel',
  description:
    'Monitor live royalty earnings, sales volume, running ledger balance, and execute instant payout settlements.',
};

interface CreatorDashboardPageProps {
  searchParams?: {
    creator?: string;
  };
}

export default async function CreatorDashboardPage({
  searchParams,
}: CreatorDashboardPageProps) {
  let allCreators: Array<{
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    payoutDetails: string | null;
  }> = [];

  try {
    const dbCreators = await prisma.creatorProfile.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (dbCreators && dbCreators.length > 0) {
      allCreators = dbCreators.map((c) => ({
        id: c.id,
        slug: c.slug,
        displayName: c.displayName,
        avatarUrl: c.avatarUrl,
        payoutDetails: c.payoutDetails,
      }));
    }
  } catch (err) {
    console.error('[CreatorDashboardPage] Failed to load creators from DB:', err);
  }

  // Fallback creators if unseeded
  if (allCreators.length === 0) {
    allCreators = [
      {
        id: 'creator-dash-ape',
        slug: 'dash-ape',
        displayName: 'Dash Ape Studio',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        payoutDetails: 'PromptPay: 081-998-7711 (Dash Ape Studio Ltd.)',
      },
      {
        id: 'creator-cyber-monk',
        slug: 'cyber-monk',
        displayName: 'Cyber Monk',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        payoutDetails: 'PromptPay: 089-445-6622',
      },
      {
        id: 'creator-soma',
        slug: 'soma-botanica',
        displayName: 'Soma Botanica',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        payoutDetails: 'Bangkok Bank: 981-0-12847-1',
      },
    ];
  }

  const activeSlug = searchParams?.creator || allCreators[0]?.slug || 'dash-ape';

  let summary = null;
  let entries: any[] = [];

  try {
    summary = await getCreatorLedgerSummary(activeSlug);
    entries = await getCreatorLedgerEntries(activeSlug, { limit: 100 });
  } catch (err) {
    console.error(`[CreatorDashboardPage] Failed to load ledger data for ${activeSlug}:`, err);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CreatorDashboardClient
        initialSummary={summary}
        initialEntries={entries}
        allCreators={allCreators}
        currentSlug={activeSlug}
      />
    </div>
  );
}
