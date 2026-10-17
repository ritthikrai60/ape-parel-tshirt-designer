import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserJournalData } from '@/lib/journal';
import { UserJournalClient } from '@/components/portal/UserJournalClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Apparel Journal | ape-parel',
  description:
    'Explore your customized apparel design history, transparent itemized cost breakdowns, and authentic digital creator licensing certificates.',
};

export default async function UserJournalPage() {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/account/journal');
  }

  const userId = (session.user as any).id as string;
  // ─────────────────────────────────────────────────────────────────────────

  const summary = await getUserJournalData(userId);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <UserJournalClient summary={summary} />
    </div>
  );
}
