import React from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CreatorOnboardingModal } from '@/components/portal/CreatorOnboardingModal';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Become an ape-parel Creator | ape-parel',
  description: 'Join the creator-powered streetwear apparel marketplace. Set up your artist profile and receive 85% double-entry royalties.',
};

export default async function CreatorOnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/creator/onboarding');
  }

  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (existingProfile) {
    redirect(`/creator/dashboard?creator=${encodeURIComponent(existingProfile.slug)}`);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
      <CreatorOnboardingModal
        isOpen={true}
        initialUser={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }}
      />
    </div>
  );
}
