'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Factory,
  Download,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  ChevronRight,
  Layers,
  MapPin,
  RefreshCw,
  Ruler,
  Shirt,
  MessageSquare,
  Grid,
  Save,
  Filter,
  AlertTriangle,
  AlertCircle,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  ArrowRight,
  Inbox,
  Boxes,
  FileCode,
  Sparkles,
  XCircle,
  X,
} from 'lucide-react';
import { ProductionBlueprintSheet } from '@/components/portal/ProductionBlueprintSheet';
import { SupplierNav } from '@/components/portal/SupplierNav';
import { OrderChatBox } from '@/components/portal/OrderChatBox';
import { OrderChatInboxClient } from '@/components/portal/OrderChatInboxClient';
import {
  SupplierInventoryMatrix,
  LOW_STOCK_THRESHOLD,
  isLowStock,
} from '@/lib/supplier';

export interface SupplierInfo {
  id: string;
  slug: string;
  companyName: string;
  location: string;
  leadTimeDays: number;
  verificationStatus?: string;
  rejectionReason?: string | null;
  printingServices?: Array<{
    code: string;
    name: string;
    maxPrintWidthCm: number;
    maxPrintHeightCm: number;
  }>;
}

export interface SupplierDashboardClientProps {
  suppliers: SupplierInfo[];
  currentSupplierSlug: string;
  initialOrders: any[];
  initialMatrix?: SupplierInventoryMatrix | null;
  needsOnboarding?: boolean;
}

