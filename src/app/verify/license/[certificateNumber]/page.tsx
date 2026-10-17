import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck, AlertTriangle, ArrowLeft, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { verifyLicenseCertificate } from '@/lib/licenseAgreement';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { certificateNumber: string };
}): Promise<Metadata> {
  return {
    title: `ตรวจสอบใบรับรองลิขสิทธิ์: ${params.certificateNumber} | ape-parel`,
    description: 'ตรวจสอบความถูกต้องของใบรับรองสิทธิ์การใช้งานภาพกราฟิก APE-PAREL',
  };
}

export default async function LicenseVerificationPage({
  params,
}: {
  params: { certificateNumber: string };
}) {
  const result = await verifyLicenseCertificate(params.certificateNumber);

  if (!result.record) {
    notFound();
  }

  const { record, snapshot, isValid, isHashAuthentic } = result;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* Back to Marketplace */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/marketplace"
          className="inline-flex items-center space-x-1.5 font-mono text-xs text-mutedGray hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>กลับสู่ Marketplace</span>
        </Link>
        <span className="font-mono text-xs text-mutedGray">
          ใบรับรองสิทธิ์ (Artwork License Certificate)
        </span>
      </div>

      {/* Certificate Container with Decorative Border */}
      <div className="bg-paper-light border-2 border-borderCol rounded-2xl shadow-xl overflow-hidden p-8 sm:p-12 relative">
        {/* Certificate Watermark Stamp */}
        <div className="absolute right-6 top-6 opacity-10 pointer-events-none select-none">
          <ShieldCheck className="w-48 h-48 text-ink" />
        </div>

        {/* Verification Status Banner */}
        <div
          data-testid="license-verification-status-banner"
          className={`p-4 rounded-xl border flex items-center justify-between mb-8 ${
            isValid
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            {isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <h2 className="font-mono text-sm font-black uppercase">
                {isValid
                  ? 'Official Permanent IP License Verified'
                  : 'License Inactive or Verification Failed'}
              </h2>
              <p className="font-mono text-xs text-emerald-700">
                {isValid
                  ? 'ใบรับรองสิทธิ์ถาวรฉบับนี้ถูกต้องตามกฎหมายและได้รับการรับรองความสมบูรณ์โดยระบบ ape-parel'
                  : 'ไม่สามารถรับรองความถูกต้องของใบอนุญาตนี้ได้'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-950 font-bold hidden sm:inline-block">
            AUTHENTIC
          </span>
        </div>

        {/* Certificate Header */}
        <div className="text-center space-y-2 border-b border-borderCol pb-8">
          <div className="inline-block px-3 py-1 bg-warm/20 rounded font-mono text-xs uppercase font-bold text-ink mb-1">
            Official Intellectual Property Certificate
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-ink uppercase">
            Permanent IP License Agreement
          </h1>
          <p className="font-mono text-xs text-mutedGray">
            Certificate Serial Number:{' '}
            <span
              data-testid="certificate-serial-number"
              className="font-bold text-ink select-all"
            >
              {record.certificateNumber}
            </span>
          </p>
          <p className="font-mono text-[11px] text-mutedGray">
            Issued on: {new Date(record.acquiredAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}
          </p>
        </div>

        {/* Certificate Body */}
        <div className="py-8 space-y-6">
          {/* Parties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-paper rounded-xl border border-borderCol">
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-mutedGray block mb-1">
                ผู้ให้อนุญาต (Licensor / Creator)
              </span>
              <div className="font-mono text-sm font-bold text-ink">
                {snapshot?.licensor.displayName || record.artwork.creator.displayName}
              </div>
              <div className="font-mono text-xs text-mutedGray">
                Creator ID: {record.artwork.creator.id}
              </div>
            </div>

            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-mutedGray block mb-1">
                ผู้ได้รับอนุญาต (Licensee / Collector)
              </span>
              <div className="font-mono text-sm font-bold text-ink">
                {snapshot?.licensee.name || record.user.name || 'Anonymous User'}
              </div>
              <div className="font-mono text-xs text-mutedGray">
                User ID: {record.userId}
              </div>
            </div>
          </div>

          {/* Licensed Artwork Showcase */}
          <div className="flex items-center space-x-4 p-4 border border-borderCol rounded-xl bg-paper">
            <img
              src={record.artwork.previewUrl}
              alt={record.artwork.title}
              className="w-20 h-20 rounded-lg object-cover border border-borderCol/60 bg-paper-light flex-shrink-0"
            />
            <div className="space-y-1 min-w-0">
              <span className="font-mono text-[10px] uppercase font-bold text-mutedGray">
                Licensed Artwork Asset
              </span>
              <h3 className="font-mono text-base font-bold text-ink truncate">
                {record.artwork.title}
              </h3>
              <p className="font-mono text-xs text-mutedGray">
                Category: {record.artwork.category} &bull; Asset ID: {record.artwork.id}
              </p>
            </div>
          </div>

          {/* Grant of Rights & Legal Clauses */}
          <div className="space-y-3 font-mono text-xs text-ink/90 leading-relaxed bg-paper/60 p-5 rounded-xl border border-borderCol">
            <h4 className="font-bold text-sm uppercase text-ink flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-warm-dark" />
              <span>ข้อกำหนดและขอบเขตสิทธิ์แห่งสัญญา (Terms & Scope of Rights)</span>
            </h4>
            <ul className="list-disc list-inside space-y-2 text-mutedGray">
              <li>
                <strong className="text-ink">สิทธิ์ถาวรตลอดชีพ (Perpetual & Unlimited Scope):</strong>{' '}
                ผู้ซื้อได้รับสิทธิ์ในการนำภาพผลงานนี้ไปพิมพ์สกรีนลงบนเสื้อและเครื่องแต่งกายผ่านแพลตฟอร์ม ape-parel ได้ไม่จำกัดจำนวนครั้งตลอดชีพ
              </li>
              <li>
                <strong className="text-ink">ยกเว้นค่าธรรมเนียมลิขสิทธิ์ซ้ำซ้อน (฿0 Reprint Fee):</strong>{' '}
                ในการสั่งผลิตทุกครั้ง ระบบจะยกเว้นค่าธรรมเนียมลิขสิทธิ์ (Licensing Fee = ฿0) โดยผู้ซื้อชำระเพียงค่าเสื้อเปล่าและค่าบริการพิมพ์เท่านั้น
              </li>
              <li>
                <strong className="text-ink">ข้อจำกัดการจำหน่ายไฟล์ดิจิทัล (Non-Resale of Raw Digital Files):</strong>{' '}
                สิทธิ์นี้มิให้อนุญาตให้นำไฟล์ดิจิทัลต้นฉบับไปขายต่อ แจกจ่าย หรือโอนถ่ายเป็น Digital Asset ดิบโดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษรจากครีเอเตอร์
              </li>
            </ul>
          </div>

          {/* Cryptographic Proof Verification Block */}
          <div className="p-4 bg-ink text-paper rounded-xl font-mono text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-mutedGray font-bold">
                Cryptographic SHA-256 Proof Fingerprint
              </span>
              <span className="text-emerald-400 text-[10px] font-bold">
                {isHashAuthentic ? '✓ CHECKSUM VERIFIED' : '✕ TAMPER DETECTED'}
              </span>
            </div>
            <div className="text-[11px] text-paper-light break-all bg-ink-light p-2.5 rounded border border-white/10 select-all">
              {record.sha256Hash}
            </div>
          </div>
        </div>

        {/* Certificate Actions */}
        <div className="border-t border-borderCol pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="text-mutedGray text-[11px]">
            APE-PAREL Artwork License Verification
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <Link
              href={`/studio/new?artworkId=${record.artwork.id}`}
              className="flex-1 sm:flex-none px-4 py-2 bg-ink text-paper hover:bg-ink-light rounded-lg font-bold transition-colors text-center shadow-xs"
            >
              เปิดใน Studio (฿0) &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
