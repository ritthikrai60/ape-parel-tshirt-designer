import { prisma } from '@/lib/prisma';

/**
 * Transparent Business Terminology
 * Strict requirement: Use clear, natural business terms in Thai/English.
 * Do NOT use mechanical jargon or synthetic formulas.
 */
export const SUPPLIER_TERMINOLOGY = {
  BLANK_GARMENT_PRICE: 'ราคาเสื้อเปล่า (Blank Garment Base Price)',
  DTG_PRINTING_COST: 'ค่างานพิมพ์ DTG (DTG Printing Cost per Surface)',
  ECO_PACKAGING_FEE: 'ค่าบรรจุภัณฑ์ (Eco Packaging Fee)',
  SHIPPING_COST: 'ค่าจัดส่ง (Logistics & Shipping Cost)',
  TRANSPARENT_COST_SYSTEM: 'ระบบคำนวณราคาโปร่งใสตามจริง (Transparent Production Cost Breakdown)',
} as const;

/** Supported courier shipping carriers */
export const SUPPORTED_COURIERS = [
  {
    code: 'THAILAND_POST_EMS',
    name: 'Thailand Post EMS',
    description: 'ไปรษณีย์ไทย ด่วนพิเศษ EMS (1-2 business days nationwide)',
  },
  {
    code: 'FLASH_EXPRESS',
    name: 'Flash Express',
    description: 'แฟลช เอ็กซ์เพรส Door-to-door delivery with live tracking',
  },
  {
    code: 'KERRY_EXPRESS',
    name: 'Kerry Express',
    description: 'เคอรี่ เอ็กซ์เพรส Next-day express courier dispatch',
  },
  {
    code: 'JT_EXPRESS',
    name: 'J&T Express',
    description: 'เจแอนด์ที เอ็กซ์เพรส 365-day standard express delivery',
  },
] as const;

export type CourierCode = (typeof SUPPORTED_COURIERS)[number]['code'];

/**
 * Valid production lifecycle status sequence:
 * CONFIRMED ➔ IN_PRODUCTION ➔ QA_PASSED ➔ READY_TO_PACK ➔ SHIPPED (➔ DELIVERED)
 */
export const ORDER_STATUS_SEQUENCE = [
  'PAYMENT_CONFIRMED',
  'IN_PRODUCTION',
  'QA_PASSED',
  'READY_TO_PACK',
  'SHIPPED',
  'DELIVERED',
] as const;

export type SupplierOrderStatus = (typeof ORDER_STATUS_SEQUENCE)[number];

// Alias mapping for flexible status inputs
export function normalizeOrderStatus(status: string): string {
  const upper = (status || '').trim().toUpperCase();
  if (upper === 'CONFIRMED' || upper === 'PAYMENT_CONFIRMED') return 'PAYMENT_CONFIRMED';
  if (upper === 'QA' || upper === 'QA_PASSED') return 'QA_PASSED';
  if (upper === 'PACKED' || upper === 'READY_TO_PACK') return 'READY_TO_PACK';
  if (upper === 'DISPATCHED' || upper === 'SHIPPED') return 'SHIPPED';
  return upper;
}

/**
 * Validates whether an order status progression is permitted.
 */
export function isValidStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const normCurrent = normalizeOrderStatus(currentStatus);
  const normNext = normalizeOrderStatus(nextStatus);

  const currentIdx = ORDER_STATUS_SEQUENCE.indexOf(
    normCurrent as SupplierOrderStatus
  );
  const nextIdx = ORDER_STATUS_SEQUENCE.indexOf(normNext as SupplierOrderStatus);

  if (currentIdx === -1 || nextIdx === -1) {
    return false;
  }

  if (normCurrent === normNext) return true;

  // Strictly allow forward step progression by 1 stage
  return nextIdx === currentIdx + 1;
}

/**
 * Returns the next logical status in the manufacturing pipeline.
 */
export function getNextAllowedStatus(currentStatus: string): string | null {
  const normCurrent = normalizeOrderStatus(currentStatus);
  const currentIdx = ORDER_STATUS_SEQUENCE.indexOf(
    normCurrent as SupplierOrderStatus
  );
  if (currentIdx === -1 || currentIdx >= ORDER_STATUS_SEQUENCE.length - 1) {
    return null;
  }
  return ORDER_STATUS_SEQUENCE[currentIdx + 1];
}

/**
 * R1. Transparent Pricing & Cost Calculation
 * Computes transparent breakdown based on transparent natural business variables.
 */
