import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getBanners, POST as createBanner } from '@/app/api/admin/cms/banners/route';
import { PATCH as updateBanner, DELETE as deleteBanner } from '@/app/api/admin/cms/banners/[id]/route';
import { GET as getPromos, POST as createPromo } from '@/app/api/admin/cms/promos/route';
import { PATCH as updatePromo, DELETE as deletePromo } from '@/app/api/admin/cms/promos/[id]/route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/auth';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Pillar C: Marketplace CMS, Hero Banners & Promo Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Storefront Hero Banners CMS', () => {
    it('creates, retrieves, toggles, and deletes promotional hero banners', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      // Create banner
      const createReq = new NextRequest('http://localhost:3000/api/admin/cms/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: 'CYBER STREETWEAR 2026 DROP',
          subtitle: 'Heavyweight apparel with futuristic Japanese kanji prints',
          badgeText: 'NEW DROP',
          ctaText: 'Browse Drop',
        }),
      });

      const createRes = await createBanner(createReq);
      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      expect(createData.success).toBe(true);
      const bannerId = createData.banner.id;
      expect(bannerId).toBeDefined();

      // Retrieve banners
      const getRes = await getBanners();
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.banners.some((b: any) => b.id === bannerId)).toBe(true);

      // Edit banner copy, CTA link, colors, and priority
      const editReq = new NextRequest(`http://localhost:3000/api/admin/cms/banners/${bannerId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'UPDATED CYBER DROP // 2026',
          subtitle: 'Revised subtitle copy with high GSM fabric',
          badgeText: 'LIMITED EDITION',
          ctaText: 'Shop New Arrivals',
          ctaLink: '/marketplace?category=cyber',
          bgColor: '#042f2e',
          textColor: '#a7f3d0',
          priority: 5,
          isActive: true,
        }),
      });
      const editRes = await updateBanner(editReq, { params: { id: bannerId } });
      expect(editRes.status).toBe(200);
      const editData = await editRes.json();
      expect(editData.banner.title).toBe('UPDATED CYBER DROP // 2026');
      expect(editData.banner.subtitle).toBe('Revised subtitle copy with high GSM fabric');
      expect(editData.banner.badgeText).toBe('LIMITED EDITION');
      expect(editData.banner.ctaText).toBe('Shop New Arrivals');
      expect(editData.banner.ctaLink).toBe('/marketplace?category=cyber');
      expect(editData.banner.bgColor).toBe('#042f2e');
      expect(editData.banner.textColor).toBe('#a7f3d0');
      expect(editData.banner.priority).toBe(5);
      expect(editData.banner.isActive).toBe(true);

      // Toggle active status
      const patchReq = new NextRequest(`http://localhost:3000/api/admin/cms/banners/${bannerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      const patchRes = await updateBanner(patchReq, { params: { id: bannerId } });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.banner.isActive).toBe(false);

      // Delete banner
      const delReq = new NextRequest(`http://localhost:3000/api/admin/cms/banners/${bannerId}`, {
        method: 'DELETE',
      });
      const delRes = await deleteBanner(delReq, { params: { id: bannerId } });
      expect(delRes.status).toBe(200);
    });
  });

  describe('2. Promo & Coupon Code Engine', () => {
    it('creates promo code, enforces uniqueness, toggles active state, and deletes', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      } as any);

      const testCode = `PROMO_${Date.now().toString().slice(-4)}`;

      // Create Promo
      const createReq = new NextRequest('http://localhost:3000/api/admin/cms/promos', {
        method: 'POST',
        body: JSON.stringify({
          code: testCode,
          discountType: 'PERCENT',
          discountValue: 20,
          minOrderAmount: 400,
          maxUses: 150,
        }),
      });

      const createRes = await createPromo(createReq);
      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      expect(createData.success).toBe(true);
      const promoId = createData.promo.id;
      expect(createData.promo.code).toBe(testCode);

      // Test duplicate code prevention
      const dupReq = new NextRequest('http://localhost:3000/api/admin/cms/promos', {
        method: 'POST',
        body: JSON.stringify({
          code: testCode,
          discountType: 'FIXED',
          discountValue: 100,
        }),
      });
      const dupRes = await createPromo(dupReq);
      expect(dupRes.status).toBe(400);

      // Toggle Active state
      const patchReq = new NextRequest(`http://localhost:3000/api/admin/cms/promos/${promoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      const patchRes = await updatePromo(patchReq, { params: { id: promoId } });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.promo.isActive).toBe(false);

      // Delete Promo
      const delReq = new NextRequest(`http://localhost:3000/api/admin/cms/promos/${promoId}`, {
        method: 'DELETE',
      });
      const delRes = await deletePromo(delReq, { params: { id: promoId } });
      expect(delRes.status).toBe(200);
    });
  });
});
