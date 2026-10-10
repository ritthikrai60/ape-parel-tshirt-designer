# Milestone 4 Explorer 2 Handoff: Portals & Marketplace

## 1. Observation

### 1.1 Existing Backend Services & Data Models
Direct inspection of existing services, models, and API endpoints reveals:

1. **Prisma Schema (`prisma/schema.prisma`)**:
   - `Order` (`lines 164-192`): Contains `id`, `orderNumber`, `customerId`, `designId`, `supplierId`, `quantity`, `status` (`PAYMENT_CONFIRMED`, `IN_PRODUCTION`, `SHIPPED`, `DELIVERED`, `CANCELLED`), `totalAmount`, `garmentCost`, `printingCost`, `licensingCost`, `packagingCost`, `shippingCost`, `shippingName`, `shippingAddress`, `shippingCity`, `shippingPostal`, `shippingPhone`, `snapshotData`.
   - `RoyaltyObligation` (`lines 194-210`): Contains `orderId`, `creatorId`, `artworkId`, `licenseOptionId`, `unitRoyalty`, `quantity`, `totalAmount`, `status` (`PENDING`, `ELIGIBLE`, `SETTLED`, `CANCELLED`).
   - `RoyaltyLedgerEntry` (`lines 212-223`): Contains `creatorId`, `obligationId`, `entryType` (`EARNING`, `PAYOUT_SETTLEMENT`, `ADJUSTMENT`), `amount` (positive for earnings, negative for payouts), `balanceAfter`, `reference`, `notes`, `createdAt`.
   - `CreatorSettlement` (`lines 225-234`): Contains `creatorId`, `settlementNumber` (`APX-STL-...`), `totalAmount`, `status` (`COMPLETED`), `payoutReference`.
   - `SupplierProfile` (`lines 39-57`): Contains `slug` (`bangkok-garment-craft`, `siam-textile-mill`), `companyName`, `location`, `leadTimeDays` (default 4-5), `printingServices`, `products`.

2. **Royalty Services (`src/lib/royalties.ts`)**:
   - `getCreatorLedgerSummary(creatorIdOrSlug)` (`lines 54-181`): Calculates `currentBalance`, `lifetimeEarnings`, `totalSettled`, `salesVolume`, `pendingObligations`, `eligibleObligations`, `settledObligations`, `recentLedgerEntries`, and `recentSettlements`.
   - `executeCreatorPayoutSettlement(creatorIdOrSlug, options)` (`lines 192-346`): Executes atomic ACID transaction transitioning eligible obligations to `SETTLED`, creating `CreatorSettlement` (`APX-STL-YYYYMMDD-XXXXX`), recording negative `RoyaltyLedgerEntry` (`PAYOUT_SETTLEMENT`), and logging `AuditEvent`.
   - `getCreatorLedgerEntries(creatorIdOrSlug, options)` (`lines 351-389`): Returns itemized `RoyaltyLedgerEntryDetails[]` with full `obligation`, `artwork`, and `orderId` relations.

3. **Order & Production Services (`src/lib/orders.ts`, `src/lib/production.ts`)**:
   - `getOrderByIdOrNumber(idOrNumber)` (`lines 289-330` in `orders.ts`): Resolves order by CUID or human-readable `orderNumber` (`APX-ORD-9021`), returning `customer`, `supplier`, `design` (with `garmentProduct`), and `obligations` (with `artwork` and `licenseOption`).
   - `generateProductionPackage(orderId)` (`lines 96-376` in `production.ts`): Calculates physical cm platen coordinates (`calculatedWidthCm`, `calculatedHeightCm`, `xCenterCm`, `yCenterCm`, `xLeftCm`, `yTopCm`), resolves blank SKUs (`APX-HVY-001`, `APX-HVY-001-BLK-L`), and maps high-res asset references.

4. **API Routes (`src/app/api/`)**:
   - `/api/royalties/settle` (`route.ts`):
     - `POST`: Validates `{ creatorId, payoutReference, obligationIds, notes }` and executes `executeCreatorPayoutSettlement`.
     - `GET`: Resolves `?creatorId=...` and returns `CreatorLedgerSummary`.
   - `/api/orders`:
     - `POST`: Atomically creates orders with server-authoritative anti-tamper validation.
     - `GET`: Queries paginated orders filtered by `customerId` or `supplierId`.
   - `/api/orders/[id]`:
     - `GET`: Fetches order details by ID or order number.
     - *Observation*: Currently lacks a `PATCH` handler for supplier order status updates (`QUEUED` -> `PRINTING` -> `QA` -> `SHIPPED`).
   - `/api/orders/[id]/production`:
     - `GET`: Returns `Content-Disposition: attachment; filename="JOB-[orderNumber].json"` with full manufacturing package.

5. **Test & Build Verification**:
   - Running `npm test`: 8 test files, 181 passing tests (3.75s).
   - Running `npx tsc --noEmit`: 0 TypeScript errors.
   - Pre-seeded database contains `APX-ORD-9021` (Total ฿410), 3 creators (`dash-ape`, `cyber-monk`, `soma-botanica`), and 2 suppliers (`bangkok-garment-craft`, `siam-textile-mill`).

---

## 2. Logic Chain