export interface CostCalculationInput {
  basePrice: number; // ราคาเสื้อเปล่า (Blank Garment Base Price)
  printPricePerSurface: number; // ค่างานพิมพ์ DTG (DTG Printing Cost per Surface)
  surfacesCount?: number; // Number of print surfaces (1 for Front/Back, 2 for Both)
  packagingPrice: number; // ค่าบรรจุภัณฑ์ (Eco Packaging Fee)
  shippingPrice: number; // ค่าจัดส่ง (Logistics & Shipping Cost)
  quantity?: number; // Production quantity
}

export interface TransparentCostBreakdown {
  blankGarmentTotal: number;
  dtgPrintingTotal: number;
  ecoPackagingTotal: number;
  shippingTotal: number;
  supplierEarningPerUnit: number;
  totalSupplierEarnings: number;
  customerProductionSubtotal: number;
  supplierMarginPercentage: number;
  quantity: number;
  surfacesCount: number;
  labels: {
    blankGarment: string;
    dtgPrinting: string;
    ecoPackaging: string;
    shipping: string;
    system: string;
  };
}

export function calculateTransparentCostBreakdown(
  input: CostCalculationInput
): TransparentCostBreakdown {
  const safeInt = (val: any, defaultVal = 0, min = 0) => {
    const num = typeof val === 'number' && Number.isFinite(val) ? val : defaultVal;
    return Math.max(min, Math.floor(num));
  };

  const quantity = safeInt(input?.quantity, 1, 1);
  const surfacesCount =
    input?.surfacesCount === 0
      ? 0
      : safeInt(input?.surfacesCount, 1, 1);
  const basePrice = safeInt(input?.basePrice, 0, 0);
  const printPricePerSurface = safeInt(input?.printPricePerSurface, 0, 0);
  const packagingPrice = safeInt(input?.packagingPrice, 0, 0);
  const shippingPrice = safeInt(input?.shippingPrice, 0, 0);

  const blankGarmentTotal = basePrice * quantity;
  const dtgPrintingTotal = printPricePerSurface * surfacesCount * quantity;
  const ecoPackagingTotal = packagingPrice * quantity;
  const shippingTotal = shippingPrice; // flat per shipment order

  // Supplier earnings = Blank Garment Cost + DTG Printing Fee + Packaging Fee
  const supplierEarningPerUnit =
    basePrice + printPricePerSurface * surfacesCount + packagingPrice;
  const totalSupplierEarnings = supplierEarningPerUnit * quantity;

  // Customer subtotal for apparel production (excluding 3rd-party artwork licenses)
  const customerProductionSubtotal = totalSupplierEarnings + shippingTotal;

  const supplierMarginPercentage =
    customerProductionSubtotal > 0
      ? Math.round((totalSupplierEarnings / customerProductionSubtotal) * 1000) / 10
      : 0;

  return {
    blankGarmentTotal,
    dtgPrintingTotal,
    ecoPackagingTotal,
    shippingTotal,
    supplierEarningPerUnit,
    totalSupplierEarnings,
    customerProductionSubtotal,
    supplierMarginPercentage,
    quantity,
    surfacesCount,
    labels: {
      blankGarment: SUPPLIER_TERMINOLOGY.BLANK_GARMENT_PRICE,
      dtgPrinting: SUPPLIER_TERMINOLOGY.DTG_PRINTING_COST,
      ecoPackaging: SUPPLIER_TERMINOLOGY.ECO_PACKAGING_FEE,
      shipping: SUPPLIER_TERMINOLOGY.SHIPPING_COST,
      system: SUPPLIER_TERMINOLOGY.TRANSPARENT_COST_SYSTEM,
    },
  };
}

/**
 * Resolves a supplier profile by ID or slug
 */
export async function resolveSupplierProfile(supplierIdOrSlug: string) {
  return await prisma.supplierProfile.findFirst({
    where: {
      OR: [{ id: supplierIdOrSlug }, { slug: supplierIdOrSlug }],
    },
    include: {
      products: {
        include: {
          variants: true,
        },
      },
      printingServices: true,
    },
  });
}

/**
 * Updates supplier blank garment base price and DTG printing rate
 */
