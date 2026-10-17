import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  Palette,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  TrendingUp,
  Boxes,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creator & Artist Hub | APE-PAREL',
  description:
    'Monetize your graphic artwork on premium streetwear. Set your own licensing royalties, track real-time sales, and receive compliant withholding tax statements.',
};

export default async function CreatorPortalRootPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const userRole = (session?.user as any)?.role as string | undefined;

  // 1. If already a Creator or Admin, send directly to Creator Dashboard
  if (userRole === 'CREATOR' || userRole === 'ADMIN') {
    redirect('/creator/dashboard');
  }

  // 2. Check if user has an existing creator profile even if role is not updated
  if (userId) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (profile) {
      redirect('/creator/dashboard');
    }
  }

  // 3. For Guests and Customers without a creator profile, show the Creator Hub landing page
  return (
    <div className="flex-1 w-full bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm/30 border border-warm/60 text-ink font-mono text-xs uppercase tracking-wider font-semibold">
            <Palette className="w-3.5 h-3.5 text-warm-dark" />
            <span>Empowering Independent Graphic Artists</span>
          </div>

          <h1 className="font-sans font-black text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
            เปลี่ยนลายกราฟิกของคุณให้เป็น <span className="text-warm-dark">สตรีทแวร์ระดับโลก</span>
          </h1>

          <p className="text-mutedGray font-sans text-sm sm:text-base leading-relaxed">
            อัปโหลดผลงานภาพวาด ลายสกรีน และมาสคอตเข้าสู่ 3D Studio กำหนดราคาลิขสิทธิ์ต่อชิ้นด้วยตัวเอง
            รับส่วนแบ่งการขายสูงสุด 85% พร้อมระบบบันทึกบัญชีโปร่งใสและใบสรุปยอดการจ่ายเงินค่าลิขสิทธิ์ (Royalty Settlement Statement)
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {session?.user ? (
              <Link
                href="/creator/onboarding"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink-light transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>สมัครเปิดร้านครีเอเตอร์ (Creator Onboarding)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login?callbackUrl=/creator/onboarding"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink-light transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ระบบเพื่อสมัครครีเอเตอร์</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              href="/creator/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-borderCol bg-paper-light hover:bg-paper-dark text-ink font-mono text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-mutedGray" />
              <span>เข้าสู่ระบบหลังบ้านครีเอเตอร์</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-warm/30 border border-warm/60 flex items-center justify-center text-warm-dark">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              1. อิสระในการกำหนดราคาและสัญญา (Licensing Autonomy)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              ศิลปินเป็นเจ้าของลิขสิทธิ์ผลงาน 100% สามารถกำหนดราคาใบอนุญาตต่อตัว (License Fee) ขอบเขตการใช้งาน (Personal / Commercial) และระบุข้อตกลงเฉพาะตัวของแต่ละรูปได้อย่างเสรี
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              2. บัญชีส่วนแบ่งเรียลไทม์ (Transparent Sales & Royalties)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              ทุกครั้งที่มีผู้สั่งสกรีนลายของคุณ ระบบจะบันทึกยอดส่วนแบ่งครีเอเตอร์ลงในบัญชีทันที สามารถดูยอดสะสมและประวัติคำสั่งซื้อที่ใช้ลายของคุณได้แบบ Real-Time
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-800">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              3. ใบสรุปยอดและรายการหักภาษีตามจริง (Royalty Settlement Statement)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              แพลตฟอร์มคำนวณและบันทึกรายการหักภาษี ณ ที่จ่าย 3% ตามมาตรา 40(3) อย่างโปร่งใส พร้อมออกใบสรุปยอดการจ่ายเงินค่าลิขสิทธิ์ (Payment Advice) ให้ทุกรอบการเบิกจ่าย
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              4. เชื่อมโยงเข้าสู่ 3D Studio ทันที (Instant 3D Preview)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              ผลงานที่ผ่านการอนุมัติจะปรากฏใน Marketplace และลิ้นชักกราฟิกในห้องออกแบบ 3D Studio โดยอัตโนมัติ ให้ลูกค้าหมุนดูตัวอย่างรอบทิศทาง 360 องศาก่อนตัดสินใจซื้อ
            </p>
          </div>
        </div>

        {/* Benefits Checklist */}
        <div className="p-6 rounded-2xl bg-paper-dark border border-borderCol space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-warm-dark" />
            <h4 className="font-sans font-bold text-base text-ink">
              สิทธิประโยชน์สำหรับครีเอเตอร์บน APE-PAREL
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-ink">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ไม่มีค่าธรรมเนียมการลงผลงานแรกเข้า</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>คุ้มครองทรัพย์สินทางปัญญา ลายน้ำอัตโนมัติ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ระบบเบิกจ่ายเงินตรงเข้าบัญชีธนาคารไทย</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
