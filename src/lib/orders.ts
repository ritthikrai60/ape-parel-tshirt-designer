import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import {
  CreateOrderInput,
  CreateOrderResult,
  ArtworkLicenseLine,
} from '@/lib/types';

/**
 * Generates a unique human-readable order number.
 * Format: APX-ORD-XXXX-YYYY (e.g. APX-ORD-9021-4821)
 */
function generateOrderNumber(): string {
  const timePart = Date.now().toString().slice(-4);
  const randPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `APX-ORD-${timePart}-${randPart}`;
}

/**
 * Authoritative Atomic Order Placement Service
 *
 * 1. Recalculates exact pricing server-side using calculateLivePricing.
 * 2. Rejects client-side price tampering if clientClaimedTotal is provided and mismatched.
 * 3. Atomically commits DesignDocument, Order, RoyaltyObligation[],
 *    and RoyaltyLedgerEntry[] in a single Prisma transaction.
 */
export async function createOrderAtomic(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));

  // Extract artwork license lines from explicit licenses or design elements
  const frontLicenses: ArtworkLicenseLine[] =
    input.frontArtworkLicenses ??
    input.frontElements?.map((e) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    })) ??
    [];

  const backLicenses: ArtworkLicenseLine[] =
    input.backArtworkLicenses ??
    input.backElements?.map((e) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    })) ??
    [];

  const sideLicenses: ArtworkLicenseLine[] =
    input.sideArtworkLicenses ??
    input.sideElements?.map((e) => ({
      artworkId: e.artworkId,
      licenseOptionId: e.licenseOptionId,
    })) ??
    [];

  // 1. Authoritative Server-Side Pricing Recalculation
  const pricing = await calculateLivePricing({
    garmentProductId: input.garmentProductId,
    garmentVariantId: input.garmentVariantId,
    quantity,
    frontArtworkLicenses: frontLicenses,
    backArtworkLicenses: backLicenses,
    sideArtworkLicenses: sideLicenses,
  });

  // 2. Anti-Tampering Price Validation
  if (
    input.clientClaimedTotal !== undefined &&
    input.clientClaimedTotal !== null &&
    input.clientClaimedTotal !== pricing.totalAmount
  ) {
    throw new Error(
      `Price tampering detected: client claimed total ${input.clientClaimedTotal} THB does not match server authoritative total ${pricing.totalAmount} THB`
    );
  }

  // 3. Atomic Database Execution via Prisma Transaction
  return await prisma.$transaction(async (tx) => {
    // Diagnostic hook for testing transaction rollback
    if (input._simulateFailureAtStep === 'design') {
      throw new Error('Simulated failure before DesignDocument creation');
    }

    // Look up garment and verified supplier profile
    const garment = await tx.garmentProduct.findUniqueOrThrow({
      where: { id: input.garmentProductId },
      select: { id: true, sku: true, name: true, supplierId: true },
    });

    // 3a. Create DesignDocument
    const design = await tx.designDocument.create({
      data: {
        userId: input.customerId ?? null,
        title: input.designTitle ?? 'Custom Tee',
        garmentProductId: input.garmentProductId,
        garmentVariantId: input.garmentVariantId ?? null,
        garmentColorHex: input.garmentColorHex ?? '#131718',
        garmentSize: input.garmentSize ?? 'L',
        garmentFit: input.garmentFit ?? 'oversized',
        frontElements: JSON.stringify(input.frontElements ?? []),
        backElements: JSON.stringify(input.backElements ?? []),
        sideElements: JSON.stringify(input.sideElements ?? []),
        previewFrontUrl: input.previewFrontUrl ?? null,
        previewBackUrl: input.previewBackUrl ?? null,
        status: 'ORDERED',
      },
    });

    // Diagnostic hook for testing transaction rollback
    if (input._simulateFailureAtStep === 'order') {
      throw new Error('Simulated failure before Order creation');
    }

    // 3b. Create Order
    const orderNumber = generateOrderNumber();
    const paymentStatus = input.paymentStatus ?? 'PAID';
    const orderStatus =
      paymentStatus === 'PAID' ? 'PAYMENT_CONFIRMED' : 'AWAITING_PAYMENT';

    const snapshotData = JSON.stringify({
      garmentSku: garment.sku,
      garmentName: garment.name,
      colorHex: input.garmentColorHex ?? '#131718',
      size: input.garmentSize ?? 'L',
      fit: input.garmentFit ?? 'oversized',
      quantity,
      pricing: {
        garmentCost: pricing.garmentCost,
        printingCost: pricing.printingCost,
        licensingCost: pricing.licensingCost,
        packagingCost: pricing.packagingCost,
        shippingCost: pricing.shippingCost,
        totalAmount: pricing.totalAmount,
      },
      surfaces: pricing.surfacesUsed,
      artworkLicenses: pricing.breakdown.artworkLicenses,
      createdAt: new Date().toISOString(),
    });

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId ?? null,
        designId: design.id,
        supplierId: garment.supplierId,
        quantity,
        status: orderStatus,
        paymentMode: input.paymentMode ?? 'DEV_MOCK',
        paymentStatus,
        totalAmount: pricing.totalAmount,
        garmentCost: pricing.garmentCost,
        printingCost: pricing.printingCost,
        licensingCost: pricing.licensingCost,
        packagingCost: pricing.packagingCost,
        shippingCost: pricing.shippingCost,
        shippingName: input.shippingName,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingPostal: input.shippingPostal,
        shippingPhone: input.shippingPhone ?? null,
        snapshotData,
      },
    });

    // Diagnostic hook for testing transaction rollback
    if (input._simulateFailureAtStep === 'obligation') {
      throw new Error('Simulated failure before RoyaltyObligation creation');
    }

    // 3c. Create RoyaltyObligations & RoyaltyLedgerEntries
    const allLicenseLines = [
      ...frontLicenses,
      ...backLicenses,
      ...sideLicenses,
    ];

    const createdObligations: Array<{
      id: string;
      artworkId: string;
      creatorId: string;
      unitRoyalty: number;
      totalAmount: number;
      status: string;
    }> = [];

    // Map to maintain running cumulative balance per creator during this transaction
    const creatorRunningBalances = new Map<string, number>();

    for (const line of allLicenseLines) {
      const license = await tx.licenseOption.findUniqueOrThrow({
        where: { id: line.licenseOptionId },
        include: {
          artwork: {
            include: {
              creator: true,
            },
          },
        },
      });

      const obligationTotal = license.price * quantity;

      // Create obligation record
      const obligation = await tx.royaltyObligation.create({
        data: {
          orderId: order.id,
          creatorId: license.artwork.creatorId,
          artworkId: license.artwork.id,
          licenseOptionId: license.id,
          unitRoyalty: license.price,
          quantity,
          totalAmount: obligationTotal,
          status: 'ELIGIBLE', // Paid orders yield immediately eligible royalties
        },
      });

      createdObligations.push({
        id: obligation.id,
        artworkId: obligation.artworkId,
        creatorId: obligation.creatorId,
        unitRoyalty: obligation.unitRoyalty,
        totalAmount: obligation.totalAmount,
        status: obligation.status,
      });

      // Diagnostic hook for testing transaction rollback
      if (input._simulateFailureAtStep === 'ledger') {
        throw new Error('Simulated failure during RoyaltyLedgerEntry creation');
      }

      // Query or update running balance for this creator
      const creatorId = license.artwork.creatorId;
      let currentBalance = creatorRunningBalances.get(creatorId);

      if (currentBalance === undefined) {
        const latestLedgerEntry = await tx.royaltyLedgerEntry.findFirst({
          where: { creatorId },
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
        });
        currentBalance = latestLedgerEntry ? latestLedgerEntry.balanceAfter : 0;
      }

      const newBalance = currentBalance + obligationTotal;
      creatorRunningBalances.set(creatorId, newBalance);

      // Create immutable audit ledger entry
      await tx.royaltyLedgerEntry.create({
        data: {
          creatorId,
          obligationId: obligation.id,
          entryType: 'EARNING',
          amount: obligationTotal,
          balanceAfter: newBalance,
          reference: order.orderNumber,
          notes: `Order ${order.orderNumber}: License for ${license.artwork.title}`,
        },
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      designId: design.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      costs: {
        garmentCost: order.garmentCost,
        printingCost: order.printingCost,
        licensingCost: order.licensingCost,
        packagingCost: order.packagingCost,
        shippingCost: order.shippingCost,
      },
      obligationsCount: createdObligations.length,
      ledgerEntriesCount: createdObligations.length,
      obligations: createdObligations,
      order,
    };
  });
}

/**
 * Helper to fetch order by ID or orderNumber with full relations
 */
export async function getOrderByIdOrNumber(idOrNumber: string) {
  return await prisma.order.findFirst({
    where: {
      OR: [
        { id: idOrNumber },
        { orderNumber: idOrNumber },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      supplier: {
        select: {
          id: true,
          slug: true,
          companyName: true,
          location: true,
        },
      },
      design: {
        include: {
          garmentProduct: true,
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
}
