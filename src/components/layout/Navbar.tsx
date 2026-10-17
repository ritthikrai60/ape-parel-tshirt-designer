'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MessageSquare,
  Menu,
  X,
  Compass,
  Shirt,
  ShoppingBag,
  Bookmark,
  ShieldCheck,
  Factory,
  Palette,
  Sliders,
  History,
} from 'lucide-react';
import UserNav from './UserNav';
import { NotificationBell } from '@/components/portal/NotificationBell';
import { LanguageCurrencySwitcher } from '@/components/settings/LanguageCurrencySwitcher';
import { useSettings } from '@/components/providers/SettingsProvider';
import { APP_VERSION } from '@/lib/version';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { t, openSettingsModal } = useSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const role = session?.user?.role ?? null;

  // Shared active/inactive link class helper
  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
      active
        ? 'bg-ink text-paper font-bold'
        : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-borderCol bg-paper/95 backdrop-blur print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Mobile Menu Trigger */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-lg border border-borderCol text-ink hover:bg-paper-dark transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link
            href="/marketplace"
            className="group flex items-center space-x-2 text-ink transition-colors hover:text-warm-dark"
          >
            <span className="font-mono text-lg font-black tracking-tighter uppercase px-2 py-0.5 bg-ink text-paper rounded group-hover:bg-warm group-hover:text-ink transition-colors">
              APE
            </span>
            <span className="font-mono text-base font-bold tracking-tight uppercase">
              PAREL
            </span>
          </Link>
        </div>

        {/* Navigation Links — role-based visibility & localized */}
        <nav className="hidden md:flex items-center space-x-1 sm:space-x-4">
          {/* Always public */}
          <Link
            href="/studio/new"
            className={navLinkClass(!!pathname?.startsWith('/studio'))}
          >
            {t.nav.studio}
          </Link>
          <Link
            href="/marketplace"
            className={navLinkClass(!!pathname?.startsWith('/marketplace'))}
          >
            {t.nav.marketplace}
          </Link>

          {/* Loading skeleton — prevents hydration flash */}
          {isLoading && (
            <div className="hidden sm:block animate-pulse w-20 h-6 bg-paper-dark rounded" />
          )}

          {/* Customer only: My Orders & Design Vault */}
          {isAuthenticated && role === 'CUSTOMER' && (
            <>
              <Link
                href="/account/orders"
                className={`hidden sm:inline-block ${navLinkClass(
                  pathname === '/account/orders' || pathname?.startsWith('/account/orders/')
                )}`}
              >
                {t.nav.myOrders}
              </Link>
              <Link
                href="/account/vault"
                className={`hidden md:inline-block ${navLinkClass(
                  pathname === '/account/vault' || pathname?.startsWith('/account/journal')
                )}`}
              >
                {t.nav.vault || 'Vault'}
              </Link>
            </>
          )}

          {/* Creator only: Creator Hub */}
          {isAuthenticated && role === 'CREATOR' && (
            <Link
              href="/creator/dashboard"
              className={`hidden md:inline-block ${navLinkClass(
                !!pathname?.startsWith('/creator')
              )}`}
            >
              {t.nav.creatorHub}
            </Link>
          )}

          {/* Supplier only: Production */}
          {isAuthenticated && role === 'SUPPLIER' && (
            <Link
              href="/supplier/dashboard"
              className={`hidden lg:inline-block ${navLinkClass(
                !!pathname?.startsWith('/supplier')
              )}`}
            >
              {t.nav.production}
            </Link>
          )}

          {/* Admin only — NEVER shown to non-admin roles */}
          {isAuthenticated && role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`hidden lg:inline-block ${navLinkClass(
                !!pathname?.startsWith('/admin')
              )}`}
            >
              {t.nav.admin}
            </Link>
          )}
        </nav>

        {/* Right side: badges, CTAs, switchers, icons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Platform Version Badge */}
          <Link
            href="/changelog"
            className="hidden xl:inline-flex items-center space-x-1 font-mono text-[11px] font-bold text-ink/80 hover:text-ink bg-paper border border-borderCol hover:border-ink px-2 py-1 rounded transition-colors"
            title="System Changelog & Release Notes"
          >
            <span>{APP_VERSION}</span>
          </Link>

          {/* Customize CTA — Customer + Creator only, visible on desktop only (lg:inline-block) */}
          {isAuthenticated && (role === 'CUSTOMER' || role === 'CREATOR') && (
            <Link
              href="/studio/new"
              className="hidden lg:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-ink text-paper font-bold hover:bg-ink-light rounded transition-colors shadow-sm"
            >
              {t.nav.customize}
            </Link>
          )}

          {/* Quick Language & Currency Switcher Pill — Always visible */}
          <LanguageCurrencySwitcher />

          {/* Chat Inbox — authenticated users only */}
          {isAuthenticated && (
            <Link
              href="/account/inbox"
              className="p-1.5 rounded-xl border border-borderCol hover:border-ink bg-paper hover:bg-paper-dark text-ink transition-colors flex items-center justify-center"
              title={t.nav.chatInbox}
            >
              <MessageSquare className="w-4 h-4 text-amber-500" />
            </Link>
          )}

          {/* Notification Bell — authenticated users only */}
          {isAuthenticated && <NotificationBell />}

          {/* UserNav — always renders, manages its own auth states */}
          <UserNav />
        </div>
      </div>

      {/* Mobile Hamburger Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-ink/60 backdrop-blur-xs flex">
          {/* Backdrop Click Dismiss */}
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative w-4/5 max-w-xs bg-paper-light border-r border-borderCol h-full p-5 flex flex-col justify-between z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Header: Logo & Close */}
              <div className="flex items-center justify-between border-b border-borderCol pb-4">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-ink"
                >
                  <span className="font-mono text-base font-black tracking-tighter uppercase px-2 py-0.5 bg-ink text-paper rounded">
                    APE
                  </span>
                  <span className="font-mono text-sm font-bold tracking-tight uppercase">
                    PAREL
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <Link
                  href="/studio/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${
                    pathname?.startsWith('/studio')
                      ? 'bg-ink text-paper font-bold'
                      : 'text-ink hover:bg-paper-dark'
                  }`}
                >
                  <Shirt className="w-4 h-4 text-warm-dark" />
                  <span>{t.nav.studio}</span>
                </Link>

                <Link
                  href="/marketplace"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${
                    pathname?.startsWith('/marketplace')
                      ? 'bg-ink text-paper font-bold'
                      : 'text-ink hover:bg-paper-dark'
                  }`}
                >
                  <Compass className="w-4 h-4 text-warm-dark" />
                  <span>{t.nav.marketplace}</span>
                </Link>

                <Link
                  href="/changelog"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${
                    pathname?.startsWith('/changelog')
                      ? 'bg-ink text-paper font-bold'
                      : 'text-ink hover:bg-paper-dark'
                  }`}
                >
                  <History className="w-4 h-4 text-warm-dark" />
                  <span>{t.nav.changelog}</span>
                </Link>

                {isAuthenticated && role === 'CUSTOMER' && (
                  <>
                    <Link
                      href="/account/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${
                        pathname?.startsWith('/account/orders')
                          ? 'bg-ink text-paper font-bold'
                          : 'text-ink hover:bg-paper-dark'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-warm-dark" />
                      <span>{t.nav.myOrders}</span>
                    </Link>
                    <Link
                      href="/account/vault"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors ${
                        pathname?.startsWith('/account/vault') ||
                        pathname?.startsWith('/account/journal')
                          ? 'bg-ink text-paper font-bold'
                          : 'text-ink hover:bg-paper-dark'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 text-warm-dark" />
                      <span>{t.nav.vault || 'Vault'}</span>
                    </Link>
                  </>
                )}

                {isAuthenticated && role === 'CREATOR' && (
                  <Link
                    href="/creator/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold text-ink hover:bg-paper-dark"
                  >
                    <Palette className="w-4 h-4 text-amber-500" />
                    <span>{t.nav.creatorHub}</span>
                  </Link>
                )}

                {isAuthenticated && role === 'SUPPLIER' && (
                  <Link
                    href="/supplier/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold text-ink hover:bg-paper-dark"
                  >
                    <Factory className="w-4 h-4 text-emerald-500" />
                    <span>{t.nav.production}</span>
                  </Link>
                )}

                {isAuthenticated && role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold text-ink hover:bg-paper-dark"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                    <span>{t.nav.admin}</span>
                  </Link>
                )}
              </div>

              {/* Guest Action: Sign In & Register in Mobile Drawer */}
              {!isAuthenticated && (
                <div className="pt-3 border-t border-borderCol/60 space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2 px-3 text-center text-xs font-mono uppercase tracking-wider font-semibold border border-ink/40 rounded-lg text-ink hover:bg-paper-dark block transition-colors"
                  >
                    {t.nav.signIn || 'Sign In'}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2 px-3 text-center text-xs font-mono uppercase tracking-wider font-bold bg-ink text-paper rounded-lg hover:bg-ink-light block transition-colors shadow-sm"
                  >
                    {t.nav.register || 'Register'}
                  </Link>
                </div>
              )}
            </div>

            {/* Footer in Drawer: Preferences / Settings Modal Trigger */}
            <div className="pt-4 border-t border-borderCol space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openSettingsModal();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-ink bg-paper border border-borderCol hover:bg-paper-dark transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <Sliders className="w-3.5 h-3.5 text-warm-dark" />
                  <span>{t.nav.settings}</span>
                </span>
                <span className="text-[10px] text-mutedGray uppercase">Preferences</span>
              </button>

              <div className="flex items-center justify-between px-2 text-[10px] font-mono text-mutedGray">
                <span>Version</span>
                <Link
                  href="/changelog"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-ink font-bold hover:underline"
                >
                  {APP_VERSION}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
