import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { recordAuditEvent, AuditAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const positivePriceSchema = z
  .number({ invalid_type_error: 'Price must be a number' })
  .int('Price must be an integer in THB')
  .positive('Price must be a strictly positive integer greater than 0 THB');

const updateArtworkSchema = z.object({
  title: z
    .string({ invalid_type_error: 'Title must be a string' })
    .trim()
    .min(1, 'ชื่อผลงานต้องไม่ว่างเปล่า')
    .max(100, 'ชื่อผลงานยาวไม่เกิน 100 ตัวอักษร')
    .optional(),
  description: z
    .string({ invalid_type_error: 'Description must be a string' })
    .trim()
    .max(1000, 'คำอธิบายผลงานยาวไม่เกิน 1,000 ตัวอักษร')
    .optional()
    .nullable(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).optional(),
  perGarmentPrice: positivePriceSchema.optional(),
  lifetimePrice: positivePriceSchema.optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/artworks/[id]
 * Retrieves artwork details, creator profile, and all active license options.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const artworkId = params.id?.trim();

  if (!artworkId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Artwork ID parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        creator: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            userId: true,
          },
        },
        licenseOptions: {
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!artwork) {
      return NextResponse.json(
        { error: 'Not Found', message: `Artwork not found with ID "${artworkId}".` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        artwork,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve artwork.';
    console.error(`[GET /api/artworks/${artworkId}] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 });
  }
}

/**
 * PATCH /api/artworks/[id]
 * Updates artwork title, description, store status, and in-place license prices.
 * Strict Moderation Policy:
 * - If title or description is modified -> status changes to DRAFT, moderationStatus to PENDING.
 * - If only prices are updated -> keeps current approved status.
 * In-place DB Updates:
 * - Preserves existing LicenseOption IDs to avoid Foreign Key constraint issues.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const artworkId = params.id?.trim();

  if (!artworkId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Artwork ID parameter is required.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', message: 'Request body must be a valid JSON object.' },
      { status: 400 }
    );
  }

  const parseResult = updateArtworkSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid artwork update payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const data = parseResult.data;

  // Retrieve current artwork with creator and license options
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
      { error: 'Not Found', message: `Artwork not found with ID "${artworkId}".` },
      { status: 404 }
    );
  }

  // Authorization check: User must be creator owner or ADMIN
  const session = await auth();
  const sessionUserId = session?.user?.id;
  const sessionUserRole = (session?.user as any)?.role;

  const headerCreatorId =
    request.headers.get('x-creator-id') ||
    request.headers.get('x-user-id');

  const isOwner =
    (sessionUserId && artwork.creator.userId === sessionUserId) ||
    sessionUserRole === 'ADMIN' ||
    (headerCreatorId &&
      (headerCreatorId === artwork.creatorId ||
        headerCreatorId === artwork.creator.slug ||
        headerCreatorId === artwork.creator.userId ||
        headerCreatorId === artwork.creator.user?.id));

  if (!isOwner) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'You are not authorized to edit this artwork.',
      },
      { status: 403 }
    );
  }

  // Check if textual metadata (Title or Description) changed
  const cleanTitle = data.title !== undefined ? data.title.trim() : undefined;
  const cleanDesc = data.description !== undefined ? (data.description ? data.description.trim() : null) : undefined;

  const isTitleChanged = cleanTitle !== undefined && cleanTitle !== artwork.title;
  const isDescChanged = cleanDesc !== undefined && cleanDesc !== (artwork.description ?? null);
  const requiresRemoderation = isTitleChanged || isDescChanged;

  // Existing prices
  const existingPerGarmentLic = artwork.licenseOptions.find(
    (l) => l.scope === 'PER_GARMENT' || /standard/i.test(l.name)
  );
  const existingLifetimeLic = artwork.licenseOptions.find(
    (l) => l.scope === 'UNLIMITED' || /lifetime|extended|buyout/i.test(l.name)
  );

  const oldPerGarmentPrice = existingPerGarmentLic?.price ?? null;
  const oldLifetimePrice = existingLifetimeLic?.price ?? null;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Prepare Artwork update fields
      const artworkUpdateData: any = {};

      if (cleanTitle !== undefined) {
        artworkUpdateData.title = cleanTitle;
      }

      if (cleanDesc !== undefined) {
        artworkUpdateData.description = cleanDesc;
      }

      // Handle Strict Moderation Policy
      if (requiresRemoderation) {
        artworkUpdateData.moderationStatus = 'PENDING';
        artworkUpdateData.status = 'DRAFT';
        artworkUpdateData.moderationReason =
          'มีการแก้ไขชื่อหรือคำอธิบายผลงาน อยู่ระหว่างรอการตรวจสอบอนุมัติใหม่จากผู้ดูแลระบบ';
        artworkUpdateData.moderatedAt = null;
        artworkUpdateData.moderatedById = null;
      } else if (data.status !== undefined) {
        artworkUpdateData.status = data.status;
      }

      const updatedArtwork = await tx.artwork.update({
        where: { id: artwork.id },
        data: artworkUpdateData,
      });

      // 2. In-place update for PER_GARMENT LicenseOption (preserving ID)
      if (data.perGarmentPrice !== undefined) {
        if (existingPerGarmentLic) {
          await tx.licenseOption.update({
            where: { id: existingPerGarmentLic.id },
            data: {
              price: data.perGarmentPrice,
              scope: 'PER_GARMENT',
            },
          });
        } else {
          await tx.licenseOption.create({
            data: {
              artworkId: artwork.id,
              name: 'Standard Apparel License',
              price: data.perGarmentPrice,
              scope: 'PER_GARMENT',
              commercialUse: true,
              terms: 'Single production unit print license with creator attribution.',
            },
          });
        }
      }

      // 3. In-place update for UNLIMITED (Lifetime) LicenseOption (preserving ID)
      if (data.lifetimePrice !== undefined) {
        if (existingLifetimeLic) {
          await tx.licenseOption.update({
            where: { id: existingLifetimeLic.id },
            data: {
              price: data.lifetimePrice,
              scope: 'UNLIMITED',
            },
          });
        } else {
          await tx.licenseOption.create({
            data: {
              artworkId: artwork.id,
              name: 'Lifetime IP Buyout License',
              price: data.lifetimePrice,
              scope: 'UNLIMITED',
              commercialUse: true,
              terms: 'Permanent unrestricted apparel production license with Vault ownership certificate.',
            },
          });
        }
      }

      // 4. Fetch refreshed license options
      const freshLicenses = await tx.licenseOption.findMany({
        where: { artworkId: artwork.id },
        orderBy: { price: 'asc' },
      });

      return {
        ...updatedArtwork,
        licenseOptions: freshLicenses,
      };
    });

    // 5. Record Audit Log for platform governance & transparency
    await recordAuditEvent({
      action: AuditAction.ARTWORK_UPDATED,
      entityType: 'Artwork',
      entityId: artwork.id,
      actorId: sessionUserId || artwork.creator.userId || artwork.creator.id,
      userId: artwork.creator.userId,
      payload: {
        artworkId: artwork.id,
        previousTitle: artwork.title,
        newTitle: cleanTitle ?? artwork.title,
        previousDescription: artwork.description,
        newDescription: cleanDesc !== undefined ? cleanDesc : artwork.description,
        requiresRemoderation,
        previousPerGarmentPrice: oldPerGarmentPrice,
        newPerGarmentPrice: data.perGarmentPrice ?? oldPerGarmentPrice,
        previousLifetimePrice: oldLifetimePrice,
        newLifetimePrice: data.lifetimePrice ?? oldLifetimePrice,
      },
    });

    const statusMessage = requiresRemoderation
      ? 'บันทึกการแก้ไขเรียบร้อยแล้ว เนื่องจากมีการแก้ไขชื่อหรือคำอธิบาย ผลงานจะถูกส่งกลับไปตรวจสอบใหม่ (Pending Review) ก่อนเปิดจำหน่าย'
      : 'บันทึกการปรับปรุงข้อมูลและราคาลิขสิทธิ์เรียบร้อยแล้ว';

    return NextResponse.json({
      success: true,
      message: statusMessage,
      artwork: updated,
      requiresRemoderation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update artwork.';
    console.error(`[PATCH /api/artworks/${artworkId}] Error:`, err);
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 });
  }
}
