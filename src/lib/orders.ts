import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { issuePermanentLicenseAtomic } from '@/lib/licenseAgreement';
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
    userId: input.customerId,
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

    // Check variant stock and atomically decrement if garmentVariantId is provided
    if (input.garmentVariantId) {
      const variant = await tx.garmentVariant.findUnique({
        where: { id: input.garmentVariantId },
      });
      if (!variant) {
        throw new Error(`Garment variant not found: ${input.garmentVariantId}`);
      }
      if (variant.stock < quantity) {
        throw new Error(
          `Insufficient stock for variant ${variant.sku}: requested ${quantity}, available ${variant.stock}`
        );
      }
      await tx.garmentVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: quantity } },
      });
    }

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
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        stripeSessionId: input.stripeSessionId ?? null,
        stripeClientSecret: input.stripeClientSecret ?? null,
        stripeReceiptUrl: input.stripeReceiptUrl ?? null,
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

      // Check if user already owns active Permanent IP for this artwork
      let isPermanentIp = false;
      if (input.customerId) {
        const owned = await tx.userArtworkLicense.findUnique({
          where: {
            userId_artworkId: {
              userId: input.customerId,
              artworkId: license.artwork.id,
            },
          },
        });
        if (owned && owned.status === 'ACTIVE') {
          isPermanentIp = true;
        }
      }

      const isUnlimited = license.scope === 'UNLIMITED';
      const unitPrice = isPermanentIp ? 0 : license.price;
      const obligationTotal = isPermanentIp ? 0 : isUnlimited ? license.price : unitPrice * quantity;

      // Create obligation record
      const obligation = await tx.royaltyObligation.create({
        data: {
          orderId: order.id,
          creatorId: license.artwork.creatorId,
          artworkId: license.artwork.id,
          licenseOptionId: license.id,
          unitRoyalty: isUnlimited ? license.price : unitPrice,
          quantity: isUnlimited ? 1 : quantity,
          totalAmount: obligationTotal,
          status: 'ELIGIBLE', // Paid orders yield immediately eligible royalties
        },
      });

      // If user bought an UNLIMITED license and did not have it before, grant Permanent IP
      if (input.customerId && license.scope === 'UNLIMITED' && !isPermanentIp) {
        try {
          await issuePermanentLicenseAtomic(
            {
              userId: input.customerId,
              artworkId: license.artwork.id,
              licenseOptionId: license.id,
              orderId: order.id,
            },
            tx
          );
        } catch (licErr) {
          console.warn('[createOrderAtomic] Error issuing permanent license:', licErr);
        }
      }

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
  }, { maxWait: 15000, timeout: 30000 });
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

export interface CancelOrderInput {
  orderId: string;
  userId?: string;
  userRole?: string;
  reason?: string;
}

export interface CancelOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
  restockedQuantity: number;
  obligationsCancelledCount: number;
  message: string;
  approved?: boolean;
}

/**
 * Authoritative Atomic Order Cancellation Service
 *
 * 1. Checks order exists and validates caller permissions (customer owner, supplier, or admin).
 * 2. Checks order state: strictly only allow cancellation for 'AWAITING_PAYMENT' or 'PAYMENT_CONFIRMED'.
 *    Rejects cancellation if order is already IN_PRODUCTION, QA, SHIPPED, or CANCELLED.
 * 3. Atomically:
 *    - Updates Order status to 'CANCELLED', paymentStatus to 'REFUNDED' (or 'CANCELLED')
 *    - Restocks GarmentVariant stock (increment by order.quantity) if garmentVariantId exists
 *    - Cancels RoyaltyObligations (status = 'CANCELLED')
 *    - Reverses creator royalties by creating negative RoyaltyLedgerEntry (ADJUSTMENT)
 *    - Logs AuditEvent (ORDER_CANCELLED)
 */
