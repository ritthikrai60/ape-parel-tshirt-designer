'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Cookie,
  ShieldCheck,
  Scale,
  Lock,
  Building2,
  Palette,
  Compass,
  FileText,
  Sliders,
  PackageCheck,
  FolderHeart,
  Info,
  History,
} from 'lucide-react';
import { NewsletterSubscribeBox } from './NewsletterSubscribeBox';
import { CookiePreferencesModal } from '@/components/pdpa/CookiePreferencesModal';
import { LegalModalViewer, LegalDocType } from '@/components/pdpa/LegalModalViewer';
import { useSettings } from '@/components/providers/SettingsProvider';
import { FooterStatCounter } from './FooterStatCounter';
import { APP_VERSION } from '@/lib/version';

export const Footer: React.FC = () => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [legalModalType, setLegalModalType] = useState<LegalDocType | null>(null);
  const { openSettingsModal, t } = useSettings();

  return (
    <>
      <footer className="border-t border-borderCol bg-paper-dark/30 pt-10 pb-8 print:hidden text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Top Section: Platform Mission & Newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-base font-black tracking-tighter uppercase px-2 py-0.5 bg-ink text-paper rounded">
                  APE
                </span>
                <span className="font-mono text-base font-bold tracking-tight uppercase text-ink">
                  PAREL
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-warm-dark bg-warm/20 border border-warm/40 px-2 py-0.5 rounded font-bold">
                  Marketplace Platform
                </span>
              </div>
              <p className="text-xs text-mutedGray font-sans leading-relaxed max-w-lg">
                {t.footer.brandDesc}
              </p>

              {/* Platform Trust & Neutrality Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-paper px-2.5 py-1.5 rounded-lg border border-borderCol flex items-center space-x-2 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate" title={t.footer.verifiedNetwork}>{t.footer.verifiedNetwork}</span>
                </div>
                <div className="bg-paper px-2.5 py-1.5 rounded-lg border border-borderCol flex items-center space-x-2 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate" title={t.footer.escrowProtection}>{t.footer.escrowProtection}</span>
                </div>
                <div className="bg-paper px-2.5 py-1.5 rounded-lg border border-borderCol flex items-center space-x-2 shadow-2xs">
                  <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate" title={t.footer.creatorProtection}>{t.footer.creatorProtection}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <NewsletterSubscribeBox />
            </div>
          </div>

          {/* Middle Section: 3 Functional Platform Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-borderCol/60 text-xs font-sans">
            {/* Column 1: Platform Governance & Rules */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink block">
                {t.footer.platformGovernance}
              </span>
              <ul className="space-y-2 text-mutedGray">
                <li>
                  <Link href="/about" className="hover:text-ink transition-colors flex items-center space-x-1.5 font-medium">
                    <Info className="w-3 h-3 text-warm-dark" />
                    <span>{t.footer.about}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/changelog" className="hover:text-ink transition-colors flex items-center space-x-1.5 font-medium">
                    <History className="w-3 h-3 text-emerald-600" />
                    <span>{t.footer.changelog}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <FileText className="w-3 h-3 text-mutedGray" />
                    <span>{t.footer.terms}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>{t.footer.privacy}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <Cookie className="w-3 h-3 text-warm-dark" />
                    <span>{t.footer.cookies}</span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModalType('terms')}
                    className="hover:text-ink transition-colors flex items-center space-x-1.5 text-left"
                  >
                    <Scale className="w-3 h-3 text-amber-600" />
                    <span>{t.footer.ipTakedown}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalModalType('terms')}
                    className="hover:text-ink transition-colors flex items-center space-x-1.5 text-left"
                  >
                    <Building2 className="w-3 h-3 text-mutedGray" />
                    <span>{t.footer.supplierCodeOfConduct}</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Ecosystem Portals */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink block">
                {t.footer.ecosystemPortals}
              </span>
              <ul className="space-y-2 text-mutedGray">
                <li>
                  <Link href="/creator" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <Palette className="w-3 h-3 text-purple-600" />
                    <span>{t.footer.creatorHub}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/supplier" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <Building2 className="w-3 h-3 text-emerald-600" />
                    <span>{t.footer.supplierPortal}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/marketplace" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <Compass className="w-3 h-3 text-blue-600" />
                    <span>{t.home.browseMarket}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio/new" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <Sliders className="w-3 h-3 text-warm-dark" />
                    <span>{t.home.startStudio}</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Utilities & Settings */}
            <div className="space-y-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink block">
                {t.footer.customerUtilities}
              </span>
              <ul className="space-y-2 text-mutedGray">
                <li>
                  <Link href="/orders" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <PackageCheck className="w-3 h-3 text-ink" />
                    <span>{t.footer.trackOrder}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/vault" className="hover:text-ink transition-colors flex items-center space-x-1.5">
                    <FolderHeart className="w-3 h-3 text-rose-500" />
                    <span>{t.footer.savedVault}</span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowPreferences(true)}
                    className="hover:text-ink transition-colors flex items-center space-x-1.5 text-left"
                  >
                    <Cookie className="w-3 h-3 text-warm-dark" />
                    <span>{t.footer.cookieSettings}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={openSettingsModal}
                    className="hover:text-ink transition-colors flex items-center space-x-1.5 text-left"
                  >
                    <Sliders className="w-3 h-3 text-ink" />
                    <span>{t.footer.settingsLink}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section: Legal Disclaimer, Live Stat Counter & DBD Registration */}
          <div className="pt-6 border-t border-borderCol/60 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs font-sans text-mutedGray">
            <p className="text-[11px] text-mutedGray text-center lg:text-left leading-relaxed max-w-xl">
              {t.footer.marketplaceDisclaimer}
            </p>

            {/* Live Platform Visitor Pulse Counter */}
            <div className="shrink-0 flex items-center justify-center">
              <FooterStatCounter />
            </div>

            <div className="flex flex-col items-center lg:items-end font-mono text-[10px] space-y-1 shrink-0">
              <div className="flex items-center space-x-2">
                <span>© {new Date().getFullYear()} APE-PAREL Co., Ltd. {t.footer.rights}</span>
                <Link
                  href="/changelog"
                  className="px-1.5 py-0.5 bg-paper border border-borderCol hover:border-ink rounded text-ink font-bold transition-colors shadow-2xs"
                  title="View Platform Changelog & Releases"
                >
                  {APP_VERSION}
                </Link>
              </div>
              <span className="text-mutedGray/80">DBD e-Commerce Registered • Thai PDPA Compliant</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Preferences Modal */}
      <CookiePreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onOpenLegalDoc={(type) => setLegalModalType(type)}
      />

      {/* Legal Modal Viewer */}
      {legalModalType && (
        <LegalModalViewer
          isOpen={Boolean(legalModalType)}
          onClose={() => setLegalModalType(null)}
          type={legalModalType}
        />
      )}
    </>
  );
};

export default Footer;
