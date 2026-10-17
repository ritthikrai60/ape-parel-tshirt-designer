import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SupplierDashboardClient } from '@/components/portal/SupplierDashboardClient';
import { getSupplierInventoryMatrix } from '@/lib/supplier';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Supplier Production Dashboard | ape-parel',
  description:
    'Manage apparel production job queues, advance manufacturing statuses, and download factory RIP specifications.',
};

interface SupplierDashboardPageProps {
  searchParams?: {
    supplier?: string;
    onboard?: string;
    onboarding?: string;
  };
}

export default async function SupplierDashboardPage({
  searchParams,
}: SupplierDashboardPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/supplier/dashboard');
  }

  if (role !== 'SUPPLIER' && role !== 'ADMIN') {
    redirect('/403');
  }

  const userId = (session.user as any).id as string;
  // ─────────────────────────────────────────────────────────────────────────

  let userSupplierProfile = null;
  try {
    userSupplierProfile = await prisma.supplierProfile.findUnique({
      where: { userId },
    });
  } catch (e) {
    console.error('[SupplierDashboardPage] Error querying user supplier profile:', e);
  }

  const needsOnboarding =
    !userSupplierProfile ||
    searchParams?.onboard === 'true' ||
    searchParams?.onboarding === 'true' ||
    searchParams?.supplier === 'onboard';

  let suppliers: any[] = [];

  try {
    if (role === 'ADMIN') {
      // Admins can see all suppliers
      const dbSuppliers = await prisma.supplierProfile.findMany({
        include: { printingServices: true },
        orderBy: { createdAt: 'asc' },
      });
      suppliers = dbSuppliers.map((s) => ({
        id: s.id,
        slug: s.slug,
        companyName: s.companyName,
        location: s.location,
        leadTimeDays: s.leadTimeDays,
        verificationStatus: s.verificationStatus,
        rejectionReason: s.rejectionReason,
        printingServices: s.printingServices.map((p) => ({
          code: p.code,
          name: p.name,
          maxPrintWidthCm: p.maxPrintWidthCm,
          maxPrintHeightCm: p.maxPrintHeightCm,
        })),
      }));
    } else if (userSupplierProfile) {
      // Regular suppliers see only their own profile
      const dbSupplier = await prisma.supplierProfile.findUnique({
        where: { userId },
        include: { printingServices: true },
      });
      if (dbSupplier) {
        suppliers = [
          {
            id: dbSupplier.id,
            slug: dbSupplier.slug,
            companyName: dbSupplier.companyName,
            location: dbSupplier.location,
            leadTimeDays: dbSupplier.leadTimeDays,
            verificationStatus: dbSupplier.verificationStatus,
            rejectionReason: dbSupplier.rejectionReason,
            printingServices: dbSupplier.printingServices.map((p) => ({
              code: p.code,
              name: p.name,
              maxPrintWidthCm: p.maxPrintWidthCm,
              maxPrintHeightCm: p.maxPrintHeightCm,
            })),
          },
        ];
      }
    }
  } catch (err) {
    console.error('[SupplierDashboardPage] Error querying suppliers:', err);
  }

  const activeSupplierSlug =
    role === 'ADMIN'
      ? searchParams?.supplier || suppliers[0]?.slug || ''
      : userSupplierProfile?.slug || '';

  const selectedSupplier = suppliers.find((s) => s.slug === activeSupplierSlug) || suppliers[0];

  let orders: any[] = [];

  try {
    if (selectedSupplier) {
      const dbOrders = await prisma.order.findMany({
        where: { supplierId: selectedSupplier.id },
        orderBy: { createdAt: 'desc' },
        include: {
          design: {
            include: {
              garmentProduct: {
                include: {
                  variants: true,
                },
              },
            },
          },
          obligations: {
            include: {
              artwork: true,
              licenseOption: true,
            },
          },
        },
      });

      if (dbOrders) {
        orders = dbOrders;
      }
    }
  } catch (err) {
    console.error('[SupplierDashboardPage] Error querying orders:', err);
  }

  let inventoryMatrix = null;
  try {
    if (selectedSupplier?.slug) {
      inventoryMatrix = await getSupplierInventoryMatrix(selectedSupplier.slug);
    }
  } catch (err) {
    console.error('[SupplierDashboardPage] Error querying inventory matrix:', err);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierDashboardClient
        suppliers={suppliers}
        currentSupplierSlug={activeSupplierSlug}
        initialOrders={orders}
        initialMatrix={inventoryMatrix}
        needsOnboarding={needsOnboarding}
      />
    </div>
  );
}
