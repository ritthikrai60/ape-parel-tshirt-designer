'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('ไม่พบรหัสโทเคนสำหรับรีเซ็ตรหัสผ่าน กรุณาใช้ลิงก์จากอีเมลของท่าน');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold font-sans text-ink">ไม่พบโทเคนรีเซ็ตรหัสผ่าน</h1>
          <p className="text-xs text-mutedGray font-mono">
            ลิงก์อาจไม่ถูกต้องหรือหมดอายุแล้ว กรุณาส่งคำขอลืมรหัสผ่านใหม่อีกครั้ง
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block px-5 py-2.5 bg-ink text-paper rounded-xl font-mono text-xs font-bold hover:bg-ink-light transition-all shadow-sm"
        >
          ขอลิงก์รีเซ็ตรหัสผ่านใหม่
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-warm/20 border border-warm/40 text-warm-dark mx-auto flex items-center justify-center">
        {success ? <CheckCircle2 className="w-7 h-7 text-emerald-600" /> : <Lock className="w-7 h-7 text-ink" />}
      </div>

      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold font-sans text-ink">
          {success ? 'เปลี่ยนรหัสผ่านสำเร็จ' : 'ตั้งรหัสผ่านใหม่ (Reset Password)'}
        </h1>
        <p className="text-xs text-mutedGray font-mono">
          {success ? 'ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที' : 'กรุณากำหนดรหัสผ่านใหม่ความยาวอย่างน้อย 8 ตัวอักษร'}
        </p>
      </div>

      {success ? (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-800 text-xs font-mono">
            <p className="font-semibold text-sm">การเปลี่ยนรหัสผ่านเสร็จสมบูรณ์!</p>
            <p className="text-emerald-700 leading-relaxed">
              รหัสผ่านใหม่ของท่านได้รับการบันทึกลงในระบบอย่างปลอดภัยเรียบร้อยแล้ว
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-3 bg-ink hover:bg-ink-light text-paper font-mono text-xs uppercase font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            <span>เข้าสู่ระบบทันที (Sign In)</span>
            <ArrowRight className="w-4 h-4" />
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
              รหัสผ่านใหม่ (New Password)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
              ยืนยันรหัสผ่านใหม่ (Confirm Password)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกรหัสผ่าน...</span>
              </>
            ) : (
              <span>บันทึกรหัสผ่านใหม่</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 text-center text-xs font-mono text-mutedGray">
            กำลังโหลด...
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
