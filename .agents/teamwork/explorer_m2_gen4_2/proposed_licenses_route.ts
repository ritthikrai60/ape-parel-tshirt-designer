import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Positive integer validator for THB license fees
 */
const positivePriceSchema = z
  .number({ invalid_type_error: 'Price must be a number' })
  .int('Price must be an integer in THB')
  .positive('Price must be a strictly positive integer greater than 0 THB');

/**
 * Zod schema supporting multiple common client payload conventions:
 * 1. Direct fields: { standardPrice: 50, commercialPrice: 120, extendedPrice: 300 }
 * 2. Scope fields: { PER_GARMENT: 50, COMMERCIAL_BATCH: 120, EXTENDED_MERCHANDISE: 300 }
 * 3. Nested object: { prices: { standard: 50, commercial: 120, extended: 300 } }
 * 4. Array of tiers: { licenses: [{ id: "...", price: 50 }, { scope: "...", price: 120 }] }
 */
const updateLicensesSchema = z.object({
  creatorId: z.string().optional(),
  standardPrice: positivePriceSchema.optional(),
  commercialPrice: positivePriceSchema.optional(),
  extendedPrice: positivePriceSchema.optional(),
  PER_GARMENT: positivePriceSchema.optional(),
  COMMERCIAL_BATCH: positivePriceSchema.optional(),
  EXTENDED_MERCHANDISE: positivePriceSchema.optional(),
  prices: z
    .object({
      standard: positivePriceSchema.optional(),
      commercial: positivePriceSchema.optional(),
      extended: positivePriceSchema.optional(),
      standardPrice: positivePriceSchema.optional(),
      commercialPrice: positivePriceSchema.optional(),
      extendedPrice: positivePriceSchema.optional(),
      PER_GARMENT: positivePriceSchema.optional(),
      COMMERCIAL_BATCH: positivePriceSchema.optional(),
      EXTENDED_MERCHANDISE: positivePriceSchema.optional(),
    })
    .optional(),
  licenses: z
    .array(
      z.object({
        id: z.string().optional(),
        scope: z.string().optional(),
        name: z.string().optional(),
        price: positivePriceSchema,
      })
    )
    .optional(),
});

interface TargetTierPrice {
  scope: 'PER_GARMENT' | 'COMMERCIAL_BATCH' | 'EXTENDED_MERCHANDISE';
  name: string;
  price: number;
  terms: string;
}

