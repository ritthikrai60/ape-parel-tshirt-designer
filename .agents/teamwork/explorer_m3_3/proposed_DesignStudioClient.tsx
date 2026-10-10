'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  DesignElement,
  ArtworkLicenseLine,
  PriceCalculationResult,
  CreateOrderInput,
  CreateOrderResult,
  PrintSurface,
} from '@/lib/types';
import { GarmentPreview3D, ViewPreset } from './proposed_GarmentPreview3D';
import { LivePricingCard } from './proposed_LivePricingCard';
import { bakeCompositeTexture, preloadArtworkImages } from './proposed_texture_sync';

export interface GarmentProductDTO {
  id: string;
  sku: string;
  name: string;
  description: string;
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
  description: string;
  category: string;
  previewUrl: string;
  mimeType: string;
  tags: string;
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
  const [activeSurface, setActiveSurface] = useState<PrintSurface>('FRONT');
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
        // Force synchronous bake once images land
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
  }, [frontElements, backElements]);

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

  // Add artwork element to current surface (coordinates centered at 50%, 45%)
  const handleAddArtwork = useCallback(
    (art: ArtworkDTO) => {
      const standardLicense =
        art.licenseOptions.find((l) => l.price > 0) || art.licenseOptions[0];
      if (!standardLicense) return;

      const newElement: DesignElement = {
        id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        artworkId: art.id,
        licenseOptionId: standardLicense.id,
        title: art.title,
        previewUrl: art.previewUrl,
        creatorName: art.creator.displayName,
        creatorId: art.creator.id,
        surface: activeSurface,
        x: 50, // Center X percentage
        y: 45, // Center Y percentage
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: activeElements.length + 1,
        price: standardLicense.price,
      };

      setActiveElements((prev) => [...prev, newElement]);
      setSelectedElementId(newElement.id);
      setIsCatalogOpen(false);
    },
    [activeSurface, activeElements.length, setActiveElements]
  );

  // Quick Action: Load THB 410 Benchmark Preset
  const handleLoadBenchmarkPreset = useCallback(() => {
    const dashApe = initialArtworks.find((a) => a.title.includes('Dash Ape Classic'));
    const cyberPrimate = initialArtworks.find((a) => a.title.includes('Cyber Primate'));
    const staticGlitch = initialArtworks.find((a) => a.title.includes('Static Glitch'));

    if (!dashApe || !cyberPrimate || !staticGlitch) {
      alert('Benchmark artworks not found in catalog.');
      return;
    }

    const lic1 = dashApe.licenseOptions.find((l) => l.price === 40) || dashApe.licenseOptions[0];
    const lic2 = cyberPrimate.licenseOptions.find((l) => l.price === 60) || cyberPrimate.licenseOptions[0];
    const lic3 = staticGlitch.licenseOptions.find((l) => l.price === 25) || staticGlitch.licenseOptions[0];

    const benchmarkElements: DesignElement[] = [
      {
        id: 'bench-1',
        artworkId: dashApe.id,
        licenseOptionId: lic1.id,
        title: dashApe.title,
        previewUrl: dashApe.previewUrl,
        creatorName: dashApe.creator.displayName,
        creatorId: dashApe.creator.id,
        surface: 'FRONT',
        x: 50,
        y: 35,
        width: 44,
        height: 32,
        rotation: 0,
        zIndex: 1,
        price: lic1.price,
      },
      {
        id: 'bench-2',
        artworkId: cyberPrimate.id,
        licenseOptionId: lic2.id,
        title: cyberPrimate.title,
        previewUrl: cyberPrimate.previewUrl,
        creatorName: cyberPrimate.creator.displayName,
        creatorId: cyberPrimate.creator.id,
        surface: 'FRONT',
        x: 34,
        y: 65,
        width: 28,
        height: 28,
        rotation: -4,
        zIndex: 2,
        price: lic2.price,
      },
      {
        id: 'bench-3',
        artworkId: staticGlitch.id,
        licenseOptionId: lic3.id,
        title: staticGlitch.title,
        previewUrl: staticGlitch.previewUrl,
        creatorName: staticGlitch.creator.displayName,
        creatorId: staticGlitch.creator.id,
        surface: 'FRONT',
        x: 66,
        y: 65,
        width: 28,
        height: 28,
        rotation: 4,
        zIndex: 3,
        price: lic3.price,
      },
    ];

    setFrontElements(benchmarkElements);
    setBackElements([]);
    setSelectedColor('#131718');
    setSelectedSize('L');
    setQuantity(1);
    setActiveSurface('FRONT');
  }, [initialArtworks]);

  // Remove Layer
  const handleDeleteElement = useCallback(
    (id: string) => {
      setActiveElements((prev) => prev.filter((e) => e.id !== id));
      if (selectedElementId === id) setSelectedElementId(null);
    },
    [setActiveElements, selectedElementId]
  );

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
  const [orderResult, setOrderResult] = useState<CreateOrderResult | null>(null);
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
      <div className="border-b border-borderCol bg-paper-light/80 backdrop-blur px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Garment Name & Benchmark Preset Button */}
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold uppercase text-ink">
              {selectedGarment?.name || 'Heavyweight Studio Tee'}
            </span>
            <span className="font-mono text-[10px] text-mutedGray">
              {selectedGarment?.fabric || '240 GSM Combed Cotton'} • SKU: {selectedGarment?.sku}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLoadBenchmarkPreset}
            className="hidden sm:inline-flex items-center space-x-1.5 font-mono text-[10px] uppercase tracking-wider bg-warm/30 hover:bg-warm border border-warm/60 px-2.5 py-1 rounded transition-colors text-ink font-semibold"
            title="Load 1-unit Apex Tee with Dash Ape, Cyber Primate, and Static Glitch licenses"
          >
            <span>⚡ Load ฿410 Benchmark</span>
          </button>
        </div>

        {/* Center: View Switcher (2D vs Split vs 3D) */}
        <div className="flex items-center space-x-1 bg-paper border border-borderCol p-0.5 rounded">
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
          <div className="flex items-center space-x-1 bg-paper border border-borderCol p-0.5 rounded">
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[600px]">
        {/* Workspace Canvas / Viewports Area */}
        <div className="flex-1 flex flex-col relative bg-paper-light border-r border-borderCol overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-full w-full relative">
            {/* 2D Canvas Panel */}
            {(viewMode === '2D' || viewMode === 'SPLIT') && (
              <div
                className={`relative flex flex-col items-center justify-center p-6 h-full ${
                  viewMode === '2D' ? 'col-span-1 lg:col-span-2' : 'border-b lg:border-b-0 lg:border-r border-borderCol'
                }`}
              >
                {/* 2D Canvas Centered on Transparent Background */}
                <div className="relative w-full max-w-[460px] aspect-[4/5] flex items-center justify-center">
                  {/* Subtle Grid Backdrop */}
                  <div
                    className="absolute inset-0 rounded-lg opacity-40"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, #DED7CE 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  {/* Garment Silhouette with authentic color fill */}
                  <div
                    className="relative w-[340px] h-[420px] rounded-t-3xl rounded-b-md transition-colors duration-200 shadow-md flex items-center justify-center"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {/* Collar Notch */}
                    <div
                      className="absolute top-0 w-24 h-6 border-b-2 rounded-b-full"
                      style={{ borderColor: selectedColor === '#131718' ? '#2d3335' : '#DED7CE' }}
                    />

                    {/* Printable Chest Area (Clean, no intrusive bounding boxes) */}
                    <div className="relative w-[280px] h-[340px]">
                      {activeElements.map((el) => (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          className={`absolute cursor-move transition-transform ${
                            selectedElementId === el.id
                              ? 'ring-2 ring-warm ring-offset-2 ring-offset-transparent'
                              : 'hover:opacity-90'
                          }`}
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.width}%`,
                            height: `${el.height}%`,
                            transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                            zIndex: el.zIndex,
                          }}
                        >
                          <img
                            src={el.previewUrl}
                            alt={el.title}
                            className="w-full h-full object-contain pointer-events-none select-none"
                          />
                        </div>
                      ))}

                      {activeElements.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 border border-dashed border-mutedGray/40 rounded-lg pointer-events-none">
                          <p className="font-mono text-xs uppercase tracking-wider text-mutedGray">
                            Empty {activeSurface} Surface
                          </p>
                          <p className="font-mono text-[10px] text-mutedGray/80 mt-1">
                            Click "+ Add Artwork Layer" below
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2D Layer Controls Overlay */}
                <div className="mt-4 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCatalogOpen(true)}
                    className="px-3.5 py-1.5 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-bold rounded hover:bg-ink-light transition-colors shadow-sm"
                  >
                    + Add Artwork Layer
                  </button>

                  {selectedElementId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteElement(selectedElementId)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 font-mono text-xs uppercase tracking-wider rounded transition-colors"
                    >
                      Delete Layer
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3D Viewport Panel */}
            {(viewMode === '3D' || viewMode === 'SPLIT') && (
              <div
                className={`relative w-full h-full min-h-[440px] ${
                  viewMode === '3D' ? 'col-span-1 lg:col-span-2' : ''
                }`}
              >
                <GarmentPreview3D
                  textureCanvas={offscreenCanvasRef.current}
                  garmentColorHex={selectedColor}
                  textureVersion={textureVersion}
                  activePreset={viewPreset}
                  onPresetChange={setViewPreset}
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Configuration Sidebar */}
        <div className="w-full lg:w-[380px] bg-paper border-t lg:border-t-0 p-5 flex flex-col space-y-6 overflow-y-auto">
          {/* Garment Details & Color Swatches */}
          <div className="space-y-3">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              1. Authentic Garment Color
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {AUTHENTIC_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`flex items-center space-x-2.5 p-2 rounded border transition-all ${
                    selectedColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-ink ring-2 ring-warm bg-paper-dark/60 font-bold'
                      : 'border-borderCol hover:border-ink/50 bg-paper-light'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/20 shadow-inner flex-shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="font-mono text-xs text-ink truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Garment Size Selection */}
          <div className="space-y-2">
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              2. Garment Size
            </h4>
            <div className="flex space-x-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`flex-1 py-1.5 font-mono text-xs rounded border transition-colors ${
                    selectedSize === s
                      ? 'bg-ink text-paper font-bold border-ink'
                      : 'bg-paper-light text-ink border-borderCol hover:border-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Manager for Active Surface */}
          <div className="space-y-2 border-t border-borderCol/60 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                3. {activeSurface} Artwork Layers ({activeElements.length})
              </h4>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(true)}
                className="font-mono text-[11px] uppercase tracking-wider text-warm-dark hover:underline"
              >
                + Browse
              </button>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {activeElements.length > 0 ? (
                activeElements.map((el) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`flex items-center justify-between p-2 rounded border text-xs font-mono transition-colors cursor-pointer ${
                      selectedElementId === el.id
                        ? 'bg-warm/20 border-warm-dark text-ink font-semibold'
                        : 'bg-paper-light border-borderCol text-ink hover:bg-paper-dark'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <img
                        src={el.previewUrl}
                        alt={el.title}
                        className="w-6 h-6 object-contain rounded bg-white/40 border border-borderCol"
                      />
                      <span className="truncate max-w-[170px]">{el.title}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-mutedGray text-[11px]">฿{el.price}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteElement(el.id);
                        }}
                        className="text-red-500 hover:text-red-700 px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center border border-dashed border-borderCol rounded font-mono text-[11px] text-mutedGray">
                  No artworks on {activeSurface.toLowerCase()} yet.
                </div>
              )}
            </div>
          </div>

          {/* Live Pricing Card */}
          <div className="border-t border-borderCol/60 pt-4">
            <LivePricingCard
              garmentProductId={selectedGarment?.id || ''}
              garmentVariantId={currentVariant?.id}
              garmentTitle={selectedGarment?.name || 'T-Shirt'}
              quantity={quantity}
              onQuantityChange={setQuantity}
              frontLicenses={frontLicenses}
              backLicenses={backLicenses}
              onPricingCalculated={setCurrentPricing}
              onCheckoutClick={() => setIsCheckoutOpen(true)}
              isOrdering={isSubmittingOrder}
            />
          </div>
        </div>
      </div>

      {/* Artwork Catalog Drawer Modal */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-borderCol flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-ink">
                  Add Artwork to {activeSurface} Surface
                </h3>
                <p className="font-mono text-[11px] text-mutedGray">
                  Select licensed creator graphics with transparent background
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="font-mono text-xs text-mutedGray hover:text-ink px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[60vh]">
              {initialArtworks.map((art) => {
                const standardLicense =
                  art.licenseOptions.find((l) => l.price > 0) || art.licenseOptions[0];
                return (
                  <div
                    key={art.id}
                    className="p-3 border border-borderCol rounded bg-paper-light flex items-center space-x-3 hover:border-ink transition-colors cursor-pointer group"
                    onClick={() => handleAddArtwork(art)}
                  >
                    <div className="w-16 h-16 bg-white/70 border border-borderCol rounded flex-shrink-0 flex items-center justify-center p-1">
                      <img
                        src={art.previewUrl}
                        alt={art.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-mono text-xs font-bold text-ink truncate group-hover:text-warm-dark">
                        {art.title}
                      </h5>
                      <p className="font-mono text-[10px] text-mutedGray truncate">
                        By {art.creator.displayName}
                      </p>
                      <span className="inline-block mt-1 font-mono text-[11px] font-bold text-warm-dark bg-warm/20 px-1.5 py-0.5 rounded">
                        ฿{standardLicense?.price || 0} License
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Checkout & Atomic Order Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray">
                  Atomic Transaction Checkout
                </span>
                <h3 className="font-mono text-base font-bold uppercase tracking-tight text-ink">
                  Confirm Your Custom Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setOrderResult(null);
                }}
                className="font-mono text-xs text-mutedGray hover:text-ink px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            {orderResult ? (
              /* Order Confirmation Display */
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                    ✓
                  </div>
                  <h4 className="font-mono text-sm font-bold text-emerald-900 uppercase">
                    Order Atomically Placed!
                  </h4>
                  <p className="font-mono text-xs text-emerald-800">
                    Order Number:{' '}
                    <span className="font-bold">{orderResult.orderNumber}</span>
                  </p>
                </div>

                <div className="p-3 bg-paper-light border border-borderCol rounded text-xs font-mono space-y-1.5 text-ink">
                  <div className="flex justify-between">
                    <span className="text-mutedGray">Total Authorized Amount:</span>
                    <span className="font-bold">฿{orderResult.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mutedGray">Royalty Obligations Created:</span>
                    <span className="font-bold">{orderResult.obligationsCount} records</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mutedGray">Ledger Entries Posted:</span>
                    <span className="font-bold">{orderResult.ledgerEntriesCount} records</span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setOrderResult(null);
                    }}
                    className="flex-1 py-2.5 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-bold rounded hover:bg-ink-light transition-colors"
                  >
                    Back to Studio
                  </button>
                </div>
              </div>
            ) : (
              /* Shipping Address & Order Submission Form */
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-mutedGray uppercase text-[10px] mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.name}
                      onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>

                  <div>
                    <label className="block text-mutedGray uppercase text-[10px] mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.address}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, address: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-mutedGray uppercase text-[10px] mb-1">
                        City / District *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingForm.city}
                        onChange={(e) =>
                          setShippingForm({ ...shippingForm, city: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-mutedGray uppercase text-[10px] mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingForm.postal}
                        onChange={(e) =>
                          setShippingForm({ ...shippingForm, postal: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-mutedGray uppercase text-[10px] mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>
                </div>

                <div className="p-3 bg-warm/20 border border-warm/40 rounded flex justify-between items-center font-mono">
                  <span className="text-xs uppercase text-ink">Total Order Amount</span>
                  <span className="text-lg font-black text-ink">
                    ฿{currentPricing?.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="px-4 py-2.5 border border-borderCol font-mono text-xs uppercase tracking-wider text-mutedGray hover:text-ink rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex-1 py-2.5 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-bold rounded hover:bg-ink-light transition-colors flex items-center justify-center space-x-2"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                        <span>Committing Transaction...</span>
                      </>
                    ) : (
                      <span>Confirm & Place Order</span>
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
