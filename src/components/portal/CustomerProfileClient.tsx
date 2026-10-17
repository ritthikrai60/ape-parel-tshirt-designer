'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  MapPin,
  FileText,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ShoppingBag,
  Bookmark,
  MessageSquare,
  ShieldCheck,
  Building,
  AlertTriangle,
} from 'lucide-react';

interface ProfileData {
  id: string;
  email: string;
  emailVerified: string | null;
  name: string | null;
  phone: string | null;
  role: string;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingPostal: string | null;
  shippingCountry: string | null;
  taxId: string | null;
  billingName: string | null;
  billingAddress: string | null;
}

export function CustomerProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingProvince: '',
    shippingPostal: '',
    shippingCountry: 'TH',
    taxId: '',
    billingName: '',
    billingAddress: '',
  });

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [isVerified, setIsVerified] = useState(false);
  const [isSendingVerify, setIsSendingVerify] = useState(false);
  const [verifySentNotice, setVerifySentNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login?callbackUrl=/account/profile';
          return;
        }
        throw new Error('Failed to load profile');
      }
      const data = await res.json();
      const p: ProfileData = data.profile;
      setEmail(p.email || '');
      setRole(p.role || 'CUSTOMER');
      setIsVerified(!!p.emailVerified);
      setForm({
        name: p.name || '',
        phone: p.phone || '',
        shippingName: p.shippingName || p.name || '',
        shippingPhone: p.shippingPhone || p.phone || '',
        shippingAddress: p.shippingAddress || '',
        shippingCity: p.shippingCity || '',
        shippingProvince: p.shippingProvince || '',
        shippingPostal: p.shippingPostal || '',
        shippingCountry: p.shippingCountry || 'TH',
        taxId: p.taxId || '',
        billingName: p.billingName || '',
        billingAddress: p.billingAddress || '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setIsSendingVerify(true);
    setVerifySentNotice(null);
    try {
      const res = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification email');
      setVerifySentNotice('✓ ส่งลิงก์ยืนยันไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมาย (มีอายุ 24 ชม.)');
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน');
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleCopyPersonalToShipping = () => {
    setForm((prev) => ({
      ...prev,
      shippingName: prev.name,
      shippingPhone: prev.phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || resData.error || 'Failed to update profile');
      }

      setSuccessMessage('บันทึกข้อมูลโปรไฟล์และที่อยู่จัดส่งเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-3 font-mono">
        <RefreshCw className="w-8 h-8 animate-spin text-ink" />
        <p className="text-sm text-mutedGray">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-borderCol pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-mutedGray uppercase tracking-wider mb-1">
            <span>Customer Account</span>
            <span>&bull;</span>
            <span className="text-warm-dark font-bold">{role}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans text-ink">
            โปรไฟล์ & ข้อมูลการจัดส่ง (Profile & Addresses)
          </h1>
          <p className="text-xs sm:text-sm text-mutedGray font-mono mt-1">
            จัดการข้อมูลส่วนตัว ที่อยู่จัดส่งพัสดุสำหรับคำสั่งซื้อ และข้อมูลออกใบเสร็จ/ใบกำกับภาษี
          </p>
        </div>

        {/* Quick Nav Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/account/orders"
            className="px-3 py-1.5 rounded-xl border border-borderCol bg-paper-light hover:bg-paper-dark font-mono text-xs text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-mutedGray" />
            <span>คำสั่งซื้อของฉัน</span>
          </Link>
          <Link
            href="/account/vault"
            className="px-3 py-1.5 rounded-xl border border-borderCol bg-paper-light hover:bg-paper-dark font-mono text-xs text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5 text-warm-dark" />
            <span>Design Vault</span>
          </Link>
          <Link
            href="/account/inbox"
            className="px-3 py-1.5 rounded-xl border border-borderCol bg-paper-light hover:bg-paper-dark font-mono text-xs text-ink flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>กล่องข้อความ</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs font-mono">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3 text-rose-800 text-xs font-mono">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: ข้อมูลส่วนตัว (Personal Details) */}
        <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-borderCol pb-4">
            <div className="p-2 rounded-xl bg-warm/20 text-warm-dark">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans text-ink">
                1. ข้อมูลส่วนตัว (Personal Details)
              </h2>
              <p className="text-xs text-mutedGray font-mono">
                ข้อมูลบัญชีผู้ใช้งานและการยืนยันตัวตน
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                ชื่อ-นามสกุล (Full Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                อีเมล (Email Address)
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2.5 bg-paper-dark border border-borderCol rounded-xl text-xs font-mono text-mutedGray cursor-not-allowed"
                />
                {isVerified ? (
                  <span className="absolute right-3 top-2.5 flex items-center space-x-1 text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="absolute right-3 top-2.5 flex items-center space-x-1 text-[10px] font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>

              {!isVerified && (
                <div className="mt-2 space-y-1">
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-800 font-semibold">⚠️ ยังไม่ได้ยืนยันที่อยู่อีเมลนี้</span>
                    <button
                      type="button"
                      onClick={handleSendVerificationEmail}
                      disabled={isSendingVerify}
                      className="text-warm-dark font-bold hover:underline flex items-center space-x-1"
                    >
                      {isSendingVerify ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>กำลังส่งลิงก์...</span>
                        </>
                      ) : (
                        <span>คลิกเพื่อส่งลิงก์ยืนยันอีเมล &rarr;</span>
                      )}
                    </button>
                  </div>
                  {verifySentNotice && (
                    <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                      {verifySentNotice}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                เบอร์โทรศัพท์ติดต่อ (Phone Number)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="เช่น 081-234-5678"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
              <p className="text-[10px] text-mutedGray font-mono mt-1">
                ใช้สำหรับรับ SMS แจ้งเตือนสถานะคำสั่งซื้อและการจัดส่ง
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: ที่อยู่จัดส่งหลัก (Default Shipping Address) */}
        <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-borderCol pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-warm/20 text-warm-dark">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold font-sans text-ink">
                  2. ที่อยู่จัดส่งเริ่มต้น (Default Shipping Address)
                </h2>
                <p className="text-xs text-mutedGray font-mono">
                  ข้อมูลนี้จะถูกนำไปกรอกอัตโนมัติในหน้าชำระเงิน (3D Studio & Checkout)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyPersonalToShipping}
              className="px-3 py-1.5 bg-paper border border-borderCol hover:border-ink rounded-lg font-mono text-[11px] text-ink font-semibold transition-colors self-start sm:self-auto"
            >
              ใช้ชื่อและเบอร์โทรตามข้อมูลส่วนตัว
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                ชื่อผู้รับพัสดุ (Recipient Name)
              </label>
              <input
                type="text"
                value={form.shippingName}
                onChange={(e) => setForm({ ...form, shippingName: e.target.value })}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                เบอร์โทรศัพท์ผู้รับ (Recipient Phone)
              </label>
              <input
                type="tel"
                value={form.shippingPhone}
                onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
                placeholder="เช่น 081-992-4411"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                ที่อยู่จัดส่ง (Street Address, House No, Soi)
              </label>
              <textarea
                rows={2}
                value={form.shippingAddress}
                onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                placeholder="เช่น 88/1 อาคารชุดเดอะแกรนด์ ซอยสุขุมวิท 55 ถนนสุขุมวิท แขวงคลองตันเหนือ"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                เขต / อำเภอ / จังหวัด (City & District)
              </label>
              <input
                type="text"
                value={form.shippingCity}
                onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                placeholder="เช่น เขตวัฒนา, กรุงเทพมหานคร"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                รหัสไปรษณีย์ (Postal Code)
              </label>
              <input
                type="text"
                maxLength={5}
                value={form.shippingPostal}
                onChange={(e) => setForm({ ...form, shippingPostal: e.target.value })}
                placeholder="เช่น 10110"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: ข้อมูลใบกำกับภาษี / ใบเสร็จ (Invoicing & Tax Details) */}
        <div className="bg-paper-light border border-borderCol rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-borderCol pb-4">
            <div className="p-2 rounded-xl bg-warm/20 text-warm-dark">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans text-ink">
                3. ข้อมูลออกใบกำกับภาษี (Tax & Invoicing - ทางเลือก)
              </h2>
              <p className="text-xs text-mutedGray font-mono">
                สำหรับนิติบุคคลหรือบุคคลธรรมดาที่ต้องการใบกำกับภาษีเต็มรูปแบบ (Stripe Invoicing)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID / TH TIN)
              </label>
              <input
                type="text"
                maxLength={13}
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="01055xxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                ชื่อบริษัท / นิติบุคคล หรือ บุคคล (Billing Entity Name)
              </label>
              <input
                type="text"
                value={form.billingName}
                onChange={(e) => setForm({ ...form, billingName: e.target.value })}
                placeholder="เช่น บริษัท ตัวอย่าง จำกัด (สำนักงานใหญ่)"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase text-mutedGray mb-1.5">
                ที่อยู่จดทะเบียนภาษี (Tax Registered Address)
              </label>
              <textarea
                rows={2}
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                placeholder="ระบุที่อยู่ตามหนังสือรับรองบริษัทหรือทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)"
                className="w-full px-3.5 py-2.5 bg-paper border border-borderCol rounded-xl text-xs font-mono text-ink focus:border-warm focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center space-x-2 transition-all shadow-md"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการเปลี่ยนแปลง (Save Profile)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
