import { prisma } from '@/lib/prisma';
import { PricingPayload, PriceCalculationResult, PrintSurface } from '@/lib/types';

/**
 * Authoritative Server-Side Pricing Engine
 * Calculates exact garment, printing, licensing, packaging, and shipping costs.
 */
export async function calculateLivePricing(
  payload: PricingPayload
): Promise<PriceCalculationResult> {
  const {
    garmentProductId,
    garmentVariantId,
    quantity = 1,
    frontArtworkLicenses = [],
    backArtworkLicenses = [],
    sideArtworkLicenses = [],
  } = payload;

  const validQty = Math.max(1, Math.floor(quantity));

  // 1. Fetch Garment Product
  const garment = await prisma.garmentProduct.findUnique({
    where: { id: garmentProductId },
    include: {
      variants: true,
      supplier: {
        include: {
          printingServices: true,
        },
      },
    },
  });

  if (!garment) {
    throw new Error(`Garment product not found: ${garmentProductId}`);
  }

  // Check variant price adjustment if selected
  let variantAdjustment = 0;
  if (garmentVariantId) {
    const variant = garment.variants.find((v) => v.id === garmentVariantId);
    if (variant) {
      variantAdjustment = variant.priceAdjustment || 0;
    } else {
      throw new Error(`Garment variant not found: ${garmentVariantId}`);
    }
  }

  const garmentUnitPrice = garment.basePrice + variantAdjustment;
  const garmentCost = garmentUnitPrice * validQty;

  // 2. Printing Costs
  // Identify printed surfaces
  const surfacesUsed: PrintSurface[] = [];
  if (frontArtworkLicenses.length > 0) surfacesUsed.push('FRONT');
  if (backArtworkLicenses.length > 0) surfacesUsed.push('BACK');
  if (sideArtworkLicenses.length > 0) surfacesUsed.push('SIDE');

  // Default to FRONT surface if empty configuration
  const printSurfacesCount = Math.max(1, surfacesUsed.length);

  // Supplier DTG printing price per surface (Benchmark: THB 80)
  const dtgService = garment.supplier.printingServices.find((s) => s.code === 'DTG') ||
    garment.supplier.printingServices[0] || { pricePerSurface: 80 };

  const printPricePerSurface = dtgService.pricePerSurface;
  const printingCost = printPricePerSurface * printSurfacesCount * validQty;

  // 3. Packaging & Shipping Costs (Benchmark: Pack ฿15, Ship ฿40)
  const packagingCost = garment.packagingPrice * validQty;
  const shippingCost = garment.shippingPrice; // flat per shipment for MVP

  // 4. Artwork Licensing Costs
  const allLicenses = [
    ...frontArtworkLicenses,
    ...backArtworkLicenses,
    ...sideArtworkLicenses,
  ];

  const artworkBreakdown: Array<{
    artworkId: string;
    title: string;
    creatorName: string;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  let licensingCost = 0;

  for (const item of allLicenses) {
    if (!item.licenseOptionId) {
      throw new Error('Missing licenseOptionId in artwork license line');
    }

    const license = await prisma.licenseOption.findUnique({
      where: { id: item.licenseOptionId },
      include: {
        artwork: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!license) {
      throw new Error(`License option not found: ${item.licenseOptionId}`);
    }

    if (item.artworkId && license.artworkId !== item.artworkId) {
      throw new Error(
        `License option ${item.licenseOptionId} does not belong to artwork ${item.artworkId}`
      );
    }

    const unitPrice = license.price;
    const itemTotal = unitPrice * validQty;
    licensingCost += itemTotal;

    artworkBreakdown.push({
      artworkId: license.artworkId,
      title: license.artwork.title,
      creatorName: license.artwork.creator.displayName,
      unitPrice,
      totalPrice: itemTotal,
    });
  }

  // 5. Final Authoritative Total
  const totalAmount =
    garmentCost + printingCost + licensingCost + packagingCost + shippingCost;

  return {
    garmentCost,
    printingCost,
    licensingCost,
    packagingCost,
    shippingCost,
    totalAmount,
    quantity: validQty,
    surfacesUsed,
    breakdown: {
      garmentBasePrice: garmentUnitPrice,
      printPricePerSurface,
      surfacesCount: printSurfacesCount,
      packagingPerUnit: garment.packagingPrice,
      shippingBase: garment.shippingPrice,
      artworkLicenses: artworkBreakdown,
    },
  };
}
