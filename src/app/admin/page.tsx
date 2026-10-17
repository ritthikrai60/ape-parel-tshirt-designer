import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AdminDashboardClient } from '@/components/portal/AdminDashboardClient';
import { getAnalyticsSummary } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Operations & Enterprise Control Center | ape-parel',
  description:
    'Full-spectrum platform administration: order orchestration, emergency inventory overrides, creator moderation, double-entry financial ledger, and audit observability.',
};

export default async function AdminPage() {
  // Layer 2 guard: ensure authenticated ADMIN role
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin');
  }

  if (role !== 'ADMIN') {
    redirect('/403');
  }

  let orders: any[] = [];
  let artworks: any[] = [];
  let suppliers: any[] = [];
  let financialAccounts: any[] = [];
  let commissionRules: any[] = [];
  let users: any[] = [];
  let auditLogs: any[] = [];
  let totalRoyaltyPool = 0;

  try {
    // 1. Orders with full relational context
    const dbOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        design: {
          include: {
            garmentProduct: true,
          },
        },
        supplier: true,
        customer: {
          select: { id: true, name: true, email: true },
        },
        obligations: {
          include: {
            artwork: { select: { title: true } },
          },
        },
      },
    });

    orders = dbOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMode: o.paymentMode,
      totalAmount: o.totalAmount,
      garmentCost: o.garmentCost,
      printingCost: o.printingCost,
      licensingCost: o.licensingCost,
      packagingCost: o.packagingCost,
      shippingCost: o.shippingCost,
      quantity: o.quantity,
      customerName: o.customer?.name || o.shippingName,
      customerEmail: o.customer?.email || 'N/A',
      shippingAddress: `${o.shippingAddress}, ${o.shippingCity} ${o.shippingPostal}`,
      shippingPhone: o.shippingPhone,
      garmentName: o.design.garmentProduct.name,
      garmentSku: o.design.garmentProduct.sku,
      garmentColor: o.design.garmentColorHex,
      garmentSize: o.design.garmentSize,
      supplierId: o.supplier.id,
      supplierName: o.supplier.companyName,
      obligationsCount: o.obligations.length,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    // 2. Artworks with file specs and creator info
    const dbArtworks = await prisma.artwork.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, displayName: true, slug: true, avatarUrl: true },
        },
        fileSpec: true,
        licenseOptions: true,
      },
    });

    artworks = dbArtworks.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      creatorName: a.creator.displayName,
      creatorSlug: a.creator.slug,
      category: a.category,
      previewUrl: a.previewUrl,
      moderationStatus: a.moderationStatus,
      moderationReason: a.moderationReason,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      dpi: a.fileSpec?.dpi || 300,
      dimensions: a.fileSpec ? `${a.fileSpec.width} x ${a.fileSpec.height} px` : 'Vector / Responsive',
      colorSpace: a.fileSpec?.colorSpace || 'sRGB',
      standardLicensePrice: a.licenseOptions.find((l) => l.scope === 'PER_GARMENT')?.price || a.licenseOptions[0]?.price || 40,
    }));

    // 3. Suppliers with products and live variants
    const dbSuppliers = await prisma.supplierProfile.findMany({
      orderBy: { companyName: 'asc' },
      include: {
        printingServices: true,
        products: {
          include: {
            variants: {
              orderBy: [{ colorName: 'asc' }, { size: 'asc' }],
            },
          },
        },
      },
    });

    suppliers = dbSuppliers.map((s) => ({
      id: s.id,
      slug: s.slug,
      companyName: s.companyName,
      location: s.location,
      contactEmail: s.contactEmail,
      contactPhone: s.contactPhone,
      leadTimeDays: s.leadTimeDays,
      verified: s.verified,
      printingServices: s.printingServices.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        pricePerSurface: p.pricePerSurface,
        supportedSurfaces: p.supportedSurfaces,
      })),
      products: s.products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        fabric: p.fabric,
        weightGsm: p.weightGsm,
        fit: p.fit,
        basePrice: p.basePrice,
        packagingPrice: p.packagingPrice,
        shippingPrice: p.shippingPrice,
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          colorName: v.colorName,
          colorHex: v.colorHex,
          size: v.size,
          stock: v.stock,
          priceAdjustment: v.priceAdjustment,
        })),
      })),
    }));

    // 4. Financial Accounts & Ledger
    const dbAccounts = await prisma.financialAccount.findMany({
      include: {
        creator: { select: { displayName: true, slug: true } },
        journalEntries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { accountNumber: 'asc' },
    });

    financialAccounts = dbAccounts.map((fa) => ({
      id: fa.id,
      accountType: fa.accountType,
      accountNumber: fa.accountNumber,
      balance: fa.balance,
      currency: fa.currency,
      status: fa.status,
      ownerName: fa.creator?.displayName || (fa.accountType === 'PLATFORM' ? 'Ape-Parel Platform' : 'Escrow Vault'),
      recentEntries: fa.journalEntries.map((je) => ({
        id: je.id,
        entryType: je.entryType,
        amount: je.amount,
        balanceAfter: je.balanceAfter,
        reference: je.reference,
        description: je.description,
        createdAt: je.createdAt.toISOString(),
      })),
    }));

    // 5. Commission Rules
    commissionRules = await prisma.commissionRule.findMany({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    // 6. Users and Roles (IAM)
    const dbUsers = await prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        creatorProfile: { select: { displayName: true, slug: true } },
        supplierProfile: { select: { companyName: true, slug: true } },
      },
    });

    users = dbUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      profileTitle: u.creatorProfile?.displayName || u.supplierProfile?.companyName || null,
      createdAt: u.createdAt.toISOString(),
    }));

    // 7. Audit Logs
    const dbAuditLogs = await prisma.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    auditLogs = dbAuditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId || '',
      actorId: l.actorId || l.userId || 'SYSTEM',
      createdAt: l.createdAt.toISOString(),
      payload: l.payload || '',
    }));

    // 8. Total Royalty Aggregate
    const royalties = await prisma.royaltyObligation.aggregate({
      _sum: {
        totalAmount: true,
      },
    });

    totalRoyaltyPool = royalties._sum.totalAmount || 0;

    // 9. Pillar B: Creator Payout Requests
    const dbPayouts = await prisma.payoutRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, displayName: true, slug: true, avatarUrl: true },
        },
      },
    });

    // 10. Pillar C: Marketplace CMS Banners & Promos
    const dbBanners = await prisma.marketplaceBanner.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    const dbPromos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 11. Pillar A: Order Refunds
    const dbRefunds = await prisma.orderRefund.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 12. Visitor Analytics & Telemetry
    const analyticsSummary = await getAnalyticsSummary(7);

    return (
      <div className="flex-1 flex flex-col w-full bg-paper">
        <AdminDashboardClient
          initialOrders={orders}
          initialArtworks={artworks}
          initialSuppliers={suppliers}
          initialFinancialAccounts={financialAccounts}
          initialCommissionRules={commissionRules}
          initialUsers={users}
          initialAuditLogs={auditLogs}
          totalRoyaltyPool={totalRoyaltyPool}
          initialAnalytics={analyticsSummary}
          initialPayouts={dbPayouts.map((p) => ({
            id: p.id,
            creatorId: p.creatorId,
            creatorName: p.creator.displayName,
            creatorSlug: p.creator.slug,
            grossAmount: p.grossAmount,
            withholdingTaxRate: p.withholdingTaxRate,
            withholdingTaxAmount: p.withholdingTaxAmount,
            netAmount: p.netAmount,
            paymentMethod: p.paymentMethod,
            bankName: p.bankName,
            bankAccountNumber: p.bankAccountNumber,
            promptPayId: p.promptPayId,
            accountName: p.accountName,
            status: p.status,
            referenceNumber: p.referenceNumber,
            certificate50TwiUrl: p.certificate50TwiUrl,
            paidAt: p.paidAt?.toISOString() || null,
            createdAt: p.createdAt.toISOString(),
          }))}
          initialBanners={dbBanners.map((b) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle,
            badgeText: b.badgeText,
            ctaText: b.ctaText,
            ctaLink: b.ctaLink,
            bgColor: b.bgColor,
            textColor: b.textColor,
            isActive: b.isActive,
            priority: b.priority,
            createdAt: b.createdAt.toISOString(),
          }))}
          initialPromos={dbPromos.map((pr) => ({
            id: pr.id,
            code: pr.code,
            discountType: pr.discountType,
            discountValue: pr.discountValue,
            minOrderAmount: pr.minOrderAmount,
            maxUses: pr.maxUses,
            usedCount: pr.usedCount,
            isActive: pr.isActive,
            sponsoredBy: pr.sponsoredBy,
            createdAt: pr.createdAt.toISOString(),
          }))}
          initialRefunds={dbRefunds.map((rf) => ({
            id: rf.id,
            orderId: rf.orderId,
            refundType: rf.refundType,
            amount: rf.amount,
            reason: rf.reason,
            restockedUnits: rf.restockedUnits,
            voidedRoyalty: rf.voidedRoyalty,
            createdAt: rf.createdAt.toISOString(),
          }))}
        />
      </div>
    );
  } catch (err) {
    console.error('[AdminPage] Error querying backoffice dataset:', err);
    return (
      <div className="flex-1 flex flex-col w-full bg-paper p-8 text-center text-red-600 font-mono text-xs">
        Failed to load backoffice dataset. Please check database connectivity.
      </div>
    );
  }
}
