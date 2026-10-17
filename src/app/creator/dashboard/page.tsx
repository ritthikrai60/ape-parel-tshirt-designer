import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
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
    onboard?: string;
    onboarding?: string;
  };
}

export default async function CreatorDashboardPage({
  searchParams,
}: CreatorDashboardPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/creator/dashboard');
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
    console.error('[CreatorDashboardPage] Error querying user profile:', e);
  }

  const needsOnboarding =
    !userCreatorProfile ||
    searchParams?.onboard === 'true' ||
    searchParams?.onboarding === 'true' ||
    searchParams?.creator === 'onboard';

  // Only load the creator's own profile for non-admin users
  let allCreators: Array<{
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    payoutDetails: string | null;
  }> = [];

  try {
    if (role === 'ADMIN') {
      // Admins can see all creators
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
      // Regular creators see only their own profile
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
    console.error('[CreatorDashboardPage] Failed to load creators from DB:', err);
  }

  const activeSlug =
    role === 'ADMIN'
      ? searchParams?.creator || allCreators[0]?.slug || ''
      : userCreatorProfile?.slug || '';

  let summary = null;
  let entries: any[] = [];
  let artworks: any[] = [];

  if (activeSlug) {
    try {
      summary = await getCreatorLedgerSummary(activeSlug);
      entries = await getCreatorLedgerEntries(activeSlug, { limit: 100 });
      artworks = await prisma.artwork.findMany({
        where: {
          creator: { slug: activeSlug },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          previewUrl: true,
          status: true,
          moderationStatus: true,
          moderationReason: true,
          moderatedAt: true,
          licenseOptions: {
            select: { price: true },
            take: 1,
          },
          createdAt: true,
        },
      });
    } catch (err) {
      console.error(`[CreatorDashboardPage] Failed to load ledger data for ${activeSlug}:`, err);
    }
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CreatorDashboardClient
        initialSummary={summary}
        initialEntries={entries}
        initialArtworks={artworks}
        allCreators={allCreators}
        currentSlug={activeSlug}
        needsOnboarding={needsOnboarding}
        initialUser={session?.user}
      />
    </div>
  );
}
