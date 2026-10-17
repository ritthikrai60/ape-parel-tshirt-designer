'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DesignElement,
  ArtworkLicenseLine,
  PriceCalculationResult,
  CreateOrderInput,
  CreateOrderResult,
  PrintSurface,
} from '@/lib/types';
import { GarmentPreview3D, ViewPreset, GarmentPreview3DHandle } from './GarmentPreview3D';
import { useSession, signIn } from 'next-auth/react';
import { Garment2DCanvas } from './Garment2DCanvas';
import { LayerManager } from './LayerManager';
import { ArtworkCatalogDrawer } from './ArtworkCatalogDrawer';
import { LivePricingCard } from './LivePricingCard';
import { bakeCompositeTexture, preloadArtworkImages } from './textureSync';
import { StudioAuthModal } from './StudioAuthModal';
import { SupplierPolicyModal } from './SupplierPolicyModal';
import { ProductionBlueprintSheet } from '@/components/portal/ProductionBlueprintSheet';
import { StripePaymentModal } from './StripePaymentModal';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  saveStudioState,
  loadStudioState,
  savePendingStudioAction,
  loadPendingStudioAction,
  clearPendingStudioAction,
  PendingStudioAction,
} from './studioStateStorage';
import {
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bookmark,
  Ruler,
  Building2,
  AlertTriangle,
  Package,
  Sparkles,
  Info,
  Lock,
  Plus,
  CreditCard,
  QrCode,
  MapPin,
  RefreshCw,
  UserCheck,
  Crown,
  Tag,
} from 'lucide-react';

export interface SupplierSummaryDTO {
  id: string;
  slug: string;
  companyName: string;
  location: string;
  leadTimeDays: number;
  description: string | null;
  verified: boolean;
  minOrderQuantity?: number;
  printingServices?: Array<{
    id: string;
    name: string;
    code: string;
    pricePerSurface: number;
    supportedSurfaces: string;
  }>;
}

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
  supplierId?: string;
  supplier?: SupplierSummaryDTO;
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
  initialSuppliers?: SupplierSummaryDTO[];
  initialArtworkId?: string;
  currentUser?: { id: string; name?: string | null } | null;
}

