import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toStripeThbAmount, fromStripeThbAmount } from '@/lib/stripe';

describe('Stripe Payment Integration Suite', () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
  });

  describe('THB Currency Satang Conversion', () => {
    it('converts integer Baht to Satang correctly', () => {
      expect(toStripeThbAmount(100)).toBe(10000);
      expect(toStripeThbAmount(450)).toBe(45000);
      expect(toStripeThbAmount(0)).toBe(0);
    });

    it('handles decimal Baht accurately rounding to nearest integer satang', () => {
      expect(toStripeThbAmount(99.5)).toBe(9950);
      expect(toStripeThbAmount(99.99)).toBe(9999);
      expect(toStripeThbAmount(123.456)).toBe(12346);
    });

    it('converts satang back to Baht correctly', () => {
      expect(fromStripeThbAmount(10000)).toBe(100);
      expect(fromStripeThbAmount(45000)).toBe(450);
      expect(fromStripeThbAmount(9950)).toBe(100);
    });
  });

  describe('Stripe Checkout Route Validation & Pricing Anti-Tamper', () => {
    it('rejects checkout request missing shipping details', async () => {
      const payload = {
        garmentProductId: 'garment_prod_mock',
        quantity: 1,
        // missing shippingName, shippingAddress, etc.
      };

      const { POST } = await import('@/app/api/checkout/stripe/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Validation Error');
      expect(data.issues).toBeDefined();
    });

    it('rejects malformed JSON payloads gracefully', async () => {
      const { POST } = await import('@/app/api/checkout/stripe/route');
      const req = new Request('http://localhost:3000/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json',
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON request body');
    });
  });

  describe('Stripe Webhook Signature Verification Guard', () => {
    it('rejects webhooks with missing stripe-signature header when secret is active', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_active_production_secret';

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const req = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_test' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing stripe-signature header');
    });

    it('acknowledges unhandled event types safely in dev mode', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = '';

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const req = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({
          id: 'evt_test_unhandled',
          type: 'customer.created',
          data: { object: {} }
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(data.type).toBe('customer.created');
    });
  });
});
