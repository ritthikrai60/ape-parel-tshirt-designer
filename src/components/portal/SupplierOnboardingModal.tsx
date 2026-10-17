'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  X,
  Factory,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Phone,
  Clock,
  AtSign,
  FileText,
  Upload,
  CheckCircle2,
  Building,
  Image as ImageIcon,
} from 'lucide-react';

export interface SupplierOnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (supplier: any) => void;
  initialUser?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export const SupplierOnboardingModal: React.FC<SupplierOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialUser,
}) => {
  const router = useRouter();
  const { data: session, update } = useSession();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/supplier/dashboard');
    }
  };

  const effectiveUser = initialUser || session?.user;
  const isAuthenticated = Boolean(effectiveUser?.id);

  const [companyName, setCompanyName] = useState(effectiveUser?.name || '');
  const [slug, setSlug] = useState('');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState(4);

  // Document URLs
  const [dbdDocUrl, setDbdDocUrl] = useState('');
  const [vatDocUrl, setVatDocUrl] = useState('');
  const [bankBookDocUrl, setBankBookDocUrl] = useState('');
  const [machineryPhotoUrl, setMachineryPhotoUrl] = useState('');

  // Uploading progress indicators
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [submittedSupplier, setSubmittedSupplier] = useState<any | null>(null);

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    if (autoSlug) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setSlug(
      e.target.value
        .toLowerCase()
        .replace(/[^\w-]/g, '')
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setUploadingDoc(docType);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    try {
      const res = await fetch('/api/supplier/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }

      if (docType === 'DBD') setDbdDocUrl(data.url);
      if (docType === 'VAT') setVatDocUrl(data.url);
      if (docType === 'BANK') setBankBookDocUrl(data.url);
      if (docType === 'MACHINERY') setMachineryPhotoUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Keyboard navigation & accessibility: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || companyName.trim().length < 2) {
      setError('Company name must be at least 2 characters long.');
      return;
    }

    if (!slug.trim() || slug.trim().length < 2) {
      setError('A valid supplier handle/slug is required.');
      return;
    }

    if (!location.trim() || location.trim().length < 3) {
      setError('Factory location is required (e.g. Bangkok, Thailand).');
      return;
    }

    if (taxId.trim() && !/^[0-9]{13}$/.test(taxId.trim())) {
      setError('เลขทะเบียนนิติบุคคล / Tax ID ต้องเป็นตัวเลข 13 หลัก');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/supplier/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          slug: slug.trim(),
          location: location.trim(),
          contactPhone: contactPhone.trim(),
          taxId: taxId.trim() || undefined,
          dbdDocUrl: dbdDocUrl || undefined,
          vatDocUrl: vatDocUrl || undefined,
          bankBookDocUrl: bankBookDocUrl || undefined,
          machineryPhotos: machineryPhotoUrl ? JSON.stringify([machineryPhotoUrl]) : undefined,
          leadTimeDays: Number(leadTimeDays) || 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to complete supplier onboarding.');
        setIsSubmitting(false);
        return;
      }

      if (update) {
        try {
          await update({ role: 'SUPPLIER' });
        } catch {
          // Ignore in environments without live session update
        }
      }

      setSubmittedSupplier(data.supplier);
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(data.supplier);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error occurred while creating supplier profile.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-onboard-title"
      className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-paper-light border border-borderCol w-full max-w-xl rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col space-y-5 relative overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top industrial gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warm via-ink to-warm-dark" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-borderCol/70 pb-4 pt-1">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                <Factory className="w-3 h-3 text-ink" />
                <span>APE-PAREL // SUPPLIER PORTAL ONBOARDING</span>
              </span>
            </div>
            <h2 id="supplier-onboard-title" className="text-xl font-sans font-black tracking-tight text-ink">
              Register Factory & Print Facility
            </h2>
            <p className="font-mono text-xs text-mutedGray">
              เชื่อมต่อสายการผลิตเสื้อยืดเปล่า, โรงพิมพ์ DTG, และส่งมอบเอกสารนิติบุคคล (KYB)
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close supplier onboarding wizard"
            className="p-1.5 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark border border-transparent hover:border-borderCol transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen if submitted */}
        {submittedSupplier ? (
          <div className="p-6 bg-paper rounded-xl border border-borderCol flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold font-sans text-ink">
                ยื่นเอกสารโรงงานสำเร็จเรียบร้อย!
              </h3>
              <p className="font-mono text-xs text-mutedGray max-w-md">
                ข้อมูลโรงงาน <strong>{submittedSupplier.companyName}</strong> และเอกสารยืนยันตัวตนได้ถูกบันทึกเข้าสู่ระบบแล้ว
              </p>
            </div>

            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left font-mono text-xs text-amber-900 space-y-2">
              <div className="flex items-center space-x-1.5 font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>สถานะ: รอการตรวจสอบ (Pending Admin Review)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 font-sans">
                เจ้าหน้าที่ฝ่ายตรวจสอบคุณภาพและบัญชีจะตรวจสอบเอกสารนิติบุคคลและเครื่องจักรของท่านภายใน 1–2 วันทำการ เมื่อได้รับการอนุมัติ โรงงานของท่านจะเปิดให้ลูกค้าเลือกสั่งผลิตในระบบ 3D Studio ทันที
              </p>
            </div>

            <div className="pt-2 w-full flex justify-center">
              <button
                type="button"
                onClick={() => {
                  router.push(`/supplier/dashboard?supplier=${encodeURIComponent(submittedSupplier.slug)}`);
                  router.refresh();
                  handleClose();
                }}
                className="py-2.5 px-6 bg-ink text-paper rounded-xl font-mono text-xs font-bold hover:bg-ink/90 transition-colors"
              >
                เข้าสู่ Supplier Dashboard →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Error alert */}
            {error && (
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/30 text-red-900 px-4 py-3 rounded-xl flex items-start space-x-2.5 text-xs font-mono"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Onboarding Form */}
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              {/* Section 1: Factory Basics */}
              <div className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-mutedGray font-bold border-b border-borderCol/50 pb-1">
                  1. ข้อมูลพื้นฐานโรงงาน (Factory Details)
                </h3>

                {/* Company Name */}
                <div className="flex flex-col space-y-1">
                  <label htmlFor="supplier-company-name" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                    ชื่อบริษัท / โรงงานผู้ผลิต *
                  </label>
                  <input
                    id="supplier-company-name"
                    type="text"
                    required
                    value={companyName}
                    onChange={handleCompanyNameChange}
                    placeholder="เช่น บริษัท บางกอก การ์เมนท์ คราฟท์ จำกัด"
                    className="w-full px-3.5 py-2.5 bg-paper border border-borderCol focus:border-ink focus:ring-1 focus:ring-ink rounded-xl font-sans text-sm text-ink placeholder:text-mutedGray/70 transition-colors"
                  />
                </div>

                {/* Slug & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label htmlFor="supplier-slug" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                      Supplier Slug / ID *
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="supplier-slug"
                        type="text"
                        required
                        value={slug}
                        onChange={handleSlugChange}
                        placeholder="bangkok-garment"
                        className="w-full pl-10 pr-3 py-2 bg-paper border border-borderCol focus:border-ink rounded-xl font-mono text-xs text-ink transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label htmlFor="supplier-location" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                      ที่ตั้งโรงงาน *
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="supplier-location"
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="พระโขนง, กรุงเทพฯ"
                        className="w-full pl-10 pr-3 py-2 bg-paper border border-borderCol focus:border-ink rounded-xl font-sans text-xs text-ink transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax ID & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col space-y-1">
                    <label htmlFor="supplier-tax-id" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                      เลขประจำตัวผู้เสียภาษี (Tax ID)
                    </label>
                    <input
                      id="supplier-tax-id"
                      type="text"
                      maxLength={13}
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="เลข 13 หลัก (เช่น 0105558012345)"
                      className="w-full px-3 py-2 bg-paper border border-borderCol focus:border-ink rounded-xl font-mono text-xs text-ink transition-colors"
                    />
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label htmlFor="supplier-phone" className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-mutedGray absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="supplier-phone"
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="02-712-9940 หรือ 081-xxx-xxxx"
                        className="w-full pl-10 pr-3 py-2 bg-paper border border-borderCol focus:border-ink rounded-xl font-mono text-xs text-ink transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Verification Documents (KYB) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-borderCol/50 pb-1">
                  <h3 className="font-mono text-xs uppercase tracking-wider text-mutedGray font-bold">
                    2. เอกสารยืนยันตัวตน (KYB Verification Documents)
                  </h3>
                  <span className="text-[10px] text-mutedGray font-mono">PDF, JPG, PNG (Max 10MB)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* DBD Doc */}
                  <div className="p-3 bg-paper border border-borderCol rounded-xl flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">หนังสือรับรอง DBD</span>
                      {dbdDocUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <label className="cursor-pointer border border-dashed border-borderCol hover:border-ink rounded-lg p-2 text-center text-xs text-mutedGray hover:text-ink transition-colors block">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'DBD')}
                      />
                      {uploadingDoc === 'DBD' ? (
                        <span>กำลังอัปโหลด...</span>
                      ) : dbdDocUrl ? (
                        <span className="text-emerald-700 font-mono text-[11px]">✓ อัปโหลดสำเร็จ (เปลี่ยนไฟล์)</span>
                      ) : (
                        <span className="flex items-center justify-center space-x-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>เลือกไฟล์หนังสือรับรอง</span>
                        </span>
                      )}
                    </label>
                  </div>

                  {/* VAT Doc */}
                  <div className="p-3 bg-paper border border-borderCol rounded-xl flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">ใบ ภ.พ.20 (VAT)</span>
                      {vatDocUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <label className="cursor-pointer border border-dashed border-borderCol hover:border-ink rounded-lg p-2 text-center text-xs text-mutedGray hover:text-ink transition-colors block">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'VAT')}
                      />
                      {uploadingDoc === 'VAT' ? (
                        <span>กำลังอัปโหลด...</span>
                      ) : vatDocUrl ? (
                        <span className="text-emerald-700 font-mono text-[11px]">✓ อัปโหลดสำเร็จ (เปลี่ยนไฟล์)</span>
                      ) : (
                        <span className="flex items-center justify-center space-x-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>เลือกไฟล์ ภ.พ.20</span>
                        </span>
                      )}
                    </label>
                  </div>

                  {/* Bank Book Doc */}
                  <div className="p-3 bg-paper border border-borderCol rounded-xl flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">หน้าสมุดบัญชีธนาคาร</span>
                      {bankBookDocUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <label className="cursor-pointer border border-dashed border-borderCol hover:border-ink rounded-lg p-2 text-center text-xs text-mutedGray hover:text-ink transition-colors block">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'BANK')}
                      />
                      {uploadingDoc === 'BANK' ? (
                        <span>กำลังอัปโหลด...</span>
                      ) : bankBookDocUrl ? (
                        <span className="text-emerald-700 font-mono text-[11px]">✓ อัปโหลดสำเร็จ (เปลี่ยนไฟล์)</span>
                      ) : (
                        <span className="flex items-center justify-center space-x-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>เลือกไฟล์สมุดบัญชี</span>
                        </span>
                      )}
                    </label>
                  </div>

                  {/* Machinery Photo */}
                  <div className="p-3 bg-paper border border-borderCol rounded-xl flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">รูปถ่ายเครื่องจักร DTG</span>
                      {machineryPhotoUrl && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <label className="cursor-pointer border border-dashed border-borderCol hover:border-ink rounded-lg p-2 text-center text-xs text-mutedGray hover:text-ink transition-colors block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'MACHINERY')}
                      />
                      {uploadingDoc === 'MACHINERY' ? (
                        <span>กำลังอัปโหลด...</span>
                      ) : machineryPhotoUrl ? (
                        <span className="text-emerald-700 font-mono text-[11px]">✓ อัปโหลดสำเร็จ (เปลี่ยนรูป)</span>
                      ) : (
                        <span className="flex items-center justify-center space-x-1">
                          <Upload className="w-3.5 h-3.5" />
                          <span>เลือกภาพถ่ายเครื่องพิมพ์</span>
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-borderCol flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-6 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งเอกสารสมัครโรงงาน'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
