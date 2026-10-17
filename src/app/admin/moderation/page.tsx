import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminModerationClient } from '@/components/portal/AdminModerationClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Artwork Moderation Queue | ape-parel Backoffice',
  description: 'Review and approve/reject creator graphic designs before publishing to Marketplace and 3D Studio.',
};

export default async function AdminModerationPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin/moderation');
  }

  if (role !== 'ADMIN') {
    redirect('/403');
  }

  let artworks: any[] = [];
  let counts = { pending: 0, approved: 0, rejected: 0 };

  try {
    const rawArtworks = await prisma.artwork.findMany({
      include: {
        creator: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            slug: true,
            avatarUrl: true,
          },
        },
        fileSpec: true,
        licenseOptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    artworks = rawArtworks.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      previewUrl: a.previewUrl,
      originalUrl: a.originalUrl,
      mimeType: a.mimeType,
      tags: a.tags,
      status: a.status,
      moderationStatus: a.moderationStatus,
      moderationReason: a.moderationReason,
      moderatedAt: a.moderatedAt ? a.moderatedAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      creator: a.creator,
      fileSpec: a.fileSpec,
      licenseOptions: a.licenseOptions,
    }));

    counts = {
      pending: artworks.filter((a) => a.moderationStatus === 'PENDING').length,
      approved: artworks.filter((a) => a.moderationStatus === 'APPROVED').length,
      rejected: artworks.filter((a) => a.moderationStatus === 'REJECTED').length,
    };
  } catch (err) {
    console.error('[AdminModerationPage] Database fetch error:', err);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminModerationClient initialArtworks={artworks} initialCounts={counts} />
    </div>
  );
}
