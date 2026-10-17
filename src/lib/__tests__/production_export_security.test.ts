/**
 * src/lib/__tests__/production_export_security.test.ts
 * Rigorous Security & Access Control Test Suite for Manufacturing Print Guide & Ruler Blueprints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/orders/[id]/production/route';
import { prisma } from '@/lib/prisma';
import * as productionLib from '@/lib/production';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

describe('Manufacturing Print Guide & Ruler Export Security Suite', () => {
  const mockCustomer = {
    id: 'user-customer-123',
    email: 'customer@example.com',
    role: 'CUSTOMER',
  };

  const mockOtherCustomer = {
    id: 'user-intruder-456',
    email: 'intruder@example.com',
    role: 'CUSTOMER',
  };

  const mockSupplier = {
    id: 'user-supplier-789',
    email: 'supplier@factory.com',
    role: 'SUPPLIER',
  };

  const mockAdmin = {
    id: 'user-admin-001',
    email: 'admin@ape-parel.com',
    role: 'ADMIN',
  };

  const paidOrder = {
    id: 'order-paid-001',
    orderNumber: 'APE-9901',
    customerId: 'user-customer-123',
    supplierId: 'supplier-prof-01',
    status: 'PAYMENT_CONFIRMED',
    paymentStatus: 'PAID',
    supplier: {
      id: 'supplier-prof-01',
      userId: 'user-supplier-789',
      companyName: 'Apex Bangkok DTG',
    },
  };

  const unpaidOrder = {
    id: 'order-unpaid-002',
    orderNumber: 'APE-9902',
    customerId: 'user-customer-123',
    supplierId: 'supplier-prof-01',
    status: 'AWAITING_PAYMENT',
    paymentStatus: 'PENDING',
    supplier: {
      id: 'supplier-prof-01',
      userId: 'user-supplier-789',
      companyName: 'Apex Bangkok DTG',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(productionLib, 'generateProductionPackage').mockResolvedValue({
      orderId: 'order-paid-001',
      orderNumber: 'APE-9901',
      productionJobId: 'JOB-APE-9901',
      garment: {} as any,
      printing: {} as any,
      surfaces: [],
      packaging: {} as any,
      shipping: {} as any,
      generatedAt: new Date().toISOString(),
      leadTimeDays: 5,
      targetShipDate: new Date().toISOString(),
    } as any);
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    (auth as any).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/orders/order-paid-001/production');
    const res = await GET(req, { params: { id: 'order-paid-001' } });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when requested order is not found', async () => {
    (auth as any).mockResolvedValue({ user: mockCustomer });
    vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/orders/non-existent-order/production');
    const res = await GET(req, { params: { id: 'non-existent-order' } });

    expect(res.status).toBe(404);
  });

  it('blocks customer from exporting print guide when order is unpaid with 403 Payment Required', async () => {
    (auth as any).mockResolvedValue({ user: mockCustomer });
    vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(unpaidOrder as any);

    const req = new NextRequest(`http://localhost:3000/api/orders/${unpaidOrder.id}/production`);
    const res = await GET(req, { params: { id: unpaidOrder.id } });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Payment Required');
    expect(data.message).toContain('completed payment');
  });

  it('blocks unauthorized customers from accessing another user order with 403 Forbidden', async () => {
    (auth as any).mockResolvedValue({ user: mockOtherCustomer });
    vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(paidOrder as any);

    const req = new NextRequest(`http://localhost:3000/api/orders/${paidOrder.id}/production`);
    const res = await GET(req, { params: { id: paidOrder.id } });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Forbidden');
  });

  it('allows order owner customer to export print guide when payment is confirmed', async () => {
    (auth as any).mockResolvedValue({ user: mockCustomer });
    vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(paidOrder as any);

    const req = new NextRequest(`http://localhost:3000/api/orders/${paidOrder.id}/production`);
    const res = await GET(req, { params: { id: paidOrder.id } });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('JOB-APE-9901.json');
  });

  it('allows assigned supplier to export print guide for paid order', async () => {
    (auth as any).mockResolvedValue({ user: mockSupplier });
    vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(paidOrder as any);

    const req = new NextRequest(`http://localhost:3000/api/orders/${paidOrder.id}/production`);
    const res = await GET(req, { params: { id: paidOrder.id } });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orderNumber).toBe('APE-9901');
  });

  it('allows system admin to access and audit any production job', async () => {
    (auth as any).mockResolvedValue({ user: mockAdmin });
    vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(paidOrder as any);

    const req = new NextRequest(`http://localhost:3000/api/orders/${paidOrder.id}/production`);
    const res = await GET(req, { params: { id: paidOrder.id } });

    expect(res.status).toBe(200);
  });
});
