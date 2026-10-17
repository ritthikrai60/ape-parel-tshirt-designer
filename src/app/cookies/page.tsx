import React from 'react';
import Link from 'next/link';
import { Cookie, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'นโยบายการใช้คุกกี้ (Cookies Policy) | APE-PAREL',
  description: 'นโยบายการใช้คุกกี้และการจัดการสิทธิความยินยอมคุกกี้บนเว็บไซต์ APE-PAREL',
};

export default function CookiesPage() {
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
              <Cookie className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black font-sans uppercase tracking-tight text-ink">
              นโยบายการใช้คุกกี้ (Cookies Policy)
            </h1>
          </div>
          <p className="text-xs font-mono text-mutedGray">
            ฉบับภาษาไทย • มีผลบังคับใช้เมื่อวันที่ 14 ตุลาคม 2569 (เวอร์ชั่น 1.0)
          </p>
        </div>

        <div className="space-y-8 text-sm text-ink leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">1. ข้อมูลเกี่ยวกับคุกกี้</h2>
            <p className="text-mutedGray">
              คุกกี้ คือไฟล์ข้อมูลตัวอักษรขนาดเล็กที่ส่งไปยังคอมพิวเตอร์หรืออุปกรณ์เคลื่อนที่ของท่านเมื่อท่านเข้าชมเว็บไซต์ คุกกี้ช่วยให้เว็บไซต์บันทึกการกระทำและการตั้งค่าของท่าน (เช่น ข้อมูลการล็อกอิน ภาษา ขนาดตัวอักษร และการตั้งค่าอื่นๆ) ในช่วงระยะเวลาหนึ่ง เพื่อให้ท่านไม่ต้องป้อนข้อมูลซ้ำเมื่อกลับมายังเว็บไซต์หรือเปิดดูหน้าต่างๆ
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">2. เราใช้คุกกี้ประเภทใดบ้าง?</h2>
            <div className="space-y-4">
              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-sm text-ink mb-1">1) คุกกี้ที่จำเป็นอย่างยิ่ง (Strictly Necessary Cookies)</h3>
                <p className="text-xs text-mutedGray">
                  คุกกี้เหล่านี้จำเป็นต่อการให้บริการหลักของเว็บไซต์ เช่น การระบุตัวตนเข้าสู่ระบบ NextAuth, การจดจำชิ้นงานและเลเยอร์ที่กำลังออกแบบในสตูดิโอ 3D และการรักษาความปลอดภัยของระบบ ท่านไม่สามารถปิดการใช้งานคุกกี้กลุ่มนี้ได้
                </p>
              </div>

              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-sm text-ink mb-1">2) คุกกี้เพื่อการวิเคราะห์และวัดผล (Analytics / Performance Cookies)</h3>
                <p className="text-xs text-mutedGray">
                  คุกกี้เหล่านี้ช่วยให้เราเข้าใจการโต้ตอบของผู้ใช้งาน การเข้าชมหน้าต่างๆ เพื่อนำข้อมูลสถิติไปเพิ่มความเร็วและความเสถียรของแพลตฟอร์ม
                </p>
              </div>

              <div className="p-4 bg-paper-light border border-borderCol rounded-xl">
                <h3 className="font-bold text-sm text-ink mb-1">3) คุกกี้เพื่อการตลาด (Marketing Cookies)</h3>
                <p className="text-xs text-mutedGray">
                  คุกกี้เหล่านี้ใช้เพื่อติดตามพฤติกรรมความสนใจ เพื่อแนะนำคอลเลกชันใหม่จากดีไซเนอร์ หรือโปรโมชั่นโค้ดส่วนลดที่ตรงใจท่าน
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-ink">3. การถอนความยินยอมและการตั้งค่าคุกกี้</h2>
            <p className="text-mutedGray">
              ท่านสามารถปรับเปลี่ยนความยินยอมการใช้งานคุกกี้ที่ไม่จำเป็นได้ทุกเมื่อ โดยคลิกที่ปุ่ม <strong>&quot;ตั้งค่าคุกกี้&quot;</strong> ที่ส่วนท้ายของเว็บไซต์ APE-PAREL หรือล้างข้อมูลคุกกี้ผ่านการตั้งค่าเบราว์เซอร์ของท่าน
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
