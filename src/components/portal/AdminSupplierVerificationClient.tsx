'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Factory,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Building,
  Eye,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

export interface SupplierItem {
  id: string;
  slug: string;
  companyName: string;
  description: string | null;
  location: string;
  contactEmail: string;
  contactPhone: string | null;
  taxId: string | null;
  verified: boolean;
  verificationStatus: string;
  dbdDocUrl: string | null;
  vatDocUrl: string | null;
  bankBookDocUrl: string | null;
  machineryPhotos: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  _count?: {
    products: number;
    orders: number;
  };
}

interface AdminSupplierVerificationClientProps {
  initialSuppliers: SupplierItem[];
  initialCounts: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export function AdminSupplierVerificationClient({
  initialSuppliers,
  initialCounts,
}: AdminSupplierVerificationClientProps) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [counts, setCounts] = useState(initialCounts);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingSupplier, setInspectingSupplier] = useState<SupplierItem | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ url: string; title: string } | null>(null);

  // Review modal state
  const [reviewingSupplier, setReviewingSupplier] = useState<SupplierItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/admin/suppliers/verifications');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to refresh suppliers:', err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSupplier) return;

    if (reviewAction === 'REJECT' && rejectReason.trim().length < 5) {
      alert('กรุณาระบุเหตุผลการปฏิเสธอย่างน้อย 5 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch(`/api/admin/suppliers/verifications/${reviewingSupplier.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          reason: reviewAction === 'REJECT' ? rejectReason.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to process review');
      }

      setFeedbackMessage({
        type: 'success',
        text: reviewAction === 'APPROVE'
          ? `อนุมัติโรงงาน "${reviewingSupplier.companyName}" เรียบร้อยแล้ว`
          : `ปฏิเสธและส่งแจ้งเตือนไปยัง "${reviewingSupplier.companyName}" เรียบร้อยแล้ว`,
      });

      setReviewingSupplier(null);
      setRejectReason('');
      await fetchSuppliers();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึกผล' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (activeTab === 'PENDING' && s.verificationStatus !== 'PENDING') return false;
    if (activeTab === 'APPROVED' && s.verificationStatus !== 'APPROVED') return false;
    if (activeTab === 'REJECTED' && s.verificationStatus !== 'REJECTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.companyName.toLowerCase().includes(q);
      const matchSlug = s.slug.toLowerCase().includes(q);
      const matchEmail = s.contactEmail.toLowerCase().includes(q);
      const matchTax = s.taxId?.toLowerCase().includes(q);
      return matchName || matchSlug || matchEmail || matchTax;
    }

    return true;
  });

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderCol/60 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] uppercase tracking-widest bg-ink text-paper px-2 py-0.5 rounded font-bold">
              APE-PAREL // BACKOFFICE
            </span>
            <span className="font-mono text-[10px] text-mutedGray">KYB_VERIFICATION_QUEUE</span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-ink tracking-tight mt-1">
            Supplier KYB Verification & Factory Onboarding
          </h1>
          <p className="font-mono text-xs text-mutedGray">
            ตรวจสอบเอกสารนิติบุคคล, ภ.พ.20, สมุดบัญชี และภาพถ่ายเครื่องจักร DTG ก่อนอนุมัติให้รับงานผลิต
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 border border-borderCol bg-paper hover:bg-paper-dark rounded-lg font-mono text-xs text-ink transition-colors"
          >
            ← กลับไป Admin Hub
          </Link>
          <button
            onClick={fetchSuppliers}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-ink text-paper rounded-lg font-mono text-xs font-semibold hover:bg-ink/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕ ปิด
          </button>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'PENDING'
              ? 'bg-amber-500/10 border-amber-500 text-amber-900 ring-2 ring-amber-500/30'
              : 'bg-paper-light border-borderCol hover:border-ink/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-amber-700 font-bold">รอตรวจสอบ (Pending)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink mt-2">{counts.pending}</div>
          <span className="text-[10px] text-mutedGray">โรงงานที่ส่งเอกสารใหม่</span>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/30'
              : 'bg-paper-light border-borderCol hover:border-ink/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-emerald-700 font-bold">อนุมัติแล้ว (Approved)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink mt-2">{counts.approved}</div>
          <span className="text-[10px] text-mutedGray">มีสิทธิ์รับงานผลิตในระบบ</span>
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'REJECTED'
              ? 'bg-rose-500/10 border-rose-500 text-rose-900 ring-2 ring-rose-500/30'
              : 'bg-paper-light border-borderCol hover:border-ink/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-rose-700 font-bold">ปฏิเสธ / ขอเพิ่ม (Rejected)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink mt-2">{counts.rejected}</div>
          <span className="text-[10px] text-mutedGray">เอกสารไม่ครบหรือมีข้อผิดพลาด</span>
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeTab === 'ALL'
              ? 'bg-ink text-paper border-ink shadow-sm'
              : 'bg-paper-light border-borderCol hover:border-ink/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-mono text-xs uppercase font-bold ${activeTab === 'ALL' ? 'text-paper/80' : 'text-mutedGray'}`}>
              ทั้งหมด (Total)
            </span>
            <Building className={`w-4 h-4 ${activeTab === 'ALL' ? 'text-paper' : 'text-mutedGray'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 ${activeTab === 'ALL' ? 'text-paper' : 'text-ink'}`}>
            {counts.total}
          </div>
          <span className={`text-[10px] ${activeTab === 'ALL' ? 'text-paper/70' : 'text-mutedGray'}`}>
            ฐานข้อมูลโรงงานทั้งหมด
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-paper-light p-3 border border-borderCol rounded-xl">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-ink text-paper'
                  : 'text-mutedGray hover:text-ink hover:bg-paper'
              }`}
            >
              {tab === 'PENDING' && `รอตรวจสอบ (${counts.pending})`}
              {tab === 'APPROVED' && `อนุมัติแล้ว (${counts.approved})`}
              {tab === 'REJECTED' && `ปฏิเสธ (${counts.rejected})`}
              {tab === 'ALL' && `ทั้งหมด (${counts.total})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อโรงงาน, อีเมล, Tax ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-paper border border-borderCol rounded-lg font-sans text-xs text-ink placeholder:text-mutedGray focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </div>
      </div>

      {/* Supplier Verification Table */}
      <div className="border border-borderCol rounded-xl overflow-hidden bg-paper shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-borderCol text-left font-mono text-xs">
            <thead className="bg-paper-dark/60 text-[10px] uppercase text-mutedGray tracking-wider">
              <tr>
                <th className="px-4 py-3">โรงงาน / บริษัทผู้ผลิต</th>
                <th className="px-4 py-3">ข้อมูลติดต่อ & ที่ตั้ง</th>
                <th className="px-4 py-3">Tax ID (13 หลัก)</th>
                <th className="px-4 py-3">เอกสารแนบ (KYB Docs)</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCol">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-mutedGray">
                    <Factory className="w-8 h-8 mx-auto text-mutedGray/50 mb-2" />
                    <p className="font-sans text-sm">ไม่พบรายการโรงงานในหมวดหมู่นี้</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => {
                  const hasDbd = Boolean(s.dbdDocUrl);
                  const hasVat = Boolean(s.vatDocUrl);
                  const hasBank = Boolean(s.bankBookDocUrl);
                  let machineryArr: string[] = [];
                  try {
                    if (s.machineryPhotos) machineryArr = JSON.parse(s.machineryPhotos);
                  } catch {
                    if (s.machineryPhotos) machineryArr = [s.machineryPhotos];
                  }

                  return (
                    <tr key={s.id} className="hover:bg-paper-light/50 transition-colors">
                      {/* Company Name & Slug */}
                      <td className="px-4 py-3.5">
                        <div className="font-sans font-bold text-ink text-sm">{s.companyName}</div>
                        <div className="font-mono text-[10px] text-mutedGray">slug: @{s.slug}</div>
                        <div className="text-[10px] text-mutedGray mt-0.5">
                          ยื่นเมื่อ: {new Date(s.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="px-4 py-3.5 space-y-0.5">
                        <div className="flex items-center space-x-1 text-ink">
                          <MapPin className="w-3 h-3 text-mutedGray" />
                          <span>{s.location}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-mutedGray text-[11px]">
                          <Mail className="w-3 h-3 text-mutedGray" />
                          <span>{s.contactEmail}</span>
                        </div>
                        {s.contactPhone && (
                          <div className="flex items-center space-x-1 text-mutedGray text-[11px]">
                            <Phone className="w-3 h-3 text-mutedGray" />
                            <span>{s.contactPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Tax ID */}
                      <td className="px-4 py-3.5">
                        {s.taxId ? (
                          <span className="font-mono text-xs bg-paper-dark px-2 py-0.5 rounded border border-borderCol font-semibold">
                            {s.taxId}
                          </span>
                        ) : (
                          <span className="text-mutedGray/70 italic text-[11px]">ไม่ได้ระบุ</span>
                        )}
                      </td>

                      {/* Attached Documents Badges */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {hasDbd ? (
                            <button
                              onClick={() => setSelectedDocPreview({ url: s.dbdDocUrl!, title: `หนังสือรับรอง DBD - ${s.companyName}` })}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold hover:bg-blue-100"
                            >
                              <FileText className="w-3 h-3" />
                              <span>DBD</span>
                            </button>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-paper-dark text-mutedGray/60 rounded text-[10px]">No DBD</span>
                          )}

                          {hasVat ? (
                            <button
                              onClick={() => setSelectedDocPreview({ url: s.vatDocUrl!, title: `ภ.พ.20 (VAT) - ${s.companyName}` })}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold hover:bg-purple-100"
                            >
                              <FileText className="w-3 h-3" />
                              <span>ภ.พ.20</span>
                            </button>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-paper-dark text-mutedGray/60 rounded text-[10px]">No VAT</span>
                          )}

                          {hasBank ? (
                            <button
                              onClick={() => setSelectedDocPreview({ url: s.bankBookDocUrl!, title: `หน้าสมุดบัญชี - ${s.companyName}` })}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold hover:bg-emerald-100"
                            >
                              <Building className="w-3 h-3" />
                              <span>บัญชีธนาคาร</span>
                            </button>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-paper-dark text-mutedGray/60 rounded text-[10px]">No Bank</span>
                          )}

                          {machineryArr.length > 0 && (
                            <button
                              onClick={() => setSelectedDocPreview({ url: machineryArr[0], title: `รูปเครื่องจักร DTG - ${s.companyName}` })}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold hover:bg-amber-100"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>เครื่องจักร ({machineryArr.length})</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        {s.verificationStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>APPROVED</span>
                          </span>
                        ) : s.verificationStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10px]">
                            <XCircle className="w-3 h-3" />
                            <span>REJECTED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px] animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                        {s.rejectionReason && (
                          <p className="text-[10px] text-rose-600 max-w-xs truncate mt-1">
                            {s.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setInspectingSupplier(s)}
                            className="px-2.5 py-1 bg-paper border border-borderCol hover:border-ink rounded font-mono text-[11px] text-ink transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>ตรวจเอกสาร</span>
                          </button>

                          <button
                            onClick={() => {
                              setReviewingSupplier(s);
                              setReviewAction('APPROVE');
                              setRejectReason('');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-mono text-[11px] font-semibold transition-colors flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>อนุมัติ</span>
                          </button>

                          <button
                            onClick={() => {
                              setReviewingSupplier(s);
                              setReviewAction('REJECT');
                              setRejectReason('');
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-mono text-[11px] font-semibold transition-colors flex items-center space-x-1"
                          >
                            <X className="w-3 h-3" />
                            <span>ปฏิเสธ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Inspector Modal */}
      {inspectingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col space-y-6 relative">
            <div className="flex items-center justify-between border-b border-borderCol pb-4">
              <div>
                <h2 className="text-lg font-bold font-sans text-ink">
                  ตรวจสอบเอกสารโรงงาน: {inspectingSupplier.companyName}
                </h2>
                <p className="font-mono text-xs text-mutedGray">
                  slug: @{inspectingSupplier.slug} • ที่ตั้ง: {inspectingSupplier.location}
                </p>
              </div>
              <button
                onClick={() => setInspectingSupplier(null)}
                className="w-8 h-8 rounded-full bg-paper hover:bg-paper-dark border border-borderCol flex items-center justify-center text-ink"
              >
                ✕
              </button>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-paper p-3.5 rounded-xl border border-borderCol text-xs font-mono">
              <div>
                <span className="text-mutedGray text-[10px] block">เลขประจำตัวผู้เสียภาษี (TAX ID)</span>
                <span className="font-bold text-ink">{inspectingSupplier.taxId || 'ไม่ได้ระบุ'}</span>
              </div>
              <div>
                <span className="text-mutedGray text-[10px] block">อีเมลติดต่อ</span>
                <span className="font-bold text-ink">{inspectingSupplier.contactEmail}</span>
              </div>
              <div>
                <span className="text-mutedGray text-[10px] block">เบอร์โทรศัพท์</span>
                <span className="font-bold text-ink">{inspectingSupplier.contactPhone || 'ไม่ได้ระบุ'}</span>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              <h3 className="font-sans font-bold text-sm text-ink flex items-center space-x-2">
                <FileText className="w-4 h-4 text-warm" />
                <span>เอกสารประกอบการพิจารณา (KYB Documents)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. DBD */}
                <div className="p-3 bg-paper border border-borderCol rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ink block">หนังสือรับรองนิติบุคคล (DBD)</span>
                    <span className="text-[10px] text-mutedGray">ออกโดยกรมพัฒนาธุรกิจการค้า</span>
                  </div>
                  {inspectingSupplier.dbdDocUrl ? (
                    <button
                      onClick={() => setSelectedDocPreview({ url: inspectingSupplier.dbdDocUrl!, title: `หนังสือรับรอง DBD - ${inspectingSupplier.companyName}` })}
                      className="px-2.5 py-1 bg-ink text-paper rounded text-xs font-mono font-semibold hover:bg-ink/90 flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>เปิดดู</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-rose-600 font-mono">ยังไม่อัปโหลด</span>
                  )}
                </div>

                {/* 2. VAT */}
                <div className="p-3 bg-paper border border-borderCol rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ink block">ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)</span>
                    <span className="text-[10px] text-mutedGray">สำหรับหักภาษี ณ ที่จ่าย 3%</span>
                  </div>
                  {inspectingSupplier.vatDocUrl ? (
                    <button
                      onClick={() => setSelectedDocPreview({ url: inspectingSupplier.vatDocUrl!, title: `ภ.พ.20 (VAT) - ${inspectingSupplier.companyName}` })}
                      className="px-2.5 py-1 bg-ink text-paper rounded text-xs font-mono font-semibold hover:bg-ink/90 flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>เปิดดู</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-rose-600 font-mono">ยังไม่อัปโหลด</span>
                  )}
                </div>

                {/* 3. Bank Book */}
                <div className="p-3 bg-paper border border-borderCol rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ink block">หน้าสมุดบัญชีธนาคาร</span>
                    <span className="text-[10px] text-mutedGray">ชื่อบัญชีตรงกับนิติบุคคล</span>
                  </div>
                  {inspectingSupplier.bankBookDocUrl ? (
                    <button
                      onClick={() => setSelectedDocPreview({ url: inspectingSupplier.bankBookDocUrl!, title: `หน้าสมุดบัญชี - ${inspectingSupplier.companyName}` })}
                      className="px-2.5 py-1 bg-ink text-paper rounded text-xs font-mono font-semibold hover:bg-ink/90 flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>เปิดดู</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-rose-600 font-mono">ยังไม่อัปโหลด</span>
                  )}
                </div>

                {/* 4. Machinery */}
                <div className="p-3 bg-paper border border-borderCol rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-ink block">ภาพถ่ายเครื่องพิมพ์ DTG & โรงงาน</span>
                    <span className="text-[10px] text-mutedGray">ยืนยันศักยภาพการผลิตจริง</span>
                  </div>
                  {inspectingSupplier.machineryPhotos ? (
                    <button
                      onClick={() => {
                        let parsed = inspectingSupplier.machineryPhotos;
                        try {
                          const arr = JSON.parse(inspectingSupplier.machineryPhotos!);
                          if (arr.length > 0) parsed = arr[0];
                        } catch {}
                        setSelectedDocPreview({ url: parsed!, title: `เครื่องจักร DTG - ${inspectingSupplier.companyName}` });
                      }}
                      className="px-2.5 py-1 bg-ink text-paper rounded text-xs font-mono font-semibold hover:bg-ink/90 flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>เปิดดู</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-mutedGray/70 font-mono">ไม่มีภาพแนบ</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-borderCol flex items-center justify-between">
              <span className="text-xs font-mono text-mutedGray">
                สถานะปัจจุบัน: <strong>{inspectingSupplier.verificationStatus}</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setReviewingSupplier(inspectingSupplier);
                    setReviewAction('REJECT');
                    setRejectReason('');
                  }}
                  className="px-4 py-2 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl font-mono text-xs font-bold transition-colors"
                >
                  ✕ ปฏิเสธ / ขอเอกสารเพิ่ม
                </button>
                <button
                  onClick={() => {
                    setReviewingSupplier(inspectingSupplier);
                    setReviewAction('APPROVE');
                    setRejectReason('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-mono text-xs font-bold transition-colors"
                >
                  ✓ อนุมัติโรงงานนี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Quick Preview Lightbox Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-sans font-bold text-base text-ink">{selectedDocPreview.title}</h3>
              <div className="flex items-center space-x-2">
                <a
                  href={selectedDocPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-paper border border-borderCol rounded font-mono text-xs text-ink hover:bg-paper-dark flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดแท็บใหม่</span>
                </a>
                <button
                  onClick={() => setSelectedDocPreview(null)}
                  className="w-8 h-8 rounded-full bg-paper hover:bg-paper-dark border border-borderCol flex items-center justify-center text-ink"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-paper-dark/30 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
              {selectedDocPreview.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={selectedDocPreview.url}
                  className="w-full h-[550px] rounded-lg border border-borderCol"
                  title={selectedDocPreview.title}
                />
              ) : (
                <img
                  src={selectedDocPreview.url}
                  alt={selectedDocPreview.title}
                  className="max-h-[550px] max-w-full object-contain rounded-lg border border-borderCol shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Action Confirmation Modal */}
      {reviewingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-sans font-bold text-base text-ink">
                {reviewAction === 'APPROVE' ? 'ยืนยันการอนุมัติโรงงานผู้ผลิต' : 'ระบุเหตุผลการปฏิเสธ / ขอเอกสารเพิ่ม'}
              </h3>
              <button
                onClick={() => setReviewingSupplier(null)}
                className="w-7 h-7 rounded-full bg-paper hover:bg-paper-dark border border-borderCol flex items-center justify-center text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="p-3 bg-paper rounded-xl border border-borderCol text-xs space-y-1 font-mono">
                <div>โรงงาน: <strong className="text-ink">{reviewingSupplier.companyName}</strong></div>
                <div>อีเมลติดต่อ: {reviewingSupplier.contactEmail}</div>
                <div>ที่ตั้ง: {reviewingSupplier.location}</div>
              </div>

              {reviewAction === 'APPROVE' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <p className="font-bold">✓ การดำเนินการเมื่ออนุมัติ:</p>
                  <ul className="list-disc list-inside space-y-0.5 opacity-90">
                    <li>ติดตรา <strong>Verified Supplier</strong> บนโปรไฟล์</li>
                    <li>เปิดให้โรงงานนี้ปรากฏใน 3D Studio สำหรับรับคำสั่งซื้อพิมพ์เสื้อ</li>
                    <li>ส่งอีเมลแจ้งผลการอนุมัติไปยังอีเมลของโรงงานอัตโนมัติ</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block">
                    เหตุผลที่ปฏิเสธ / รายการเอกสารที่ต้องการให้แก้ไข (Reason):
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="เช่น หนังสือรับรอง DBD มีอายุเกิน 6 เดือน กรุณาคัดสำเนาใหม่ หรือ เอกสาร ภ.พ.20 ไม่ชัดเจน..."
                    className="w-full p-3 bg-paper border border-borderCol rounded-xl text-sm font-sans text-ink placeholder:text-mutedGray focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                  <p className="font-mono text-[10px] text-mutedGray">
                    * ข้อความนี้จะถูกส่งไปยังอีเมลของโรงงานเพื่อแจ้งเตือนให้กลับมาอัปโหลดเอกสารใหม่
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setReviewingSupplier(null)}
                  className="px-4 py-2 border border-borderCol bg-paper rounded-xl font-mono text-xs text-ink hover:bg-paper-dark"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold text-white transition-colors flex items-center space-x-1.5 ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? (
                    <span>กำลังบันทึก...</span>
                  ) : reviewAction === 'APPROVE' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>ยืนยันอนุมัติ</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>ส่งผลปฏิเสธ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