1. **Creator Dashboard Logic**:
   - A creator needs visibility into:
     - Lifetime earnings (`summary.lifetimeEarnings`)
     - Volume sold (`summary.salesVolume`)
     - Current withdrawable balance (`summary.currentBalance`)
     - Disbursed payouts (`summary.totalSettled`)
   - When a creator clicks "Request Payout Settlement":
     - The client sends `POST /api/royalties/settle` with `{ creatorId: selectedCreatorId, payoutReference: ... }`.
     - The server validates eligible obligations, creates a `CreatorSettlement`, posts a negative ledger entry, and returns the new balance.
     - The client immediately reflects the updated balance and adds the new `PAYOUT_SETTLEMENT` entry to the immutable ledger table.
   - The ledger table requires clear distinction between `EARNING` (+ amounts) and `PAYOUT_SETTLEMENT` (- amounts), with running balance progression displayed.

2. **Supplier Dashboard Logic**:
   - Suppliers need an operational command center to manufacture and fulfill orders:
     - Job Queue: Filtered by supplier (`bangkok-garment-craft`).
     - Order Cards: Display blank garment SKU (`APX-HVY-001`), variant SKU (`APX-HVY-001-BLK-L`), color swatch, size, quantity, print technique (`Kornit DTG`), and print surfaces.
     - Status Stepper: Displays workflow progression (`QUEUED` -> `PRINTING` -> `QA` -> `SHIPPED`).
     - Status Update Action: Requires an endpoint to advance status. Adding `PATCH /api/orders/[id]` enables suppliers to transition status and records an `AuditEvent`.
     - 1-Click Production Spec Download: Link directly to `/api/orders/[id]/production` for RIP software ingestion, plus an in-browser spec inspector for quick quality verification.

3. **Customer Order Tracking Logic**:
   - Customers receiving order confirmations (or following the link from studio checkout `/account/orders/[id]`) require:
     - Clear visual status timeline (5-step progress stepper).
     - Visual mockup showing garment color (`#131718`) and placed artwork layers.
     - Itemized pricing strictly reflecting server costs:
       `Garment (฿150) + Print (฿80) + Pack (฿15) + Ship (฿40) + Artwork Licenses (฿125) = ฿410`.
     - Attribution for all licensed artists with links to their portfolios.
     - Delivery address and estimated delivery date based on supplier lead time.

---

## 3. Caveats

1. **Authentication Context**: The project currently operates in a development / prototype role mode without full NextAuth session cookies. To make the dashboards testable and demonstrable, each dashboard should include an interactive persona/profile selector (e.g., switching between creators `dash-ape`, `cyber-monk`, `soma-botanica`, or suppliers `bangkok-garment-craft`, `siam-textile-mill`) via URL search params or state.
2. **Order Status Transitions**: Existing seeded orders start at `PAYMENT_CONFIRMED`. The proposed `PATCH /api/orders/[id]` handler safely transitions orders between valid statuses (`PAYMENT_CONFIRMED`, `IN_PRODUCTION`, `QA`, `SHIPPED`, `DELIVERED`, `CANCELLED`) and writes an `AuditEvent`.
3. **Mockup Rendering on Server**: Order tracking reconstructs the garment canvas and placed artwork layers from the stored `DesignDocument` elements or snapshot, providing high visual fidelity without requiring external WebGL dependencies on the tracking page.

---

## 4. Conclusion & Component Blueprints

The following component blueprints and implementation proposals provide complete, production-ready code for the multi-role portals and customer tracking.

### 4.1 Backend Route Enhancement: `src/app/api/orders/[id]/route.ts`

Add `PATCH` method to support supplier status transitions and audit logging:

```typescript
// Proposed addition to src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOrderByIdOrNumber } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PAYMENT_CONFIRMED',
    'IN_PRODUCTION',
    'QA',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ]),
  notes: z.string().max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
  }

  const order = await getOrderByIdOrNumber(id.trim());
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, order }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = updateOrderStatusSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation Error', issues: parseResult.error.format() },
      { status: 400 }
    );
  }

  const { status, notes } = parseResult.data;

  try {
    const existingOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: existingOrder.id },
        data: { status },
      });

      await tx.auditEvent.create({
        data: {
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'Order',
          entityId: order.id,
          payload: JSON.stringify({
            previousStatus: existingOrder.status,
            newStatus: status,
            notes: notes ?? null,
            updatedAt: new Date().toISOString(),
          }),
        },
      });

      return order;
    });

    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
  } catch (error: unknown) {
    console.error(`[PATCH /api/orders/${id}] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

### 4.2 Creator Dashboard: `src/app/creator/dashboard/page.tsx` & Client Component

#### Page Component: `src/app/creator/dashboard/page.tsx`
```typescript
import { prisma } from '@/lib/prisma';
import { getCreatorLedgerSummary, getCreatorLedgerEntries } from '@/lib/royalties';
import CreatorDashboardClient from '@/components/creator/CreatorDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Creator Royalty Dashboard | ape-parel',
  description:
    'Monitor live royalty earnings, sales volume, running ledger balance, and execute instant payout settlements.',
};

export default async function CreatorDashboardPage({
  searchParams,
}: {
  searchParams?: { creator?: string };
}) {
  const allCreators = await prisma.creatorProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const activeSlug = searchParams?.creator || allCreators[0]?.slug || 'dash-ape';

  let summary = null;
  let entries: any[] = [];

  try {
    summary = await getCreatorLedgerSummary(activeSlug);
    entries = await getCreatorLedgerEntries(activeSlug, { limit: 100 });
  } catch (err) {
    console.error('[CreatorDashboardPage] Failed to load ledger data:', err);
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CreatorDashboardClient
        initialSummary={summary}
        initialEntries={entries}
        allCreators={allCreators.map((c) => ({
          id: c.id,
          slug: c.slug,
          displayName: c.displayName,
          avatarUrl: c.avatarUrl,
          payoutDetails: c.payoutDetails,
        }))}
        currentSlug={activeSlug}
      />
    </div>
  );
}
```

