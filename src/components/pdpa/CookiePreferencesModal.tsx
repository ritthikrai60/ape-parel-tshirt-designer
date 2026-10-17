'use client';

import React, { useState, useEffect } from 'react';
import { X, Cookie, Shield, BarChart3, Target, Check } from 'lucide-react';
import {
  CookieConsentPreferences,
  getStoredConsent,
  saveStoredConsent,
} from '@/lib/consent';
import { useToast } from '@/components/providers/ToastProvider';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (prefs: CookieConsentPreferences) => void;
  onOpenLegalDoc?: (type: 'privacy' | 'terms' | 'cookies') => void;
}

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onOpenLegalDoc,
}) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredConsent();
      if (stored) {
        setAnalytics(stored.analytics);
        setMarketing(stored.marketing);
      } else {
        setAnalytics(false);
        setMarketing(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const saved = saveStoredConsent({
      analytics,
      marketing,
    });
    toast({
      type: 'success',
      title: 'บันทึกการตั้งค่าคุกกี้แล้ว',
      message: 'ระบบได้อัปเดตความยินยอมการใช้งานคุกกี้ตามที่คุณกำหนดเรียบร้อยแล้ว',
    });
    if (onSaved) onSaved(saved);
    onClose();
  };

  const handleAcceptAll = () => {
    const saved = saveStoredConsent({
      analytics: true,
      marketing: true,
    });
    toast({
      type: 'success',
      title: 'ยินยอมคุกกี้ทั้งหมดแล้ว',
      message: 'ขอบคุณที่เปิดรับประสบการณ์การใช้งานแบบเต็มรูปแบบ',
    });
    if (onSaved) onSaved(saved);
    onClose();
  };

  const handleRejectAll = () => {
    const saved = saveStoredConsent({
      analytics: false,
      marketing: false,
    });
    toast({
      type: 'info',
      title: 'เปิดเฉพาะคุกกี้ที่จำเป็น',
      message: 'ระบบจะใช้งานเฉพาะคุกกี้ที่จำเป็นสำหรับการทำงานพื้นฐานเท่านั้น',
    });
    if (onSaved) onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-paper-light border border-borderCol rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderCol flex items-center justify-between bg-paper">
          <div className="flex items-center space-x-2.5">
            <Cookie className="w-5 h-5 text-amber-600" />
            <div>
              <h3 id="cookie-settings-title" className="font-sans font-bold text-sm text-ink">
                ตั้งค่าความยินยอมคุกกี้ (Cookie Preferences)
              </h3>
              <p className="text-[11px] font-mono text-mutedGray">
                ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-mutedGray hover:text-ink p-1.5 rounded-lg hover:bg-paper-dark transition-colors"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-mutedGray leading-relaxed font-sans">
            ท่านสามารถเลือกปรับแต่งการยินยอมใช้งานคุกกี้แต่ละหมวดหมู่ได้ตามความต้องการ ข้อมูลการตั้งค่าจะถูกจัดเก็บไว้ และท่านสามารถกลับมาแก้ไขได้ทุกเมื่อผ่านปุ่ม &quot;ตั้งค่าคุกกี้&quot; ที่ส่วนท้ายของเว็บไซต์
          </p>

          {/* Category 1: Necessary */}
          <div className="p-4 bg-paper rounded-xl border border-borderCol/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-ink">คุกกี้ที่จำเป็นอย่างยิ่ง (Strictly Necessary)</span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                เปิดใช้งานเสมอ
              </span>
            </div>
            <p className="text-mutedGray text-[11px] leading-relaxed">
              จำเป็นต่อความปลอดภัยของระบบ การเข้าสู่ระบบ เซสชันตะกร้าสินค้า และการทำงานของห้องปรับแต่งลายเสื้อ 3D ไม่สามารถปิดได้
            </p>
          </div>

          {/* Category 2: Analytics */}
          <div className="p-4 bg-paper rounded-xl border border-borderCol/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-ink">คุกกี้เพื่อการวิเคราะห์และวัดผล (Analytics)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-borderCol peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ink"></div>
              </label>
            </div>
            <p className="text-mutedGray text-[11px] leading-relaxed">
              ช่วยให้เราเข้าใจการใช้งานเว็บไซต์ เช่น จำนวนผู้เข้าชมและหน้าที่ได้รับความสนใจ เพื่อนำไปปรับปรุงประสิทธิภาพและความเร็วของระบบ
            </p>
          </div>

          {/* Category 3: Marketing */}
          <div className="p-4 bg-paper rounded-xl border border-borderCol/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-ink">คุกกี้เพื่อการตลาดและโฆษณา (Marketing)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-borderCol peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ink"></div>
              </label>
            </div>
            <p className="text-mutedGray text-[11px] leading-relaxed">
              ช่วยให้ท่านได้รับข่าวสาร โปรโมชั่น และดีลสินค้าใหม่ที่ตรงกับความสนใจของท่าน
            </p>
          </div>

          {/* Legal Links */}
          <div className="pt-2 flex items-center space-x-3 text-[11px] font-mono text-mutedGray">
            <span>อ่านเพิ่มเติม:</span>
            <button
              type="button"
              onClick={() => onOpenLegalDoc?.('privacy')}
              className="text-ink underline hover:text-warm-dark transition-colors"
            >
              นโยบายความเป็นส่วนตัว
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalDoc?.('cookies')}
              className="text-ink underline hover:text-warm-dark transition-colors"
            >
              นโยบายคุกกี้
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-borderCol flex flex-wrap items-center justify-between gap-2.5 bg-paper">
          <button
            type="button"
            onClick={handleRejectAll}
            className="px-3.5 py-2 text-xs font-mono font-semibold text-mutedGray hover:text-ink hover:bg-paper-dark border border-borderCol rounded-xl transition-colors"
          >
            ปฏิเสธที่ไม่จำเป็น
          </button>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-3.5 py-2 text-xs font-mono font-semibold text-ink bg-paper hover:bg-paper-dark border border-borderCol rounded-xl transition-colors"
            >
              ยอมรับทั้งหมด
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-mono font-bold text-paper bg-ink hover:bg-ink-light rounded-xl transition-colors shadow-sm"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
