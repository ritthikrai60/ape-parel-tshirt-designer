import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

describe('Authentication: Email Verification & Password Reset Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Verification API', () => {
    it('rejects /api/auth/verify-email/request when unauthenticated and no email provided in body', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const { POST } = await import('@/app/api/auth/verify-email/request/route');
      const req = new Request('http://localhost:3000/api/auth/verify-email/request', {
        method: 'POST',
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Valid email address is required');
    });

    it('rejects /api/auth/verify-email/confirm when token is missing', async () => {
      const { GET } = await import('@/app/api/auth/verify-email/confirm/route');
      const req = new Request('http://localhost:3000/api/auth/verify-email/confirm');
      const res = await GET(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Verification token is required');
    });

    it('returns error when verify-email token does not exist in VerificationToken store', async () => {
      const { GET } = await import('@/app/api/auth/verify-email/confirm/route');
      const req = new Request('http://localhost:3000/api/auth/verify-email/confirm?token=non_existent_token_123');
      const res = await GET(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid or expired verification token');
    });
  });

  describe('Password Reset API (Anti-Enumeration & Security)', () => {
    it('returns success for non-existent email on forgot-password (OWASP Anti-Enumeration)', async () => {
      const { POST } = await import('@/app/api/auth/forgot-password/route');
      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost_non_existent@example.com' }),
      });
      const res = await POST(req as any);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('If an account exists with this email');
    });

    it('validates minimum password length on reset-password', async () => {
      const { POST } = await import('@/app/api/auth/reset-password/route');
      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'some_dummy_token',
          newPassword: 'short', // less than 8 chars
        }),
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('New password must be at least 8 characters long');
    });

    it('rejects reset-password when token is invalid or expired', async () => {
      const { POST } = await import('@/app/api/auth/reset-password/route');
      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid_expired_token_9999',
          newPassword: 'SecureNewPassword123!',
        }),
      });
      const res = await POST(req as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid or expired password reset link');
    });
  });

  describe('Email Dispatch Service Utility Functions', () => {
    it('renders and dispatches order confirmation with E-Receipt properly', async () => {
      const { sendOrderConfirmationReceiptEmail } = await import('@/lib/email');

      const result = await sendOrderConfirmationReceiptEmail({
        id: 'ord_test_receipt_123',
        orderNumber: 'APX-ORD-5678',
        totalAmount: 700,
        quantity: 1,
        customerEmail: 'buyer@test.com',
        shippingName: 'Buyer Test',
        shippingAddress: '123 Sukhumvit Road',
        shippingCity: 'Watthana',
        shippingPostal: '10110',
        supplierName: 'Bangkok Garment Craft Co., Ltd.',
        garmentName: 'Premium Heavyweight Cotton T-Shirt',
        garmentSize: 'XL',
        stripeReceiptUrl: 'https://pay.stripe.com/receipts/test_receipt_url',
        basePrice: 450,
        printCost: 150,
        royaltyCost: 50,
        shippingCost: 50,
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('renders and dispatches shipped order notification with tracking details', async () => {
      const { sendOrderShippedEmail } = await import('@/lib/email');

      const result = await sendOrderShippedEmail({
        id: 'ord_test_shipped_123',
        orderNumber: 'APX-ORD-1234',
        customerEmail: 'buyer@test.com',
        carrierName: 'Thailand Post EMS',
        trackingNumber: 'TH8829102-APX',
        shippingAddress: '123 Sukhumvit Road, Watthana, Bangkok 10110',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });
});

