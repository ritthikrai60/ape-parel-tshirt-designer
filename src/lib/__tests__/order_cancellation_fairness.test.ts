import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createOrderAtomic,
  cancelOrderAtomic,
  requestOrderCancellationAtomic,
  reviewOrderCancellationRequestAtomic,
} from '@/lib/orders';

describe('Dispute-Free Order Cancellation & In-Production Request Suite', () => {
  let customerUser: any;
  let supplierBangkok: any;
  let garmentApex: any;
  let testArtwork: any;
  let testLicense: any;
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    customerUser = await prisma.user.findFirst({
      where: { email: 'customer@ape-parel.com' },
    });

    supplierBangkok = await prisma.supplierProfile.findFirst({
      where: { slug: 'bangkok-garment-craft' },
      include: { products: { include: { variants: true } } },
    });

    if (!customerUser || !supplierBangkok) {
      throw new Error('Seed data missing for customer or supplier');
    }

    garmentApex = supplierBangkok.products[0];
    testArtwork = await prisma.artwork.findFirst({
      where: { status: 'PUBLISHED' },
      include: { licenseOptions: true },
    });

    if (!testArtwork || testArtwork.licenseOptions.length === 0) {
      throw new Error('Seed artwork missing');
    }
    testLicense = testArtwork.licenseOptions[0];
  });

  afterAll(async () => {
    for (const id of createdOrderIds) {
      try {
        await prisma.orderMessage.deleteMany({ where: { orderId: id } });
        await prisma.royaltyLedgerEntry.deleteMany({ where: { reference: { contains: id } } });
        await prisma.royaltyObligation.deleteMany({ where: { orderId: id } });
        await prisma.order.delete({ where: { id } });
      } catch (e) {
        // ignore
      }
    }
  });

  it('allows instant 100% cancellation before production (PAYMENT_CONFIRMED) and logs SYSTEM chat message', async () => {
    const orderRes = await createOrderAtomic({
      customerId: customerUser.id,
      garmentProductId: garmentApex.id,
      garmentVariantId: garmentApex.variants[0].id,
      quantity: 1,
      shippingName: 'Test Customer',
      shippingAddress: '123 Sukhumvit Road',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      paymentMode: 'DEV_MOCK',
      frontArtworkLicenses: [
        {
          artworkId: testArtwork.id,
          licenseOptionId: testLicense.id,
        },
      ],
    });

    createdOrderIds.push(orderRes.order.id);

    // Cancel order
    const cancelRes = await cancelOrderAtomic({
      orderId: orderRes.order.id,
      userId: customerUser.id,
      userRole: 'CUSTOMER',
      reason: 'Customer changed mind before production',
    });

    expect(cancelRes.success).toBe(true);
    expect(cancelRes.newStatus).toBe('CANCELLED');

    // Check system message in OrderChat
    const messages = await prisma.orderMessage.findMany({
      where: { orderId: orderRes.order.id },
    });
    expect(messages.some((m) => m.senderRole === 'SYSTEM' && m.message.includes('ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว'))).toBe(true);
  });

  it('rejects direct customer cancel in IN_PRODUCTION but accepts cancellation request for supplier review', async () => {
    const orderRes = await createOrderAtomic({
      customerId: customerUser.id,
      garmentProductId: garmentApex.id,
      garmentVariantId: garmentApex.variants[0].id,
      quantity: 1,
      shippingName: 'Test Customer',
      shippingAddress: '123 Sukhumvit Road',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      paymentMode: 'DEV_MOCK',
      frontArtworkLicenses: [
        {
          artworkId: testArtwork.id,
          licenseOptionId: testLicense.id,
        },
      ],
    });

    createdOrderIds.push(orderRes.order.id);

    // Transition to IN_PRODUCTION
    await prisma.order.update({
      where: { id: orderRes.order.id },
      data: { status: 'IN_PRODUCTION' },
    });

    // 1. Direct customer cancel must be rejected
    await expect(
      cancelOrderAtomic({
        orderId: orderRes.order.id,
        userId: customerUser.id,
        userRole: 'CUSTOMER',
        reason: 'Attempted direct cancel during printing',
      })
    ).rejects.toThrow(/prior to production entering the workshop/i);

    // 2. Customer submits cancellation request
    const requestRes = await requestOrderCancellationAtomic({
      orderId: orderRes.order.id,
      userId: customerUser.id,
      reason: 'Need to change artwork before printing',
    });

    expect(requestRes.success).toBe(true);

    // Verify SYSTEM request message in chat
    const messages = await prisma.orderMessage.findMany({
      where: { orderId: orderRes.order.id },
    });
    expect(messages.some((m) => m.senderRole === 'SYSTEM' && m.message.includes('คำขอยกเลิกคำสั่งซื้อระหว่างการผลิต'))).toBe(true);

    // 3. Supplier reviews and approves (has not printed yet)
    const reviewRes = await reviewOrderCancellationRequestAtomic({
      orderId: orderRes.order.id,
      supplierUserId: supplierBangkok.userId,
      approved: true,
    });

    expect(reviewRes.success).toBe(true);
    expect((reviewRes as any).newStatus).toBe('CANCELLED');

    // Verify order is now cancelled and refunded
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderRes.order.id },
    });
    expect(updatedOrder?.status).toBe('CANCELLED');
    expect(updatedOrder?.paymentStatus).toBe('REFUNDED');
    const snapshot = JSON.parse(updatedOrder?.snapshotData || '{}');
    expect(snapshot.cancellationRequest?.status).toBe('APPROVED');
  });

  it('handles supplier rejection of cancellation request when printing has started and persists rejection proof in snapshotData', async () => {
    const orderRes = await createOrderAtomic({
      customerId: customerUser.id,
      garmentProductId: garmentApex.id,
      garmentVariantId: garmentApex.variants[0].id,
      quantity: 1,
      shippingName: 'Test Customer 2',
      shippingAddress: '456 Silom Road',
      shippingCity: 'Bangkok',
      shippingPostal: '10500',
      paymentMode: 'DEV_MOCK',
      frontArtworkLicenses: [
        {
          artworkId: testArtwork.id,
          licenseOptionId: testLicense.id,
        },
      ],
    });

    createdOrderIds.push(orderRes.order.id);

    // Transition to IN_PRODUCTION
    await prisma.order.update({
      where: { id: orderRes.order.id },
      data: { status: 'IN_PRODUCTION' },
    });

    // Customer requests cancel
    await requestOrderCancellationAtomic({
      orderId: orderRes.order.id,
      userId: customerUser.id,
      reason: 'Change size please',
    });

    // Supplier rejects with proof
    const reviewRes = await reviewOrderCancellationRequestAtomic({
      orderId: orderRes.order.id,
      supplierUserId: supplierBangkok.userId,
      approved: false,
      rejectionReason: 'ชิ้นงานพ่นหมึก DTG บนเสื้อไปแล้ว ไม่สามารถยกเลิกได้',
      proofImageUrl: 'https://storage.example.com/proofs/printed_123.jpg',
    });

    expect(reviewRes.success).toBe(true);
    expect(reviewRes.approved).toBe(false);

    // Order status should stay IN_PRODUCTION
    const orderAfterReject = await prisma.order.findUnique({
      where: { id: orderRes.order.id },
    });
    expect(orderAfterReject?.status).toBe('IN_PRODUCTION');

    // Snapshot data records rejection details
    const snap = JSON.parse(orderAfterReject?.snapshotData || '{}');
    expect(snap.cancellationRequest?.status).toBe('REJECTED');
    expect(snap.cancellationRequest?.rejectionReason).toContain('ชิ้นงานพ่นหมึก DTG');
    expect(snap.cancellationRequest?.proofImageUrl).toBe('https://storage.example.com/proofs/printed_123.jpg');
  });

  it('allows supplier to initiate cancellation if blanks out of stock or machine broken', async () => {
    const orderRes = await createOrderAtomic({
      customerId: customerUser.id,
      garmentProductId: garmentApex.id,
      garmentVariantId: garmentApex.variants[0].id,
      quantity: 1,
      shippingName: 'Test Customer 3',
      shippingAddress: '789 Rama 9 Road',
      shippingCity: 'Bangkok',
      shippingPostal: '10310',
      paymentMode: 'DEV_MOCK',
    });

    createdOrderIds.push(orderRes.order.id);

    // Supplier cancels directly
    const cancelRes = await cancelOrderAtomic({
      orderId: orderRes.order.id,
      userId: supplierBangkok.userId,
      userRole: 'SUPPLIER',
      reason: 'Supplier cancelled: เสื้อเปล่าหมดสต็อกชั่วคราว',
    });

    expect(cancelRes.success).toBe(true);
    expect(cancelRes.newStatus).toBe('CANCELLED');

    const cancelledOrder = await prisma.order.findUnique({
      where: { id: orderRes.order.id },
    });
    expect(cancelledOrder?.status).toBe('CANCELLED');
    expect(cancelledOrder?.paymentStatus).toBe('REFUNDED');
  });
});
