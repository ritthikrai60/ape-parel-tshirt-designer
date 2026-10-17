'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStatus('error');
      setMessage('ไม่พบรหัสโทเคนสำหรับยืนยันอีเมล กรุณาคลิกลิงก์จากอีเมลของท่านอีกครั้ง');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'ที่อยู่อีเมลของท่านได้รับการยืนยันเรียบร้อยแล้ว!');
        } else {
          setStatus('error');
          setMessage(data.error || 'โทเคนไม่ถูกต้องหรือหมดอายุแล้ว');
        }
      } catch {
        setStatus('error');
        setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-warm/20 border border-warm/40 text-warm-dark mx-auto flex items-center justify-center">
        {loading ? (
          <RefreshCw className="w-8 h-8 animate-spin text-ink" />
        ) : status === 'success' ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        ) : (
          <AlertCircle className="w-8 h-8 text-rose-600" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold font-sans text-ink">
          {loading
            ? 'กำลังยืนยันที่อยู่อีเมล...'
            : status === 'success'
            ? 'ยืนยันอีเมลสำเร็จแล้ว'
            : 'การยืนยันไม่สำเร็จ'}
        </h1>
        <p className="text-xs text-mutedGray font-mono">
          APE-PAREL • SECURITY & IDENTITY VERIFICATION
        </p>
      </div>

      {loading && (
        <div className="py-4 text-xs font-mono text-mutedGray animate-pulse">
          กำลังตรวจสอบความปลอดภัยของโทเคนกับระบบ...
        </div>
      )}

      {!loading && status === 'success' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Badge &quot;Verified&quot; ได้รับการเปิดใช้งานแล้ว</span>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed font-mono">
            {message}
          </p>
        </div>
      )}

      {!loading && status === 'error' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-rose-800 font-mono">{message}</p>
          <p className="text-[11px] text-rose-700 font-mono">
            ท่านสามารถเข้าสู่หน้าโปรไฟล์เพื่อกดส่งลิงก์ยืนยันใหม่อีกครั้งได้
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-borderCol flex flex-col space-y-2">
        <Link
          href="/account/profile"
          className="w-full py-2.5 bg-ink hover:bg-ink-light text-paper font-mono text-xs uppercase font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          <span>ไปยังหน้าโปรไฟล์ของฉัน</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/"
          className="text-xs font-mono text-mutedGray hover:text-ink transition-colors pt-1"
        >
          กลับสู่หน้าแรก
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 text-center text-xs font-mono text-mutedGray">
            กำลังโหลด...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