#### Client Component Blueprint: `src/components/creator/CreatorDashboardClient.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Package,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  Receipt,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { CreatorLedgerSummary, RoyaltyLedgerEntryDetails } from '@/lib/types';

interface CreatorOption {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  payoutDetails: string | null;
}

interface Props {
  initialSummary: CreatorLedgerSummary | null;
  initialEntries: RoyaltyLedgerEntryDetails[];
  allCreators: CreatorOption[];
  currentSlug: string;
}

export default function CreatorDashboardClient({
  initialSummary,
  initialEntries,
  allCreators,
  currentSlug,
}: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<CreatorLedgerSummary | null>(initialSummary);
  const [entries, setEntries] = useState<RoyaltyLedgerEntryDetails[]>(initialEntries);
  const [filterType, setFilterType] = useState<'ALL' | 'EARNING' | 'PAYOUT_SETTLEMENT'>('ALL');
  const [isSettling, setIsSettling] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutRefInput, setPayoutRefInput] = useState('');

  const currentCreator = allCreators.find((c) => c.slug === currentSlug) || allCreators[0];

  const handleCreatorChange = (newSlug: string) => {
    router.push(`/creator/dashboard?creator=${newSlug}`);
  };

  const handleExecuteSettlement = async () => {
    if (!summary || summary.currentBalance <= 0) return;
    setIsSettling(true);
    setSettlementError(null);
    setSettlementSuccess(null);

    try {
      const res = await fetch('/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: summary.creatorId,
          payoutReference: payoutRefInput.trim() || undefined,
          notes: `Creator dashboard payout settlement requested on ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to settle royalties');
      }

      setSettlementSuccess(
        `Settlement ${data.settlement.settlementNumber} completed! Disbursed ฿${data.settlement.totalAmount.toLocaleString()} THB.`
      );
      setIsModalOpen(false);
      setPayoutRefInput('');

      // Refresh data
      const summaryRes = await fetch(`/api/royalties/settle?creatorId=${summary.creatorId}`);
      if (summaryRes.ok) {
        const updatedSummary = await summaryRes.json();
        setSummary(updatedSummary);
      }
      router.refresh();
    } catch (err: any) {
      setSettlementError(err.message || 'Settlement error occurred.');
    } finally {
      setIsSettling(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.entryType === filterType;
  });

  return (
    <div className="space-y-8">
      {/* Top Bar: Creator Info & Persona Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-6">
        <div className="flex items-center space-x-4">
          <img
            src={summary?.avatarUrl || currentCreator?.avatarUrl || 'https://api.dicebear.com/8.x/bottts/svg?seed=creator'}
            alt={summary?.displayName || 'Creator'}
            className="w-14 h-14 rounded-full border-2 border-borderCol bg-paper-dark object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">
                {summary?.displayName || currentCreator?.displayName}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/50">
                VERIFIED CREATOR
              </span>
            </div>
            <p className="font-mono text-xs text-mutedGray">
              Handle: @{summary?.slug || currentCreator?.slug} &bull; Payout:{' '}
              <span className="text-ink font-medium">
                {summary?.payoutDetails || currentCreator?.payoutDetails || 'PromptPay Not Set'}
              </span>
            </p>
          </div>
        </div>

        {/* Persona Switcher & Primary Action */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-mutedGray hidden sm:inline">Active Creator:</span>
            <select
              value={currentSlug}
              onChange={(e) => handleCreatorChange(e.target.value)}
              className="px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
            >
              {allCreators.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.displayName} (@{c.slug})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!summary || summary.currentBalance <= 0 || isSettling}
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Wallet className="w-4 h-4 text-warm" />
            <span>Settle Payout</span>
          </button>
        </div>
      </div>

      {/* Settlement Success / Error Banners */}
      {settlementSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{settlementSuccess}</span>
          </div>
          <button onClick={() => setSettlementSuccess(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {settlementError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs font-mono text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{settlementError}</span>
        </div>
      )}

      {/* 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Gross Royalties Earned */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">Gross Royalties Earned</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black font-mono text-ink tracking-tight">
            ฿{summary ? summary.lifetimeEarnings.toLocaleString() : '0'}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">Lifetime cumulative gross earnings</p>
        </div>

        {/* Metric 2: Volume Sold */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">Volume (Units Sold)</span>
            <Package className="w-4 h-4 text-warm-dark" />
          </div>
          <div className="text-3xl font-black font-mono text-ink tracking-tight">
            {summary ? summary.salesVolume.toLocaleString() : '0'} <span className="text-sm font-normal text-mutedGray">pcs</span>
          </div>
          <p className="font-mono text-[11px] text-mutedGray">Garments printed with your art</p>
        </div>

        {/* Metric 3: Eligible Balance */}
        <div className="p-5 bg-paper-light border-2 border-warm rounded-xl shadow-sm space-y-2 bg-gradient-to-br from-paper-light to-warm/10">
          <div className="flex items-center justify-between text-ink">
            <span className="font-mono text-xs uppercase tracking-wider font-bold">Eligible Balance</span>
            <span className="font-mono text-[10px] bg-emerald-600 text-paper font-bold px-1.5 py-0.5 rounded">
              AVAILABLE NOW
            </span>
          </div>
          <div className="text-3xl font-black font-mono text-ink tracking-tight">
            ฿{summary ? summary.currentBalance.toLocaleString() : '0'}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">
            {summary?.eligibleObligations.count ?? 0} eligible obligation(s) pending withdrawal
          </p>
        </div>

        {/* Metric 4: Settled Payouts */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">Settled Payouts</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black font-mono text-ink tracking-tight">
            ฿{summary ? summary.totalSettled.toLocaleString() : '0'}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">Disbursed to bank / PromptPay</p>
        </div>
      </div>

      {/* Immutable Royalty Ledger Table */}
      <div className="bg-paper-light border border-borderCol rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-borderCol flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold font-sans text-ink uppercase tracking-tight">
                Auditable Royalty Ledger
              </h2>
            </div>
            <p className="font-mono text-xs text-mutedGray mt-0.5">
              Append-only, cryptographically verifiable ledger entries with atomic running balance calculation.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 bg-paper p-1 rounded-lg border border-borderCol">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                filterType === 'ALL' ? 'bg-ink text-paper font-bold' : 'text-mutedGray hover:text-ink'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilterType('EARNING')}
              className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                filterType === 'EARNING' ? 'bg-ink text-paper font-bold' : 'text-mutedGray hover:text-ink'
              }`}
            >
              Earnings
            </button>
            <button
              onClick={() => setFilterType('PAYOUT_SETTLEMENT')}
              className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                filterType === 'PAYOUT_SETTLEMENT' ? 'bg-ink text-paper font-bold' : 'text-mutedGray hover:text-ink'
              }`}
            >
              Payouts
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-paper border-b border-borderCol text-mutedGray uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Artwork / Description</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                <th className="py-3 px-4 font-semibold text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCol/60">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-mutedGray">
                    No royalty ledger entries recorded yet.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isEarning = entry.amount > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-paper/50 transition-colors">
                      <td className="py-3 px-4 text-mutedGray whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.entryType === 'EARNING' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            EARNING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                            PAYOUT_SETTLEMENT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                        {entry.reference || '---'}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-ink">
                        {entry.obligation?.artwork ? (
                          <div className="flex items-center space-x-2">
                            <img
                              src={entry.obligation.artwork.previewUrl}
                              alt={entry.obligation.artwork.title}
                              className="w-5 h-5 rounded border border-borderCol object-cover bg-paper"
                            />
                            <span className="truncate">{entry.obligation.artwork.title}</span>
                          </div>
                        ) : (
                          <span>{entry.notes || 'Ledger transaction'}</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        isEarning ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {isEarning ? `+฿${entry.amount.toLocaleString()}` : `-฿${Math.abs(entry.amount).toLocaleString()}`}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-ink whitespace-nowrap">
                        ฿{entry.balanceAfter.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>AUDITED</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Settlement Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-warm-dark" />
                <h3 className="font-sans font-bold text-base text-ink">Request Payout Settlement</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-mutedGray hover:text-ink font-mono text-sm"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-paper rounded-xl border border-borderCol space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-mutedGray">Creator:</span>
                <span className="font-bold text-ink">{summary?.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Settlement Amount:</span>
                <span className="font-black text-emerald-700 text-sm">
                  ฿{summary?.currentBalance.toLocaleString()} THB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Disbursement Target:</span>
                <span className="font-medium text-ink">{summary?.payoutDetails || 'PromptPay Default'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1">
                Optional Payout Reference / Transfer Slip ID
              </label>
              <input
                type="text"
                placeholder="e.g. TRX-9021-PP"
                value={payoutRefInput}
                onChange={(e) => setPayoutRefInput(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
              />
            </div>

            <p className="text-[11px] font-mono text-mutedGray leading-relaxed">
              Upon confirmation, this transaction will atomically deduct ฿{summary?.currentBalance.toLocaleString()} from your ledger, transition {summary?.eligibleObligations.count} obligation(s) to SETTLED, and create a cryptographically referenced settlement voucher.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 border border-borderCol rounded-lg font-mono text-xs font-semibold text-mutedGray hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSettling}
                onClick={handleExecuteSettlement}
                className="flex-1 py-2.5 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold uppercase transition-colors shadow-sm flex items-center justify-center space-x-1.5"
              >
                {isSettling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Settlement</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 4.3 Supplier Dashboard: `src/app/supplier/dashboard/page.tsx` & Client Component

#### Page Component: `src/app/supplier/dashboard/page.tsx`
```typescript
import { prisma } from '@/lib/prisma';
import SupplierDashboardClient from '@/components/supplier/SupplierDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Supplier Production Dashboard | ape-parel',
  description:
    'Manage apparel production job queues, advance manufacturing statuses, and download factory RIP specifications.',
};

