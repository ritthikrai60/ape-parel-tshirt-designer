import Stripe from 'stripe';

/**
 * Server-side Stripe SDK Client Instance
 * Following Stripe Best Practices:
 * - Always instantiate StripeClient per instance (never deprecated global config)
 * - Uses isolated Stripe Sandbox test keys
 * - Dynamically handles THB / PromptPay & Cards
 */
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
  console.warn('[Stripe] STRIPE_SECRET_KEY is missing from environment.');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10' as any, // Current stable API version supported by SDK
  appInfo: {
    name: 'ape-parel',
    url: 'https://ape-parel.ngrok.app',
    version: '0.1.0',
  },
  typescript: true,
});

/**
 * Format THB amount for Stripe (THB is a zero-decimal or 2-decimal currency?)
 * NOTE: Stripe currency guide specifies THB (Thai Baht) is a 2-decimal currency.
 * 100 THB = 10,000 satang.
 */
export function toStripeThbAmount(thb: number): number {
  return Math.round(thb * 100);
}

export function fromStripeThbAmount(amountInSatang: number): number {
  return Math.round(amountInSatang / 100);
}
