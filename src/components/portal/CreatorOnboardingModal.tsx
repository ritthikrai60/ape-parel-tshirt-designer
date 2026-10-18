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
  QrCode,
  Building2,
  Phone,
  FileCheck,
} from 'lucide-react';
import {
  THAI_BANKS,
  PayoutMethodType,
  PromptPayIdType,
  buildCanonicalPayoutDetails,
  validatePayoutInput,
  formatThaiPhone,
  formatThaiCitizenId,
  formatBankAccount,
  cleanDigits,
} from '@/lib/payoutUtils';

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

  // Structured Financial State
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodType>('PROMPTPAY');
  const [promptPayType, setPromptPayType] = useState<PromptPayIdType>('PHONE');
  const [promptPayNumber, setPromptPayNumber] = useState('');
  const [bankCode, setBankCode] = useState('KBANK');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(effectiveUser?.name || '');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // Auto-generate slug from displayName if user hasn't typed a custom slug
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    if (!accountName) setAccountName(val);
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

    // Validate structured financial input
    const financialError = validatePayoutInput({
      method: payoutMethod,
      promptPayType,
      promptPayNumber,
      bankCode,
      bankAccountNumber,
      accountName,
    });

    if (financialError) {
      setError(financialError);
      return;
    }

    const canonicalPayout = buildCanonicalPayoutDetails({
      method: payoutMethod,
      promptPayType,
      promptPayNumber,
      bankCode,
      bankAccountNumber,
      accountName,
    });

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/creator/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          slug: slug.trim(),
          bio: bio.trim(),
          payoutDetails: canonicalPayout,
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
          <div className="flex flex-col space-y-3 pt-1 border-t border-borderCol/60">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span>ช่องทางรับเงินส่วนแบ่งลิขสิทธิ์ (85% Royalty Payout) *</span>
              </label>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 font-semibold">
                THB AUTOMATED
              </span>
            </div>

            {/* Method Selectors */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPayoutMethod('PROMPTPAY')}
                className={`p-2.5 rounded-xl border flex items-center space-x-2.5 text-left transition-all ${
                  payoutMethod === 'PROMPTPAY'
                    ? 'border-warm bg-warm/15 shadow-sm'
                    : 'border-borderCol bg-paper hover:bg-paper-dark'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-sans font-bold text-xs text-ink block">พร้อมเพย์ (PromptPay)</span>
                  <span className="font-mono text-[9px] text-mutedGray">เบอร์มือถือ / บัตร ปชช.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPayoutMethod('BANK_TRANSFER')}
                className={`p-2.5 rounded-xl border flex items-center space-x-2.5 text-left transition-all ${
                  payoutMethod === 'BANK_TRANSFER'
                    ? 'border-warm bg-warm/15 shadow-sm'
                    : 'border-borderCol bg-paper hover:bg-paper-dark'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-sans font-bold text-xs text-ink block">บัญชีธนาคารไทย</span>
                  <span className="font-mono text-[9px] text-mutedGray">โอนเข้าบัญชีธนาคาร</span>
                </div>
              </button>
            </div>

            {/* Inputs by Method */}
            {payoutMethod === 'PROMPTPAY' ? (
              <div className="space-y-3 p-3 rounded-xl border border-borderCol bg-paper-dark/30">
                <div className="flex gap-4">
                  <label className="flex items-center space-x-1.5 text-xs font-mono cursor-pointer text-ink">
                    <input
                      type="radio"
                      name="onboardPromptPayType"
                      checked={promptPayType === 'PHONE'}
                      onChange={() => {
                        setPromptPayType('PHONE');
                        setPromptPayNumber('');
                      }}
                      className="accent-warm"
                    />
                    <span>เบอร์มือถือ (10 หลัก)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs font-mono cursor-pointer text-ink">
                    <input
                      type="radio"
                      name="onboardPromptPayType"
                      checked={promptPayType === 'CITIZEN_ID'}
                      onChange={() => {
                        setPromptPayType('CITIZEN_ID');
                        setPromptPayNumber('');
                      }}
                      className="accent-warm"
                    />
                    <span>บัตร ปชช. (13 หลัก)</span>
                  </label>
                </div>

                <div className="relative">
                  {promptPayType === 'PHONE' ? (
                    <Phone className="w-3.5 h-3.5 text-mutedGray absolute left-3 top-3" />
                  ) : (
                    <FileCheck className="w-3.5 h-3.5 text-mutedGray absolute left-3 top-3" />
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={
                      promptPayType === 'PHONE'
                        ? formatThaiPhone(promptPayNumber)
                        : formatThaiCitizenId(promptPayNumber)
                    }
                    onChange={(e) => {
                      const digits = cleanDigits(e.target.value);
                      const max = promptPayType === 'CITIZEN_ID' ? 13 : 10;
                      setPromptPayNumber(digits.slice(0, max));
                    }}
                    placeholder={promptPayType === 'PHONE' ? '081-234-5678' : '1-2345-67890-12-3'}
                    className="w-full pl-9 pr-3 py-2 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-xl border border-borderCol bg-paper-dark/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-mutedGray mb-1">
                      ธนาคารพาณิชย์ *
                    </label>
                    <select
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
                    >
                      {THAI_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} - {b.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-mutedGray mb-1">
                      เลขที่บัญชีธนาคาร *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={formatBankAccount(bankAccountNumber)}
                      onChange={(e) => {
                        const digits = cleanDigits(e.target.value);
                        setBankAccountNumber(digits.slice(0, 12));
                      }}
                      placeholder="123-4-56789-0"
                      className="w-full px-2.5 py-1.5 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-mutedGray mb-1">
                    ชื่อเจ้าของบัญชี (ตรงกับสมุดบัญชี) *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี หรือ SOMCHAI JAIDEE"
                    className="w-full px-2.5 py-1.5 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
                  />
                </div>
              </div>
            )}
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
