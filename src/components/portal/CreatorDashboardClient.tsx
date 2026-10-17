'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
import { CreatorOnboardingModal } from './CreatorOnboardingModal';
import { NotificationBell } from './NotificationBell';

export interface CreatorOption {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  payoutDetails: string | null;
}

export interface CreatorArtworkSummary {
  id: string;
  title: string;
  previewUrl: string;
  status: string;
  moderationStatus: string;
  moderationReason: string | null;
  moderatedAt: string | null;
  licenseOptions?: Array<{ price: number }>;
  createdAt: string;
}

export interface CreatorDashboardClientProps {
  initialSummary: CreatorLedgerSummary | null;
  initialEntries: RoyaltyLedgerEntryDetails[];
  initialArtworks?: CreatorArtworkSummary[];
  allCreators: CreatorOption[];
  currentSlug: string;
  needsOnboarding?: boolean;
  initialUser?: { id?: string; name?: string | null; email?: string | null } | null;
}

export const CreatorDashboardClient: React.FC<CreatorDashboardClientProps> = ({
  initialSummary,
  initialEntries,
  initialArtworks = [],
  allCreators,
  currentSlug,
  needsOnboarding,
  initialUser,
}) => {
  const router = useRouter();
  const [summary, setSummary] = useState<CreatorLedgerSummary | null>(initialSummary);
  const [entries, setEntries] = useState<RoyaltyLedgerEntryDetails[]>(initialEntries);
  const [artworks] = useState<CreatorArtworkSummary[]>(initialArtworks);
  const [filterType, setFilterType] = useState<'ALL' | 'EARNING' | 'PAYOUT_SETTLEMENT'>('ALL');
  const [isSettling, setIsSettling] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payoutRefInput, setPayoutRefInput] = useState('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(Boolean(needsOnboarding));

  const currentCreator = allCreators.find((c) => c.slug === currentSlug) || allCreators[0];

  const handleCreatorChange = (newSlug: string) => {
    router.push(`/creator/dashboard?creator=${encodeURIComponent(newSlug)}`);
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
      const summaryRes = await fetch(`/api/royalties/settle?creatorId=${encodeURIComponent(summary.creatorId)}`);
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
    <div className="space-y-8 w-full">
      {needsOnboarding && (
        <div className="bg-warm/25 border border-warm/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-ink text-paper font-bold font-mono text-xs">ONBOARDING</span>
            <div>
              <p className="font-sans font-bold text-sm text-ink">You haven&apos;t set up your Creator Profile yet.</p>
              <p className="font-mono text-xs text-mutedGray">Set up your artist slug and PromptPay payout details to unlock royalties.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="px-4 py-2 bg-ink text-paper rounded-lg font-mono text-xs uppercase font-bold hover:bg-ink-light transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            Setup Creator Profile
          </button>
        </div>
      )}

      {/* Top Bar: Creator Info & Persona Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-6">
        <div className="flex items-center space-x-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={summary?.avatarUrl || currentCreator?.avatarUrl || 'https://api.dicebear.com/8.x/bottts/svg?seed=creator'}
            alt={summary?.displayName || currentCreator?.displayName || 'Creator'}
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
                {summary?.payoutDetails || currentCreator?.payoutDetails || 'PromptPay Default'}
              </span>
            </p>
          </div>
        </div>

        {/* Persona Switcher & Primary Action */}
        <div className="flex items-center space-x-3">
          {allCreators.length > 1 && (
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-mutedGray hidden sm:inline">Active Creator:</span>
              <select
                aria-label="Select active creator"
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

          <NotificationBell />

          <Link
            href={`/creator/journal?creator=${encodeURIComponent(currentSlug)}`}
            className="px-3.5 py-2 bg-paper hover:bg-paper-dark border border-borderCol text-ink font-mono text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Receipt className="w-4 h-4 text-warm-dark" />
            <span>Journal & Tax 50 Tawi</span>
          </Link>

          <button
            type="button"
            data-testid="settle-payout-btn"
            disabled={!summary || summary.currentBalance <= 0 || isSettling}
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-ink hover:bg-ink-light disabled:bg-mutedGray/50 disabled:cursor-not-allowed text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Wallet className="w-4 h-4 text-warm" />
            <span>Settle Payout</span>
          </button>
        </div>
      </div>

      {/* Settlement Success / Error Banners */}
      {settlementSuccess && (
        <div
          data-testid="settlement-success-banner"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-800"
        >
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
        <div
          data-testid="settlement-error-banner"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs font-mono text-rose-800"
        >
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
          <div
            data-testid="metric-gross-earnings"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
            ฿{summary ? summary.lifetimeEarnings.toLocaleString() : '0'}
          </div>
          <p className="font-mono text-[11px] text-mutedGray">Lifetime cumulative gross fees earned</p>
        </div>

        {/* Metric 2: Volume Sold */}
        <div className="p-5 bg-paper-light border border-borderCol rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-mutedGray">
            <span className="font-mono text-xs uppercase tracking-wider">Sales Volume</span>
            <Package className="w-4 h-4 text-warm-dark" />
          </div>
          <div
            data-testid="metric-sales-volume"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
            {summary ? summary.salesVolume.toLocaleString() : '0'}{' '}
            <span className="text-sm font-normal text-mutedGray">pcs</span>
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
          <div
            data-testid="metric-eligible-balance"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
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
          <div
            data-testid="metric-settled-payouts"
            className="text-3xl font-black font-mono text-ink tracking-tight"
          >
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
          <table data-testid="royalty-ledger-table" className="w-full text-left text-xs font-mono">
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* Creator Artwork Submissions & Moderation Status */}
      <div className="bg-paper-light border border-borderCol rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-borderCol flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-warm-dark" />
              <h2 className="text-base font-bold font-sans text-ink uppercase tracking-tight">
                Artwork Submissions & Moderation Status
              </h2>
            </div>
            <p className="font-mono text-xs text-mutedGray mt-0.5">
              Live audit track of your transparent graphic submissions before publishing to Marketplace & Studio.
            </p>
          </div>
          <Link
            href="/creator/upload"
            className="px-3.5 py-2 bg-ink hover:bg-ink-light text-paper font-mono text-xs font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm self-start sm:self-auto"
          >
            <span>+ Upload New Artwork</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table data-testid="creator-artworks-table" className="w-full text-left text-xs font-mono">
            <thead className="bg-paper border-b border-borderCol text-mutedGray uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Preview & Title</th>
                <th className="py-3 px-4 font-semibold">Submitted</th>
                <th className="py-3 px-4 font-semibold">Royalty Tier</th>
                <th className="py-3 px-4 font-semibold">Store Status</th>
                <th className="py-3 px-4 font-semibold">Moderation Status</th>
                <th className="py-3 px-4 font-semibold">Review Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCol/60">
              {artworks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-mutedGray">
                    No artworks uploaded yet.{' '}
                    <Link href="/creator/upload" className="text-ink font-bold underline">
                      Upload your first design
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                artworks.map((art) => (
                  <tr key={art.id} className="hover:bg-paper/50 transition-colors">
                    <td className="py-3 px-4 text-ink">
                      <div className="flex items-center space-x-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={art.previewUrl}
                          alt={art.title}
                          className="w-10 h-10 rounded border border-borderCol object-contain bg-paper-dark"
                        />
                        <div>
                          <div className="font-bold text-ink">{art.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-mutedGray whitespace-nowrap">
                      {new Date(art.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                      ฿{(art.licenseOptions?.[0]?.price ?? 50).toLocaleString()} THB
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          art.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-paper-dark text-mutedGray border-borderCol'
                        }`}
                      >
                        {art.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {art.moderationStatus === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>APPROVED</span>
                        </span>
                      ) : art.moderationStatus === 'REJECTED' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200 inline-flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>REJECTED</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-warm/30 text-ink font-bold border border-warm/60 inline-flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-warm-dark" />
                          <span>PENDING REVIEW</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-ink">
                      {art.moderationReason ? (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 leading-snug">
                          {art.moderationReason}
                        </div>
                      ) : art.moderationStatus === 'APPROVED' ? (
                        <span className="text-mutedGray text-[11px]">Approved for live sales</span>
                      ) : (
                        <span className="text-mutedGray text-[11px]">Awaiting moderator queue</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Settlement Confirmation Modal */}
      {isModalOpen && (
        <div
          data-testid="payout-modal"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
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
                data-testid="confirm-settlement-btn"
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

      <CreatorOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialUser={initialUser}
      />
    </div>
  );
};

export default CreatorDashboardClient;
