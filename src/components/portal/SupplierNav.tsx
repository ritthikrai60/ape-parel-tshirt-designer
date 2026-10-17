'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Factory,
  Layers,
  Grid,
  Truck,
  Wallet,
  MapPin,
  Clock,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SupplierOnboardingModal } from './SupplierOnboardingModal';

export interface SupplierNavProps {
  currentSupplierSlug: string;
  suppliers: Array<{
    id: string;
    slug: string;
    companyName: string;
    location: string;
    leadTimeDays: number;
  }>;
  needsOnboarding?: boolean;
}

export const SupplierNav: React.FC<SupplierNavProps> = ({
  currentSupplierSlug,
  suppliers,
  needsOnboarding,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const onboardQuery = searchParams?.get('onboard') === 'true' || searchParams?.get('onboarding') === 'true';

  const userNeedsOnboarding =
    Boolean(needsOnboarding) ||
    onboardQuery ||
    Boolean(
      session?.user &&
      !session.user.hasSupplierProfile &&
      session.user.role !== 'ADMIN'
    );

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(Boolean(userNeedsOnboarding));

  useEffect(() => {
    if (userNeedsOnboarding) {
      setIsOnboardingOpen(true);
    }
  }, [userNeedsOnboarding]);

  const currentSupplier =
    suppliers.find((s) => s.slug === currentSupplierSlug) || suppliers[0];

  const handleFacilityChange = (slug: string) => {
    // Preserve current route while changing supplier query param
    router.push(`${pathname}?supplier=${encodeURIComponent(slug)}`);
  };

  const navLinks = [
    {
      href: `/supplier/dashboard?supplier=${encodeURIComponent(currentSupplierSlug)}`,
      match: ['/supplier/dashboard', '/supplier/orders'],
      label: 'Production Queue',
      sublabel: 'คิวงานผลิต',
      icon: Layers,
    },
    {
      href: `/supplier/catalog?supplier=${encodeURIComponent(currentSupplierSlug)}`,
      match: ['/supplier/catalog', '/supplier/pricing'],
      label: 'Garment & DTG Catalog',
      sublabel: 'ราคาเสื้อ & งานพิมพ์',
      icon: Factory,
    },
    {
      href: `/supplier/inventory?supplier=${encodeURIComponent(currentSupplierSlug)}`,
      match: ['/supplier/inventory'],
      label: 'Inventory Matrix',
      sublabel: 'สต็อกสี x ไซส์',
      icon: Grid,
    },
    {
      href: `/supplier/fulfillment?supplier=${encodeURIComponent(currentSupplierSlug)}`,
      match: ['/supplier/fulfillment'],
      label: 'Fulfillment & Packing',
      sublabel: 'จัดส่งพัสดุ',
      icon: Truck,
    },
    {
      href: `/supplier/finance?supplier=${encodeURIComponent(currentSupplierSlug)}`,
      match: ['/supplier/finance'],
      label: 'Ledger & Payouts',
      sublabel: 'รายรับ & ถอนเงิน',
      icon: Wallet,
    },
  ];

  return (
    <div className="w-full space-y-4 border-b border-borderCol pb-4">
      {/* Progressive Onboarding Wizard Banner */}
      {userNeedsOnboarding && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-ink">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-ink text-paper font-bold font-mono text-xs">SUPPLIER SETUP</span>
            <div>
              <p className="font-sans font-bold text-sm text-ink">Supplier Profile Not Activated</p>
              <p className="font-mono text-xs text-mutedGray">
                Set up your garment manufacturing facility, contact phone, and SLA lead times to fulfill production orders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="px-4 py-2 bg-ink text-paper rounded-lg font-mono text-xs uppercase font-bold hover:bg-ink-light transition-colors whitespace-nowrap self-start sm:self-auto flex items-center space-x-1.5 shadow-sm"
          >
            <span>Setup Supplier Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Facility Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Factory className="w-6 h-6 text-ink" />
            <h1 className="text-2xl font-bold font-sans text-ink">
              {currentSupplier?.companyName || 'Supplier Production Facility'}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-emerald-700" />
              <span>VERIFIED FACILITY</span>
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-xs text-mutedGray mt-1 flex-wrap">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{currentSupplier?.location}</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Standard SLA: {currentSupplier?.leadTimeDays} Days</span>
            </span>
            <span>&bull;</span>
            <span>Kornit DTG Industrial Platen (35x45 cm)</span>
          </div>
        </div>

        {/* Facility Selector */}
        {suppliers.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-mutedGray">Facility:</span>
            <select
              aria-label="Select facility"
              value={currentSupplierSlug}
              onChange={(e) => handleFacilityChange(e.target.value)}
              className="px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:outline-none focus:border-warm"
            >
              {suppliers.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.companyName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-2 overflow-x-auto pt-2 scrollbar-none">
        {navLinks.map((link) => {
          const isActive = link.match.some((m) => pathname.startsWith(m));
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs flex items-center space-x-2 transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-ink text-paper border-ink font-bold shadow-sm'
                  : 'bg-paper text-ink hover:bg-paper-dark border-borderCol'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-warm' : 'text-mutedGray'}`} />
              <div className="flex flex-col text-left">
                <span>{link.label}</span>
                <span
                  className={`text-[10px] ${
                    isActive ? 'text-warm/80' : 'text-mutedGray'
                  }`}
                >
                  {link.sublabel}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Supplier Onboarding Modal */}
      <SupplierOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        initialUser={{
          id: session?.user?.id,
          name: session?.user?.name,
          email: session?.user?.email,
        }}
        onSuccess={async (supplier) => {
          setIsOnboardingOpen(false);
          router.push(`/supplier/dashboard?supplier=${encodeURIComponent(supplier.slug)}`);
          router.refresh();
        }}
      />
    </div>
  );
};
