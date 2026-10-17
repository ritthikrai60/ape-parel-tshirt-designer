import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ArtworkUploadForm } from '@/components/portal/ArtworkUploadForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upload Graphic Artwork | ape-parel Creator Portal',
  description:
    'Upload high-resolution print master graphics with strict 300 DPI verification, alpha transparency enforcement, and THB licensing tier configuration.',
};

interface ArtworkUploadPageProps {
  searchParams?: {
    creator?: string;
  };
}

export default async function ArtworkUploadPage({
  searchParams,
}: ArtworkUploadPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/creator/upload');
  }

  if (role !== 'CREATOR' && role !== 'ADMIN') {
    redirect('/403');
  }

  const userId = (session.user as any).id as string;
  // ─────────────────────────────────────────────────────────────────────────

  let allCreators: Array<{
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    payoutDetails?: string | null;
  }> = [];

  try {
    if (role === 'ADMIN') {
      // Admins can upload on behalf of any creator
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
    } else {
      // Regular creators upload only to their own profile
      const ownProfile = await prisma.creatorProfile.findUnique({
        where: { userId },
      });
      if (ownProfile) {
        allCreators = [
          {
            id: ownProfile.id,
            slug: ownProfile.slug,
            displayName: ownProfile.displayName,
            avatarUrl: ownProfile.avatarUrl,
            payoutDetails: ownProfile.payoutDetails,
          },
        ];
      }
    }
  } catch (err) {
    console.error('[ArtworkUploadPage] Failed to fetch creators from DB:', err);
  }

  const activeSlug =
    role === 'ADMIN'
      ? searchParams?.creator || allCreators[0]?.slug || ''
      : allCreators[0]?.slug || '';

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center space-x-2 font-mono text-xs text-mutedGray">
        <Link href="/" className="hover:text-ink transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/creator/dashboard" className="hover:text-ink transition-colors">
          Creator Portal
        </Link>
        <span>/</span>
        <span className="text-ink font-bold">New Artwork Upload</span>
      </nav>

      {/* Main Upload Form Component */}
      <ArtworkUploadForm
        creators={allCreators}
        defaultCreatorSlug={activeSlug}
      />
    </div>
  );
}
