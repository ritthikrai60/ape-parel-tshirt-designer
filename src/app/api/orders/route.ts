import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createOrderAtomic } from '@/lib/orders';
import { CreateOrderInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

const createOrderSchema = z.object({
  garmentProductId: z
    .string({ required_error: 'garmentProductId is required' })
    .min(1, 'garmentProductId cannot be empty'),
  garmentVariantId: z.string().optional(),
  garmentColorHex: z.string().optional().default('#131718'),
  garmentSize: z.string().optional().default('L'),
  garmentFit: z.string().optional().default('oversized'),
  designTitle: z.string().optional().default('Custom Tee'),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1')
    .optional()
    .default(1),
  frontElements: z.array(designElementSchema).optional().default([]),
  backElements: z.array(designElementSchema).optional().default([]),
  sideElements: z.array(designElementSchema).optional().default([]),
  frontArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  backArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  sideArtworkLicenses: z.array(artworkLicenseLineSchema).optional(),
  previewFrontUrl: z.string().optional(),
  previewBackUrl: z.string().optional(),
  customerId: z.string().optional(),
  shippingName: z
    .string({ required_error: 'shippingName is required' })
    .min(1, 'shippingName cannot be empty'),
  shippingAddress: z
    .string({ required_error: 'shippingAddress is required' })
    .min(1, 'shippingAddress cannot be empty'),
  shippingCity: z
    .string({ required_error: 'shippingCity is required' })
    .min(1, 'shippingCity cannot be empty'),
  shippingPostal: z
    .string({ required_error: 'shippingPostal is required' })
    .min(1, 'shippingPostal cannot be empty'),
  shippingPhone: z.string().optional(),
  clientClaimedTotal: z.number().optional(),
  paymentMode: z.string().optional().default('DEV_MOCK'),
  paymentStatus: z.string().optional().default('PAID'),
});

/**
 * POST /api/orders
 * Atomic Order Placement endpoint with server pricing and anti-tamper check.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON',
        message: 'Request body must be a valid JSON object.',
      },
      { status: 400 }
    );
  }

  const parseResult = createOrderSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid order placement payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const input: CreateOrderInput = parseResult.data;

  try {
    const result = await createOrderAtomic(input);
    return NextResponse.json(
      {
        success: true,
        order: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown order creation error';

    // Anti-tamper violation
    if (message.includes('Price tampering detected')) {
      return NextResponse.json(
        {
          error: 'Price Tampering Detected',
          message,
        },
        { status: 400 }
      );
    }

    // Missing garment product
    if (message.includes('Garment product not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Invalid license option or variant
    if (
      message.includes('License option not found') ||
      message.includes('does not belong to artwork') ||
      message.includes('Garment variant not found') ||
      message.includes('Missing licenseOptionId')
    ) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message,
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/orders] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process order transaction.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * Query orders with optional filtering by customerId or supplierId.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId') ?? undefined;
  const supplierId = searchParams.get('supplierId') ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10))
  );
  const skip = (page - 1) * limit;

  try {
    const whereClause: { customerId?: string; supplierId?: string } = {};
    if (customerId) whereClause.customerId = customerId;
    if (supplierId) whereClause.supplierId = supplierId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          design: true,
          obligations: {
            include: {
              artwork: true,
              licenseOption: true,
            },
          },
        },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/orders] Error fetching orders:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to retrieve orders.',
      },
      { status: 500 }
    );
  }
}
