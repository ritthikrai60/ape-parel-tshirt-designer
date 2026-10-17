'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Crown, Heart, ShieldCheck, Sparkles, Check, Tag } from 'lucide-react';
import { DesignElement } from '@/lib/types';
import { UserVaultPermanentItem, UserVaultWishlistItem } from '@/lib/vault';

export interface SeededArtwork {
  artworkId: string;
  licenseOptionId: string;
  title: string;
  category: string;
  previewUrl: string;
  creatorName: string;
  creatorId: string;
  price: number;
  licenseOptions?: Array<{
    id: string;
    name: string;
    price: number;
    scope: string;
  }>;
}

export const SEEDED_PRESET_ARTWORKS: SeededArtwork[] = [
  {
    artworkId: 'art_dash_ape_classic',
    licenseOptionId: 'lic_dash_ape_std',
    title: 'Dash Ape Classic Head Mark',
    category: 'MASCOT',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718',
    creatorName: 'Dash Ape Studio',
    creatorId: 'creator_dash_ape',
    price: 40,
    licenseOptions: [
      { id: 'lic_dash_ape_std', name: 'Standard Apparel License', price: 40, scope: 'PER_GARMENT' },
      { id: 'lic_dash_ape_unlimited', name: 'Permanent IP Buyout License', price: 100, scope: 'UNLIMITED' },
    ],
  },
  {
    artworkId: 'art_cyber_primate',
    licenseOptionId: 'lic_cyber_primate_std',
    title: 'Cyber Primate Tokyo 2088',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98',
    creatorName: 'Dash Ape Studio',
    creatorId: 'creator_dash_ape',
    price: 60,
    licenseOptions: [
      { id: 'lic_cyber_primate_std', name: 'Standard Apparel License', price: 60, scope: 'PER_GARMENT' },
      { id: 'lic_cyber_primate_unlimited', name: 'Permanent IP Buyout License', price: 150, scope: 'UNLIMITED' },
    ],
  },
  {
    artworkId: 'art_static_glitch',
    licenseOptionId: 'lic_static_glitch_std',
    title: 'Static Glitch Protocol',
    category: 'PATTERN',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
    creatorName: 'Cyber Monk',
    creatorId: 'creator_cyber_monk',
    price: 25,
    licenseOptions: [
      { id: 'lic_static_glitch_std', name: 'Standard Apparel License', price: 25, scope: 'PER_GARMENT' },
      { id: 'lic_static_glitch_unlimited', name: 'Permanent IP Buyout License', price: 80, scope: 'UNLIMITED' },
    ],
  },
  {
    artworkId: 'art_neo_shibuya',
    licenseOptionId: 'lic_neo_shibuya_std',
    title: 'Neo Shibuya Heavy Kanji',
    category: 'TYPOGRAPHY',
    previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
    creatorName: 'Cyber Monk',
    creatorId: 'creator_cyber_monk',
    price: 50,
    licenseOptions: [
      { id: 'lic_neo_shibuya_std', name: 'Standard Apparel License', price: 50, scope: 'PER_GARMENT' },
      { id: 'lic_neo_shibuya_unlimited', name: 'Permanent IP Buyout License', price: 125, scope: 'UNLIMITED' },
    ],
  },
  {
    artworkId: 'art_bonsai_core',
    licenseOptionId: 'lic_bonsai_core_std',
    title: 'Bonsai Core Brutalism',
    category: 'ILLUSTRATION',
    previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
    creatorName: 'Soma Botanica',
    creatorId: 'creator_soma',
    price: 45,
    licenseOptions: [
      { id: 'lic_bonsai_core_std', name: 'Standard Apparel License', price: 45, scope: 'PER_GARMENT' },
      { id: 'lic_bonsai_core_unlimited', name: 'Permanent IP Buyout License', price: 113, scope: 'UNLIMITED' },
    ],
  },
];

export interface ArtworkCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surface: 'FRONT' | 'BACK';
  onAddArtwork: (element: DesignElement) => void;
  customArtworks?: SeededArtwork[];
  currentUser?: { id: string; name?: string | null } | null;
}

