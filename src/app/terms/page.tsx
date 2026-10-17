import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ข้อกำหนดและเงื่อนไขการให้บริการ (Terms of Service) | APE-PAREL',
  description: 'ข้อกำหนดและเงื่อนไขการให้บริการและลิขสิทธิ์ของแพลตฟอร์ม APE-PAREL',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-mono text-mutedGray hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับสู่หน้าหลัก</span>
          </Link>
        </div>

        <div className="border-b border-borderCol pb-6">
          <div className="flex items-center space-x-3 mb-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <FileText className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-sans uppercase tracking-tight text-ink">
              ข้อกำหนดและเงื่อนไขการให้บริการ (Terms of Service)
            </h1>
          </div>
          <p className="text-xs font-mono text-mutedGray">
            ฉบับภาษาไทย • มีผลบังคับใช้เมื่อวันที่ 14 ตุลาคม 2569 (เวอร์ชั่น 1.0)
          </p>
        </div>

        <div className="space-y-8 text-sm text-ink leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">1. การยอมรับข้อกำหนด</h2>
            <p className="text-mutedGray">
              ยินดีต้อนรับสู่ APE-PAREL การเข้าถึงหรือใช้งานเว็บไซต์และระบบสตูดิโอออกแบบของเรา หมายถึงท่านได้ยอมรับข้อกำหนดและเงื่อนไขเหล่านี้ หากท่านไม่เห็นด้วยกับข้อกำหนดข้อใดข้อหนึ่ง กรุณาระงับการใช้งานระบบ
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">2. ลิขสิทธิ์และสิทธิ์ในผลงาน (Artwork Licensing)</h2>
            <p className="text-mutedGray">
              ลวดลายและงานศิลปะทั้งหมดที่สร้างสรรค์โดยครีเอเตอร์และแสดงบน Marketplace ยังคงเป็นทรัพย์สินทางปัญญาของผู้สร้างสรรค์แต่เพียงผู้เดียว การสั่งซื้อเสื้อยืดสั่งพิมพ์ (Custom Tee) เป็นการซื้อสิทธิ์เพื่อการพิมพ์ลงบนเสื้อผ้าตามจำนวนชิ้นที่สั่งผลิตเท่านั้น (Per-Garment License) ลูกค้าไม่มีสิทธิ์นำไฟล์ดิจิทัลไปดัดแปลง ผลิตซ้ำเพื่อจำหน่าย หรือใช้งานเชิงพาณิชย์ในรูปแบบอื่น
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">3. ระบบราคาที่โปร่งใสและเชื่อถือได้ (Authoritative Pricing)</h2>
            <p className="text-mutedGray">
              ราคาคำสั่งซื้อทั้งหมดคำนวณแบบรวมศูนย์ผ่าน Server-Authoritative Engine โดยแยกแจงต้นทุนเนื้อผ้าพรีเมียม (Combed Cotton 240 GSM), ค่าพิมพ์ Direct-to-Garment (DTG), ค่าบริการบรรจุภัณฑ์, ค่าจัดส่ง และส่วนแบ่งค่าลิขสิทธิ์ของครีเอเตอร์ 85% อย่างชัดเจน
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">4. การยกเลิกและการคืนสินค้า (Cancellations & Refunds)</h2>
            <p className="text-mutedGray">
              เนื่องจากสินค้าทุกชิ้นผลิตตามคำสั่งซื้อเฉพาะบุคคล (Made-to-Order) เมื่อโรงพิมพ์เริ่มต้นกระบวนการผลิต (IN_PRODUCTION) คำสั่งซื้อจะไม่สามารถยกเลิกได้ อย่างไรก็ตาม หากสินค้ามีความเสียหายอันเนื่องมาจากการผลิตหรือการพิมพ์ไม่ตรงตามสเปก ท่านสามารถยื่นคำขอเคลมได้ภายใน 7 วันทำการผ่านระบบ Order Chat
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">5. กฎระเบียบชุมชนและการห้ามเจรจานอกระบบ (Anti-Fraud Policy)</h2>
            <p className="text-mutedGray">
              เพื่อความปลอดภัยและการันตีสิทธิประโยชน์ของทุกฝ่าย ห้ามมิให้ผู้ใช้งาน ลูกค้า ครีเอเตอร์ และซัพพลายเออร์ แลกเปลี่ยนช่องทางการติดต่อส่วนตัว (เช่น LINE ID, เบอร์โทรศัพท์ส่วนตัว) เพื่อชักชวนให้ทำธุรกรรมนอกแพลตฟอร์ม ระบบมีกลไกตรวจจับและระงับการใช้งานหากพบพฤติกรรมเสี่ยง
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
