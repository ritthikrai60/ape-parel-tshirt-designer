import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { stripe, toStripeThbAmount } from '@/lib/stripe';
import { createOrderAtomic } from '@/lib/orders';
import { calculateLivePricing } from '@/lib/pricing';
const designElementSchema = z.object({
  id: z.string(),
  artworkId: z.string().min(1),
  licenseOptionId: z.string().min(1),
  title: z.string(),
  previewUrl: z.string(),
  creatorName: z.string(),
  creatorId: z.string(),
  surface: z.enum(['FRONT', 'BACK', 'SIDE']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  zIndex: z.number(),
  price: z.number(),
});

const artworkLicenseLineSchema = z.object({
  artworkId: z.string().min(1),
  licenseOptionId: z.string().min(1),
});

const stripeCheckoutSchema = z.object({
  garmentProductId: z.string({ required_error: 'garmentProductId is required' }),
  garmentVariantId: z.string().optional(),
  garmentColorHex: z.string().optional(),
  garmentSize: z.string().optional(),
  garmentFit: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
  designTitle: z.string().optional(),
  frontElements: z.array(designElementSchema).optional(),
  backElements: z.array(designElementSchema).optional(),
  sideElements: z.array(designElementSchema).optional(),
  frontArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  backArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  sideArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  previewFrontUrl: z.string().optional(),
  previewBackUrl: z.string().optional(),
  customerId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  shippingName: z.string().min(1, 'shippingName is required'),
  shippingAddress: z.string().min(1, 'shippingAddress is required'),
  shippingCity: z.string().min(1, 'shippingCity is required'),
  shippingPostal: z.string().min(1, 'shippingPostal is required'),
  shippingPhone: z.string().optional(),
  clientClaimedTotal: z.number().optional(),
});

/**
 * POST /api/checkout/stripe
 * 
 * 1. Server-authoritatively verifies pricing and anti-tamper.
 * 2. Creates the Order atomically in AWAITING_PAYMENT state.
 * 3. Creates a Stripe PaymentIntent in THB (with dynamic payment methods enabled).
 * 4. Saves stripePaymentIntentId & stripeClientSecret to the Order.
 * 5. Returns clientSecret to frontend to mount Stripe Payment Element (PromptPay QR & Cards).
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parseResult = stripeCheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation Error', issues: parseResult.error.format() },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // 1. Authoritative Server-Side Pricing Calculation
    const pricing = await calculateLivePricing({
      garmentProductId: input.garmentProductId,
      garmentVariantId: input.garmentVariantId,
      quantity: input.quantity,
      userId: input.customerId,
      frontArtworkLicenses: input.frontArtworkLicenses,
      backArtworkLicenses: input.backArtworkLicenses,
      sideArtworkLicenses: input.sideArtworkLicenses,
    });

    // 2. Anti-Tampering Check
    if (
      input.clientClaimedTotal !== undefined &&
      input.clientClaimedTotal !== null &&
      input.clientClaimedTotal !== pricing.totalAmount
    ) {
      return NextResponse.json(
        {
          error: 'Price Tampering Detected',
          message: `Claimed total ${input.clientClaimedTotal} does not match server authoritative total ${pricing.totalAmount}`,
        },
        { status: 400 }
      );
    }

    // 3. Create Order Atomically in 'AWAITING_PAYMENT' state
    const orderResult = await createOrderAtomic({
      ...input,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'UNPAID',
      paymentMode: 'STRIPE',
    });

    const orderNumber = orderResult.orderNumber;
    const orderId = orderResult.orderId;
    const totalAmountThb = pricing.totalAmount;

    // 4. Create Stripe PaymentIntent using official best-practices
    // Never include payment_method_types to allow dynamic payment methods (PromptPay, Cards, Wallets)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeThbAmount(totalAmountThb),
      currency: 'thb',
      description: `ape-parel Order #${orderNumber}`,
      metadata: {
        orderId,
        orderNumber,
        customerId: input.customerId || 'GUEST',
        customerEmail: input.customerEmail || 'N/A',
      },
      receipt_email: input.customerEmail || undefined,
      shipping: {
        name: input.shippingName,
        phone: input.shippingPhone || undefined,
        address: {
          line1: input.shippingAddress,
          city: input.shippingCity,
          postal_code: input.shippingPostal,
          country: 'TH',
        },
      },
    });

    // 5. Update Order with Stripe identifiers
    await prisma.order.update({
      where: { id: orderId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId,
      orderNumber,
      totalAmount: totalAmountThb,
      currency: 'thb',
    });
  } catch (error: any) {
    console.error('[Stripe Checkout API Error]', error);
    return NextResponse.json(
      {
        error: 'Stripe Checkout Creation Failed',
        message: error?.message || 'Unknown error occurred while creating Stripe payment intent',
      },
      { status: 500 }
    );
  }
}
