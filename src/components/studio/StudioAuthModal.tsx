'use client';

import React, { useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { X, Bookmark, ShoppingBag, ShieldCheck, Zap, Lock } from 'lucide-react';
import { PendingStudioAction } from './studioStateStorage';

export interface StudioAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingAction?: PendingStudioAction;
  onDevLoginSuccess?: (email?: string) => void;
}

export const StudioAuthModal: React.FC<StudioAuthModalProps> = ({
  isOpen,
  onClose,
  pendingAction = null,
  onDevLoginSuccess,
}) => {
  // ESC key listener to dismiss modal without altering canvas state
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (typeof window !== 'undefined') {
        await signIn('google', { callbackUrl: window.location.href });
      } else {
        await signIn('google');
      }
    } catch (err) {
      console.error('[StudioAuthModal] Google Sign-In error:', err);
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async (email: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await signIn('credentials', {
        email,
        redirect: false,
        callbackUrl: typeof window !== 'undefined' ? window.location.href : '/studio/new',
      });
      if (res && (res.error || !res.ok)) {
        console.error('[StudioAuthModal] Dev Credentials Sign-In rejected:', res.error);
        return;
      }
      if (onDevLoginSuccess) {
        onDevLoginSuccess(email);
      }
    } catch (err) {
      console.error('[StudioAuthModal] Dev Credentials Sign-In error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSaveAction = pendingAction === 'SAVE';
  const isOrderAction = pendingAction === 'ORDER';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-auth-title"
      aria-describedby="studio-auth-description"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[70] bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
    >
      <div
        className="bg-paper-light border border-borderCol w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col space-y-5 relative overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Streetwear Accents: Top Industrial Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-warm via-ink to-warm-dark" />

        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-borderCol/70 pb-3 pt-1">
          <div className="flex flex-col space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold">
                APE-PAREL // STUDIO AUTH
              </span>
              <span className="font-mono text-[9px] uppercase text-mutedGray">
                {isSaveAction ? 'SAVE_ACTION' : isOrderAction ? 'ORDER_ACTION' : 'GATEWAY'}
              </span>
            </div>
            <h2
              id="studio-auth-title"
              className="text-lg font-sans font-black tracking-tight text-ink mt-1"
            >
              {isSaveAction
                ? 'Save Custom Design'
                : isOrderAction
                ? 'Fast-Track Checkout'
                : 'Sign In to Studio'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark border border-transparent hover:border-borderCol transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contextual Streetwear Info Card */}
        <div
          id="studio-auth-description"
          className="bg-paper border border-borderCol rounded-xl p-3.5 flex items-start space-x-3 text-xs"
        >
          <div className="p-2 rounded-lg bg-warm/25 border border-warm/50 text-ink shrink-0 mt-0.5">
            {isSaveAction ? (
              <Bookmark className="w-4 h-4 text-ink" />
            ) : isOrderAction ? (
              <ShoppingBag className="w-4 h-4 text-ink" />
            ) : (
              <Lock className="w-4 h-4 text-ink" />
            )}
          </div>
          <div className="flex flex-col space-y-1">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
              {isSaveAction
                ? 'Preserve 3D Canvas Layout'
                : isOrderAction
                ? 'Server-Verified Production'
                : 'Seamless Session Sync'}
            </span>
            <p className="font-mono text-[11px] text-mutedGray leading-relaxed">
              {isSaveAction
                ? 'Sign in to store your 3D tee layout, artwork licenses, and colorway directly into your creator vault.'
                : isOrderAction
                ? 'Sign in to finalize your order with anti-tamper price verification, DTG print routing, and creator royalties.'
                : 'Authenticate to preserve your 2D/3D studio workspace across devices and checkout custom apparel.'}
            </p>
          </div>
        </div>

        {/* Primary Auth Actions */}
        <div className="flex flex-col space-y-3 pt-1">
          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            aria-label="Sign in with Google"
            className="w-full py-3 px-4 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center space-x-3 shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.067 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            <span>{isSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* Email / Password Authentication Option */}
          <div className="flex items-center justify-center space-x-1.5 font-mono text-xs text-mutedGray pt-1">
            <span>Or sign in with email:</span>
            <a
              href="/login?callbackUrl=/studio/new"
              className="text-ink font-bold underline underline-offset-4 hover:text-warm-dark transition-colors"
            >
              Sign In
            </a>
            <span>&bull;</span>
            <a
              href="/register?callbackUrl=/studio/new"
              className="text-ink font-bold underline underline-offset-4 hover:text-warm-dark transition-colors"
            >
              Register
            </a>
          </div>

          {/* Dev Mock Access Section */}
          <div className="pt-3 border-t border-borderCol/60 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                <span>Development & Mock Access</span>
              </span>
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-warm/30 text-ink border border-warm/60 font-semibold">
                DEV_MOCK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDevLogin('customer@ape-parel.com')}
                disabled={isSubmitting}
                className="py-2.5 px-3 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-[11px] text-ink font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Instant login as test Customer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                <span>Dev Customer</span>
              </button>
              <button
                type="button"
                onClick={() => handleDevLogin('dashape@ape-parel.com')}
                disabled={isSubmitting}
                className="py-2.5 px-3 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-[11px] text-ink font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Instant login as test Creator"
              >
                <Zap className="w-3.5 h-3.5 text-warm-dark" />
                <span>Dev Creator</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-mutedGray text-center">
              Sandbox instant credential bypass &bull; Preserves active design state
            </p>
          </div>
        </div>

        {/* Footer / Dismiss Guarantee */}
        <div className="pt-2 border-t border-borderCol/50 flex flex-col items-center space-y-2">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-mutedGray hover:text-ink underline underline-offset-4 transition-colors"
          >
            Cancel & Return to Design Studio
          </button>
          <span className="font-mono text-[9px] text-mutedGray text-center">
            Zero state loss guarantee: active 2D/3D layers remain untouched on close.
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudioAuthModal;
