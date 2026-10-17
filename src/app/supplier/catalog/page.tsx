import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SupplierCatalogClient } from '@/components/portal/SupplierCatalogClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blank Garment & DTG Catalog Pricing | Supplier Portal | ape-parel',
  description:
    'Configure blank garment base pricing, DTG printing costs per surface, packaging, and logistics rates with transparent cost breakdown.',
};

interface SupplierCatalogPageProps {
  searchParams?: {
    supplier?: string;
  };
}

export default async function SupplierCatalogPage({
  searchParams,
}: SupplierCatalogPageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/supplier/catalog');
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
        include: {
          printingServices: true,
          products: { include: { variants: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (dbSuppliers && dbSuppliers.length > 0) {
        suppliers = dbSuppliers;
      }
    } else {
      const ownProfile = await prisma.supplierProfile.findUnique({
        where: { userId },
        include: {
          printingServices: true,
          products: { include: { variants: true } },
        },
      });
      if (ownProfile) {
        suppliers = [ownProfile];
      }
    }
  } catch (err) {
    console.error('[SupplierCatalogPage] Error querying suppliers:', err);
  }

  const activeSupplierSlug =
    role === 'ADMIN'
      ? searchParams?.supplier || suppliers[0]?.slug || ''
      : suppliers[0]?.slug || '';

  const selectedSupplier =
    suppliers.find((s) => s.slug === activeSupplierSlug) || suppliers[0] || null;

  const defaultProduct = selectedSupplier?.products?.[0] || null;
  const defaultPrintingService =
    selectedSupplier?.printingServices?.find((s: any) => s.code === 'DTG') ||
    selectedSupplier?.printingServices?.[0] ||
    null;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierCatalogClient
        suppliers={suppliers.map((s) => ({
          id: s.id,
          slug: s.slug,
          companyName: s.companyName,
          location: s.location,
          leadTimeDays: s.leadTimeDays,
        }))}
        currentSupplierSlug={activeSupplierSlug}
        initialProduct={defaultProduct}
        initialPrintingService={defaultPrintingService}
      />
    </div>
  );
}
