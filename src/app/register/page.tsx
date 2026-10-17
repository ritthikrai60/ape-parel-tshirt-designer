'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import {
  Lock,
  Mail,
  User,
  ShoppingBag,
  Palette,
  Factory,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Phone,
} from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('returnUrl') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleIntent, setRoleIntent] = useState<'CUSTOMER' | 'CREATOR' | 'SUPPLIER'>('CUSTOMER');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Client-side password validation
  const isPasswordTooShort = password.length > 0 && password.length < 8;
  const isPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
          role: roleIntent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to create account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);

      // Auto sign-in with credentials
      const signInRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Fallback to login page if auto-login fails
        router.push(`/login?registered=true&email=${encodeURIComponent(email)}`);
        return;
      }

      // Determine contextual redirect URL
      let targetUrl = callbackUrl;
      if (!targetUrl) {
        if (roleIntent === 'CREATOR') {
          targetUrl = '/creator/dashboard';
        } else if (roleIntent === 'SUPPLIER') {
          targetUrl = '/supplier/dashboard';
        } else {
          targetUrl = '/studio/new';
        }
      }

      router.push(targetUrl);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during registration.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const target = callbackUrl || (roleIntent === 'CREATOR' ? '/creator/dashboard' : roleIntent === 'SUPPLIER' ? '/supplier/dashboard' : '/studio/new');
      await signIn('google', { callbackUrl: target });
    } catch (err) {
      console.error('[Register] Google Sign-In error:', err);
    }
  };

  return (
    <div className="w-full max-w-lg bg-paper-light border border-borderCol rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col space-y-6 relative overflow-hidden">
      {/* Top industrial gradient accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warm via-ink to-warm-dark" />

      {/* Header */}
      <div className="flex flex-col space-y-1.5 border-b border-borderCol/70 pb-4 pt-1">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold">
            APE-PAREL // JOIN THE GUILD
          </span>
          <span className="font-mono text-[9px] uppercase text-mutedGray">
            NEW_ACCOUNT
          </span>
        </div>
        <h1 className="text-2xl font-sans font-black tracking-tight text-ink">
          Create Your Account
        </h1>
        <p className="font-mono text-xs text-mutedGray">
          Join the creator-powered streetwear marketplace & customizable studio.
        </p>
      </div>

      {/* Error / Success alert */}
      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 text-red-900 px-4 py-3 rounded-xl flex items-start space-x-2.5 text-xs font-mono"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 px-4 py-3 rounded-xl flex items-start space-x-2.5 text-xs font-mono"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Account created! Redirecting to your workspace...</span>
        </div>
      )}

      {/* Role Intent Selector */}
      <div className="flex flex-col space-y-2">
        <label className="font-mono text-xs uppercase tracking-wider text-ink font-bold flex items-center justify-between">
          <span>Choose Your Primary Role Intent</span>
          <span className="text-[10px] text-mutedGray font-normal">Switchable anytime</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setRoleIntent('CUSTOMER')}
            className={`p-3 rounded-xl border text-left flex flex-col space-y-1 transition-all ${
              roleIntent === 'CUSTOMER'
                ? 'bg-ink text-paper border-ink shadow-sm'
                : 'bg-paper hover:bg-paper-dark border-borderCol text-ink'
            }`}
          >
            <ShoppingBag className="w-4 h-4 mb-1" />
            <span className="font-mono text-xs font-bold uppercase tracking-tight">Customer</span>
            <span className="text-[10px] leading-tight opacity-80">Design & Shop</span>
          </button>

          <button
            type="button"
            onClick={() => setRoleIntent('CREATOR')}
            className={`p-3 rounded-xl border text-left flex flex-col space-y-1 transition-all ${
              roleIntent === 'CREATOR'
                ? 'bg-ink text-paper border-ink shadow-sm'
                : 'bg-paper hover:bg-paper-dark border-borderCol text-ink'
            }`}
          >
            <Palette className="w-4 h-4 mb-1 text-warm" />
            <span className="font-mono text-xs font-bold uppercase tracking-tight">Creator</span>
            <span className="text-[10px] leading-tight opacity-80">Art & Royalties</span>
          </button>

          <button
            type="button"
            onClick={() => setRoleIntent('SUPPLIER')}
            className={`p-3 rounded-xl border text-left flex flex-col space-y-1 transition-all ${
              roleIntent === 'SUPPLIER'
                ? 'bg-ink text-paper border-ink shadow-sm'
                : 'bg-paper hover:bg-paper-dark border-borderCol text-ink'
            }`}
          >
            <Factory className="w-4 h-4 mb-1" />
            <span className="font-mono text-xs font-bold uppercase tracking-tight">Supplier</span>
            <span className="text-[10px] leading-tight opacity-80">Blanks & Print</span>
          </button>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {/* Full Name */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="reg-name" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
            Full Name / Studio Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kenji Tanaka / Tokyo Studio"
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-sans text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="reg-email" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>
        </div>

        {/* Phone Number (Optional) */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="reg-phone" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
              Phone Number / เบอร์โทรศัพท์
            </label>
            <span className="font-mono text-[10px] text-mutedGray">ไม่บังคับ (Optional)</span>
          </div>
          <div className="relative">
            <Phone className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081-234-5678"
              className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
            />
          </div>
          <p className="font-mono text-[10px] text-mutedGray">
            ใช้สำหรับการติดต่อจัดส่งพัสดุและเชื่อมต่อไปยังโปรไฟล์เริ่มต้นอัตโนมัติ
          </p>
        </div>

        {/* Password */}
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="reg-password" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
              Password
            </label>
            <span className="font-mono text-[10px] text-mutedGray">Min. 8 characters</span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full pl-10 pr-4 py-2.5 bg-paper border ${
                isPasswordTooShort ? 'border-red-400 focus:border-red-500' : 'border-borderCol focus:border-ink'
              } focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors`}
            />
          </div>
          {isPasswordTooShort && (
            <span className="font-mono text-[10px] text-red-600">Password must be at least 8 characters long</span>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col space-y-1.5">
          <label htmlFor="reg-confirm-password" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="reg-confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full pl-10 pr-4 py-2.5 bg-paper border ${
                isPasswordMismatch ? 'border-red-400 focus:border-red-500' : 'border-borderCol focus:border-ink'
              } focus:ring-1 focus:ring-ink rounded-xl font-mono text-sm text-ink placeholder:text-mutedGray/70 transition-colors`}
            />
          </div>
          {isPasswordMismatch && (
            <span className="font-mono text-[10px] text-red-600">Passwords do not match</span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isPasswordTooShort || isPasswordMismatch}
          className="w-full mt-2 py-3 px-4 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isSubmitting ? 'Creating Account...' : 'Register & Enter Studio'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Google OAuth Alternative */}
      <div className="pt-2 border-t border-borderCol/60 flex flex-col space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="w-full py-2.5 px-4 bg-paper hover:bg-paper-dark border border-borderCol rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-ink transition-colors flex items-center justify-center space-x-2.5"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.067 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
          <span>Sign up with Google</span>
        </button>

        {/* Switch to login */}
        <div className="flex items-center justify-center space-x-1.5 font-mono text-xs text-mutedGray">
          <span>Already registered?</span>
          <Link
            href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
            className="text-ink font-bold underline underline-offset-4 hover:text-warm-dark transition-colors"
          >
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="font-mono text-xs text-mutedGray animate-pulse">Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