export const ArtworkCatalogDrawer: React.FC<ArtworkCatalogDrawerProps> = ({
  isOpen,
  onClose,
  surface,
  onAddArtwork,
  customArtworks,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeSector, setActiveSector] = useState<'CATALOG' | 'PERMANENT_IP' | 'WISHLIST'>('CATALOG');

  // Vault data state
  const [permanentIps, setPermanentIps] = useState<UserVaultPermanentItem[]>([]);
  const [wishlist, setWishlist] = useState<UserVaultWishlistItem[]>([]);
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      setIsLoadingVault(true);
      fetch('/api/user/vault')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data?.data) {
            setPermanentIps(data.data.permanentIps || []);
            setWishlist(data.data.wishlist || []);
          }
        })
        .catch((err) => console.warn('[ArtworkCatalogDrawer] Could not load vault:', err))
        .finally(() => setIsLoadingVault(false));
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const catalog = customArtworks && customArtworks.length > 0 ? customArtworks : SEEDED_PRESET_ARTWORKS;
  const categories = ['ALL', 'MASCOT', 'ILLUSTRATION', 'PATTERN', 'TYPOGRAPHY'];

  const ownedPermanentArtworkIds = new Set(permanentIps.map((p) => p.artworkId));

  // Determine items to display based on active sector
  let displayedItems: Array<{
    artworkId: string;
    licenseOptionId: string;
    title: string;
    category: string;
    previewUrl: string;
    creatorName: string;
    creatorId?: string;
    price: number;
    isPermanentIp: boolean;
    certificateNumber?: string;
    licenseOptions?: Array<{
      id: string;
      name: string;
      price: number;
      scope: string;
    }>;
  }> = [];

  if (activeSector === 'PERMANENT_IP') {
    displayedItems = permanentIps.map((p) => ({
      artworkId: p.artworkId,
      licenseOptionId: p.licenseOptionId,
      title: p.title,
      category: p.category,
      previewUrl: p.previewUrl,
      creatorName: p.creatorName,
      creatorId: p.agreementSnapshot?.licensor?.creatorId,
      price: 0,
      isPermanentIp: true,
      certificateNumber: p.certificateNumber,
    }));
  } else if (activeSector === 'WISHLIST') {
    displayedItems = wishlist.map((w) => {
      const isOwned = ownedPermanentArtworkIds.has(w.artworkId);
      return {
        artworkId: w.artworkId,
        licenseOptionId: w.licenseOptionId,
        title: w.title,
        category: w.category,
        previewUrl: w.previewUrl,
        creatorName: w.creatorName,
        price: isOwned ? 0 : w.standardPrice,
        isPermanentIp: isOwned,
      };
    });
  } else {
    displayedItems = catalog.map((art) => {
      const isOwned = ownedPermanentArtworkIds.has(art.artworkId);
      return {
        ...art,
        price: isOwned ? 0 : art.price,
        isPermanentIp: isOwned,
      };
    });
  }

  // Filter by search & category
  const filtered = displayedItems.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || art.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSelectWithLicense = (
    item: typeof displayedItems[0],
    licenseOptionId: string,
    price: number
  ) => {
    const newElement: DesignElement = {
      id: `elem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      artworkId: item.artworkId,
      licenseOptionId,
      title: item.title,
      previewUrl: item.previewUrl.replace(/&backgroundColor=[^&]+/g, ''),
      creatorName: item.creatorName,
      creatorId: item.creatorId || '',
      surface,
      x: 50,
      y: surface === 'FRONT' ? 42 : 45,
      width: 35,
      height: 35,
      rotation: 0,
      zIndex: Date.now(),
      price: item.isPermanentIp ? 0 : price,
    };
    onAddArtwork(newElement);
    onClose();
  };

  const handleSelect = (item: typeof displayedItems[0]) => {
    handleSelectWithLicense(item, item.licenseOptionId, item.price);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select Artwork Catalog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
    >
      <div
        className="bg-paper-light border border-borderCol w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-borderCol flex items-center justify-between shrink-0 bg-paper-light">
          <div>
            <h2 className="text-base font-sans font-bold text-ink">Select Artwork Catalog</h2>
            <p className="text-xs font-mono text-mutedGray">
              Adding to {surface} garment surface &bull; เลือกสิทธิ์ <strong className="text-ink">รายชิ้น</strong> หรือ <strong className="text-amber-800">ตลอดชีพ</strong> ได้ที่ปุ่มบนการ์ด
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Sector Tabs (Visible ONLY for Logged In Users) */}
        {currentUser ? (
          <div
            data-testid="artwork-drawer-user-tabs"
            className="flex border-b border-borderCol bg-paper px-4 pt-2 gap-2 overflow-x-auto shrink-0"
          >
            <button
              type="button"
              data-testid="tab-catalog"
              onClick={() => setActiveSector('CATALOG')}
              className={`px-3 py-1.5 text-xs font-mono font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeSector === 'CATALOG'
                  ? 'border-ink text-ink'
                  : 'border-transparent text-mutedGray hover:text-ink'
              }`}
            >
              คลังลายทั้งหมด (Catalog)
            </button>

            <button
              type="button"
              data-testid="tab-permanent-ip"
              onClick={() => setActiveSector('PERMANENT_IP')}
              className={`px-3 py-1.5 text-xs font-mono font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                activeSector === 'PERMANENT_IP'
                  ? 'border-amber-500 text-amber-800 bg-amber-50/70'
                  : 'border-transparent text-mutedGray hover:text-ink'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Permanent IP ของฉัน (฿0)</span>
              {permanentIps.length > 0 && (
                <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {permanentIps.length}
                </span>
              )}
            </button>

            <button
              type="button"
              data-testid="tab-wishlist"
              onClick={() => setActiveSector('WISHLIST')}
              className={`px-3 py-1.5 text-xs font-mono font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                activeSector === 'WISHLIST'
                  ? 'border-red-500 text-red-700 bg-red-50/70'
                  : 'border-transparent text-mutedGray hover:text-ink'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-red-500" />
              <span>Wishlist ของฉัน ({wishlist.length})</span>
            </button>
          </div>
        ) : null}

        {/* Search & Category Filters */}
        <div className="p-4 border-b border-borderCol space-y-3 shrink-0 bg-paper-light">
          <div className="relative">
            <Search className="w-4 h-4 text-mutedGray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search artworks, creators, styles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray focus:outline-none focus:border-warm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-ink text-paper font-bold'
                    : 'bg-paper text-mutedGray hover:text-ink border border-borderCol'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {isLoadingVault ? (
            <div className="col-span-full py-12 text-center font-mono text-xs text-mutedGray">
              กำลังโหลดคลังลายของคุณ...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center font-mono text-xs text-mutedGray space-y-1">
              {activeSector === 'PERMANENT_IP' ? (
                <>
                  <div className="text-ink font-bold">ยังไม่มีผลงาน Permanent IP ในคลังของคุณ</div>
                  <p>ซื้อลิขสิทธิ์ตลอดชีพจาก Marketplace เพื่อนำมาสกรีนเสื้อได้ไม่จำกัดจำนวนครั้งในราคา ฿0</p>
                </>
              ) : activeSector === 'WISHLIST' ? (
                <>
                  <div className="text-ink font-bold">ยังไม่มีผลงานใน Wishlist</div>
                  <p>กดไอคอนหัวใจที่หน้ารวมลายใน Marketplace เพื่อเซฟลายไว้ที่นี่</p>
                </>
              ) : (
                <>
                  <div className="text-ink font-bold">ไม่พบลายที่ตรงกับคำค้นหา</div>
                  <p>ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น</p>
                </>
              )}
            </div>
          ) : (
            filtered.map((art) => {
              const perGarmentLic = art.licenseOptions?.find((l) => l.scope === 'PER_GARMENT') || {
                id: art.licenseOptionId,
                name: 'Standard Apparel License',
                price: art.price,
                scope: 'PER_GARMENT',
              };
              const unlimitedLic = art.licenseOptions?.find((l) => l.scope === 'UNLIMITED');

              return (
                <div
                  key={art.artworkId}
                  data-testid={`drawer-artwork-card-${art.artworkId}`}
                  className="group p-3 bg-paper border border-borderCol rounded-xl hover:border-warm transition-all flex flex-col justify-between space-y-2.5 relative shadow-2xs"
                >
                  {/* Permanent IP Golden Badge */}
                  {art.isPermanentIp && (
                    <div
                      data-testid="permanent-ip-owned-tag"
                      className="absolute top-2 right-2 bg-amber-500 text-ink text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center space-x-1 z-10"
                      title="สิทธิ์ขาดตลอดชีพ: สกรีนได้ฟรี ฿0"
                    >
                      <Crown className="w-3 h-3 text-ink fill-ink" />
                      <span>฿0 ตลอดชีพ</span>
                    </div>
                  )}

                  {/* Artwork Image & Title Header */}
                  <div className="space-y-2">
                    <div
                      className="w-full aspect-square rounded-lg bg-paper-light border border-borderCol/60 overflow-hidden flex items-center justify-center p-2 group-hover:scale-[1.01] transition-transform cursor-pointer"
                      onClick={() => handleSelectWithLicense(art, perGarmentLic.id, perGarmentLic.price)}
                      title="คลิกเพื่อเลือกลายนี้ (เริ่มต้นด้วยสิทธิ์รายชิ้น)"
                    >
                      <img
                        src={art.previewUrl}
                        alt={art.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/8.x/shapes/svg?seed=${encodeURIComponent(art.title)}&backgroundColor=222729`;
                        }}
                        className="w-full h-full object-contain pointer-events-none"
                        loading="lazy"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <div
                          className="font-mono text-xs font-bold text-ink truncate group-hover:text-warm-dark cursor-pointer"
                          onClick={() => handleSelectWithLicense(art, perGarmentLic.id, perGarmentLic.price)}
                          title={art.title}
                        >
                          {art.title}
                        </div>
                        <span className="text-[9px] font-mono text-mutedGray border border-borderCol px-1 rounded uppercase shrink-0 ml-1">
                          {art.category}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-mutedGray truncate">
                        by {art.creatorName}
                      </div>
                    </div>
                  </div>

                  {/* License Selection Action Buttons */}
                  <div className="pt-2 border-t border-borderCol/60 flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-mutedGray uppercase font-bold flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5 text-warm-dark" />
                      <span>เลือก License เพื่อวางลงบนเสื้อ:</span>
                    </span>

                    {art.isPermanentIp ? (
                      <button
                        type="button"
                        data-testid={`btn-select-vault-${art.artworkId}`}
                        onClick={() => handleSelectWithLicense(art, art.licenseOptionId, 0)}
                        className="w-full py-2 px-2.5 bg-amber-500 hover:bg-amber-400 text-ink text-[11px] font-mono font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5 fill-ink text-ink" />
                        <span>ใช้สิทธิ์ Vault (ฟรี ฿0)</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          data-testid={`btn-select-per-garment-${art.artworkId}`}
                          onClick={() => handleSelectWithLicense(art, perGarmentLic.id, perGarmentLic.price)}
                          className="w-full py-1.5 px-2.5 bg-paper hover:bg-paper-dark border border-borderCol hover:border-ink text-ink text-[11px] font-mono rounded-lg flex items-center justify-between transition-colors shadow-2xs group/btn cursor-pointer"
                        >
                          <span className="flex items-center gap-1 text-ink font-bold">
                            <Tag className="w-3 h-3 text-warm-dark" />
                            <span>รายชิ้น</span>
                          </span>
                          <span className="font-bold text-ink group-hover/btn:text-warm-dark">
                            ฿{perGarmentLic.price}/ตัว
                          </span>
                        </button>

                        {unlimitedLic && (
                          <button
                            type="button"
                            data-testid={`btn-select-lifetime-${art.artworkId}`}
                            onClick={() => handleSelectWithLicense(art, unlimitedLic.id, unlimitedLic.price)}
                            className="w-full py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 text-amber-900 text-[11px] font-mono rounded-lg flex items-center justify-between transition-colors shadow-2xs group/unlimited cursor-pointer"
                          >
                            <span className="flex items-center gap-1 font-bold text-amber-900">
                              <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                              <span>ซื้อขาดตลอดชีพ</span>
                            </span>
                            <span className="font-bold text-amber-950">
                              ฿{unlimitedLic.price}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtworkCatalogDrawer;
