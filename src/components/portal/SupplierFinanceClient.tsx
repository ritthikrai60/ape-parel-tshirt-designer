'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Landmark,
  Smartphone,
  ShieldCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { SupplierNav } from '@/components/portal/SupplierNav';
import {
  SupplierFinancialSummary,
  SUPPLIER_TERMINOLOGY,
} from '@/lib/supplier';

export interface SupplierFinanceClientProps {
  suppliers: Array<{
    id: string;
    slug: string;
    companyName: string;
    location: string;
    leadTimeDays: number;
  }>;
  currentSupplierSlug: string;
  initialSummary: SupplierFinancialSummary;
  needsOnboarding?: boolean;
}

export const SupplierFinanceClient: React.FC<SupplierFinanceClientProps> = ({
  suppliers,
  currentSupplierSlug,
  initialSummary,
  needsOnboarding,
}) => {
  const router = useRouter();
  const [summary, setSummary] = useState<SupplierFinancialSummary>(initialSummary);

  // Synchronize summary when facility prop changes
  useEffect(() => {
    setSummary(initialSummary);
  }, [currentSupplierSlug, initialSummary]);

  // Payout Form States
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutMethod, setPayoutMethod] = useState<'PROMPTPAY' | 'BANK_TRANSFER'>(
    'PROMPTPAY'
  );
  const [recipientId, setRecipientId] = useState<string>('');
  const [bankName, setBankName] = useState<string>('Kasikornbank (KBank)');
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSetMax = () => {
    setPayoutAmount(summary.withdrawableBalance);
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validAmount = Math.floor(payoutAmount);
    if (validAmount <= 0) {
      setErrorMessage('Payout amount must be greater than 0 THB');
      return;
    }

    if (validAmount > summary.withdrawableBalance) {
      setErrorMessage(
        `Insufficient balance. Maximum withdrawable amount is ฿${summary.withdrawableBalance.toLocaleString()} THB`
      );
      return;
    }

    if (!recipientId.trim()) {
      setErrorMessage(
        payoutMethod === 'PROMPTPAY'
          ? 'Please enter your PromptPay phone number or Citizen ID'
          : 'Please enter your Thai bank account number'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/supplier/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: currentSupplierSlug,
          amount: validAmount,
          method: payoutMethod,
          recipientId: recipientId.trim(),
          bankName: payoutMethod === 'BANK_TRANSFER' ? bankName : undefined,
          notes: payoutNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payout request failed');
      }

      // Optimistically update summary
      setSummary((prev) => ({
        ...prev,
        withdrawableBalance: data.payout.balanceAfter,
        totalSettledPayouts: prev.totalSettledPayouts + validAmount,
        transactions: [
          {
            id: `payout-${Date.now()}`,
            type: 'PAYOUT',
            reference: data.payout.payoutReference,
            amount: -validAmount,
            balanceAfter: data.payout.balanceAfter,
            description: `Settlement via ${payoutMethod} (${recipientId.trim()})`,
            createdAt: new Date().toISOString(),
          },
          ...prev.transactions,
        ],
      }));

      setSuccessMessage(
        `Payout request of ฿${validAmount.toLocaleString()} THB (Ref: ${data.payout.payoutReference}) submitted successfully.`
      );
      setPayoutAmount(0);
      setRecipientId('');
      setPayoutNotes('');
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error processing payout settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      <SupplierNav
        currentSupplierSlug={currentSupplierSlug}
        suppliers={suppliers}
        needsOnboarding={needsOnboarding}
      />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper-light border border-borderCol p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold font-sans text-ink">
              Supplier Revenue Ledger & Settlement Payouts
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-warm/20 text-ink font-semibold">
              ระบบบัญชี & ถอนเงิน
            </span>
          </div>
          <p className="font-mono text-xs text-mutedGray">
            Transparent double-entry revenue accounting with real-time balance tracking and direct Thai PromptPay / Bank settlements.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-mono text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* Withdrawable Balance */}
        <div className="p-5 bg-ink text-paper rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-paper/70">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Withdrawable Balance (ยอดถอนได้)
            </span>
            <Wallet className="w-4 h-4 text-warm" />
          </div>
          <div className="text-3xl font-black text-warm tracking-tight">
            ฿{summary.withdrawableBalance.toLocaleString()} THB
          </div>
          <div className="text-[10px] text-paper/60 pt-1 border-t border-ink-muted">
            Available for instant PromptPay payout
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Lifetime Earnings (รายรับรวม)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-black text-ink tracking-tight">
            ฿{summary.lifetimeEarnings.toLocaleString()} THB
          </div>
          <div className="text-[10px] text-mutedGray pt-1 border-t border-borderCol/60">
            Garment + DTG Print + Packaging
          </div>
        </div>

        {/* Settled Payouts */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Settled Payouts (ยอดถอนแล้ว)
            </span>
            <Receipt className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-3xl font-black text-ink tracking-tight">
            ฿{summary.totalSettledPayouts.toLocaleString()} THB
          </div>
          <div className="text-[10px] text-mutedGray pt-1 border-t border-borderCol/60">
            Total completed settlement withdrawals
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Production Jobs (คำสั่งผลิต)
            </span>
            <Sparkles className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-3xl font-black text-ink tracking-tight">
            {summary.ordersCount} Jobs
          </div>
          <div className="text-[10px] text-mutedGray pt-1 border-t border-borderCol/60">
            Active and fulfilled production orders
          </div>
        </div>
      </div>

      {/* Transparent Revenue Formula Breakdown Banner */}
      <div className="p-5 bg-paper-light border border-borderCol rounded-2xl space-y-3 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-warm-dark" />
          <h3 className="font-sans font-bold text-sm text-ink">
            {SUPPLIER_TERMINOLOGY.TRANSPARENT_COST_SYSTEM}
          </h3>
        </div>
        <p className="text-mutedGray text-[11px] leading-relaxed">
          Every order processed directly credits your supplier financial ledger according to transparent natural production costs:
        </p>
        <div className="p-3 bg-paper rounded-xl border border-borderCol/60 flex flex-wrap items-center gap-2 font-bold text-ink">
          <span className="px-2 py-1 rounded bg-warm/20 text-ink">Supplier Earning</span>
          <span>=</span>
          <span className="px-2 py-1 rounded bg-paper-dark">{SUPPLIER_TERMINOLOGY.BLANK_GARMENT_PRICE}</span>
          <span>+</span>
          <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
            {SUPPLIER_TERMINOLOGY.DTG_PRINTING_COST}
          </span>
          <span>+</span>
          <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
            {SUPPLIER_TERMINOLOGY.ECO_PACKAGING_FEE}
          </span>
        </div>
      </div>

      {/* Grid: Payout Request Form & Transaction History Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Payout Request Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-borderCol/60 pb-3">
              <h3 className="font-sans font-bold text-base text-ink flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-warm-dark" />
                <span>Request Payout Settlement</span>
              </h3>
              <p className="font-mono text-[11px] text-mutedGray mt-0.5">
                Withdraw your earnings directly via PromptPay or Thai Bank Account.
              </p>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-4 font-mono text-xs">
              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-ink">Payout Amount (THB):</label>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[11px] font-bold text-warm-dark hover:underline"
                  >
                    Withdraw All (฿{summary.withdrawableBalance.toLocaleString()})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-mutedGray">฿</span>
                  <input
                    type="number"
                    min="1"
                    max={summary.withdrawableBalance}
                    required
                    value={payoutAmount || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPayoutAmount(Number.isFinite(v) ? Math.max(0, v) : 0);
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-bold text-base focus:outline-none focus:border-warm"
                  />
                </div>
              </div>

              {/* Method Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">Settlement Channel:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('PROMPTPAY')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                      payoutMethod === 'PROMPTPAY'
                        ? 'bg-ink text-paper border-ink font-bold shadow-xs'
                        : 'bg-paper text-mutedGray border-borderCol hover:text-ink'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>PromptPay</span>
                    <span className="text-[9px] opacity-70">Phone / Citizen ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                      payoutMethod === 'BANK_TRANSFER'
                        ? 'bg-ink text-paper border-ink font-bold shadow-xs'
                        : 'bg-paper text-mutedGray border-borderCol hover:text-ink'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Thai Bank</span>
                    <span className="text-[9px] opacity-70">Direct Transfer</span>
                  </button>
                </div>
              </div>

              {/* Conditional Bank Selector */}
              {payoutMethod === 'BANK_TRANSFER' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-ink">Receiving Bank:</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-mono focus:outline-none focus:border-warm"
                  >
                    <option value="Kasikornbank (KBank)">Kasikornbank (KBank)</option>
                    <option value="Siam Commercial Bank (SCB)">Siam Commercial Bank (SCB)</option>
                    <option value="Bangkok Bank (BBL)">Bangkok Bank (BBL)</option>
                    <option value="Krungthai Bank (KTB)">Krungthai Bank (KTB)</option>
                    <option value="Bank of Ayudhya (Krungsri)">Bank of Ayudhya (Krungsri)</option>
                  </select>
                </div>
              )}

              {/* Account Number / PromptPay ID */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">
                  {payoutMethod === 'PROMPTPAY'
                    ? 'PromptPay Identifier (Phone or Citizen ID):'
                    : 'Bank Account Number:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    payoutMethod === 'PROMPTPAY'
                      ? 'e.g. 081-992-4411 or 1-1002-00334-55-1'
                      : 'e.g. 045-2-88123-9'
                  }
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-mono focus:outline-none focus:border-warm"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">Transfer Reference Note (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Production Settlement"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-borderCol rounded-xl text-ink font-mono focus:outline-none focus:border-warm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || summary.withdrawableBalance <= 0}
                className="w-full py-3 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs font-bold transition-all shadow-sm disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Processing Payout...</span>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 text-warm" />
                    <span>Submit Payout Request &rarr;</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Double-Entry Transaction Ledger Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol/60 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-warm-dark" />
                <h3 className="font-sans font-bold text-base text-ink">
                  Transaction History & Double-Entry Ledger
                </h3>
              </div>
              <span className="font-mono text-xs text-mutedGray">
                {summary.transactions.length} Records
              </span>
            </div>

            {summary.transactions.length === 0 ? (
              <div className="p-8 text-center text-mutedGray font-mono text-xs">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-borderCol/60">
                {summary.transactions.map((tx) => {
                  const isEarning = tx.type === 'EARNING';
                  return (
                    <div
                      key={tx.id}
                      className="py-3.5 flex items-start justify-between gap-4 font-mono text-xs hover:bg-paper/40 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isEarning
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isEarning ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-ink">{tx.reference}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isEarning
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-mutedGray leading-relaxed">
                            {tx.description}
                          </p>
                          <span className="text-[10px] text-mutedGray/80">
                            {new Date(tx.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div
                          className={`font-black text-sm ${
                            isEarning ? 'text-emerald-700' : 'text-amber-800'
                          }`}
                        >
                          {isEarning
                            ? `+฿${tx.amount.toLocaleString()}`
                            : `-฿${Math.abs(tx.amount).toLocaleString()}`}{' '}
                          THB
                        </div>
                        <div className="text-[10px] text-mutedGray">
                          Bal: ฿{tx.balanceAfter.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
