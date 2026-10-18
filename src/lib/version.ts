/**
 * src/lib/version.ts
 * Single source of truth for platform versioning, release metadata, and system changelog.
 */

export interface ChangelogItem {
  type: 'feat' | 'fix' | 'security' | 'ui' | 'perf';
  text: string;
  details?: string;
}

export interface ReleaseMilestone {
  version: string;
  date: string;
  codename: string;
  summary: string;
  isLatest?: boolean;
  highlightBadge?: string;
  changes: ChangelogItem[];
}

export const APP_VERSION = 'v2.4.1';
export const APP_BUILD_DATE = '2026-10-18';
export const APP_CODENAME = 'Studio Scrollable Layout & Global Footer Restoration';
export const APP_CORE_STACK = [
  { name: 'Frontend', value: 'Next.js 14 App Router' },
  { name: '3D Preview', value: 'Three.js & Canvas' },
  { name: 'Database', value: 'Prisma ORM & SQLite' },
  { name: 'Payments', value: 'Stripe (PromptPay & Cards)' },
];

export const CHANGELOG_DATA: ReleaseMilestone[] = [
  {
    version: 'v2.4.1',
    date: '2026-10-18',
    codename: 'Studio Layout & Footer Restoration',
    summary: 'เปิดให้แสดง Footer ทั่วทั้งแพลตฟอร์ม และปรับแต่งเลย์เอาต์หน้า Studio ให้เลื่อนดูเนื้อหาและส่วนท้ายเว็บได้ราบรื่น พร้อมแถบเครื่องมือแบบ sticky top-16',
    isLatest: true,
    highlightBadge: 'เวอร์ชันล่าสุด',
    changes: [
      {
        type: 'ui',
        text: 'เปิดการแสดงผล Platform Footer ในหน้า 3D Studio',
        details: 'นำ Footer กลับมาแสดงผลอย่างถูกต้องที่ด้านล่างสุดของหน้าจอในทุกหน้า',
      },
      {
        type: 'ui',
        text: 'ปรับเลย์เอาต์หน้า Studio ให้เลื่อนดู (Scrollable) ได้เป็นธรรมชาติ',
        details: 'เปลี่ยน wrapper เป็น min-h-[calc(100vh-4rem)] รองรับการเลื่อนหน้าจอลงไปยังส่วนล่างของหน้าเว็บ',
      },
      {
        type: 'fix',
        text: 'แถบเครื่องมือ Studio Toolbar ติดหนึบที่ top-16 ไม่ซ้อนทับ Navbar หรือ Canvas header',
        details: 'กำหนด sticky top-16 z-30 เพื่อให้แถบเครื่องมือคงอยู่ใต้ Navbar (h-16 z-50) เสมอ ป้องกันการทับซ้อนกับ 2D Canvas และ Back Surface',
      },
    ],
  },
  {
    version: 'v2.4.0',
    date: '2026-10-18',
    codename: 'Dual-Scope Licensing',
    summary: 'เพิ่มตัวเลือกลิขสิทธิ์แบบต่อชิ้นหรือเหมาขาดตลอดชีพ พร้อมคำนวณราคาสุทธิที่หน้าชำระเงิน',
    isLatest: false,
    changes: [
      {
        type: 'feat',
        text: 'ตัวเลือกลิขสิทธิ์แบบต่อชิ้น (Per-Garment) และเหมาซื้อขาด (Lifetime Buyout)',
        details: 'ผู้ซื้อสามารถเลือกได้ว่าจะจ่ายค่าลิขสิทธิ์ตามจำนวนชิ้น หรือเหมาจ่ายครั้งเดียวเพื่อนำไปสั่งซ้ำได้ตลอดไป',
      },
      {
        type: 'ui',
        text: 'ปุ่มเลือกลิขสิทธิ์ในหน้ารายการลายและแถบเครื่องมือเลเยอร์',
        details: 'เพิ่มปุ่มเลือกประเภทลิขสิทธิ์บนการ์ดผลงานและเมนูปรับแต่งเลเยอร์ในหน้า 3D Studio',
      },
      {
        type: 'feat',
        text: 'แสดงแจกแจงค่าใช้จ่ายและลิขสิทธิ์ก่อนยืนยันสั่งซื้อ',
        details: 'ตรวจสอบรายละเอียดค่าเสื้อ ค่าพิมพ์ และค่าลิขสิทธิ์อย่างโปร่งใสในหน้าต่าง Checkout Modal',
      },
      {
        type: 'fix',
        text: 'บันทึกลิขสิทธิ์ซื้อขาดลงในคลังดีไซน์ (Design Vault)',
        details: 'ลายที่ซื้อขาดแล้วจะถูกบันทึกในบัญชีผู้ใช้ ทำให้การสั่งพิมพ์ซ้ำในอนาคตไม่มีค่าลิขสิทธิ์ซ้ำซ้อน',
      },
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-10-17',
    codename: 'Supplier Verification',
    summary: 'ระบบยืนยันตัวตนโรงพิมพ์และหน้าจอตรวจสอบเอกสารสำหรับผู้ดูแลระบบ',
    changes: [
      {
        type: 'security',
        text: 'แบบฟอร์มยืนยันตัวตนผู้ผลิต (KYB Onboarding)',
        details: 'รองรับการกรอกเลขนิติบุคคล 13 หลัก และอัปโหลดเอกสารประกอบ เช่น หนังสือรับรอง ภ.พ.20 และสมุดบัญชี',
      },
      {
        type: 'ui',
        text: 'หน้าจอตรวจสอบเอกสารสำหรับผู้ดูแลระบบ',
        details: 'เครื่องมือดูภาพเอกสารความละเอียดสูง พร้อมระบบอนุมัติหรือแจ้งเหตุผลการแก้ไขกลับไปยังโรงงาน',
      },
      {
        type: 'feat',
        text: 'จำกัดสิทธิ์รับงานผลิตเฉพาะโรงงานที่ผ่านการตรวจสอบ',
        details: 'ระบบตรวจสอบสถานะก่อนอนุญาตให้โรงงานกดรับคำสั่งซื้อของลูกค้า',
      },
    ],
  },
  {
    version: 'v2.2.0',
    date: '2026-10-14',
    codename: '3D Studio & Garment Matrix',
    summary: 'ระบบจำลองเสื้อยืด 3 มิติ และตัวเลือกความหนาเนื้อผ้า',
    changes: [
      {
        type: 'ui',
        text: 'พรีวิวเสื้อยืด 3 มิติ (Three.js WebGL)',
        details: 'หมุนดูเสื้อยืดรอบทิศทาง 360 องศา ปรับเปลี่ยนมุมมองด้านหน้า ด้านหลัง และไอโซเมตริก',
      },
      {
        type: 'perf',
        text: 'สร้างภาพตัวอย่างหลายมุมมองโดยอัตโนมัติ',
        details: 'เรนเดอร์ภาพตัวอย่างมุมต่างๆ ผ่าน Canvas ทันที ช่วยให้การโหลดหน้าคำสั่งซื้อรวดเร็ว',
      },
      {
        type: 'feat',
        text: 'ตัวเลือกเนื้อผ้าและความหนา (240 GSM และ 200 GSM)',
        details: 'คำนวณสต็อกและราคาตามชนิดเนื้อผ้าที่เลือกจริง',
      },
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-10-11',
    codename: 'Design Vault & Escrow',
    summary: 'ระบบคลังเก็บดีไซน์และบันทึกส่วนแบ่งครีเอเตอร์',
    changes: [
      {
        type: 'feat',
        text: 'คลังเก็บดีไซน์สำหรับสั่งซ้ำ (Design Vault)',
        details: 'ผู้ใช้สามารถบันทึกเสื้อยืดที่ออกแบบไว้เพื่อสั่งซื้อซ้ำได้สะดวก',
      },
      {
        type: 'security',
        text: 'ระบบคุ้มครองส่วนแบ่งและบันทึกรายการบัญชี',
        details: 'บันทึกส่วนแบ่งรายได้ให้ครีเอเตอร์อย่างโปร่งใสและตรวจสอบย้อนหลังได้',
      },
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-10-10',
    codename: 'Payments & Production Blueprint',
    summary: 'ระบบชำระเงินออนไลน์และใบระบุรายละเอียดการพิมพ์',
    changes: [
      {
        type: 'feat',
        text: 'ชำระเงินผ่าน Stripe (PromptPay QR และบัตรเครดิต)',
        details: 'สแกน QR Code หรือชำระผ่านบัตรพร้อมอัปเดตสถานะออเดอร์อัตโนมัติ',
      },
      {
        type: 'feat',
        text: 'ใบระบุสเปกการพิมพ์สำหรับโรงงาน (Production Blueprint)',
        details: 'สรุปขนาด ตำแหน่งพิมพ์ และค่าสีสำหรับการผลิตจริงของโรงพิมพ์',
      },
      {
        type: 'ui',
        text: 'กล่องข้อความสนทนาในแต่ละคำสั่งซื้อ',
        details: 'ช่องทางพูดคุยสอบถามสถานะระหว่างลูกค้า โรงงาน และผู้ดูแลระบบ',
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-10-08',
    codename: 'Initial Release',
    summary: 'เปิดตัวแพลตฟอร์มตลาดกลางสั่งสกรีนเสื้อยืดและคลังภาพกราฟิก',
    changes: [
      {
        type: 'feat',
        text: 'เปิดตัวหน้าร้านค้าและเครื่องมือออกแบบเสื้อยืด',
        details: 'ระบบเลือกซื้อลายกราฟิกจากศิลปินและนำมาจัดวางบนเสื้อยืด',
      },
      {
        type: 'security',
        text: 'ระบบจัดการสิทธิ์ผู้ใช้งาน (Role-Based Access)',
        details: 'แยกพื้นที่ใช้งานสำหรับลูกค้า ครีเอเตอร์ โรงงาน และผู้ดูแลระบบ',
      },
    ],
  },
];
