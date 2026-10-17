'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Shirt,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Truck,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Receipt,
  Award,
  Palette,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquare,
  Crown,
  Heart,
  FileText,
  Trash2,
  X,
} from 'lucide-react';
import { UserJournalSummary, JournalItem } from '@/lib/journal';
import { UserVaultData, UserVaultPermanentItem, UserVaultWishlistItem } from '@/lib/vault';
import { OrderChatBox } from '@/components/portal/OrderChatBox';
import { useSettings } from '@/components/providers/SettingsProvider';

interface UserJournalClientProps {
  summary: UserJournalSummary;
  vaultData?: UserVaultData;
  initialTab?: 'ALL' | 'ORDER' | 'DRAFT' | 'PERMANENT_IP' | 'WISHLIST';
}

export const UserJournalClient: React.FC<UserJournalClientProps> = ({
  summary,
  vaultData,
  initialTab = 'ALL',
}) => {
  const { formatPrice, t } = useSettings();
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDER' | 'DRAFT' | 'PERMANENT_IP' | 'WISHLIST'>(initialTab);
  const [selectedCoaItem, setSelectedCoaItem] = useState<JournalItem | null>(null);
  const [chattingOrder, setChattingOrder] = useState<JournalItem | null>(null);
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);
  const [flippedSurfaces, setFlippedSurfaces] = useState<Record<string, 'FRONT' | 'BACK'>>({});

  // Vault state
  const [wishlistItems, setWishlistItems] = useState<UserVaultWishlistItem[]>(
    vaultData?.wishlist || []
  );
  const [permanentIpItems] = useState<UserVaultPermanentItem[]>(
    vaultData?.permanentIps || []
  );
  const [selectedPermanentCertificate, setSelectedPermanentCertificate] =
    useState<UserVaultPermanentItem | null>(null);

  const handleRemoveFromWishlist = async (artworkId: string) => {
    setWishlistItems((prev) => prev.filter((w) => w.artworkId !== artworkId));
    try {
      await fetch(`/api/artworks/${artworkId}/favorite`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    }
  };

  const toggleSurface = (id: string) => {
    setFlippedSurfaces((prev) => ({
      ...prev,
      [id]: prev[id] === 'BACK' ? 'FRONT' : 'BACK',
    }));
  };

  const toggleBreakdown = (id: string) => {
    setExpandedBreakdownId((prev) => (prev === id ? null : id));
  };

  const filteredItems = summary.items.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.type === activeTab;
  });

  return (
    <div className="w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-paper-dark/30 border border-borderCol rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] tracking-widest uppercase bg-ink text-paper px-2 py-0.5 rounded">
              MEMBERSHIP JOURNAL
            </span>
            <span className="font-mono text-xs text-mutedGray">
              บันทึกการเดินทางของดีไซน์และผลงานของคุณ
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink uppercase">
            My Apparel Journal
          </h1>
          <p className="text-sm text-mutedGray max-w-xl">
            รวบรวมประวัติเสื้อสตรีทแวร์ที่คุณสร้างสรรค์ ใบเสร็จแจกแจงรายละเอียดราคาตามจริง
            และใบรับรองลิขสิทธิ์ดิจิทัลจากศิลปิน
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/studio/new"
            className="inline-flex items-center space-x-2 bg-ink hover:bg-ink-light text-paper px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-warm" />
            <span>สร้างดีไซน์ใหม่ใน 3D Studio</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-paper border border-borderCol rounded-xl p-4 sm:p-5 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-mutedGray">
            <Shirt className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">เสื้อที่คุณสร้าง</span>
          </div>
          <p className="text-2xl font-black text-ink">{summary.totalDesigns} ชิ้น</p>
        </div>

        <div className="bg-paper border border-borderCol rounded-xl p-4 sm:p-5 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-mutedGray">
            <Package className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">คำสั่งซื้อสำเร็จ</span>
          </div>
          <p className="text-2xl font-black text-ink">{summary.totalOrders} รายการ</p>
        </div>

        <div className="bg-paper border border-borderCol rounded-xl p-4 sm:p-5 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-mutedGray">
            <Award className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">ศิลปินที่สนับสนุน</span>
          </div>
          <p className="text-2xl font-black text-ink">{summary.creatorsSupportedCount} ท่าน</p>
        </div>

        <div className="bg-paper border border-borderCol rounded-xl p-4 sm:p-5 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-mutedGray">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">ค่าลิขสิทธิ์รวมให้ศิลปิน</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">
            {formatPrice(summary.totalRoyaltiesPaid)}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderCol pb-4 gap-3">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('PERMANENT_IP')}
            data-testid="vault-tab-permanent-ip"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'PERMANENT_IP'
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Permanent IP ({permanentIpItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('WISHLIST')}
            data-testid="vault-tab-wishlist"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'WISHLIST'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Wishlist ({wishlistItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-ink text-paper'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark/50'
            }`}
          >
            แบบเสื้อทั้งหมด ({summary.items.length})
          </button>
          <button
            onClick={() => setActiveTab('ORDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 ${
              activeTab === 'ORDER'
                ? 'bg-ink text-paper'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark/50'
            }`}
          >
            คำสั่งซื้อแล้ว ({summary.items.filter((i) => i.type === 'ORDER').length})
          </button>
          <button
            onClick={() => setActiveTab('DRAFT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 ${
              activeTab === 'DRAFT'
                ? 'bg-ink text-paper'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark/50'
            }`}
          >
            {t.nav.vault || 'คลังดีไซน์ (Vault)'} ({summary.items.filter((i) => i.type === 'DRAFT').length})
          </button>
        </div>

        <span className="text-xs font-mono text-mutedGray hidden sm:inline">
          ระบบแสดงผลแบบเรียลไทม์
        </span>
      </div>

      {/* Sector 1: Permanent IP Vault */}
      {activeTab === 'PERMANENT_IP' ? (
        permanentIpItems.length === 0 ? (
          <div
            data-testid="permanent-ip-empty-state"
            className="text-center py-16 border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50/30 space-y-4"
          >
            <Crown className="w-12 h-12 text-amber-500 mx-auto opacity-70" />
            <p className="text-base font-bold text-ink">ยังไม่มี Permanent IP ที่ถือครองในคลัง</p>
            <p className="text-xs text-mutedGray max-w-md mx-auto">
              ลิขสิทธิ์ถาวร (Permanent IP) ให้สิทธิ์คุณนำลายกราฟิกไปสั่งผลิตเสื้อซ้ำได้ไม่จำกัดจำนวนครั้ง โดยไม่คิดค่าธรรมเนียมลิขสิทธิ์อีกต่อไป (0 THB Reprint)
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center space-x-2 bg-ink text-paper px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider hover:bg-ink-light transition-colors"
            >
              <span>สำรวจลายลิขสิทธิ์ใน Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div
            data-testid="permanent-ip-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {permanentIpItems.map((item) => (
              <div
                key={item.id}
                className="bg-paper border-2 border-amber-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 px-3 py-0.5 rounded-bl-lg font-mono text-[9px] uppercase font-black tracking-wider flex items-center space-x-1">
                  <Crown className="w-2.5 h-2.5" />
                  <span>0 THB REPRINT</span>
                </div>

                <div className="space-y-3">
                  <div className="w-full aspect-square bg-[#131718] rounded-xl overflow-hidden p-4 flex items-center justify-center border border-borderCol">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(item.title)}&backgroundColor=222729`;
                      }}
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase font-bold text-mutedGray px-1.5 py-0.5 bg-paper-dark rounded">
                        {item.category}
                      </span>
                      <span className="font-mono text-[10px] text-amber-800 font-bold">
                        {new Date(item.acquiredAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-base text-ink mt-1 truncate" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="font-mono text-xs text-mutedGray">โดย {item.creatorName}</p>
                  </div>

                  <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[10px] font-mono space-y-1">
                    <div className="text-amber-900 font-bold truncate">
                      📜 {item.certificateNumber}
                    </div>
                    <div className="text-mutedGray truncate">
                      SHA-256: {item.sha256Hash.slice(0, 16)}...
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-borderCol/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPermanentCertificate(item)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 border border-borderCol rounded-lg font-mono text-[11px] text-ink hover:bg-paper-dark transition-colors"
                    title="ดูใบอนุญาตสัญญาลิขสิทธิ์"
                  >
                    <FileText className="w-3 h-3 text-warm-dark" />
                    <span>ดูสัญญา</span>
                  </button>

                  <Link
                    href={`/studio/new?artworkId=${item.artworkId}`}
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-[11px] font-bold uppercase transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>ใส่ดีไซน์ (฿0)</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'WISHLIST' ? (
        wishlistItems.length === 0 ? (
          <div
            data-testid="wishlist-empty-state"
            className="text-center py-16 border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50/20 space-y-4"
          >
            <Heart className="w-12 h-12 text-rose-400 mx-auto opacity-70" />
            <p className="text-base font-bold text-ink">ยังไม่มีผลงานที่ถูกใจใน Wishlist</p>
            <p className="text-xs text-mutedGray max-w-sm mx-auto">
              คุณสามารถกดหัวใจ ❤️ ที่การ์ดลายกราฟิกในหน้า Marketplace เพื่อเก็บลายที่ถูกใจไว้เลือกใส่ในเสื้อภายหลัง
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center space-x-2 bg-ink text-paper px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider hover:bg-ink-light transition-colors"
            >
              <span>ไปเลือกดูลายใน Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div
            data-testid="wishlist-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {wishlistItems.map((item) => (
              <div
                key={item.id}
                className="bg-paper border border-borderCol rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-3">
                  <div className="w-full aspect-square bg-[#131718] rounded-xl overflow-hidden p-4 flex items-center justify-center border border-borderCol">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(item.title)}&backgroundColor=222729`;
                      }}
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase font-bold text-mutedGray px-1.5 py-0.5 bg-paper-dark rounded">
                        {item.category}
                      </span>
                      <span className="font-mono text-xs font-bold text-ink">
                        {formatPrice(item.standardPrice)} / ตัว
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-base text-ink mt-1 truncate" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="font-mono text-xs text-mutedGray">โดย {item.creatorName}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-borderCol/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveFromWishlist(item.artworkId)}
                    className="p-2 border border-borderCol hover:border-red-300 hover:text-red-600 rounded-lg text-mutedGray transition-colors"
                    title="ลบออกจาก Wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/studio/new?artworkId=${item.artworkId}`}
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-ink hover:bg-ink-light text-paper rounded-lg font-mono text-xs font-bold uppercase transition-colors shadow-2xs"
                  >
                    <Palette className="w-3.5 h-3.5 text-warm" />
                    <span>สร้างดีไซน์ด้วยลายนี้</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-borderCol rounded-xl space-y-4">
          <Shirt className="w-12 h-12 text-mutedGray mx-auto opacity-50" />
          <p className="text-base font-bold text-ink">ยังไม่มีรายการในบันทึกของคุณ</p>
          <p className="text-xs text-mutedGray max-w-sm mx-auto">
            เริ่มออกแบบเสื้อตัวโปรดของคุณในสตูดิโอ 3D พร้อมเลือกแมทช์ลายจากศิลปินชั้นนำได้ทันที
          </p>
          <Link
            href="/studio/new"
            className="inline-block bg-ink text-paper px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider"
          >
            เปิดสตูดิโอ 3D
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredItems.map((item) => {
            const surface = flippedSurfaces[item.id] || 'FRONT';
            const elements = surface === 'FRONT' ? item.design.frontElements : item.design.backElements;
            const isBreakdownOpen = expandedBreakdownId === item.id;

            return (
              <div
                key={item.id}
                className="bg-paper border border-borderCol rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow"
              >
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Visual Garment Preview Card */}
                  <div className="lg:col-span-4 flex flex-col items-center">
                    <div
                      className="relative w-full aspect-square max-w-[280px] rounded-xl flex items-center justify-center p-4 border border-borderCol/60 transition-colors"
                      style={{ backgroundColor: item.garment.colorHex }}
                    >
                      {/* Silhouette Garment Base */}
                      <div className="relative w-full h-full flex items-center justify-center">
                        <Shirt
                          className="w-full h-full transition-opacity duration-300"
                          style={{
                            color:
                              item.garment.colorHex === '#FFFFFF'
                                ? '#E5E7EB'
                                : item.garment.colorHex === '#131718'
                                ? '#1F2426'
                                : 'rgba(255,255,255,0.2)',
                          }}
                        />

                        {/* Elements Overlay */}
                        {elements && elements.length > 0 ? (
                          elements.map((el: any, idx: number) => (
                            <div
                              key={idx}
                              className="absolute pointer-events-none transition-transform"
                              style={{
                                left: `${el.x ?? 30}%`,
                                top: `${el.y ?? 25}%`,
                                width: `${Math.min(el.width ?? 35, 60)}%`,
                                height: `${Math.min(el.height ?? 35, 60)}%`,
                                transform: `rotate(${el.rotation ?? 0}deg)`,
                              }}
                            >
                              {el.imageUrl ? (
                                <img
                                  src={el.imageUrl}
                                  alt="Artwork Graphic"
                                  className="w-full h-full object-contain filter drop-shadow"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center border border-dashed border-warm/80 rounded bg-warm/10">
                                  <span className="font-mono text-[9px] text-warm font-bold">
                                    GRAPHIC
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-mono text-[10px] uppercase text-mutedGray/70">
                              {surface === 'FRONT' ? 'หน้าเสื้อว่าง' : 'หลังเสื้อว่าง'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Surface Indicator & Flip Toggle */}
                      <button
                        onClick={() => toggleSurface(item.id)}
                        className="absolute bottom-2.5 right-2.5 bg-paper/90 hover:bg-paper text-ink px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 border border-borderCol shadow-sm transition-transform active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3 text-mutedGray" />
                        <span>มุมมอง: {surface === 'FRONT' ? 'ด้านหน้า' : 'ด้านหลัง'}</span>
                      </button>
                    </div>

                    {/* Garment Spec Badges */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-mono text-mutedGray">
                      <span className="bg-paper-dark/60 px-2 py-0.5 rounded border border-borderCol/50">
                        ไซส์ {item.garment.size}
                      </span>
                      <span className="bg-paper-dark/60 px-2 py-0.5 rounded border border-borderCol/50">
                        ทรง {item.garment.fit}
                      </span>
                      <span className="bg-paper-dark/60 px-2 py-0.5 rounded border border-borderCol/50">
                        {item.garment.fabric}
                      </span>
                    </div>
                  </div>

                  {/* Middle & Right Column: Details & Price Breakdown */}
                  <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
                    {/* Top Row: Title, Reference & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-borderCol/60 pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              item.type === 'ORDER'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.type === 'ORDER' ? 'คำสั่งซื้อสำเร็จ' : 'แบบร่างดีไซน์'}
                          </span>
                          <span className="font-mono text-xs text-mutedGray">
                            {new Date(item.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <h2 className="text-lg font-black text-ink uppercase mt-1">
                          {item.design.title}
                        </h2>
                        <p className="font-mono text-xs text-mutedGray">
                          เลขอ้างอิง: {item.referenceNumber}
                        </p>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex items-center space-x-2">
                        {item.status === 'PAYMENT_CONFIRMED' && (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ยืนยันการสั่งซื้อแล้ว</span>
                          </span>
                        )}
                        {item.status === 'IN_PRODUCTION' && (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                            <Printer className="w-3.5 h-3.5" />
                            <span>กำลังดำเนินการพิมพ์</span>
                          </span>
                        )}
                        {item.status === 'SAVED_DRAFT' && (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            <span>แบบร่างพร้อมผลิต</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contributing Creators & Artworks */}
                    <div>
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-mutedGray mb-2.5">
                        ผลงานลิขสิทธิ์แท้ที่ใช้บนเสื้อ:
                      </h3>
                      {item.artworks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.artworks.map((art, aIdx) => (
                            <div
                              key={aIdx}
                              className="flex items-center space-x-3 p-2.5 rounded-lg border border-borderCol bg-paper-dark/20"
                            >
                              {art.previewUrl ? (
                                <img
                                  src={art.previewUrl}
                                  alt={art.title}
                                  className="w-10 h-10 object-contain rounded bg-paper border border-borderCol p-0.5"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-paper-dark flex items-center justify-center text-mutedGray font-mono text-[9px]">
                                  ART
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-ink truncate">{art.title}</p>
                                <p className="text-[11px] font-mono text-mutedGray truncate">
                                  โดย {art.creatorName}
                                </p>
                              </div>
                              <span className="font-mono text-xs font-bold text-emerald-700">
                                {formatPrice(art.licenseFee)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-mutedGray italic">
                          ยังไม่มีการระบุผลงานกราฟิกบนเสื้อตัวนี้
                        </p>
                      )}
                    </div>

                    {/* Price Summary & Transparent Breakdown Accordion */}
                    <div className="border border-borderCol/80 rounded-lg p-4 bg-paper-dark/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono text-mutedGray uppercase">
                            ยอดรวมคำสั่งซื้อตามจริง
                          </span>
                          <p className="text-xl font-black text-ink">
                            {formatPrice(item.pricing.totalAmount)}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleBreakdown(item.id)}
                          className="flex items-center space-x-1 text-xs font-mono text-ink font-semibold hover:text-warm-dark transition-colors"
                        >
                          <span>{isBreakdownOpen ? 'ซ่อนแจกแจงราคา' : 'ดูแจกแจงรายละเอียดต้นทุน'}</span>
                          {isBreakdownOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Natural Price Breakdown */}
                      {isBreakdownOpen && (
                        <div className="border-t border-borderCol/60 pt-3 space-y-2 text-xs font-mono text-mutedGray">
                          <div className="flex justify-between">
                            <span>1. เสื้อเปล่าคุณภาพสูง ({item.garment.name}):</span>
                            <span className="font-bold text-ink">{formatPrice(item.pricing.garmentCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2. งานพิมพ์ดิจิทัลระบบ Kornit DTG:</span>
                            <span className="font-bold text-ink">{formatPrice(item.pricing.printingCost)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700">
                            <span>3. ค่าตอบแทนลิขสิทธิ์โดยตรงสู่ศิลปิน:</span>
                            <span className="font-bold">{formatPrice(item.pricing.licensingCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>4. ค่าบรรจุภัณฑ์รักษ์โลก (Eco Packaging):</span>
                            <span className="font-bold text-ink">{formatPrice(item.pricing.packagingCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>5. ค่าบริการจัดส่งพัสดุ (Tracked Shipping):</span>
                            <span className="font-bold text-ink">{formatPrice(item.pricing.shippingCost)}</span>
                          </div>
                          <div className="border-t border-borderCol/60 pt-2 flex justify-between font-bold text-ink text-sm">
                            <span>ยอดรวมสุทธิ:</span>
                            <span>{formatPrice(item.pricing.totalAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center space-x-2">
                        {/* Certificate of Authenticity Modal Trigger */}
                        {item.type === 'ORDER' && (
                          <button
                            onClick={() => setSelectedCoaItem(item)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-borderCol hover:border-warm text-xs font-mono text-ink font-semibold transition-colors bg-paper shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ดูใบรับรองสิทธิ์ (CoA)</span>
                          </button>
                        )}

                        {item.type === 'ORDER' && (
                          <Link
                            href={`/account/orders/${item.referenceNumber}`}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-borderCol hover:border-ink text-xs font-mono text-ink font-semibold transition-colors bg-paper shadow-sm"
                          >
                            <Truck className="w-3.5 h-3.5 text-mutedGray" />
                            <span>ติดตามสถานะ</span>
                          </Link>
                        )}

                        {item.type === 'ORDER' && (
                          <button
                            type="button"
                            onClick={() => setChattingOrder(item)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 hover:border-amber-500 text-xs font-mono text-ink font-semibold transition-colors bg-paper shadow-sm"
                            title="เปิดกล่องข้อความแชทกับโรงงานผู้ผลิต"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                            <span>แชทกับผู้ผลิต</span>
                          </button>
                        )}
                      </div>

                      {/* Remix in 3D Studio */}
                      <Link
                        href={`/studio/new?remix=${item.design.id}`}
                        className="inline-flex items-center space-x-1.5 bg-ink hover:bg-ink-light text-paper px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-warm" />
                        <span>เปิดปรับแต่งใน 3D Studio</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate of Authenticity (CoA) Modal */}
      {selectedCoaItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-paper border border-borderCol rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-2 border-b border-borderCol pb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-warm/20 text-warm-dark mx-auto border border-warm/40">
                <Award className="w-6 h-6 text-ink" />
              </div>
              <h3 className="font-mono text-xs tracking-widest text-mutedGray uppercase">
                APE-PAREL VERIFIED IP PROVENANCE
              </h3>
              <h2 className="text-xl font-black text-ink uppercase">
                Certificate of Authenticity
              </h2>
              <p className="text-xs text-mutedGray">
                ใบรับรองดิจิทัลยืนยันลิขสิทธิ์ผลงานศิลปะแท้บนเครื่องแต่งกายสตรีทแวร์
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="bg-paper-dark/40 p-4 rounded-lg space-y-2 border border-borderCol/70">
                <div className="flex justify-between">
                  <span className="text-mutedGray">รหัสใบรับรอง:</span>
                  <span className="font-bold text-ink">
                    {selectedCoaItem.certificateOfAuthenticity.certificateId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mutedGray">เลขอ้างอิงคำสั่งซื้อ:</span>
                  <span className="font-bold text-ink">{selectedCoaItem.referenceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mutedGray">วันที่ออกใบรับรอง:</span>
                  <span className="text-ink">
                    {new Date(
                      selectedCoaItem.certificateOfAuthenticity.issuedAt
                    ).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mutedGray">การตรวจสอบลายพิมพ์:</span>
                  <span className="text-emerald-700 font-bold">1:1 Planar Anatomical Match</span>
                </div>
              </div>

              <div>
                <span className="text-mutedGray uppercase tracking-wider text-[11px] font-bold">
                  ศิลปินที่ได้รับลิขสิทธิ์อย่างเป็นทางการ:
                </span>
                <ul className="mt-2 space-y-1.5">
                  {selectedCoaItem.artworks.map((art, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-paper-dark/20 border border-borderCol/50"
                    >
                      <span className="font-bold text-ink">{art.title}</span>
                      <span className="text-mutedGray">โดย {art.creatorName}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-borderCol pt-3">
                <span className="text-mutedGray text-[10px] block">ลายเซ็นความปลอดภัยดิจิทัล:</span>
                <span className="text-[10px] text-mutedGray/80 font-mono break-all select-all">
                  {selectedCoaItem.certificateOfAuthenticity.hashDigest}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCoaItem(null)}
                className="bg-ink hover:bg-ink-light text-paper px-5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider font-bold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent IP Certificate Modal */}
      {selectedPermanentCertificate && (
        <div
          data-testid="permanent-ip-certificate-modal"
          className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-paper border-2 border-amber-400 w-full max-w-xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-borderCol pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900">
                  <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-sans font-black text-lg text-ink">
                    Official Permanent IP Certificate
                  </h2>
                  <p className="font-mono text-[10px] text-mutedGray">
                    สัญญาอนุญาตให้ใช้สิทธิในทรัพย์สินทางปัญญาแบบตลอดชีพ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPermanentCertificate(null)}
                className="text-mutedGray hover:text-ink p-1 rounded-lg transition-colors"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-paper-light rounded-xl border border-borderCol space-y-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-borderCol/50 pb-2">
                <span className="text-mutedGray">รหัสสัญญา (Serial):</span>
                <span className="font-bold text-amber-900 select-all">
                  {selectedPermanentCertificate.certificateNumber}
                </span>
              </div>
              <div className="flex justify-between border-b border-borderCol/50 pb-2">
                <span className="text-mutedGray">ชื่อผลงาน:</span>
                <span className="font-bold text-ink">{selectedPermanentCertificate.title}</span>
              </div>
              <div className="flex justify-between border-b border-borderCol/50 pb-2">
                <span className="text-mutedGray">เจ้าของลิขสิทธิ์เดิม (Creator):</span>
                <span className="text-ink">{selectedPermanentCertificate.creatorName}</span>
              </div>
              <div className="flex justify-between border-b border-borderCol/50 pb-2">
                <span className="text-mutedGray">ประเภทสิทธิ์:</span>
                <span className="text-emerald-700 font-bold">ถาวร ตลอดชีพ (0 THB Reprint)</span>
              </div>
              <div className="flex justify-between border-b border-borderCol/50 pb-2">
                <span className="text-mutedGray">วันที่ออกสัญญา:</span>
                <span className="text-ink">
                  {new Date(selectedPermanentCertificate.acquiredAt).toLocaleDateString('th-TH')}
                </span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-mutedGray text-[10px]">ลายเซ็นดิจิทัลเข้ารหัส (SHA-256 Digest):</span>
                <div className="p-2 bg-paper-dark/40 rounded text-[10px] break-all select-all font-mono text-mutedGray border border-borderCol/40">
                  {selectedPermanentCertificate.sha256Hash}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/verify/license/${selectedPermanentCertificate.certificateNumber}`}
                target="_blank"
                className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-amber-800 hover:text-amber-950 underline"
              >
                <span>🔗 เปิดหน้าตรวจสอบสาธารณะ</span>
              </Link>

              <button
                onClick={() => setSelectedPermanentCertificate(null)}
                className="bg-ink hover:bg-ink-light text-paper px-5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
