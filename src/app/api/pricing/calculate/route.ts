import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateLivePricing } from '@/lib/pricing';
import { PricingPayload, PriceCalculationResult } from '@/lib/types';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

/**
 * Zod validation schema for individual artwork license lines
 */
const artworkLicenseLineSchema = z.object({
  artworkId: z
    .string({ required_error: 'artworkId is required' })
    .min(1, 'artworkId cannot be empty'),
  licenseOptionId: z
    .string({ required_error: 'licenseOptionId is required' })
    .min(1, 'licenseOptionId cannot be empty'),
});

/**
 * Zod validation schema for pricing calculation payload
 */
const pricingCalculateSchema = z.object({
  garmentProductId: z
    .string({ required_error: 'garmentProductId is required' })
    .min(1, 'garmentProductId cannot be empty'),
  garmentVariantId: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1')
    .optional()
    .default(1),
  frontArtworkLicenses: z
    .array(artworkLicenseLineSchema)
    .optional()
    .default([]),
  backArtworkLicenses: z
    .array(artworkLicenseLineSchema)
    .optional()
    .default([]),
  sideArtworkLicenses: z
    .array(artworkLicenseLineSchema)
    .optional()
    .default([]),
});

type PricingCalculateInput = z.infer<typeof pricingCalculateSchema>;

/**
 * POST /api/pricing/calculate
 * Server-authoritative live price calculation endpoint
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON body
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

  // 2. Validate payload with Zod
  const parseResult = pricingCalculateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid pricing calculation payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const payload: PricingPayload = parseResult.data;

  // 3. Compute live pricing via authoritative engine
  try {
    const result: PriceCalculationResult = await calculateLivePricing(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown calculation error occurred';

    // Business error: Garment not found -> 404
    if (message.includes('Garment product not found')) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message,
        },
        { status: 404 }
      );
    }

    // Business error: Invalid license option, mismatched artwork, or variant not found -> 400
    if (
      message.includes('License option not found') ||
      message.includes('License option') ||
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

    // Unexpected internal errors -> 500
    console.error('[POST /api/pricing/calculate] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to calculate live pricing.',
      },
      { status: 500 }
    );
  }
}
