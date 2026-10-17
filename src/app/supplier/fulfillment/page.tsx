import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SupplierFulfillmentClient } from '@/components/portal/SupplierFulfillmentClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Logistics & Shipping Fulfillment | Supplier Portal | ape-parel',
  description:
    'Courier dispatch management, tracking number entry, and printable packing slips for verified garment suppliers.',
};

interface SupplierFulfillmentPageProps {
  searchParams?: {
    supplier?: string;
  };
}

export default async function SupplierFulfillmentPage({
  searchParams,
}: SupplierFulfillmentPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/supplier/fulfillment');
  }

  if (role !== 'SUPPLIER' && role !== 'ADMIN') {
    redirect('/403');
  }

  const userId = (session.user as any).id as string;
  // ─────────────────────────────────────────────────────────────────────────

  let suppliers: any[] = [];

  try {
    if (role === 'ADMIN') {
      const dbSuppliers = await prisma.supplierProfile.findMany({
        orderBy: { createdAt: 'asc' },
      });
      if (dbSuppliers && dbSuppliers.length > 0) {
        suppliers = dbSuppliers;
      }
    } else {
      const ownProfile = await prisma.supplierProfile.findUnique({
        where: { userId },
      });
      if (ownProfile) {
        suppliers = [ownProfile];
      }
    }
  } catch (err) {
    console.error('[SupplierFulfillmentPage] Error querying suppliers:', err);
  }

  const activeSupplierSlug =
    role === 'ADMIN'
      ? searchParams?.supplier || suppliers[0]?.slug || ''
      : suppliers[0]?.slug || '';

  const selectedSupplier =
    suppliers.find((s) => s.slug === activeSupplierSlug) || suppliers[0];

  let orders: any[] = [];
  if (selectedSupplier) {
    try {
      const dbOrders = await prisma.order.findMany({
        where: { supplierId: selectedSupplier.id },
        include: {
          design: { include: { garmentProduct: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (dbOrders) {
        orders = dbOrders;
      }
    } catch (err) {
      console.error('[SupplierFulfillmentPage] Error querying orders:', err);
    }
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierFulfillmentClient
        suppliers={suppliers.map((s) => ({
          id: s.id,
          slug: s.slug,
          companyName: s.companyName,
          location: s.location,
          leadTimeDays: s.leadTimeDays,
        }))}
        currentSupplierSlug={activeSupplierSlug}
        initialOrders={orders}
      />
    </div>
  );
}
