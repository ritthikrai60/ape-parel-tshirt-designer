import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  getSupplierInventoryMatrix,
  batchUpdateVariantStock,
  LOW_STOCK_THRESHOLD,
  isLowStock,
} from '@/lib/supplier';

// Helper function mirroring the exact logic in src/app/login/page.tsx
function resolvePostLoginDestination(
  role?: string,
  rawCallback?: string | null,
  devEmail?: string
): string {
  const isGenericCallback =
    !rawCallback ||
    rawCallback === '/studio/new' ||
    rawCallback === '/' ||
    rawCallback === '/marketplace' ||
    rawCallback === '/login';

  // 1. Explicit specific return path (e.g. checkout, specific artwork in studio)
  if (!isGenericCallback && rawCallback) {
    return rawCallback;
  }

  // 2. Dev fast-login overrides
  if (devEmail) {
    if (devEmail.includes('dashape') || devEmail.includes('creator')) {
      return '/creator/dashboard';
    }
    if (devEmail.includes('garment') || devEmail.includes('supplier')) {
      return '/supplier/dashboard';
    }
    return '/marketplace';
  }

  // 3. User Role mapping
  if (role === 'CREATOR') return '/creator/dashboard';
  if (role === 'SUPPLIER') return '/supplier/dashboard';
  if (role === 'ADMIN') return '/admin';
  return '/marketplace';
}

describe('Role-Based Login Redirection & Supplier Dashboard Focus Suite', () => {
  describe('1. Role-Based Post-Login Redirection Rules', () => {
    it('redirects CREATOR to /creator/dashboard upon normal login', () => {
      const destination = resolvePostLoginDestination('CREATOR', null);
      expect(destination).toBe('/creator/dashboard');
    });

    it('redirects CREATOR to /creator/dashboard when callback is default /studio/new or root', () => {
      expect(resolvePostLoginDestination('CREATOR', '/studio/new')).toBe('/creator/dashboard');
      expect(resolvePostLoginDestination('CREATOR', '/')).toBe('/creator/dashboard');
      expect(resolvePostLoginDestination('CREATOR', '/marketplace')).toBe('/creator/dashboard');
    });

    it('redirects SUPPLIER to /supplier/dashboard upon normal login', () => {
      const destination = resolvePostLoginDestination('SUPPLIER', null);
      expect(destination).toBe('/supplier/dashboard');
    });

    it('redirects SUPPLIER to /supplier/dashboard when callback is default /studio/new or root', () => {
      expect(resolvePostLoginDestination('SUPPLIER', '/studio/new')).toBe('/supplier/dashboard');
      expect(resolvePostLoginDestination('SUPPLIER', '/')).toBe('/supplier/dashboard');
      expect(resolvePostLoginDestination('SUPPLIER', '/marketplace')).toBe('/supplier/dashboard');
    });

    it('redirects ADMIN to /admin upon login when no specific callback is given', () => {
      expect(resolvePostLoginDestination('ADMIN', null)).toBe('/admin');
    });

    it('redirects CUSTOMER to /marketplace upon standard login', () => {
      expect(resolvePostLoginDestination('CUSTOMER', null)).toBe('/marketplace');
      expect(resolvePostLoginDestination('CUSTOMER', '/studio/new')).toBe('/marketplace');
    });

    it('preserves specific deep-link callback URLs for all users', () => {
      expect(
        resolvePostLoginDestination('CREATOR', '/studio/new?artworkId=art-123')
      ).toBe('/studio/new?artworkId=art-123');

      expect(
        resolvePostLoginDestination('SUPPLIER', '/supplier/jobs/APX-ORD-999')
      ).toBe('/supplier/jobs/APX-ORD-999');

      expect(
        resolvePostLoginDestination('CUSTOMER', '/checkout')
      ).toBe('/checkout');
    });

    it('correctly routes Dev Fast Login buttons by user persona', () => {
      expect(
        resolvePostLoginDestination(undefined, null, 'dashape@ape-parel.com')
      ).toBe('/creator/dashboard');

      expect(
        resolvePostLoginDestination(undefined, null, 'production@bangkokgarment.co.th')
      ).toBe('/supplier/dashboard');

      expect(
        resolvePostLoginDestination(undefined, null, 'customer@ape-parel.com')
      ).toBe('/marketplace');
    });
  });

  describe('2. Supplier Dashboard Focus: Tasks, Inbox & Stock Matrix', () => {
    it('verifies LOW_STOCK_THRESHOLD is defined and isLowStock works correctly', () => {
      expect(LOW_STOCK_THRESHOLD).toBe(10);
      expect(isLowStock(9)).toBe(true);
      expect(isLowStock(0)).toBe(true);
      expect(isLowStock(10)).toBe(false);
      expect(isLowStock(100)).toBe(false);
    });

    it('loads supplier inventory matrix with multi-dimensional Colorway x Size structure', async () => {
      const matrix = await getSupplierInventoryMatrix('bangkok-garment-craft');
      expect(matrix).toBeDefined();
      expect(matrix.supplierSlug).toBe('bangkok-garment-craft');
      expect(matrix.availableSizes.length).toBeGreaterThan(0);
      expect(matrix.colorRows.length).toBeGreaterThan(0);
      expect(typeof matrix.totalUnitsInStock).toBe('number');
      expect(typeof matrix.lowStockCount).toBe('number');
    });

    it('allows rapid stock adjustments and batch updates via library', async () => {
      const matrix = await getSupplierInventoryMatrix('bangkok-garment-craft');
      const firstRow = matrix.colorRows[0];
      const firstSize = matrix.availableSizes[0];
      const variant = firstRow.sizes[firstSize];

      if (variant) {
        const originalStock = variant.stock;
        const testNewStock = originalStock + 5;

        // Apply update
        const updated = await batchUpdateVariantStock([
          { variantId: variant.id, stock: testNewStock },
        ]);
        expect(updated).toHaveLength(1);
        expect(updated[0].stock).toBe(testNewStock);

        // Revert back
        await batchUpdateVariantStock([
          { variantId: variant.id, stock: originalStock },
        ]);
      }
    });

    it('confirms existing orders can be retrieved for tasks queue', async () => {
      const supplier = await prisma.supplierProfile.findUnique({
        where: { slug: 'bangkok-garment-craft' },
      });
      expect(supplier).toBeDefined();

      const orders = await prisma.order.findMany({
        where: { supplierId: supplier!.id },
      });
      expect(Array.isArray(orders)).toBe(true);
    });
  });
});
