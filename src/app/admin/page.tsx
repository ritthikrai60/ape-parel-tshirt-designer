import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { AdminDashboardClient } from '@/components/portal/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Governance & Moderation | ape-parel',
  description: 'Platform administration, order management, artwork moderation, and audit logs.',
};

export default async function AdminPage() {
  let orders: any[] = [];
  let artworks: any[] = [];
  let auditLogs: any[] = [];
  let totalRoyaltyPool = 0;

  try {
    const dbOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        design: {
          include: {
            garmentProduct: true,
          },
        },
        supplier: true,
        customer: true,
      },
    });

    orders = dbOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customerName: o.customer?.name || o.shippingName,
      customerEmail: o.customer?.email || 'customer@example.com',
      totalPrice: o.totalAmount,
      currency: 'THB',
      createdAt: o.createdAt.toISOString(),
      garmentName: o.design.garmentProduct.name,
      garmentColor: o.design.garmentColorHex,
      supplierName: o.supplier.companyName,
    }));

    const dbArtworks = await prisma.artwork.findMany({
      orderBy: { createdAt: 'desc' },
      include: { creator: true },
    });

    artworks = dbArtworks.map((a) => ({
      id: a.id,
      title: a.title,
      creatorName: a.creator.displayName,
      category: a.category,
      previewUrl: a.previewUrl,
      moderationStatus: a.moderationStatus,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }));

    const dbAuditLogs = await prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    auditLogs = dbAuditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId || '',
      createdAt: l.createdAt.toISOString(),
      payload: l.payload || '',
    }));

    const royalties = await prisma.royaltyObligation.aggregate({
      _sum: {
        totalAmount: true,
      },
    });

    totalRoyaltyPool = royalties._sum.totalAmount || 0;
  } catch (err) {
    console.error('[AdminPage] Error querying admin data:', err);
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-paper">
      <AdminDashboardClient
        initialOrders={orders}
        initialArtworks={artworks}
        initialAuditLogs={auditLogs}
        totalRoyaltyPool={totalRoyaltyPool}
      />
    </div>
  );
}
