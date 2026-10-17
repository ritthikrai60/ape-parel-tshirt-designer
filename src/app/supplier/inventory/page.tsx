import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SupplierInventoryClient } from '@/components/portal/SupplierInventoryClient';
import { getSupplierInventoryMatrix } from '@/lib/supplier';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inventory Stock Matrix Grid | Supplier Portal | ape-parel',
  description:
    'Multi-dimensional Colorway × Size blank garment inventory matrix with rapid stock adjustments and low-stock threshold alerts.',
};

interface SupplierInventoryPageProps {
  searchParams?: {
    supplier?: string;
    productId?: string;
    onboard?: string;
    onboarding?: string;
  };
}

export default async function SupplierInventoryPage({
  searchParams,
}: SupplierInventoryPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/supplier/inventory');
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
    console.error('[SupplierInventoryPage] Error querying user profile:', e);
  }

  const needsOnboarding =
    !userSupplierProfile ||
    searchParams?.onboard === 'true' ||
    searchParams?.onboarding === 'true' ||
    searchParams?.supplier === 'onboard';

  let suppliers: any[] = [];

  try {
    if (role === 'ADMIN') {
      const dbSuppliers = await prisma.supplierProfile.findMany({
        orderBy: { createdAt: 'asc' },
      });
      if (dbSuppliers && dbSuppliers.length > 0) {
        suppliers = dbSuppliers;
      }
    } else if (userSupplierProfile) {
      suppliers = [userSupplierProfile];
    }
  } catch (err) {
    console.error('[SupplierInventoryPage] Error querying suppliers:', err);
  }

  const activeSupplierSlug =
    role === 'ADMIN'
      ? searchParams?.supplier || suppliers[0]?.slug || ''
      : userSupplierProfile?.slug || '';

  let matrix = null;
  let products: Array<{ id: string; name: string; sku: string }> = [];
  if (activeSupplierSlug) {
    try {
      const activeSupplier = await prisma.supplierProfile.findFirst({
        where: { OR: [{ id: activeSupplierSlug }, { slug: activeSupplierSlug }] },
        include: {
          products: {
            select: { id: true, name: true, sku: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (activeSupplier) {
        products = activeSupplier.products;
      }
      matrix = await getSupplierInventoryMatrix(activeSupplierSlug, searchParams?.productId);
    } catch (err) {
      console.error('[SupplierInventoryPage] Error getting matrix or products:', err);
    }
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierInventoryClient
        suppliers={suppliers.map((s) => ({
          id: s.id,
          slug: s.slug,
          companyName: s.companyName,
          location: s.location,
          leadTimeDays: s.leadTimeDays,
        }))}
        currentSupplierSlug={activeSupplierSlug}
        products={products}
        initialMatrix={matrix ?? {
          supplierId: suppliers[0]?.id ?? '',
          supplierSlug: activeSupplierSlug,
          productId: '',
          productName: '',
          productSku: '',
          basePrice: 0,
          availableSizes: [],
          colorRows: [],
          totalVariants: 0,
          totalUnitsInStock: 0,
          lowStockCount: 0,
          lowStockVariants: [],
        }}
        needsOnboarding={needsOnboarding}
      />
    </div>
  );
}
