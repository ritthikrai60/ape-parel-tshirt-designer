'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  X,
  Palette,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  AtSign,
  LogIn,
} from 'lucide-react';

export interface CreatorOnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (creator: any) => void;
  initialUser?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export const CreatorOnboardingModal: React.FC<CreatorOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialUser,
}) => {
  const router = useRouter();
  const { data: session, update } = useSession();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/creator/dashboard');
    }
  };

  const effectiveUser = initialUser || session?.user;
  const isAuthenticated = Boolean(effectiveUser?.id);

  const [displayName, setDisplayName] = useState(effectiveUser?.name || '');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // Auto-generate slug from displayName if user hasn't typed a custom slug
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    if (autoSlug) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setSlug(
      e.target.value
        .toLowerCase()
        .replace(/[^\w-]/g, '')
    );
  };

  // Keyboard navigation & accessibility: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters long.');
      return;
    }

    if (!slug.trim() || slug.trim().length < 2) {
      setError('A valid creator handle/slug is required (minimum 2 characters).');
      return;
    }

    if (!payoutDetails.trim() || payoutDetails.trim().length < 5) {
      setError('Valid PromptPay or Thai bank account payout details are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/creator/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          slug: slug.trim(),
          bio: bio.trim(),
          payoutDetails: payoutDetails.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to complete creator onboarding.');
        setIsSubmitting(false);
        return;
      }

      if (update) {
        try {
          await update({ role: 'CREATOR' });
        } catch {
          // Ignore in environments without live session update
        }
      }

      if (onSuccess) {
        onSuccess(data.creator);
      } else {
        router.push(`/creator/dashboard?creator=${encodeURIComponent(data.creator.slug)}`);
        router.refresh();
      }
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Network error occurred while creating profile.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-onboard-title"
      className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col space-y-5 relative overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top industrial gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warm via-ink to-warm-dark" />

        {/* Unauthenticated User Warning */}
        {!isAuthenticated && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
            <span className="text-amber-900 font-semibold">Sign in required to activate Creator profile:</span>
            <div className="flex items-center space-x-2">
              <Link
                href="/login?callbackUrl=/creator/dashboard"
                onClick={handleClose}
                className="px-2.5 py-1 bg-ink text-paper rounded font-bold hover:bg-ink-light transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register?role=CREATOR"
                onClick={handleClose}
                className="px-2.5 py-1 bg-warm text-ink rounded font-bold hover:bg-warm-dark transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between border-b border-borderCol/70 pb-3 pt-1">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                <Palette className="w-3 h-3 text-ink" />
                <span>APE-PAREL // CREATOR STUDIO ONBOARDING</span>
              </span>
            </div>
            <h2 id="creator-onboard-title" className="text-xl font-sans font-black tracking-tight text-ink">
              Set Up Your Creator Studio Profile
            </h2>
            <p className="font-mono text-xs text-mutedGray">
              Unlock the artwork upload pipeline, custom storefront, and transparent 85% double-entry royalties.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close onboarding wizard"
            className="p-1.5 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark border border-transparent hover:border-borderCol transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 text-red-900 px-4 py-3 rounded-xl flex items-start space-x-2.5 text-xs font-mono"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          {/* Display Name */}
          <div className="flex flex-col space-y-1">
            <label htmlFor="creator-display-name" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
              Creator / Studio Display Name *
            </label>
            <input
              id="creator-display-name"
              type="text"
              required
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="e.g. Neon Shibuya Collective"
              className="w-full px-3.5 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-sans text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>

          {/* Unique Slug */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="creator-slug" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                Storefront URL Slug *
              </label>
              <span className="font-mono text-[10px] text-mutedGray">
                ape-parel.com/creators/{slug || 'your-slug'}
              </span>
            </div>
            <div className="relative">
              <AtSign className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="creator-slug"
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="neon-shibuya"
                className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col space-y-1">
            <label htmlFor="creator-bio" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
              Creator Bio & Art Direction (Optional)
            </label>
            <textarea
              id="creator-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell collectors about your aesthetic, inspirations, and streetwear roots..."
              className="w-full px-3.5 py-2 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-sans text-xs text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>

          {/* PromptPay / Bank Payout Details */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="creator-payout" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span>PromptPay / Bank Settlement Details *</span>
              </label>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 font-semibold">
                THB AUTOMATED
              </span>
            </div>
            <input
              id="creator-payout"
              type="text"
              required
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
              placeholder="e.g. PromptPay: 081-998-7711 (Bangkok Bank)"
              className="w-full px-3.5 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-mono text-xs text-ink placeholder:text-mutedGray/70 transition-colors"
            />
            <p className="font-mono text-[10px] text-mutedGray">
              Used to disburse your 85% creator royalty earnings upon settlement.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating Profile...' : 'Complete Creator Setup'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
