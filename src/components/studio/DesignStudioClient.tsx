'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  DesignElement,
  ArtworkLicenseLine,
  PriceCalculationResult,
  CreateOrderInput,
  CreateOrderResult,
  PrintSurface,
} from '@/lib/types';
import { GarmentPreview3D, ViewPreset } from './GarmentPreview3D';
import { Garment2DCanvas } from './Garment2DCanvas';
import { LayerManager } from './LayerManager';
import { ArtworkCatalogDrawer } from './ArtworkCatalogDrawer';
import { LivePricingCard } from './LivePricingCard';
import { bakeCompositeTexture, preloadArtworkImages } from './textureSync';
import { Check, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export interface GarmentProductDTO {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  fabric: string;
  weightGsm: number;
  fit: string;
  neckline: string;
  basePrice: number;
  packagingPrice: number;
  shippingPrice: number;
  variants: Array<{
    id: string;
    sku: string;
    colorName: string;
    colorHex: string;
    size: string;
    stock: number;
    priceAdjustment: number;
  }>;
}

export interface ArtworkDTO {
  id: string;
  title: string;
  description: string | null;
  category: string;
  previewUrl: string;
  mimeType: string;
  tags: string | null;
  creator: {
    id: string;
    displayName: string;
    slug: string;
    avatarUrl: string | null;
  };
  licenseOptions: Array<{
    id: string;
    name: string;
    price: number;
    scope: string;
  }>;
}

export interface DesignStudioClientProps {
  initialGarments: GarmentProductDTO[];
  initialArtworks: ArtworkDTO[];
}

// 4 Authentic Garment Colors
export const AUTHENTIC_COLORS = [
  { id: 'BLK', name: 'Ink Black', hex: '#131718', textCol: '#FFFFFF' },
  { id: 'WHT', name: 'Optic White', hex: '#FFFFFF', textCol: '#131718' },
  { id: 'BGE', name: 'Paper Beige', hex: '#F5F0E8', textCol: '#131718' },
  { id: 'WRM', name: 'Warm Kraft', hex: '#DABA98', textCol: '#131718' },
] as const;

export const SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const;

export const DesignStudioClient: React.FC<DesignStudioClientProps> = ({
  initialGarments,
  initialArtworks,
}) => {
  // 1. Garment State
  const selectedGarment = initialGarments[0] || null;
  const [selectedColor, setSelectedColor] = useState<string>('#131718');
  const [selectedSize, setSelectedSize] = useState<string>('L');
  const [quantity, setQuantity] = useState<number>(1);

  // Variant resolution
  const currentVariant = useMemo(() => {
    if (!selectedGarment) return undefined;
    return (
      selectedGarment.variants.find(
        (v) =>
          v.colorHex.toLowerCase() === selectedColor.toLowerCase() &&
          v.size.toUpperCase() === selectedSize.toUpperCase()
      ) || selectedGarment.variants[0]
    );
  }, [selectedGarment, selectedColor, selectedSize]);

  // 2. View and Studio Layout State
  const [viewMode, setViewMode] = useState<'SPLIT' | '2D' | '3D'>('SPLIT');
  const [activeSurface, setActiveSurface] = useState<'FRONT' | 'BACK'>('FRONT');
  const [viewPreset, setViewPreset] = useState<ViewPreset>('FRONT');

  // 3. Design Elements (Layers)
  const [frontElements, setFrontElements] = useState<DesignElement[]>([]);
  const [backElements, setBackElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Active layers helper
  const activeElements = activeSurface === 'FRONT' ? frontElements : backElements;
  const setActiveElements = activeSurface === 'FRONT' ? setFrontElements : setBackElements;

  // 4. Image Cache & Offscreen Texture Canvas for 3D Sync
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [textureVersion, setTextureVersion] = useState<number>(0);

  // Initialize offscreen canvas
  useEffect(() => {
    if (!offscreenCanvasRef.current && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      offscreenCanvasRef.current = c;
    }
  }, []);

  // Preload artwork images whenever layers change
  useEffect(() => {
    const urls = [...frontElements, ...backElements].map((e) => e.previewUrl);
    if (urls.length > 0) {
      preloadArtworkImages(urls, imageCacheRef.current, () => {
        if (offscreenCanvasRef.current) {
          bakeCompositeTexture(offscreenCanvasRef.current, {
            garmentColorHex: selectedColor,
            frontElements,
            backElements,
            imageCache: imageCacheRef.current,
          });
          setTextureVersion((v) => v + 1);
        }
      });
    }
  }, [frontElements, backElements, selectedColor]);

  // Bake texture synchronously whenever layers or color updates
  useEffect(() => {
    if (offscreenCanvasRef.current) {
      bakeCompositeTexture(offscreenCanvasRef.current, {
        garmentColorHex: selectedColor,
        frontElements,
        backElements,
        imageCache: imageCacheRef.current,
      });
      setTextureVersion((v) => v + 1);
    }
  }, [selectedColor, frontElements, backElements]);

  // 5. Artwork Catalog Drawer
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);

  // Convert initialArtworks to SeededArtwork format
  const catalogList = useMemo(() => {
    return initialArtworks.map((a) => {
      const stdLic = a.licenseOptions.find((l) => l.price > 0) || a.licenseOptions[0];
      return {
        artworkId: a.id,
        licenseOptionId: stdLic ? stdLic.id : 'lic_std',
        title: a.title,
        category: a.category,
        previewUrl: a.previewUrl,
        creatorName: a.creator.displayName,
        creatorId: a.creator.id,
        price: stdLic ? stdLic.price : 40,
      };
    });
  }, [initialArtworks]);

  const handleAddArtwork = useCallback(
    (element: DesignElement) => {
      setActiveElements((prev) => [...prev, element]);
      setSelectedElementId(element.id);
      setIsCatalogOpen(false);
    },
    [setActiveElements]
  );

  // Quick Action: Load THB 410 Benchmark Preset
  const handleLoadBenchmarkPreset = useCallback(() => {
    const dashApe = initialArtworks.find((a) => a.title.includes('Dash Ape Classic'));
    const cyberPrimate = initialArtworks.find((a) => a.title.includes('Cyber Primate'));
    const staticGlitch = initialArtworks.find((a) => a.title.includes('Static Glitch'));

    const lic1Id = dashApe?.licenseOptions.find((l) => l.price === 40)?.id || 'lic_dash_ape_std';
    const lic2Id = cyberPrimate?.licenseOptions.find((l) => l.price === 60)?.id || 'lic_cyber_primate_std';
    const lic3Id = staticGlitch?.licenseOptions.find((l) => l.price === 25)?.id || 'lic_static_glitch_std';

    const dashApeUrl =
      dashApe?.previewUrl ||
      'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718';
    const cyberPrimateUrl =
      cyberPrimate?.previewUrl ||
      'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98';
    const staticGlitchUrl =
      staticGlitch?.previewUrl ||
      'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729';

    const benchmarkElements: DesignElement[] = [
      {
        id: 'bench-1',
        artworkId: dashApe?.id || 'art_dash_ape_classic',
        licenseOptionId: lic1Id,
        title: dashApe?.title || 'Dash Ape Classic Head Mark',
        previewUrl: dashApeUrl,
        creatorName: dashApe?.creator.displayName || 'Dash Ape Studio',
        creatorId: dashApe?.creator.id || 'creator_dash_ape',
        surface: 'FRONT',
        x: 50,
        y: 35,
        width: 44,
        height: 32,
        rotation: 0,
        zIndex: 1,
        price: 40,
      },
      {
        id: 'bench-2',
        artworkId: cyberPrimate?.id || 'art_cyber_primate',
        licenseOptionId: lic2Id,
        title: cyberPrimate?.title || 'Cyber Primate Tokyo 2088',
        previewUrl: cyberPrimateUrl,
        creatorName: cyberPrimate?.creator.displayName || 'Dash Ape Studio',
        creatorId: cyberPrimate?.creator.id || 'creator_dash_ape',
        surface: 'FRONT',
        x: 34,
        y: 65,
        width: 28,
        height: 28,
        rotation: -4,
        zIndex: 2,
        price: 60,
      },
      {
        id: 'bench-3',
        artworkId: staticGlitch?.id || 'art_static_glitch',
        licenseOptionId: lic3Id,
        title: staticGlitch?.title || 'Static Glitch Protocol',
        previewUrl: staticGlitchUrl,
        creatorName: staticGlitch?.creator.displayName || 'Cyber Monk',
        creatorId: staticGlitch?.creator.id || 'creator_cyber_monk',
        surface: 'FRONT',
        x: 66,
        y: 65,
        width: 28,
        height: 28,
        rotation: 4,
        zIndex: 3,
        price: 25,
      },
    ];

    setFrontElements(benchmarkElements);
    setBackElements([]);
    setSelectedColor('#131718');
    setSelectedSize('L');
    setQuantity(1);
    setActiveSurface('FRONT');
    setViewPreset('FRONT');
  }, [initialArtworks]);

  // Update Layer
  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<DesignElement>) => {
      setActiveElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    [setActiveElements]
  );

  // Remove Layer
  const handleDeleteElement = useCallback(
    (id: string) => {
      setActiveElements((prev) => prev.filter((e) => e.id !== id));
      if (selectedElementId === id) setSelectedElementId(null);
    },
    [setActiveElements, selectedElementId]
  );

  // Clear Surface
  const handleClearSurface = useCallback(() => {
    setActiveElements([]);
    setSelectedElementId(null);
  }, [setActiveElements]);

  // 6. Pricing Calculation & License Lines
  const frontLicenses: ArtworkLicenseLine[] = useMemo(
    () =>
      frontElements.map((e) => ({
        artworkId: e.artworkId,
        licenseOptionId: e.licenseOptionId,
      })),
    [frontElements]
  );

  const backLicenses: ArtworkLicenseLine[] = useMemo(
    () =>
      backElements.map((e) => ({
        artworkId: e.artworkId,
        licenseOptionId: e.licenseOptionId,
      })),
    [backElements]
  );

  const [currentPricing, setCurrentPricing] = useState<PriceCalculationResult | null>(null);

  // 7. Order Placement Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<CreateOrderResult['order'] | null>(null);
  const [shippingForm, setShippingForm] = useState({
    name: 'Somchai Prasert',
    address: '88/1 Sukhumvit Soi 55, Thong Lo',
    city: 'Watthana, Bangkok',
    postal: '10110',
    phone: '081-992-4411',
  });

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarment || !currentPricing) return;

    setIsSubmittingOrder(true);
    try {
      const orderPayload: CreateOrderInput = {
        garmentProductId: selectedGarment.id,
        garmentVariantId: currentVariant?.id,
        garmentColorHex: selectedColor,
        garmentSize: selectedSize,
        garmentFit: selectedGarment.fit,
        designTitle: 'Custom Creator Tee',
        quantity,
        frontElements,
        backElements,
        shippingName: shippingForm.name,
        shippingAddress: shippingForm.address,
        shippingCity: shippingForm.city,
        shippingPostal: shippingForm.postal,
        shippingPhone: shippingForm.phone,
        clientClaimedTotal: currentPricing.totalAmount, // Protected by anti-tamper check
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Order placement failed (${res.status})`);
      }

      const data = await res.json();
      setOrderResult(data.order);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-paper">
      {/* Studio Toolbar Header */}
      <div className="border-b border-borderCol bg-paper-light/90 backdrop-blur px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left: Garment Name & Benchmark Preset Button */}
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold uppercase text-ink">
              {selectedGarment?.name || 'Heavyweight Studio Tee'}
            </span>
            <span className="font-mono text-[10px] text-mutedGray">
              {selectedGarment?.fabric || '240 GSM Combed Cotton'} &bull; SKU: {selectedGarment?.sku}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLoadBenchmarkPreset}
            className="hidden sm:inline-flex items-center space-x-1.5 font-mono text-[10px] uppercase tracking-wider bg-warm/30 hover:bg-warm border border-warm/60 px-2.5 py-1 rounded transition-colors text-ink font-semibold"
            title="Load 1-unit Apex Tee with Dash Ape, Cyber Primate, and Static Glitch licenses"
          >
            <Zap className="w-3 h-3 text-amber-700" />
            <span>⚡ Load ฿410 Benchmark</span>
          </button>
        </div>

        {/* Center: View Switcher (2D vs Split vs 3D) */}
        <div className="flex items-center space-x-1 bg-paper border border-borderCol p-0.5 rounded-lg shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('2D')}
            className={`px-3 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
              viewMode === '2D' ? 'bg-ink text-paper font-bold' : 'text-ink hover:bg-paper-dark'
            }`}
          >
            2D Canvas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('SPLIT')}
            className={`px-3 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
              viewMode === 'SPLIT' ? 'bg-ink text-paper font-bold' : 'text-ink hover:bg-paper-dark'
            }`}
          >
            Split 50/50
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3D')}
            className={`px-3 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
              viewMode === '3D' ? 'bg-ink text-paper font-bold' : 'text-ink hover:bg-paper-dark'
            }`}
          >
            3D Viewport
          </button>
        </div>

        {/* Right: Surface Toggle (Front / Back) */}
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[10px] uppercase text-mutedGray hidden sm:inline">
            Active Surface:
          </span>
          <div className="flex items-center space-x-1 bg-paper border border-borderCol p-0.5 rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveSurface('FRONT');
                setViewPreset('FRONT');
              }}
              className={`px-2.5 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
                activeSurface === 'FRONT'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-ink hover:bg-paper-dark'
              }`}
            >
              Front ({frontElements.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSurface('BACK');
                setViewPreset('BACK');
              }}
              className={`px-2.5 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
                activeSurface === 'BACK'
                  ? 'bg-ink text-paper font-bold'
                  : 'text-ink hover:bg-paper-dark'
              }`}
            >
              Back ({backElements.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Canvas / 3D & Configuration Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[620px]">
        {/* Workspace Canvas / Viewports Area */}
        <div className="flex-1 flex flex-col relative bg-paper-light border-r border-borderCol overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-full w-full relative">
            {/* 2D Canvas Panel */}
            {(viewMode === '2D' || viewMode === 'SPLIT') && (
              <div
                className={`relative flex flex-col items-center justify-center p-4 sm:p-6 h-full ${
                  viewMode === '2D'
                    ? 'col-span-1 lg:col-span-2'
                    : 'border-b lg:border-b-0 lg:border-r border-borderCol'
                }`}
              >
                <div className="w-full flex justify-between items-center mb-2 px-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                    2D Canvas &bull; {activeSurface} Surface
                  </span>
                  <span className="font-mono text-[10px] text-mutedGray">
                    Full-bleed design area
                  </span>
                </div>

                <Garment2DCanvas
                  surface={activeSurface}
                  garmentColorHex={selectedColor}
                  elements={activeElements}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={handleUpdateElement}
                  onDeleteElement={handleDeleteElement}
                  interactive={true}
                />
              </div>
            )}

            {/* 3D Viewport Panel */}
            {(viewMode === '3D' || viewMode === 'SPLIT') && (
              <div
                className={`relative flex flex-col items-center justify-center p-4 sm:p-6 h-full ${
                  viewMode === '3D' ? 'col-span-1 lg:col-span-2' : ''
                }`}
              >
                <div className="w-full flex justify-between items-center mb-2 px-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                    3D Three.js Viewport &bull; Live Texture Sync
                  </span>
                  <span className="font-mono text-[10px] text-mutedGray">
                    3-Point Lighting
                  </span>
                </div>

                <div className="w-full h-full min-h-[460px] relative rounded-xl border border-borderCol/60 bg-paper/50 overflow-hidden shadow-inner">
                  <GarmentPreview3D
                    textureCanvas={offscreenCanvasRef.current}
                    garmentColorHex={selectedColor}
                    textureVersion={textureVersion}
                    activePreset={viewPreset}
                    onPresetChange={setViewPreset}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls & Configuration Sidebar */}
        <div className="w-full lg:w-96 bg-paper p-5 flex flex-col space-y-6 overflow-y-auto border-t lg:border-t-0 border-borderCol shadow-sm">
          {/* Authentic Garment Color Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink">Garment Color</span>
              <span className="font-mono text-xs text-mutedGray">
                {AUTHENTIC_COLORS.find((c) => c.hex === selectedColor)?.name}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AUTHENTIC_COLORS.map((c) => {
                const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-11 rounded-lg border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'ring-2 ring-warm ring-offset-2 border-warm shadow-md scale-105'
                        : 'border-borderCol hover:scale-102 opacity-90'
                    }`}
                    title={`${c.name} (${c.hex})`}
                  >
                    {isSelected && (
                      <Check
                        className="w-4 h-4 drop-shadow"
                        style={{ color: c.textCol }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Garment Size Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink">Garment Size</span>
              <span className="font-mono text-xs text-mutedGray">Oversized Fit</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {SIZES.map((s) => {
                const isSelected = selectedSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`py-2 font-mono text-xs uppercase font-bold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-ink text-paper border-ink shadow-xs'
                        : 'bg-paper-light text-ink border-borderCol hover:border-warm'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer Manager */}
          <LayerManager
            surface={activeSurface}
            elements={activeElements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onOpenCatalog={() => setIsCatalogOpen(true)}
            onClearSurface={handleClearSurface}
          />

          {/* Live Pricing Card */}
          <LivePricingCard
            garmentProductId={selectedGarment?.id || 'APX-HVY-001'}
            garmentVariantId={currentVariant?.id}
            garmentTitle={selectedGarment?.name || 'Apex Heavyweight Tee'}
            quantity={quantity}
            onQuantityChange={setQuantity}
            frontLicenses={frontLicenses}
            backLicenses={backLicenses}
            onPricingCalculated={setCurrentPricing}
            onCheckoutClick={() => setIsCheckoutOpen(true)}
            onLoadBenchmark={handleLoadBenchmarkPreset}
          />
        </div>
      </div>

      {/* Artwork Catalog Drawer */}
      <ArtworkCatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        surface={activeSurface}
        onAddArtwork={handleAddArtwork}
        customArtworks={catalogList}
      />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col space-y-5 overflow-hidden">
            {orderResult ? (
              // Order Confirmation Screen
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-300">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-sans font-bold text-ink">Order Placed Successfully!</h3>
                <p className="text-xs font-mono text-mutedGray">
                  Order Number: <span className="font-bold text-ink">{orderResult.orderNumber}</span>
                </p>
                <div className="bg-paper p-4 rounded-xl border border-borderCol text-left space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-mutedGray">Total Charged:</span>
                    <span className="font-bold text-ink">฿{orderResult.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mutedGray">Status:</span>
                    <span className="font-bold text-amber-700">{orderResult.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mutedGray">Payment:</span>
                    <span className="font-bold text-emerald-700">{orderResult.paymentStatus}</span>
                  </div>
                </div>

                <div className="pt-3 flex space-x-3">
                  <Link
                    href={`/account/orders/${orderResult.id}`}
                    className="flex-1 py-2.5 bg-ink text-paper rounded-lg font-mono text-xs uppercase font-bold text-center hover:bg-ink-light transition-colors"
                  >
                    View Order Specs
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setOrderResult(null);
                    }}
                    className="px-4 py-2.5 border border-borderCol rounded-lg font-mono text-xs text-mutedGray hover:text-ink transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Checkout Shipping Details Form
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="flex items-center justify-between border-b border-borderCol pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-mono text-sm uppercase font-bold text-ink">
                      Secure Checkout &bull; Authoritative Order
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="p-1 text-mutedGray hover:text-ink rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.name}
                      onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                      Shipping Address
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                        City / District
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingForm.city}
                        onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                        className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingForm.postal}
                        onChange={(e) => setShippingForm({ ...shippingForm, postal: e.target.value })}
                        className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-paper p-3 rounded-lg border border-borderCol flex justify-between items-center text-xs font-mono">
                  <span className="text-mutedGray">Final Authoritative Total:</span>
                  <span className="font-bold text-base text-ink">
                    ฿{currentPricing?.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="w-full py-3 bg-ink hover:bg-ink-light disabled:bg-mutedGray text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-sm"
                  >
                    {isSubmittingOrder ? (
                      <span>Placing Order Atomically...</span>
                    ) : (
                      <>
                        <span>Confirm & Place Order</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignStudioClient;
