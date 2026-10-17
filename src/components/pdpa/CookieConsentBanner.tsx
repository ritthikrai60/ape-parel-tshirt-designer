'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, Settings, ShieldCheck, ChevronRight } from 'lucide-react';
import {
  CookieConsentPreferences,
  getStoredConsent,
  saveStoredConsent,
} from '@/lib/consent';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { LegalModalViewer, LegalDocType } from './LegalModalViewer';
import { useToast } from '@/components/providers/ToastProvider';

export const CookieConsentBanner: React.FC = () => {
  const { toast } = useToast();
  const [hasChecked, setHasChecked] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [legalModalType, setLegalModalType] = useState<LegalDocType | null>(null);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      setShowBanner(true);
    }
    setHasChecked(true);

    const handleReset = () => {
      setShowBanner(true);
    };
    window.addEventListener('cookie_consent_reset', handleReset);
    return () => window.removeEventListener('cookie_consent_reset', handleReset);
  }, []);

  const handleAcceptAll = () => {
    saveStoredConsent({
      analytics: true,
      marketing: true,
    });
    setShowBanner(false);
    toast({
      type: 'success',
      title: 'ยอมรับคุกกี้ทั้งหมดแล้ว',
      message: 'ยินดีต้อนรับสู่ APE-PAREL ขอบคุณสำหรับการยินยอม',
    });
  };

  const handleRejectNonEssential = () => {
    saveStoredConsent({
      analytics: false,
      marketing: false,
    });
    setShowBanner(false);
    toast({
      type: 'info',
      title: 'บันทึกการตั้งค่าแล้ว',
      message: 'เปิดใช้งานเฉพาะคุกกี้ที่จำเป็นสำหรับการทำงานของระบบ',
    });
  };

  if (!hasChecked) return null;

  return (
    <>
      {showBanner && (
        <div
          role="region"
          aria-label="การขอความยินยอมคุกกี้"
          className="fixed bottom-0 inset-x-0 z-[9990] p-3 sm:p-5 pointer-events-none"
        >
          <div className="max-w-5xl mx-auto bg-paper/95 backdrop-blur-md border border-borderCol rounded-2xl shadow-2xl p-4 sm:p-5 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left Column: Description & Legal Links */}
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-warm/20 border border-warm/40 text-warm-dark flex-shrink-0 mt-0.5">
                  <Cookie className="w-5 h-5 text-amber-600" />
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-ink text-sm">การใช้งานคุกกี้และนโยบายความเป็นส่วนตัว</span>
                    <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      PDPA
                    </span>
                  </div>
                  <p className="text-mutedGray font-sans leading-relaxed max-w-3xl">
                    APE-PAREL ใช้คุกกี้เพื่อเพิ่มประสิทธิภาพในการใช้งาน จดจำตะกร้าสินค้าและการปรับแต่งเสื้อยืด 3D รวมถึงเพื่อการวิเคราะห์และนำเสนอสิทธิประโยชน์ที่ตรงใจท่าน ท่านสามารถศึกษารายละเอียดเพิ่มเติมได้ที่{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModalType('cookies')}
                      className="text-ink font-semibold underline hover:text-warm-dark transition-colors inline"
                    >
                      นโยบายคุกกี้
                    </button>{' '}
                    และ{' '}
                    <button
                      type="button"
                      onClick={() => setLegalModalType('privacy')}
                      className="text-ink font-semibold underline hover:text-warm-dark transition-colors inline"
                    >
                      นโยบายความเป็นส่วนตัว
                    </button>
                  </p>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-wrap items-center gap-2 self-end lg:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="px-3.5 py-2 text-xs font-mono font-semibold text-mutedGray hover:text-ink hover:bg-paper-dark border border-borderCol rounded-xl transition-colors flex items-center space-x-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>ตั้งค่าคุกกี้</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3.5 py-2 text-xs font-mono font-semibold text-ink bg-paper hover:bg-paper-dark border border-borderCol rounded-xl transition-colors"
                >
                  ปฏิเสธที่ไม่จำเป็น
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-xs font-mono font-bold text-paper bg-ink hover:bg-ink-light rounded-xl transition-colors shadow-sm"
                >
                  ยอมรับทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSaved={() => {
          setShowBanner(false);
          setShowPreferences(false);
        }}
        onOpenLegalDoc={(type) => setLegalModalType(type)}
      />

      {/* Legal Modal Viewer */}
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