export async function updateSupplierPricing(params: {
  supplierId: string;
  garmentProductId: string;
  basePrice?: number;
  packagingPrice?: number;
  shippingPrice?: number;
  printingServiceId?: string;
  pricePerSurface?: number;
  supportedSurfaces?: string;
}) {
  const {
    supplierId,
    garmentProductId,
    basePrice,
    packagingPrice,
    shippingPrice,
    printingServiceId,
    pricePerSurface,
    supportedSurfaces,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify supplier product
    const product = await tx.garmentProduct.findFirstOrThrow({
      where: {
        id: garmentProductId,
        supplierId,
      },
    });

    const updateProductData: Record<string, number> = {};
    if (basePrice !== undefined) {
      updateProductData.basePrice = Math.max(0, Math.floor(basePrice));
    }
    if (packagingPrice !== undefined) {
      updateProductData.packagingPrice = Math.max(0, Math.floor(packagingPrice));
    }
    if (shippingPrice !== undefined) {
      updateProductData.shippingPrice = Math.max(0, Math.floor(shippingPrice));
    }

    const updatedProduct = await tx.garmentProduct.update({
      where: { id: product.id },
      data: updateProductData,
      include: { variants: true },
    });

    // 2. Update printing service if provided or discover default DTG service
    let updatedService = null;
    let targetServiceId = printingServiceId;
    if (
      !targetServiceId &&
      (pricePerSurface !== undefined || supportedSurfaces !== undefined)
    ) {
      const defaultDtg = await tx.printingService.findFirst({
        where: { supplierId, code: 'DTG' },
      });
      if (defaultDtg) {
        targetServiceId = defaultDtg.id;
      }
    }

    if (targetServiceId) {
      const service = await tx.printingService.findFirstOrThrow({
        where: { id: targetServiceId, supplierId },
      });

      const updateServiceData: Record<string, any> = {};
      if (pricePerSurface !== undefined) {
        updateServiceData.pricePerSurface = Math.max(
          0,
          Math.floor(pricePerSurface)
        );
      }
      if (supportedSurfaces !== undefined) {
        updateServiceData.supportedSurfaces = supportedSurfaces;
      }

      updatedService = await tx.printingService.update({
        where: { id: service.id },
        data: updateServiceData,
      });
    }

    return {
      product: updatedProduct,
      printingService: updatedService,
    };
  });
}

/**
 * R2. Inventory Stock Matrix Grid
 */
export const LOW_STOCK_THRESHOLD = 10;

export function isLowStock(stock: number, threshold = LOW_STOCK_THRESHOLD): boolean {
  return stock < threshold;
}

export interface InventoryMatrixVariant {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  stock: number;
  isLowStock: boolean;
  priceAdjustment: number;
}

export interface InventoryMatrixColorRow {
  colorName: string;
  colorHex: string;
  sizes: Record<string, InventoryMatrixVariant | null>;
}

export interface SupplierInventoryMatrix {
  supplierId: string;
  supplierSlug: string;
  productId: string;
  productName: string;
  productSku: string;
  basePrice: number;
  availableSizes: string[];
  colorRows: InventoryMatrixColorRow[];
  totalVariants: number;
  totalUnitsInStock: number;
  lowStockCount: number;
  lowStockVariants: InventoryMatrixVariant[];
}

