'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

function getRoleDefaultDestination(role?: string): string {
  if (role === 'CREATOR') return '/creator/dashboard';
  if (role === 'SUPPLIER') return '/supplier/dashboard';
  if (role === 'ADMIN') return '/admin';
  return '/marketplace';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl') || searchParams.get('returnUrl');
  const isGenericCallback =
    !rawCallback ||
    rawCallback === '/studio/new' ||
    rawCallback === '/' ||
    rawCallback === '/marketplace' ||
    rawCallback === '/login';

  const callbackUrl = rawCallback || '/marketplace';
  const registered = searchParams.get('registered') === 'true';
  const prefillEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error || !res?.ok) {
        setError('Invalid email or password. Please verify your credentials.');
        setIsSubmitting(false);
        return;
      }

      // Check user role from freshly created session
      let targetDestination = !isGenericCallback && rawCallback ? rawCallback : null;

      if (!targetDestination) {
        try {
          const session = await getSession();
          const role = (session?.user as any)?.role;
          targetDestination = getRoleDefaultDestination(role);
        } catch {
          targetDestination = '/marketplace';
        }
      }

      router.push(targetDestination);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate. Please check your network connection.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl });
    } catch (err) {
      console.error('[Login] Google Sign-In error:', err);
    }
  };

  const handleDevFastLogin = async (devEmail: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email: devEmail,
        redirect: false,
        callbackUrl,
      });

      if (res?.error || !res?.ok) {
        setError(`Failed to sign in with development mock account (${devEmail}).`);
        setIsSubmitting(false);
        return;
      }

      let destination = !isGenericCallback && rawCallback ? rawCallback : null;
      if (!destination) {
        if (devEmail.includes('dashape') || devEmail.includes('creator')) {
          destination = '/creator/dashboard';
        } else if (devEmail.includes('garment') || devEmail.includes('supplier')) {
          destination = '/supplier/dashboard';
        } else {
          destination = '/marketplace';
        }
      }

      router.push(destination);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Dev login error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-paper-light border border-borderCol rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col space-y-6 relative overflow-hidden">
      {/* Top industrial gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warm via-ink to-warm-dark" />

      {/* Header */}
      <div className="flex flex-col space-y-1.5 border-b border-borderCol/70 pb-4 pt-1">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold">
            APE-PAREL // AUTH
          </span>
          <span className="font-mono text-[9px] uppercase text-mutedGray">
            SIGN_IN
          </span>
        </div>
        <h1 className="text-2xl font-sans font-black tracking-tight text-ink">
          Sign In to Ape-Parel
        </h1>
        <p className="font-mono text-xs text-mutedGray">
          Access your design studio, creator royalties, or supplier inventory.
        </p>
      </div>

      {/* Registration notice */}
      {registered && (
        <div
          role="status"
          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 px-4 py-3 rounded-xl flex items-start space-x-2.5 text-xs font-mono"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Account created successfully! Please enter your password to sign in.</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 text-red-900 px-4 py-3 rounded-xl flex items-start space-x-2.5 text-xs font-mono"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {/* Email */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="login-email" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-mono text-warm-dark hover:underline font-semibold"
            >
              Forgot password? / ลืมรหัสผ่าน?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Google OAuth Button */}
      <div className="pt-2 border-t border-borderCol/60 flex flex-col space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-paper hover:bg-paper-dark border border-borderCol rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-ink transition-colors flex items-center justify-center space-x-2.5"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.067 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* Development Fast Login Switcher */}
        <div className="pt-3 border-t border-borderCol/60 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Development Fast Login</span>
            </span>
            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-warm/30 text-ink border border-warm/60 font-semibold">
              DEV_MOCK
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDevFastLogin('customer@ape-parel.com')}
              disabled={isSubmitting}
              className="py-2 px-2 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-[11px] text-ink font-semibold flex flex-col items-center justify-center space-y-1 transition-colors disabled:opacity-50"
              title="Instant login as test Customer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-700" />
              <span className="truncate max-w-full">Customer</span>
            </button>

            <button
              type="button"
              onClick={() => handleDevFastLogin('dashape@ape-parel.com')}
              disabled={isSubmitting}
              className="py-2 px-2 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-[11px] text-ink font-semibold flex flex-col items-center justify-center space-y-1 transition-colors disabled:opacity-50"
              title="Instant login as test Creator"
            >
              <Zap className="w-3.5 h-3.5 text-warm-dark" />
              <span className="truncate max-w-full">Creator</span>
            </button>

            <button
              type="button"
              onClick={() => handleDevFastLogin('production@bangkokgarment.co.th')}
              disabled={isSubmitting}
              className="py-2 px-2 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg font-mono text-[11px] text-ink font-semibold flex flex-col items-center justify-center space-y-1 transition-colors disabled:opacity-50"
              title="Instant login as test Supplier"
            >
              <Zap className="w-3.5 h-3.5 text-blue-700" />
              <span className="truncate max-w-full">Supplier</span>
            </button>
          </div>
        </div>

        {/* Switch to register */}
        <div className="pt-2 flex items-center justify-center space-x-1.5 font-mono text-xs text-mutedGray">
          <span>Don&apos;t have an account?</span>
          <Link
            href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
            className="text-ink font-bold underline underline-offset-4 hover:text-warm-dark transition-colors"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="font-mono text-xs text-mutedGray animate-pulse">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
