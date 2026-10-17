import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic, cancelOrderAtomic } from '@/lib/orders';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { POST as cancelOrderApi } from '@/app/api/orders/[id]/cancel/route';

describe('Supplier Variants, Live Stock Deduction & Order Cancellation Suite', () => {
  let supplierBangkok: any;
  let supplierSiam: any;
  let garmentApex: any;
  let garmentRetro: any;
  let variantApexBlackL: any;
  let variantApexBlackXL: any;
  let variantRetroBlackL: any;
  let testArtwork: any;
  let testLicense: any;

  const createdOrderIds: string[] = [];
  const createdOrderNumbers: string[] = [];

  beforeAll(async () => {
    // 1. Fetch Bangkok Garment Craft and Siam Textile
    supplierBangkok = await prisma.supplierProfile.findFirst({
      where: { slug: 'bangkok-garment-craft' },
      include: { products: { include: { variants: true } } },
    });
    supplierSiam = await prisma.supplierProfile.findFirst({
      where: { slug: 'siam-textile-mill' },
      include: { products: { include: { variants: true } } },
    });

    if (!supplierBangkok || !supplierSiam) {
      throw new Error('Seed suppliers missing');
    }

    garmentApex = supplierBangkok.products.find((p: any) => p.sku === 'APX-HVY-001');
    garmentRetro = supplierSiam.products.find((p: any) => p.sku === 'RTR-BOX-002');

    if (!garmentApex || !garmentRetro) {
      throw new Error('Seed garments missing');
    }

    variantApexBlackL = garmentApex.variants.find((v: any) => v.size === 'L' && v.colorHex === '#131718');
    variantApexBlackXL = garmentApex.variants.find((v: any) => v.size === 'XL' && v.colorHex === '#131718');
    variantRetroBlackL = garmentRetro.variants.find((v: any) => v.size === 'L' && v.colorHex === '#131718');

    testArtwork = await prisma.artwork.findFirst({
      where: { status: 'PUBLISHED' },
      include: { licenseOptions: true, creator: true },
    });

    if (!testArtwork || testArtwork.licenseOptions.length === 0) {
      throw new Error('Seed artworks missing');
    }

    testLicense = testArtwork.licenseOptions[0];
  });

  afterAll(async () => {
    // Teardown any test orders created
    if (createdOrderIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { entityId: { in: createdOrderIds } },
      });
      await prisma.royaltyLedgerEntry.deleteMany({
        where: { reference: { in: createdOrderNumbers } },
      });
      await prisma.royaltyObligation.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
  });

  describe('1. Supplier Isolation & Variant Matrix Verification', () => {
    it('verifies suppliers have distinct garment products and variants', () => {
      expect(garmentApex.supplierId).toBe(supplierBangkok.id);
      expect(garmentRetro.supplierId).toBe(supplierSiam.id);
      expect(garmentApex.supplierId).not.toBe(garmentRetro.supplierId);

      // Bangkok Garment Apex tee has sizes L and XL
      const apexSizes = garmentApex.variants.map((v: any) => v.size);
      expect(apexSizes).toContain('L');
      expect(apexSizes).toContain('XL');

      // Siam Textile Retro tee has only size L in seed
      const retroSizes = garmentRetro.variants.map((v: any) => v.size);
      expect(retroSizes).toContain('L');
      expect(retroSizes).not.toContain('XL');
    });

    it('verifies supplier colors reflect only their respective variants', () => {
      const apexColors = garmentApex.variants.map((v: any) => v.colorHex);
      expect(apexColors).toContain('#131718'); // Ink Black
      expect(apexColors).toContain('#FFFFFF'); // Optic White
      expect(apexColors).toContain('#F5F0E8'); // Paper Beige
      expect(apexColors).toContain('#DABA98'); // Warm Kraft

      const retroColors = garmentRetro.variants.map((v: any) => v.colorHex);
      expect(retroColors).toContain('#131718');
      expect(retroColors).toContain('#FFFFFF');
      // Retro tee in seed does not have Paper Beige or Warm Kraft
      expect(retroColors).not.toContain('#F5F0E8');
      expect(retroColors).not.toContain('#DABA98');
    });
  });

  describe('2. Inventory Stock Validation & Atomic Deduction', () => {
    it('fails order placement when requested quantity exceeds variant stock', async () => {
      const currentStock = variantApexBlackL.stock;

      await expect(
        createOrderAtomic({
          garmentProductId: garmentApex.id,
          garmentVariantId: variantApexBlackL.id,
          quantity: currentStock + 999, // Exceed stock
          frontArtworkLicenses: [
            {
              artworkId: testArtwork.id,
              licenseOptionId: testLicense.id,
            },
          ],
          shippingName: 'Test Buyer',
          shippingAddress: '123 Test St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        })
      ).rejects.toThrow(/Insufficient stock for variant/i);
    });

    it('successfully places order and deducts variant stock atomically', async () => {
      // Re-read initial stock
      const initialVariant = await prisma.garmentVariant.findUniqueOrThrow({
        where: { id: variantApexBlackL.id },
      });
      const orderQty = 2;

      const orderResult = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        garmentVariantId: variantApexBlackL.id,
        garmentColorHex: variantApexBlackL.colorHex,
        garmentSize: variantApexBlackL.size,
        quantity: orderQty,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testLicense.id,
          },
        ],
        shippingName: 'Test Stock Customer',
        shippingAddress: '456 Commerce Way',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(orderResult.orderId);
      createdOrderNumbers.push(orderResult.orderNumber);

      expect(orderResult.orderId).toBeDefined();
      expect(orderResult.status).toBe('PAYMENT_CONFIRMED');

      // Verify stock decreased by exactly orderQty
      const updatedVariant = await prisma.garmentVariant.findUniqueOrThrow({
        where: { id: variantApexBlackL.id },
      });
      expect(updatedVariant.stock).toBe(initialVariant.stock - orderQty);
    });
  });

  describe('3. Order Cancellation Lifecycle & Atomic Restock', () => {
    it('rejects cancellation of an order that is already in production', async () => {
      // Create a test order and set status to IN_PRODUCTION
      const testOrder = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        garmentVariantId: variantApexBlackXL.id,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testLicense.id,
          },
        ],
        shippingName: 'Production Test',
        shippingAddress: '789 Factory Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(testOrder.orderId);
      createdOrderNumbers.push(testOrder.orderNumber);

      // Advance status to IN_PRODUCTION
      await prisma.order.update({
        where: { id: testOrder.orderId },
        data: { status: 'IN_PRODUCTION' },
      });

      await expect(
        cancelOrderAtomic({
          orderId: testOrder.orderId,
          reason: 'Customer tried to cancel after printing started',
        })
      ).rejects.toThrow(/Cannot cancel order in status "IN_PRODUCTION"/i);
    });

    it('successfully cancels order in PAYMENT_CONFIRMED, restores stock, and reverses royalties', async () => {
      const initialVariant = await prisma.garmentVariant.findUniqueOrThrow({
        where: { id: variantApexBlackXL.id },
      });
      const orderQty = 3;

      // 1. Create order
      const orderResult = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        garmentVariantId: variantApexBlackXL.id,
        garmentColorHex: variantApexBlackXL.colorHex,
        garmentSize: variantApexBlackXL.size,
        quantity: orderQty,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testLicense.id,
          },
        ],
        shippingName: 'Cancel Test Customer',
        shippingAddress: '100 Sunset Blvd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(orderResult.orderId);
      createdOrderNumbers.push(orderResult.orderNumber);

      // Verify stock deducted
      const stockAfterOrder = await prisma.garmentVariant.findUniqueOrThrow({
        where: { id: variantApexBlackXL.id },
      });
      expect(stockAfterOrder.stock).toBe(initialVariant.stock - orderQty);

      // 2. Cancel order
      const cancelResult = await cancelOrderAtomic({
        orderId: orderResult.orderId,
        reason: 'Customer changed size preference',
      });

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.newStatus).toBe('CANCELLED');
      expect(cancelResult.restockedQuantity).toBe(orderQty);
      expect(cancelResult.obligationsCancelledCount).toBeGreaterThan(0);

      // 3. Verify stock restored back to initialVariant.stock
      const stockAfterCancel = await prisma.garmentVariant.findUniqueOrThrow({
        where: { id: variantApexBlackXL.id },
      });
      expect(stockAfterCancel.stock).toBe(initialVariant.stock);

      // 4. Verify order database record
      const dbOrder = await prisma.order.findUniqueOrThrow({
        where: { id: orderResult.orderId },
        include: { obligations: true },
      });
      expect(dbOrder.status).toBe('CANCELLED');
      expect(dbOrder.paymentStatus).toBe('REFUNDED');
      expect(dbOrder.obligations.every((o) => o.status === 'CANCELLED')).toBe(true);

      // 5. Verify Royalty Ledger has reversal entry (negative adjustment)
      const reversalLedger = await prisma.royaltyLedgerEntry.findFirst({
        where: {
          reference: orderResult.orderNumber,
          entryType: 'ADJUSTMENT',
        },
      });
      expect(reversalLedger).toBeDefined();
      expect(reversalLedger!.amount).toBeLessThan(0);

      // 6. Verify AuditEvent logged
      const auditEvent = await prisma.auditEvent.findFirst({
        where: {
          entityId: orderResult.orderId,
          action: 'ORDER_CANCELLED',
        },
      });
      expect(auditEvent).toBeDefined();
    });

    it('rejects double cancellation on an already cancelled order', async () => {
      const orderResult = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        garmentVariantId: variantApexBlackL.id,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testLicense.id,
          },
        ],
        shippingName: 'Double Cancel Test',
        shippingAddress: '200 Main St',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(orderResult.orderId);
      createdOrderNumbers.push(orderResult.orderNumber);

      // First cancel succeeds
      await cancelOrderAtomic({ orderId: orderResult.orderId });

      // Second cancel must throw
      await expect(
        cancelOrderAtomic({ orderId: orderResult.orderId })
      ).rejects.toThrow(/already cancelled/i);
    });
  });

  describe('4. Cancel Order API Route (POST /api/orders/[id]/cancel)', () => {
    it('returns 404 when order ID does not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/non-existent-order-id/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Test' }),
      });

      const res = await cancelOrderApi(req, { params: { id: 'non-existent-order-id' } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Not Found');
    });

    it('returns 200 and cancels order when valid', async () => {
      const order = await createOrderAtomic({
        garmentProductId: garmentApex.id,
        garmentVariantId: variantApexBlackL.id,
        quantity: 1,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testLicense.id,
          },
        ],
        shippingName: 'API Cancel Customer',
        shippingAddress: '777 Silom Rd',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
      });

      createdOrderIds.push(order.orderId);
      createdOrderNumbers.push(order.orderNumber);

      const req = new NextRequest(`http://localhost:3000/api/orders/${order.orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled via REST API test' }),
      });

      const res = await cancelOrderApi(req, { params: { id: order.orderId } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.newStatus).toBe('CANCELLED');
    });
  });
});
