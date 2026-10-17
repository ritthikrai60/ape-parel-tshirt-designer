'use client';

import React from 'react';
import Link from 'next/link';
import {
  Palette,
  Factory,
  ArrowRight,
  Code2,
  Layers,
  CheckCircle2,
  Compass,
  Shirt,
  History,
} from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, APP_CORE_STACK } from '@/lib/version';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Hero Section */}
      <section className="border-b border-borderCol bg-paper-dark/20 py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider">
            <span>เกี่ยวกับแพลตฟอร์ม (About Us)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight font-mono text-ink">
            APE-PAREL // ตลาดกลางเสื้อยืดสตรีทแวร์คัสตอม
          </h1>

          <p className="text-sm sm:text-base text-mutedGray font-sans leading-relaxed max-w-2xl">
            แพลตฟอร์มที่รวมนักออกแบบอิสระ ผู้ซื้อ และโรงพิมพ์เสื้อ Direct-to-Garment (DTG) เข้าด้วยกัน
            เพื่อให้ทุกคนสามารถสร้างสรรค์และสั่งทำเสื้อยืดคุณภาพสูงได้ง่ายและโปร่งใส
          </p>

          {/* Version & Build Date */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/changelog"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-borderCol bg-paper hover:bg-paper-dark hover:border-ink transition-colors font-mono text-xs shadow-2xs"
            >
              <span className="font-bold text-ink">{APP_VERSION}</span>
              <span className="text-mutedGray">Release Notes</span>
              <ArrowRight className="w-3.5 h-3.5 text-mutedGray ml-1" />
            </Link>
            <span className="font-mono text-xs text-mutedGray border border-borderCol/60 px-3 py-1.5 rounded-lg">
              อัปเดตเมื่อ {APP_BUILD_DATE}
            </span>
          </div>
        </div>
      </section>

      {/* 3 Pillars */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="border-b border-borderCol pb-4">
          <h2 className="text-xl sm:text-2xl font-mono font-black uppercase tracking-tight">
            การทำงานร่วมกันของ 3 ฝ่าย
          </h2>
          <p className="text-xs text-mutedGray font-sans mt-1">
            โครงสร้างการให้บริการที่ออกแบบให้ทุกฝ่ายทำงานร่วมกันได้อย่างราบรื่น
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Creators */}
          <div className="p-5 bg-paper border border-borderCol rounded-xl space-y-3 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Palette className="w-4 h-4" />
            </div>
            <h3 className="text-base font-mono font-bold uppercase">
              1. นักออกแบบ (Creators)
            </h3>
            <p className="text-xs text-mutedGray font-sans leading-relaxed">
              เปิดให้ศิลปินลงผลงานและกำหนดรูปแบบลิขสิทธิ์ได้ตามต้องการ ทั้งแบบจ่ายตามจำนวนชิ้น หรือเหมาซื้อขาดในราคาเดียว
            </p>
            <ul className="text-xs font-mono space-y-1.5 text-ink/80 pt-2 border-t border-borderCol/60">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>เลือกลิขสิทธิ์แบบต่อชิ้นหรือเหมาขาด</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>คำนวณและแสดงส่วนแบ่งรายได้ชัดเจน</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2: Printing Partners */}
          <div className="p-5 bg-paper border border-borderCol rounded-xl space-y-3 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Factory className="w-4 h-4" />
            </div>
            <h3 className="text-base font-mono font-bold uppercase">
              2. โรงพิมพ์ (Suppliers)
            </h3>
            <p className="text-xs text-mutedGray font-sans leading-relaxed">
              โรงงานพิมพ์ที่ผ่านการตรวจสอบข้อมูลนิติบุคคล ผลิตด้วยเครื่องพิมพ์ DTG และใช้น้ำหมึกมาตรฐานอุตสาหกรรม
            </p>
            <ul className="text-xs font-mono space-y-1.5 text-ink/80 pt-2 border-t border-borderCol/60">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>มีใบพิมพ์ระบุตำแหน่งและสเปกสี</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>รองรับเนื้อผ้า 240 GSM และ 200 GSM</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3: Shoppers */}
          <div className="p-5 bg-paper border border-borderCol rounded-xl space-y-3 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-mono font-bold uppercase">
              3. ผู้สั่งทำ (Customers)
            </h3>
            <p className="text-xs text-mutedGray font-sans leading-relaxed">
              ปรับแต่งลายเสื้อผ่านเครื่องมือ 3D ดูตัวอย่างรอบทิศทางก่อนสั่งซื้อ พร้อมตรวจสอบราคาสุทธิที่หน้าจอได้ทันที
            </p>
            <ul className="text-xs font-mono space-y-1.5 text-ink/80 pt-2 border-t border-borderCol/60">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>หมุนดูตัวอย่างเสื้อแบบ 3 มิติ</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>บันทึกดีไซน์ไว้สั่งซ้ำได้ในอนาคต</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tech Specifications Matrix */}
      <section className="bg-paper-dark/30 border-y border-borderCol py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-mono font-black uppercase tracking-tight">
              เทคโนโลยีที่ใช้งาน
            </h2>
            <p className="text-xs text-mutedGray font-sans mt-0.5">
              ระบบพัฒนาขึ้นด้วยเทคโนโลยีเว็บสมัยใหม่เพื่อความเสถียรและความแม่นยำในการสั่งทำ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            {APP_CORE_STACK.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-paper border border-borderCol rounded-lg flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] text-mutedGray uppercase tracking-wider block">
                    {item.name}
                  </span>
                  <span className="font-bold text-ink">{item.value}</span>
                </div>
                <Code2 className="w-4 h-4 text-warm-dark shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Bar */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="p-6 sm:p-8 bg-ink text-paper rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-mono font-black uppercase tracking-tight">
              เริ่มต้นออกแบบเสื้อยืดของคุณ
            </h3>
            <p className="text-xs text-paper-dark/80 font-sans max-w-md">
              เปิดหน้า 3D Studio เพื่อทดลองวางลายเสื้อ หรือเลือกลายกราฟิกจากศิลปินใน Marketplace
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/studio/new"
              className="px-4 py-2 rounded-lg bg-warm text-ink font-mono text-xs font-bold uppercase tracking-wider hover:bg-warm-light transition-colors flex items-center space-x-1.5"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>เปิด 3D Studio</span>
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 rounded-lg border border-paper/30 text-paper hover:bg-paper/10 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>เลือกลาย</span>
            </Link>
            <Link
              href="/changelog"
              className="px-4 py-2 rounded-lg border border-paper/30 text-paper hover:bg-paper/10 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>ประวัติเวอร์ชัน</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
