import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserJournalData } from '@/lib/journal';
import { getUserVaultData } from '@/lib/vault';
import { UserJournalClient } from '@/components/portal/UserJournalClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Design Vault & Permanent IP | ape-parel',
  description:
    'Manage your permanent IP licenses, wishlisted artworks, and saved custom apparel designs in your personal vault.',
};

export default async function UserVaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?callbackUrl=/account/vault');
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const userId = ((session.user as any).id || (session.user as any).sub) as string;

  const [vaultData, summary] = await Promise.all([
    getUserVaultData(userId),
    getUserJournalData(userId),
  ]);

  const requestedTab = resolvedParams?.tab?.toUpperCase();
  const initialTab =
    requestedTab === 'WISHLIST'
      ? 'WISHLIST'
      : requestedTab === 'PERMANENT_IP' || requestedTab === 'PERMANENT'
      ? 'PERMANENT_IP'
      : requestedTab === 'ORDER'
      ? 'ORDER'
      : requestedTab === 'DRAFT'
      ? 'DRAFT'
      : vaultData.permanentIps.length > 0
      ? 'PERMANENT_IP'
      : 'ALL';

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <UserJournalClient summary={summary} vaultData={vaultData} initialTab={initialTab} />
    </div>
  );
}
