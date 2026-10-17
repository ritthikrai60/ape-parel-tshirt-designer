'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  BarChart3,
  Package,
  DollarSign,
  Monitor,
  Warehouse,
  Sparkles,
  Scale,
  Users,
  History,
  MessageSquare,
  Mail,
  Search,
  ArrowRight,
  Filter,
  ShieldAlert,
  Boxes,
  ShieldCheck,
  Landmark,
  Cpu,
  X,
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'analytics'
  | 'orders'
  | 'inventory'
  | 'moderation'
  | 'financials'
  | 'payouts'
  | 'cms'
  | 'users'
  | 'audit'
  | 'chat-audit'
  | 'subscribers';

export type AdminWorkflowCategory = 'ALL' | 'OPERATIONS' | 'TRUST' | 'FINANCE' | 'SYSTEM';

export interface AdminToolMeta {
  key: TabType;
  category: AdminWorkflowCategory;
  nameEn: string;
  nameTh: string;
  badgeLabel?: string;
  badgeAlert?: boolean;
  descTh: string;
  icon: React.ComponentType<{ className?: string }>;
  companionKeys: TabType[];
}

export interface AdminWorkflowNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  stats: {
    ordersCount: number;
    pendingPayoutCount: number;
    bannersCount: number;
    variantsCount: number;
    pendingModerationCount: number;
    usersCount: number;
    auditLogsCount: number;
  };
}

export const ADMIN_CATEGORIES: {
  id: AdminWorkflowCategory;
  labelEn: string;
  labelTh: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: 'ALL', labelEn: 'All Workflows', labelTh: 'เครื่องมือทั้งหมด', icon: Filter, color: 'text-ink' },
  { id: 'OPERATIONS', labelEn: 'Fulfillment & Ops', labelTh: 'การผลิตและคำสั่งซื้อ', icon: Boxes, color: 'text-blue-600' },
  { id: 'TRUST', labelEn: 'Trust & Safety', labelTh: 'ความปลอดภัยและคอนเทนต์', icon: ShieldCheck, color: 'text-purple-600' },
  { id: 'FINANCE', labelEn: 'Finance & Tax', labelTh: 'การเงิน ภาษี และบัญชี', icon: Landmark, color: 'text-emerald-600' },
  { id: 'SYSTEM', labelEn: 'System & Governance', labelTh: 'ระบบ สิทธิ์ และสถิติ', icon: Cpu, color: 'text-warm-dark' },
];

