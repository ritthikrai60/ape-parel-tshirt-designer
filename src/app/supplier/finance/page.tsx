import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SupplierFinanceClient } from '@/components/portal/SupplierFinanceClient';
import { getSupplierFinancialLedger } from '@/lib/supplier';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Supplier Revenue Ledger & Payouts | Supplier Portal | ape-parel',
  description:
    'Double-entry transparent supplier revenue accounting, withdrawable balance tracking, and PromptPay/Bank settlement payouts.',
};

interface SupplierFinancePageProps {
  searchParams?: {
    supplier?: string;
    onboard?: string;
    onboarding?: string;
  };
}

export default async function SupplierFinancePage({
  searchParams,
}: SupplierFinancePageProps) {
  // ── Layer 2 guard (defense-in-depth, middleware is Layer 1) ──────────────
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/supplier/finance');
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
    console.error('[SupplierFinancePage] Error querying user profile:', e);
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
    console.error('[SupplierFinancePage] Error querying suppliers:', err);
  }

  const activeSupplierSlug =
    role === 'ADMIN'
      ? searchParams?.supplier || suppliers[0]?.slug || ''
      : userSupplierProfile?.slug || '';

  let summary = null;
  if (activeSupplierSlug) {
    try {
      summary = await getSupplierFinancialLedger(activeSupplierSlug);
    } catch (err) {
      console.error('[SupplierFinancePage] Error getting financial ledger:', err);
    }
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierFinanceClient
        suppliers={suppliers.map((s) => ({
          id: s.id,
          slug: s.slug,
          companyName: s.companyName,
          location: s.location,
          leadTimeDays: s.leadTimeDays,
        }))}
        currentSupplierSlug={activeSupplierSlug}
        initialSummary={summary ?? {
          supplierId: suppliers[0]?.id ?? '',
          supplierSlug: activeSupplierSlug,
          companyName: suppliers[0]?.companyName ?? '',
          lifetimeEarnings: 0,
          totalSettledPayouts: 0,
          withdrawableBalance: 0,
          ordersCount: 0,
          transactions: [],
        }}
        needsOnboarding={needsOnboarding}
      />
    </div>
  );
}
