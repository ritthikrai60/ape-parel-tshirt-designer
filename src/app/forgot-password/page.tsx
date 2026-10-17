'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-warm/20 border border-warm/40 text-warm-dark mx-auto flex items-center justify-center">
          <KeyRound className="w-7 h-7 text-ink" />
        </div>

        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold font-sans text-ink">
            ลืมรหัสผ่าน (Forgot Password)
          </h1>
          <p className="text-xs text-mutedGray font-mono">
            ระบุที่อยู่อีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-800 text-xs font-mono">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-semibold text-sm">ส่งคำขอเรียบร้อยแล้ว!</p>
              <p className="text-emerald-700 leading-relaxed">
                หากอีเมล <strong>{email}</strong> มีอยู่ในระบบ บัญชีของคุณจะได้รับอีเมลพร้อมลิงก์ตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 1 ชั่วโมง)
              </p>
            </div>

            <p className="text-xs text-mutedGray font-mono">
              ไม่ได้รับอีเมล? โปรดตรวจสอบในโฟลเดอร์ Junk/Spam หรือลองใหม่อีกครั้ง
            </p>

            <Link
              href="/login"
              className="inline-flex items-center space-x-2 text-xs font-mono text-ink font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปหน้าเข้าสู่ระบบ (Sign In)</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 text-xs font-mono">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                อีเมลของคุณ (Registered Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
                />
                <Mail className="w-4 h-4 text-mutedGray absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <span>ส่งลิงก์รีเซ็ตรหัสผ่าน</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-mono text-mutedGray hover:text-ink transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับไปหน้าเข้าสู่ระบบ</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