export const AdminWorkflowNav: React.FC<AdminWorkflowNavProps> = ({
  activeTab,
  onSelectTab,
  stats,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AdminWorkflowCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Define comprehensive metadata for all 12 tools organized into 4 distinct workflows
  const tools: AdminToolMeta[] = useMemo(
    () => [
      // 1. OPERATIONS WORKFLOW
      {
        key: 'orders',
        category: 'OPERATIONS',
        nameEn: 'Orders & SLA',
        nameTh: 'คำสั่งซื้อและการผลิต',
        badgeLabel: `${stats.ordersCount} ออเดอร์`,
        descTh: 'จัดสรรคำสั่งซื้อให้โรงงาน ตรวจสอบ SLA การผลิต รีเราต์ฉุกเฉิน พิมพ์ซ้ำฟรี QA และจัดการคืนเงิน',
        icon: Package,
        companionKeys: ['inventory', 'chat-audit'],
      },
      {
        key: 'inventory',
        category: 'OPERATIONS',
        nameEn: 'Inventory Matrix',
        nameTh: 'คลังสินค้าและสต็อกฉุกเฉิน',
        badgeLabel: `${stats.variantsCount} ตัวเลือก`,
        descTh: 'ตรวจสอบความพร้อมของสต็อกเสื้อเปล่าทุกสี/ไซส์ เชื่อมโยงซัพพลายเออร์ และปรับแก้สต็อกฉุกเฉินทันที',
        icon: Warehouse,
        companionKeys: ['orders'],
      },

      // 2. TRUST, SAFETY & COMMUNITY WORKFLOW
      {
        key: 'moderation',
        category: 'TRUST',
        nameEn: 'IP Moderation',
        nameTh: 'ตรวจสอบลายพิมพ์ & ลิขสิทธิ์',
        badgeLabel: stats.pendingModerationCount > 0 ? `${stats.pendingModerationCount} รอตรวจ` : undefined,
        badgeAlert: stats.pendingModerationCount > 0,
        descTh: 'คัดกรองผลงานศิลปะใหม่ ตรวจสอบความละเอียด DPI ขนาดพิกเซล มาตรฐานสี และป้องกันการละเมิดลิขสิทธิ์',
        icon: Sparkles,
        companionKeys: ['cms', 'chat-audit'],
      },
      {
        key: 'chat-audit',
        category: 'TRUST',
        nameEn: 'Chat & Anti-Fraud',
        nameTh: 'ตรวจสอบแชต & ป้องกันโกง',
        badgeLabel: 'ดักจับธุรกรรมนอกระบบ',
        descTh: 'ระบบตรวจจับคีย์เวิร์ดเสี่ยง บัญชีธนาคาร พร้อมเพย์ เบอร์โทร และ LINE ID เพื่อป้องกันการซื้อขายนอกแพลตฟอร์ม',
        icon: MessageSquare,
        companionKeys: ['orders', 'moderation'],
      },
      {
        key: 'cms',
        category: 'TRUST',
        nameEn: 'Marketplace CMS & Promos',
        nameTh: 'แบนเนอร์หน้าร้าน & โค้ดส่วนลด',
        badgeLabel: `${stats.bannersCount} แบนเนอร์`,
        descTh: 'จัดการแบนเนอร์แคมเปญหน้าแรก ปรับลำดับความสำคัญ และสร้างโค้ดโปรโมชันส่วนลดให้ลูกค้า',
        icon: Monitor,
        companionKeys: ['moderation', 'subscribers'],
      },
      {
        key: 'subscribers',
        category: 'TRUST',
        nameEn: 'Subscribers & Alerts',
        nameTh: 'สมาชิกรับข่าวสาร & การแจ้งเตือน',
        descTh: 'ตรวจสอบรายชื่อผู้ติดตามรับข่าวสาร จดหมายข่าวสารโปรโมชัน และการจัดการความยินยอมตามกฎหมาย PDPA',
        icon: Mail,
        companionKeys: ['cms'],
      },

      // 3. FINANCE & COMPLIANCE WORKFLOW
      {
        key: 'payouts',
        category: 'FINANCE',
        nameEn: 'Creator Payouts & Settlement',
        nameTh: 'เบิกจ่ายครีเอเตอร์ & รายการหักภาษี',
        badgeLabel: stats.pendingPayoutCount > 0 ? `${stats.pendingPayoutCount} รออนุมัติ` : 'พร้อมจ่าย',
        badgeAlert: stats.pendingPayoutCount > 0,
        descTh: 'ตรวจสอบคำขอถอนเงิน หักภาษี ณ ที่จ่าย 3% อัตโนมัติ บันทึกใบสรุปยอดการจ่ายเงินค่าลิขสิทธิ์ และส่งออกไฟล์แบงก์กิ้ง',
        icon: DollarSign,
        companionKeys: ['financials'],
      },
      {
        key: 'financials',
        category: 'FINANCE',
        nameEn: 'Ledger & Audit Accounts',
        nameTh: 'บัญชีแยกประเภทคู่ & เอสโครว์',
        descTh: 'ตรวจสอบงบการเงินแบบ Double-Entry ตรวจสอบยอดเงินใน Escrow Vault และค่าธรรมเนียมระบบ Zero-Sum',
        icon: Scale,
        companionKeys: ['payouts'],
      },

      // 4. SYSTEM, IAM & INTELLIGENCE WORKFLOW
      {
        key: 'overview',
        category: 'SYSTEM',
        nameEn: 'Command Overview',
        nameTh: 'ศูนย์ควบคุมภาพรวมระบบ',
        descTh: 'สรุปภาพรวมยอดขาย GMV ตัวชี้วัดสำคัญของทั้ง 4 เสาหลัก (Pillars) และสถานะการทำงานแบบเรียลไทม์',
        icon: Layers,
        companionKeys: ['analytics', 'audit'],
      },
      {
        key: 'analytics',
        category: 'SYSTEM',
        nameEn: 'Visitor Analytics',
        nameTh: 'วิเคราะห์ผู้เข้าชม & สถิติสด',
        badgeLabel: 'Live Telemetry',
        descTh: 'วิเคราะห์สถิติผู้เข้าชมเว็บไซต์แบบเรียลไทม์ (PDPA Anonymized) อุปกรณ์ แหล่งที่มา และอัตราคอนเวอร์ชัน',
        icon: BarChart3,
        companionKeys: ['overview'],
      },
      {
        key: 'users',
        category: 'SYSTEM',
        nameEn: 'Users & IAM',
        nameTh: 'จัดการผู้ใช้ & สิทธิ์การเข้าถึง',
        badgeLabel: `${stats.usersCount} บัญชี`,
        descTh: 'จัดการผู้ใช้ในระบบ กำหนดและเปลี่ยนบทบาท (Customer, Creator, Supplier, Admin) ตามหลัก Least Privilege',
        icon: Users,
        companionKeys: ['audit'],
      },
      {
        key: 'audit',
        category: 'SYSTEM',
        nameEn: 'Audit Trail',
        nameTh: 'บันทึกประวัติการกระทำของระบบ',
        badgeLabel: `${stats.auditLogsCount} รายการ`,
        descTh: 'ตรวจสอบประวัติกิจกรรมการทำงาน การเข้าสู่ระบบ และการแก้ไขข้อมูลย้อนหลังอย่างโปร่งใสและตรวจสอบได้',
        icon: History,
        companionKeys: ['users', 'overview'],
      },
    ],
    [stats]
  );

  // Active Tool Object
  const currentTool = useMemo(
    () => tools.find((t) => t.key === activeTab) || tools[0],
    [tools, activeTab]
  );

  // Filter tools based on selected category and search input
  const filteredTools = useMemo(() => {
    let result = tools;
    if (selectedCategory !== 'ALL') {
      result = result.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.nameEn.toLowerCase().includes(q) ||
          t.nameTh.toLowerCase().includes(q) ||
          t.descTh.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tools, selectedCategory, searchQuery]);

  // Current category detail
  const currentCategoryMeta = useMemo(
    () => ADMIN_CATEGORIES.find((c) => c.id === currentTool.category) || ADMIN_CATEGORIES[0],
    [currentTool]
  );

  return (
    <div className="space-y-4">
      {/* 1. Workflow Hub Category Switcher + Fast Search */}
      <div className="bg-paper-light border border-borderCol rounded-xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {ADMIN_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isCatActive = selectedCategory === cat.id;
              // Count tools in this category
              const count = cat.id === 'ALL' ? tools.length : tools.filter((t) => t.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shrink-0 ${
                    isCatActive
                      ? 'bg-ink text-paper shadow-sm'
                      : 'bg-paper text-mutedGray hover:text-ink hover:bg-paper-dark border border-borderCol/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isCatActive ? 'text-warm' : cat.color}`} />
                  <span>{cat.labelEn}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isCatActive ? 'bg-white/20 text-paper' : 'bg-borderCol/40 text-mutedGray'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเครื่องมือ (เช่น ออเดอร์, ภาษี, แชต)..."
              className="w-full pl-8 pr-8 py-1.5 bg-paper border border-borderCol rounded-lg text-xs font-sans text-ink placeholder:text-mutedGray focus:outline-hidden focus:border-ink focus:ring-1 focus:ring-ink transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mutedGray hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Tool Tabs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 border-t border-borderCol/60">
          {filteredTools.length > 0 ? (
            filteredTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTab === tool.key;

              return (
                <button
                  key={tool.key}
                  onClick={() => onSelectTab(tool.key)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between group relative ${
                    isActive
                      ? 'bg-paper border-ink shadow-sm ring-1 ring-ink'
                      : 'bg-paper/60 hover:bg-paper border-borderCol hover:border-ink/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full mb-1">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-ink text-warm' : 'bg-paper-dark text-mutedGray group-hover:text-ink'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {/* Alert or Counter Badge */}
                    {tool.badgeLabel && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-tight shrink-0 ${
                          tool.badgeAlert
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                            : isActive
                            ? 'bg-ink/10 text-ink font-semibold'
                            : 'bg-borderCol/40 text-mutedGray'
                        }`}
                      >
                        {tool.badgeLabel}
                      </span>
                    )}
                  </div>

                  <div>
                    <span
                      className={`block font-mono text-[11px] font-bold tracking-tight truncate ${
                        isActive ? 'text-ink' : 'text-ink/80 group-hover:text-ink'
                      }`}
                    >
                      {tool.nameEn}
                    </span>
                    <span className="block text-[10px] text-mutedGray truncate">{tool.nameTh}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full py-4 text-center font-mono text-xs text-mutedGray">
              ไม่พบเครื่องมือที่ตรงกับคำค้นหา "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* 3. Workflow Context Breadcrumb & Companion Tools Bar */}
      <div className="bg-paper border border-borderCol rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-warm/20 border border-warm/40 flex items-center justify-center text-warm shrink-0">
            <currentTool.icon className="w-4 h-4 text-ink" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] uppercase font-black tracking-wider text-mutedGray">
                {currentCategoryMeta.labelEn}
              </span>
              <span className="text-mutedGray font-mono text-xs">&gt;</span>
              <span className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                {currentTool.nameEn}
              </span>
              <span className="text-[11px] text-mutedGray font-sans">({currentTool.nameTh})</span>
            </div>
            <p className="text-xs text-mutedGray font-sans mt-0.5 leading-snug">
              {currentTool.descTh}
            </p>
          </div>
        </div>

        {/* Companion Workflow Quick Jumps */}
        {currentTool.companionKeys.length > 0 && (
          <div className="flex items-center space-x-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-borderCol/40">
            <span className="font-mono text-[10px] uppercase text-mutedGray tracking-wider hidden lg:inline-block">
              Related Tools:
            </span>
            {currentTool.companionKeys.map((companionKey) => {
              const compTool = tools.find((t) => t.key === companionKey);
              if (!compTool) return null;
              const CompIcon = compTool.icon;

              return (
                <button
                  key={compTool.key}
                  type="button"
                  onClick={() => onSelectTab(compTool.key)}
                  className="px-2.5 py-1 rounded bg-paper-light hover:bg-paper-dark border border-borderCol text-ink font-mono text-[11px] font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                  title={`สลับไปที่ ${compTool.nameTh}`}
                >
                  <CompIcon className="w-3 h-3 text-mutedGray" />
                  <span>{compTool.nameEn}</span>
                  <ArrowRight className="w-3 h-3 text-warm" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