/**
 * GET /api/artworks/[id]/licenses
 * Returns current licensing options and configured THB prices for the specified artwork.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Artwork ID parameter is required.',
      },
      { status: 400 }
    );
  }

  const artworkId = id.trim();

  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        creator: {
          select: {
            id: true,
            slug: true,
            displayName: true,
          },
        },
        licenseOptions: {
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!artwork) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Artwork not found with ID "${artworkId}".`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        artworkId: artwork.id,
        creator: artwork.creator,
        licenseOptions: artwork.licenseOptions,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch license options.';
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/artworks/[id]/licenses
 *
 * Allows creator to update custom THB prices for Standard, Commercial, and Extended tiers.
 * 1. Validates that artwork exists and caller is authorized (if creatorId provided).
 * 2. Validates that prices are positive integers in THB.
 * 3. Atomically updates licenseOption records in Prisma.
 * 4. Records immutable AuditEvent (action: 'LICENSE_PRICE_UPDATED').
 * 5. Returns HTTP 200 with updated license options.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  // 1. Validate URL Parameter
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Artwork ID parameter is required.',
      },
      { status: 400 }
    );
  }

  const artworkId = id.trim();

  // 2. Parse JSON Request Body
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

  // 3. Validate Request Body with Zod
  const parseResult = updateLicensesSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid license price update payload. Prices must be positive integers in THB.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const bodyData = parseResult.data;

  // 4. Resolve Target Prices
  const standardPrice =
    bodyData.standardPrice ??
    bodyData.PER_GARMENT ??
    bodyData.prices?.standard ??
    bodyData.prices?.standardPrice ??
    bodyData.prices?.PER_GARMENT;

  const commercialPrice =
    bodyData.commercialPrice ??
    bodyData.COMMERCIAL_BATCH ??
    bodyData.prices?.commercial ??
    bodyData.prices?.commercialPrice ??
    bodyData.prices?.COMMERCIAL_BATCH;

  const extendedPrice =
    bodyData.extendedPrice ??
    bodyData.EXTENDED_MERCHANDISE ??
    bodyData.prices?.extended ??
    bodyData.prices?.extendedPrice ??
    bodyData.prices?.EXTENDED_MERCHANDISE;

  const rawLicensesArray = bodyData.licenses ?? [];

  // Verify at least one tier price is provided
  const hasDirectTier =
    standardPrice !== undefined ||
    commercialPrice !== undefined ||
    extendedPrice !== undefined;
  const hasArrayTiers = rawLicensesArray.length > 0;

  if (!hasDirectTier && !hasArrayTiers) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'At least one license tier price (Standard, Commercial, or Extended) must be provided.',
      },
      { status: 400 }
    );
  }

  // 5. Look up Artwork and Current License Options
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: {
      creator: {
        include: {
          user: true,
        },
      },
      licenseOptions: true,
    },
  });

  if (!artwork) {
    return NextResponse.json(
      {
        error: 'Not Found',
        message: `Artwork not found with ID "${artworkId}".`,
      },
      { status: 404 }
    );
  }

  // 6. Optional Creator Authorization Check
  const callerCreatorId =
    bodyData.creatorId ??
    request.headers.get('x-creator-id') ??
    request.headers.get('x-user-id');

  if (callerCreatorId) {
    const isOwner =
      callerCreatorId === artwork.creatorId ||
      callerCreatorId === artwork.creator.slug ||
      callerCreatorId === artwork.creator.userId ||
      callerCreatorId === artwork.creator.user?.id;

    if (!isOwner) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You are not authorized to modify license prices for this artwork.',
        },
        { status: 403 }
      );
    }
  }

  // 7. Execute Atomic Price Updates in Prisma Transaction
  try {
    const updatedLicenses = await prisma.$transaction(async (tx) => {
      const existingLicenses = artwork.licenseOptions;

      // Helper to update or upsert a tier
      const applyTierUpdate = async (tier: TargetTierPrice) => {
        const found = existingLicenses.find(
          (l) =>
            l.scope === tier.scope ||
            (tier.scope === 'PER_GARMENT' && /standard/i.test(l.name)) ||
            (tier.scope === 'COMMERCIAL_BATCH' && /commercial/i.test(l.name)) ||
            (tier.scope === 'EXTENDED_MERCHANDISE' && /extended/i.test(l.name))
        );

        if (found) {
          await tx.licenseOption.update({
            where: { id: found.id },
            data: {
              price: tier.price,
              scope: tier.scope,
            },
          });
        } else {
          await tx.licenseOption.create({
            data: {
              artworkId: artwork.id,
              name: tier.name,
              price: tier.price,
              scope: tier.scope,
              commercialUse: true,
              terms: tier.terms,
            },
          });
        }
      };

      // Apply standard tier if specified
      if (standardPrice !== undefined) {
        await applyTierUpdate({
          scope: 'PER_GARMENT',
          name: 'Standard Apparel License',
          price: standardPrice,
          terms: 'Single production unit print license with creator attribution.',
        });
      }

      // Apply commercial tier if specified
      if (commercialPrice !== undefined) {
        await applyTierUpdate({
          scope: 'COMMERCIAL_BATCH',
          name: 'Commercial License',
          price: commercialPrice,
          terms: 'Commercial production license for small batch releases up to 500 units.',
        });
      }

      // Apply extended tier if specified
      if (extendedPrice !== undefined) {
        await applyTierUpdate({
          scope: 'EXTENDED_MERCHANDISE',
          name: 'Extended Merchandise License',
          price: extendedPrice,
          terms: 'Unlimited commercial merchandise production license.',
        });
      }

      // Apply explicit licenses array items if specified
      for (const item of rawLicensesArray) {
        if (item.id) {
          const matchingById = existingLicenses.find((l) => l.id === item.id);
          if (matchingById) {
            await tx.licenseOption.update({
              where: { id: item.id },
              data: { price: item.price },
            });
            continue;
          }
        }

        if (item.scope) {
          const normalizedScope = item.scope.toUpperCase() as TargetTierPrice['scope'];
          await applyTierUpdate({
            scope: normalizedScope,
            name: item.name ?? `${item.scope} License`,
            price: item.price,
            terms: 'Custom creator-defined license terms.',
          });
          continue;
        }

        if (item.name) {
          const matchingByName = existingLicenses.find(
            (l) => l.name.toLowerCase() === item.name!.toLowerCase()
          );
          if (matchingByName) {
            await tx.licenseOption.update({
              where: { id: matchingByName.id },
              data: { price: item.price },
            });
          }
        }
      }

      // Query refreshed list of license options
      const freshLicenses = await tx.licenseOption.findMany({
        where: { artworkId: artwork.id },
        orderBy: { price: 'asc' },
      });

      // Record Immutable AuditEvent
      await recordAuditEvent(
        {
          action: AuditAction.LICENSE_PRICE_UPDATED,
          entityType: 'Artwork',
          entityId: artwork.id,
          actorId: artwork.creator.user?.id || artwork.creator.id,
          userId: artwork.creator.userId,
          payload: {
            artworkId: artwork.id,
            creatorId: artwork.creatorId,
            previousLicenses: existingLicenses.map((l) => ({
              id: l.id,
              name: l.name,
              scope: l.scope,
              price: l.price,
            })),
            updatedLicenses: freshLicenses.map((l) => ({
              id: l.id,
              name: l.name,
              scope: l.scope,
              price: l.price,
            })),
          },
          metadata: {
            updatedTiersCount: freshLicenses.length,
            timestamp: new Date().toISOString(),
          },
        },
        tx
      );

      return freshLicenses;
    });

    // 8. Return HTTP 200 with Updated License Options
    return NextResponse.json(
      {
        success: true,
        artworkId: artwork.id,
        licenseOptions: updatedLicenses,
      },
      { status: 200 }
    );
  } catch (updateError: unknown) {
    const message =
      updateError instanceof Error
        ? updateError.message
        : 'Failed to update license prices in database transaction.';
    return NextResponse.json(
      {
        error: 'Database Error',
        message,
      },
      { status: 500 }
    );
  }
}