export const SupplierDashboardClient: React.FC<SupplierDashboardClientProps> = ({
  suppliers,
  currentSupplierSlug,
  initialOrders,
  initialMatrix,
  needsOnboarding,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab navigation: 'tasks' | 'inbox' | 'stock' | 'blueprints'
  const initialTab = searchParams?.get('tab') as 'tasks' | 'inbox' | 'stock' | 'blueprints' || 'tasks';
  const [activeTab, setActiveTab] = useState<'tasks' | 'inbox' | 'stock' | 'blueprints'>(
    ['tasks', 'inbox', 'stock', 'blueprints'].includes(initialTab) ? initialTab : 'tasks'
  );

  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [inspectPackage, setInspectPackage] = useState<any | null>(null);
  const [selectedBlueprintOrder, setSelectedBlueprintOrder] = useState<any | null>(null);
  const [chattingOrder, setChattingOrder] = useState<any | null>(null);
  const [isLoadingSpec, setIsLoadingSpec] = useState(false);

  // Cancellation Review & Action Modal State
  const [reviewingOrder, setReviewingOrder] = useState<any | null>(null);
  const [reviewApproved, setReviewApproved] = useState<boolean>(true);
  const [reviewRejectionReason, setReviewRejectionReason] = useState<string>(
    'สินค้าเริ่มเข้าสู่กระบวนการพิมพ์สกรีนแล้ว ไม่สามารถยกเลิกได้'
  );
  const [reviewProofUrl, setReviewProofUrl] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Supplier-initiated Direct Cancellation Modal State
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [supplierCancelReason, setSupplierCancelReason] = useState<string>(
    'เสื้อเปล่าหมดสต็อกชั่วคราว (Blank garment out of stock)'
  );
  const [isSubmittingSupplierCancel, setIsSubmittingSupplierCancel] = useState<boolean>(false);
  const [supplierCancelError, setSupplierCancelError] = useState<string | null>(null);

  // Stock management state
  const [matrix, setMatrix] = useState<SupplierInventoryMatrix | null>(initialMatrix || null);
  const [stockMap, setStockMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (initialMatrix?.colorRows) {
      for (const row of initialMatrix.colorRows) {
        for (const size of initialMatrix.availableSizes) {
          const item = row.sizes[size];
          if (item) {
            map[item.id] = item.stock;
          }
        }
      }
    }
    return map;
  });

  const [hasStockChanges, setHasStockChanges] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSaveSuccess, setStockSaveSuccess] = useState(false);
  const [stockErrorMessage, setStockErrorMessage] = useState<string | null>(null);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Sync initial matrix if props change
  useEffect(() => {
    if (initialMatrix) {
      setMatrix(initialMatrix);
      const map: Record<string, number> = {};
      for (const row of initialMatrix.colorRows) {
        for (const size of initialMatrix.availableSizes) {
          const item = row.sizes[size];
          if (item) {
            map[item.id] = item.stock;
          }
        }
      }
      setStockMap(map);
      setHasStockChanges(false);
    }
  }, [initialMatrix, currentSupplierSlug]);

  const currentSupplier =
    suppliers.find((s) => s.slug === currentSupplierSlug) || suppliers[0];

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');

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
      const res = await fetch(`/api/orders/${encodeURIComponent(orderIdOrNumber)}/production`);
      if (!res.ok) throw new Error('Failed to load spec');
      const data = await res.json();
      setInspectPackage(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSpec(false);
    }
  };

  const handleReviewCancellation = async () => {
    if (!reviewingOrder) return;
    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/orders/${reviewingOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVIEW_REQUEST',
          approved: reviewApproved,
          rejectionReason: reviewApproved ? undefined : reviewRejectionReason,
          proofImageUrl: reviewApproved ? undefined : reviewProofUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to review cancellation (${res.status})`);
      }

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === reviewingOrder.id) {
            let snap: any = {};
            try {
              if (o.snapshotData) {
                snap = typeof o.snapshotData === 'string' ? JSON.parse(o.snapshotData) : o.snapshotData;
              }
            } catch {}
            const updatedSnap = {
              ...snap,
              cancellationRequest: {
                status: reviewApproved ? 'APPROVED' : 'REJECTED',
                resolvedAt: new Date().toISOString(),
                rejectionReason: reviewApproved ? undefined : reviewRejectionReason,
                proofImageUrl: reviewApproved ? undefined : reviewProofUrl || undefined,
              },
            };
            return {
              ...o,
              status: reviewApproved ? 'CANCELLED' : o.status,
              paymentStatus: reviewApproved ? 'REFUNDED' : o.paymentStatus,
              snapshotData: JSON.stringify(updatedSnap),
            };
          }
          return o;
        })
      );
      setReviewingOrder(null);
      router.refresh();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSupplierCancelOrder = async () => {
    if (!cancellingOrder) return;
    setIsSubmittingSupplierCancel(true);
    setSupplierCancelError(null);
    try {
      const res = await fetch(`/api/orders/${cancellingOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL',
          reason: `Supplier cancelled: ${supplierCancelReason}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to cancel order (${res.status})`);
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancellingOrder.id
            ? { ...o, status: 'CANCELLED', paymentStatus: 'REFUNDED' }
            : o
        )
      );
      setCancellingOrder(null);
      router.refresh();
    } catch (err: unknown) {
      setSupplierCancelError(err instanceof Error ? err.message : 'Error cancelling order');
    } finally {
      setIsSubmittingSupplierCancel(false);
    }
  };

  // Stock manipulation handlers
  const handleStockChange = (variantId: string, val: number) => {
    const num = Number.isFinite(val) ? val : 0;
    const clamped = Math.min(1_000_000, Math.max(0, Math.floor(num)));
    setStockMap((prev) => ({ ...prev, [variantId]: clamped }));
    setHasStockChanges(true);
    setStockSaveSuccess(false);
  };

  const handleQuickAdjust = (variantId: string, delta: number) => {
    const current = stockMap[variantId] ?? 0;
    handleStockChange(variantId, current + delta);
  };

  const handleSaveStock = async () => {
    setIsSavingStock(true);
    setStockSaveSuccess(false);
    setStockErrorMessage(null);

    const updates = Object.entries(stockMap).map(([variantId, stock]) => ({
      variantId,
      stock,
    }));

    try {
      const res = await fetch('/api/supplier/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update inventory');
      }

      setStockSaveSuccess(true);
      setHasStockChanges(false);
      router.refresh();
      setTimeout(() => setStockSaveSuccess(false), 4000);
    } catch (err: any) {
      setStockErrorMessage(err?.message || 'Error updating stock matrix');
    } finally {
      setIsSavingStock(false);
    }
  };

  // Filter orders for Tasks queue
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'QA') {
      return o.status === 'QA' || o.status === 'QA_PASSED';
    }
    if (statusFilter === 'READY_TO_PACK') {
      return o.status === 'READY_TO_PACK';
    }
    return o.status === statusFilter;
  });

  // Calculate live aggregates for Stock
  const totalStockUnits = Object.values(stockMap).reduce((a, b) => a + b, 0);
  const lowStockCount = Object.values(stockMap).filter((s) => isLowStock(s)).length;
  const pendingTasksCount = orders.filter(
    (o) => o.status === 'PAYMENT_CONFIRMED' || o.status === 'IN_PRODUCTION' || o.status === 'QA' || o.status === 'QA_PASSED' || o.status === 'READY_TO_PACK'
  ).length;

  return (
    <div className="space-y-8 w-full">
      {/* Unified Supplier Navigation */}
      <SupplierNav
        currentSupplierSlug={currentSupplierSlug}
        suppliers={suppliers}
        needsOnboarding={needsOnboarding}
      />

      {/* Supplier KYB Verification Status Banners */}
      {currentSupplier?.verificationStatus === 'PENDING' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start space-x-3.5 text-amber-950 shadow-sm animate-in fade-in">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm font-sans flex items-center space-x-2">
              <span>บัญชีโรงงานอยู่ระหว่างรอการตรวจสอบ (Pending Admin Review)</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">UNDER REVIEW</span>
            </h4>
            <p className="text-xs font-mono text-amber-800 leading-relaxed">
              เจ้าหน้าที่กำลังดำเนินการตรวจสอบเอกสารนิติบุคคล (KYB Documents) และศักยภาพเครื่องจักรของท่าน (1–2 วันทำการ) เมื่อได้รับการอนุมัติแล้ว โรงงานของท่านจะปรากฏในระบบ 3D Studio สำหรับรับคำสั่งซื้อพิมพ์เสื้อยืดทันที
            </p>
          </div>
        </div>
      )}

      {currentSupplier?.verificationStatus === 'REJECTED' && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start space-x-3.5 text-rose-950 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-sm font-sans flex items-center space-x-2">
              <span>ผลการพิจารณา: ต้องการเอกสารหรือการแก้ไขเพิ่มเติม</span>
              <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-mono font-bold">REJECTED</span>
            </h4>
            <div className="p-3 bg-white/60 border border-rose-200 rounded-xl text-xs font-mono text-rose-900">
              <span className="font-bold">ข้อความจากผู้ดูแลระบบ:</span> {currentSupplier?.rejectionReason || 'เอกสารไม่ครบถ้วนตามเกณฑ์'}
            </div>
            <div className="pt-1">
              <Link
                href="/supplier/onboarding"
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-mono font-bold hover:bg-rose-700 transition-colors"
              >
                <span>ยื่นเอกสารเพิ่มเติมใหม่</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Focus Overview Command Bar (3 Pillars: Tasks, Inbox, Stock) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        {/* Pillar 1: Production Tasks */}
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'tasks'
              ? 'bg-paper-light border-ink shadow-md ring-2 ring-ink/20'
              : 'bg-paper-light border-borderCol hover:border-ink/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-mutedGray uppercase text-[10px] font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Production Tasks</span>
            </span>
            {pendingTasksCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold border border-amber-500/20">
                {pendingTasksCount} Active
              </span>
            )}
          </div>
          <div data-testid="stat-total-jobs" className="text-2xl font-bold text-ink mt-2">
            {orders.length}
          </div>
          <div className="text-[11px] text-mutedGray mt-0.5 flex items-center justify-between">
            <span>คิวงานที่ต้องผลิต</span>
            <span className="text-[10px] text-warm-dark font-bold group-hover:underline">เปิดคิวงาน &rarr;</span>
          </div>
        </button>

        {/* Pillar 2: Inbox & Communications */}
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'inbox'
              ? 'bg-paper-light border-ink shadow-md ring-2 ring-ink/20'
              : 'bg-paper-light border-borderCol hover:border-ink/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-mutedGray uppercase text-[10px] font-bold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Order Inbox</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 text-[10px] font-bold border border-indigo-500/20">
              Live Chat
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2 flex items-center gap-2">
            <Inbox className="w-6 h-6 stroke-[2.5]" />
            <span className="text-sm font-sans font-extrabold uppercase">แชทคำสั่งซื้อ</span>
          </div>
          <div className="text-[11px] text-mutedGray mt-0.5 flex items-center justify-between">
            <span>คุยกับลูกค้า & แอดมิน</span>
            <span className="text-[10px] text-indigo-600 font-bold group-hover:underline">เปิดกล่อง &rarr;</span>
          </div>
        </button>

        {/* Pillar 3: Blank Stock Management */}
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'stock'
              ? 'bg-paper-light border-ink shadow-md ring-2 ring-ink/20'
              : 'bg-paper-light border-borderCol hover:border-ink/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-mutedGray uppercase text-[10px] font-bold flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-warm-dark" />
              <span>Stock Matrix</span>
            </span>
            {lowStockCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-700 text-[10px] font-bold border border-red-500/20 animate-pulse">
                {lowStockCount} เตือนสต็อก
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold border border-emerald-500/20">
                สต็อกพร้อม
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-ink mt-2">
            {totalStockUnits.toLocaleString()} <span className="text-xs font-normal text-mutedGray">ตัว</span>
          </div>
          <div className="text-[11px] text-mutedGray mt-0.5 flex items-center justify-between">
            <span>จัดการสต๊อกเสื้อเปล่า</span>
            <span className="text-[10px] text-warm-dark font-bold group-hover:underline">ปรับสต๊อก &rarr;</span>
          </div>
        </button>

        {/* Pillar 4: Shipped & Dispatched Deliverables */}
        <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-mutedGray uppercase text-[10px] font-bold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dispatched</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold">
              Escrow Paid
            </span>
          </div>
          <div data-testid="stat-shipped-jobs" className="text-2xl font-bold text-emerald-700 mt-2">
            {orders.filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED').length}
          </div>
          <div className="text-[11px] text-mutedGray mt-0.5">
            ส่งมอบให้ขนส่งแล้ว
          </div>
        </div>
      </div>

      {/* Primary Focus Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-borderCol pb-2">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 font-mono text-xs rounded-xl flex items-center gap-2 transition-all font-bold ${
              activeTab === 'tasks'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>คิวงานผลิต (Production Tasks)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-paper/20 text-inherit">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 font-mono text-xs rounded-xl flex items-center gap-2 transition-all font-bold ${
              activeTab === 'inbox'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>กล่องข้อความ (Inbox & Chat)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 font-mono text-xs rounded-xl flex items-center gap-2 transition-all font-bold ${
              activeTab === 'stock'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            <Grid className="w-4 h-4 text-amber-400" />
            <span>จัดการสต๊อกเสื้อเปล่า (Stock Matrix)</span>
            {lowStockCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold animate-pulse">
                ! {lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blueprints')}
            className={`px-4 py-2 font-mono text-xs rounded-xl flex items-center gap-2 transition-all font-bold ${
              activeTab === 'blueprints'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            <Ruler className="w-4 h-4 text-warm-dark" />
            <span>พิมพ์เขียว & สเปก (RIP Blueprints)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-borderCol font-mono text-xs text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
          title="Refresh dashboard data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PRODUCTION TASKS FOCUS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Sub-filters for Tasks */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper-light p-3 rounded-xl border border-borderCol">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <span className="font-mono text-xs text-mutedGray uppercase mr-2 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>สถานะ:</span>
              </span>
              {[
                { key: 'ALL', label: `งานทั้งหมด (${orders.length})` },
                {
                  key: 'PAYMENT_CONFIRMED',
                  label: `รอเริ่มผลิต (${orders.filter((o) => o.status === 'PAYMENT_CONFIRMED').length})`,
                },
                {
                  key: 'IN_PRODUCTION',
                  label: `กำลังพิมพ์ (${orders.filter((o) => o.status === 'IN_PRODUCTION').length})`,
                },
                {
                  key: 'QA',
                  label: `ตรวจสเปก/QA (${orders.filter((o) => o.status === 'QA' || o.status === 'QA_PASSED').length})`,
                },
                {
                  key: 'READY_TO_PACK',
                  label: `พร้อมแพ็กส่ง (${orders.filter((o) => o.status === 'READY_TO_PACK').length})`,
                },
                {
                  key: 'SHIPPED',
                  label: `จัดส่งแล้ว (${orders.filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED').length})`,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1 font-mono text-xs rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-ink text-paper font-bold'
                      : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-mutedGray">
              <Clock className="w-3.5 h-3.5 text-warm-dark" />
              <span>Target Lead Time: {currentSupplier?.leadTimeDays || 3} วันทำการ</span>
            </div>
          </div>

          {/* Hidden stats anchors for test suite backward compatibility */}
          <div className="hidden">
            <span data-testid="stat-queued-jobs">
              {orders.filter((o) => o.status === 'PAYMENT_CONFIRMED').length}
            </span>
            <span data-testid="stat-printing-jobs">
              {orders.filter((o) => o.status === 'IN_PRODUCTION' || o.status === 'QA' || o.status === 'QA_PASSED').length}
            </span>
          </div>

          {/* Job Cards Queue */}
          <div data-testid="supplier-job-queue" className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div
                data-testid="no-jobs-placeholder"
                className="p-12 text-center bg-paper-light border border-borderCol rounded-2xl font-mono text-xs text-mutedGray space-y-2"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-paper border border-borderCol flex items-center justify-center text-mutedGray">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="font-bold text-ink">ไม่มีคิวงานที่ต้องดำเนินการในหมวดหมู่นี้</div>
                <p>คำสั่งซื้อใหม่จากลูกค้าจะปรากฏในแท็บนี้ทันทีที่มีการยืนยันการชำระเงิน</p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const garment = order.design?.garmentProduct;
                let cancellationRequest: any = null;
                try {
                  if (order.snapshotData) {
                    const snap =
                      typeof order.snapshotData === 'string'
                        ? JSON.parse(order.snapshotData)
                        : order.snapshotData;
                    cancellationRequest = snap?.cancellationRequest || null;
                  }
                } catch {}
                const isPendingCancellation =
                  cancellationRequest?.status === 'PENDING' && order.status === 'IN_PRODUCTION';

                return (
                  <div
                    key={order.id}
                    data-testid={`job-card-${order.orderNumber}`}
                    className="p-6 bg-paper-light border border-borderCol rounded-xl shadow-xs space-y-4 hover:border-warm transition-colors"
                  >
                    {/* Job Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderCol/60 pb-3">
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/supplier/jobs/${order.orderNumber}`}
                          data-testid={`link-job-blueprint-${order.orderNumber}`}
                          className="font-mono text-sm font-black text-ink hover:text-warm-dark hover:underline transition-colors flex items-center gap-1"
                          title="Open full-page production placement blueprint sheet"
                        >
                          <span>JOB-{order.orderNumber}</span>
                          <ChevronRight className="w-4 h-4 text-mutedGray" />
                        </Link>
                        <span className="font-mono text-xs text-mutedGray">
                          Order: {order.orderNumber}
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-warm/20 text-ink font-semibold">
                          Target Lead: {currentSupplier?.leadTimeDays}d
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Chat with Customer */}
                        <button
                          type="button"
                          data-testid={`chat-customer-${order.orderNumber}`}
                          onClick={() => setChattingOrder(order)}
                          className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                          <span>แชทกับลูกค้า</span>
                        </button>

                        {/* View Placement Blueprint */}
                        <button
                          type="button"
                          data-testid={`view-blueprint-${order.orderNumber}`}
                          onClick={() => setSelectedBlueprintOrder(order)}
                          className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-xs"
                        >
                          <Ruler className="w-3.5 h-3.5 text-warm-dark" />
                          <span>Blueprint</span>
                        </button>

                        {/* 1-Click Production Spec Download */}
                        <a
                          data-testid={`download-spec-${order.orderNumber}`}
                          href={`/api/orders/${order.id}/production`}
                          download={`JOB-${order.orderNumber}.json`}
                          className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center space-x-1.5 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Spec (.json)</span>
                        </a>

                        <button
                          type="button"
                          data-testid={`inspect-spec-${order.orderNumber}`}
                          onClick={() => handleInspectSpec(order.id)}
                          className="px-3 py-1.5 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold transition-colors"
                        >
                          Inspect RIP
                        </button>
                      </div>
                    </div>

                    {/* Cancellation Request Review Callout */}
                    {isPendingCancellation && (
                      <div
                        data-testid={`cancellation-request-card-${order.orderNumber}`}
                        className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-3 shadow-xs animate-in fade-in"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 text-amber-900 font-bold font-mono text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                            <span>ลูกค้าส่งคำขอยกเลิกคำสั่งซื้อนี้ (Cancellation Request)</span>
                          </div>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold self-start">
                            SLA ตอบกลับ 24 ชม.
                          </span>
                        </div>
                        <p className="font-mono text-xs text-amber-900 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-amber-200">
                          <strong>เหตุผลของลูกค้า:</strong> &ldquo;{cancellationRequest.reason}&rdquo;
                        </p>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-1">
                          <button
                            type="button"
                            data-testid={`btn-approve-cancel-${order.orderNumber}`}
                            onClick={() => {
                              setReviewingOrder(order);
                              setReviewApproved(true);
                              setReviewError(null);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-mono text-xs font-bold transition-colors shadow-xs flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✓ อนุมัติยกเลิก (คืนเงิน 100% & คืนสต๊อก)</span>
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-reject-cancel-${order.orderNumber}`}
                            onClick={() => {
                              setReviewingOrder(order);
                              setReviewApproved(false);
                              setReviewError(null);
                            }}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-xs font-bold transition-colors shadow-xs flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>✕ ปฏิเสธคำขอ (พ่นหมึก/เริ่มผลิตแล้ว)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setChattingOrder(order)}
                            className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol text-ink rounded-lg font-mono text-xs font-bold transition-colors shadow-xs flex items-center space-x-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                            <span>แชทคุยกับลูกค้า</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Garment Details & Print Spec Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                      {/* Garment Details with Visual Thumbnail */}
                      <div className="flex items-start space-x-3">
                        <div
                          data-testid={`garment-thumbnail-${order.orderNumber}`}
                          className="w-14 h-14 rounded-lg border border-borderCol/80 shadow-xs flex-shrink-0 relative overflow-hidden flex items-center justify-center"
                          style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                          title={`${garment?.name || 'Garment'} (${order.design?.garmentColorHex || '#131718'})`}
                        >
                          {order.design?.previewFrontUrl ? (
                            <img
                              src={order.design.previewFrontUrl}
                              alt={garment?.name || 'T-Shirt preview'}
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-paper/70 pointer-events-none">
                              <Shirt className="w-7 h-7 stroke-1 text-white/80" />
                              <span className="text-[8px] font-mono font-bold uppercase text-white/90">
                                {order.design?.garmentSize || 'L'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] uppercase text-mutedGray font-bold block">
                            Garment Specifications
                          </span>
                          <div className="font-bold text-ink truncate">{garment?.name || 'Apex Heavyweight Tee'}</div>
                          <div className="text-mutedGray text-[11px]">SKU: {garment?.sku || 'APX-HVY-001'}</div>
                          <div className="flex items-center space-x-2 pt-0.5 text-[11px]">
                            <span
                              className="w-3 h-3 rounded-full border border-borderCol flex-shrink-0"
                              style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                            />
                            <span>Size: {order.design?.garmentSize || 'L'}</span>
                            <span>&bull;</span>
                            <span>Qty: {order.quantity} pc(s)</span>
                          </div>
                        </div>
                      </div>

                      {/* Print Technique & Surfaces */}
                      {(() => {
                        let hasFront = false;
                        let hasBack = false;
                        try {
                          if (order.design?.frontElements) {
                            const parsed = typeof order.design.frontElements === 'string'
                              ? JSON.parse(order.design.frontElements)
                              : order.design.frontElements;
                            hasFront = Array.isArray(parsed) && parsed.length > 0;
                          }
                          if (order.design?.backElements) {
                            const parsed = typeof order.design.backElements === 'string'
                              ? JSON.parse(order.design.backElements)
                              : order.design.backElements;
                            hasBack = Array.isArray(parsed) && parsed.length > 0;
                          }
                        } catch {}

                        const surfaceText = hasFront && hasBack
                          ? 'Front & Back (2 surfaces)'
                          : hasBack
                          ? 'Back Surface (1 surface)'
                          : 'Front Chest (1 surface)';

                        return (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase text-mutedGray font-bold">
                              Print Technique & Surfaces
                            </span>
                            <div className="font-bold text-ink">Direct-to-Garment (DTG)</div>
                            <div className="flex items-center space-x-1.5 pt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-warm/20 text-ink font-bold text-[10px] uppercase">
                                {surfaceText}
                              </span>
                              <span className="text-mutedGray text-[11px]">&bull; 35x45 cm max</span>
                            </div>
                            <div className="flex items-center space-x-1 pt-1 text-ink font-semibold text-[11px]">
                              <Layers className="w-3.5 h-3.5 text-warm-dark" />
                              <span>{order.obligations?.length || 1} Artwork Layer(s) Licensed</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Delivery Destination */}
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
                      <div className="flex items-center space-x-2 font-mono text-xs flex-wrap">
                        <span className="text-mutedGray text-[11px] uppercase mr-1">Workflow:</span>
                        {[
                          { key: 'PAYMENT_CONFIRMED', label: 'Queued' },
                          { key: 'IN_PRODUCTION', label: 'Printing' },
                          { key: 'QA', altKey: 'QA_PASSED', label: 'QA Check' },
                          { key: 'READY_TO_PACK', label: 'Ready to Pack' },
                          { key: 'SHIPPED', altKey: 'DELIVERED', label: 'Shipped' },
                        ].map((step, idx) => {
                          const isCurrent =
                            order.status === step.key ||
                            (step.altKey && order.status === step.altKey);
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
                            data-testid={`action-start-printing-${order.orderNumber}`}
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'IN_PRODUCTION')}
                            className="px-3 py-1.5 bg-ink text-paper hover:bg-ink-light rounded font-mono text-xs font-bold transition-colors shadow-xs"
                          >
                            {updatingOrderId === order.id ? 'Updating...' : 'Start Printing →'}
                          </button>
                        )}
                        {order.status === 'IN_PRODUCTION' && (
                          <button
                            type="button"
                            data-testid={`action-move-qa-${order.orderNumber}`}
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'QA_PASSED')}
                            className="px-3 py-1.5 bg-indigo-700 text-paper hover:bg-indigo-800 rounded font-mono text-xs font-bold transition-colors shadow-xs"
                          >
                            {updatingOrderId === order.id ? 'Updating...' : 'Move to QA →'}
                          </button>
                        )}
                        {(order.status === 'QA' || order.status === 'QA_PASSED') && (
                          <button
                            type="button"
                            data-testid={`action-ready-pack-${order.orderNumber}`}
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'READY_TO_PACK')}
                            className="px-3 py-1.5 bg-amber-700 text-paper hover:bg-amber-800 rounded font-mono text-xs font-bold transition-colors shadow-xs"
                          >
                            {updatingOrderId === order.id ? 'Updating...' : 'Ready to Pack →'}
                          </button>
                        )}
                        {order.status === 'READY_TO_PACK' && (
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/supplier/fulfillment?supplier=${encodeURIComponent(currentSupplierSlug)}&orderId=${order.orderNumber}`}
                              className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol text-ink rounded font-mono text-xs font-bold transition-colors shadow-xs flex items-center space-x-1"
                            >
                              <span>Fulfill & Slip</span>
                            </Link>
                            <button
                              type="button"
                              data-testid={`action-ship-${order.orderNumber}`}
                              disabled={updatingOrderId === order.id}
                              onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                              className="px-3 py-1.5 bg-emerald-700 text-paper hover:bg-emerald-800 rounded font-mono text-xs font-bold transition-colors shadow-xs"
                            >
                              {updatingOrderId === order.id ? 'Updating...' : 'Dispatch / Ship →'}
                            </button>
                          </div>
                        )}
                        {order.status === 'SHIPPED' && (
                          <span className="font-mono text-xs text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Dispatched to Courier</span>
                          </span>
                        )}
                        {order.status === 'DELIVERED' && (
                          <span className="font-mono text-xs text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Delivered</span>
                          </span>
                        )}

                        {/* Supplier Direct Cancellation button for unfulfilled orders */}
                        {['PAYMENT_CONFIRMED', 'IN_PRODUCTION'].includes(order.status) && (
                          <button
                            type="button"
                            data-testid={`btn-supplier-cancel-${order.orderNumber}`}
                            onClick={() => {
                              setCancellingOrder(order);
                              setSupplierCancelError(null);
                            }}
                            className="px-2.5 py-1.5 text-mutedGray hover:text-red-600 border border-borderCol hover:border-red-300 rounded font-mono text-[11px] transition-colors"
                            title="ยกเลิกคำสั่งซื้อโดยผู้ผลิต (เช่น เสื้อเปล่าขาดสต็อก หรือเครื่องจักรขัดข้อง)"
                          >
                            ยกเลิกงานพิมพ์
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INBOX & REAL-TIME ORDER COMMUNICATIONS FOCUS                      */}
      {/* ========================================================================= */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="p-4 bg-paper-light border border-borderCol rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-sans font-bold text-base text-ink flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>ศูนย์กลางข้อความและสื่อสารงานผลิต (Production Order Chat Hub)</span>
              </h2>
              <p className="font-mono text-xs text-mutedGray mt-0.5">
                ติดต่อสื่อสารกับลูกค้าและทีมงาน ape-parel แบบเรียลไทม์ ตรวจสอบไฟล์อาร์ตเวิร์ก แจ้งปัญหา และยืนยันการจัดส่ง
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Escrow Protected Chat</span>
              </span>
            </div>
          </div>

          {/* Render Full-Featured OrderChatInboxClient */}
          <div className="bg-paper-light border border-borderCol rounded-2xl overflow-hidden shadow-xs">
            <OrderChatInboxClient />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: STOCK & INVENTORY BLANK GARMENT MATRIX FOCUS                      */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="p-6 bg-paper-light border border-borderCol rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-sans font-black text-xl text-ink flex items-center gap-2">
                  <Grid className="w-5 h-5 text-warm-dark" />
                  <span>จัดการสต๊อกเสื้อเปล่า (Blank Garment Inventory Matrix)</span>
                </h2>
                <p className="font-mono text-xs text-mutedGray mt-1">
                  ปรับสต็อกผ้าเปล่าตาม Colorway × Size แบบเรียลไทม์ พร้อมแจ้งเตือนเมื่อสต็อกต่ำกว่าเกณฑ์ความปลอดภัย ({LOW_STOCK_THRESHOLD} ตัว)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                  className={`px-3 py-2 rounded-xl font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors border ${
                    filterLowStockOnly
                      ? 'bg-red-500/10 border-red-500/30 text-red-800'
                      : 'bg-paper border-borderCol text-mutedGray hover:text-ink'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>เฉพาะที่สต็อกต่ำ ({lowStockCount})</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveStock}
                  disabled={isSavingStock || !hasStockChanges}
                  className="px-4 py-2 bg-ink hover:bg-ink-light disabled:opacity-40 disabled:cursor-not-allowed text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-sm flex items-center space-x-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingStock ? 'กำลังบันทึก...' : 'บันทึกสต็อกทั้งหมด'}</span>
                </button>
              </div>
            </div>

            {/* Notification messages */}
            {stockSaveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-900 font-mono text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>บันทึกการปรับปรุงสต็อกสำเร็จและอัปเดตลงฐานข้อมูลเรียบร้อยแล้ว!</span>
              </div>
            )}

            {stockErrorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{stockErrorMessage}</span>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 bg-paper rounded-xl border border-borderCol/80">
                <span className="text-mutedGray uppercase text-[10px]">รุ่นเสื้อหลัก</span>
                <div className="font-bold text-ink mt-0.5 truncate">{matrix?.productName || 'Apex Heavyweight Tee'}</div>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol/80">
                <span className="text-mutedGray uppercase text-[10px]">สต็อกรวมทุกสีไซส์</span>
                <div className="font-bold text-ink mt-0.5">{totalStockUnits.toLocaleString()} ตัว</div>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol/80">
                <span className="text-mutedGray uppercase text-[10px]">จำนวนสีผ้า (Colorways)</span>
                <div className="font-bold text-ink mt-0.5">{matrix?.colorRows.length || 0} โทนสี</div>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol/80">
                <span className="text-mutedGray uppercase text-[10px]">ไซส์ที่มีจำหน่าย</span>
                <div className="font-bold text-ink mt-0.5">{matrix?.availableSizes.join(', ') || 'S, M, L, XL'}</div>
              </div>
            </div>
          </div>

          {/* Matrix Grid */}
          {matrix ? (
            <div className="bg-paper-light border border-borderCol rounded-2xl p-6 shadow-xs overflow-x-auto space-y-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderCol text-mutedGray font-mono text-[11px] uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-semibold">Colorway / สีผ้า</th>
                    {matrix.availableSizes.map((size) => (
                      <th key={size} className="pb-3 px-3 font-semibold text-center min-w-[130px]">
                        ไซส์ {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol/60 font-mono text-xs">
                  {matrix.colorRows.map((row) => {
                    const rowLowStock = matrix.availableSizes.some((s) => {
                      const item = row.sizes[s];
                      return item && isLowStock(stockMap[item.id] ?? item.stock);
                    });

                    if (filterLowStockOnly && !rowLowStock) return null;

                    return (
                      <tr key={row.colorName} className="hover:bg-paper-dark/40 transition-colors">
                        {/* Color info */}
                        <td className="py-4 pr-4">
                          <div className="flex items-center space-x-2.5">
                            <span
                              className="w-4 h-4 rounded-full border border-borderCol shadow-xs shrink-0"
                              style={{ backgroundColor: row.colorHex }}
                            />
                            <div>
                              <div className="font-bold text-ink">{row.colorName}</div>
                              <div className="text-[10px] text-mutedGray">{row.colorHex}</div>
                            </div>
                          </div>
                        </td>

                        {/* Size cells */}
                        {matrix.availableSizes.map((size) => {
                          const variant = row.sizes[size];
                          if (!variant) {
                            return (
                              <td key={size} className="py-4 px-3 text-center text-mutedGray/50">
                                -
                              </td>
                            );
                          }

                          const currentStock = stockMap[variant.id] ?? variant.stock;
                          const isWarning = isLowStock(currentStock);

                          return (
                            <td key={size} className="py-4 px-3">
                              <div className="flex flex-col items-center space-y-1.5 bg-paper p-2 rounded-xl border border-borderCol/70">
                                <div className="flex items-center space-x-1 w-full justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="1000000"
                                    value={currentStock}
                                    onChange={(e) =>
                                      handleStockChange(variant.id, parseInt(e.target.value, 10))
                                    }
                                    className={`w-16 px-2 py-1 font-mono text-xs text-center border rounded-lg focus:outline-hidden focus:ring-1 ${
                                      isWarning
                                        ? 'border-red-500 bg-red-500/10 text-red-900 font-bold focus:ring-red-500'
                                        : 'border-borderCol bg-paper text-ink focus:ring-ink'
                                    }`}
                                  />
                                </div>

                                {/* Quick +/- Delta Adjusters */}
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjust(variant.id, -1)}
                                    title="ลด 1 ตัว"
                                    className="p-1 rounded bg-paper-dark hover:bg-borderCol text-mutedGray hover:text-ink transition-colors"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjust(variant.id, 10)}
                                    title="เพิ่ม 10 ตัว"
                                    className="px-1.5 py-0.5 rounded bg-warm/20 hover:bg-warm/40 text-[10px] font-bold text-ink transition-colors"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjust(variant.id, 50)}
                                    title="เพิ่ม 50 ตัว"
                                    className="px-1.5 py-0.5 rounded bg-warm/30 hover:bg-warm/50 text-[10px] font-bold text-ink transition-colors"
                                  >
                                    +50
                                  </button>
                                </div>

                                {isWarning && (
                                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-red-500/20 text-red-800 font-bold">
                                    Low &lt; {LOW_STOCK_THRESHOLD}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-4 flex items-center justify-between border-t border-borderCol/60">
                <Link
                  href={`/supplier/inventory?supplier=${encodeURIComponent(currentSupplierSlug)}`}
                  className="font-mono text-xs text-warm-dark hover:underline flex items-center gap-1"
                >
                  <span>เปิดหน้าระบบคลังสต็อกฉบับเต็ม (Full Matrix View)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleSaveStock}
                  disabled={isSavingStock || !hasStockChanges}
                  className="px-4 py-2 bg-ink hover:bg-ink-light disabled:opacity-40 disabled:cursor-not-allowed text-paper rounded-xl font-mono text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingStock ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงสต็อก'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-paper-light border border-borderCol rounded-xl font-mono text-xs text-mutedGray">
              ไม่พบข้อมูลเสื้อเปล่าในระบบสำหรับโรงงานนี้
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: BLUEPRINTS & RIP SPECS FOCUS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'blueprints' && (
        <div className="space-y-4">
          <div className="p-4 bg-paper-light border border-borderCol rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="font-sans font-bold text-base text-ink flex items-center gap-2">
                <Ruler className="w-4 h-4 text-warm-dark" />
                <span>พิมพ์เขียวดิจิทัล & ไฟล์ RIP สเปกการผลิต (3D RIP Production Blueprints)</span>
              </h2>
              <p className="font-mono text-xs text-mutedGray mt-0.5">
                ตรวจสอบพิกัด กว้าง x ยาว x จุดศูนย์กลางเป็นเซนติเมตร และดาวน์โหลดไฟล์ต้นฉบับ Master สำหรับแท่นพิมพ์ DTG
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-borderCol/60 pb-2">
                  <span className="font-mono text-xs font-bold text-ink">
                    JOB-{order.orderNumber}
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-warm/20 text-ink">
                    {order.status}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div
                    className="w-16 h-16 rounded-lg border border-borderCol flex items-center justify-center p-1"
                    style={{ backgroundColor: order.design?.garmentColorHex || '#131718' }}
                  >
                    {order.design?.previewFrontUrl ? (
                      <img
                        src={order.design.previewFrontUrl}
                        alt="Front"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Shirt className="w-6 h-6 text-white/80" />
                    )}
                  </div>
                  <div className="font-mono text-xs space-y-0.5 flex-1 min-w-0">
                    <div className="font-bold text-ink truncate">{order.design?.title || 'Custom Tee'}</div>
                    <div className="text-mutedGray text-[11px]">{order.design?.garmentProduct?.name || 'Apex Heavyweight Tee'}</div>
                    <div className="text-mutedGray text-[11px]">Size: {order.design?.garmentSize || 'L'} | Qty: {order.quantity}</div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-borderCol/40">
                  <button
                    type="button"
                    onClick={() => setSelectedBlueprintOrder(order)}
                    className="px-3 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-xs font-bold text-ink flex items-center gap-1.5 transition-colors"
                  >
                    <Ruler className="w-3.5 h-3.5 text-warm-dark" />
                    <span>เปิดพิมพ์เขียว (Blueprint)</span>
                  </button>

                  <a
                    href={`/api/orders/${order.id}/production`}
                    download={`JOB-${order.orderNumber}.json`}
                    className="px-3 py-1.5 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download RIP .json</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spec Inspection Modal */}
      {inspectPackage && (
        <div
          data-testid="spec-inspection-modal"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
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
                <span className="font-bold">{inspectPackage.garment?.blankSku}</span>
              </div>
              <div>
                <span className="text-mutedGray">Variant SKU:</span>{' '}
                <span className="font-bold">{inspectPackage.garment?.variantSku}</span>
              </div>
              <div>
                <span className="text-mutedGray">Color:</span>{' '}
                <span>{inspectPackage.garment?.colorName} ({inspectPackage.garment?.colorHex})</span>
              </div>
              <div>
                <span className="text-mutedGray">Size:</span>{' '}
                <span className="font-bold">{inspectPackage.garment?.size}</span>
              </div>
              <div>
                <span className="text-mutedGray">Print Platen:</span>{' '}
                <span>
                  {inspectPackage.printingTechnique?.maxPrintWidthCm} x {inspectPackage.printingTechnique?.maxPrintHeightCm} cm
                </span>
              </div>
              <div>
                <span className="text-mutedGray">Target Dispatch:</span>{' '}
                <span className="font-bold text-warm-dark">
                  {inspectPackage.targetShipDate ? new Date(inspectPackage.targetShipDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-xs uppercase font-bold text-ink">Surface Print Coordinates</h4>
              {inspectPackage.surfaces?.map((surf: any) => (
                <div key={surf.surface} className="border border-borderCol rounded-lg p-3 bg-paper space-y-2">
                  <div className="flex justify-between font-mono text-xs font-bold text-ink">
                    <span>{surf.surfaceName} ({surf.surface})</span>
                    <span>{surf.artworkCount} artwork(s)</span>
                  </div>
                  {surf.artworks?.map((art: any, idx: number) => (
                    <div key={idx} className="text-xs font-mono pl-2 border-l-2 border-warm space-y-0.5">
                      <div className="font-bold text-ink">{art.title} (by {art.creatorName})</div>
                      <div className="text-mutedGray">
                        Dimensions: {art.placement?.calculatedWidthCm} x {art.placement?.calculatedHeightCm} cm
                        (Center: X {art.placement?.xCenterCm}cm, Y {art.placement?.yCenterCm}cm)
                      </div>
                      <div className="text-[11px] text-mutedGray truncate">
                        Asset: <span className="text-warm-dark">{art.highResAssetUrl}</span>
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

      {/* Production Blueprint Sheet & Physical Ruler Guide Modal */}
      {selectedBlueprintOrder && (
        <ProductionBlueprintSheet
          isOpen={Boolean(selectedBlueprintOrder)}
          onClose={() => setSelectedBlueprintOrder(null)}
          orderNumber={selectedBlueprintOrder.orderNumber}
          garment={{
            sku: selectedBlueprintOrder.design?.garmentProduct?.sku || 'APX-HVY-001',
            name: selectedBlueprintOrder.design?.garmentProduct?.name || 'Apex Heavyweight Tee',
            colorHex: selectedBlueprintOrder.design?.garmentColorHex || '#131718',
            colorName: selectedBlueprintOrder.design?.garmentColorName,
            size: selectedBlueprintOrder.design?.garmentSize || 'L',
            fabric: selectedBlueprintOrder.design?.garmentProduct?.fabric,
          }}
          frontElements={(() => {
            try {
              return typeof selectedBlueprintOrder.design?.frontElements === 'string'
                ? JSON.parse(selectedBlueprintOrder.design.frontElements)
                : selectedBlueprintOrder.design?.frontElements || [];
            } catch {
              return [];
            }
          })()}
          backElements={(() => {
            try {
              return typeof selectedBlueprintOrder.design?.backElements === 'string'
                ? JSON.parse(selectedBlueprintOrder.design.backElements)
                : selectedBlueprintOrder.design?.backElements || [];
            } catch {
              return [];
            }
          })()}
          initialSurface="FRONT"
          frontSnapshotDataUrl={selectedBlueprintOrder.design?.previewFrontUrl}
          backSnapshotDataUrl={selectedBlueprintOrder.design?.previewBackUrl}
        />
      )}

      {/* Order Communication Chatbox Modal (when launched directly from a task card) */}
      {chattingOrder && (
        <OrderChatBox
          orderId={chattingOrder.id}
          orderNumber={chattingOrder.orderNumber}
          partnerName={chattingOrder.shippingName || 'ลูกค้า'}
          orderStatus={chattingOrder.status}
          currentUserRole="SUPPLIER"
          isOpen={true}
          onClose={() => setChattingOrder(null)}
        />
      )}

      {/* Supplier Review Cancellation Modal */}
      {reviewingOrder && (
        <div
          data-testid="review-cancellation-modal"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2 font-bold font-mono text-sm uppercase">
                {reviewApproved ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-800">อนุมัติการยกเลิกคำสั่งซื้อ (Approve Cancellation)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">ปฏิเสธคำขอยกเลิกคำสั่งซื้อ (Reject Cancellation)</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReviewingOrder(null)}
                className="p-1 text-mutedGray hover:text-ink rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-paper rounded-xl border border-borderCol font-mono text-xs space-y-1">
              <div className="flex justify-between text-mutedGray">
                <span>คำสั่งซื้อ (Order Number):</span>
                <span className="font-bold text-ink">#{reviewingOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-mutedGray">
                <span>ลูกค้า (Customer):</span>
                <span className="text-ink">{reviewingOrder.shippingName}</span>
              </div>
            </div>

            {reviewApproved ? (
              <p className="font-mono text-xs text-mutedGray leading-relaxed">
                คุณกำลังอนุมัติการยกเลิกออเดอร์ <strong>#{reviewingOrder.orderNumber}</strong> เนื่องจากยังไม่ได้นำเสื้อเข้าแท่นพิมพ์ DTG ระบบจะทำการ<strong>คืนเงิน 100% เต็มจำนวนให้ลูกค้าทันที</strong> พร้อมคืนสต็อกเสื้อเปล่าจำนวน {reviewingOrder.quantity} ตัวกลับเข้าคลังอัตโนมัติ
              </p>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <p className="text-mutedGray leading-relaxed">
                  เนื่องจากเสื้อได้เริ่มกระบวนการสกรีน (พ่นน้ำยารองพื้น / ฉีดพ่นหมึกพิมพ์) ไปแล้ว ทำให้เสื้อไม่สามารถนำกลับมาขายต่อได้ โปรดระบุเหตุผลในการปฏิเสธคำขอและแนบภาพถ่ายชิ้นงานเพื่อความโปร่งใส:
                </p>

                <div>
                  <label className="block text-[11px] uppercase text-mutedGray mb-1 font-bold">
                    เหตุผลในการปฏิเสธ (Rejection Reason)
                  </label>
                  <input
                    type="text"
                    data-testid="review-rejection-reason-input"
                    value={reviewRejectionReason}
                    onChange={(e) => setReviewRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none"
                    placeholder="เช่น สินค้าเริ่มฉีดพ่นหมึกพิมพ์ลายด้านหน้าเสร็จสิ้นแล้ว"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-mutedGray mb-1 font-bold">
                    URL ภาพถ่ายหลักฐานบนแท่นพิมพ์ (Proof Image URL - ถ้ามี)
                  </label>
                  <input
                    type="url"
                    data-testid="review-proof-url-input"
                    value={reviewProofUrl}
                    onChange={(e) => setReviewProofUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none"
                    placeholder="https://... หรือแนบลิงก์รูปภาพชิ้นงาน"
                  />
                </div>
              </div>
            )}

            {reviewError && (
              <div className="p-2 bg-red-100 text-red-800 text-xs font-mono rounded">
                {reviewError}
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleReviewCancellation}
                data-testid="confirm-review-cancellation-btn"
                className={`flex-1 py-2.5 text-paper rounded-lg font-mono text-xs uppercase font-bold transition-colors disabled:opacity-50 ${
                  reviewApproved
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmittingReview
                  ? 'กำลังประมวลผล...'
                  : reviewApproved
                  ? 'ยืนยันอนุมัติยกเลิก (คืนเงิน 100%)'
                  : 'ยืนยันปฏิเสธคำขอ (ดำเนินการพิมพ์ต่อ)'}
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => setReviewingOrder(null)}
                className="px-4 py-2.5 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Direct Cancel Modal */}
      {cancellingOrder && (
        <div
          data-testid="supplier-cancel-modal"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-paper-light border border-borderCol w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2 text-red-700 font-bold font-mono text-sm uppercase">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>ยกเลิกงานพิมพ์โดยโรงงานผู้ผลิต</span>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="p-1 text-mutedGray hover:text-ink rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="font-mono text-xs text-mutedGray leading-relaxed">
              การยกเลิกโดยโรงงานผู้ผลิตจะทำการ<strong>คืนเงินให้ลูกค้าเต็มจำนวน 100% ทันที</strong> และระบบจะบันทึกประวัติเพื่อการควบคุมคุณภาพการบริการ
            </p>

            <div>
              <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1 font-bold">
                สาเหตุที่ต้องยกเลิกงานพิมพ์
              </label>
              <select
                data-testid="supplier-cancel-reason-select"
                value={supplierCancelReason}
                onChange={(e) => setSupplierCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none"
              >
                <option value="เสื้อเปล่าหมดสต็อกชั่วคราว (Blank garment out of stock)">เสื้อเปล่าหมดสต็อกชั่วคราว (Blank garment out of stock)</option>
                <option value="เครื่องพิมพ์ขัดข้องกำลังซ่อมบำรุง (Printer malfunction)">เครื่องพิมพ์ขัดข้องกำลังซ่อมบำรุง (Printer malfunction)</option>
                <option value="ไฟล์ภาพอาร์ตเวิร์กไม่ผ่านมาตรฐานการพิมพ์ (Artwork file unsuitable)">ไฟล์ภาพอาร์ตเวิร์กไม่ผ่านมาตรฐานการพิมพ์ (Artwork file unsuitable)</option>
                <option value="โรงงานติดวันหยุดเทศกาลไม่สามารถผลิตตามกำหนดได้">โรงงานติดวันหยุดเทศกาลไม่สามารถผลิตตามกำหนดได้</option>
              </select>
            </div>

            {supplierCancelError && (
              <div className="p-2 bg-red-100 text-red-800 text-xs font-mono rounded">
                {supplierCancelError}
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingSupplierCancel}
                onClick={handleSupplierCancelOrder}
                data-testid="confirm-supplier-cancel-btn"
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-paper rounded-lg font-mono text-xs uppercase font-bold transition-colors disabled:opacity-50"
              >
                {isSubmittingSupplierCancel ? 'กำลังประมวลผล...' : 'ยืนยันยกเลิกงานพิมพ์ (คืนเงินลูกค้า)'}
              </button>
              <button
                type="button"
                disabled={isSubmittingSupplierCancel}
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2.5 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboardClient;
