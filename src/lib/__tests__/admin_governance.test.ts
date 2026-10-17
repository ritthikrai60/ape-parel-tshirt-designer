import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH as updateInventory } from '@/app/api/admin/inventory/route';
import { PATCH as updateUserRole } from '@/app/api/admin/users/route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/auth';

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Admin Enterprise Governance Suite (Inventory Overrides & IAM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Inventory Live Override (PATCH /api/admin/inventory)', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const req = new NextRequest('http://localhost:3000/api/admin/inventory', {
        method: 'PATCH',
        body: JSON.stringify({ variantId: 'var-1', stock: 50 }),
      });

      const res = await updateInventory(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Authentication required');
    });

    it('returns 403 when user is not ADMIN', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'cust-1', role: 'CUSTOMER' },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/inventory', {
        method: 'PATCH',
        body: JSON.stringify({ variantId: 'var-1', stock: 50 }),
      });

      const res = await updateInventory(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden/);
    });

    it('returns 400 for negative stock count', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/inventory', {
        method: 'PATCH',
        body: JSON.stringify({ variantId: 'var-1', stock: -10 }),
      });

      const res = await updateInventory(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation Error');
      expect(data.message).toMatch(/greater than or equal to 0/);
    });

    it('successfully overrides stock and records audit log', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      // Find an existing variant in database
      const existingVariant = await prisma.garmentVariant.findFirst({
        include: { product: true },
      });

      if (!existingVariant) {
        throw new Error('No garment variant found in test DB');
      }

      const originalStock = existingVariant.stock;
      const targetStock = originalStock + 75;

      const req = new NextRequest('http://localhost:3000/api/admin/inventory', {
        method: 'PATCH',
        body: JSON.stringify({
          variantId: existingVariant.id,
          stock: targetStock,
          reason: 'Emergency restock delivery arrived',
        }),
      });

      const res = await updateInventory(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.variant.stock).toBe(targetStock);

      // Verify DB persistence
      const rechecked = await prisma.garmentVariant.findUnique({
        where: { id: existingVariant.id },
      });
      expect(rechecked?.stock).toBe(targetStock);

      // Verify Audit Event logged
      const auditLog = await prisma.auditEvent.findFirst({
        where: {
          action: 'STOCK_ADJUSTED',
          entityId: existingVariant.id,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe('admin-1');

      // Cleanup: revert stock
      await prisma.garmentVariant.update({
        where: { id: existingVariant.id },
        data: { stock: originalStock },
      });
    });
  });

  describe('2. User Role & IAM Governance (PATCH /api/admin/users)', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce(null as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId: 'u-1', role: 'CREATOR' }),
      });

      const res = await updateUserRole(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid role value', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId: 'u-1', role: 'SUPERUSER' }),
      });

      const res = await updateUserRole(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation Error');
      expect(data.message).toMatch(/Invalid enum value/);
    });

    it('successfully updates user role and writes audit log', async () => {
      vi.mocked(authModule.auth).mockResolvedValueOnce({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      // Find an existing non-admin user
      const testUser = await prisma.user.findFirst({
        where: { role: 'CUSTOMER' },
      });

      if (!testUser) {
        throw new Error('No customer user found in test DB');
      }

      const req = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: testUser.id,
          role: 'CREATOR',
        }),
      });

      const res = await updateUserRole(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('CREATOR');

      // Verify Audit Event logged
      const auditLog = await prisma.auditEvent.findFirst({
        where: {
          action: 'USER_ROLE_CHANGED',
          entityId: testUser.id,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe('admin-1');

      // Cleanup: revert user role
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: 'CUSTOMER' },
      });
    });
  });
});
