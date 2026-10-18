'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  User,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';

export interface CreatorProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: {
    id: string;
    slug: string;
    displayName: string;
    bio?: string | null;
    avatarUrl?: string | null;
    website?: string | null;
    payoutDetails?: string | null;
  };
  onProfileUpdated: (updated: {
    displayName: string;
    bio?: string | null;
    website?: string | null;
    payoutDetails: string;
    avatarUrl?: string | null;
  }) => void;
}

export const CreatorProfileSettingsModal: React.FC<CreatorProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  creator,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(creator.displayName || '');
  const [bio, setBio] = useState(creator.bio || '');
  const [website, setWebsite] = useState(creator.website || '');
  const [payoutDetails, setPayoutDetails] = useState(creator.payoutDetails || '');

  const [activeTab, setActiveTab] = useState<'financial' | 'personal'>('financial');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('ชื่อที่แสดง (Display Name) ต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
      return;
    }

    if (!payoutDetails.trim() || payoutDetails.trim().length < 5) {
      setError('กรุณากรอกข้อมูลพร้อมเพย์ หรือเลขที่บัญชีธนาคารให้ถูกต้องครบถ้วน (อย่างน้อย 5 ตัวอักษร)');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/creator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          displayName: displayName.trim(),
          bio: bio.trim() || null,
          website: website.trim() || null,
          payoutDetails: payoutDetails.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update creator profile');
      }

      setSuccessNotice('บันทึกข้อมูลส่วนตัวและบัญชีการเงินเรียบร้อยแล้ว');
      onProfileUpdated({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        website: website.trim() || null,
        payoutDetails: payoutDetails.trim(),
        avatarUrl: creator.avatarUrl,
      });

      setTimeout(() => {
        setSuccessNotice(null);
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-paper border border-borderCol rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-borderCol bg-paper-dark/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-warm/20 text-warm flex items-center justify-center border border-warm/40">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-lg font-bold text-ink font-sans">
                ตั้งค่าโปรไฟล์ & ข้อมูลการเงิน (Creator Settings)
              </h2>
              <p className="font-mono text-xs text-mutedGray">
                จัดการบัญชีรับเงินส่วนแบ่งลิขสิทธิ์ และข้อมูลสตูดิโอของคุณ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-mutedGray hover:text-ink rounded-lg hover:bg-paper-dark transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-borderCol px-6 pt-2 bg-paper gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`pb-3 font-mono text-xs uppercase font-bold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'financial'
                ? 'border-warm text-ink'
                : 'border-transparent text-mutedGray hover:text-ink'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>บัญชีการเงิน & พร้อมเพย์</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`pb-3 font-mono text-xs uppercase font-bold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'personal'
                ? 'border-warm text-ink'
                : 'border-transparent text-mutedGray hover:text-ink'
            }`}
          >
            <User className="w-4 h-4" />
            <span>ข้อมูลส่วนตัว & แบรนด์</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-warm/10 border border-warm/30 space-y-2">
                <div className="flex items-center space-x-2 text-ink font-bold text-xs font-mono">
                  <Lock className="w-4 h-4 text-warm" />
                  <span>มาตรการความปลอดภัยทางการเงิน (Banking Privacy)</span>
                </div>
                <p className="text-xs text-mutedGray leading-relaxed">
                  ข้อมูลบัญชีธนาคารและพร้อมเพย์จะถูกเก็บเป็นความลับสูงสุด จะไม่แสดงในหน้าร้านสาธารณะ (Public Storefront) หรือใน Marketplace Catalog โดยจะใช้สำหรับการโอนเงินส่วนแบ่งลิขสิทธิ์ (85% Royalty Settlement) และเอกสารหักภาษี ณ ที่จ่าย (50 ทวิ) เท่านั้น
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                  บัญชีรับเงิน / หมายเลขพร้อมเพย์ (Payout Destination) *
                </label>
                <input
                  type="text"
                  required
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder="เช่น PromptPay: 081-234-5678 หรือ KBANK 123-4-56789-0 (ชื่อบัญชี)"
                  className="w-full px-4 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                />
                <p className="mt-1.5 text-[11px] font-mono text-mutedGray">
                  รองรับ: เบอร์โทรศัพท์/เลขประจำตัวประชาชนพร้อมเพย์ หรือ บัญชีธนาคารพาณิชย์ในประเทศไทยทุกแห่ง
                </p>
              </div>

              {/* Sample quick picks */}
              <div className="pt-2">
                <span className="block font-mono text-[11px] text-mutedGray mb-2">
                  คำแนะนำรูปแบบการกรอก:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div
                    onClick={() => {
                      if (!payoutDetails) setPayoutDetails('PromptPay: 08x-xxx-xxxx');
                    }}
                    className="p-2.5 rounded-lg border border-borderCol bg-paper-dark/30 hover:border-warm/60 cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-ink block">พร้อมเพย์มือถือ / ปชช.</span>
                    <span className="text-[11px] text-mutedGray">PromptPay: 081-xxx-xxxx</span>
                  </div>
                  <div
                    onClick={() => {
                      if (!payoutDetails) setPayoutDetails('KBANK: xxx-x-xxxxx-x (ชื่อ-นามสกุล)');
                    }}
                    className="p-2.5 rounded-lg border border-borderCol bg-paper-dark/30 hover:border-warm/60 cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-ink block">บัญชีธนาคารไทย</span>
                    <span className="text-[11px] text-mutedGray">SCB/KBANK/BBL: xxx-x-xxxxx-x</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                  ชื่อสตูดิโอ / นามปากกา (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น Tokyo Street Club"
                  className="w-full px-4 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                  Creator Slug / Handle (ไม่สามารถแก้ไขได้)
                </label>
                <input
                  type="text"
                  disabled
                  value={`@${creator.slug}`}
                  className="w-full px-4 py-2.5 bg-paper-dark/60 border border-borderCol rounded-xl text-xs font-mono text-mutedGray cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] font-mono text-mutedGray">
                  URL หน้าร้านของคุณ: /marketplace/creator/{creator.slug}
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                  คำแนะนำตัว / สไตล์ผลงาน (Bio)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="บอกเล่าเรื่องราว สไตล์งานศิลปะ หรือแรงบันดาลใจในการออกแบบของคุณ..."
                  className="w-full px-4 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm resize-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                  เว็บไซต์ / Portfolio / Social Link
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-mutedGray absolute left-3 top-3" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://instagram.com/yourhandle หรือ https://yourportfolio.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-borderCol flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-borderCol rounded-xl text-xs font-mono uppercase font-bold text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-ink text-paper rounded-xl text-xs font-mono uppercase font-bold hover:bg-ink-light transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-warm" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
