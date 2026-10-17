'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  Package,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Coins,
  ChevronRight,
  ChevronLeft,
  Building2,
  User,
  Hash,
  Download,
  X,
} from 'lucide-react';
import {
  CreatorLedgerSummary,
  RoyaltyLedgerEntryDetails,
} from '@/lib/types';
import {
  WithholdingTaxCalculation,
  FiftyTawiSummary,
  calculateWithholdingTax,
  generate50TawiSummary,
  MIN_PAYOUT_THRESHOLD_THB,
} from '@/lib/creatorJournal';
import { CreatorOnboardingModal } from './CreatorOnboardingModal';

export interface CreatorOption {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  payoutDetails: string | null;
}

export interface CreatorJournalClientProps {
  initialSummary: CreatorLedgerSummary;
  initialEntries: RoyaltyLedgerEntryDetails[];
  initialTax: WithholdingTaxCalculation;
  initialTaxSlip: FiftyTawiSummary;
  allCreators: CreatorOption[];
  currentSlug: string;
  needsOnboarding?: boolean;
  initialUser?: { id?: string; name?: string | null; email?: string | null } | null;
}

export const CreatorJournalClient: React.FC<CreatorJournalClientProps> = ({
  initialSummary,
  initialEntries,
  initialTax,
  initialTaxSlip,
  allCreators,
  currentSlug,
  needsOnboarding,
  initialUser,
}) => {
  const router = useRouter();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(Boolean(needsOnboarding));

  // State
  const [summary, setSummary] = useState<CreatorLedgerSummary>(initialSummary);
  const [entries, setEntries] = useState<RoyaltyLedgerEntryDetails[]>(initialEntries);
  const [tax, setTax] = useState<WithholdingTaxCalculation>(initialTax);
  const [taxSlip, setTaxSlip] = useState<FiftyTawiSummary>(initialTaxSlip);
  const [filterType, setFilterType] = useState<'ALL' | 'EARNING' | 'PAYOUT_SETTLEMENT'>('ALL');

  // Modals & Forms
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isTaxSlipModalOpen, setIsTaxSlipModalOpen] = useState(false);
  const [payoutTargetInput, setPayoutTargetInput] = useState(
    initialSummary?.payoutDetails || ''
  );
  const [payoutNotesInput, setPayoutNotesInput] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // Synchronize state when props update
  useEffect(() => {
    setSummary(initialSummary);
    setEntries(initialEntries);
    setTax(initialTax);
    setTaxSlip(initialTaxSlip);
    setPayoutTargetInput(initialSummary?.payoutDetails || '');
    setSettlementError(null);
    setSettlementSuccess(null);
  }, [initialSummary, initialEntries, initialTax, initialTaxSlip]);

  // Accessibility: dismiss modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettleModalOpen(false);
        setIsTaxSlipModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentCreator =
    allCreators.find((c) => c.slug === currentSlug || c.id === currentSlug) ||
    allCreators[0];

  const formatDate = (val: string | Date | undefined | null) => {
    if (!val) return '---';
    const d = new Date(val);
    return isNaN(d.getTime())
      ? '---'
      : d.toLocaleString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const handleCreatorChange = (newSlug: string) => {
    router.push(`/creator/journal?creator=${encodeURIComponent(newSlug)}`);
  };

  // Execute settlement payout
  const handleExecuteSettlement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!summary || (summary.currentBalance ?? 0) < MIN_PAYOUT_THRESHOLD_THB) return;

    setIsSettling(true);
    setSettlementError(null);
    setSettlementSuccess(null);

    const payoutRef = (
      payoutTargetInput.trim() || summary.payoutDetails || 'PromptPay Default'
    ).slice(0, 100);
    const notes = (
      payoutNotesInput.trim() || `Instant creator settlement requested via Creator Journal`
    ).slice(0, 500);

    try {
      const res = await fetch('/api/royalties/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: summary.creatorId,
          payoutReference: payoutRef,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to process settlement.');
      }

      const st = data.settlement;

      // Real-time double-entry append without page reload
      const newEntry: RoyaltyLedgerEntryDetails = {
        id: st.ledgerEntryId,
        creatorId: st.creatorId,
        obligationId: null,
        entryType: 'PAYOUT_SETTLEMENT',
        amount: -st.totalAmount,
        balanceAfter: st.balanceAfter,
        reference: st.settlementNumber,
        notes: `Payout settlement ${st.settlementNumber} (${st.totalAmount} THB) [Ref: ${payoutRef}]`,
        createdAt: st.settledAt ? new Date(st.settledAt) : new Date(),
        obligation: null,
      };

      setEntries((prev) => [newEntry, ...prev]);

      // Update summary state in place
      const updatedBalance = st.balanceAfter;
      const updatedTotalSettled = (summary.totalSettled ?? 0) + st.totalAmount;
      const updatedSummary: CreatorLedgerSummary = {
        ...summary,
        currentBalance: updatedBalance,
        totalSettled: updatedTotalSettled,
        payoutDetails: payoutRef,
        eligibleObligations: { count: 0, totalAmount: 0 },
        settledObligations: {
          count: (summary?.settledObligations?.count ?? 0) + (st.settledObligationsCount ?? 0),
          totalAmount: (summary?.settledObligations?.totalAmount ?? 0) + (st.totalAmount ?? 0),
        },
      };

      setSummary(updatedSummary);
      setPayoutTargetInput(payoutRef);

      // Recompute tax slip and WHT
      const updatedTax = calculateWithholdingTax(updatedSummary.lifetimeEarnings);
      setTax(updatedTax);
      setTaxSlip(
        generate50TawiSummary(
          {
            id: updatedSummary.creatorId,
            displayName: updatedSummary.displayName,
            slug: updatedSummary.slug,
            payoutDetails: updatedSummary.payoutDetails || payoutRef,
          },
          updatedSummary.lifetimeEarnings
        )
      );

      setSettlementSuccess(
        `โอนเงินสำเร็จ! ออกเลขอ้างอิง ${st.settlementNumber} ยอดเงิน ฿${st.totalAmount.toLocaleString()} THB ไปยัง ${payoutRef}`
      );
      setIsSettleModalOpen(false);
      setPayoutNotesInput('');
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

  // Calculate settlement tax preview for the modal
  const maxWithdrawable =
    summary?.eligibleObligations && summary.eligibleObligations.totalAmount > 0
      ? Math.min(summary.currentBalance ?? 0, summary.eligibleObligations.totalAmount)
      : summary?.currentBalance ?? 0;
  const settleAmount = maxWithdrawable;
  const settleTax = calculateWithholdingTax(settleAmount);

  // When 50 Tawi modal is open, hide non-modal content in print; otherwise allow clean journal report printing
  const hideForModalPrint = isTaxSlipModalOpen ? 'print:hidden' : '';

  return (
    <div data-testid="creator-journal-page" className="w-full space-y-6 print:space-y-0 print:p-0">
      {/* Navigation Breadcrumb back to Creator Dashboard */}
      <div className={`flex items-center justify-between pb-1 ${hideForModalPrint}`}>
        <Link
          href={`/creator/dashboard?creator=${encodeURIComponent(summary?.slug || currentSlug)}`}
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-mutedGray hover:text-ink transition-colors print:hidden group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>แดชบอร์ดศิลปิน (Back to Creator Dashboard)</span>
        </Link>
      </div>

      {/* Top Banner: Profile Header & Switcher */}
      <div className={`bg-paper-dark/30 border border-borderCol rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm ${hideForModalPrint}`}>
        <div className="flex items-center space-x-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              summary?.avatarUrl ||
              currentCreator?.avatarUrl ||
              'https://api.dicebear.com/8.x/bottts/svg?seed=creator'
            }
            alt={summary?.displayName || currentCreator?.displayName || 'Creator'}
            className="w-16 h-16 rounded-full border-2 border-borderCol bg-paper-dark object-cover shadow-sm"
          />
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] tracking-widest uppercase bg-ink text-paper px-2 py-0.5 rounded font-bold">
                CREATOR JOURNAL
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/50">
                VERIFIED PARTNER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink uppercase">
              {summary?.displayName || currentCreator?.displayName || 'Creator'}
            </h1>
            <p className="font-mono text-xs text-mutedGray">
              แฮนเดิล: @{summary?.slug || currentCreator?.slug || 'creator'} &bull; บัญชีรับเงิน:{' '}
              <span className="text-ink font-medium">
                {summary?.payoutDetails || currentCreator?.payoutDetails || 'PromptPay Default'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls & Creator Switcher */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {allCreators.length > 1 && (
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-mutedGray hidden sm:inline">สลับศิลปิน:</span>
              <select
                aria-label="เลือกศิลปิน"
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
          )}

          <button
            type="button"
            data-testid="open-50tawi-modal-btn"
            onClick={() => setIsTaxSlipModalOpen(true)}
            className="px-3.5 py-2 bg-paper hover:bg-paper-dark border border-borderCol text-ink font-mono text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4 text-warm-dark" />
            <span>ใบ 50 ทวิ (Digital Tax Slip)</span>
          </button>

          <button
            type="button"
            data-testid="settle-payout-btn"
            disabled={(summary?.currentBalance ?? 0) < MIN_PAYOUT_THRESHOLD_THB || isSettling}
            onClick={() => setIsSettleModalOpen(true)}
            className="px-4 py-2 bg-ink hover:bg-ink-light disabled:bg-mutedGray/50 disabled:cursor-not-allowed text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Wallet className="w-4 h-4 text-warm" />
            <span>เบิกจ่ายเงิน (Settle Payout)</span>
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {settlementSuccess && (
        <div
          data-testid="settlement-success-banner"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-800 animate-in fade-in print:hidden"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{settlementSuccess}</span>
          </div>
          <button
            onClick={() => setSettlementSuccess(null)}
            className="text-emerald-700 font-bold hover:underline"
          >
            ปิด
          </button>
        </div>
      )}

      {settlementError && (
        <div
          data-testid="settlement-error-banner"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-mono text-rose-800 animate-in fade-in print:hidden"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{settlementError}</span>
          </div>
          <button
            onClick={() => setSettlementError(null)}
            className="text-rose-700 font-bold hover:underline"
          >
            ปิด
          </button>
        </div>
      )}

      {/* 4 Financial & Tax Metric Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${hideForModalPrint}`}>
        {/* Metric 1: Available Balance */}
        <div className="p-5 bg-paper-light border-2 border-warm rounded-xl shadow-sm space-y-2 bg-gradient-to-br from-paper-light to-warm/15">
          <div className="flex items-center justify-between text-ink">
            <span className="font-mono text-xs uppercase tracking-wider font-bold">
              ยอดเงินคงเหลือพร้อมเบิก
            </span>
            <span className="font-mono text-[10px] bg-emerald-600 text-paper font-bold px-1.5 py-0.5 rounded">
              WITHDRAWABLE
            </span>
          </div>
          <div
            data-testid="metric-current-balance"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
            ฿{(summary?.currentBalance ?? 0).toLocaleString()}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">
            ขั้นต่ำในการเบิกจ่าย ฿{MIN_PAYOUT_THRESHOLD_THB} THB (Available Now)
          </p>
        </div>

        {/* Metric 2: Gross Lifetime Earnings */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">
              รายได้รวมตลอดชีพ (Gross)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            data-testid="metric-gross-earnings"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
            ฿{(summary?.lifetimeEarnings ?? 0).toLocaleString()}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">
            ยอดจำหน่ายผลงานลิขสิทธิ์รวม {summary?.salesVolume ?? 0} ชิ้น
          </p>
        </div>

        {/* Metric 3: Withholding Tax 3% */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">
              ภาษีหัก ณ ที่จ่าย 3% (WHT)
            </span>
            <Receipt className="w-4 h-4 text-warm-dark" />
          </div>
          <div
            data-testid="metric-wht-amount"
            className="text-3xl font-black font-mono text-amber-700 tracking-tight"
          >
            {(tax?.taxAmount ?? 0) > 0 ? `-฿${(tax?.taxAmount ?? 0).toLocaleString()}` : '฿0'}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <p className="font-mono text-[11px] text-mutedGray">
              อัตราภาษี 3% (มาตรา 50 ทวิ)
            </p>
            <button
              onClick={() => setIsTaxSlipModalOpen(true)}
              className="text-[11px] font-mono text-ink underline font-bold hover:text-warm-dark"
            >
              ดูใบ 50 ทวิ
            </button>
          </div>
        </div>

        {/* Metric 4: Net Cumulative / Settled Payouts */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">
              ยอดเบิกจ่ายสำเร็จแล้ว
            </span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div
            data-testid="metric-settled-payouts"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
            ฿{(summary?.totalSettled ?? 0).toLocaleString()}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">
            โอนผ่าน PromptPay / ธนาคาร ({summary?.settledObligations?.count ?? 0} รายการ)
          </p>
        </div>
      </div>

      {/* Double-Entry Royalty Ledger Table */}
      <div className={`bg-paper-light border border-borderCol rounded-2xl overflow-hidden shadow-sm ${hideForModalPrint}`}>
        <div className="p-5 border-b border-borderCol flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold font-sans text-ink uppercase tracking-tight">
                สมุดบัญชีแยกประเภทค่าลิขสิทธิ์ (Double-Entry Royalty Ledger)
              </h2>
            </div>
            <p className="font-mono text-xs text-mutedGray mt-0.5">
              ระบบบันทึกบัญชีคู่แบบ Append-Only ตรวจสอบยอดคงเหลือวิ่ง (Running Balance) ได้แบบเรียลไทม์
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 bg-paper p-1 rounded-lg border border-borderCol">
            <button
              type="button"
              data-testid="filter-all"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                filterType === 'ALL'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-mutedGray hover:text-ink'
              }`}
            >
              ทั้งหมด ({entries.length})
            </button>
            <button
              type="button"
              data-testid="filter-earnings"
              onClick={() => setFilterType('EARNING')}
              className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                filterType === 'EARNING'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-mutedGray hover:text-ink'
              }`}
            >
              รายได้ (Earnings)
            </button>
            <button
              type="button"
              data-testid="filter-payouts"
              onClick={() => setFilterType('PAYOUT_SETTLEMENT')}
              className={`px-3 py-1 font-mono text-xs rounded transition-colors ${
                filterType === 'PAYOUT_SETTLEMENT'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-mutedGray hover:text-ink'
              }`}
            >
              การเบิกจ่าย (Payouts)
            </button>
          </div>
        </div>

        {/* Ledger Table Feed */}
        <div className="overflow-x-auto">
          <table
            data-testid="creator-ledger-table"
            className="w-full text-left text-xs font-mono"
          >
            <thead className="bg-paper border-b border-borderCol text-mutedGray uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">วัน-เวลา (Timestamp)</th>
                <th className="py-3 px-4 font-semibold">ประเภท (Type)</th>
                <th className="py-3 px-4 font-semibold">เลขอ้างอิง (Reference)</th>
                <th className="py-3 px-4 font-semibold">ผลงาน / คำอธิบาย (Artwork & Note)</th>
                <th className="py-3 px-4 font-semibold text-right">จำนวนเงิน (Amount)</th>
                <th className="py-3 px-4 font-semibold text-right">ยอดคงเหลือ (Balance)</th>
                <th className="py-3 px-4 font-semibold text-center">สถานะตรวจสอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCol/60">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-mutedGray">
                    ยังไม่มีรายการในสมุดบัญชีตามตัวกรองที่เลือก
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-paper/50 transition-colors"
                      data-testid={`ledger-row-${entry.id}`}
                    >
                      <td
                        className="py-3 px-4 text-mutedGray whitespace-nowrap"
                        suppressHydrationWarning
                      >
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.entryType === 'EARNING' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            EARNING
                          </span>
                        ) : entry.entryType === 'ADJUSTMENT' ? (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                            ADJUSTMENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                            {entry.entryType || 'PAYOUT_SETTLEMENT'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                        {entry.reference || '---'}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-ink">
                        {entry.obligation?.artwork ? (
                          <div className="flex items-center space-x-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={entry.obligation.artwork.previewUrl}
                              alt={entry.obligation.artwork.title}
                              className="w-6 h-6 rounded border border-borderCol object-cover bg-paper flex-shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-semibold block truncate">
                                {entry.obligation.artwork.title}
                              </span>
                              <span className="text-[10px] text-mutedGray block">
                                ออเดอร์: {entry.obligation.orderId} ({entry.obligation.quantity} ชิ้น @ ฿{entry.obligation.unitRoyalty})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-mutedGray truncate block">
                            {entry.notes || 'การทำรายการในสมุดบัญชี'}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                          entry.amount > 0
                            ? 'text-emerald-700'
                            : entry.amount < 0
                            ? 'text-rose-700'
                            : 'text-mutedGray'
                        }`}
                      >
                        {entry.amount > 0
                          ? `+฿${entry.amount.toLocaleString()}`
                          : entry.amount < 0
                          ? `-฿${Math.abs(entry.amount).toLocaleString()}`
                          : '฿0'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-ink whitespace-nowrap">
                        ฿{Number.isFinite(entry.balanceAfter) ? entry.balanceAfter.toLocaleString() : '0'}
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

      {/* Payout Settlement Modal */}
      {isSettleModalOpen && (
        <div
          data-testid="modal-settle"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settle-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSettleModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in print:hidden"
        >
          <div className="bg-paper border border-borderCol rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-warm-dark" />
                <h3 id="settle-modal-title" className="font-sans font-bold text-base text-ink">
                  ขอรับเงินโอนค่าลิขสิทธิ์ (Payout Settlement)
                </h3>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-mutedGray hover:text-ink font-mono text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSettlement} className="space-y-4">
              <div className="p-4 bg-paper-dark/40 rounded-xl border border-borderCol space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-mutedGray">ศิลปินผู้รับเงิน:</span>
                  <span className="font-bold text-ink">{summary?.displayName || 'Creator'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mutedGray">ยอดเงินที่ขอเบิก:</span>
                  <span className="font-black text-ink text-sm">
                    ฿{settleAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between border-t border-borderCol/60 pt-1.5">
                  <span className="text-mutedGray">ประมาณการภาษีหัก ณ ที่จ่าย (3%):</span>
                  <span className="text-amber-700 font-bold">
                    -฿{settleTax.taxAmount.toLocaleString()} THB
                  </span>
                </div>
                <div className="flex justify-between border-t border-borderCol/60 pt-1.5">
                  <span className="text-mutedGray font-bold">ยอดโอนสุทธิที่ได้รับ:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    ฿{settleTax.netAmount.toLocaleString()} THB
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-mutedGray mb-1">
                  ช่องทางรับเงิน (PromptPay ID / บัญชีธนาคาร)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  disabled={isSettling}
                  data-testid="payout-target-input"
                  placeholder="เช่น PromptPay: 081-998-7711 หรือ ธ.กสิกรไทย 123-4-56789-0"
                  value={payoutTargetInput}
                  onChange={(e) => setPayoutTargetInput(e.target.value)}
                  className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-mutedGray mb-1">
                  หมายเหตุ / เลขอ้างอิงเพิ่มเติม (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  disabled={isSettling}
                  placeholder="เช่น เบิกจ่ายรอบประจำเดือน"
                  value={payoutNotesInput}
                  onChange={(e) => setPayoutNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm disabled:opacity-50"
                />
              </div>

              <p className="text-[11px] font-mono text-mutedGray leading-relaxed">
                เมื่อยืนยัน ระบบจะตัดยอด ฿{settleAmount.toLocaleString()} จากสมุดบัญชีของคุณโดยอัตโนมัติ
                และเปลี่ยนสถานะภาระผูกพันเป็น SETTLED พร้อมสร้างเลขอ้างอิงการจ่ายแบบตรวจสอบได้
              </p>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="flex-1 py-2.5 border border-borderCol rounded-lg font-mono text-xs font-semibold text-mutedGray hover:text-ink transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSettling || settleAmount < MIN_PAYOUT_THRESHOLD_THB}
                  data-testid="confirm-settlement-btn"
                  className="flex-1 py-2.5 bg-ink hover:bg-ink-light disabled:bg-mutedGray/50 disabled:cursor-not-allowed text-paper rounded-lg font-mono text-xs font-bold uppercase transition-colors shadow-sm flex items-center justify-center space-x-1.5"
                >
                  {isSettling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังดำเนินการ...</span>
                    </>
                  ) : (
                    <span>ยืนยันการเบิกจ่าย</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 50 Tawi Digital Tax Slip Modal */}
      {isTaxSlipModalOpen && (
        <div
          data-testid="modal-50tawi"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tax-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTaxSlipModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:overflow-visible print:z-auto print:block"
        >
          <div className="bg-paper border border-borderCol rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 print:border-none print:shadow-none print:max-w-none print:w-full print:p-0 print:m-0 print:bg-white print:text-black print:space-y-4">
            <div className="flex justify-between items-start border-b border-borderCol pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 font-mono text-[10px] bg-warm/30 text-ink px-2 py-0.5 rounded border border-warm/50 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>หนังสือรับรองการหักภาษี ณ ที่จ่าย</span>
                </div>
                <h2 id="tax-modal-title" className="text-xl font-black text-ink uppercase">
                  {taxSlip.formName}
                </h2>
                <p className="font-mono text-xs text-mutedGray">
                  ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร (Thai Revenue Department Form 50 Tawi)
                </p>
              </div>
              <button
                onClick={() => setIsTaxSlipModalOpen(false)}
                className="text-mutedGray hover:text-ink p-1 rounded-lg print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payer and Payee Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
              {/* Payer */}
              <div className="bg-paper-dark/30 p-4 rounded-xl border border-borderCol/80 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-ink">
                  <Building2 className="w-4 h-4 text-warm-dark" />
                  <span>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (Payer):</span>
                </div>
                <div className="space-y-1 text-mutedGray text-[11px]">
                  <p className="font-bold text-ink">{taxSlip.payer.companyNameTh}</p>
                  <p>{taxSlip.payer.companyNameEn}</p>
                  <p>เลขประจำตัวผู้เสียภาษี: <span className="text-ink font-bold">{taxSlip.payer.taxId}</span></p>
                  <p className="leading-relaxed">{taxSlip.payer.address}</p>
                </div>
              </div>

              {/* Payee */}
              <div className="bg-paper-dark/30 p-4 rounded-xl border border-borderCol/80 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-ink">
                  <User className="w-4 h-4 text-warm-dark" />
                  <span>ผู้ถูกหักภาษี ณ ที่จ่าย (Payee / Creator):</span>
                </div>
                <div className="space-y-1 text-mutedGray text-[11px]">
                  <p className="font-bold text-ink">{taxSlip.payee.displayName}</p>
                  <p>แฮนเดิล: @{taxSlip.payee.slug}</p>
                  <p>รหัสอ้างอิงภาษี / บัญชี: <span className="text-ink font-bold">{taxSlip.payee.taxOrPayoutId}</span></p>
                  <p>ประเภท: ศิลปินพาร์ทเนอร์อิสระ (Verified Creator)</p>
                </div>
              </div>
            </div>

            {/* Tax Computation Table */}
            <div className="border border-borderCol rounded-xl overflow-x-auto font-mono text-xs print:border-black">
              <table className="w-full text-left">
                <thead className="bg-paper-dark/50 border-b border-borderCol text-mutedGray text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">ประเภทเงินได้พึงประเมิน</th>
                    <th className="py-2.5 px-3">ปีภาษี</th>
                    <th className="py-2.5 px-3 text-right">จำนวนเงินได้ (Gross)</th>
                    <th className="py-2.5 px-3 text-center">อัตราภาษี</th>
                    <th className="py-2.5 px-3 text-right">ภาษีที่หัก (WHT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol/60">
                  <tr>
                    <td className="py-3 px-3">
                      <p className="font-bold text-ink">{taxSlip.incomeCategory.section}</p>
                      <p className="text-[10px] text-mutedGray">{taxSlip.incomeCategory.description}</p>
                    </td>
                    <td className="py-3 px-3 text-mutedGray">{taxSlip.incomeCategory.taxYear}</td>
                    <td className="py-3 px-3 text-right font-bold text-ink">
                      ฿{tax.grossAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-ink">3%</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      ฿{tax.taxAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-paper-dark/30 font-bold border-t border-borderCol">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right text-mutedGray">
                      จำนวนเงินจ่ายสุทธิหลังหักภาษี (Net Cumulative):
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 text-sm">
                      ฿{tax.netAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cryptographic Digest & Certification */}
            <div className="bg-paper-dark/20 p-4 rounded-xl border border-borderCol/70 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-mutedGray">สถานะเอกสาร:</span>
                <span className="text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>รับรองความถูกต้องครบถ้วนสมบูรณ์ (VERIFIED)</span>
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-mutedGray">รหัสตรวจสอบความถูกต้องดิจิทัล (Ledger Digest):</span>
                <span className="text-ink font-bold text-[11px] select-all break-all">
                  {taxSlip.auditDigest}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-mutedGray border-t border-borderCol/60 pt-2">
                <span suppressHydrationWarning>วันที่ออกเอกสาร: {formatDate(taxSlip.issuedAt)}</span>
                <span>ape-parel Authoritative Royalty & Tax Engine</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-paper hover:bg-paper-dark border border-borderCol text-ink rounded-lg font-mono text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4 text-warm-dark" />
                <span>พิมพ์เอกสาร (Print Slip)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTaxSlipModalOpen(false)}
                className="px-5 py-2 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold uppercase transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatorOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialUser={initialUser}
      />
    </div>
  );
};

export default CreatorJournalClient;
