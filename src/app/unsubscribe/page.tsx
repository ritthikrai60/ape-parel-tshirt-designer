'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MailCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subscribers/newsletter?token=${encodeURIComponent(token)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'ท่านได้ยกเลิกการรับข่าวสารเรียบร้อยแล้ว');
      } else {
        setStatus('error');
        setMessage(data.error || 'ไม่สามารถดำเนินการได้ในขณะนี้');
      }
    } catch {
      setStatus('error');
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      handleUnsubscribe();
    }
  }, [token]);

  return (
    <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-warm/20 border border-warm/40 text-warm-dark mx-auto flex items-center justify-center">
        <MailCheck className="w-8 h-8 text-ink" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold font-sans text-ink">
          การยกเลิกรับข่าวสาร (Unsubscribe)
        </h1>
        <p className="text-xs text-mutedGray font-mono">
          APE-PAREL • สิทธิในการเพิกถอนความยินยอมตาม PDPA
        </p>
      </div>

      {loading && (
        <div className="py-6 text-sm text-mutedGray font-mono animate-pulse">
          กำลังดำเนินการยกเลิกการรับข่าวสาร...
        </div>
      )}

      {!loading && status === 'success' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-emerald-800">{message}</p>
          <p className="text-[11px] text-emerald-700">
            อีเมลของท่านจะไม่ได้รับจดหมายข่าวการตลาดจากเราอีกต่อไป ทั้งนี้ท่านยังคงได้รับอีเมลแจ้งเตือนสถานะคำสั่งซื้อตามปกติ
          </p>
        </div>
      )}

      {!loading && status === 'error' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <p className="text-xs font-semibold text-rose-800">{message}</p>
        </div>
      )}

      {!token && (
        <div className="text-xs text-rose-600 font-mono">
          ไม่พบรหัส Token สำหรับการยกเลิก กรุณาตรวจสอบลิงก์ในอีเมลของท่านอีกครั้ง
        </div>
      )}

      <div className="pt-4 border-t border-borderCol">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-ink font-semibold hover:text-warm-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับสู่หน้าหลัก APE-PAREL</span>
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-paper-light border border-borderCol rounded-2xl shadow-xl p-8 text-center text-sm font-mono text-mutedGray">
          กำลังโหลด...
        </div>
      }>
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}
