'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  User,
  Globe,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  QrCode,
  Building2,
  Phone,
  FileCheck,
} from 'lucide-react';
import {
  THAI_BANKS,
  PayoutMethodType,
  PromptPayIdType,
  parsePayoutDetails,
  buildCanonicalPayoutDetails,
  validatePayoutInput,
  formatThaiPhone,
  formatThaiCitizenId,
  formatBankAccount,
  cleanDigits,
} from '@/lib/payoutUtils';

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
  // Parse initial payout details into structured state
  const initialParsed = parsePayoutDetails(creator.payoutDetails);

  const [displayName, setDisplayName] = useState(creator.displayName || '');
  const [bio, setBio] = useState(creator.bio || '');
  const [website, setWebsite] = useState(creator.website || '');

  // Structured Financial State
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethodType>(initialParsed.method);
  const [promptPayType, setPromptPayType] = useState<PromptPayIdType>(initialParsed.promptPayType || 'PHONE');
  const [promptPayNumber, setPromptPayNumber] = useState(initialParsed.promptPayNumber || '');
  const [bankCode, setBankCode] = useState(initialParsed.bankCode || 'KBANK');
  const [bankAccountNumber, setBankAccountNumber] = useState(initialParsed.bankAccountNumber || '');
  const [accountName, setAccountName] = useState(initialParsed.accountName || '');

  const [activeTab, setActiveTab] = useState<'financial' | 'personal'>('financial');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePromptPayNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = cleanDigits(e.target.value);
    const maxLen = promptPayType === 'CITIZEN_ID' ? 13 : 10;
    setPromptPayNumber(raw.slice(0, maxLen));
  };

  const handleBankAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = cleanDigits(e.target.value);
    setBankAccountNumber(raw.slice(0, 12));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('ชื่อที่แสดง (Display Name) ต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
      return;
    }

    // Validate structured financial input
    const financialError = validatePayoutInput({
      method: payoutMethod,
      promptPayType,
      promptPayNumber,
      bankCode,
      bankAccountNumber,
      accountName,
    });

    if (financialError) {
      setError(financialError);
      return;
    }

    // Build standard canonical payout string
    const canonicalPayout = buildCanonicalPayoutDetails({
      method: payoutMethod,
      promptPayType,
      promptPayNumber,
      bankCode,
      bankAccountNumber,
      accountName,
    });

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
          payoutDetails: canonicalPayout,
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
        payoutDetails: canonicalPayout,
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
      <div className="bg-paper border border-borderCol rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
            <div className="space-y-5">
              {/* Security Banner */}
              <div className="p-3.5 rounded-xl bg-warm/10 border border-warm/30 flex items-start space-x-2.5">
                <Lock className="w-4 h-4 text-warm shrink-0 mt-0.5" />
                <div className="text-xs text-mutedGray leading-relaxed">
                  <strong className="text-ink font-mono font-bold block mb-0.5">Banking Privacy Standard</strong>
                  ข้อมูลบัญชีนี้ถูกเก็บเป็นความลับสูงสุด จะไม่แสดงในหน้าสาธารณะ ใช้สำหรับโอนยอดส่วนแบ่งค่าลิขสิทธิ์ (85% Royalty) และออกเอกสารภาษี 50 ทวิเท่านั้น
                </div>
              </div>

              {/* Step 1: Select Method Toggle */}
              <div>
                <label className="block font-mono text-xs uppercase font-bold text-ink mb-2">
                  1. เลือกช่องทางการรับเงิน (Payout Method) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('PROMPTPAY')}
                    className={`p-3.5 rounded-xl border flex items-center space-x-3 text-left transition-all ${
                      payoutMethod === 'PROMPTPAY'
                        ? 'border-warm bg-warm/15 shadow-sm'
                        : 'border-borderCol bg-paper hover:bg-paper-dark'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-sans font-bold text-xs text-ink block">พร้อมเพย์ (PromptPay)</span>
                      <span className="font-mono text-[10px] text-mutedGray">เบอร์โทรศัพท์ / บัตร ปชช.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`p-3.5 rounded-xl border flex items-center space-x-3 text-left transition-all ${
                      payoutMethod === 'BANK_TRANSFER'
                        ? 'border-warm bg-warm/15 shadow-sm'
                        : 'border-borderCol bg-paper hover:bg-paper-dark'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-sans font-bold text-xs text-ink block">บัญชีธนาคารไทย</span>
                      <span className="font-mono text-[10px] text-mutedGray">โอนเข้าบัญชีธนาคารพาณิชย์</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Method Specific Fields */}
              {payoutMethod === 'PROMPTPAY' ? (
                <div className="space-y-4 p-4 rounded-xl border border-borderCol bg-paper-dark/20">
                  <div>
                    <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                      ประเภทบัญชีพร้อมเพย์ *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer text-ink">
                        <input
                          type="radio"
                          name="promptPayType"
                          checked={promptPayType === 'PHONE'}
                          onChange={() => {
                            setPromptPayType('PHONE');
                            setPromptPayNumber('');
                          }}
                          className="accent-warm"
                        />
                        <span>เบอร์โทรศัพท์มือถือ (10 หลัก)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer text-ink">
                        <input
                          type="radio"
                          name="promptPayType"
                          checked={promptPayType === 'CITIZEN_ID'}
                          onChange={() => {
                            setPromptPayType('CITIZEN_ID');
                            setPromptPayNumber('');
                          }}
                          className="accent-warm"
                        />
                        <span>เลขบัตรประจำตัวประชาชน (13 หลัก)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                      {promptPayType === 'PHONE' ? 'หมายเลขโทรศัพท์มือถือ *' : 'เลขประจำตัวประชาชน 13 หลัก *'}
                    </label>
                    <div className="relative">
                      {promptPayType === 'PHONE' ? (
                        <Phone className="w-4 h-4 text-mutedGray absolute left-3.5 top-3" />
                      ) : (
                        <FileCheck className="w-4 h-4 text-mutedGray absolute left-3.5 top-3" />
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={
                          promptPayType === 'PHONE'
                            ? formatThaiPhone(promptPayNumber)
                            : formatThaiCitizenId(promptPayNumber)
                        }
                        onChange={handlePromptPayNumberChange}
                        placeholder={promptPayType === 'PHONE' ? '081-234-5678' : '1-2345-67890-12-3'}
                        className="w-full pl-10 pr-4 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] font-mono text-mutedGray">
                      ระบบจะจัดฟอร์แม็ตและตรวจสอบความถูกต้องอัตโนมัติ เพื่อสร้าง PromptPay QR Code ที่ถูกต้อง
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 rounded-xl border border-borderCol bg-paper-dark/20">
                  <div>
                    <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                      ธนาคารพาณิชย์ *
                    </label>
                    <select
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                    >
                      {THAI_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.nameTh} - {b.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                      เลขที่บัญชีธนาคาร (10-12 หลัก) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={formatBankAccount(bankAccountNumber)}
                      onChange={handleBankAccountChange}
                      placeholder="123-4-56789-0"
                      className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase font-bold text-ink mb-1.5">
                      ชื่อ-นามสกุล เจ้าของบัญชี (Account Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="เช่น นาย สมชาย ใจดี หรือ SOMCHAI JAIDEE"
                      className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm"
                    />
                    <p className="mt-1 text-[11px] font-mono text-mutedGray">
                      ต้องตรงกับหน้าสมุดบัญชีธนาคารเพื่อความถูกต้องในการโอนเงินและออกหนังสือหักภาษี ณ ที่จ่าย (50 ทวิ)
                    </p>
                  </div>
                </div>
              )}

              {/* Canonical Preview Box */}
              <div className="p-3 bg-paper-dark/40 rounded-xl border border-borderCol text-xs font-mono">
                <span className="text-mutedGray block text-[11px] uppercase mb-1">
                  ตัวอย่างข้อมูลที่จะบันทึกเข้าระบบการเงิน:
                </span>
                <span className="text-ink font-bold font-mono">
                  {buildCanonicalPayoutDetails({
                    method: payoutMethod,
                    promptPayType,
                    promptPayNumber,
                    bankCode,
                    bankAccountNumber,
                    accountName,
                  })}
                </span>
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
