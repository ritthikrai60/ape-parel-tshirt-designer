'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Factory,
  Save,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  DollarSign,
  TrendingUp,
  Layers,
  Box,
  Truck,
  Sparkles,
} from 'lucide-react';
import { SupplierNav } from '@/components/portal/SupplierNav';
import {
  calculateTransparentCostBreakdown,
  SUPPLIER_TERMINOLOGY,
} from '@/lib/supplier';

export interface SupplierCatalogClientProps {
  suppliers: Array<{
    id: string;
    slug: string;
    companyName: string;
    location: string;
    leadTimeDays: number;
  }>;
  currentSupplierSlug: string;
  initialProduct: any;
  initialPrintingService: any;
}

export const SupplierCatalogClient: React.FC<SupplierCatalogClientProps> = ({
  suppliers,
  currentSupplierSlug,
  initialProduct,
  initialPrintingService,
}) => {
  const router = useRouter();

  const [product, setProduct] = useState<any>(initialProduct);
  const [printingService, setPrintingService] = useState<any>(
    initialPrintingService
  );

  // Form input states
  const [basePrice, setBasePrice] = useState<number>(
    product?.basePrice ?? 150
  );
  const [packagingPrice, setPackagingPrice] = useState<number>(
    product?.packagingPrice ?? 15
  );
  const [shippingPrice, setShippingPrice] = useState<number>(
    product?.shippingPrice ?? 40
  );
  const [pricePerSurface, setPricePerSurface] = useState<number>(
    printingService?.pricePerSurface ?? 80
  );
  const [supportedSurfaces, setSupportedSurfaces] = useState<string>(
    printingService?.supportedSurfaces ?? 'BOTH'
  );

  // Synchronize state when facility prop changes
  useEffect(() => {
    setProduct(initialProduct);
    setPrintingService(initialPrintingService);
    setBasePrice(initialProduct?.basePrice ?? 150);
    setPackagingPrice(initialProduct?.packagingPrice ?? 15);
    setShippingPrice(initialProduct?.shippingPrice ?? 40);
    setPricePerSurface(initialPrintingService?.pricePerSurface ?? 80);
    setSupportedSurfaces(initialPrintingService?.supportedSurfaces ?? 'BOTH');
  }, [currentSupplierSlug, initialProduct, initialPrintingService]);

  // Calculator preview states
  const [simQuantity, setSimQuantity] = useState<number>(1);
  const [simSurfaceMode, setSimSurfaceMode] = useState<'FRONT' | 'BACK' | 'BOTH'>('FRONT');
  const simSurfaces = simSurfaceMode === 'BOTH' ? 2 : 1;

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time calculation
  const breakdown = calculateTransparentCostBreakdown({
    basePrice,
    printPricePerSurface: pricePerSurface,
    surfacesCount: simSurfaces,
    packagingPrice,
    shippingPrice,
    quantity: simQuantity,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const currentSupplier =
      suppliers.find((s) => s.slug === currentSupplierSlug) || suppliers[0];

    if (!product?.id) {
      setErrorMessage('No garment product found for this supplier facility.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/supplier/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: currentSupplier.id,
          garmentProductId: product.id,
          basePrice,
          packagingPrice,
          shippingPrice,
          printingServiceId: printingService?.id,
          pricePerSurface,
          supportedSurfaces,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update pricing');
      }

      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating catalog pricing');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      <SupplierNav
        currentSupplierSlug={currentSupplierSlug}
        suppliers={suppliers}
      />

      {/* Page Title & Guidelines Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper-light border border-borderCol p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold font-sans text-ink">
              Blank Garment & DTG Catalog Pricing
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-warm/20 text-ink font-semibold">
              ราคาเสื้อเปล่า & งานพิมพ์
            </span>
          </div>
          <p className="font-mono text-xs text-mutedGray">
            {SUPPLIER_TERMINOLOGY.TRANSPARENT_COST_SYSTEM} — Adjust blank garment base rates, digital DTG printing fees, and packaging costs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-ink hover:bg-ink-light text-paper rounded-xl font-mono text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <span>Saving Changes...</span>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-warm" />
              <span>Save Pricing Settings</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-mono text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>บันทึกการตั้งค่าราคาเรียบร้อยแล้ว การเปลี่ยนแปลงมีผลกับการคำนวณราคาของลูกค้าทันที</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 font-mono text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Pricing Form & Live Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Garment Product Spec Info */}
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol/60 pb-3">
              <div className="flex items-center space-x-2">
                <Box className="w-4 h-4 text-warm-dark" />
                <h3 className="font-sans font-bold text-sm text-ink">
                  {product?.name || 'Apex Heavyweight Oversized Tee'}
                </h3>
              </div>
              <span className="font-mono text-xs text-mutedGray">
                SKU: <strong className="text-ink">{product?.sku || 'APX-HVY-001'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-paper rounded-xl border border-borderCol/60">
                <span className="text-[10px] uppercase text-mutedGray">Fabric Spec</span>
                <p className="font-bold text-ink mt-0.5">{product?.fabric || '100% Combed Cotton'}</p>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol/60">
                <span className="text-[10px] uppercase text-mutedGray">Weight / GSM</span>
                <p className="font-bold text-ink mt-0.5">{product?.weightGsm || 240} GSM Heavyweight</p>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-borderCol/60">
                <span className="text-[10px] uppercase text-mutedGray">Fit & Neck</span>
                <p className="font-bold text-ink mt-0.5 capitalize">{product?.fit || 'oversized'}, {product?.neckline || 'crew'}</p>
              </div>
            </div>
          </div>

          {/* Pricing Controls Form */}
          <div className="bg-paper-light border border-borderCol rounded-2xl p-6 space-y-6">
            <h3 className="font-sans font-bold text-sm text-ink border-b border-borderCol/60 pb-3">
              Pricing Component Settings (THB ฿)
            </h3>

            {/* 1. Blank Garment Base Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-xs font-bold text-ink flex items-center space-x-1.5">
                  <span>{SUPPLIER_TERMINOLOGY.BLANK_GARMENT_PRICE}</span>
                </label>
                <span className="font-mono text-sm font-black text-warm-dark">
                  ฿{basePrice} THB
                </span>
              </div>
              <p className="text-[11px] font-mono text-mutedGray">
                Base garment supply price for 240 GSM combed cotton blank tee.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="80"
                  max="350"
                  step="5"
                  value={basePrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setBasePrice(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="flex-1 accent-ink h-2 bg-paper-dark rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  value={basePrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setBasePrice(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="w-24 px-3 py-1.5 bg-paper border border-borderCol rounded-lg font-mono text-xs font-bold text-ink text-right focus:outline-none focus:border-warm"
                />
              </div>
            </div>

            {/* 2. DTG Printing Cost per Surface */}
            <div className="space-y-2 pt-2 border-t border-borderCol/40">
              <div className="flex justify-between items-center">
                <label className="font-mono text-xs font-bold text-ink flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-warm-dark" />
                  <span>{SUPPLIER_TERMINOLOGY.DTG_PRINTING_COST}</span>
                </label>
                <span className="font-mono text-sm font-black text-indigo-700">
                  ฿{pricePerSurface} THB / surface
                </span>
              </div>
              <p className="text-[11px] font-mono text-mutedGray">
                High-definition Kornit digital DTG inkjet pigment rate per printable side (Front / Back).
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="5"
                  value={pricePerSurface}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPricePerSurface(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="flex-1 accent-indigo-700 h-2 bg-paper-dark rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  value={pricePerSurface}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPricePerSurface(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="w-24 px-3 py-1.5 bg-paper border border-borderCol rounded-lg font-mono text-xs font-bold text-ink text-right focus:outline-none focus:border-warm"
                />
              </div>

              {/* Supported Surfaces Toggle */}
              <div className="flex items-center space-x-2 pt-2">
                <span className="font-mono text-xs text-mutedGray">Supported Surfaces:</span>
                {['FRONT', 'BACK', 'BOTH'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSupportedSurfaces(s)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors ${
                      supportedSurfaces === s
                        ? 'bg-ink text-paper'
                        : 'bg-paper text-mutedGray border border-borderCol hover:text-ink'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Eco Packaging Fee */}
            <div className="space-y-2 pt-2 border-t border-borderCol/40">
              <div className="flex justify-between items-center">
                <label className="font-mono text-xs font-bold text-ink flex items-center space-x-1.5">
                  <Box className="w-3.5 h-3.5 text-warm-dark" />
                  <span>{SUPPLIER_TERMINOLOGY.ECO_PACKAGING_FEE}</span>
                </label>
                <span className="font-mono text-sm font-black text-emerald-700">
                  ฿{packagingPrice} THB / unit
                </span>
              </div>
              <p className="text-[11px] font-mono text-mutedGray">
                Recyclable kraft box, protective glassine wrap, and custom brand sticker seal.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={packagingPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPackagingPrice(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="flex-1 accent-emerald-700 h-2 bg-paper-dark rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  value={packagingPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPackagingPrice(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="w-24 px-3 py-1.5 bg-paper border border-borderCol rounded-lg font-mono text-xs font-bold text-ink text-right focus:outline-none focus:border-warm"
                />
              </div>
            </div>

            {/* 4. Logistics & Shipping Cost */}
            <div className="space-y-2 pt-2 border-t border-borderCol/40">
              <div className="flex justify-between items-center">
                <label className="font-mono text-xs font-bold text-ink flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-warm-dark" />
                  <span>{SUPPLIER_TERMINOLOGY.SHIPPING_COST}</span>
                </label>
                <span className="font-mono text-sm font-black text-amber-700">
                  ฿{shippingPrice} THB flat
                </span>
              </div>
              <p className="text-[11px] font-mono text-mutedGray">
                Default domestic courier dispatch base rate (Thailand Post EMS / Flash Express).
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={shippingPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setShippingPrice(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="flex-1 accent-amber-700 h-2 bg-paper-dark rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  value={shippingPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setShippingPrice(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="w-24 px-3 py-1.5 bg-paper border border-borderCol rounded-lg font-mono text-xs font-bold text-ink text-right focus:outline-none focus:border-warm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Transparent Calculator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-paper-light border-2 border-warm/40 rounded-2xl p-6 shadow-sm space-y-5 sticky top-6">
            <div className="border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-warm-dark" />
                <h3 className="font-sans font-bold text-base text-ink">
                  Real-time Price Calculator
                </h3>
              </div>
              <p className="font-mono text-[11px] text-mutedGray mt-0.5">
                {SUPPLIER_TERMINOLOGY.TRANSPARENT_COST_SYSTEM}
              </p>
            </div>

            {/* Simulation Controls */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs bg-paper p-3 rounded-xl border border-borderCol/60">
              <div>
                <span className="text-[10px] text-mutedGray uppercase">Quantity:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setSimQuantity(Math.max(1, simQuantity - 1))}
                    className="w-6 h-6 rounded bg-paper-dark font-bold text-ink flex items-center justify-center hover:bg-ink hover:text-paper"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-ink">{simQuantity} pc(s)</span>
                  <button
                    type="button"
                    onClick={() => setSimQuantity(simQuantity + 1)}
                    className="w-6 h-6 rounded bg-paper-dark font-bold text-ink flex items-center justify-center hover:bg-ink hover:text-paper"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-mutedGray uppercase">Print Surface(s):</span>
                <div className="flex items-center flex-wrap gap-1 mt-1">
                  {[
                    { mode: 'FRONT' as const, label: 'Front (หน้า)', count: 1 },
                    { mode: 'BACK' as const, label: 'Back (หลัง)', count: 1 },
                    { mode: 'BOTH' as const, label: 'Both (หน้า+หลัง)', count: 2 },
                  ].map((surf) => {
                    const isSelected = simSurfaceMode === surf.mode;
                    const isSupported =
                      supportedSurfaces === 'BOTH' || supportedSurfaces === surf.mode;

                    return (
                      <button
                        key={surf.mode}
                        type="button"
                        onClick={() => setSimSurfaceMode(surf.mode)}
                        title={
                          !isSupported
                            ? `บริการนี้ระบุรองรับเฉพาะ: ${supportedSurfaces}`
                            : undefined
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isSelected
                            ? 'bg-ink text-paper shadow-xs'
                            : 'bg-paper-dark text-mutedGray hover:text-ink'
                        } ${!isSupported ? 'opacity-50 ring-1 ring-amber-400/40' : ''}`}
                      >
                        {surf.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transparent Cost Breakdown Rows */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-borderCol/40">
                <span className="text-mutedGray">ราคาเสื้อเปล่า ({basePrice} × {simQuantity}):</span>
                <span className="font-bold text-ink">฿{breakdown.blankGarmentTotal} THB</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-borderCol/40">
                <span className="text-mutedGray">
                  ค่างานพิมพ์ DTG ({pricePerSurface} × {simSurfaces} ด้าน [{simSurfaceMode}] × {simQuantity}):
                </span>
                <span className="font-bold text-indigo-700">฿{breakdown.dtgPrintingTotal} THB</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-borderCol/40">
                <span className="text-mutedGray">ค่าบรรจุภัณฑ์ ({packagingPrice} × {simQuantity}):</span>
                <span className="font-bold text-emerald-700">฿{breakdown.ecoPackagingTotal} THB</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-borderCol/40">
                <span className="text-mutedGray">ค่าจัดส่งพัสดุ (Flat):</span>
                <span className="font-bold text-amber-700">฿{breakdown.shippingTotal} THB</span>
              </div>
            </div>

            {/* Highlights: Supplier Earning & Margin */}
            <div className="p-4 bg-paper rounded-xl border border-warm/60 space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-mutedGray block">
                    Supplier Earning (รายรับผู้ผลิต)
                  </span>
                  <span className="font-mono text-[10px] text-mutedGray">
                    (เสื้อเปล่า + งานพิมพ์ + บรรจุภัณฑ์)
                  </span>
                </div>
                <span className="font-mono text-2xl font-black text-ink">
                  ฿{breakdown.totalSupplierEarnings.toLocaleString()} THB
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-borderCol/60 text-xs font-mono">
                <span className="text-mutedGray">Supplier Margin Share:</span>
                <span className="font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                  {breakdown.supplierMarginPercentage}%
                </span>
              </div>
            </div>

            {/* Total Production Cost for Customer */}
            <div className="p-4 bg-ink text-paper rounded-xl space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-xs uppercase text-paper/70 font-semibold">
                  Customer Production Subtotal:
                </span>
                <span className="font-mono text-xl font-black text-warm">
                  ฿{breakdown.customerProductionSubtotal.toLocaleString()} THB
                </span>
              </div>
              <p className="font-mono text-[10px] text-paper/60">
                * Excludes variable creator artwork license fees selected by customer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
