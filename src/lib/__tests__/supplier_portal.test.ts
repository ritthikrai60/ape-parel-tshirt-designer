import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  SUPPLIER_TERMINOLOGY,
  SUPPORTED_COURIERS,
  ORDER_STATUS_SEQUENCE,
  normalizeOrderStatus,
  isValidStatusTransition,
  getNextAllowedStatus,
  calculateTransparentCostBreakdown,
  isLowStock,
  LOW_STOCK_THRESHOLD,
  MAX_STOCK_QUANTITY,
  getSupplierInventoryMatrix,
  updateVariantStock,
  batchUpdateVariantStock,
  updateSupplierPricing,
  validateTrackingNumber,
  fulfillSupplierOrder,
  generatePackingSlipData,
  calculateOrderSupplierEarnings,
  getSupplierFinancialLedger,
  requestSupplierPayout,
  resolveSupplierProfile,
} from '@/lib/supplier';

import {
  GET as getCatalogRoute,
  PATCH as patchCatalogRoute,
} from '@/app/api/supplier/catalog/route';
import {
  GET as getInventoryRoute,
  PATCH as patchInventoryRoute,
} from '@/app/api/supplier/inventory/route';
import {
  GET as getFulfillmentRoute,
  POST as postFulfillmentRoute,
} from '@/app/api/supplier/fulfillment/route';
import {
  GET as getFinanceRoute,
  POST as postFinanceRoute,
} from '@/app/api/supplier/finance/route';
import {
  GET as getOrderRoute,
  PATCH as patchOrderRoute,
} from '@/app/api/orders/[id]/route';

