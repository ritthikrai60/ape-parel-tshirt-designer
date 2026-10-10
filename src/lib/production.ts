import { prisma } from '@/lib/prisma';
import {
  PrintSurface,
  DesignElement,
  ProductionPlacement,
  ProductionArtworkLayer,
  ProductionSurfaceJob,
  ProductionGarmentSpec,
  ProductionPrintingSpec,
  ProductionSupplierSpec,
  ProductionRecipientSpec,
  ProductionJobPackage,
} from '@/lib/types';

export type {
  ProductionPlacement,
  ProductionArtworkLayer,
  ProductionSurfaceJob,
  ProductionGarmentSpec,
  ProductionPrintingSpec,
  ProductionSupplierSpec,
  ProductionRecipientSpec,
  ProductionJobPackage,
};

/**
 * Safe JSON parser for design element strings
 */
function safeParseElements(rawJson: string | null | undefined): DesignElement[] {
  if (!rawJson || typeof rawJson !== 'string') return [];
  try {
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Round numerical value to 2 decimal places for physical cm dimensions
 */
function roundCm(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Calculate physical placement dimensions and coordinates in cm from percentages
 */
function computePlacement(
  element: DesignElement,
  platenWidthCm: number,
  platenHeightCm: number
): ProductionPlacement {
  const widthPercent = Number(element.width) || 0;
  const heightPercent = Number(element.height) || 0;
  const xPercent = Number(element.x) || 0;
  const yPercent = Number(element.y) || 0;
  const rotationDeg = Number(element.rotation) || 0;
  const zIndex = Number(element.zIndex) || 1;

  // Calculate physical dimensions in cm
  const calculatedWidthCm = roundCm((widthPercent / 100) * platenWidthCm);
  const calculatedHeightCm = roundCm((heightPercent / 100) * platenHeightCm);

  // Calculate physical center coordinates on platen
  const xCenterCm = roundCm((xPercent / 100) * platenWidthCm);
  const yCenterCm = roundCm((yPercent / 100) * platenHeightCm);

  // Calculate top-left bounding box coordinates in cm
  const xLeftCm = roundCm(xCenterCm - calculatedWidthCm / 2);
  const yTopCm = roundCm(yCenterCm - calculatedHeightCm / 2);

  return {
    xPercent,
    yPercent,
    widthPercent,
    heightPercent,
    rotationDeg,
    zIndex,
    calculatedWidthCm,
    calculatedHeightCm,
    xCenterCm,
    yCenterCm,
    xLeftCm,
    yTopCm,
  };
}

/**
 * Generates a complete supplier production specification package (ProductionJobPackage)
 * from an Order and its associated DesignDocument.
 *
 * @param orderId Internal cuid or human-readable orderNumber (e.g. 'APX-ORD-9021')
 * @returns ProductionJobPackage ready for factory dispatch and RIP processing
 */
export async function generateProductionPackage(
  orderId: string
): Promise<ProductionJobPackage> {
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    throw new Error('Order ID is required');
  }

  const queryKey = orderId.trim();

  // 1. Query Order with full relations
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: queryKey },
        { orderNumber: queryKey },
      ],
    },
    include: {
      customer: true,
      supplier: {
        include: {
          printingServices: true,
        },
      },
      design: {
        include: {
          garmentProduct: {
            include: {
              variants: true,
            },
          },
        },
      },
      obligations: {
        include: {
          artwork: {
            include: {
              creator: true,
            },
          },
          licenseOption: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${queryKey}`);
  }

  const { design, supplier } = order;
  if (!design) {
    throw new Error(`Design document for order ${order.orderNumber} not found`);
  }

  const garmentProduct = design.garmentProduct;
  if (!garmentProduct) {
    throw new Error(`Garment product for order ${order.orderNumber} not found`);
  }

  // 2. Resolve blank garment variant SKU & color details
  let matchedVariant = design.garmentVariantId
    ? garmentProduct.variants.find((v) => v.id === design.garmentVariantId)
    : undefined;

  if (!matchedVariant) {
    matchedVariant = garmentProduct.variants.find(
      (v) =>
        v.colorHex.toLowerCase() === design.garmentColorHex.toLowerCase() &&
        v.size.toUpperCase() === design.garmentSize.toUpperCase()
    );
  }

  if (!matchedVariant) {
    matchedVariant = garmentProduct.variants.find(
      (v) => v.size.toUpperCase() === design.garmentSize.toUpperCase()
    );
  }

  const variantSku =
    matchedVariant?.sku ||
    `${garmentProduct.sku}-${design.garmentColorHex.replace('#', '')}-${design.garmentSize}`;
  const colorName = matchedVariant?.colorName || 'Custom Color';

  // 3. Resolve printing service details
  const printingService =
    supplier.printingServices.find((s) => s.code === 'DTG') ||
    supplier.printingServices[0] || {
      code: 'DTG',
      name: 'High-Definition Kornit Digital DTG',
      description: 'Water-based pigment direct-to-garment print',
      maxPrintWidthCm: 35.0,
      maxPrintHeightCm: 45.0,
    };

  const platenWidthCm = printingService.maxPrintWidthCm || 35.0;
  const platenHeightCm = printingService.maxPrintHeightCm || 45.0;

  // 4. Build artwork metadata lookup map from obligations
  interface ArtworkMeta {
    originalUrl?: string | null;
    previewUrl: string;
    mimeType: string;
    title: string;
    creatorName: string;
    creatorSlug?: string;
  }

  const artworkMap = new Map<string, ArtworkMeta>();

  for (const ob of order.obligations) {
    if (ob.artwork) {
      artworkMap.set(ob.artwork.id, {
        originalUrl: ob.artwork.originalUrl,
        previewUrl: ob.artwork.previewUrl,
        mimeType: ob.artwork.mimeType || 'image/png',
        title: ob.artwork.title,
        creatorName: ob.artwork.creator?.displayName || 'Creator',
        creatorSlug: ob.artwork.creator?.slug,
      });
    }
  }

  // 5. Parse design elements per surface
  const frontElements = safeParseElements(design.frontElements);
  const backElements = safeParseElements(design.backElements);
  const sideElements = safeParseElements(design.sideElements);

  // Batch query any missing artworks not captured in obligations
  const allArtworkIds = Array.from(
    new Set([
      ...frontElements.map((e) => e.artworkId),
      ...backElements.map((e) => e.artworkId),
      ...sideElements.map((e) => e.artworkId),
    ])
  ).filter((id) => Boolean(id) && !artworkMap.has(id));

  if (allArtworkIds.length > 0) {
    const missingArtworks = await prisma.artwork.findMany({
      where: { id: { in: allArtworkIds } },
      include: { creator: true },
    });
    for (const art of missingArtworks) {
      artworkMap.set(art.id, {
        originalUrl: art.originalUrl,
        previewUrl: art.previewUrl,
        mimeType: art.mimeType || 'image/png',
        title: art.title,
        creatorName: art.creator?.displayName || 'Creator',
        creatorSlug: art.creator?.slug,
      });
    }
  }

  // 6. Assemble surface jobs
  const surfaceConfigs: Array<{
    surface: PrintSurface;
    surfaceName: string;
    elements: DesignElement[];
  }> = [
    { surface: 'FRONT', surfaceName: 'Front Chest', elements: frontElements },
    { surface: 'BACK', surfaceName: 'Back Body', elements: backElements },
    { surface: 'SIDE', surfaceName: 'Side / Sleeve', elements: sideElements },
  ];

  const surfaces: ProductionSurfaceJob[] = [];
  const printedSurfaces: PrintSurface[] = [];
  let totalArtworksCount = 0;

  for (const cfg of surfaceConfigs) {
    if (cfg.elements.length === 0) continue;

    // Sort elements by zIndex ascending (bottom layers printed first)
    const sortedElements = [...cfg.elements].sort(
      (a, b) => (Number(a.zIndex) || 1) - (Number(b.zIndex) || 1)
    );

    const layers: ProductionArtworkLayer[] = sortedElements.map((el) => {
      const artMeta = artworkMap.get(el.artworkId);
      const title = artMeta?.title || el.title || 'Artwork';
      const creatorName = artMeta?.creatorName || el.creatorName || 'Creator';
      const previewUrl = artMeta?.previewUrl || el.previewUrl || '';
      // High-resolution reference: prefer originalUrl if present, fall back to previewUrl
      const highResAssetUrl = artMeta?.originalUrl || previewUrl;
      const mimeType = artMeta?.mimeType || 'image/png';

      const placement = computePlacement(el, platenWidthCm, platenHeightCm);

      return {
        elementId: el.id,
        artworkId: el.artworkId,
        licenseOptionId: el.licenseOptionId,
        title,
        creatorName,
        creatorSlug: artMeta?.creatorSlug,
        mimeType,
        assetUrl: highResAssetUrl,
        highResAssetUrl,
        previewUrl,
        placement,
      };
    });

    surfaces.push({
      surface: cfg.surface,
      surfaceName: cfg.surfaceName,
      printableAreaCm: {
        width: platenWidthCm,
        height: platenHeightCm,
      },
      artworkCount: layers.length,
      artworks: layers,
    });

    printedSurfaces.push(cfg.surface);
    totalArtworksCount += layers.length;
  }

  // 7. Calculate lead time & target shipment date
  const leadTimeDays = supplier.leadTimeDays || 4;
  const createdAtDate = new Date(order.createdAt);
  const targetShipDate = new Date(
    createdAtDate.getTime() + leadTimeDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // 8. Assemble final production package
  return {
    jobId: `JOB-${order.orderNumber}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderCreatedAt: order.createdAt.toISOString(),
    generatedAt: new Date().toISOString(),
    targetShipDate,
    supplier: {
      id: supplier.id,
      slug: supplier.slug,
      companyName: supplier.companyName,
      location: supplier.location,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      leadTimeDays,
    },
    garment: {
      productId: garmentProduct.id,
      blankSku: garmentProduct.sku,
      productName: garmentProduct.name,
      variantId: matchedVariant?.id || null,
      variantSku,
      colorName,
      colorHex: design.garmentColorHex,
      size: design.garmentSize,
      fit: design.garmentFit || garmentProduct.fit,
      neckline: garmentProduct.neckline,
      fabric: garmentProduct.fabric,
      weightGsm: garmentProduct.weightGsm,
      quantity: order.quantity,
    },
    printingTechnique: {
      code: printingService.code,
      name: printingService.name,
      description: printingService.description,
      maxPrintWidthCm: platenWidthCm,
      maxPrintHeightCm: platenHeightCm,
    },
    surfaces,
    shipping: {
      name: order.shippingName,
      address: order.shippingAddress,
      city: order.shippingCity,
      postalCode: order.shippingPostal,
      phone: order.shippingPhone,
    },
    summary: {
      totalUnits: order.quantity,
      surfacesCount: surfaces.length,
      totalArtworksCount,
      printedSurfaces,
    },
  };
}
