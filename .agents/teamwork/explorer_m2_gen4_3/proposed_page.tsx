import { Metadata } from 'next';
import Link from 'next/link';
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
  let allCreators: Array<{
    id: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    payoutDetails?: string | null;
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
    console.error('[ArtworkUploadPage] Failed to fetch creators from DB:', err);
  }

  // Fallback creators if database is unseeded
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
