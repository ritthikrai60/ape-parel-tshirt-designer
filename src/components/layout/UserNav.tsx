'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  User,
  ShoppingBag,
  Palette,
  Factory,
  ChevronDown,
  LogOut,
  Sparkles,
  Layers,
  Grid,
  Truck,
  Wallet,
  Upload,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
  MessageSquare,
  Sliders,
  Bookmark,
} from 'lucide-react';
import { CreatorOnboardingModal } from '@/components/portal/CreatorOnboardingModal';
import { SupplierOnboardingModal } from '@/components/portal/SupplierOnboardingModal';
import { useSettings } from '@/components/providers/SettingsProvider';

export const UserNav: React.FC = () => {
  const router = useRouter();
  const { openSettingsModal, t } = useSettings();
  const { data: session, status, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitchRole = async (targetRole: 'CUSTOMER' | 'CREATOR' | 'SUPPLIER') => {
    try {
      if (update) {
        await update({ role: targetRole });
      }
      setIsOpen(false);
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (targetRole === 'CREATOR' && !currentPath.startsWith('/creator')) {
        router.push('/creator/dashboard');
      } else if (targetRole === 'SUPPLIER' && !currentPath.startsWith('/supplier')) {
        router.push('/supplier/dashboard');
      } else if (targetRole === 'CUSTOMER' && (currentPath.startsWith('/creator') || currentPath.startsWith('/supplier'))) {
        router.push('/');
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error('[UserNav] Failed to switch role:', err);
    }
  };

  if (status === 'loading') {
    return <div className="animate-pulse w-24 h-9 bg-paper-dark rounded-xl" />;
  }

  if (!session || !session.user) {
    return (
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <Link
          href="/login"
          className="px-2.5 sm:px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold border border-ink/40 hover:border-ink hover:bg-paper-dark rounded-lg transition-colors whitespace-nowrap"
        >
          {t.nav.signIn || 'Sign In'}
        </Link>
        <Link
          href="/register"
          className="hidden sm:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-ink text-paper font-bold hover:bg-ink-light rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          {t.nav.register || 'Register'}
        </Link>
      </div>
    );
  }

  const user = session.user;
  const role = user.role || 'CUSTOMER';
  const hasCreator = Boolean(user.hasCreatorProfile);
  const hasSupplier = Boolean(user.hasSupplierProfile);

  const getRoleBadge = () => {
    if (role === 'CREATOR') {
      return {
        label: 'CREATOR',
        icon: Palette,
        bgColor: 'bg-warm/30 text-ink border-warm/60',
      };
    }
    if (role === 'SUPPLIER') {
      return {
        label: 'SUPPLIER',
        icon: Factory,
        bgColor: 'bg-blue-500/20 text-blue-900 border-blue-500/40',
      };
    }
    return {
      label: 'CUSTOMER',
      icon: ShoppingBag,
      bgColor: 'bg-paper-dark text-ink border-borderCol',
    };
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="flex items-center space-x-2 py-1.5 px-2.5 rounded-xl border border-borderCol hover:border-ink/50 bg-paper hover:bg-paper-dark transition-all text-ink focus:outline-none focus:ring-1 focus:ring-ink"
        >
          <div className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center font-mono text-[11px] font-bold">
            {user.name ? user.name.slice(0, 1).toUpperCase() : 'A'}
          </div>
          <span className="hidden sm:inline font-mono text-xs font-semibold max-w-[120px] truncate">
            {user.name || 'Account'}
          </span>
          <span
            className={`hidden md:flex items-center space-x-1 font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border font-bold ${badge.bgColor}`}
          >
            <BadgeIcon className="w-2.5 h-2.5" />
            <span>{badge.label}</span>
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-mutedGray transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-paper-light border border-borderCol shadow-2xl z-50 overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-100">
            {/* Top Industrial Bar */}
            <div className="h-1 bg-gradient-to-r from-warm via-ink to-warm-dark" />

            {/* User Profile Header */}
            <div className="p-3.5 border-b border-borderCol/60 bg-paper/60">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray font-semibold">
                  ACTIVE ROLE SESSION
                </span>
                <span
                  className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border font-bold ${badge.bgColor}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="font-sans font-bold text-sm text-ink truncate mt-1">
                {user.name || 'ape-parel Member'}
              </div>
              <div className="font-mono text-[11px] text-mutedGray truncate">
                {user.email || 'authenticated'}
              </div>
            </div>

            {/* Role Switcher & Contextual Navigation Modes */}
            <div className="p-2 flex flex-col space-y-3 max-h-[70vh] overflow-y-auto">
              {/* 1. CUSTOMER MODE */}
              <div className="flex flex-col space-y-1">
                <div className="px-2 pt-1 font-mono text-[10px] uppercase tracking-wider font-bold text-mutedGray flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <ShoppingBag className="w-3 h-3 text-ink" />
                    <span>Shopping & Studio Mode</span>
                  </span>
                  {role === 'CUSTOMER' && (
                    <span className="flex items-center space-x-1 text-emerald-700 text-[9px]">
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                    <span>Store Home</span>
                  </Link>
                  <Link
                    href="/studio/new"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                    <span>3D Customizer</span>
                  </Link>
                  <Link
                    href="/marketplace"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                    <span>Marketplace</span>
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                    <span>{t.nav.myOrders}</span>
                  </Link>
                  <Link
                    href="/account/vault"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5 text-warm-dark font-bold"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-warm-dark fill-warm/20" />
                    <span>{t.nav.vault || 'Design Vault'}</span>
                  </Link>
                  <Link
                    href="/account/profile"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5 text-ink font-semibold"
                  >
                    <User className="w-3.5 h-3.5 text-ink" />
                    <span>โปรไฟล์ & ที่อยู่จัดส่ง</span>
                  </Link>
                  <Link
                    href="/account/inbox"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{t.nav.chatInbox}</span>
                  </Link>
                </div>
                {role !== 'CUSTOMER' && (
                  <div className="px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSwitchRole('CUSTOMER')}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-paper-dark hover:bg-borderCol/50 text-ink text-left font-mono text-[11px] font-semibold flex items-center justify-between transition-colors border border-borderCol/60"
                    >
                      <span>Switch to Shopping Mode</span>
                      <ArrowRight className="w-3 h-3 text-mutedGray" />
                    </button>
                  </div>
                )}
              </div>

              {/* 2. CREATOR MODE */}
              <div className="border-t border-borderCol/50 pt-2 flex flex-col space-y-1">
                <div className="px-2 font-mono text-[10px] uppercase tracking-wider font-bold text-mutedGray flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Palette className="w-3 h-3 text-warm-dark" />
                    <span>Creator Studio Mode</span>
                  </span>
                  {role === 'CREATOR' && (
                    <span className="flex items-center space-x-1 text-emerald-700 text-[9px]">
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {hasCreator ? (
                  <>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      <Link
                        href="/creator/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                      >
                        <Layers className="w-3 h-3 text-warm-dark" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/creator/journal"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                      >
                        <Wallet className="w-3 h-3 text-warm-dark" />
                        <span>Royalties</span>
                      </Link>
                      <Link
                        href="/creator/upload"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5 col-span-2"
                      >
                        <Upload className="w-3 h-3 text-warm-dark" />
                        <span>Artwork Upload & Spec</span>
                      </Link>
                    </div>
                    {role !== 'CREATOR' && (
                      <div className="px-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('CREATOR')}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-warm/25 hover:bg-warm/40 text-ink text-left font-mono text-[11px] font-semibold flex items-center justify-between transition-colors border border-warm/50"
                        >
                          <span>Switch to Creator Mode</span>
                          <ArrowRight className="w-3 h-3 text-warm-dark" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsCreatorModalOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-warm/25 hover:bg-warm/40 border border-warm/50 text-ink text-left font-mono text-xs flex items-center justify-between transition-colors font-semibold"
                    >
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-3.5 h-3.5 text-warm-dark" />
                        <span>Become a Creator</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-mutedGray" />
                    </button>
                  </div>
                )}
              </div>

              {/* 3. SUPPLIER MODE */}
              <div className="border-t border-borderCol/50 pt-2 flex flex-col space-y-1">
                <div className="px-2 font-mono text-[10px] uppercase tracking-wider font-bold text-mutedGray flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Factory className="w-3 h-3 text-blue-700" />
                    <span>Supplier Portal Mode</span>
                  </span>
                  {role === 'SUPPLIER' && (
                    <span className="flex items-center space-x-1 text-emerald-700 text-[9px]">
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {hasSupplier ? (
                  <>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      <Link
                        href="/supplier/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                      >
                        <Layers className="w-3 h-3 text-blue-700" />
                        <span>Production</span>
                      </Link>
                      <Link
                        href="/supplier/inventory"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                      >
                        <Grid className="w-3 h-3 text-blue-700" />
                        <span>Inventory</span>
                      </Link>
                      <Link
                        href="/supplier/fulfillment"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                      >
                        <Truck className="w-3 h-3 text-blue-700" />
                        <span>Fulfillment</span>
                      </Link>
                      <Link
                        href="/supplier/finance"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                      >
                        <Wallet className="w-3 h-3 text-blue-700" />
                        <span>Finance</span>
                      </Link>
                      <Link
                        href="/account/inbox"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5 col-span-2"
                      >
                        <MessageSquare className="w-3 h-3 text-amber-500" />
                        <span>Chat Inbox (กล่องข้อความ)</span>
                      </Link>
                    </div>
                    {role !== 'SUPPLIER' && (
                      <div className="px-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSwitchRole('SUPPLIER')}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-ink text-left font-mono text-[11px] font-semibold flex items-center justify-between transition-colors border border-blue-500/30"
                        >
                          <span>Switch to Supplier Mode</span>
                          <ArrowRight className="w-3 h-3 text-blue-700" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsSupplierModalOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-ink text-left font-mono text-xs flex items-center justify-between transition-colors font-semibold"
                    >
                      <div className="flex items-center space-x-2">
                        <Factory className="w-3.5 h-3.5 text-blue-700" />
                        <span>Become a Supplier</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-mutedGray" />
                    </button>
                  </div>
                )}
              </div>

              {/* 4. ADMIN PORTAL (If role === ADMIN) */}
              {role === 'ADMIN' && (
                <div className="border-t border-borderCol/50 pt-2 flex flex-col space-y-1">
                  <div className="px-2 font-mono text-[10px] uppercase tracking-wider font-bold text-rose-700 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-3 h-3 text-rose-700" />
                      <span>Admin Management Portal</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-1">
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                    >
                      <Layers className="w-3 h-3 text-rose-700" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/admin/moderation"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-xs font-mono hover:bg-paper-dark transition-colors flex items-center space-x-1.5"
                    >
                      <ShieldCheck className="w-3 h-3 text-rose-700" />
                      <span>Moderation</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* System Preferences & Settings */}
            <div className="p-2 border-t border-borderCol/60 bg-paper/20">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openSettingsModal();
                }}
                className="w-full py-1.5 px-3 rounded-lg font-mono text-xs text-ink hover:bg-paper-dark transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Sliders className="w-3.5 h-3.5 text-warm-dark" />
                  <span>{t.settings.title}</span>
                </div>
                <span className="font-mono text-[10px] text-mutedGray">&gt;</span>
              </button>
            </div>

            {/* Footer / Sign Out */}
            <div className="p-2 border-t border-borderCol/60 bg-paper/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="w-full py-2 px-3 rounded-lg font-mono text-xs text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.nav.signOut}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Modals for Progressive Onboarding Triggered From Role Switcher */}
      <CreatorOnboardingModal
        isOpen={isCreatorModalOpen}
        onClose={() => setIsCreatorModalOpen(false)}
        onSuccess={async (creator) => {
          if (update) {
            await update({ role: 'CREATOR' });
          }
          setIsCreatorModalOpen(false);
          const target = creator?.slug ? `/creator/dashboard?creator=${encodeURIComponent(creator.slug)}` : '/creator/dashboard';
          router.push(target);
          router.refresh();
        }}
        initialUser={{
          id: user.id,
          name: user.name,
          email: user.email,
        }}
      />

      <SupplierOnboardingModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={async (supplier) => {
          if (update) {
            await update({ role: 'SUPPLIER' });
          }
          setIsSupplierModalOpen(false);
          const target = supplier?.slug ? `/supplier/dashboard?supplier=${encodeURIComponent(supplier.slug)}` : '/supplier/dashboard';
          router.push(target);
          router.refresh();
        }}
        initialUser={{
          id: user.id,
          name: user.name,
          email: user.email,
        }}
      />
    </>
  );
};

export default UserNav;
