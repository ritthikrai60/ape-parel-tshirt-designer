import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  Factory,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Ruler,
  BadgeDollarSign,
  Layers,
  Truck,
  MessageSquare,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Supplier Partner Network | APE-PAREL',
  description:
    'Join the APE-PAREL verified manufacturing network. Fulfill on-demand custom streetwear orders with digital 3D blueprints and guaranteed escrow settlements.',
};

export default async function SupplierPortalRootPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const userRole = (session?.user as any)?.role as string | undefined;

  // 1. If already a Supplier or Admin, send directly to Supplier Dashboard
  if (userRole === 'SUPPLIER' || userRole === 'ADMIN') {
    redirect('/supplier/dashboard');
  }

  // 2. Check if user has an existing supplier profile even if role is not updated
  if (userId) {
    const profile = await prisma.supplierProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (profile) {
      redirect('/supplier/dashboard');
    }
  }

  // 3. For Guests and Customers without a supplier profile, show the Partner Hub landing page
  return (
    <div className="flex-1 w-full bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm/30 border border-warm/60 text-ink font-mono text-xs uppercase tracking-wider font-semibold">
            <Factory className="w-3.5 h-3.5 text-warm-dark" />
            <span>Industrial Manufacturing Partner Portal</span>
          </div>

          <h1 className="font-sans font-black text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
            เชื่อมต่อโรงพิมพ์ของคุณเข้ากับ <span className="text-warm-dark">APE-PAREL Ecosystem</span>
          </h1>

          <p className="text-mutedGray font-sans text-sm sm:text-base leading-relaxed">
            รับคำสั่งซื้อผลิตสตรีทแวร์ตามความต้องการ (On-Demand) จากครีเอเตอร์และแบรนด์ชั้นนำ
            ผลิตด้วยพิมพ์เขียวไม้บรรทัดดิจิทัล 3D และรับประกันการเบิกจ่ายยอดเงินผลิตผ่านระบบ Escrow ปลอดภัย 100%
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {session?.user ? (
              <Link
                href="/supplier/onboarding"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink-light transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>สมัครเข้าร่วมเครือข่ายโรงงานพาร์ทเนอร์</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login?callbackUrl=/supplier/onboarding"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink-light transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ระบบเพื่อสมัครพาร์ทเนอร์</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              href="/supplier/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-borderCol bg-paper-light hover:bg-paper-dark text-ink font-mono text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-mutedGray" />
              <span>เข้าสู่ระบบหลังบ้านซัพพลายเออร์</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-warm/30 border border-warm/60 flex items-center justify-center text-warm-dark">
              <Ruler className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              1. พิมพ์เขียวพิกัดเซนติเมตร (3D Digital RIP Blueprints)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              หมดปัญหาการสกรีนผิดตำแหน่ง ด้วยสเปกพิมพ์เขียว Production Blueprint Sheet ที่แสดงพิกัด กว้าง x ยาว x ตำแหน่งเป็นเซนติเมตร พร้อมลิงก์ดาวน์โหลดไฟล์ภาพต้นฉบับความละเอียดสูงระดับ Master
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
              <BadgeDollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              2. ประกันรายได้และเบิกจ่ายผ่าน Escrow (Guaranteed Payouts)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              ยอดเงินค่าผลิตและค่าเสื้อเปล่าจะถูกค้ำประกันในระบบ Escrow ทันทีที่ลูกค้ากดสั่งซื้อ และโอนเข้าบัญชีโรงสกรีนทันทีหลังอัปเดตสถานะจัดส่งสำเร็จ ตรวจสอบบัญชีย้อนหลังได้ 100%
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-800">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              3. อิสระในการกำหนดสเปกผ้าและราคา (Catalog & Pricing Autonomy)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              โรงงานสามารถกำหนดรุ่นเสื้อเปล่า ความหนาผ้า (GSM), ทรงเสื้อ, สี, สต็อกคงเหลือ, และค่าบริการพิมพ์สกรีน (DTG/Screenprint) ได้อย่างอิสระตามมาตรฐานของโรงงานคุณ
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-paper-light border border-borderCol shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-sans font-bold text-lg text-ink">
              4. ระบบคีย์เลขพัสดุ & แชทตรวจไฟล์ (Fulfillment & Order Chat)
            </h3>
            <p className="text-xs text-mutedGray leading-relaxed font-sans">
              จัดการพัสดุและแจ้งเลขแทร็กกิ้ง (Flash, Kerry, EMS) ได้ในคลิกเดียว พร้อมช่องทางแชทคุยตรงกับลูกค้าและทีมงานคนกลางเมื่อต้องการตรวจสอบไฟล์ก่อนยิงสกรีนจริง
            </p>
          </div>
        </div>

        {/* Requirements & Checklist */}
        <div className="p-6 rounded-2xl bg-paper-dark border border-borderCol space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-warm-dark" />
            <h4 className="font-sans font-bold text-base text-ink">
              เกณฑ์มาตรฐานสำหรับโรงงานพาร์ทเนอร์ APE-PAREL
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-ink">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>เครื่องพิมพ์ DTG หรือโต๊ะสกรีนระดับอุตสาหกรรม</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ระยะเวลาผลิตไม่เกิน 3-5 วันทำการ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>รับประกันผลิตใหม่กรณีงานพิมพ์มีตำหนิ 14 วัน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