// 4 Authentic Garment Colors (Preserved for backward test compatibility)
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
  initialSuppliers,
  initialArtworkId,
  currentUser,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlArtworkId = initialArtworkId || searchParams?.get('artworkId') || undefined;
  const appliedArtworkIdRef = useRef<string | null>(null);

  const { data: session, update: updateSession } = useSession();
  const { t, formatPrice } = useSettings();

  const effectiveUser = useMemo(() => {
    if (currentUser) return currentUser;
    if (session?.user) {
      return {
        id: ((session.user as any).id || (session.user as any).sub || '') as string,
        name: session.user.name || null,
      };
    }
    return null;
  }, [currentUser, session]);

  // 1. Supplier & Garment State
  // Aggregate available suppliers from initialGarments or initialSuppliers
  const availableSuppliers = useMemo(() => {
    const map = new Map<string, SupplierSummaryDTO>();
    if (initialSuppliers) {
      for (const s of initialSuppliers) map.set(s.id, s);
    }
    for (const g of initialGarments) {
      if (g.supplier && !map.has(g.supplier.id)) {
        map.set(g.supplier.id, g.supplier);
      }
    }
    if (map.size === 0) {
      map.set('default-supplier', {
        id: 'default-supplier',
        slug: 'bangkok-garment-craft',
        companyName: 'Bangkok Garment Craft Co., Ltd.',
        location: 'Phra Khanong, Bangkok, Thailand',
        leadTimeDays: 4,
        description:
          'Specialty streetwear garment manufacturer offering heavyweight blanks and precision digital printing.',
        verified: true,
      });
    }
    return Array.from(map.values());
  }, [initialGarments, initialSuppliers]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    availableSuppliers[0]?.id || initialGarments[0]?.supplier?.id || ''
  );

  const [isSupplierPolicyModalOpen, setIsSupplierPolicyModalOpen] = useState(false);

  const currentSupplier = useMemo(() => {
    return (
      availableSuppliers.find((s) => s.id === selectedSupplierId) ||
      availableSuppliers[0] ||
      null
    );
  }, [availableSuppliers, selectedSupplierId]);

  const supplierGarments = useMemo(() => {
    if (!selectedSupplierId) return initialGarments;
    const filtered = initialGarments.filter(
      (g) => g.supplierId === selectedSupplierId || g.supplier?.id === selectedSupplierId
    );
    return filtered.length > 0 ? filtered : initialGarments;
  }, [initialGarments, selectedSupplierId]);

  const [selectedGarmentId, setSelectedGarmentId] = useState<string>(
    supplierGarments[0]?.id || initialGarments[0]?.id || ''
  );

  const selectedGarment = useMemo(() => {
    return (
      supplierGarments.find((g) => g.id === selectedGarmentId) ||
      supplierGarments[0] ||
      initialGarments[0] ||
      null
    );
  }, [supplierGarments, selectedGarmentId, initialGarments]);

  // Dynamic available colors for selected garment
  const availableColors = useMemo(() => {
    if (!selectedGarment || !selectedGarment.variants || selectedGarment.variants.length === 0) {
      return AUTHENTIC_COLORS.map((c) => ({
        hex: c.hex,
        name: c.name,
        textCol: c.textCol,
        inStock: true,
        totalStock: 100,
      }));
    }

    const colorMap = new Map<
      string,
      { hex: string; name: string; textCol: string; totalStock: number }
    >();

    for (const v of selectedGarment.variants) {
      const key = v.colorHex.toLowerCase();
      const existing = colorMap.get(key);
      if (existing) {
        existing.totalStock += v.stock;
      } else {
        const isLight = ['#ffffff', '#f5f0e8', '#faf7f2', '#e8d2b8'].includes(key);
        colorMap.set(key, {
          hex: v.colorHex,
          name: v.colorName,
          textCol: isLight ? '#131718' : '#FFFFFF',
          totalStock: v.stock,
        });
      }
    }

    return Array.from(colorMap.values()).map((c) => ({
      ...c,
      inStock: c.totalStock > 0,
    }));
  }, [selectedGarment]);

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return availableColors[0]?.hex || '#131718';
  });

  // Dynamic available sizes for selected color
  const availableSizes = useMemo(() => {
    if (!selectedGarment || !selectedGarment.variants || selectedGarment.variants.length === 0) {
      return SIZES.map((s) => ({
        size: s,
        stock: 100,
        priceAdjustment: 0,
        variantId: 'fallback',
        inStock: true,
      }));
    }

    return selectedGarment.variants
      .filter((v) => v.colorHex.toLowerCase() === selectedColor.toLowerCase())
      .map((v) => ({
        size: v.size,
        stock: v.stock,
        priceAdjustment: v.priceAdjustment,
        variantId: v.id,
        sku: v.sku,
        inStock: v.stock > 0,
      }));
  }, [selectedGarment, selectedColor]);

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    const firstInstock = availableSizes.find((s) => s.inStock);
    return firstInstock?.size || availableSizes[0]?.size || 'L';
  });

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

  // Inventory indicators
  const availableStock = currentVariant ? currentVariant.stock : 0;
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock < 10;

  // Auto-align color and size when supplier/garment changes
  useEffect(() => {
    if (availableColors.length > 0) {
      const colorMatch = availableColors.find(
        (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
      );
      if (!colorMatch) {
        const nextColor = availableColors.find((c) => c.inStock) || availableColors[0];
        if (nextColor) setSelectedColor(nextColor.hex);
      }
    }
  }, [availableColors, selectedColor]);

  useEffect(() => {
    if (availableSizes.length > 0) {
      const sizeMatch = availableSizes.find(
        (s) => s.size.toUpperCase() === selectedSize.toUpperCase()
      );
      if (!sizeMatch) {
        const nextSize = availableSizes.find((s) => s.inStock) || availableSizes[0];
        if (nextSize) setSelectedSize(nextSize.size);
      }
    }
  }, [availableSizes, selectedSize]);

  // Ensure quantity does not exceed available stock
  useEffect(() => {
    if (availableStock > 0 && quantity > availableStock) {
      setQuantity(availableStock);
    }
  }, [availableStock, quantity]);

  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const garmentsForSup = initialGarments.filter(
      (g) => g.supplierId === supplierId || g.supplier?.id === supplierId
    );
    const nextGarment = garmentsForSup[0] || initialGarments[0];
    if (nextGarment) {
      setSelectedGarmentId(nextGarment.id);
      if (nextGarment.variants && nextGarment.variants.length > 0) {
        const inStockVariant =
          nextGarment.variants.find((v) => v.stock > 0) || nextGarment.variants[0];
        setSelectedColor(inStockVariant.colorHex);
        setSelectedSize(inStockVariant.size);
      }
    }
  };

  // 2. View and Studio Layout State
  const [viewMode, setViewMode] = useState<'SPLIT' | '2D' | '3D'>('SPLIT');
  const [activeSurface, setActiveSurface] = useState<'FRONT' | 'BACK'>('FRONT');
  const [viewPreset, setViewPreset] = useState<ViewPreset>('FRONT');

  // Mobile / compact tablet viewport adaptation: gracefully fallback SPLIT to 2D
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768 && viewMode === 'SPLIT') {
        setViewMode('2D');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

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

  // 5. 3D Preview Reference & Blueprint State
  const preview3DRef = useRef<GarmentPreview3DHandle | null>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [isPrintGuideLockModalOpen, setIsPrintGuideLockModalOpen] = useState<boolean>(false);
  const [frontSnapshotUrl, setFrontSnapshotUrl] = useState<string | null>(null);
  const [backSnapshotUrl, setBackSnapshotUrl] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role;
  const isAuthorizedSupplierOrAdmin = userRole === 'SUPPLIER' || userRole === 'ADMIN';

  const handleExportPrintGuide = useCallback(async () => {
    setIsCatalogOpen(false);
    setIsSupplierPolicyModalOpen(false);
    setIsAuthModalOpen(false);
    setIsCheckoutOpen(false);
    // Manufacturing Tech Sheet restriction: Only accessible by Suppliers/Admins or paid orders
    if (!isAuthorizedSupplierOrAdmin) {
      setIsPrintGuideLockModalOpen(true);
      return;
    }

    try {
      let frontSnap = '';
      let backSnap = '';
      if (preview3DRef.current?.captureOrthographicSnapshot) {
        frontSnap = await preview3DRef.current.captureOrthographicSnapshot('FRONT', 2048, 2048, false);
        backSnap = await preview3DRef.current.captureOrthographicSnapshot('BACK', 2048, 2048, false);
      }
      setFrontSnapshotUrl(frontSnap || null);
      setBackSnapshotUrl(backSnap || null);
      setIsBlueprintOpen(true);
    } catch (err) {
      console.warn('[DesignStudioClient] Failed to capture 3D snapshot:', err);
      setIsBlueprintOpen(true);
    }
  }, [isAuthorizedSupplierOrAdmin]);

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

  // 5. Artwork Catalog Drawer & Vault Permanent IP State
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [ownedPermanentArtworkIds, setOwnedPermanentArtworkIds] = useState<Set<string>>(new Set());

  // Fetch user's permanent IP vault when authenticated
  const fetchUserVault = useCallback(async () => {
    if (!effectiveUser?.id) return;
    try {
      const res = await fetch('/api/user/vault');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.data?.permanentIps) {
          const ids = new Set<string>(data.data.permanentIps.map((p: any) => p.artworkId));
          setOwnedPermanentArtworkIds(ids);
        }
      }
    } catch (err) {
      console.warn('[DesignStudioClient] Could not fetch vault:', err);
    }
  }, [effectiveUser?.id]);

  useEffect(() => {
    fetchUserVault();
  }, [fetchUserVault]);

  // Safely open Artwork Catalog Drawer, closing all other overlapping modals
  const handleOpenCatalog = useCallback(() => {
    setIsCheckoutOpen(false);
    setIsAuthModalOpen(false);
    setIsBlueprintOpen(false);
    setIsPrintGuideLockModalOpen(false);
    setIsSupplierPolicyModalOpen(false);
    setIsCatalogOpen(true);
  }, []);

  // Safely open Supplier Policy Modal, closing all other overlapping modals
  const handleOpenSupplierPolicy = useCallback(() => {
    setIsCatalogOpen(false);
    setIsCheckoutOpen(false);
    setIsAuthModalOpen(false);
    setIsBlueprintOpen(false);
    setIsPrintGuideLockModalOpen(false);
    setIsSupplierPolicyModalOpen(true);
  }, []);

  // Convert initialArtworks to SeededArtwork format with license options
  const catalogList = useMemo(() => {
    return initialArtworks.map((a) => {
      const isOwned = ownedPermanentArtworkIds.has(a.id);
      const stdLic = a.licenseOptions.find((l) => l.price > 0) || a.licenseOptions[0];
      return {
        artworkId: a.id,
        licenseOptionId: stdLic ? stdLic.id : 'lic_std',
        title: a.title,
        category: a.category,
        previewUrl: a.previewUrl,
        creatorName: a.creator.displayName,
        creatorId: a.creator.id,
        price: isOwned ? 0 : stdLic ? stdLic.price : 40,
        licenseOptions: a.licenseOptions,
      };
    });
  }, [initialArtworks, ownedPermanentArtworkIds]);

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
      dashApe?.previewUrl?.replace(/&backgroundColor=[^&]+/g, '') ||
      'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha';
    const cyberPrimateUrl =
      cyberPrimate?.previewUrl?.replace(/&backgroundColor=[^&]+/g, '') ||
      'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088';
    const staticGlitchUrl =
      staticGlitch?.previewUrl?.replace(/&backgroundColor=[^&]+/g, '') ||
      'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern';

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
  const [paymentProvider, setPaymentProvider] = useState<'STRIPE' | 'DEV_MOCK'>('STRIPE');
  const [stripeModalData, setStripeModalData] = useState<{
    isOpen: boolean;
    clientSecret: string | null;
    orderId: string | null;
    orderNumber: string | null;
    totalAmount: number;
  }>({
    isOpen: false,
    clientSecret: null,
    orderId: null,
    orderNumber: null,
    totalAmount: 0,
  });
  const [shippingForm, setShippingForm] = useState({
    name: '',
    address: '',
    city: '',
    postal: '',
    phone: '',
  });
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [profileAutoFilled, setProfileAutoFilled] = useState(false);

  // Auto-fetch real customer profile and default shipping address when checkout modal opens
  const fetchCustomerProfile = useCallback(async () => {
    try {
      setIsFetchingProfile(true);
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        const p = data.profile;
        if (p) {
          const filledName = p.shippingName || p.name || '';
          const filledPhone = p.shippingPhone || p.phone || '';
          const filledAddress = p.shippingAddress || '';
          const filledCity = p.shippingCity || '';
          const filledPostal = p.shippingPostal || '';

          setShippingForm((prev) => ({
            name: prev.name || filledName,
            phone: prev.phone || filledPhone,
            address: prev.address || filledAddress,
            city: prev.city || filledCity,
            postal: prev.postal || filledPostal,
          }));

          if (filledName || filledAddress) {
            setProfileAutoFilled(true);
          }
        }
      }
    } catch (err) {
      console.warn('[DesignStudioClient] Could not fetch customer profile:', err);
    } finally {
      setIsFetchingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (isCheckoutOpen) {
      fetchCustomerProfile();
    }
  }, [isCheckoutOpen, fetchCustomerProfile]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarment || !currentPricing) return;

    setIsSubmittingOrder(true);
    try {
      let previewFrontUrl: string | undefined;
      let previewBackUrl: string | undefined;
      if (preview3DRef.current?.captureOrthographicSnapshot) {
        try {
          previewFrontUrl = (await preview3DRef.current.captureOrthographicSnapshot('FRONT', 2048, 2048, false)) || undefined;
          previewBackUrl = (await preview3DRef.current.captureOrthographicSnapshot('BACK', 2048, 2048, false)) || undefined;
        } catch (snapErr) {
          console.warn('[DesignStudioClient] Failed to capture 3D snapshot on checkout:', snapErr);
        }
      }

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
        previewFrontUrl,
        previewBackUrl,
        shippingName: shippingForm.name,
        shippingAddress: shippingForm.address,
        shippingCity: shippingForm.city,
        shippingPostal: shippingForm.postal,
        shippingPhone: shippingForm.phone,
        clientClaimedTotal: currentPricing.totalAmount, // Protected by anti-tamper check
      };

      // Optionally sync shipping address to customer profile in background
      if (saveAddressToProfile && (shippingForm.name || shippingForm.address)) {
        fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shippingName: shippingForm.name,
            shippingPhone: shippingForm.phone,
            shippingAddress: shippingForm.address,
            shippingCity: shippingForm.city,
            shippingPostal: shippingForm.postal,
          }),
        }).catch((e) => console.warn('[DesignStudioClient] Failed to sync address to profile:', e));
      }

      // Real Stripe Checkout with Escrow and Radar
      if (paymentProvider === 'STRIPE') {
        const stripeRes = await fetch('/api/checkout/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });

        if (!stripeRes.ok) {
          const errJson = await stripeRes.json().catch(() => ({}));
          throw new Error(errJson.message || `Stripe checkout initiation failed (${stripeRes.status})`);
        }

        const stripeData = await stripeRes.json();
        setIsCheckoutOpen(false);
        setStripeModalData({
          isOpen: true,
          clientSecret: stripeData.clientSecret,
          orderId: stripeData.orderId,
          orderNumber: stripeData.orderNumber,
          totalAmount: stripeData.totalAmount,
        });
        return;
      }

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

  // 8. Auth Interception & State Persistence
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<PendingStudioAction>(null);
  const [isSavingDesign, setIsSavingDesign] = useState<boolean>(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const [isRestored, setIsRestored] = useState<boolean>(false);

  // Restore design state and pending action from localStorage on mount
  useEffect(() => {
    const saved = loadStudioState();
    if (saved) {
      // If arriving with a specific artwork from marketplace, don't overwrite front canvas with old draft
      if (!urlArtworkId) {
        if (saved.frontElements && saved.frontElements.length > 0 && frontElements.length === 0) {
          setFrontElements(saved.frontElements);
        }
        if (saved.backElements && saved.backElements.length > 0 && backElements.length === 0) {
          setBackElements(saved.backElements);
        }
      }
      if (saved.selectedColor) {
        setSelectedColor(saved.selectedColor);
      }
      if (saved.selectedSize) {
        setSelectedSize(saved.selectedSize);
      }
      if (saved.quantity && saved.quantity > 0) {
        setQuantity(saved.quantity);
      }
      if (saved.activeSurface && !urlArtworkId) {
        setActiveSurface(saved.activeSurface);
        setViewPreset(saved.activeSurface);
      }
    }

    const pending = loadPendingStudioAction();
    if (pending) {
      setPendingAction(pending);
    }
    setIsRestored(true);
  }, [urlArtworkId]);

  // Apply artwork from Marketplace (e.g. /studio/new?artworkId=...) directly to the shirt
  useEffect(() => {
    if (!urlArtworkId || appliedArtworkIdRef.current === urlArtworkId) return;

    const targetArt = initialArtworks.find((a) => a.id === urlArtworkId);
    if (!targetArt) return;

    appliedArtworkIdRef.current = urlArtworkId;

    const stdLic =
      targetArt.licenseOptions.find((l) => l.price > 0) || targetArt.licenseOptions[0];

    const newElement: DesignElement = {
      id: `layer-market-${Date.now()}`,
      artworkId: targetArt.id,
      licenseOptionId: stdLic ? stdLic.id : 'lic_std',
      title: targetArt.title,
      previewUrl: targetArt.previewUrl,
      creatorName: targetArt.creator.displayName,
      creatorId: targetArt.creator.id,
      surface: 'FRONT',
      x: 50,
      y: 42,
      width: 48,
      height: 48,
      rotation: 0,
      zIndex: 1,
      price: stdLic ? stdLic.price : 40,
    };

    // Place the selected artwork centered on the FRONT surface as the primary layer
    setFrontElements([newElement]);
    setSelectedElementId(newElement.id);
    setActiveSurface('FRONT');
    setViewPreset('FRONT');

    // Clean query param from browser address bar without reloading
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [urlArtworkId, initialArtworks]);

  // Auto-persist active design state to localStorage whenever it changes
  useEffect(() => {
    // Skip initial mount render and pre-restoration commits to prevent clobbering localStorage
    if (!isRestored || !isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    saveStudioState({
      garmentProductId: selectedGarment?.id,
      garmentVariantId: currentVariant?.id,
      selectedColor,
      selectedSize,
      quantity,
      activeSurface,
      frontElements,
      backElements,
      pendingAction,
    });
  }, [
    isRestored,
    selectedGarment,
    currentVariant,
    selectedColor,
    selectedSize,
    quantity,
    activeSurface,
    frontElements,
    backElements,
    pendingAction,
  ]);

  // Execute design save to backend API
  const executeSaveDesign = useCallback(async () => {
    if (!selectedGarment || isSavingDesign) return;
    setIsSavingDesign(true);
    try {
      const payload = {
        title: 'Custom Creator Tee',
        garmentProductId: selectedGarment.id,
        garmentVariantId: currentVariant?.id,
        garmentColorHex: selectedColor,
        garmentSize: selectedSize,
        garmentFit: selectedGarment.fit,
        frontElements,
        backElements,
      };

      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to save design');
      }

      setSaveNotification('Design saved to your creator vault!');
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: unknown) {
      console.error('[DesignStudioClient] Save error:', err);
      setSaveNotification(err instanceof Error ? err.message : 'Error saving design');
      setTimeout(() => setSaveNotification(null), 4000);
    } finally {
      setIsSavingDesign(false);
    }
  }, [selectedGarment, currentVariant, selectedColor, selectedSize, frontElements, backElements]);

  // Intercept "Save Design" action
  const handleTriggerSave = useCallback(async () => {
    setIsCatalogOpen(false);
    setIsSupplierPolicyModalOpen(false);
    setIsBlueprintOpen(false);
    setIsPrintGuideLockModalOpen(false);
    if (!session) {
      setPendingAction('SAVE');
      savePendingStudioAction('SAVE');
      saveStudioState({
        garmentProductId: selectedGarment?.id,
        garmentVariantId: currentVariant?.id,
        selectedColor,
        selectedSize,
        quantity,
        activeSurface,
        frontElements,
        backElements,
        pendingAction: 'SAVE',
      });
      setIsAuthModalOpen(true);
      return;
    }
    await executeSaveDesign();
  }, [
    session,
    selectedGarment,
    currentVariant,
    selectedColor,
    selectedSize,
    quantity,
    activeSurface,
    frontElements,
    backElements,
    executeSaveDesign,
  ]);

  // Intercept "Order Now" action
  const handleTriggerOrder = useCallback(() => {
    setIsCatalogOpen(false);
    setIsSupplierPolicyModalOpen(false);
    setIsBlueprintOpen(false);
    setIsPrintGuideLockModalOpen(false);
    if (isOutOfStock) {
      alert(
        'The selected garment variant is currently out of stock. Please select an available color or size.'
      );
      return;
    }
    if (availableStock > 0 && quantity > availableStock) {
      alert(
        `Requested quantity (${quantity}) exceeds available stock (${availableStock}). Please reduce quantity.`
      );
      return;
    }
    if (!session) {
      setPendingAction('ORDER');
      savePendingStudioAction('ORDER');
      saveStudioState({
        garmentProductId: selectedGarment?.id,
        garmentVariantId: currentVariant?.id,
        selectedColor,
        selectedSize,
        quantity,
        activeSurface,
        frontElements,
        backElements,
        pendingAction: 'ORDER',
      });
      setIsAuthModalOpen(true);
      return;
    }
    setIsCheckoutOpen(true);
  }, [
    session,
    selectedGarment,
    currentVariant,
    selectedColor,
    selectedSize,
    quantity,
    availableStock,
    isOutOfStock,
    activeSurface,
    frontElements,
    backElements,
  ]);

  // Resume pending action once user authenticates
  useEffect(() => {
    if (session && pendingAction && isMountedRef.current) {
      const actionToResume = pendingAction;
      setPendingAction(null);
      clearPendingStudioAction();
      saveStudioState({ pendingAction: null });
      if (actionToResume === 'SAVE') {
        executeSaveDesign();
      } else if (actionToResume === 'ORDER') {
        setIsCheckoutOpen(true);
      }
    }
  }, [session, pendingAction, executeSaveDesign]);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
    clearPendingStudioAction();
    saveStudioState({ pendingAction: null });
  }, []);

  const handleDevLoginSuccess = useCallback(async () => {
    setIsAuthModalOpen(false);
    if (updateSession) {
      try {
        await updateSession();
      } catch {
        // Fallback
      }
    }
  }, [updateSession]);

  return (
    <div className="flex-1 flex flex-col w-full h-full max-h-full overflow-hidden bg-paper">
      {/* Studio Toolbar Header */}
      <div className="shrink-0 border-b border-borderCol bg-paper-light/90 backdrop-blur px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Left: Garment Name & Benchmark Preset Button */}
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold uppercase text-ink">
              {selectedGarment?.name || 'Custom Garment Model'}
            </span>
            <span className="font-mono text-[10px] text-mutedGray">
              {selectedGarment?.fabric || (selectedGarment?.weightGsm ? `${selectedGarment.weightGsm} GSM` : 'Standard Fabric')} &bull; SKU: {selectedGarment?.sku || 'N/A'}
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
            {t.studio.view2d}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('SPLIT')}
            className={`hidden md:inline-flex px-3 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
              viewMode === 'SPLIT' ? 'bg-ink text-paper font-bold' : 'text-ink hover:bg-paper-dark'
            }`}
          >
            {t.studio.viewSplit}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3D')}
            className={`px-3 py-1 font-mono text-xs uppercase tracking-wider rounded transition-colors ${
              viewMode === '3D' ? 'bg-ink text-paper font-bold' : 'text-ink hover:bg-paper-dark'
            }`}
          >
            {t.studio.view3d}
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

          {/* Export Print Guide & Ruler Button */}
          <button
            type="button"
            data-testid="export-print-guide-btn"
            onClick={handleExportPrintGuide}
            className={`inline-flex items-center space-x-1.5 font-mono text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-colors shadow-2xs ${
              isAuthorizedSupplierOrAdmin
                ? 'border-borderCol bg-paper hover:bg-paper-dark text-ink'
                : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900'
            }`}
            title={
              isAuthorizedSupplierOrAdmin
                ? 'Export Print Placement Guide & Centimeter Ruler Tech Sheet'
                : 'Print Guide & Ruler Tech Sheet (Requires Paid Order / Supplier Only)'
            }
          >
            {isAuthorizedSupplierOrAdmin ? (
              <Ruler className="w-3.5 h-3.5 text-warm-dark" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden sm:inline">Export Print Guide & Ruler</span>
            <span className="sm:hidden">Print Guide</span>
            {!isAuthorizedSupplierOrAdmin && (
              <span className="text-[9px] uppercase px-1 rounded bg-amber-500/20 font-mono">
                Paid
              </span>
            )}
          </button>

          {/* Save Design Button */}
          <button
            type="button"
            onClick={handleTriggerSave}
            disabled={isSavingDesign}
            className="inline-flex items-center space-x-1.5 font-mono text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border border-borderCol bg-paper hover:bg-paper-dark text-ink transition-colors shadow-2xs disabled:opacity-50"
            title="Save design to creator vault"
          >
            <Bookmark className="w-3.5 h-3.5 text-warm-dark" />
            <span>{isSavingDesign ? 'Saving...' : 'Save Design'}</span>
          </button>

          {/* Order Now Button */}
          <button
            type="button"
            onClick={handleTriggerOrder}
            className="hidden sm:inline-flex items-center space-x-1.5 font-mono text-xs uppercase tracking-wider font-bold px-3.5 py-1.5 rounded-lg bg-ink hover:bg-ink-light text-paper transition-colors shadow-2xs"
            title="Proceed to order checkout"
          >
            <span>{t.studio.orderNow}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body: Canvas / 3D & Configuration Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 h-full">
        {/* Workspace Canvas / Viewports Area */}
        <div className="flex-1 flex flex-col relative bg-paper-light border-r border-borderCol overflow-hidden min-h-0">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 h-full w-full relative min-h-0">
            {/* 2D Canvas Panel */}
            {(viewMode === '2D' || viewMode === 'SPLIT') && (
              <div
                className={`relative flex flex-col p-2 sm:p-3 h-full min-h-0 overflow-hidden ${
                  viewMode === '2D'
                    ? 'col-span-1 lg:col-span-2'
                    : 'border-b lg:border-b-0 lg:border-r border-borderCol'
                }`}
              >
                <div className="w-full flex justify-between items-center mb-1.5 px-2 shrink-0">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                    2D Canvas &bull; {activeSurface} Surface
                  </span>
                  <span className="font-mono text-[10px] text-mutedGray">
                    Full-bleed design area
                  </span>
                </div>

                <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden">
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
              </div>
            )}

            {/* 3D Viewport Panel */}
            <div
              className={`relative flex flex-col p-2 sm:p-3 h-full min-h-0 overflow-hidden ${
                viewMode === '3D'
                  ? 'col-span-1 lg:col-span-2'
                  : viewMode === 'SPLIT'
                  ? ''
                  : 'hidden'
              }`}
            >
              <div className="w-full flex justify-between items-center mb-1.5 px-2 shrink-0">
                <span className="font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                  3D Three.js Viewport &bull; Live Texture Sync
                </span>
                <span className="font-mono text-[10px] text-mutedGray">
                  3-Point Lighting
                </span>
              </div>

              <div className="flex-1 w-full h-full min-h-0 relative rounded-xl border border-borderCol/60 bg-paper/50 overflow-hidden shadow-inner">
                <GarmentPreview3D
                  ref={preview3DRef}
                  textureCanvas={offscreenCanvasRef.current}
                  garmentColorHex={selectedColor}
                  textureVersion={textureVersion}
                  activePreset={viewPreset}
                  onPresetChange={(preset) => {
                    setViewPreset(preset);
                    if (preset === 'FRONT' || preset === 'BACK') {
                      setActiveSurface(preset);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls & Configuration Sidebar */}
        <div className="w-full lg:w-96 bg-paper flex flex-col min-h-0 h-full border-t lg:border-t-0 border-borderCol shadow-sm overflow-hidden">
          {/* Scrollable Configuration Section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. Production Supplier & Workshop Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-warm-dark" />
                <span>Production Supplier</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                Verified
              </span>
            </div>

            {/* Supplier Selector Dropdown */}
            <select
              data-testid="supplier-selector"
              aria-label="Select production supplier"
              value={selectedSupplierId}
              onChange={(e) => handleSelectSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-paper-light border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none transition-colors"
            >
              {availableSuppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.companyName} ({sup.location.split(',')[0]} &bull; {sup.leadTimeDays}d lead time)
                </option>
              ))}
            </select>

            {/* Garment Model Selector (if supplier offers multiple products) */}
            {supplierGarments.length > 1 && (
              <div className="pt-1">
                <label className="block text-[10px] font-mono uppercase text-mutedGray mb-1">
                  Blank Garment Model
                </label>
                <select
                  data-testid="garment-model-selector"
                  aria-label="Select garment model"
                  value={selectedGarmentId}
                  onChange={(e) => setSelectedGarmentId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-paper-light border border-borderCol rounded-lg text-xs font-mono text-ink focus:border-warm focus:outline-none"
                >
                  {supplierGarments.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} &bull; ฿{g.basePrice}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Supplier Spec Details Badge */}
            {selectedGarment && (
              <div className="p-2.5 rounded-lg bg-paper-light border border-borderCol/80 text-[11px] font-mono text-ink/80 space-y-1">
                <div className="flex justify-between">
                  <span className="text-mutedGray">Model SKU:</span>
                  <span className="font-bold text-ink">{selectedGarment.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mutedGray">Fabric & Weight:</span>
                  <span>{selectedGarment.weightGsm} GSM ({selectedGarment.fabric})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mutedGray">Cut & Fit:</span>
                  <span className="capitalize">{selectedGarment.fit} cut</span>
                </div>
              </div>
            )}

            {/* Contextual Supplier Policy & Specs Trigger */}
            <button
              type="button"
              data-testid="supplier-policy-trigger"
              onClick={handleOpenSupplierPolicy}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-borderCol hover:border-ink/50 bg-paper hover:bg-paper-light text-ink text-xs font-mono transition-colors shadow-2xs"
            >
              <Info className="w-3.5 h-3.5 text-warm-dark shrink-0" />
              <span>{t.studio.supplierPolicyBtn}</span>
            </button>
          </div>

          {/* 2. Authentic Garment Color Selection (Dynamic from Supplier Variants) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink">Garment Color</span>
              <span className="font-mono text-xs text-mutedGray">
                {availableColors.find((c) => c.hex.toLowerCase() === selectedColor.toLowerCase())?.name || selectedColor}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {availableColors.map((c) => {
                const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                const isColorDisabled = !c.inStock;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    disabled={isColorDisabled}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all relative ${
                      isColorDisabled
                        ? 'opacity-30 cursor-not-allowed border-dashed border-mutedGray'
                        : isSelected
                        ? 'ring-2 ring-warm ring-offset-2 border-warm shadow-md scale-105'
                        : 'border-borderCol hover:scale-102 opacity-90'
                    }`}
                    title={`${c.name} (${c.hex})${isColorDisabled ? ' - Out of Stock' : ` - ${c.totalStock} in stock`}`}
                  >
                    {isSelected && !isColorDisabled && (
                      <Check
                        className="w-4 h-4 drop-shadow"
                        style={{ color: c.textCol }}
                      />
                    )}
                    {isColorDisabled && (
                      <span className="text-[9px] font-mono font-bold text-red-500 uppercase bg-paper/90 px-1 rounded">
                        Out
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Garment Size Selection & Stock Tracking */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-ink">Garment Size</span>
              <span className="font-mono text-xs text-mutedGray capitalize">
                {selectedGarment?.fit || 'Oversized'} Fit
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {availableSizes.map((s) => {
                const isSelected = selectedSize.toUpperCase() === s.size.toUpperCase();
                const isSizeOutOfStock = !s.inStock;
                return (
                  <button
                    key={s.size}
                    type="button"
                    disabled={isSizeOutOfStock}
                    onClick={() => setSelectedSize(s.size)}
                    className={`py-2 px-1 font-mono text-xs uppercase font-bold rounded-lg border transition-all flex flex-col items-center justify-center relative ${
                      isSizeOutOfStock
                        ? 'bg-paper-dark/40 text-mutedGray/50 border-dashed border-borderCol line-through cursor-not-allowed'
                        : isSelected
                        ? 'bg-ink text-paper border-ink shadow-xs'
                        : 'bg-paper-light text-ink border-borderCol hover:border-warm'
                    }`}
                    title={isSizeOutOfStock ? `${s.size} - Out of stock` : `${s.size} (${s.stock} in stock)`}
                  >
                    <span>{s.size}</span>
                    {s.inStock && s.stock < 10 && (
                      <span className="text-[8px] font-mono text-amber-600 block leading-none mt-0.5">
                        {s.stock} left
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inventory Status & Warnings */}
            {isOutOfStock ? (
              <div
                data-testid="out-of-stock-alert"
                className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-start space-x-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Out of Stock:</span> Size {selectedSize} in {availableColors.find(c => c.hex.toLowerCase() === selectedColor.toLowerCase())?.name || 'this color'} is currently unavailable. Please select another variant or supplier.
                </div>
              </div>
            ) : isLowStock ? (
              <div
                data-testid="low-stock-alert"
                className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Limited Stock: Only <strong>{availableStock}</strong> units remaining in workshop.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] font-mono text-mutedGray px-1">
                <span>In-Stock Ready for DTG:</span>
                <span className="font-bold text-emerald-700">{availableStock} units available</span>
              </div>
            )}
          </div>

          {/* Layer Manager */}
          <LayerManager
            surface={activeSurface}
            elements={activeElements}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onOpenCatalog={handleOpenCatalog}
            onClearSurface={handleClearSurface}
            artworks={initialArtworks}
            ownedPermanentArtworkIds={ownedPermanentArtworkIds}
          />

          </div>

          {/* Permanently Pinned Bottom Pricing & Checkout Card */}
          <div className="shrink-0 border-t border-borderCol bg-paper p-3 shadow-md">
            <LivePricingCard
              garmentProductId={selectedGarment?.id || 'APX-HVY-001'}
              garmentVariantId={currentVariant?.id}
              garmentTitle={selectedGarment?.name || 'Apex Heavyweight Tee'}
              quantity={quantity}
              userId={effectiveUser?.id}
              onQuantityChange={setQuantity}
              frontLicenses={frontLicenses}
              backLicenses={backLicenses}
              onPricingCalculated={setCurrentPricing}
              onCheckoutClick={handleTriggerOrder}
              onLoadBenchmark={handleLoadBenchmarkPreset}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action & Checkout Bar */}
      <div className="lg:hidden sticky bottom-0 left-0 right-0 z-40 bg-paper-light/95 backdrop-blur-md border-t border-borderCol px-4 py-2.5 shadow-lg flex items-center justify-between gap-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {/* Real-time Net Price & Layer summary */}
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase text-mutedGray">
            Total ({frontElements.length + backElements.length} {t.studio.layers})
          </span>
          <span className="font-mono text-sm font-bold text-ink">
            {formatPrice(currentPricing?.totalAmount ?? 410)}
          </span>
        </div>

        {/* Action Buttons: Add Artwork & Order Now */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleOpenCatalog}
            className="px-3 py-2 text-xs font-mono uppercase tracking-wider border border-borderCol bg-paper hover:bg-paper-dark rounded-lg flex items-center space-x-1 font-bold text-ink transition-colors shadow-2xs"
            title="Add artwork graphic"
          >
            <Plus className="w-3.5 h-3.5 text-warm-dark" />
            <span>{t.studio.addArtwork || '+ Art'}</span>
          </button>
          <button
            type="button"
            onClick={handleTriggerOrder}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-ink hover:bg-ink-light text-paper font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors"
            title="Proceed to checkout"
          >
            <span>{t.studio.orderNow}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Artwork Catalog Drawer */}
      <ArtworkCatalogDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        surface={activeSurface}
        onAddArtwork={handleAddArtwork}
        customArtworks={catalogList}
        currentUser={effectiveUser}
      />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[70] bg-ink/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-light border border-borderCol w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col space-y-5 max-h-[90vh] overflow-y-auto">
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
            ) : !session ? (
                <div className="space-y-4 text-center py-6">
                  <div className="flex items-center justify-between border-b border-borderCol pb-3 mb-6">
                    <h3 className="font-mono text-sm uppercase font-bold text-ink mx-auto">
                      Save Design & Checkout
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="absolute right-6 top-6 p-1 text-mutedGray hover:text-ink rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h4 className="text-lg font-sans font-bold text-ink">Sign in to continue</h4>
                  <p className="text-sm font-mono text-mutedGray mb-6">
                    Create an account or log in to save your custom design and place your order.
                  </p>
                  <button
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      handleTriggerOrder();
                    }}
                    className="w-full py-3 bg-ink hover:bg-ink-light text-paper font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Authenticate to Complete Order
                  </button>
                </div>
              ) : (
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

                {/* Artwork Licensing Breakdown & Scope Selection */}
                {(() => {
                  const allArtElements = [
                    ...frontElements.map((e) => ({ ...e, surfaceName: 'FRONT' as const })),
                    ...backElements.map((e) => ({ ...e, surfaceName: 'BACK' as const })),
                  ];

                  if (allArtElements.length === 0) return null;

                  return (
                    <div className="space-y-2 bg-paper p-3 rounded-xl border border-borderCol">
                      <div className="flex items-center justify-between border-b border-borderCol/70 pb-2">
                        <div className="flex items-center space-x-1.5 font-mono text-[11px] uppercase font-bold text-ink">
                          <Crown className="w-3.5 h-3.5 text-warm-dark" />
                          <span>สิทธิ์การใช้งานลายลิขสิทธิ์ (Artwork Licensing Scope)</span>
                        </div>
                        <span className="text-[10px] font-mono text-mutedGray">
                          {allArtElements.length} ชิ้นงาน
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {allArtElements.map((el) => {
                          const isOwned = ownedPermanentArtworkIds.has(el.artworkId);
                          const art = initialArtworks.find((a) => a.id === el.artworkId);
                          const licenseOptions = art?.licenseOptions || [];

                          const handleSwitchLicense = (optionId: string, price: number) => {
                            if (el.surface === 'FRONT') {
                              setFrontElements((prev) =>
                                prev.map((e) =>
                                  e.id === el.id ? { ...e, licenseOptionId: optionId, price } : e
                                )
                              );
                            } else {
                              setBackElements((prev) =>
                                prev.map((e) =>
                                  e.id === el.id ? { ...e, licenseOptionId: optionId, price } : e
                                )
                              );
                            }
                          };

                          return (
                            <div
                              key={el.id}
                              className="p-2.5 rounded-lg border border-borderCol bg-paper-light space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <img
                                    src={el.previewUrl}
                                    alt={el.title}
                                    className="w-7 h-7 rounded border border-borderCol object-contain bg-paper p-0.5"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-mono font-bold text-ink truncate">
                                      {el.title}
                                    </p>
                                    <p className="text-[10px] font-mono text-mutedGray truncate">
                                      {el.surfaceName} surface &bull; by {el.creatorName}
                                    </p>
                                  </div>
                                </div>

                                {isOwned && (
                                  <span className="text-[10px] font-mono text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                                    <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    <span>Permanent IP (฿0 ฟรี)</span>
                                  </span>
                                )}
                              </div>

                              {!isOwned && licenseOptions.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                  {licenseOptions.map((opt) => {
                                    const isSelected = el.licenseOptionId === opt.id;
                                    const isUnlimited = opt.scope === 'UNLIMITED';

                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleSwitchLicense(opt.id, opt.price)}
                                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                          isSelected
                                            ? 'bg-paper border-ink ring-1 ring-ink shadow-2xs font-bold'
                                            : 'bg-paper-light border-borderCol hover:border-warm/60 opacity-80'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full mb-0.5">
                                          <span className="text-[10px] font-mono text-ink flex items-center gap-1">
                                            {isUnlimited ? (
                                              <>
                                                <Crown className="w-3 h-3 text-amber-600" />
                                                <span>ตลอดชีพ</span>
                                              </>
                                            ) : (
                                              <>
                                                <Tag className="w-3 h-3 text-ink" />
                                                <span>รายชิ้น</span>
                                              </>
                                            )}
                                          </span>
                                          <span className="text-xs font-mono text-ink font-bold">
                                            {isUnlimited ? `฿${opt.price}` : `฿${opt.price}/ตัว`}
                                          </span>
                                        </div>
                                        <span className="text-[9px] font-mono text-mutedGray">
                                          {isUnlimited
                                            ? 'ซื้อขาดถาวร + เข้า Vault'
                                            : `รวม ฿${opt.price * quantity} (${quantity} ตัว)`}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-mono text-[11px] uppercase font-bold text-ink">
                      <MapPin className="w-3.5 h-3.5 text-warm-dark" />
                      <span>ข้อมูลการจัดส่ง (Shipping Information)</span>
                    </div>

                    {profileAutoFilled ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <UserCheck className="w-3 h-3" />
                        <span>ดึงจากโปรไฟล์</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={fetchCustomerProfile}
                        disabled={isFetchingProfile}
                        className="text-[10px] font-mono text-warm-dark hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isFetchingProfile ? 'animate-spin' : ''}`} />
                        <span>ดึงที่อยู่จากโปรไฟล์</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                      Recipient Name / ชื่อ-นามสกุล ผู้รับ
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.name}
                      onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                      placeholder="เช่น สมชาย ใจดี (Somchai Prasert)"
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:border-warm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                      Shipping Address / ที่อยู่จัดส่ง (บ้านเลขที่, ถนน, แขวง)
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                      placeholder="เช่น 88/1 อาคารชุด ซอยสุขุมวิท 55 แขวงคลองตันเหนือ"
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:border-warm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                        District & City / เขต, จังหวัด
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingForm.city}
                        onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                        placeholder="เช่น เขตวัฒนา, กรุงเทพมหานคร"
                        className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:border-warm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                        Postal Code / รหัสไปรษณีย์
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={shippingForm.postal}
                        onChange={(e) => setShippingForm({ ...shippingForm, postal: e.target.value })}
                        placeholder="10110"
                        className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:border-warm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-mutedGray mb-1">
                      Phone Number / เบอร์โทรศัพท์ผู้รับ
                    </label>
                    <input
                      type="tel"
                      required
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      placeholder="เช่น 081-992-4411"
                      className="w-full px-3 py-2 bg-paper border border-borderCol rounded-lg text-xs font-mono text-ink placeholder:text-mutedGray/50 focus:border-warm focus:outline-none"
                    />
                  </div>

                  {/* Save to profile checkbox */}
                  <div className="pt-1 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveAddressToProfileCheckbox"
                      checked={saveAddressToProfile}
                      onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-borderCol text-ink focus:ring-warm"
                    />
                    <label htmlFor="saveAddressToProfileCheckbox" className="text-[11px] font-mono text-mutedGray cursor-pointer select-none">
                      บันทึกที่อยู่นี้เป็นที่อยู่จัดส่งเริ่มต้นในโปรไฟล์ของฉัน
                    </label>
                  </div>
                </div>

                {/* Payment Gateway Provider Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-mutedGray">
                    Payment Method / วิธีการชำระเงิน
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('STRIPE')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        paymentProvider === 'STRIPE'
                          ? 'bg-paper border-ink ring-1 ring-ink shadow-sm'
                          : 'bg-paper-light border-borderCol hover:border-ink/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <CreditCard className="w-4 h-4 text-ink" />
                        <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                          SANDBOX
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-ink">Stripe Gateway</span>
                      <span className="text-[10px] text-mutedGray font-sans">PromptPay QR & Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentProvider('DEV_MOCK')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        paymentProvider === 'DEV_MOCK'
                          ? 'bg-paper border-ink ring-1 ring-ink shadow-sm'
                          : 'bg-paper-light border-borderCol hover:border-ink/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          FAST
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-ink">Dev Fast Mock</span>
                      <span className="text-[10px] text-mutedGray font-sans">Instant Test Bypass</span>
                    </button>
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
                        <span>
                          {paymentProvider === 'STRIPE' ? 'Proceed to Stripe Payment' : 'Confirm & Place Order'}
                        </span>
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

      {/* Stripe Payment Modal (PromptPay QR & Cards) */}
      <StripePaymentModal
        isOpen={stripeModalData.isOpen}
        clientSecret={stripeModalData.clientSecret}
        orderId={stripeModalData.orderId}
        orderNumber={stripeModalData.orderNumber}
        totalAmount={stripeModalData.totalAmount}
        onClose={() => setStripeModalData((prev) => ({ ...prev, isOpen: false }))}
        onComplete={() => {
          setStripeModalData((prev) => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Studio Contextual Auth Modal */}
      <StudioAuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        pendingAction={pendingAction}
        onDevLoginSuccess={handleDevLoginSuccess}
      />

      {/* Production Blueprint Sheet & Physical Ruler Guide Modal */}
      <ProductionBlueprintSheet
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
        orderNumber="APX-STUDIO-DRAFT"
        garment={{
          sku: selectedGarment?.sku || 'APX-HVY-001',
          name: selectedGarment?.name || 'Apex Heavyweight Tee',
          colorHex: selectedColor,
          colorName: currentVariant?.colorName,
          size: selectedSize,
          fabric: selectedGarment?.fabric,
        }}
        frontElements={frontElements}
        backElements={backElements}
        initialSurface={activeSurface}
        frontSnapshotDataUrl={frontSnapshotUrl}
        backSnapshotDataUrl={backSnapshotUrl}
      />

      {/* Print Guide & Ruler Lock Protection Modal */}
      {isPrintGuideLockModalOpen && (
        <div
          data-testid="print-guide-lock-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-paper rounded-2xl border border-borderCol shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-ink">
                    Print Guide &amp; Ruler Locked
                  </h3>
                  <span className="font-mono text-[10px] text-mutedGray uppercase tracking-wider">
                    Manufacturing Tech Sheet Protection
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintGuideLockModalOpen(false)}
                className="w-8 h-8 rounded-full border border-borderCol flex items-center justify-center hover:bg-paper-dark transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-ink" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans text-mutedGray leading-relaxed">
              <p>
                คู่มือตำแหน่งงานสกรีนและพิมพ์เขียวไม้บรรทัดเซนติเมตร (Production RIP Platen Guide) เป็นเอกสารสเปกเทคนิคการผลิตสำหรับโรงพิมพ์ซัพพลายเออร์ที่ได้รับอนุญาตเท่านั้น
              </p>
              <div className="p-3 bg-paper-dark/40 rounded-xl border border-borderCol space-y-1 font-mono text-[11px] text-ink">
                <div className="flex items-center space-x-1.5 text-warm-dark font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>มาตรการคุ้มครองทรัพย์สินทางปัญญา (IP Protection)</span>
                </div>
                <p className="text-mutedGray text-[10px] leading-normal font-sans">
                  เพื่อป้องกันการละเมิดลิขสิทธิ์ของศิลปินครีเอเตอร์และมาตรฐานโรงพิมพ์ เอกสารพิมพ์เขียวฉบับสมบูรณ์จะปลดล็อกในหน้าติดตามออเดอร์หลังจากลูกค้าชำระเงินเรียบร้อยแล้วเท่านั้น
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPrintGuideLockModalOpen(false);
                  handleTriggerOrder();
                }}
                className="flex-1 py-2.5 px-4 bg-ink text-paper rounded-xl font-mono text-xs font-bold uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <span>สั่งซื้อและชำระเงินเพื่อปลดล็อก</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPrintGuideLockModalOpen(false)}
                className="py-2.5 px-4 border border-borderCol rounded-xl font-mono text-xs font-semibold text-ink hover:bg-paper-dark transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Supplier Policy & Specs Modal */}
      <SupplierPolicyModal
        isOpen={isSupplierPolicyModalOpen}
        onClose={() => setIsSupplierPolicyModalOpen(false)}
        supplier={currentSupplier}
        garment={selectedGarment}
      />

      {/* Save Notification Toast */}
      {saveNotification && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-paper px-4 py-3 rounded-xl border border-warm/60 shadow-xl font-mono text-xs flex items-center space-x-3 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{saveNotification}</span>
          <Link
            href="/account/vault"
            className="ml-2 px-2.5 py-1 rounded bg-warm text-ink font-bold hover:bg-warm-dark transition-colors uppercase text-[10px] flex items-center space-x-1"
          >
            <span>{t.nav.vault || 'Vault'}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default DesignStudioClient;
