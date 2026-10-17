import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const positivePriceSchema = z
  .number({ invalid_type_error: 'Price must be a number' })
  .int('Price must be an integer in THB')
  .positive('Price must be a strictly positive integer greater than 0 THB');

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

export async function PATCH(
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

  try {
    const updatedLicenses = await prisma.$transaction(async (tx) => {
      const existingLicenses = artwork.licenseOptions;

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

      if (standardPrice !== undefined) {
        await applyTierUpdate({
          scope: 'PER_GARMENT',
          name: 'Standard Apparel License',
          price: standardPrice,
          terms: 'Single production unit print license with creator attribution.',
        });
      }

      if (commercialPrice !== undefined) {
        await applyTierUpdate({
          scope: 'COMMERCIAL_BATCH',
          name: 'Commercial License',
          price: commercialPrice,
          terms: 'Commercial production license for small batch releases up to 500 units.',
        });
      }

      if (extendedPrice !== undefined) {
        await applyTierUpdate({
          scope: 'EXTENDED_MERCHANDISE',
          name: 'Extended Merchandise License',
          price: extendedPrice,
          terms: 'Unlimited commercial merchandise production license.',
        });
      }

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

      const freshLicenses = await tx.licenseOption.findMany({
        where: { artworkId: artwork.id },
        orderBy: { price: 'asc' },
      });

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
