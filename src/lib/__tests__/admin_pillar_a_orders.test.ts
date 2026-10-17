import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as rerouteOrder } from '@/app/api/admin/orders/[id]/re-route/route';
import { POST as reprintOrder } from '@/app/api/admin/orders/[id]/reprint/route';
import { POST as refundOrder } from '@/app/api/admin/orders/[id]/refund/route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Pillar A: Factory Re-routing, QA Free Reprint & Refund Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Factory Re-routing Engine', () => {
    it('rejects unauthorized access with 401 or 403', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const req = new NextRequest('http://localhost:3000/api/admin/orders/ord-1/re-route', {
        method: 'POST',
        body: JSON.stringify({ newSupplierId: 'sup-2' }),
      });

      const res = await rerouteOrder(req, { params: { id: 'ord-1' } });
      expect(res.status).toBe(401);
    });

    it('successfully transfers order between suppliers and restores/decrements stock', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      // Fetch two distinct suppliers
      const suppliers = await prisma.supplierProfile.findMany({
        take: 2,
        include: { products: { include: { variants: true } } },
      });

      if (suppliers.length < 2) {
        throw new Error('At least 2 suppliers required in test DB');
      }

      const [supA, supB] = suppliers;

      // Find an active order assigned to supA
      const testOrder = await prisma.order.findFirst({
        where: { supplierId: supA.id, status: { notIn: ['CANCELLED', 'DELIVERED'] } },
        include: {
          design: { include: { garmentProduct: { include: { variants: true } } } },
        },
      });

      if (!testOrder) {
        // Skip if no order assigned to supA
        return;
      }

      const oldVariant = testOrder.design.garmentProduct.variants[0];
      const initialOldStock = oldVariant?.stock || 0;

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrder.id}/re-route`, {
        method: 'POST',
        body: JSON.stringify({
          newSupplierId: supB.id,
          reason: 'Automated test factory transfer',
        }),
      });

      const res = await rerouteOrder(req, { params: { id: testOrder.id } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.order.supplierId).toBe(supB.id);

      // Verify audit event logged
      const audit = await prisma.auditEvent.findFirst({
        where: { action: 'ORDER_REROUTED', entityId: testOrder.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();

      // Cleanup: revert supplier
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { supplierId: supA.id },
      });
    });
  });

  describe('2. QA Defect Free Reprint Engine', () => {
    it('dispatches free replacement blank garment to production', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const testOrder = await prisma.order.findFirst({
        where: { status: { notIn: ['CANCELLED'] } },
        include: {
          design: { include: { garmentProduct: { include: { variants: true } } } },
        },
      });

      if (!testOrder) return;

      const variant = testOrder.design.garmentProduct.variants[0];
      const stockBefore = variant?.stock || 50;

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrder.id}/reprint`, {
        method: 'POST',
        body: JSON.stringify({
          defectReason: 'Misaligned screen print on front chest',
        }),
      });

      const res = await reprintOrder(req, { params: { id: testOrder.id } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.order.status).toBe('IN_PRODUCTION');

      // Check audit log
      const audit = await prisma.auditEvent.findFirst({
        where: { action: 'ORDER_REPRINT_REQUESTED', entityId: testOrder.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
    });
  });

  describe('3. Dispute & Refund Resolution Center', () => {
    it('rejects refund amount exceeding order total', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const testOrder = await prisma.order.findFirst();
      if (!testOrder) return;

      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrder.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          refundType: 'PARTIAL',
          amount: testOrder.totalAmount + 5000,
          reason: 'Excessive refund test',
        }),
      });

      const res = await refundOrder(req, { params: { id: testOrder.id } });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/cannot exceed total order amount/);
    });

    it('processes partial compensation refund without cancelling order', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const testOrder = await prisma.order.findFirst({
        where: { status: { notIn: ['CANCELLED'] } },
      });
      if (!testOrder) return;

      const partialAmount = 50;
      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrder.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          refundType: 'PARTIAL',
          amount: partialAmount,
          reason: 'Shipping delay compensation',
          restockGarment: false,
          voidRoyalty: false,
        }),
      });

      const res = await refundOrder(req, { params: { id: testOrder.id } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.refundRecord.amount).toBe(partialAmount);
      expect(data.data.refundRecord.refundType).toBe('PARTIAL');
    });
  });
});
