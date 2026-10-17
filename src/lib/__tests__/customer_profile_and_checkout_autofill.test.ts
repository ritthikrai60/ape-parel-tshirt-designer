import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('Customer Profile & Shipping Auto-fill Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile API Validation & Security Guard', () => {
    it('rejects unauthorized requests to GET /api/user/profile with 401', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const { GET } = await import('@/app/api/user/profile/route');
      const req = new Request('http://localhost:3000/api/user/profile');
      const res = await GET(req as any);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('rejects unauthorized requests to PUT /api/user/profile with 401', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const { PUT } = await import('@/app/api/user/profile/route');
      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker' }),
      });
      const res = await PUT(req as any);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('validates postal code format (must be 5 digits)', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'test_user_id', email: 'customer@test.com' },
      });

      const { PUT } = await import('@/app/api/user/profile/route');
      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingPostal: '123', // invalid: not 5 digits
        }),
      });

      const res = await PUT(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation Error');
      expect(data.issues.shippingPostal).toBeDefined();
    });

    it('validates Tax ID format (must be 13 digits if provided)', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'test_user_id', email: 'customer@test.com' },
      });

      const { PUT } = await import('@/app/api/user/profile/route');
      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxId: '12345', // invalid: not 13 digits
        }),
      });

      const res = await PUT(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation Error');
      expect(data.issues.taxId).toBeDefined();
    });
  });

  describe('Database Profile & Shipping Field Compatibility', () => {
    it('verifies User model accepts all shipping and tax fields', async () => {
      const testEmail = `test_profile_${Date.now()}@ape-parel.com`;
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Jane Doe',
          phone: '081-992-4411',
          shippingName: 'Jane Doe',
          shippingPhone: '081-992-4411',
          shippingAddress: '123 Thong Lo Soi 10',
          shippingCity: 'Watthana, Bangkok',
          shippingProvince: 'Bangkok',
          shippingPostal: '10110',
          shippingCountry: 'TH',
          taxId: '0105558012345',
          billingName: 'Jane Doe Co., Ltd.',
          billingAddress: '123 Thong Lo Soi 10, Watthana, Bangkok',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.shippingPostal).toBe('10110');
      expect(user.taxId).toBe('0105558012345');
      expect(user.shippingCountry).toBe('TH');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
