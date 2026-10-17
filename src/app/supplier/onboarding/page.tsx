import React from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { SupplierOnboardingModal } from '@/components/portal/SupplierOnboardingModal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Become an ape-parel Supplier | ape-parel',
  description: 'Connect your apparel manufacturing facility and DTG printing services to the ape-parel production pipeline.',
};

export default async function SupplierOnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/supplier/onboarding');
  }

  const existingProfile = await prisma.supplierProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (existingProfile) {
    redirect(`/supplier/dashboard?supplier=${encodeURIComponent(existingProfile.slug)}`);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
      <SupplierOnboardingModal
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
