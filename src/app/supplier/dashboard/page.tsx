import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SupplierDashboardClient } from '@/components/portal/SupplierDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Supplier Production Dashboard | ape-parel',
  description:
    'Manage apparel production job queues, advance manufacturing statuses, and download factory RIP specifications.',
};

interface SupplierDashboardPageProps {
  searchParams?: {
    supplier?: string;
  };
}

export default async function SupplierDashboardPage({
  searchParams,
}: SupplierDashboardPageProps) {
  let suppliers: any[] = [];

  try {
    const dbSuppliers = await prisma.supplierProfile.findMany({
      include: {
        printingServices: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (dbSuppliers && dbSuppliers.length > 0) {
      suppliers = dbSuppliers.map((s) => ({
        id: s.id,
        slug: s.slug,
        companyName: s.companyName,
        location: s.location,
        leadTimeDays: s.leadTimeDays,
        printingServices: s.printingServices.map((p) => ({
          code: p.code,
          name: p.name,
          maxPrintWidthCm: p.maxPrintWidthCm,
          maxPrintHeightCm: p.maxPrintHeightCm,
        })),
      }));
    }
  } catch (err) {
    console.error('[SupplierDashboardPage] Error querying suppliers:', err);
  }

  // Fallback suppliers if database unseeded
  if (suppliers.length === 0) {
    suppliers = [
      {
        id: 'supp-bangkok-craft',
        slug: 'bangkok-garment-craft',
        companyName: 'Bangkok Garment Craft Co.',
        location: 'Bang Khun Thian, Bangkok, Thailand',
        leadTimeDays: 4,
        printingServices: [
          {
            code: 'DTG',
            name: 'Kornit Digital DTG',
            maxPrintWidthCm: 35.0,
            maxPrintHeightCm: 45.0,
          },
        ],
      },
      {
        id: 'supp-siam-textile',
        slug: 'siam-textile-mill',
        companyName: 'Siam Textile & Screen Works',
        location: 'Samut Prakan, Thailand',
        leadTimeDays: 5,
        printingServices: [
          {
            code: 'SCREEN',
            name: 'Automatic Screen Printing',
            maxPrintWidthCm: 40.0,
            maxPrintHeightCm: 50.0,
          },
        ],
      },
    ];
  }

  const activeSupplierSlug =
    searchParams?.supplier || suppliers[0]?.slug || 'bangkok-garment-craft';
  const selectedSupplier =
    suppliers.find((s) => s.slug === activeSupplierSlug) || suppliers[0];

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

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierDashboardClient
        suppliers={suppliers}
        currentSupplierSlug={activeSupplierSlug}
        initialOrders={orders}
      />
    </div>
  );
}