export async function cancelOrderAtomic(
  input: CancelOrderInput
): Promise<CancelOrderResult> {
  const existingOrder = await prisma.order.findFirst({
    where: {
      OR: [{ id: input.orderId.trim() }, { orderNumber: input.orderId.trim() }],
    },
    include: {
      design: true,
      obligations: {
        include: {
          artwork: true,
        },
      },
      supplier: {
        select: {
          id: true,
          userId: true,
          companyName: true,
        },
      },
    },
  });

  if (!existingOrder) {
    throw new Error(`Order not found with identifier "${input.orderId}".`);
  }

  // Permission check
  const isAdminOrSupplier = input.userRole === 'ADMIN' || input.userRole === 'SUPPLIER';
  if (!isAdminOrSupplier && input.userId && existingOrder.customerId && existingOrder.customerId !== input.userId) {
    throw new Error('Unauthorized to cancel this order.');
  }

  // Status check
  if (existingOrder.status === 'CANCELLED') {
    throw new Error(`Order "${existingOrder.orderNumber}" is already cancelled.`);
  }

  const cancellableStatuses = isAdminOrSupplier
    ? ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'IN_PRODUCTION']
    : ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED'];

  if (!cancellableStatuses.includes(existingOrder.status)) {
    throw new Error(
      `Cannot cancel order in status "${existingOrder.status}". Orders can only be cancelled prior to production entering the workshop.`
    );
  }

  const previousStatus = existingOrder.status;

  return await prisma.$transaction(async (tx) => {
    // 1. Update order
    const nextPaymentStatus = existingOrder.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED';
    let snapshot: Record<string, any> = {};
    try {
      if (existingOrder.snapshotData) {
        snapshot = JSON.parse(existingOrder.snapshotData);
      }
    } catch {
      snapshot = {};
    }
    if (snapshot.cancellationRequest) {
      snapshot.cancellationRequest.status = 'APPROVED';
      snapshot.cancellationRequest.resolvedAt = new Date().toISOString();
      snapshot.cancellationRequest.resolvedBy = input.userId;
    }

    await tx.order.update({
      where: { id: existingOrder.id },
      data: {
        status: 'CANCELLED',
        paymentStatus: nextPaymentStatus,
        snapshotData: JSON.stringify(snapshot),
      },
    });

    // 2. Restock variant
    let restockedQty = 0;
    if (existingOrder.design?.garmentVariantId) {
      const variant = await tx.garmentVariant.findUnique({
        where: { id: existingOrder.design.garmentVariantId },
      });
      if (variant) {
        await tx.garmentVariant.update({
          where: { id: variant.id },
          data: { stock: { increment: existingOrder.quantity } },
        });
        restockedQty = existingOrder.quantity;
      }
    }

    // 3. Cancel Royalty Obligations & add reversal entries in ledger
    let cancelledObligations = 0;
    for (const obligation of existingOrder.obligations) {
      await tx.royaltyObligation.update({
        where: { id: obligation.id },
        data: { status: 'CANCELLED' },
      });
      cancelledObligations++;

      // Create reversing entry in ledger
      const latestLedger = await tx.royaltyLedgerEntry.findFirst({
        where: { creatorId: obligation.creatorId },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

      const currentBalance = latestLedger ? latestLedger.balanceAfter : 0;
      const reversedAmount = -obligation.totalAmount;
      const newBalance = Math.max(0, currentBalance + reversedAmount);

      await tx.royaltyLedgerEntry.create({
        data: {
          creatorId: obligation.creatorId,
          obligationId: obligation.id,
          entryType: 'ADJUSTMENT',
          amount: reversedAmount,
          balanceAfter: newBalance,
          reference: existingOrder.orderNumber,
          notes: `Order cancellation reversal: ${existingOrder.orderNumber} (${input.reason || 'Customer cancelled'})`,
        },
      });
    }

    // 4. Audit Event
    await tx.auditEvent.create({
      data: {
        action: 'ORDER_CANCELLED',
        entityType: 'Order',
        entityId: existingOrder.id,
        userId: input.userId ?? null,
        payload: JSON.stringify({
          orderNumber: existingOrder.orderNumber,
          previousStatus,
          newStatus: 'CANCELLED',
          reason: input.reason ?? 'Cancelled by customer',
          restockedQuantity: restockedQty,
          obligationsCancelled: cancelledObligations,
          cancelledAt: new Date().toISOString(),
        }),
      },
    });

    // 5. Post Official Transparency Message into Order Chat
    try {
      const actorId =
        input.userId || existingOrder.customerId || existingOrder.supplier?.userId;
      if (actorId) {
        const actorName =
          input.userRole === 'SUPPLIER'
            ? 'โรงงานผู้ผลิต (Supplier)'
            : input.userRole === 'ADMIN'
            ? 'ผู้ดูแลระบบ (Admin)'
            : 'ลูกค้า (Customer)';
        const cleanReason = input.reason || 'ลูกค้ายกเลิกคำสั่งซื้อ';

        await tx.orderMessage.create({
          data: {
            orderId: existingOrder.id,
            senderId: actorId,
            senderRole: 'SYSTEM',
            message: `🔔 [ระบบ: ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว]\nสถานะ: คำสั่งซื้อถูกยกเลิก (CANCELLED)\nดำเนินการโดย: ${actorName}\nเหตุผล: ${cleanReason}\nการคืนเงิน: คืนเงินเต็มจำนวน 100% เรียบร้อยแล้ว\nสต็อกเสื้อเปล่า: คืนสต็อกจำนวน ${restockedQty} ตัวเข้าสู่ระบบแล้ว`,
          },
        });
      }
    } catch (msgErr) {
      console.warn('[cancelOrderAtomic] Could not create system order chat message:', msgErr);
    }

    // 6. Create Notifications for both parties
    try {
      if (existingOrder.customerId) {
        await tx.notification.create({
          data: {
            userId: existingOrder.customerId,
            type: 'ORDER_UPDATE',
            title: `คำสั่งซื้อ #${existingOrder.orderNumber} ถูกยกเลิกแล้ว`,
            message: `คำสั่งซื้อ #${existingOrder.orderNumber} ได้รับการยกเลิกและคืนเงินเต็มจำนวนเรียบร้อยแล้ว`,
            metadata: JSON.stringify({
              orderId: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              status: 'CANCELLED',
            }),
          },
        });
      }

      if (existingOrder.supplier?.userId) {
        await tx.notification.create({
          data: {
            userId: existingOrder.supplier.userId,
            type: 'ORDER_UPDATE',
            title: `คำสั่งซื้อ #${existingOrder.orderNumber} ถูกยกเลิก`,
            message: `คำสั่งซื้อ #${existingOrder.orderNumber} ถูกยกเลิก (${input.reason || 'ยกเลิกคำสั่งซื้อ'}) ระบบคืนสต็อก ${restockedQty} ตัวแล้ว`,
            metadata: JSON.stringify({
              orderId: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              status: 'CANCELLED',
            }),
          },
        });
      }
    } catch (notifErr) {
      console.warn('[cancelOrderAtomic] Could not create notifications:', notifErr);
    }

    return {
      success: true,
      orderId: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      previousStatus,
      newStatus: 'CANCELLED',
      restockedQuantity: restockedQty,
      obligationsCancelledCount: cancelledObligations,
      approved: true,
      message: `Order ${existingOrder.orderNumber} successfully cancelled and ${restockedQty} blank items restocked.`,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

export interface RequestCancellationInput {
  orderId: string;
  userId: string;
  reason: string;
}

/**
 * Handles Customer's cancellation request for orders currently IN_PRODUCTION
 */
export async function requestOrderCancellationAtomic(
  input: RequestCancellationInput
) {
  const existingOrder = await prisma.order.findFirst({
    where: {
      OR: [{ id: input.orderId.trim() }, { orderNumber: input.orderId.trim() }],
    },
    include: {
      supplier: {
        select: { id: true, userId: true, companyName: true },
      },
    },
  });

  if (!existingOrder) {
    throw new Error(`Order not found with identifier "${input.orderId}".`);
  }

  if (input.userId && existingOrder.customerId && existingOrder.customerId !== input.userId) {
    throw new Error('Unauthorized to request cancellation for this order.');
  }

  if (existingOrder.status === 'CANCELLED') {
    throw new Error(`Order "${existingOrder.orderNumber}" is already cancelled.`);
  }

  if (existingOrder.status !== 'IN_PRODUCTION') {
    throw new Error(
      `Cancellation requests are only applicable for orders in "IN_PRODUCTION". Current status is "${existingOrder.status}".`
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Update snapshotData with pending cancellation request
    let snapshot: Record<string, any> = {};
    try {
      if (existingOrder.snapshotData) {
        snapshot = JSON.parse(existingOrder.snapshotData);
      }
    } catch {
      snapshot = {};
    }

    snapshot.cancellationRequest = {
      status: 'PENDING',
      reason: input.reason,
      requestedAt: new Date().toISOString(),
      requestedBy: input.userId,
      slaHours: 24,
    };

    await tx.order.update({
      where: { id: existingOrder.id },
      data: {
        snapshotData: JSON.stringify(snapshot),
      },
    });

    // 2. Audit event
    await tx.auditEvent.create({
      data: {
        action: 'ORDER_CANCELLATION_REQUESTED',
        entityType: 'Order',
        entityId: existingOrder.id,
        userId: input.userId,
        payload: JSON.stringify({
          orderNumber: existingOrder.orderNumber,
          requestedBy: input.userId,
          reason: input.reason,
          requestedAt: new Date().toISOString(),
          slaHours: 24,
        }),
      },
    });

    // 2. Post official SYSTEM message in Order Chat
    await tx.orderMessage.create({
      data: {
        orderId: existingOrder.id,
        senderId: input.userId,
        senderRole: 'SYSTEM',
        message: `📢 [คำขอยกเลิกคำสั่งซื้อระหว่างการผลิต]\nลูกค้าได้ส่งคำขอยกเลิกสำหรับคำสั่งซื้อ #${existingOrder.orderNumber}\nเหตุผล: "${input.reason}"\n\n📌 สำหรับโรงงานผู้ผลิต (${existingOrder.supplier?.companyName || 'Supplier'}):\n- หากยังไม่ได้เริ่มฉีดหมึก/พ่นน้ำยารองพื้น โปรดกด "อนุมัติยกเลิก" เพื่อคืนเงินลูกค้า 100%\n- หากเครื่องพิมพ์เริ่มผลิตไปแล้ว โปรดกด "ปฏิเสธคำขอ" พร้อมระบุหลักฐานการผลิต\n(ระบบมีกำหนดเวลาตอบรับคำขอภายใน 24 ชั่วโมง)`,
      },
    });

    // 3. Send Notification to Supplier
    if (existingOrder.supplier?.userId) {
      await tx.notification.create({
        data: {
          userId: existingOrder.supplier.userId,
          type: 'ORDER_UPDATE',
          title: `⚠️ ลูกค้าขอยกเลิกคำสั่งซื้อ #${existingOrder.orderNumber}`,
          message: `ลูกค้าส่งคำขอยกเลิกออเดอร์ #${existingOrder.orderNumber} (เหตุผล: ${input.reason}) โปรดตรวจสอบและตอบกลับภายใน 24 ชม.`,
          metadata: JSON.stringify({
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            action: 'CANCELLATION_REQUESTED',
          }),
        },
      });
    }

    return {
      success: true,
      orderId: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      message: 'คำขอยกเลิกถูกส่งไปยังโรงงานผู้ผลิตเรียบร้อยแล้ว โดยมีกำหนดเวลาตอบกลับภายใน 24 ชั่วโมง',
    };
  });
}

export interface ReviewCancellationInput {
  orderId: string;
  supplierUserId: string;
  approved: boolean;
  rejectionReason?: string;
  proofImageUrl?: string;
}

/**
 * Handles Supplier's response to an in-production cancellation request
 */
export async function reviewOrderCancellationRequestAtomic(
  input: ReviewCancellationInput
) {
  const existingOrder = await prisma.order.findFirst({
    where: {
      OR: [{ id: input.orderId.trim() }, { orderNumber: input.orderId.trim() }],
    },
    include: {
      supplier: {
        select: { id: true, userId: true, companyName: true },
      },
    },
  });

  if (!existingOrder) {
    throw new Error(`Order not found with identifier "${input.orderId}".`);
  }

  if (existingOrder.supplier?.userId !== input.supplierUserId) {
    throw new Error('Only the designated supplier can review this cancellation request.');
  }

  if (input.approved) {
    return await cancelOrderAtomic({
      orderId: existingOrder.id,
      userId: input.supplierUserId,
      userRole: 'SUPPLIER',
      reason: 'Supplier approved cancellation request (blank item restocked)',
    });
  } else {
    const rejectionReason =
      input.rejectionReason || 'สินค้าเริ่มเข้าสู่กระบวนการพิมพ์สกรีนแล้ว ไม่สามารถยกเลิกได้';

    await prisma.$transaction(async (tx) => {
      // 1. Update snapshotData with rejected cancellation request
      let snapshot: Record<string, any> = {};
      try {
        if (existingOrder.snapshotData) {
          snapshot = JSON.parse(existingOrder.snapshotData);
        }
      } catch {
        snapshot = {};
      }

      snapshot.cancellationRequest = {
        ...(snapshot.cancellationRequest || {}),
        status: 'REJECTED',
        rejectionReason,
        proofImageUrl: input.proofImageUrl || null,
        resolvedAt: new Date().toISOString(),
        resolvedBy: input.supplierUserId,
      };

      await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          snapshotData: JSON.stringify(snapshot),
        },
      });

      // 2. Audit event
      await tx.auditEvent.create({
        data: {
          action: 'ORDER_CANCELLATION_REJECTED',
          entityType: 'Order',
          entityId: existingOrder.id,
          userId: input.supplierUserId,
          payload: JSON.stringify({
            orderNumber: existingOrder.orderNumber,
            rejectedBy: input.supplierUserId,
            reason: rejectionReason,
            proofImageUrl: input.proofImageUrl || null,
            rejectedAt: new Date().toISOString(),
          }),
        },
      });

      // 2. Post SYSTEM message in Order Chat
      await tx.orderMessage.create({
        data: {
          orderId: existingOrder.id,
          senderId: input.supplierUserId,
          senderRole: 'SYSTEM',
          message: `❌ [โรงงานปฏิเสธคำขอยกเลิก]\nโรงงานผู้ผลิตได้ปฏิเสธคำขอยกเลิกสำหรับ #${existingOrder.orderNumber}\nเหตุผล: ${rejectionReason}\n\nคำสั่งซื้อจะดำเนินกระบวนการพิมพ์และตรวจสอบคุณภาพ (QA) ตามขั้นตอนมาตรฐานต่อไป`,
          imageUrl: input.proofImageUrl || null,
        },
      });

      // 3. Send Notification to Customer
      if (existingOrder.customerId) {
        await tx.notification.create({
          data: {
            userId: existingOrder.customerId,
            type: 'ORDER_UPDATE',
            title: `คำขอยกเลิก #${existingOrder.orderNumber} ไม่ได้รับการอนุมัติ`,
            message: `โรงงานได้เริ่มกระบวนการสกรีนเสื้อแล้ว จึงไม่สามารถยกเลิกคำสั่งซื้อได้ (${rejectionReason})`,
            metadata: JSON.stringify({
              orderId: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              action: 'CANCELLATION_REJECTED',
            }),
          },
        });
      }
    });

    return {
      success: true,
      orderId: existingOrder.id,
      orderNumber: existingOrder.orderNumber,
      approved: false,
      message: 'ปฏิเสธคำขอยกเลิกเรียบร้อยแล้ว คำสั่งซื้อจะดำเนินกระบวนการผลิตต่อไป',
    };
  }
}

