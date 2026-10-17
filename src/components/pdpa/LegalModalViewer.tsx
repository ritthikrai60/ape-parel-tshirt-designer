'use client';

import React from 'react';
import { X, ShieldCheck, FileText, Cookie, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export type LegalDocType = 'privacy' | 'terms' | 'cookies';

interface LegalModalViewerProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalDocType;
}

export const LegalModalViewer: React.FC<LegalModalViewerProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case 'privacy':
        return 'นโยบายความเป็นส่วนตัว (PDPA Privacy Policy)';
      case 'terms':
        return 'ข้อกำหนดและเงื่อนไขการให้บริการ (Terms of Service)';
      case 'cookies':
        return 'นโยบายการใช้คุกกี้ (Cookies Policy)';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'privacy':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'terms':
        return <FileText className="w-5 h-5 text-amber-600" />;
      case 'cookies':
        return <Cookie className="w-5 h-5 text-warm-dark" />;
    }
  };

  const getFullPageLink = () => {
    switch (type) {
      case 'privacy':
        return '/privacy';
      case 'terms':
        return '/terms';
      case 'cookies':
        return '/cookies';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-paper-light border border-borderCol rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderCol flex items-center justify-between bg-paper">
          <div className="flex items-center space-x-2.5">
            {getIcon()}
            <div>
              <h3 className="font-sans font-bold text-sm text-ink">{getTitle()}</h3>
              <p className="text-[11px] font-mono text-mutedGray">
                ปรับปรุงล่าสุด: 14 ตุลาคม 2569 • เวอร์ชั่น 1.0 (PDPA Compliance)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={getFullPageLink()}
              target="_blank"
              className="text-mutedGray hover:text-ink p-1.5 rounded-lg hover:bg-paper-dark transition-colors"
              title="เปิดอ่านหน้าเต็มในแท็บใหม่"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-mutedGray hover:text-ink p-1.5 rounded-lg hover:bg-paper-dark transition-colors"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-ink/90 font-sans leading-relaxed">
          {type === 'privacy' && (
            <>
              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">1. บทนำและขอบเขตการบังคับใช้</h4>
                <p>
                  แพลตฟอร์ม <strong>APE-PAREL</strong> ให้ความสำคัญอย่างยิ่งต่อการคุ้มครองข้อมูลส่วนบุคคลของท่าน เพื่อให้เป็นไปตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) นโยบายฉบับนี้จัดทำขึ้นเพื่อชี้แจงรายละเอียดเกี่ยวกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของลูกค้า ครีเอเตอร์ ซัพพลายเออร์ และผู้เข้าชมเว็บไซต์
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม</h4>
                <ul className="list-disc pl-5 space-y-1 text-mutedGray">
                  <li><strong>ข้อมูลระบุตัวตน:</strong> ชื่อ นามสกุล อีเมล บัญชีผู้ใช้งาน</li>
                  <li><strong>ข้อมูลการจัดส่งและคำสั่งซื้อ:</strong> ที่อยู่จัดส่ง หมายเลขโทรศัพท์ ประวัติการสั่งซื้อ และขนาดเสื้อผ้า</li>
                  <li><strong>ข้อมูลธุรกรรมทางการเงิน:</strong> บันทึกการชำระเงิน หลักฐานสลิป หรือข้อมูลบัญชีพร้อมเพย์สำหรับการเบิกจ่ายส่วนแบ่งค่าลิขสิทธิ์ (Royalty Payouts)</li>
                  <li><strong>ข้อมูลทางเทคนิค:</strong> ที่อยู่ IP คุกกี้ พฤติกรรมการเยี่ยมชมเว็บไซต์ ข้อมูลเบราว์เซอร์</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">3. วัตถุประสงค์ในการประมวลผลข้อมูล</h4>
                <p>เราประมวลผลข้อมูลเพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
                <ul className="list-disc pl-5 space-y-1 text-mutedGray">
                  <li>การให้บริการสั่งตัด ปรับแต่งลายเสื้อแบบ 2D/3D และจัดพิมพ์เสื้อยืด DTG ตามคำสั่งซื้อ</li>
                  <li>การประสานงานจัดส่งสินค้าร่วมกับโรงพิมพ์พาร์ทเนอร์และบริษัทขนส่ง</li>
                  <li>การคำนวณและชำระค่าลิขสิทธิ์ (Royalties) ให้แก่ดีไซเนอร์และครีเอเตอร์อย่างโปร่งใส</li>
                  <li>การส่งข่าวสารและโปรโมชั่น (เมื่อท่านให้ความยินยอมโดยสมัครใจ)</li>
                  <li>การป้องกันการทุจริตและการละเมิดลิขสิทธิ์ทรัพย์สินทางปัญญา</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">4. สิทธิของเจ้าของข้อมูลส่วนบุคคล (Data Subject Rights)</h4>
                <p>ตามกฎหมาย PDPA ท่านมีสิทธิดังต่อไปนี้:</p>
                <ul className="list-disc pl-5 space-y-1 text-mutedGray">
                  <li><strong>สิทธิขอเข้าถึงและขอรับสำเนา</strong> ข้อมูลส่วนบุคคลของท่าน</li>
                  <li><strong>สิทธิขอให้แก้ไข</strong> ข้อมูลส่วนบุคคลให้ถูกต้อง เป็นปัจจุบัน และสมบูรณ์</li>
                  <li><strong>สิทธิขอให้ลบ ทำลาย หรือทำให้ไม่สามารถระบุตัวบุคคลได้</strong></li>
                  <li><strong>สิทธิขอถอนความยินยอม</strong> ในการประมวลผลข้อมูลที่ท่านเคยให้ไว้ (เช่น การถอนความยินยอมคุกกี้ หรือการยกเลิกรับข่าวสารทางอีเมล)</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">5. การติดต่อเราและเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)</h4>
                <p className="p-3 bg-paper rounded-xl border border-borderCol font-mono text-[11px]">
                  อีเมล: dpo@ape-parel.com | โทรศัพท์: +66 (0) 2-123-4567<br />
                  สำนักงาน APE-PAREL Studio ถนนสุขุมวิท กรุงเทพฯ 10110 ประเทศไทย
                </p>
              </section>
            </>
          )}

          {type === 'terms' && (
            <>
              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">1. การยอมรับข้อกำหนด</h4>
                <p>
                  การเข้าใช้งานแพลตฟอร์ม APE-PAREL ถือว่าท่านได้อ่าน ทำความเข้าใจ และตกลงที่จะปฏิบัติตามข้อกำหนดและเงื่อนไขการให้บริการเหล่านี้ทุกประการ
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">2. ลิขสิทธิ์และทรัพย์สินทางปัญญาของผลงาน (Artwork Licensing)</h4>
                <p>
                  ผลงานศิลปะ ลวดลาย และกราฟิกทั้งหมดที่ปรากฏบน Marketplace เป็นลิขสิทธิ์โดยชอบด้วยกฎหมายของครีเอเตอร์ผู้สร้างสรรค์ เมื่อลูกค้าทำการสั่งซื้อเสื้อยืด ลูกค้าจะได้รับสิทธิ์การใช้งานผลงาน (License) ตามขอบเขตการพิมพ์ลงบนเสื้อที่ระบุไว้เท่านั้น ห้ามมิให้นำไฟล์ภาพต้นฉบับไปดัดแปลง คัดลอก หรือแจกจ่ายเพื่อวัตถุประสงค์เชิงพาณิชย์อื่นโดยไม่ได้รับอนุญาต
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">3. กระบวนการสั่งผลิตและการกำหนดราคา (Authoritative Pricing)</h4>
                <p>
                  ระบบคำนวณราคาของ APE-PAREL เป็นระบบ Server-Authoritative คำนวณตามต้นทุนจริงของเนื้อผ้า ค่าบริการพิมพ์ DTG ค่าบรรจุภัณฑ์ ค่าขนส่ง และค่าลิขสิทธิ์ครีเอเตอร์อย่างโปร่งใส คำสั่งซื้อจะเริ่มผลิตเมื่อการชำระเงินได้รับการยืนยันเรียบร้อยแล้ว
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">4. นโยบายการคืนสินค้าและการยกเลิกคำสั่งซื้อ</h4>
                <p>
                  เนื่องจากสินค้าเป็นงานพิมพ์สั่งผลิตเฉพาะบุคคล (Print-on-Demand Custom Apparel) ขอสงวนสิทธิ์การยกเลิกหลังจากเข้าสู่กระบวนการพิมพ์แล้ว ยกเว้นกรณีสินค้าชำรุด มีตำหนิจากการผลิต หรือพิมพ์ไม่ตรงตามสเปก โดยลูกค้าสามารถแจ้งเคลมได้ภายใน 7 วันทำการหลังจากได้รับพัสดุ
                </p>
              </section>
            </>
          )}

          {type === 'cookies' && (
            <>
              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">1. คุกกี้คืออะไร?</h4>
                <p>
                  คุกกี้ (Cookies) คือไฟล์ข้อความขนาดเล็กที่ถูกจัดเก็บบนอุปกรณ์ของท่านเมื่อท่านเข้าชมเว็บไซต์ ช่วยให้เว็บไซต์จดจำการตั้งค่า เซสชันการเข้าสู่ระบบ ลวดลายเสื้อในห้อง Customizer และช่วยให้เรานำเสนอบริการที่สะดวกราบรื่นยิ่งขึ้น
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">2. ประเภทของคุกกี้ที่เราใช้</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-paper rounded-xl border border-borderCol">
                    <span className="font-bold text-ink">1) คุกกี้ที่จำเป็นอย่างยิ่ง (Strictly Necessary Cookies):</span>
                    <p className="mt-1 text-mutedGray">
                      จำเป็นสำหรับการทำงานพื้นฐานของเว็บไซต์ เช่น การเข้าสู่ระบบ ตะกร้าสินค้า การบันทึกสถานะเสื้อยืด 3D ในสตูดิโอ และการรักษาความปลอดภัย ไม่สามารถปิดการใช้งานได้
                    </p>
                  </div>
                  <div className="p-3 bg-paper rounded-xl border border-borderCol">
                    <span className="font-bold text-ink">2) คุกกี้เพื่อการวิเคราะห์และวัดผล (Analytical/Performance Cookies):</span>
                    <p className="mt-1 text-mutedGray">
                      ช่วยให้เราเข้าใจพฤติกรรมการใช้งาน เช่น หน้าเว็บที่ได้รับความนิยม ระยะเวลาเข้าชม เพื่อนำมาปรับปรุงความเสถียรและความเร็วของเว็บไซต์
                    </p>
                  </div>
                  <div className="p-3 bg-paper rounded-xl border border-borderCol">
                    <span className="font-bold text-ink">3) คุกกี้เพื่อการตลาดและโฆษณา (Marketing Cookies):</span>
                    <p className="mt-1 text-mutedGray">
                      ใช้เพื่อนำเสนอโปรโมชั่น สิทธิพิเศษ คอลเลกชันใหม่ หรือส่วนลดพิเศษที่ตรงกับความสนใจของท่าน
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-sm text-ink">3. การถอนความยินยอมและจัดการคุกกี้</h4>
                <p>
                  ท่านสามารถเปลี่ยนใจหรือถอนความยินยอมคุกกี้ที่ไม่จำเป็นได้ตลอดเวลา โดยคลิกที่ปุ่ม <strong>"ตั้งค่าคุกกี้" (Cookie Settings)</strong> ที่ส่วนท้ายของเว็บไซต์ (Footer) หรือล้างข้อมูลคุกกี้ในเบราว์เซอร์ของท่าน
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-borderCol flex items-center justify-between bg-paper">
          <Link
            href={getFullPageLink()}
            className="text-xs font-mono text-ink font-semibold underline hover:text-warm-dark transition-colors"
          >
            อ่านหน้าเว็บฉบับเต็ม →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider rounded-xl hover:bg-ink-light transition-colors"
          >
            เข้าใจและปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
