'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Info,
  Filter,
  Eye,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';

export interface ModerationArtwork {
  id: string;
  title: string;
  description: string | null;
  category: string;
  previewUrl: string;
  originalUrl: string | null;
  mimeType: string;
  tags: string | null;
  status: string;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderationReason: string | null;
  moderatedAt: string | null;
  createdAt: string;
  creator: {
    id: string;
    userId: string;
    displayName: string;
    slug: string;
    avatarUrl: string | null;
  };
  fileSpec?: {
    width: number;
    height: number;
    dpi: number;
    hasTransparency: boolean;
    isVector: boolean;
    colorSpace: string;
    fileSize: number;
  } | null;
  licenseOptions: Array<{
    id: string;
    name: string;
    price: number;
    scope: string;
  }>;
}

export interface AdminModerationClientProps {
  initialArtworks: ModerationArtwork[];
  initialCounts: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

const COMMON_REJECTION_REASONS = [
  'Missing Alpha Transparency: Graphic has solid background (white/black box) instead of transparent cutout.',
  'Low Resolution: Image resolution is below 300 DPI or dimensions under 1000px.',
  'Copyright / Trademark Infringement: Unauthorized use of protected third-party brand logos or marks.',
  'Inappropriate Content: Graphic violates community standards regarding hate speech or explicit content.',
  'Corrupted or Low-Quality Artwork: Pixelated compression artifacts detected in master graphic.',
];

export const AdminModerationClient: React.FC<AdminModerationClientProps> = ({
  initialArtworks,
  initialCounts,
}) => {
  const [artworks, setArtworks] = useState<ModerationArtwork[]>(initialArtworks);
  const [counts, setCounts] = useState(initialCounts);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  // Reject Modal state
  const [selectedArtworkToReject, setSelectedArtworkToReject] = useState<ModerationArtwork | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [customRejectNote, setCustomRejectNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Zoom / Inspect Modal
  const [inspectedArtwork, setInspectedArtwork] = useState<ModerationArtwork | null>(null);

  const filteredArtworks = artworks.filter((a) => {
    if (activeTab === 'ALL') return true;
    return a.moderationStatus === activeTab;
  });

  const handleApprove = async (artwork: ModerationArtwork) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: artwork.id,
          action: 'APPROVE',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve artwork');
      }

      // Update local state
      setArtworks((prev) =>
        prev.map((a) =>
          a.id === artwork.id
            ? { ...a, moderationStatus: 'APPROVED', status: 'PUBLISHED', moderationReason: null }
            : a
        )
      );

      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - (artwork.moderationStatus === 'PENDING' ? 1 : 0)),
        approved: prev.approved + 1,
        rejected: Math.max(0, prev.rejected - (artwork.moderationStatus === 'REJECTED' ? 1 : 0)),
      }));

      setActionMessage({
        type: 'success',
        text: `Approved "${artwork.title}" successfully. Notification sent to creator.`,
      });
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Error approving artwork' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedArtworkToReject || isSubmitting) return;

    const finalReason = [rejectReason, customRejectNote].filter(Boolean).join(' - ').trim();

    if (!finalReason) {
      setActionMessage({ type: 'error', text: 'Please select or enter a rejection reason.' });
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkId: selectedArtworkToReject.id,
          action: 'REJECT',
          reason: finalReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject artwork');
      }

      setArtworks((prev) =>
        prev.map((a) =>
          a.id === selectedArtworkToReject.id
            ? {
                ...a,
                moderationStatus: 'REJECTED',
                status: 'DRAFT',
                moderationReason: finalReason,
              }
            : a
        )
      );

      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - (selectedArtworkToReject.moderationStatus === 'PENDING' ? 1 : 0)),
        approved: Math.max(0, prev.approved - (selectedArtworkToReject.moderationStatus === 'APPROVED' ? 1 : 0)),
        rejected: prev.rejected + 1,
      }));

      setActionMessage({
        type: 'success',
        text: `Rejected "${selectedArtworkToReject.title}". Reason logged and notification sent.`,
      });

      setSelectedArtworkToReject(null);
      setRejectReason('');
      setCustomRejectNote('');
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Error rejecting artwork' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-5">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-mutedGray mb-1">
            <ShieldAlert className="w-4 h-4 text-warm" />
            <span>MODERATION QUEUE // ARTWORK COMPLIANCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-ink">
            Artwork Moderation & Review
          </h1>
          <p className="text-xs font-mono text-mutedGray mt-1">
            Review creator print masters for alpha transparency, resolution, and IP compliance before marketplace publishing.
          </p>
        </div>

        {/* Status Tab Counters */}
        <div className="flex items-center space-x-1 bg-paper border border-borderCol p-1 rounded-xl shadow-2xs">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 font-mono text-xs rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'text-ink hover:bg-paper-dark'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({counts.pending})</span>
          </button>
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3 py-1.5 font-mono text-xs rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-ink hover:bg-paper-dark'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({counts.approved})</span>
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1.5 font-mono text-xs rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'text-ink hover:bg-paper-dark'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({counts.rejected})</span>
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 font-mono text-xs rounded-lg transition-colors ${
              activeTab === 'ALL'
                ? 'bg-ink text-paper font-bold shadow-xs'
                : 'text-ink hover:bg-paper-dark'
            }`}
          >
            All ({artworks.length})
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border font-mono text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Artwork Grid List */}
      {filteredArtworks.length === 0 ? (
        <div className="bg-paper-light border border-borderCol rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-paper-dark border border-borderCol flex items-center justify-center mx-auto text-mutedGray">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-ink text-base">Queue Clean</h3>
          <p className="font-mono text-xs text-mutedGray">
            No artworks currently in the &quot;{activeTab}&quot; queue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtworks.map((art) => {
            const isPending = art.moderationStatus === 'PENDING';
            const isApproved = art.moderationStatus === 'APPROVED';
            const isRejected = art.moderationStatus === 'REJECTED';

            return (
              <div
                key={art.id}
                className="bg-paper-light border border-borderCol rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-warm transition-all"
              >
                {/* Artwork Preview Header with Checkerboard pattern */}
                <div className="relative aspect-square w-full bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px] bg-paper-dark flex items-center justify-center p-6 border-b border-borderCol">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={art.previewUrl}
                    alt={art.title}
                    className="max-h-full max-w-full object-contain drop-shadow-md cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setInspectedArtwork(art)}
                    title="Click to inspect full resolution"
                  />

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        isPending
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isApproved
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}
                    >
                      {art.moderationStatus}
                    </span>
                  </div>

                  {/* Format & Category Tag */}
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-ink text-paper font-semibold">
                      {art.category}
                    </span>
                  </div>

                  {/* Quick Inspect Button */}
                  <button
                    onClick={() => setInspectedArtwork(art)}
                    className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-paper/90 border border-borderCol text-ink hover:bg-paper transition-colors shadow-2xs"
                    title="Inspect artwork details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Details Section */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-ink text-base tracking-tight">{art.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="font-mono text-xs text-mutedGray">
                        By{' '}
                        <Link
                          href={`/creators/${art.creator.slug}`}
                          className="text-ink font-semibold hover:underline"
                        >
                          {art.creator.displayName}
                        </Link>
                      </span>
                    </div>

                    {/* Spec Indicators */}
                    {art.fileSpec && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-borderCol/60 font-mono text-[11px]">
                        <div className="text-mutedGray">
                          Res:{' '}
                          <span className="text-ink font-semibold">
                            {art.fileSpec.width} &times; {art.fileSpec.height}
                          </span>
                        </div>
                        <div className="text-mutedGray">
                          DPI:{' '}
                          <span className="text-ink font-semibold">
                            {art.fileSpec.dpi || 'Vector'}
                          </span>
                        </div>
                        <div className="text-mutedGray">
                          Alpha:{' '}
                          <span
                            className={
                              art.fileSpec.hasTransparency
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-600 font-bold'
                            }
                          >
                            {art.fileSpec.hasTransparency ? 'Transparent' : 'Solid (!)'}
                          </span>
                        </div>
                        <div className="text-mutedGray">
                          Type:{' '}
                          <span className="text-ink font-semibold">
                            {art.fileSpec.isVector ? 'SVG Vector' : 'Raster'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Rejection Note Display */}
                    {isRejected && art.moderationReason && (
                      <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[11px] space-y-0.5">
                        <span className="font-bold block">Rejection Reason:</span>
                        <p>{art.moderationReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-borderCol flex items-center space-x-2">
                    <button
                      onClick={() => handleApprove(art)}
                      disabled={isSubmitting || isApproved}
                      className="flex-1 py-2 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isApproved ? 'Approved' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedArtworkToReject(art);
                        setRejectReason(COMMON_REJECTION_REASONS[0]);
                      }}
                      disabled={isSubmitting || isRejected}
                      className="px-3 py-2 border border-borderCol hover:border-rose-400 hover:text-rose-600 text-mutedGray font-mono text-xs uppercase font-bold rounded-xl transition-colors disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Dialog Modal */}
      {selectedArtworkToReject && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-sans font-bold text-lg text-ink">
                  Reject Artwork Submission
                </h3>
              </div>
              <button
                onClick={() => setSelectedArtworkToReject(null)}
                className="p-1 rounded text-mutedGray hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs font-mono text-mutedGray">
                Rejecting &quot;<strong className="text-ink">{selectedArtworkToReject.title}</strong>&quot; by{' '}
                {selectedArtworkToReject.creator.displayName}. The creator will receive an immediate notification with your explanation.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <label className="font-bold text-ink block">Standard Violation Reason:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2.5 bg-paper border border-borderCol rounded-xl text-ink focus:outline-none"
              >
                {COMMON_REJECTION_REASONS.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <label className="font-bold text-ink block pt-2">
                Custom Feedback / Correction Notes:
              </label>
              <textarea
                rows={3}
                value={customRejectNote}
                onChange={(e) => setCustomRejectNote(e.target.value)}
                placeholder="Optional: Explain exactly what needs to be changed (e.g. Please clip the white box behind the helmet)."
                className="w-full p-3 bg-paper border border-borderCol rounded-xl text-ink text-xs focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-borderCol flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedArtworkToReject(null)}
                className="px-4 py-2 border border-borderCol rounded-xl font-mono text-xs text-mutedGray hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection & Send Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectedArtwork && (
        <div
          onClick={() => setInspectedArtwork(null)}
          className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-paper-light border border-borderCol w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div>
                <h3 className="font-sans font-bold text-lg text-ink">{inspectedArtwork.title}</h3>
                <p className="font-mono text-xs text-mutedGray">
                  Category: {inspectedArtwork.category} &bull; By {inspectedArtwork.creator.displayName}
                </p>
              </div>
              <button
                onClick={() => setInspectedArtwork(null)}
                className="p-1 rounded text-mutedGray hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checkerboard Master View */}
            <div className="w-full aspect-video bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px] bg-paper-dark rounded-xl flex items-center justify-center p-8 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inspectedArtwork.previewUrl}
                alt={inspectedArtwork.title}
                className="max-h-full max-w-full object-contain drop-shadow-lg"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-paper rounded-xl border border-borderCol">
                <span className="text-[10px] text-mutedGray uppercase block">Dimensions</span>
                <span className="font-bold text-ink">
                  {inspectedArtwork.fileSpec?.width || '-'} &times; {inspectedArtwork.fileSpec?.height || '-'}
                </span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol">
                <span className="text-[10px] text-mutedGray uppercase block">DPI Resolution</span>
                <span className="font-bold text-ink">{inspectedArtwork.fileSpec?.dpi || 'Vector'}</span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol">
                <span className="text-[10px] text-mutedGray uppercase block">Alpha Channel</span>
                <span className="font-bold text-emerald-700">
                  {inspectedArtwork.fileSpec?.hasTransparency ? 'Transparent' : 'Solid'}
                </span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol">
                <span className="text-[10px] text-mutedGray uppercase block">MIME Type</span>
                <span className="font-bold text-ink">{inspectedArtwork.mimeType}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedArtwork(null)}
                className="px-4 py-2 bg-ink text-paper font-mono text-xs rounded-xl font-bold uppercase"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModerationClient;