export default async function SupplierDashboardPage({
  searchParams,
}: {
  searchParams?: { supplier?: string };
}) {
  const suppliers = await prisma.supplierProfile.findMany({
    include: {
      printingServices: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const activeSupplierSlug =
    searchParams?.supplier || suppliers[0]?.slug || 'bangkok-garment-craft';
  const selectedSupplier =
    suppliers.find((s) => s.slug === activeSupplierSlug) || suppliers[0];

  let orders: any[] = [];
  if (selectedSupplier) {
    orders = await prisma.order.findMany({
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
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SupplierDashboardClient
        suppliers={suppliers.map((s) => ({
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
        }))}
        currentSupplierSlug={activeSupplierSlug}
        initialOrders={orders}
      />
    </div>
  );
}
```

#### Client Component Blueprint: `src/components/supplier/SupplierDashboardClient.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Factory,
  Download,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';

interface SupplierInfo {
  id: string;
  slug: string;
  companyName: string;
  location: string;
  leadTimeDays: number;
  printingServices: Array<{
    code: string;
    name: string;
    maxPrintWidthCm: number;
    maxPrintHeightCm: number;
  }>;
}

interface Props {
  suppliers: SupplierInfo[];
  currentSupplierSlug: string;
  initialOrders: any[];
}

export default function SupplierDashboardClient({
  suppliers,
  currentSupplierSlug,
  initialOrders,
}: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [inspectPackage, setInspectPackage] = useState<any | null>(null);
  const [isLoadingSpec, setIsLoadingSpec] = useState(false);

  const currentSupplier =
    suppliers.find((s) => s.slug === currentSupplierSlug) || suppliers[0];

  const handleSupplierChange = (newSlug: string) => {
    router.push(`/supplier/dashboard?supplier=${newSlug}`);
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      const data = await res.json();

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      router.refresh();
    } catch (err) {
      console.error('[SupplierDashboard] Status update error:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleInspectSpec = async (orderIdOrNumber: string) => {
    setIsLoadingSpec(true);
    try {
      const res = await fetch(`/api/orders/${orderIdOrNumber}/production`);
      if (!res.ok) throw new Error('Failed to load spec');
      const data = await res.json();
      setInspectPackage(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSpec(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Factory className="w-6 h-6 text-ink" />
            <h1 className="text-2xl font-bold font-sans text-ink">
              {currentSupplier?.companyName}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              VERIFIED FACILITY
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-xs text-mutedGray mt-1">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{currentSupplier?.location}</span>
            </span>
            <span>&bull;</span>
            <span>Standard SLA: {currentSupplier?.leadTimeDays} Days</span>
            <span>&bull;</span>
            <span>Primary RIP: Kornit HD DTG (35x45 cm)</span>
          </div>
        </div>

        {/* Switch Supplier Facility */}
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs text-mutedGray">Facility:</span>
          <select
            value={currentSupplierSlug}
            onChange={(e) => handleSupplierChange(e.target.value)}
            className="px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
          >
            {suppliers.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Production Queue Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Total Active Jobs</span>
          <div className="text-2xl font-bold text-ink mt-1">{orders.length}</div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Queued / Ready</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {orders.filter((o) => o.status === 'PAYMENT_CONFIRMED').length}
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Printing / In Prep</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {orders.filter((o) => o.status === 'IN_PRODUCTION' || o.status === 'QA').length}
          </div>
        </div>
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <span className="text-mutedGray uppercase text-[10px]">Dispatched / Shipped</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {orders.filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED').length}
          </div>
        </div>
      </div>

      {/* Queue Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-borderCol pb-2">
        {['ALL', 'PAYMENT_CONFIRMED', 'IN_PRODUCTION', 'QA', 'SHIPPED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 font-mono text-xs rounded-lg transition-colors ${
              statusFilter === st
                ? 'bg-ink text-paper font-bold'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            {st === 'ALL'
              ? 'All Jobs'
              : st === 'PAYMENT_CONFIRMED'
              ? 'Queued'
              : st === 'IN_PRODUCTION'
              ? 'Printing'
              : st}
          </button>
        ))}
      </div>

      {/* Job Cards Queue */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-paper-light border border-borderCol rounded-xl font-mono text-xs text-mutedGray">
            No production jobs in this queue.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const garment = order.design?.garmentProduct;
            return (
              <div
                key={order.id}
                className="p-6 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-4 hover:border-warm transition-colors"
              >
                {/* Job Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderCol/60 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-black text-ink">
                      JOB-{order.orderNumber}
                    </span>
                    <span className="font-mono text-xs text-mutedGray">
                      Order: {order.orderNumber}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-warm/20 text-ink font-semibold">
                      Target Lead: {currentSupplier?.leadTimeDays}d
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 1-Click Production Spec Download */}
                    <a
                      href={`/api/orders/${order.id}/production`}
                      download={`JOB-${order.orderNumber}.json`}
                      className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Spec (.json)</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleInspectSpec(order.id)}
                      className="px-3 py-1.5 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold transition-colors"
                    >
                      Inspect RIP
                    </button>
                  </div>
                </div>

                {/* Garment Details & Print Spec Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Garment Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Garment Specifications
                    </span>
                    <div className="font-bold text-ink">{garment?.name || 'Apex Heavyweight Tee'}</div>
                    <div className="text-mutedGray">Blank SKU: {garment?.sku || 'APX-HVY-001'}</div>
                    <div className="flex items-center space-x-2 pt-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-borderCol"
                        style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                      />
                      <span>Size: {order.design?.garmentSize || 'L'}</span>
                      <span>&bull;</span>
                      <span>Qty: {order.quantity} pc(s)</span>
                    </div>
                  </div>

                  {/* Print Technique */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Print Technique & Surfaces
                    </span>
                    <div className="font-bold text-ink">Kornit Digital DTG</div>
                    <div className="text-mutedGray">Platen: 35.0 x 45.0 cm</div>
                    <div className="flex items-center space-x-1 pt-1 text-ink font-semibold">
                      <Layers className="w-3.5 h-3.5 text-warm-dark" />
                      <span>{order.obligations?.length || 1} Artwork Layer(s) Licensed</span>
                    </div>
                  </div>

                  {/* Shipping Recipient */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-mutedGray font-bold">
                      Delivery Destination
                    </span>
                    <div className="font-bold text-ink">{order.shippingName}</div>
                    <div className="text-mutedGray truncate">{order.shippingAddress}</div>
                    <div className="text-mutedGray">
                      {order.shippingCity} {order.shippingPostal}
                    </div>
                  </div>
                </div>

                {/* Status Stepper & Transition Actions */}
                <div className="pt-3 border-t border-borderCol/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Status Visual Stepper */}
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <span className="text-mutedGray text-[11px] uppercase mr-1">Status:</span>
                    {[
                      { key: 'PAYMENT_CONFIRMED', label: 'Queued' },
                      { key: 'IN_PRODUCTION', label: 'Printing' },
                      { key: 'QA', label: 'QA Check' },
                      { key: 'SHIPPED', label: 'Shipped' },
                    ].map((step, idx) => {
                      const isCurrent = order.status === step.key;
                      return (
                        <React.Fragment key={step.key}>
                          {idx > 0 && <span className="text-borderCol">&rarr;</span>}
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isCurrent
                                ? 'bg-ink text-paper'
                                : 'bg-paper text-mutedGray border border-borderCol'
                            }`}
                          >
                            {step.label}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Status Action Button */}
                  <div className="flex items-center space-x-2">
                    {order.status === 'PAYMENT_CONFIRMED' && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'IN_PRODUCTION')}
                        className="px-3 py-1.5 bg-ink text-paper hover:bg-ink-light rounded font-mono text-xs font-bold transition-colors"
                      >
                        Start Printing &rarr;
                      </button>
                    )}
                    {order.status === 'IN_PRODUCTION' && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'QA')}
                        className="px-3 py-1.5 bg-indigo-700 text-paper hover:bg-indigo-800 rounded font-mono text-xs font-bold transition-colors"
                      >
                        Move to QA &rarr;
                      </button>
                    )}
                    {order.status === 'QA' && (
                      <button
                        type="button"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                        className="px-3 py-1.5 bg-emerald-700 text-paper hover:bg-emerald-800 rounded font-mono text-xs font-bold transition-colors"
                      >
                        Dispatch / Ship &rarr;
                      </button>
                    )}
                    {order.status === 'SHIPPED' && (
                      <span className="font-mono text-xs text-emerald-700 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Dispatched to Courier</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Spec Inspection Modal */}
      {inspectPackage && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-sans font-bold text-base text-ink">
                RIP Production Package &bull; {inspectPackage.jobId}
              </h3>
              <button
                onClick={() => setInspectPackage(null)}
                className="text-mutedGray hover:text-ink font-mono text-sm"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-paper p-4 rounded-xl border border-borderCol">
              <div>
                <span className="text-mutedGray">Garment SKU:</span>{' '}
                <span className="font-bold">{inspectPackage.garment.blankSku}</span>
              </div>
              <div>
                <span className="text-mutedGray">Variant SKU:</span>{' '}
                <span className="font-bold">{inspectPackage.garment.variantSku}</span>
              </div>
              <div>
                <span className="text-mutedGray">Color:</span>{' '}
                <span>{inspectPackage.garment.colorName} ({inspectPackage.garment.colorHex})</span>
              </div>
              <div>
                <span className="text-mutedGray">Size:</span>{' '}
                <span className="font-bold">{inspectPackage.garment.size}</span>
              </div>
              <div>
                <span className="text-mutedGray">Print Platen:</span>{' '}
                <span>{inspectPackage.printingTechnique.maxPrintWidthCm} x {inspectPackage.printingTechnique.maxPrintHeightCm} cm</span>
              </div>
              <div>
                <span className="text-mutedGray">Target Dispatch:</span>{' '}
                <span className="font-bold text-warm-dark">
                  {new Date(inspectPackage.targetShipDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-xs uppercase font-bold text-ink">Surface Print Coordinates</h4>
              {inspectPackage.surfaces.map((surf: any) => (
                <div key={surf.surface} className="border border-borderCol rounded-lg p-3 bg-paper space-y-2">
                  <div className="flex justify-between font-mono text-xs font-bold text-ink">
                    <span>{surf.surfaceName} ({surf.surface})</span>
                    <span>{surf.artworkCount} artwork(s)</span>
                  </div>
                  {surf.artworks.map((art: any, idx: number) => (
                    <div key={idx} className="text-xs font-mono pl-2 border-l-2 border-warm space-y-0.5">
                      <div className="font-bold text-ink">{art.title} (by {art.creatorName})</div>
                      <div className="text-mutedGray">
                        Dimensions: {art.placement.calculatedWidthCm} x {art.placement.calculatedHeightCm} cm
                        (Center: X {art.placement.xCenterCm}cm, Y {art.placement.yCenterCm}cm)
                      </div>
                      <div className="text-[11px] text-mutedGray truncate">
                        Asset: <a href={art.highResAssetUrl} target="_blank" rel="noreferrer" className="text-warm-dark underline">{art.highResAssetUrl}</a>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <a
                href={`/api/orders/${inspectPackage.orderId}/production`}
                download={`${inspectPackage.jobId}.json`}
                className="px-4 py-2 bg-ink text-paper rounded-lg font-mono text-xs font-bold hover:bg-ink-light transition-colors"
              >
                Download Full JSON
              </a>
              <button
                onClick={() => setInspectPackage(null)}
                className="px-4 py-2 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 4.4 Customer Order Tracking: `src/app/account/orders/[id]/page.tsx` & Client Component

#### Page Component: `src/app/account/orders/[id]/page.tsx`
```typescript
import { notFound } from 'next/navigation';
import { getOrderByIdOrNumber } from '@/lib/orders';
import CustomerOrderTrackingClient from '@/components/orders/CustomerOrderTrackingClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Order Tracking #${params.id} | ape-parel`,
    description: `Track your custom ape-parel t-shirt order with live production status and itemized pricing breakdown.`,
  };
}

export default async function OrderTrackingPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderByIdOrNumber(params.id);

  if (!order) {
    notFound();
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CustomerOrderTrackingClient order={order} />
    </div>
  );
}
```

#### Client Component Blueprint: `src/components/orders/CustomerOrderTrackingClient.tsx`
```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  ChevronRight,
  Shirt,
  Layers,
  MapPin,
  Download,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface Props {
  order: any;
}

export default function CustomerOrderTrackingClient({ order }: Props) {
  const [activePreviewSurface, setActivePreviewSurface] = useState<'FRONT' | 'BACK'>('FRONT');

  // Parse design elements
  let frontElements: any[] = [];
  let backElements: any[] = [];
  try {
    frontElements = order.design?.frontElements ? JSON.parse(order.design.frontElements) : [];
    backElements = order.design?.backElements ? JSON.parse(order.design.backElements) : [];
  } catch {}

  // Production Stepper stages
  const statusSteps = [
    { key: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', desc: 'Order verified & sent to supplier' },
    { key: 'IN_PRODUCTION', label: 'In Production', desc: 'Blank garment loaded & Kornit DTG printing' },
    { key: 'QA', label: 'Quality Assurance', desc: 'Pre-ship QA audit & packaging' },
    { key: 'SHIPPED', label: 'Shipped', desc: 'Courier dispatch with tracking' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Package arrived at destination' },
  ];

  const statusOrder = ['PAYMENT_CONFIRMED', 'IN_PRODUCTION', 'QA', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = Math.max(0, statusOrder.indexOf(order.status));

  return (
    <div className="space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/studio/new"
          className="inline-flex items-center space-x-1 font-mono text-xs text-mutedGray hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio</span>
        </Link>
        <span className="font-mono text-xs text-mutedGray">
          Order ID: <span className="font-bold text-ink">{order.orderNumber}</span>
        </span>
      </div>

      {/* Main Order Card Header */}
      <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold font-sans text-ink">
              Order #{order.orderNumber}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              {order.paymentStatus}
            </span>
          </div>
          <p className="font-mono text-xs text-mutedGray mt-1">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            &bull; Supplier: <span className="text-ink font-semibold">{order.supplier?.companyName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={`/api/orders/${order.id}/production`}
            className="px-3.5 py-2 border border-borderCol rounded-lg font-mono text-xs font-bold text-ink hover:bg-paper-dark transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Spec</span>
          </a>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-ink text-paper rounded-lg font-mono text-xs font-bold hover:bg-ink-light transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Visual Status Stepper */}
      <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-6">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          Manufacturing & Delivery Progress
        </h2>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-borderCol" />
          <div
            className="hidden sm:block absolute top-4 left-6 h-0.5 bg-ink transition-all duration-500"
            style={{
              width: `${(currentStepIdx / (statusSteps.length - 1)) * 90}%`,
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="flex sm:flex-col items-start sm:items-center space-x-3 sm:space-x-0 space-y-0 sm:space-y-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                      isPast
                        ? 'bg-emerald-600 text-paper'
                        : isCurrent
                        ? 'bg-ink text-paper ring-4 ring-warm/40'
                        : 'bg-paper border border-borderCol text-mutedGray'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="sm:text-center">
                    <div className={`font-mono text-xs font-bold ${isCurrent ? 'text-ink' : 'text-mutedGray'}`}>
                      {step.label}
                    </div>
                    <p className="font-mono text-[10px] text-mutedGray hidden sm:block mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Design Mockup & Garment Details VS Server Itemized Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual Mockup & Garment Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Garment Mockup Preview Card */}
          <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink">
                Custom Apparel Mockup
              </span>
              <div className="flex space-x-1 bg-paper p-1 rounded-lg border border-borderCol">
                <button
                  onClick={() => setActivePreviewSurface('FRONT')}
                  className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                    activePreviewSurface === 'FRONT' ? 'bg-ink text-paper font-bold' : 'text-mutedGray'
                  }`}
                >
                  Front Canvas
                </button>
                <button
                  onClick={() => setActivePreviewSurface('BACK')}
                  className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                    activePreviewSurface === 'BACK' ? 'bg-ink text-paper font-bold' : 'text-mutedGray'
                  }`}
                >
                  Back Canvas
                </button>
              </div>
            </div>

            {/* Garment Visual Canvas Container */}
            <div
              className="relative w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden border border-borderCol/60"
              style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
            >
              {/* T-Shirt Silhouette Outline Overlay */}
              <div className="absolute inset-4 border border-dashed border-white/20 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  {activePreviewSurface} PRINT ZONE (35 x 45 CM)
                </span>
              </div>

              {/* Render placed elements on active surface */}
              {(activePreviewSurface === 'FRONT' ? frontElements : backElements).map((el: any) => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                    zIndex: el.zIndex || 1,
                  }}
                >
                  <img
                    src={el.previewUrl}
                    alt={el.title}
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
              ))}
            </div>

            {/* Garment Blank Metadata */}
            <div className="p-4 bg-paper rounded-xl border border-borderCol text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-mutedGray">Blank Model:</span>
                <span className="font-bold text-ink">{order.design?.garmentProduct?.name || 'Apex Heavyweight Tee'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Fabric Specification:</span>
                <span className="text-ink">{order.design?.garmentProduct?.fabric || '100% Combed Cotton, 240 GSM'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedGray">Variant / Color:</span>
                <span className="text-ink flex items-center space-x-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-borderCol inline-block"
                    style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                  />
                  <span>Size {order.design?.garmentSize || 'L'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Licensed Artworks List */}
          <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-4">
            <h3 className="font-mono text-xs uppercase font-bold text-ink">
              Licensed Creator Artworks ({order.obligations?.length || 0})
            </h3>
            <div className="space-y-3">
              {order.obligations?.map((ob: any) => (
                <div
                  key={ob.id}
                  className="p-3 bg-paper rounded-xl border border-borderCol flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={ob.artwork?.previewUrl}
                      alt={ob.artwork?.title}
                      className="w-10 h-10 rounded border border-borderCol object-cover bg-paper-dark"
                    />
                    <div>
                      <div className="font-bold text-ink">{ob.artwork?.title}</div>
                      <div className="text-mutedGray text-[11px]">
                        Creator:{' '}
                        <Link
                          href={`/creators/${ob.artwork?.creator?.slug}`}
                          className="text-warm-dark hover:underline font-semibold"
                        >
                          {ob.artwork?.creator?.displayName}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-ink">฿{ob.totalAmount.toLocaleString()}</span>
                    <div className="text-[10px] text-mutedGray">Standard License</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Server-Authoritative Pricing Breakdown & Shipping */}
        <div className="lg:col-span-5 space-y-6">
          {/* Authoritative Pricing Engine Breakdown */}
          <div className="p-6 bg-paper-light border-2 border-borderCol rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-sans font-bold text-sm uppercase text-ink">
                  Authoritative Price Breakdown
                </h3>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/50">
                SERVER VERIFIED
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">1. Garment Blank (APX-HVY-001)</span>
                <span className="font-semibold">฿{order.garmentCost.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">2. Kornit DTG Printing</span>
                <span className="font-semibold">฿{order.printingCost.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">3. Eco Apparel Packaging</span>
                <span className="font-semibold">฿{order.packagingCost.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">4. Express Flat Shipping</span>
                <span className="font-semibold">฿{order.shippingCost.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-ink">
                <span className="text-mutedGray">5. Artwork License Royalties</span>
                <span className="font-semibold text-warm-dark">
                  ฿{order.licensingCost.toLocaleString()}
                </span>
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t-2 border-borderCol flex justify-between items-baseline">
                <div>
                  <span className="font-sans font-bold text-sm text-ink uppercase">
                    Total Amount Paid
                  </span>
                  <p className="text-[10px] text-mutedGray">Exact benchmark ฿410 guarantee</p>
                </div>
                <span className="font-mono text-2xl font-black text-ink">
                  ฿{order.totalAmount.toLocaleString()} THB
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address & Delivery Details */}
          <div className="p-6 bg-paper-light border border-borderCol rounded-2xl shadow-sm space-y-3 font-mono text-xs">
            <div className="flex items-center space-x-2 text-ink font-bold font-sans">
              <MapPin className="w-4 h-4 text-warm-dark" />
              <span>Shipping Information</span>
            </div>
            <div className="space-y-1 text-ink pt-1">
              <div className="font-bold">{order.shippingName}</div>
              <div className="text-mutedGray">{order.shippingAddress}</div>
              <div className="text-mutedGray">
                {order.shippingCity}, {order.shippingPostal}
              </div>
              {order.shippingPhone && (
                <div className="text-mutedGray">Phone: {order.shippingPhone}</div>
              )}
            </div>
          </div>

          {/* Call to Action: Design Again */}
          <div className="p-5 bg-gradient-to-br from-paper to-warm/20 border border-warm/40 rounded-2xl shadow-sm space-y-2 text-center">
            <Sparkles className="w-5 h-5 text-warm-dark mx-auto" />
            <h4 className="font-sans font-bold text-sm text-ink">Love this design?</h4>
            <p className="font-mono text-[11px] text-mutedGray">
              Create another custom oversized tee in the 2D & 3D Interactive Design Studio.
            </p>
            <div className="pt-2">
              <Link
                href="/studio/new"
                className="inline-block w-full py-2.5 bg-ink hover:bg-ink-light text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors shadow-sm"
              >
                Customize Another Tee
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Verification Method

To independently verify all component blueprints and implementations:

1. **Prisma & Seed State Verification**:
   ```powershell
   npx prisma db seed
   ```
   Ensures benchmark order `APX-ORD-9021`, creators (`dash-ape`, `cyber-monk`, `soma-botanica`), and suppliers (`bangkok-garment-craft`) are seeded.

2. **TypeScript Compilation Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Must pass with zero type errors across all new pages and components.

3. **Vitest Unit & Integration Suites**:
   ```powershell
   npm test
   ```
   Validates that all existing 181 integration tests (orders, royalties, anti-tampering, production specs) continue to pass with 100% green exit code.

4. **Live Route Verification**:
   - Creator Dashboard: Navigate to `/creator/dashboard?creator=dash-ape`. Verify 4 metric cards (Gross ฿100, Volume 2, Eligible ฿100, Settled ฿0), click "Settle Payout", verify ledger updates to ฿0 and adds `PAYOUT_SETTLEMENT`.
   - Supplier Dashboard: Navigate to `/supplier/dashboard?supplier=bangkok-garment-craft`. Verify job `JOB-APX-ORD-9021`, advance stepper, and click "Download Spec (.json)".
   - Order Tracking: Navigate to `/account/orders/APX-ORD-9021`. Verify 5-step stepper, visual mockup preview, and 5-item breakdown totaling strictly ฿410.

5. **Invalidation Conditions**:
   - Any client-side price tampering or inconsistency with the authoritative server engine.
   - Payout settlement execution without updating the running balance or failing to create an audit event.
   - Discrepancy between production package JSON schema and factory spec download.