describe('Comprehensive Supplier Portal Test Suite (R1-R5)', () => {
  let supplier: any;
  let garmentProduct: any;
  let printingService: any;
  let testVariant: any;
  let testOrder: any;

  beforeAll(async () => {
    // 1. Resolve test supplier Bangkok Garment Craft
    supplier = await prisma.supplierProfile.findFirst({
      where: { slug: 'bangkok-garment-craft' },
      include: {
        products: {
          include: {
            variants: true,
          },
        },
        printingServices: true,
      },
    });

    if (!supplier) {
      throw new Error('Seed data missing: Supplier bangkok-garment-craft not found');
    }

    garmentProduct = supplier.products[0];
    printingService = supplier.printingServices.find((s: any) => s.code === 'DTG') || supplier.printingServices[0];
    testVariant = garmentProduct.variants[0];

    // Create an isolated dedicated test order to eliminate any mutation of shared seed orders
    const testDesign = await prisma.designDocument.create({
      data: {
        title: 'Supplier Portal Isolated Test Tee',
        garmentProductId: garmentProduct.id,
        garmentVariantId: testVariant.id,
        garmentColorHex: testVariant.colorHex,
        garmentSize: testVariant.size,
        frontElements: '[]',
        backElements: '[]',
      },
    });

    testOrder = await prisma.order.create({
      data: {
        orderNumber: `APX-ORD-SUPP-${Date.now().toString().slice(-6)}`,
        designId: testDesign.id,
        supplierId: supplier.id,
        quantity: 1,
        status: 'PAYMENT_CONFIRMED',
        paymentStatus: 'PAID',
        totalAmount: 285,
        garmentCost: 150,
        printingCost: 80,
        licensingCost: 0,
        packagingCost: 15,
        shippingCost: 40,
        shippingName: 'Somchai Jaidee',
        shippingAddress: '99/1 Sukhumvit Rd, Khlong Toei',
        shippingCity: 'Bangkok',
        shippingPostal: '10110',
        shippingPhone: '081-234-5678',
      },
      include: {
        design: {
          include: {
            garmentProduct: true,
          },
        },
      },
    });
  });

  afterAll(async () => {
    // 1. Clean up test order and its design document
    if (testOrder) {
      await prisma.auditEvent.deleteMany({
        where: {
          entityId: testOrder.id,
        },
      });

      await prisma.order.delete({
        where: { id: testOrder.id },
      });

      await prisma.designDocument.delete({
        where: { id: testOrder.designId },
      });
    }

    // 2. Clean up supplier financial account and journal entries created during R5
    const financialAccount = await prisma.financialAccount.findFirst({
      where: { accountNumber: `ACC-SUPPLIER-${supplier.slug}` },
    });
    if (financialAccount) {
      await prisma.journalEntry.deleteMany({
        where: { accountId: financialAccount.id },
      });
      await prisma.financialAccount.delete({
        where: { id: financialAccount.id },
      });
    }

    await prisma.auditEvent.deleteMany({
      where: { action: 'SUPPLIER_PAYOUT_REQUESTED' },
    });

    // 3. Reset benchmark pricing and variant stock
    await updateSupplierPricing({
      supplierId: supplier.id,
      garmentProductId: garmentProduct.id,
      basePrice: 150,
      packagingPrice: 15,
      shippingPrice: 40,
      printingServiceId: printingService.id,
      pricePerSurface: 80,
    });

    if (testVariant) {
      await prisma.garmentVariant.update({
        where: { id: testVariant.id },
        data: { stock: 120 },
      });
    }
  });

  // ==========================================================================
  // R1: Blank Garment & DTG Catalog Pricing Tests
  // ==========================================================================
  describe('R1. Blank Garment & Printing Catalog Pricing (/supplier/catalog)', () => {
    it('calculates transparent cost breakdown correctly with transparent labels', () => {
      const breakdown = calculateTransparentCostBreakdown({
        basePrice: 150,
        printPricePerSurface: 80,
        surfacesCount: 1,
        packagingPrice: 15,
        shippingPrice: 40,
        quantity: 1,
      });

      // Supplier Earning = Blank Garment Cost (150) + DTG Printing Fee (80) + Packaging Fee (15) = 245 THB
      expect(breakdown.blankGarmentTotal).toBe(150);
      expect(breakdown.dtgPrintingTotal).toBe(80);
      expect(breakdown.ecoPackagingTotal).toBe(15);
      expect(breakdown.shippingTotal).toBe(40);
      expect(breakdown.supplierEarningPerUnit).toBe(245);
      expect(breakdown.totalSupplierEarnings).toBe(245);
      expect(breakdown.customerProductionSubtotal).toBe(285); // 245 + 40
      expect(breakdown.supplierMarginPercentage).toBe(86); // (245 / 285) * 100 ~ 86.0%

      // Verify strict terminology rules
      expect(breakdown.labels.blankGarment).toBe(SUPPLIER_TERMINOLOGY.BLANK_GARMENT_PRICE);
      expect(breakdown.labels.dtgPrinting).toBe(SUPPLIER_TERMINOLOGY.DTG_PRINTING_COST);
      expect(breakdown.labels.ecoPackaging).toBe(SUPPLIER_TERMINOLOGY.ECO_PACKAGING_FEE);
      expect(breakdown.labels.shipping).toBe(SUPPLIER_TERMINOLOGY.SHIPPING_COST);
      expect(breakdown.labels.system).toBe(SUPPLIER_TERMINOLOGY.TRANSPARENT_COST_SYSTEM);
    });

    it('calculates 2 print surfaces (Front + Back) and multiple units correctly', () => {
      const breakdown = calculateTransparentCostBreakdown({
        basePrice: 160,
        printPricePerSurface: 85,
        surfacesCount: 2, // Front + Back
        packagingPrice: 20,
        shippingPrice: 50,
        quantity: 5,
      });

      // Per unit: 160 + (85 * 2 = 170) + 20 = 350 THB
      expect(breakdown.supplierEarningPerUnit).toBe(350);
      expect(breakdown.totalSupplierEarnings).toBe(350 * 5); // 1750
      expect(breakdown.blankGarmentTotal).toBe(160 * 5); // 800
      expect(breakdown.dtgPrintingTotal).toBe(170 * 5); // 850
      expect(breakdown.ecoPackagingTotal).toBe(20 * 5); // 100
      expect(breakdown.shippingTotal).toBe(50);
      expect(breakdown.customerProductionSubtotal).toBe(1750 + 50); // 1800
    });

    it('calculates 0 print surfaces correctly with 0 THB DTG printing fee for plain blank garments', () => {
      const breakdown = calculateTransparentCostBreakdown({
        basePrice: 150,
        printPricePerSurface: 80,
        surfacesCount: 0,
        packagingPrice: 15,
        shippingPrice: 40,
        quantity: 2,
      });

      expect(breakdown.surfacesCount).toBe(0);
      expect(breakdown.dtgPrintingTotal).toBe(0);
      expect(breakdown.blankGarmentTotal).toBe(300);
      expect(breakdown.ecoPackagingTotal).toBe(30);
      expect(breakdown.supplierEarningPerUnit).toBe(165); // 150 + 0 + 15
      expect(breakdown.totalSupplierEarnings).toBe(330);
      expect(breakdown.customerProductionSubtotal).toBe(370); // 330 + 40
    });

    it('handles negative or invalid boundary inputs with safe clamping', () => {
      const clamped = calculateTransparentCostBreakdown({
        basePrice: -50,
        printPricePerSurface: -20,
        surfacesCount: -2,
        packagingPrice: -10,
        shippingPrice: -15,
        quantity: -3,
      });

      expect(clamped.quantity).toBe(1);
      expect(clamped.surfacesCount).toBe(1);
      expect(clamped.blankGarmentTotal).toBe(0);
      expect(clamped.dtgPrintingTotal).toBe(0);
      expect(clamped.ecoPackagingTotal).toBe(0);
      expect(clamped.shippingTotal).toBe(0);
      expect(clamped.totalSupplierEarnings).toBe(0);
      expect(clamped.customerProductionSubtotal).toBe(0);
    });

    it('gracefully handles undefined, null, or NaN inputs without producing NaN totals', () => {
      const breakdown = calculateTransparentCostBreakdown({
        basePrice: undefined as any,
        printPricePerSurface: NaN,
        surfacesCount: null as any,
        packagingPrice: undefined as any,
        shippingPrice: null as any,
        quantity: NaN,
      });

      expect(Number.isFinite(breakdown.blankGarmentTotal)).toBe(true);
      expect(Number.isFinite(breakdown.dtgPrintingTotal)).toBe(true);
      expect(Number.isFinite(breakdown.totalSupplierEarnings)).toBe(true);
      expect(Number.isFinite(breakdown.customerProductionSubtotal)).toBe(true);
      expect(Number.isFinite(breakdown.supplierMarginPercentage)).toBe(true);
      expect(breakdown.quantity).toBe(1);
      expect(breakdown.surfacesCount).toBe(1);
    });

    it('persists supplier pricing updates to database atomically via updateSupplierPricing', async () => {
      const updateResult = await updateSupplierPricing({
        supplierId: supplier.id,
        garmentProductId: garmentProduct.id,
        basePrice: 155,
        packagingPrice: 18,
        shippingPrice: 45,
        printingServiceId: printingService.id,
        pricePerSurface: 85,
        supportedSurfaces: 'BOTH',
      });

      expect(updateResult.product.basePrice).toBe(155);
      expect(updateResult.product.packagingPrice).toBe(18);
      expect(updateResult.product.shippingPrice).toBe(45);
      expect(updateResult.printingService?.pricePerSurface).toBe(85);

      // Re-read from database
      const reReadProduct = await prisma.garmentProduct.findUnique({
        where: { id: garmentProduct.id },
      });
      expect(reReadProduct?.basePrice).toBe(155);
      expect(reReadProduct?.packagingPrice).toBe(18);

      // Restore benchmark pricing
      await updateSupplierPricing({
        supplierId: supplier.id,
        garmentProductId: garmentProduct.id,
        basePrice: 150,
        packagingPrice: 15,
        shippingPrice: 40,
        printingServiceId: printingService.id,
        pricePerSurface: 80,
      });
    });

    it('calls GET and PATCH /api/supplier/catalog route successfully', async () => {
      // 1. GET catalog
      const getReq = new NextRequest(
        `http://localhost:3000/api/supplier/catalog?supplier=${supplier.slug}`
      );
      const getRes = await getCatalogRoute(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.products.length).toBeGreaterThanOrEqual(1);
      expect(getData.transparentBreakdown).toBeDefined();

      // 2. PATCH pricing
      const patchReq = new NextRequest('http://localhost:3000/api/supplier/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          garmentProductId: garmentProduct.id,
          basePrice: 150,
          packagingPrice: 15,
          shippingPrice: 40,
        }),
      });
      const patchRes = await patchCatalogRoute(patchReq);
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.success).toBe(true);
    });

    it('rejects pricing update when printing service belongs to another supplier (cross-tenant safety)', async () => {
      // Attempt to modify pricing with a forged/foreign printingServiceId
      await expect(
        updateSupplierPricing({
          supplierId: supplier.id,
          garmentProductId: garmentProduct.id,
          printingServiceId: 'foreign-printing-service-id-999',
          pricePerSurface: 50,
        })
      ).rejects.toThrow();
    });

    it('auto-resolves and updates default DTG printing service when printingServiceId is omitted', async () => {
      const result = await updateSupplierPricing({
        supplierId: supplier.id,
        garmentProductId: garmentProduct.id,
        pricePerSurface: 88,
      });

      expect(result.printingService).not.toBeNull();
      expect(result.printingService?.pricePerSurface).toBe(88);

      // Re-read service from database
      const reReadService = await prisma.printingService.findFirst({
        where: { supplierId: supplier.id, code: 'DTG' },
      });
      expect(reReadService?.pricePerSurface).toBe(88);

      // Reset benchmark rate
      await updateSupplierPricing({
        supplierId: supplier.id,
        garmentProductId: garmentProduct.id,
        pricePerSurface: 80,
      });
    });

    it('returns 404 from PATCH /api/supplier/catalog when product is not found', async () => {
      const patchReq = new NextRequest('http://localhost:3000/api/supplier/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          garmentProductId: 'non-existent-product-id-404',
          basePrice: 150,
        }),
      });
      const patchRes = await patchCatalogRoute(patchReq);
      expect(patchRes.status).toBe(404);
    });
  });

  // ==========================================================================
  // R2: Colorway × Size Inventory Stock Matrix Grid Tests
  // ==========================================================================
  describe('R2. Colorway × Size Inventory Stock Matrix Grid (/supplier/inventory)', () => {
    it('detects low-stock threshold boundary accurately (< 10 units)', () => {
      expect(isLowStock(0)).toBe(true);
      expect(isLowStock(5)).toBe(true);
      expect(isLowStock(9)).toBe(true);
      expect(isLowStock(10)).toBe(false);
      expect(isLowStock(11)).toBe(false);
      expect(isLowStock(100)).toBe(false);
      expect(LOW_STOCK_THRESHOLD).toBe(10);
    });

    it('constructs multi-dimensional Colorway × Size inventory matrix with color swatches and sizes', async () => {
      const matrix = await getSupplierInventoryMatrix(supplier.slug);

      expect(matrix.supplierId).toBe(supplier.id);
      expect(matrix.productSku).toBe(garmentProduct.sku);
      expect(matrix.availableSizes.length).toBeGreaterThanOrEqual(1);
      expect(matrix.colorRows.length).toBeGreaterThanOrEqual(1);

      // Verify row structure
      for (const row of matrix.colorRows) {
        expect(row.colorName).toBeDefined();
        expect(row.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        for (const size of matrix.availableSizes) {
          const item = row.sizes[size];
          if (item) {
            expect(item.id).toBeDefined();
            expect(item.sku).toBeDefined();
            expect(typeof item.stock).toBe('number');
            expect(item.isLowStock).toBe(item.stock < 10);
          }
        }
      }
      expect(matrix.basePrice).toBe(garmentProduct.basePrice);
    });

    it('updates variant stock quantity with boundary clamping (no negative or out-of-range quantities)', async () => {
      // 1. Normal update
      const updated = await updateVariantStock(testVariant.id, 45);
      expect(updated.stock).toBe(45);

      // 2. Negative quantity boundary clamping
      const negativeClamped = await updateVariantStock(testVariant.id, -20);
      expect(negativeClamped.stock).toBe(0);

      // 3. Float rounding
      const floatClamped = await updateVariantStock(testVariant.id, 12.8);
      expect(floatClamped.stock).toBe(12);

      // 4. Extreme large quantity boundary clamping to MAX_STOCK_QUANTITY
      const extremeClamped = await updateVariantStock(testVariant.id, 99_999_999);
      expect(extremeClamped.stock).toBe(MAX_STOCK_QUANTITY);

      // 5. NaN quantity boundary clamping
      const nanClamped = await updateVariantStock(testVariant.id, NaN);
      expect(nanClamped.stock).toBe(0);

      // Reset
      await updateVariantStock(testVariant.id, 120);
    });

    it('performs transactional batchUpdateVariantStock across multiple variants', async () => {
      const variants = garmentProduct.variants.slice(0, 2);
      const updates = [
        { variantId: variants[0].id, stock: 75 },
        { variantId: variants[1].id, stock: 85 },
      ];

      const results = await batchUpdateVariantStock(updates);
      expect(results.length).toBe(2);
      expect(results[0].stock).toBe(75);
      expect(results[1].stock).toBe(85);

      // Verify in database
      const reRead1 = await prisma.garmentVariant.findUnique({ where: { id: variants[0].id } });
      const reRead2 = await prisma.garmentVariant.findUnique({ where: { id: variants[1].id } });
      expect(reRead1?.stock).toBe(75);
      expect(reRead2?.stock).toBe(85);

      // Reset
      await updateVariantStock(variants[0].id, 120);
      await updateVariantStock(variants[1].id, 80);
    });

    it('calls GET and PATCH /api/supplier/inventory route successfully', async () => {
      // 1. GET matrix
      const getReq = new NextRequest(
        `http://localhost:3000/api/supplier/inventory?supplier=${supplier.slug}`
      );
      const getRes = await getInventoryRoute(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.matrix.colorRows).toBeDefined();

      // 2. PATCH single variant
      const patchSingleReq = new NextRequest('http://localhost:3000/api/supplier/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: testVariant.id,
          stock: 95,
        }),
      });
      const patchSingleRes = await patchInventoryRoute(patchSingleReq);
      expect(patchSingleRes.status).toBe(200);

      // 3. PATCH batch
      const patchBatchReq = new NextRequest('http://localhost:3000/api/supplier/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ variantId: testVariant.id, stock: 120 }],
        }),
      });
      const patchBatchRes = await patchInventoryRoute(patchBatchReq);
      expect(patchBatchRes.status).toBe(200);

      // 4. PATCH non-existent variant returns 404
      const patchNonExistentReq = new NextRequest('http://localhost:3000/api/supplier/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: 'non-existent-variant-cuid-404',
          stock: 50,
        }),
      });
      const patchNonExistentRes = await patchInventoryRoute(patchNonExistentReq);
      expect(patchNonExistentRes.status).toBe(404);
    });
  });

  // ==========================================================================
  // R3: Production Queue & Status Progression Tests
  // ==========================================================================
  describe('R3. Production Queue & Status Progression (/supplier/dashboard / /supplier/orders)', () => {
    it('normalizes aliased status terms accurately', () => {
      expect(normalizeOrderStatus('CONFIRMED')).toBe('PAYMENT_CONFIRMED');
      expect(normalizeOrderStatus('PAYMENT_CONFIRMED')).toBe('PAYMENT_CONFIRMED');
      expect(normalizeOrderStatus('QA')).toBe('QA_PASSED');
      expect(normalizeOrderStatus('QA_PASSED')).toBe('QA_PASSED');
      expect(normalizeOrderStatus('PACKED')).toBe('READY_TO_PACK');
      expect(normalizeOrderStatus('READY_TO_PACK')).toBe('READY_TO_PACK');
      expect(normalizeOrderStatus('DISPATCHED')).toBe('SHIPPED');
      expect(normalizeOrderStatus('SHIPPED')).toBe('SHIPPED');

      // Safe handling of null, undefined, and empty string
      expect(normalizeOrderStatus('')).toBe('');
      expect(normalizeOrderStatus(null as any)).toBe('');
      expect(normalizeOrderStatus(undefined as any)).toBe('');
    });

    it('enforces step-by-step manufacturing progression rules', () => {
      // Valid forward 1-step transitions
      expect(isValidStatusTransition('PAYMENT_CONFIRMED', 'IN_PRODUCTION')).toBe(true);
      expect(isValidStatusTransition('IN_PRODUCTION', 'QA_PASSED')).toBe(true);
      expect(isValidStatusTransition('QA_PASSED', 'READY_TO_PACK')).toBe(true);
      expect(isValidStatusTransition('READY_TO_PACK', 'SHIPPED')).toBe(true);
      expect(isValidStatusTransition('SHIPPED', 'DELIVERED')).toBe(true);

      // Idempotent same-state transitions
      expect(isValidStatusTransition('IN_PRODUCTION', 'IN_PRODUCTION')).toBe(true);

      // Disallow skipping states
      expect(isValidStatusTransition('PAYMENT_CONFIRMED', 'QA_PASSED')).toBe(false);
      expect(isValidStatusTransition('PAYMENT_CONFIRMED', 'READY_TO_PACK')).toBe(false);
      expect(isValidStatusTransition('PAYMENT_CONFIRMED', 'SHIPPED')).toBe(false);
      expect(isValidStatusTransition('IN_PRODUCTION', 'SHIPPED')).toBe(false);

      // Disallow backward regression
      expect(isValidStatusTransition('SHIPPED', 'IN_PRODUCTION')).toBe(false);
      expect(isValidStatusTransition('READY_TO_PACK', 'PAYMENT_CONFIRMED')).toBe(false);
      expect(isValidStatusTransition('QA_PASSED', 'PAYMENT_CONFIRMED')).toBe(false);
    });

    it('rejects invalid or unknown status transitions and empty values', () => {
      expect(isValidStatusTransition('INVALID', 'INVALID')).toBe(false);
      expect(isValidStatusTransition('', '')).toBe(false);
      expect(isValidStatusTransition('UNKNOWN_STATE', 'IN_PRODUCTION')).toBe(false);
      expect(isValidStatusTransition('PAYMENT_CONFIRMED', 'UNKNOWN_STATE')).toBe(false);
      expect(getNextAllowedStatus('UNKNOWN_STATUS')).toBeNull();
      expect(getNextAllowedStatus('')).toBeNull();
    });

    it('getNextAllowedStatus returns sequential manufacturing stage', () => {
      expect(getNextAllowedStatus('PAYMENT_CONFIRMED')).toBe('IN_PRODUCTION');
      expect(getNextAllowedStatus('IN_PRODUCTION')).toBe('QA_PASSED');
      expect(getNextAllowedStatus('QA_PASSED')).toBe('READY_TO_PACK');
      expect(getNextAllowedStatus('READY_TO_PACK')).toBe('SHIPPED');
      expect(getNextAllowedStatus('SHIPPED')).toBe('DELIVERED');
      expect(getNextAllowedStatus('DELIVERED')).toBeNull();
    });

    it('advances order through full lifecycle to READY_TO_PACK and records AuditEvents', async () => {
      // 1. Move to IN_PRODUCTION
      const req1 = new NextRequest(`http://localhost:3000/api/orders/${testOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PRODUCTION', notes: 'RIP file loaded on Kornit DTG' }),
      });
      const res1 = await patchOrderRoute(req1, { params: { id: testOrder.id } });
      expect(res1.status).toBe(200);

      // 2. Move to QA_PASSED
      const req2 = new NextRequest(`http://localhost:3000/api/orders/${testOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'QA_PASSED', notes: 'Color density and cure verified' }),
      });
      const res2 = await patchOrderRoute(req2, { params: { id: testOrder.id } });
      expect(res2.status).toBe(200);

      // 3. Move to READY_TO_PACK
      const req3 = new NextRequest(`http://localhost:3000/api/orders/${testOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY_TO_PACK', notes: 'Folded in kraft packaging' }),
      });
      const res3 = await patchOrderRoute(req3, { params: { id: testOrder.id } });
      expect(res3.status).toBe(200);

      // Verify order status in DB is READY_TO_PACK
      const checkOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
      expect(checkOrder?.status).toBe('READY_TO_PACK');

      // Verify AuditEvents recorded
      const audits = await prisma.auditEvent.findMany({
        where: {
          entityId: testOrder.id,
          action: 'ORDER_STATUS_UPDATED',
        },
      });
      expect(audits.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects status updates on CANCELLED orders with HTTP 400', async () => {
      const cancelledOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-CANCEL-TEST-${Date.now()}`,
          designId: testOrder.designId,
          supplierId: supplier.id,
          status: 'CANCELLED',
          totalAmount: 285,
          garmentCost: 150,
          printingCost: 80,
          licensingCost: 0,
          packagingCost: 15,
          shippingCost: 40,
          shippingName: 'Cancelled User',
          shippingAddress: '123 Test St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          quantity: 1,
        },
      });

      try {
        const req = new NextRequest(`http://localhost:3000/api/orders/${cancelledOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_PRODUCTION' }),
        });
        const res = await patchOrderRoute(req, { params: { id: cancelledOrder.id } });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.message).toContain('Cannot update status of cancelled order');
      } finally {
        await prisma.order.delete({ where: { id: cancelledOrder.id } });
      }
    });
  });

  // ==========================================================================
  // R4: Logistics & Shipping Fulfillment Tests
  // ==========================================================================
  describe('R4. Logistics & Shipping Fulfillment (/supplier/fulfillment)', () => {
    it('verifies supported domestic couriers list', () => {
      const courierCodes = SUPPORTED_COURIERS.map((c) => c.code);
      expect(courierCodes).toContain('THAILAND_POST_EMS');
      expect(courierCodes).toContain('FLASH_EXPRESS');
      expect(courierCodes).toContain('KERRY_EXPRESS');
      expect(courierCodes).toContain('JT_EXPRESS');
    });

    it('validates tracking number formatting accurately', () => {
      expect(validateTrackingNumber('THAILAND_POST_EMS', 'ED123456789TH').valid).toBe(true);
      expect(validateTrackingNumber('FLASH_EXPRESS', 'TH0123456789A').valid).toBe(true);
      expect(validateTrackingNumber('KERRY_EXPRESS', 'KEX102938475').valid).toBe(true);

      // Whitespace-separated tracking numbers stripped and validated safely
      expect(validateTrackingNumber('THAILAND_POST_EMS', 'ED 1234 5678 9 TH').valid).toBe(true);
      expect(validateTrackingNumber('FLASH_EXPRESS', 'TH 0123 4567 89').valid).toBe(true);

      // Invalid empty or short tracking numbers
      expect(validateTrackingNumber('THAILAND_POST_EMS', '').valid).toBe(false);
      expect(validateTrackingNumber('FLASH_EXPRESS', '   ').valid).toBe(false);
      expect(validateTrackingNumber('KERRY_EXPRESS', '123').valid).toBe(false);
      expect(validateTrackingNumber('JT_EXPRESS', 'INVALID$$$CODE').valid).toBe(false);
    });

    it('rejects unsupported couriers and empty/malformed tracking formats', () => {
      expect(validateTrackingNumber('UNKNOWN_EXPRESS', 'ED123456789TH').valid).toBe(false);
      expect(validateTrackingNumber('', 'ED123456789TH').valid).toBe(false);
      expect(validateTrackingNumber('THAILAND_POST_EMS', '12').valid).toBe(false);
      expect(validateTrackingNumber('THAILAND_POST_EMS', 'ED#@!$%^&*TH').valid).toBe(false);
    });

    it('rejects fulfillment of cancelled orders', async () => {
      const cancelledOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-TEST-CANCELLED-${Date.now()}`,
          designId: testOrder.designId,
          status: 'CANCELLED',
          totalAmount: 300,
          garmentCost: 150,
          printingCost: 80,
          licensingCost: 0,
          packagingCost: 15,
          shippingCost: 40,
          shippingName: 'Cancelled User',
          shippingAddress: '123 Test Road',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          quantity: 1,
          supplierId: supplier.id,
        },
      });

      try {
        await expect(
          fulfillSupplierOrder({
            orderId: cancelledOrder.id,
            courier: 'Thailand Post EMS',
            trackingNumber: 'ED123456789TH',
          })
        ).rejects.toThrow(/Cannot fulfill cancelled order/);
      } finally {
        await prisma.order.delete({ where: { id: cancelledOrder.id } });
      }
    });

    it('rejects fulfillment of already DELIVERED orders', async () => {
      const deliveredOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-DELIV-TEST-${Date.now()}`,
          designId: testOrder.designId,
          supplierId: supplier.id,
          status: 'DELIVERED',
          totalAmount: 285,
          garmentCost: 150,
          printingCost: 80,
          licensingCost: 0,
          packagingCost: 15,
          shippingCost: 40,
          shippingName: 'Delivered User',
          shippingAddress: '123 Test St',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          quantity: 1,
        },
      });

      try {
        await expect(
          fulfillSupplierOrder({
            orderId: deliveredOrder.id,
            courier: 'Thailand Post EMS',
            trackingNumber: 'ED123456789TH',
          })
        ).rejects.toThrow(/Cannot fulfill already delivered order/);
      } finally {
        await prisma.order.delete({ where: { id: deliveredOrder.id } });
      }
    });

    it('returns empty surfaces for plain unprinted blank garment when printingCost is 0', async () => {
      const blankOrder = await prisma.order.create({
        data: {
          orderNumber: `ORD-BLANK-TEST-${Date.now()}`,
          designId: testOrder.designId,
          supplierId: supplier.id,
          status: 'READY_TO_PACK',
          totalAmount: 205,
          garmentCost: 150,
          printingCost: 0, // 0 printing cost (plain blank garment)
          licensingCost: 0,
          packagingCost: 15,
          shippingCost: 40,
          shippingName: 'Blank Tee Buyer',
          shippingAddress: '456 Pure White Ave',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
          quantity: 1,
        },
      });

      try {
        const slip = await generatePackingSlipData(blankOrder.id);
        expect(slip.item.surfaces).toEqual([]);
      } finally {
        await prisma.order.delete({ where: { id: blankOrder.id } });
      }
    });

    it('returns 400 from POST /api/supplier/fulfillment on invalid courier or tracking', async () => {
      const invalidReq = new NextRequest('http://localhost:3000/api/supplier/fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: testOrder.id,
          courier: 'FAKE_EXPRESS_NONEXISTENT',
          trackingNumber: 'ED123456789TH',
        }),
      });
      const invalidRes = await postFulfillmentRoute(invalidReq);
      expect(invalidRes.status).toBe(400);
    });

    it('fulfills order with courier tracking and generates packing slip payload', async () => {
      // Fulfill order
      const fulfilled = await fulfillSupplierOrder({
        orderId: testOrder.id,
        courier: 'Thailand Post EMS',
        trackingNumber: 'ED987654321TH',
        notes: 'Handed to Bang Khun Thian post branch',
      });

      expect(fulfilled.status).toBe('SHIPPED');
      expect(fulfilled.snapshotData).toContain('ED987654321TH');

      // Generate printable packing slip
      const slip = await generatePackingSlipData(testOrder.id);
      expect(slip.slipNumber).toBe(`SLIP-${testOrder.orderNumber}`);
      expect(slip.orderNumber).toBe(testOrder.orderNumber);
      expect(slip.customer.name).toBe(testOrder.shippingName);
      expect(slip.customer.address).toBe(testOrder.shippingAddress);
      expect(slip.fulfillment.courier).toBe('Thailand Post EMS');
      expect(slip.fulfillment.trackingNumber).toBe('ED987654321TH');
      expect(slip.qrCodeMock).toContain(testOrder.orderNumber);
    });

    it('calls GET and POST /api/supplier/fulfillment route successfully', async () => {
      // 1. GET fulfillment list
      const getReq = new NextRequest(
        `http://localhost:3000/api/supplier/fulfillment?supplier=${supplier.slug}`
      );
      const getRes = await getFulfillmentRoute(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.couriers.length).toBe(4);

      // 2. GET packing slip for specific order
      const slipReq = new NextRequest(
        `http://localhost:3000/api/supplier/fulfillment?orderId=${testOrder.id}`
      );
      const slipRes = await getFulfillmentRoute(slipReq);
      expect(slipRes.status).toBe(200);
      const slipData = await slipRes.json();
      expect(slipData.packingSlip).toBeDefined();
    });
  });

  // ==========================================================================
  // R5: Supplier Revenue Ledger & Settlement Payouts Tests
  // ==========================================================================
  describe('R5. Supplier Financial Ledger & Settlement Payouts (/supplier/finance)', () => {
    it('calculates supplier order earnings strictly as Garment + DTG Print + Packaging', () => {
      const orderCosts = {
        garmentCost: 150,
        printingCost: 80,
        packagingCost: 15,
        shippingCost: 40, // Note: Shipping is excluded from supplier manufacturing earnings
      };

      const earnings = calculateOrderSupplierEarnings(orderCosts);
      expect(earnings).toBe(245); // 150 + 80 + 15 = 245
    });

    it('retrieves double-entry supplier financial ledger and running withdrawable balance', async () => {
      const ledger = await getSupplierFinancialLedger(supplier.slug);

      expect(ledger.supplierSlug).toBe(supplier.slug);
      expect(ledger.lifetimeEarnings).toBeGreaterThanOrEqual(245);
      expect(ledger.withdrawableBalance).toBeGreaterThanOrEqual(0);
      expect(ledger.ordersCount).toBeGreaterThanOrEqual(1);

      // Ledger transactions feed contains credit entries
      expect(ledger.transactions.length).toBeGreaterThanOrEqual(1);
      const firstCredit = ledger.transactions.find((t) => t.type === 'EARNING');
      expect(firstCredit).toBeDefined();
      expect(firstCredit?.amount).toBeGreaterThan(0);
      expect(firstCredit?.description).toContain('Production fee');
    });

    it('processes PromptPay payout request, deducts balance, and records JournalEntry', async () => {
      const initialLedger = await getSupplierFinancialLedger(supplier.slug);
      const availableBalance = initialLedger.withdrawableBalance;

      // Payout 100 THB if balance available, otherwise test rejection of excessive amount
      if (availableBalance >= 50) {
        const payout = await requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: 50,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
          notes: 'Test PromptPay Settlement',
        });

        expect(payout.success).toBe(true);
        expect(payout.amount).toBe(50);
        expect(payout.balanceAfter).toBe(availableBalance - 50);
        expect(payout.payoutReference).toMatch(/^PAY-SUPP-/);

        // Verify journal entry recorded
        const journal = await prisma.journalEntry.findUnique({
          where: { id: payout.journalEntryId },
        });
        expect(journal?.entryType).toBe('DEBIT');
        expect(journal?.amount).toBe(50);
        expect(journal?.balanceAfter).toBe(availableBalance - 50);

        // Verify updated ledger reflects deduction
        const updatedLedger = await getSupplierFinancialLedger(supplier.slug);
        expect(updatedLedger.withdrawableBalance).toBe(availableBalance - 50);
      }
    });

    it('rejects payout amounts greater than withdrawable balance', async () => {
      const ledger = await getSupplierFinancialLedger(supplier.slug);
      const excessiveAmount = ledger.withdrawableBalance + 10000;

      await expect(
        requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: excessiveAmount,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
        })
      ).rejects.toThrow(/Insufficient withdrawable balance/);
    });

    it('rejects zero or negative payout amounts', async () => {
      await expect(
        requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: 0,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
        })
      ).rejects.toThrow(/greater than 0 THB/);

      await expect(
        requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: -50,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
        })
      ).rejects.toThrow(/greater than 0 THB/);
    });

    it('accurately maintains chronological running balances across interleaved orders and payouts', async () => {
      const ledger = await getSupplierFinancialLedger(supplier.slug);
      // The latest transaction balanceAfter must exactly match the current withdrawable balance
      if (ledger.transactions.length > 0) {
        expect(ledger.transactions[0].balanceAfter).toBe(ledger.withdrawableBalance);
      }
    });

    it('rejects concurrent payout attempts that would cause a double-spend beyond available balance', async () => {
      const currentLedger = await getSupplierFinancialLedger(supplier.slug);
      const balance = currentLedger.withdrawableBalance;

      if (balance >= 20) {
        // Attempt two simultaneous payout requests whose sum exceeds available balance
        const halfBalance = Math.floor(balance * 0.7);
        const req1 = requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: halfBalance,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
        });
        const req2 = requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: halfBalance,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
        });

        const results = await Promise.allSettled([req1, req2]);
        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        // At most one should succeed because 2 * 0.7 = 1.4 > 1.0!
        expect(fulfilled.length).toBeLessThanOrEqual(1);
        expect(rejected.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('calls GET and POST /api/supplier/finance route successfully', async () => {
      // 1. GET finance summary
      const getReq = new NextRequest(
        `http://localhost:3000/api/supplier/finance?supplier=${supplier.slug}`
      );
      const getRes = await getFinanceRoute(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.summary.withdrawableBalance).toBeDefined();

      // 2. POST invalid excessive payout returns 400
      const postInvalidReq = new NextRequest('http://localhost:3000/api/supplier/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: supplier.slug,
          amount: 99999999,
          method: 'PROMPTPAY',
          recipientId: '081-992-4411',
        }),
      });
      const postInvalidRes = await postFinanceRoute(postInvalidReq);
      expect(postInvalidRes.status).toBe(400);
    });

    it('rejects payout with empty recipientId or missing bankName for BANK_TRANSFER', async () => {
      await expect(
        requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: 10,
          method: 'PROMPTPAY',
          recipientId: '   ',
        })
      ).rejects.toThrow(/Recipient identifier.*is required/);

      await expect(
        requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: 10,
          method: 'BANK_TRANSFER',
          recipientId: '123-4-56789-0',
          bankName: '',
        })
      ).rejects.toThrow(/Bank name is required/);
    });

    it('returns 400 from POST /api/supplier/finance when bankName is missing for BANK_TRANSFER', async () => {
      const postInvalidBankReq = new NextRequest('http://localhost:3000/api/supplier/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: supplier.slug,
          amount: 100,
          method: 'BANK_TRANSFER',
          recipientId: '123-4-56789-0',
        }),
      });
      const postInvalidBankRes = await postFinanceRoute(postInvalidBankReq);
      expect(postInvalidBankRes.status).toBe(400);
    });

    it('sanitizes recipient identifier with leading or trailing whitespace', async () => {
      const ledger = await getSupplierFinancialLedger(supplier.slug);
      if (ledger.withdrawableBalance >= 10) {
        const payout = await requestSupplierPayout({
          supplierIdOrSlug: supplier.slug,
          amount: 10,
          method: 'PROMPTPAY',
          recipientId: '   081-992-4411   ',
        });
        expect(payout.recipientId).toBe('081-992-4411');

        const journal = await prisma.journalEntry.findUnique({
          where: { id: payout.journalEntryId },
        });
        expect(journal?.description).toContain('(081-992-4411)');
      }
    });
  });
});
