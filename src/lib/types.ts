export type PrintSurface = 'FRONT' | 'BACK' | 'SIDE';

export interface DesignElement {
  id: string;
  artworkId: string;
  licenseOptionId: string;
  title: string;
  previewUrl: string;
  creatorName: string;
  creatorId: string;
  surface: PrintSurface;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  width: number; // percentage width
  height: number; // percentage height
  rotation: number; // degrees
  zIndex: number;
  price: number; // THB unit royalty
}

export interface ArtworkLicenseLine {
  artworkId: string;
  licenseOptionId: string;
}

export interface PricingPayload {
  garmentProductId: string;
  garmentVariantId?: string;
  quantity?: number;
  frontArtworkLicenses?: ArtworkLicenseLine[];
  backArtworkLicenses?: ArtworkLicenseLine[];
  sideArtworkLicenses?: ArtworkLicenseLine[];
}

export interface PriceCalculationResult {
  garmentCost: number;
  printingCost: number;
  licensingCost: number;
  packagingCost: number;
  shippingCost: number;
  totalAmount: number;
  quantity: number;
  surfacesUsed: PrintSurface[];
  breakdown: {
    garmentBasePrice: number;
    printPricePerSurface: number;
    surfacesCount: number;
    packagingPerUnit: number;
    shippingBase: number;
    artworkLicenses: Array<{
      artworkId: string;
      title: string;
      creatorName: string;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
}

export type UserRole = 'CUSTOMER' | 'CREATOR' | 'SUPPLIER' | 'ADMIN';

// ============================================================================
// Order Placement & Execution Types
// ============================================================================

export interface CreateOrderInput {
  garmentProductId: string;
  garmentVariantId?: string;
  garmentColorHex?: string;
  garmentSize?: string;
  garmentFit?: string;
  quantity?: number;
  designTitle?: string;
  frontElements?: DesignElement[];
  backElements?: DesignElement[];
  sideElements?: DesignElement[];
  frontArtworkLicenses?: ArtworkLicenseLine[];
  backArtworkLicenses?: ArtworkLicenseLine[];
  sideArtworkLicenses?: ArtworkLicenseLine[];
  previewFrontUrl?: string;
  previewBackUrl?: string;
  customerId?: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostal: string;
  shippingPhone?: string;
  clientClaimedTotal?: number;
  paymentMode?: string;
  paymentStatus?: string;
  _simulateFailureAtStep?: 'design' | 'order' | 'obligation' | 'ledger';
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  designId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  costs: {
    garmentCost: number;
    printingCost: number;
    licensingCost: number;
    packagingCost: number;
    shippingCost: number;
  };
  obligationsCount: number;
  ledgerEntriesCount: number;
  obligations: Array<{
    id: string;
    artworkId: string;
    creatorId: string;
    unitRoyalty: number;
    totalAmount: number;
    status: string;
  }>;
  order: {
    id: string;
    orderNumber: string;
    customerId: string | null;
    designId: string;
    supplierId: string;
    quantity: number;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    totalAmount: number;
    garmentCost: number;
    printingCost: number;
    licensingCost: number;
    packagingCost: number;
    shippingCost: number;
    shippingName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPostal: string;
    shippingPhone: string | null;
    createdAt: Date;
  };
}

// ============================================================================
// Royalty Ledger & Settlement Types
// ============================================================================

export interface ObligationStatusSummary {
  count: number;
  totalAmount: number;
}

export interface CreatorLedgerSummary {
  creatorId: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  payoutDetails: string | null;
  currentBalance: number; // In THB, available for withdrawal
  lifetimeEarnings: number; // In THB, all historical gross earnings
  totalSettled: number; // In THB, all settled payouts
  salesVolume: number; // Total units of licensed garments sold
  pendingObligations: ObligationStatusSummary;
  eligibleObligations: ObligationStatusSummary;
  settledObligations: ObligationStatusSummary;
  recentLedgerEntries: Array<{
    id: string;
    obligationId: string | null;
    entryType: string;
    amount: number;
    balanceAfter: number;
    reference: string | null;
    notes: string | null;
    createdAt: Date;
  }>;
  recentSettlements: Array<{
    id: string;
    settlementNumber: string;
    totalAmount: number;
    status: string;
    payoutReference: string | null;
    createdAt: Date;
  }>;
}

export interface SettlementResult {
  settlementId: string;
  settlementNumber: string;
  creatorId: string;
  creatorName: string;
  totalAmount: number; // In THB
  settledObligationsCount: number;
  settledObligationIds: string[];
  balanceBefore: number;
  balanceAfter: number;
  ledgerEntryId: string;
  payoutReference: string | null;
  status: 'COMPLETED';
  settledAt: Date;
}

export interface PayoutSettlementOptions {
  payoutRef?: string;
  obligationIds?: string[];
  notes?: string;
}

export interface RoyaltyLedgerEntryDetails {
  id: string;
  creatorId: string;
  obligationId: string | null;
  entryType: string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  obligation?: {
    id: string;
    orderId: string;
    unitRoyalty: number;
    quantity: number;
    status: string;
    artwork: {
      id: string;
      title: string;
      previewUrl: string;
    };
  } | null;
}

// ============================================================================
// Supplier Production Specification Types
// ============================================================================

export interface ProductionPlacement {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotationDeg: number;
  zIndex: number;
  calculatedWidthCm: number;
  calculatedHeightCm: number;
  xCenterCm: number;
  yCenterCm: number;
  xLeftCm: number;
  yTopCm: number;
}

export interface ProductionArtworkLayer {
  elementId: string;
  artworkId: string;
  licenseOptionId: string;
  title: string;
  creatorName: string;
  creatorSlug?: string;
  mimeType: string;
  assetUrl: string;
  highResAssetUrl: string;
  previewUrl: string;
  placement: ProductionPlacement;
}

export interface ProductionSurfaceJob {
  surface: PrintSurface;
  surfaceName: string;
  printableAreaCm: {
    width: number;
    height: number;
  };
  artworkCount: number;
  artworks: ProductionArtworkLayer[];
}

export interface ProductionGarmentSpec {
  productId: string;
  blankSku: string;
  productName: string;
  variantId?: string | null;
  variantSku: string;
  colorName: string;
  colorHex: string;
  size: string;
  fit: string;
  neckline: string;
  fabric: string;
  weightGsm: number;
  quantity: number;
}

export interface ProductionPrintingSpec {
  code: string;
  name: string;
  description?: string | null;
  maxPrintWidthCm: number;
  maxPrintHeightCm: number;
}

export interface ProductionSupplierSpec {
  id: string;
  slug: string;
  companyName: string;
  location: string;
  contactEmail: string;
  contactPhone?: string | null;
  leadTimeDays: number;
}

export interface ProductionRecipientSpec {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone?: string | null;
}

export interface ProductionJobPackage {
  jobId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  orderCreatedAt: string;
  generatedAt: string;
  targetShipDate: string;
  supplier: ProductionSupplierSpec;
  garment: ProductionGarmentSpec;
  printingTechnique: ProductionPrintingSpec;
  surfaces: ProductionSurfaceJob[];
  shipping: ProductionRecipientSpec;
  summary: {
    totalUnits: number;
    surfacesCount: number;
    totalArtworksCount: number;
    printedSurfaces: PrintSurface[];
  };
}

