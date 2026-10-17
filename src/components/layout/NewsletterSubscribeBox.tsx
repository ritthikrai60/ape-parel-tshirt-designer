'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { LegalModalViewer, LegalDocType } from '@/components/pdpa/LegalModalViewer';
import { useSettings } from '@/components/providers/SettingsProvider';

export const NewsletterSubscribeBox: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useSettings();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [legalModalType, setLegalModalType] = useState<LegalDocType | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        type: 'error',
        title: 'อีเมลไม่ถูกต้อง',
        message: 'กรุณากรอกที่อยู่อีเมลให้ถูกต้อง',
      });
      return;
    }

    if (!consent) {
      toast({
        type: 'warning',
        title: 'ความยินยอมตาม PDPA',
        message: 'กรุณาทำเครื่องหมายยินยอมรับข่าวสารก่อนดำเนินการ',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/subscribers/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'FOOTER',
          consentGiven: consent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubscribed(true);
        toast({
          type: 'success',
          title: 'สมัครรับข่าวสารสำเร็จ!',
          message: data.message || 'ระบบได้บันทึกการสมัครและส่งอีเมลต้อนรับให้คุณแล้ว',
        });
      } else {
        toast({
          type: 'error',
          title: 'ไม่สามารถสมัครได้',
          message: data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        });
      }
    } catch {
      toast({
        type: 'error',
        title: 'ข้อผิดพลาดเครือข่าย',
        message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`p-6 bg-paper rounded-2xl border border-borderCol/80 ${className}`}>
        <div className="flex items-center space-x-2.5 mb-2">
          <div className="p-1.5 rounded-lg bg-warm/30 text-ink">
            <Mail className="w-4 h-4" />
          </div>
          <h3 className="font-sans font-bold text-sm uppercase tracking-wide text-ink">
            {t.footer.newsletterTitle}
          </h3>
        </div>
        <p className="text-xs text-mutedGray font-sans leading-relaxed mb-4">
          {t.footer.newsletterDesc}
        </p>

        {subscribed ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>ขอบคุณที่ติดตาม APE-PAREL! คุณจะได้รับข่าวสารล่าสุดก่อนใคร</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.footer.subscribePlaceholder}
                className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-paper-light border border-borderCol rounded-xl text-ink placeholder:text-mutedGray focus:outline-none focus:ring-1 focus:ring-warm"
                required
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider rounded-xl hover:bg-ink-light transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{t.footer.subscribeBtn}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <label className="flex items-start space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-borderCol text-ink focus:ring-warm"
              />
              <span className="text-[11px] text-mutedGray font-sans leading-relaxed">
                {t.footer.consentText}{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalType('privacy')}
                  className="text-ink underline hover:text-warm-dark transition-colors inline"
                >
                  {t.footer.privacy}
                </button>
              </span>
            </label>
          </form>
        )}
      </div>

      {legalModalType && (
        <LegalModalViewer
          isOpen={Boolean(legalModalType)}
          onClose={() => setLegalModalType(null)}
          type={legalModalType}
        />
      )}
    </>
  );
};
