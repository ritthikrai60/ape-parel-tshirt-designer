import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว (PDPA Privacy Policy) | APE-PAREL',
  description: 'นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลของแพลตฟอร์ม APE-PAREL ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-mono text-mutedGray hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับสู่หน้าหลัก</span>
          </Link>
        </div>

        {/* Title Header */}
        <div className="border-b border-borderCol pb-6">
          <div className="flex items-center space-x-3 mb-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-sans uppercase tracking-tight text-ink">
              นโยบายความเป็นส่วนตัว (Privacy Policy)
            </h1>
          </div>
          <p className="text-xs font-mono text-mutedGray">
            ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) • มีผลบังคับใช้เมื่อวันที่ 14 ตุลาคม 2569 (เวอร์ชั่น 1.0)
          </p>
        </div>

        {/* Legal Text Sections */}
        <div className="space-y-8 text-sm text-ink leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">1. บทนำและเจตนารมณ์</h2>
            <p className="text-mutedGray">
              แพลตฟอร์ม <strong>APE-PAREL</strong> ตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลและความเป็นส่วนตัวของท่านในฐานะผู้ใช้งาน ลูกค้า ครีเอเตอร์ (นักออกแบบ) ซัพพลายเออร์โรงพิมพ์ และผู้เข้าเยี่ยมชมเว็บไซต์ เรามุ่งมั่นที่จะปฏิบัติตามกฎหมายว่าด้วยการคุ้มครองข้อมูลส่วนบุคคลของประเทศไทย (PDPA) อย่างเคร่งครัด
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">2. ข้อมูลส่วนบุคคลที่เราจัดเก็บ</h2>
            <p className="text-mutedGray">
              เราอาจจัดเก็บข้อมูลส่วนบุคคลของท่านทั้งทางตรงและทางอ้อมเมื่อท่านใช้งานเว็บไซต์หรือบริการของเรา ได้แก่:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-xs uppercase text-ink font-mono mb-1">ข้อมูลบัญชีและการติดต่อ</h3>
                <p className="text-xs text-mutedGray">ชื่อ นามสกุล ที่อยู่อีเมล รหัสผ่าน ภาพโปรไฟล์ ข้อมูลบัญชี NextAuth</p>
              </div>
              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-xs uppercase text-ink font-mono mb-1">ข้อมูลคำสั่งซื้อและการจัดส่ง</h3>
                <p className="text-xs text-mutedGray">ที่อยู่จัดส่งพัสดุ เบอร์โทรศัพท์ ประวัติการชำระเงิน หมายเลขพัสดุ และสเปกเสื้อผ้าที่ออกแบบ</p>
              </div>
              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-xs uppercase text-ink font-mono mb-1">ข้อมูลลิขสิทธิ์และการเงิน (Creator)</h3>
                <p className="text-xs text-mutedGray">ข้อมูลบัญชีพร้อมเพย์/ธนาคารสำหรับการรับส่วนแบ่งค่าลิขสิทธิ์ ยอดเงินคงเหลือ บันทึกภาษีหัก ณ ที่จ่าย 3% (50 ทวิ)</p>
              </div>
              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-xs uppercase text-ink font-mono mb-1">ข้อมูลการใช้งานและคุกกี้</h3>
                <p className="text-xs text-mutedGray">ที่อยู่ IP, ประเภทเบราว์เซอร์, บันทึกการให้ความยินยอมคุกกี้, ประวัติการส่งข้อความแชทในคำสั่งซื้อ</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">3. วัตถุประสงค์และฐานทางกฎหมายในการประมวลผลข้อมูล</h2>
            <p className="text-mutedGray">
              เราประมวลผลข้อมูลของท่านภายใต้ฐานความยินยอม (Consent) ฐานสัญญา (Contract) ฐานประโยชน์โดยชอบด้วยกฎหมาย (Legitimate Interest) หรือฐานหน้าที่ตามกฎหมาย (Legal Obligation) เพื่อวัตถุประสงค์ดังต่อไปนี้:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs text-mutedGray">
              <li>ประมวลผลคำสั่งผลิตเสื้อยืดพิมพ์ลาย DTG ตามแบบ 2D/3D และจัดส่งสินค้าถึงมือลูกค้า</li>
              <li>คำนวณและกระจายส่วนแบ่งค่าลิขสิทธิ์ (Creator Royalties) 85% อย่างถูกต้องและโปร่งใส</li>
              <li>การสื่อสารผ่านระบบ Order Chat เพื่อประสานงานการพิมพ์และติดตามสถานะคำสั่งซื้อ</li>
              <li>การส่งอีเมลแจ้งสถานะคำสั่งซื้อ (Transactional Email) และอีเมลข่าวสารโปรโมชั่น (เมื่อได้รับความยินยอม)</li>
              <li>การตรวจจับและป้องกันการทุจริต การนำภาพละเมิดลิขสิทธิ์มาใช้ หรือการชักชวนทำธุรกรรมนอกระบบ</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">4. สิทธิของท่านตามกฎหมาย PDPA</h2>
            <p className="text-mutedGray">
              ในฐานะเจ้าของข้อมูลส่วนบุคคล ท่านมีสิทธิขอใช้สิทธิดังต่อไปนี้ได้ทุกเมื่อ:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-paper-light border border-borderCol rounded-lg flex items-center justify-between">
                <span className="font-bold text-ink">1. สิทธิขอเข้าถึงและรับสำเนาข้อมูลส่วนบุคคล (Right of Access)</span>
                <span className="text-[11px] font-mono text-mutedGray">ผ่านหน้า Account Journal</span>
              </div>
              <div className="p-3 bg-paper-light border border-borderCol rounded-lg flex items-center justify-between">
                <span className="font-bold text-ink">2. สิทธิขอแก้ไขข้อมูลให้ถูกต้อง (Right to Rectification)</span>
                <span className="text-[11px] font-mono text-mutedGray">ผ่านโปรไฟล์ผู้ใช้</span>
              </div>
              <div className="p-3 bg-paper-light border border-borderCol rounded-lg flex items-center justify-between">
                <span className="font-bold text-ink">3. สิทธิขอลบหรือทำลายข้อมูล (Right to Erasure)</span>
                <span className="text-[11px] font-mono text-mutedGray">ติดต่อ DPO</span>
              </div>
              <div className="p-3 bg-paper-light border border-borderCol rounded-lg flex items-center justify-between">
                <span className="font-bold text-ink">4. สิทธิขอถอนความยินยอม (Right to Withdraw Consent)</span>
                <span className="text-[11px] font-mono text-mutedGray">กดปุ่ม &quot;ตั้งค่าคุกกี้&quot; หรือลิงก์ Unsubscribe</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">5. เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO Contact)</h2>
            <div className="p-5 bg-paper-light border border-borderCol rounded-2xl space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-ink">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>อีเมลเจ้าหน้าที่คุ้มครองข้อมูล: <strong>dpo@ape-parel.com</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-ink">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>โทรศัพท์: +66 (0) 2-123-4567 (เวลาทำการ จันทร์ - ศุกร์ 09:00 - 18:00 น.)</span>
              </div>
              <div className="flex items-center space-x-2 text-ink">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>ที่อยู่: APE-PAREL Studio อาคารดีไซน์เซ็นเตอร์ ถนนสุขุมวิท กรุงเทพมหานคร 10110</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
