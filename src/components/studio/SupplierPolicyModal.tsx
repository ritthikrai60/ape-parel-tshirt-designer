'use client';

import React, { useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  Ruler,
  Shirt,
  Building2,
  MapPin,
  CheckCircle,
  HelpCircle,
  PackageCheck,
} from 'lucide-react';
import { SupplierSummaryDTO, GarmentProductDTO } from './DesignStudioClient';
import { useSettings } from '@/components/providers/SettingsProvider';

interface SupplierPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierSummaryDTO | null;
  garment: GarmentProductDTO | null;
}

export const SupplierPolicyModal: React.FC<SupplierPolicyModalProps> = ({
  isOpen,
  onClose,
  supplier,
  garment,
}) => {
  const { t } = useSettings();

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.studio.supplierPolicyTitle}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-paper rounded-2xl shadow-2xl border border-borderCol overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-borderCol bg-paper-light">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-warm-dark" />
              <h2 className="font-sans font-bold text-base sm:text-lg text-ink">
                {t.studio.supplierPolicyTitle}
              </h2>
            </div>
            <p className="font-mono text-xs text-mutedGray">
              {supplier?.companyName || 'Verified Manufacturing Partner'} &bull; APE-PAREL Neutral Network
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-borderCol bg-paper hover:bg-paper-dark transition-colors text-ink"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Supplier Identity Banner */}
          <div className="p-4 rounded-xl bg-paper-dark border border-borderCol/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-ink text-sm sm:text-base">
                  {supplier?.companyName || 'Bangkok Garment Craft'}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Partner
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs text-mutedGray">
                <MapPin className="w-3.5 h-3.5 text-warm-dark shrink-0" />
                <span>{supplier?.location || 'Bangkok, Thailand'}</span>
              </div>
            </div>
            {supplier?.description && (
              <p className="text-xs text-ink/70 font-sans sm:max-w-xs leading-relaxed border-t sm:border-t-0 sm:border-l border-borderCol pt-2 sm:pt-0 sm:pl-3">
                {supplier.description}
              </p>
            )}
          </div>

          {/* 4 Policy Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Production Turnaround */}
            <div className="p-4 rounded-xl bg-paper-light border border-borderCol flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-warm-dark shrink-0" />
                <span className="font-mono text-xs uppercase font-bold text-ink">
                  {t.studio.leadTime}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-sm text-ink">
                  {supplier?.leadTimeDays || 4} business days (วันทำการ)
                </p>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  คำสั่งซื้อจะเข้าสู่คิวการผลิตของโรงสกรีนทันทีหลังการชำระเงิน สามารถติดตามขั้นตอนสดผ่าน Order Tracking
                </p>
              </div>
            </div>

            {/* 2. Garment Material Specs */}
            <div className="p-4 rounded-xl bg-paper-light border border-borderCol flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-warm-dark shrink-0" />
                <span className="font-mono text-xs uppercase font-bold text-ink">
                  Material & Fabric Cut
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-sm text-ink truncate">
                  {garment?.weightGsm || 240} GSM &bull; {garment?.fabric || 'Combed Cotton'}
                </p>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  ทรง {garment?.fit || 'Oversized'} cut &bull; คอเสื้อ {garment?.neckline || 'Crewneck'} (SKU: {garment?.sku || 'APX-HVY-001'})
                </p>
              </div>
            </div>

            {/* 3. Printing Capabilities & Tolerances */}
            <div className="p-4 rounded-xl bg-paper-light border border-borderCol flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-warm-dark shrink-0" />
                <span className="font-mono text-xs uppercase font-bold text-ink">
                  {t.studio.printTolerance}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-sm text-ink">
                  Tolerance: &plusmn;1.5 cm / &Delta;E &le; 3.0
                </p>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  ตำแหน่งการพิมพ์คลาดเคลื่อนไม่เกิน &plusmn;1.5 ซม. จากพิกัด 3D Studio และความถูกต้องของเฉดสีตามมาตรฐาน CMYK
                </p>
              </div>
            </div>

            {/* 4. Claims & Warranty Policy */}
            <div className="p-4 rounded-xl bg-paper-light border border-borderCol flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-mono text-xs uppercase font-bold text-ink">
                  {t.studio.claimPolicy}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-mono font-bold text-sm text-ink">
                  14-Day Defect Warranty
                </p>
                <p className="text-[11px] text-mutedGray leading-relaxed">
                  รับประกันสินค้าชำรุดจากการสกรีนหรือการตัดเย็บ เคลมผลิตใหม่ฟรีภายใน 14 วันหลังได้รับสินค้า
                </p>
              </div>
            </div>
          </div>

          {/* Platform Neutral Escrow Protection Note */}
          <div className="p-3.5 rounded-xl bg-warm/20 border border-warm/60 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-warm-dark shrink-0 mt-0.5" />
            <div className="text-xs text-ink/80 leading-relaxed">
              <span className="font-bold text-ink">APE-PAREL Platform Escrow:</span> ยอดเงินค่าสินค้าจะถูกพักไว้ในระบบกลางอย่างปลอดภัย และจะโอนจ่ายให้ซัพพลายเออร์และครีเอเตอร์หลังจากกระบวนการผลิตผ่านการตรวจสอบและจัดส่งถึงมือผู้รับอย่างสมบูรณ์
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 sm:p-5 border-t border-borderCol bg-paper-light flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink-light transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