export async function getSupplierInventoryMatrix(
  supplierIdOrSlug: string,
  productId?: string
): Promise<SupplierInventoryMatrix> {
  const supplier = await resolveSupplierProfile(supplierIdOrSlug);
  if (!supplier) {
    throw new Error(`Supplier "${supplierIdOrSlug}" not found`);
  }

  const product = productId
    ? supplier.products.find((p) => p.id === productId)
    : supplier.products[0];

  if (!product) {
    throw new Error(`No garment products found for supplier "${supplier.companyName}"`);
  }

  const variants = product.variants;
  const standardSizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL'];

  // Discover sizes present in variants
  const sizeSet = new Set<string>();
  variants.forEach((v) => sizeSet.add(v.size));
  const availableSizes = Array.from(sizeSet).sort((a, b) => {
    const idxA = standardSizeOrder.indexOf(a);
    const idxB = standardSizeOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Group by color
  const colorMap = new Map<string, { colorHex: string; variants: typeof variants }>();
  for (const v of variants) {
    if (!colorMap.has(v.colorName)) {
      colorMap.set(v.colorName, { colorHex: v.colorHex, variants: [] });
    }
    colorMap.get(v.colorName)!.variants.push(v);
  }

  const colorRows: InventoryMatrixColorRow[] = [];
  const lowStockVariants: InventoryMatrixVariant[] = [];
  let totalUnitsInStock = 0;

  colorMap.forEach((colorInfo, colorName) => {
    const sizeCells: Record<string, InventoryMatrixVariant | null> = {};
    for (const size of availableSizes) {
      const match = colorInfo.variants.find((v: (typeof variants)[number]) => v.size === size);
      if (match) {
        const item: InventoryMatrixVariant = {
          id: match.id,
          sku: match.sku,
          colorName: match.colorName,
          colorHex: match.colorHex,
          size: match.size,
          stock: match.stock,
          isLowStock: isLowStock(match.stock),
          priceAdjustment: match.priceAdjustment,
        };
        sizeCells[size] = item;
        totalUnitsInStock += match.stock;
        if (item.isLowStock) {
          lowStockVariants.push(item);
        }
      } else {
        sizeCells[size] = null;
      }
    }
    colorRows.push({
      colorName,
      colorHex: colorInfo.colorHex,
      sizes: sizeCells,
    });
  });

  return {
    supplierId: supplier.id,
    supplierSlug: supplier.slug,
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    basePrice: product.basePrice,
    availableSizes,
    colorRows,
    totalVariants: variants.length,
    totalUnitsInStock,
    lowStockCount: lowStockVariants.length,
    lowStockVariants,
  };
}

/**
 * Upper safety bound for garment stock quantity per variant.
 * Prevents 32-bit integer overflow in Prisma and unrealistic stock inputs.
 */
export const MAX_STOCK_QUANTITY = 1_000_000;

/**
 * Updates stock quantity for a single garment variant with boundary clamping.
 */
export async function updateVariantStock(
  variantId: string,
  newStock: number
) {
  // Clamped non-negative integer within [0, MAX_STOCK_QUANTITY]
  const num = Number.isFinite(newStock) ? newStock : 0;
  const clampedStock = Math.min(
    MAX_STOCK_QUANTITY,
    Math.max(0, Math.floor(num))
  );

  return await prisma.garmentVariant.update({
    where: { id: variantId },
    data: { stock: clampedStock },
  });
}

/**
 * Batch updates stock quantities across multiple variants.
 */
export async function batchUpdateVariantStock(
  updates: Array<{ variantId: string; stock: number }>
) {
  return await prisma.$transaction(
    async (tx) => {
      const results = [];
      for (const u of updates) {
        const num = Number.isFinite(u.stock) ? u.stock : 0;
        const clamped = Math.min(
          MAX_STOCK_QUANTITY,
          Math.max(0, Math.floor(num))
        );
        const res = await tx.garmentVariant.update({
          where: { id: u.variantId },
          data: { stock: clamped },
        });
        results.push(res);
      }
      return results;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Standard apparel color palette presets for rapid supplier selection
 */
export const STANDARD_GARMENT_PALETTE = [
  { name: 'Pitch Black', hex: '#131718' },
  { name: 'Optical White', hex: '#FFFFFF' },
  { name: 'Heather Grey', hex: '#A8A9AD' },
  { name: 'Charcoal Wash', hex: '#34383C' },
  { name: 'Deep Navy', hex: '#1C2833' },
  { name: 'Forest Green', hex: '#213326' },
  { name: 'Vintage Sand', hex: '#DED6C9' },
  { name: 'Burgundy Crimson', hex: '#4A1525' },
  { name: 'Washed Earth Brown', hex: '#5A4638' },
  { name: 'Cobalt Blue', hex: '#1E40AF' },
] as const;

/**
 * Adds a new colorway and auto-generates size variants for an existing garment product.
 */
export async function addColorwayToGarmentProduct(params: {
  supplierId: string;
  productId: string;
  colorName: string;
  colorHex: string;
  initialStock?: number;
}) {
  const { supplierId, productId, colorName, colorHex, initialStock = 0 } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify product belongs to supplier
    const product = await tx.garmentProduct.findFirstOrThrow({
      where: { id: productId, supplierId },
      include: { variants: true },
    });

    // 2. Discover available sizes from existing variants (or default standard size set)
    const existingSizes = Array.from(new Set(product.variants.map((v) => v.size)));
    const targetSizes =
      existingSizes.length > 0 ? existingSizes : ['S', 'M', 'L', 'XL', '2XL'];

    // 3. Ensure color doesn't already exist for this product
    const duplicate = product.variants.some(
      (v) => v.colorName.trim().toLowerCase() === colorName.trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Color "${colorName}" already exists for this garment.`);
    }

    const cleanProdSku = product.sku.trim().toUpperCase();
    const cleanColorCode =
      colorName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4) || 'COL';

    const safeStock = Math.min(
      MAX_STOCK_QUANTITY,
      Math.max(0, Math.floor(initialStock))
    );

    // 4. Create variants for all sizes
    const createdVariants = [];
    for (const size of targetSizes) {
      const baseSku = `${cleanProdSku}-${cleanColorCode}-${size}`;
      let finalSku = baseSku;
      const skuExists = await tx.garmentVariant.findUnique({
        where: { sku: finalSku },
      });
      if (skuExists) {
        finalSku = `${baseSku}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      }

      const variant = await tx.garmentVariant.create({
        data: {
          productId: product.id,
          sku: finalSku,
          colorName: colorName.trim(),
          colorHex: colorHex.trim(),
          size,
          stock: safeStock,
          priceAdjustment: 0,
        },
      });
      createdVariants.push(variant);
    }

    return {
      product,
      colorName: colorName.trim(),
      colorHex: colorHex.trim(),
      createdVariants,
    };
  });
}

/**
 * Creates a brand new GarmentProduct with initial colorway and sizes.
 */
export async function createGarmentProduct(params: {
  supplierId: string;
  name: string;
  sku: string;
  description?: string;
  fabric?: string;
  weightGsm?: number;
  fit?: string;
  neckline?: string;
  basePrice: number;
  packagingPrice?: number;
  shippingPrice?: number;
  availableSizes: string[];
  initialColorName: string;
  initialColorHex: string;
  initialStock?: number;
}) {
  const {
    supplierId,
    name,
    sku,
    description,
    fabric = '100% Combed Cotton',
    weightGsm = 240,
    fit = 'oversized',
    neckline = 'crew',
    basePrice,
    packagingPrice = 15,
    shippingPrice = 40,
    availableSizes,
    initialColorName,
    initialColorHex,
    initialStock = 0,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify supplier profile exists
    const supplier = await tx.supplierProfile.findUniqueOrThrow({
      where: { id: supplierId },
    });

    // 2. Validate SKU uniqueness
    const cleanProductSku = sku.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const existingProduct = await tx.garmentProduct.findUnique({
      where: { sku: cleanProductSku },
    });
    if (existingProduct) {
      throw new Error(`Garment product with SKU "${cleanProductSku}" already exists.`);
    }

    // 3. Create the product
    const newProduct = await tx.garmentProduct.create({
      data: {
        supplierId: supplier.id,
        sku: cleanProductSku,
        name: name.trim(),
        description: description?.trim() || null,
        fabric: fabric.trim(),
        weightGsm: Math.max(50, Math.floor(weightGsm)),
        fit,
        neckline,
        basePrice: Math.max(0, Math.floor(basePrice)),
        packagingPrice: Math.max(0, Math.floor(packagingPrice)),
        shippingPrice: Math.max(0, Math.floor(shippingPrice)),
      },
    });

    // 4. Create variants for initial colorway across all selected sizes
    const sizes =
      availableSizes && availableSizes.length > 0
        ? availableSizes
        : ['S', 'M', 'L', 'XL', '2XL'];

    const cleanColorCode =
      initialColorName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4) || 'COL';

    const safeStock = Math.min(
      MAX_STOCK_QUANTITY,
      Math.max(0, Math.floor(initialStock))
    );

    const createdVariants = [];
    for (const size of sizes) {
      let variantSku = `${cleanProductSku}-${cleanColorCode}-${size}`;
      const skuExists = await tx.garmentVariant.findUnique({
        where: { sku: variantSku },
      });
      if (skuExists) {
        variantSku = `${variantSku}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      }

      const variant = await tx.garmentVariant.create({
        data: {
          productId: newProduct.id,
          sku: variantSku,
          colorName: initialColorName.trim(),
          colorHex: initialColorHex.trim(),
          size,
          stock: safeStock,
          priceAdjustment: 0,
        },
      });
      createdVariants.push(variant);
    }

    return {
      product: newProduct,
      createdVariants,
    };
  });
}

/**
 * R4. Logistics & Shipping Fulfillment
 */
export function validateTrackingNumber(
  courierCode: string,
  trackingNumber: string
): { valid: boolean; message?: string } {
  const cleanCourier = (courierCode || '').trim();
  if (!cleanCourier) {
    return { valid: false, message: 'Courier carrier must be specified' };
  }

  const isSupportedCourier = SUPPORTED_COURIERS.some(
    (c) =>
      c.code.toUpperCase() === cleanCourier.toUpperCase().replace(/\s+/g, '_') ||
      c.name.toLowerCase() === cleanCourier.toLowerCase()
  );
  if (!isSupportedCourier) {
    return {
      valid: false,
      message: `Unsupported courier carrier: "${courierCode}"`,
    };
  }

  const cleanTracking = (trackingNumber || '').replace(/\s+/g, '').trim();
  if (!cleanTracking) {
    return { valid: false, message: 'Tracking number cannot be empty' };
  }

  if (cleanTracking.length < 5 || cleanTracking.length > 40) {
    return {
      valid: false,
      message: 'Tracking number must be between 5 and 40 characters',
    };
  }

  // Alpha-numeric check (allowing dashes)
  if (!/^[A-Za-z0-9-]+$/.test(cleanTracking)) {
    return {
      valid: false,
      message: 'Tracking number must contain only letters, numbers, and dashes',
    };
  }

  return { valid: true };
}

export interface FulfillOrderInput {
  orderId: string;
  courier: string;
  trackingNumber: string;
  notes?: string;
}

export async function fulfillSupplierOrder(input: FulfillOrderInput) {
  const { orderId, courier, trackingNumber, notes } = input;
  const cleanTracking = (trackingNumber || '').replace(/\s+/g, '').trim();

  const trackingCheck = validateTrackingNumber(courier, cleanTracking);
  if (!trackingCheck.valid) {
    throw new Error(trackingCheck.message);
  }

  const existing = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
  });

  if (!existing) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (existing.status === 'CANCELLED') {
    throw new Error(`Cannot fulfill cancelled order ${orderId}`);
  }

  if (existing.status === 'DELIVERED') {
    throw new Error(`Cannot fulfill already delivered order ${orderId}`);
  }

  // Parse existing snapshotData or create new object
  let snapshot: Record<string, any> = {};
  try {
    if (existing.snapshotData) {
      snapshot = JSON.parse(existing.snapshotData);
    }
  } catch {
    snapshot = {};
  }

  snapshot.fulfillment = {
    courier,
    trackingNumber: cleanTracking,
    dispatchedAt: new Date().toISOString(),
    packingSlipGenerated: true,
    notes: notes || null,
  };

  return await prisma.$transaction(
    async (tx) => {
      const updated = await tx.order.update({
        where: { id: existing.id },
        data: {
          status: 'SHIPPED',
          snapshotData: JSON.stringify(snapshot),
        },
      });

      await tx.auditEvent.create({
        data: {
          action: 'ORDER_FULFILLED',
          entityType: 'Order',
          entityId: updated.id,
          payload: JSON.stringify({
            orderNumber: updated.orderNumber,
            courier,
            trackingNumber: cleanTracking,
            previousStatus: existing.status,
            newStatus: 'SHIPPED',
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return updated;
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

/**
 * Generates structured printable packing slip data
 */
export async function generatePackingSlipData(orderIdOrNumber: string) {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }] },
    include: {
      design: {
        include: {
          garmentProduct: true,
        },
      },
      supplier: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderIdOrNumber} not found`);
  }

  let fulfillmentInfo: any = null;
  try {
    if (order.snapshotData) {
      const snap = JSON.parse(order.snapshotData);
      fulfillmentInfo = snap.fulfillment || null;
    }
  } catch {}

  const garment = order.design?.garmentProduct;

  let hasFront = false;
  let hasBack = false;
  try {
    if (order.design?.frontElements) {
      const parsed =
        typeof order.design.frontElements === 'string'
          ? JSON.parse(order.design.frontElements)
          : order.design.frontElements;
      hasFront = Array.isArray(parsed) && parsed.length > 0;
    }
    if (order.design?.backElements) {
      const parsed =
        typeof order.design.backElements === 'string'
          ? JSON.parse(order.design.backElements)
          : order.design.backElements;
      hasBack = Array.isArray(parsed) && parsed.length > 0;
    }
  } catch {}

  const surfaces: string[] = [];
  if (hasFront) surfaces.push('FRONT');
  if (hasBack) surfaces.push('BACK');
  if (surfaces.length === 0 && order.printingCost > 0) {
    surfaces.push('FRONT');
  }

  return {
    slipNumber: `SLIP-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    date: new Date().toISOString(),
    customer: {
      name: order.shippingName,
      address: order.shippingAddress,
      city: order.shippingCity,
      postalCode: order.shippingPostal,
      phone: order.shippingPhone || 'N/A',
    },
    supplier: {
      companyName: order.supplier?.companyName || 'Supplier Facility',
      location: order.supplier?.location || 'Bangkok, Thailand',
      contactEmail: order.supplier?.contactEmail || 'supplier@ape-parel.com',
    },
    item: {
      sku: garment?.sku || 'APX-HVY-001',
      name: garment?.name || 'Apex Heavyweight Tee',
      colorName: order.design?.garmentColorHex || '#131718',
      size: order.design?.garmentSize || 'L',
      quantity: order.quantity,
      surfaces,
    },
    fulfillment: {
      courier: fulfillmentInfo?.courier || 'Thailand Post EMS',
      trackingNumber: fulfillmentInfo?.trackingNumber || 'PENDING-DISPATCH',
      dispatchedAt: fulfillmentInfo?.dispatchedAt || null,
    },
    qrCodeMock: `https://track.ape-parel.com/${order.orderNumber}`,
  };
}

/**
 * R5. Supplier Financial Ledger & Settlement Payouts
 */
export function calculateOrderSupplierEarnings(order: {
  garmentCost: number;
  printingCost: number;
  packagingCost: number;
}): number {
  return order.garmentCost + order.printingCost + order.packagingCost;
}

export interface SupplierFinancialSummary {
  supplierId: string;
  supplierSlug: string;
  companyName: string;
  lifetimeEarnings: number;
  totalSettledPayouts: number;
  withdrawableBalance: number;
  ordersCount: number;
  transactions: Array<{
    id: string;
    type: 'EARNING' | 'PAYOUT';
    reference: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }>;
}

/**
 * Retrieves supplier earnings and double-entry ledger history
 */
export async function getSupplierFinancialLedger(
  supplierIdOrSlug: string
): Promise<SupplierFinancialSummary> {
  const supplier = await resolveSupplierProfile(supplierIdOrSlug);
  if (!supplier) {
    throw new Error(`Supplier "${supplierIdOrSlug}" not found`);
  }

  // 1. Fetch all orders for this supplier
  const orders = await prisma.order.findMany({
    where: {
      supplierId: supplier.id,
      status: {
        in: [
          'PAYMENT_CONFIRMED',
          'IN_PRODUCTION',
          'QA_PASSED',
          'READY_TO_PACK',
          'SHIPPED',
          'DELIVERED',
        ],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate gross supplier earnings
  let lifetimeEarnings = 0;
  for (const o of orders) {
    lifetimeEarnings += calculateOrderSupplierEarnings(o);
  }

  // 2. Fetch or create supplier financial account in Prisma
  const accountNumber = `ACC-SUPPLIER-${supplier.slug}`;
  let financialAccount = await prisma.financialAccount.findFirst({
    where: { accountNumber },
    include: {
      journalEntries: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!financialAccount) {
    financialAccount = await prisma.financialAccount.upsert({
      where: { accountNumber },
      create: {
        accountType: 'SUPPLIER',
        accountNumber,
        balance: lifetimeEarnings,
        currency: 'THB',
        status: 'ACTIVE',
      },
      update: {},
      include: {
        journalEntries: true,
      },
    });
  }

  // Find any payout debits recorded
  const payoutEntries = financialAccount.journalEntries.filter(
    (j) => j.entryType === 'DEBIT'
  );
  const totalSettledPayouts = payoutEntries.reduce((sum, j) => sum + j.amount, 0);
  const withdrawableBalance = Math.max(0, lifetimeEarnings - totalSettledPayouts);

  // Sync financialAccount balance if drifted
  if (financialAccount.balance !== withdrawableBalance) {
    await prisma.financialAccount.update({
      where: { id: financialAccount.id },
      data: { balance: withdrawableBalance },
    });
  }

  // 3. Chronological ledger sequence across both orders and payouts
  interface LedgerEvent {
    id: string;
    type: 'EARNING' | 'PAYOUT';
    reference: string;
    amount: number;
    description: string;
    createdAt: Date;
  }

  const events: LedgerEvent[] = [];

  for (const o of orders) {
    const earning = calculateOrderSupplierEarnings(o);
    events.push({
      id: `earn-${o.id}`,
      type: 'EARNING',
      reference: o.orderNumber,
      amount: earning,
      description: `Production fee: Garment ฿${o.garmentCost} + DTG ฿${o.printingCost} + Packaging ฿${o.packagingCost}`,
      createdAt: new Date(o.createdAt),
    });
  }

  for (const p of payoutEntries) {
    events.push({
      id: p.id,
      type: 'PAYOUT',
      reference: p.reference || 'PAYOUT',
      amount: -p.amount,
      description: p.description || 'Supplier balance settlement payout',
      createdAt: new Date(p.createdAt),
    });
  }

  // Sort chronologically ascending to compute accurate sequential running balance
  // Tie-breaker: EARNING credit processed before PAYOUT debit at exact same millisecond
  events.sort((a, b) => {
    const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.type === 'EARNING' ? -1 : 1;
  });

  let runningBal = 0;
  const transactions: SupplierFinancialSummary['transactions'] = [];

  for (const ev of events) {
    runningBal += ev.amount;
    transactions.push({
      id: ev.id,
      type: ev.type,
      reference: ev.reference,
      amount: ev.amount,
      balanceAfter: runningBal,
      description: ev.description,
      createdAt: ev.createdAt.toISOString(),
    });
  }

  // Sort descending by date for display
  // Tie-breaker: latest transaction (payout) appears first
  transactions.sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.type === 'PAYOUT' ? -1 : 1;
  });

  return {
    supplierId: supplier.id,
    supplierSlug: supplier.slug,
    companyName: supplier.companyName,
    lifetimeEarnings,
    totalSettledPayouts,
    withdrawableBalance,
    ordersCount: orders.length,
    transactions,
  };
}

/**
 * Requests a payout settlement via PromptPay or Thai Bank Account
 */
export async function requestSupplierPayout(params: {
  supplierIdOrSlug: string;
  amount: number;
  method: 'PROMPTPAY' | 'BANK_TRANSFER';
  recipientId: string; // Phone/ID for PromptPay or Account Number for Bank
  bankName?: string;
  notes?: string;
}) {
  const { supplierIdOrSlug, amount, method, recipientId, bankName, notes } =
    params;

  const validAmount = Math.floor(amount);
  if (!Number.isFinite(validAmount) || validAmount <= 0) {
    throw new Error('Payout amount must be greater than 0 THB');
  }

  const cleanRecipientId = (recipientId || '').trim();
  if (!cleanRecipientId) {
    throw new Error('Recipient identifier (PromptPay ID or Bank Account Number) is required');
  }

  if (method !== 'PROMPTPAY' && method !== 'BANK_TRANSFER') {
    throw new Error(`Unsupported payout method: ${method}`);
  }

  if (method === 'BANK_TRANSFER' && (!bankName || !bankName.trim())) {
    throw new Error('Bank name is required for bank transfer settlements');
  }

  const supplier = await resolveSupplierProfile(supplierIdOrSlug);
  if (!supplier) {
    throw new Error(`Supplier "${supplierIdOrSlug}" not found`);
  }

  const accountNumber = `ACC-SUPPLIER-${supplier.slug}`;

  // Execute atomically with fresh verification inside transaction to prevent TOCTOU race conditions
  return await prisma.$transaction(
    async (tx) => {
      // 1. Fetch or create account inside transaction
      let financialAccount = await tx.financialAccount.findUnique({
        where: { accountNumber },
        include: {
          journalEntries: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // 2. Fetch all qualifying orders inside transaction
      const orders = await tx.order.findMany({
        where: {
          supplierId: supplier.id,
          status: {
            in: [
              'PAYMENT_CONFIRMED',
              'IN_PRODUCTION',
              'QA_PASSED',
              'READY_TO_PACK',
              'SHIPPED',
              'DELIVERED',
            ],
          },
        },
      });

      const lifetimeEarnings = orders.reduce(
        (sum, o) => sum + calculateOrderSupplierEarnings(o),
        0
      );

      if (!financialAccount) {
        financialAccount = await tx.financialAccount.upsert({
          where: { accountNumber },
          create: {
            accountType: 'SUPPLIER',
            accountNumber,
            balance: lifetimeEarnings,
            currency: 'THB',
            status: 'ACTIVE',
          },
          update: {},
          include: {
            journalEntries: true,
          },
        });
      }

      // Calculate fresh withdrawable balance INSIDE transaction
      const payoutEntries = financialAccount.journalEntries.filter(
        (j) => j.entryType === 'DEBIT'
      );
      const totalSettledPayouts = payoutEntries.reduce(
        (sum, j) => sum + j.amount,
        0
      );
      const currentWithdrawable = Math.max(
        0,
        lifetimeEarnings - totalSettledPayouts
      );

      if (validAmount > currentWithdrawable) {
        throw new Error(
          `Insufficient withdrawable balance. Requested: ฿${validAmount}, Available: ฿${currentWithdrawable}`
        );
      }

      const payoutReference = `PAY-SUPP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const balanceAfter = currentWithdrawable - validAmount;

      // 3. Record double-entry JournalEntry (DEBIT reduces balance)
      const journal = await tx.journalEntry.create({
        data: {
          accountId: financialAccount.id,
          entryType: 'DEBIT',
          amount: validAmount,
          balanceAfter,
          reference: payoutReference,
          description: `Settlement via ${method} (${cleanRecipientId}${
            bankName ? ` - ${bankName}` : ''
          })`,
        },
      });

      // 4. Update account balance
      await tx.financialAccount.update({
        where: { id: financialAccount.id },
        data: { balance: balanceAfter },
      });

      // 5. Record AuditEvent
      await tx.auditEvent.create({
        data: {
          action: 'SUPPLIER_PAYOUT_REQUESTED',
          entityType: 'FinancialAccount',
          entityId: financialAccount.id,
          payload: JSON.stringify({
            supplierSlug: supplier.slug,
            amount: validAmount,
            method,
            recipientId: cleanRecipientId,
            bankName: bankName || null,
            payoutReference,
            balanceAfter,
            notes: notes || null,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      return {
        success: true,
        payoutReference,
        amount: validAmount,
        balanceAfter,
        method,
        recipientId: cleanRecipientId,
        journalEntryId: journal.id,
      };
    },
    { maxWait: 15000, timeout: 30000 }
  );
}
