import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminSupplierVerificationClient } from '@/components/portal/AdminSupplierVerificationClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Supplier KYB Verification Queue | ape-parel Backoffice',
  description: 'Inspect and verify apparel manufacturing suppliers, review business registration certificates, and grant production permissions.',
};

export default async function AdminSuppliersVerificationPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin/suppliers');
  }

  if (role !== 'ADMIN') {
    redirect('/403');
  }

  let suppliers: any[] = [];
  let counts = { pending: 0, approved: 0, rejected: 0, total: 0 };

  try {
    const rawSuppliers = await prisma.supplierProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        printingServices: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    suppliers = rawSuppliers.map((s) => ({
      id: s.id,
      slug: s.slug,
      companyName: s.companyName,
      description: s.description,
      location: s.location,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      taxId: s.taxId,
      verified: s.verified,
      verificationStatus: s.verificationStatus,
      dbdDocUrl: s.dbdDocUrl,
      vatDocUrl: s.vatDocUrl,
      bankBookDocUrl: s.bankBookDocUrl,
      machineryPhotos: s.machineryPhotos,
      rejectionReason: s.rejectionReason,
      reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
      reviewedById: s.reviewedById,
      createdAt: s.createdAt.toISOString(),
      user: s.user,
      _count: s._count,
    }));

    counts = {
      pending: suppliers.filter((s) => s.verificationStatus === 'PENDING').length,
      approved: suppliers.filter((s) => s.verificationStatus === 'APPROVED').length,
      rejected: suppliers.filter((s) => s.verificationStatus === 'REJECTED').length,
      total: suppliers.length,
    };
  } catch (error) {
    console.error('[AdminSuppliersVerificationPage] Failed to fetch suppliers:', error);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminSupplierVerificationClient
        initialSuppliers={suppliers}
        initialCounts={counts}
      />
    </div>
  );
}
