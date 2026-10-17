import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent, AuditAction } from '@/lib/audit';
import { validateAndProcessArtwork } from '@/lib/assetValidation';
import { storageService } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Maximum allowed file upload size: 50MB
 */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Allowed artwork categories
 */
const ALLOWED_CATEGORIES = [
  'MASCOT',
  'TYPOGRAPHY',
  'ILLUSTRATION',
  'PATTERN',
  'LOGO',
] as const;

/**
 * Schema for validating metadata fields sent alongside file
 */
const artworkUploadMetadataSchema = z.object({
  creatorId: z
    .string({ required_error: 'creatorId is required' })
    .trim()
    .min(1, 'creatorId cannot be empty'),
  title: z
    .string({ required_error: 'title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(1000).optional(),
  category: z
    .enum(ALLOWED_CATEGORIES, {
      invalid_type_error: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
    })
    .optional()
    .default('ILLUSTRATION'),
  tags: z.string().trim().max(300).optional(),
  standardPrice: z
    .number({ invalid_type_error: 'standardPrice must be a number' })
    .int('standardPrice must be an integer')
    .positive('standardPrice must be greater than 0 THB')
    .optional()
    .default(40),
  commercialPrice: z
    .number({ invalid_type_error: 'commercialPrice must be a number' })
    .int('commercialPrice must be an integer')
    .positive('commercialPrice must be greater than 0 THB')
    .optional()
    .default(90),
  extendedPrice: z
    .number({ invalid_type_error: 'extendedPrice must be a number' })
    .int('extendedPrice must be an integer')
    .positive('extendedPrice must be greater than 0 THB')
    .optional()
    .default(200),
});

/**
 * Helper to safely extract integer price or fallback to default
 */
function extractIntegerPrice(
  rawVal: FormDataEntryValue | unknown,
  defaultPrice: number
): number {
  if (rawVal === null || rawVal === undefined || rawVal === '') {
    return defaultPrice;
  }
  const parsed = Number(rawVal);
  return parsed;
}

/**
 * GET /api/artworks/upload
 * Returns upload guidelines, supported formats, and default licensing tier specifications.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      name: 'ape-parel Graphic Asset Upload API',
      version: '1.0.0',
      allowedMimeTypes: [
        'image/png',
        'image/svg+xml',
        'image/tiff',
        'image/jpeg',
      ],
      requirements: {
        png: 'Alpha channel (transparency) strictly required (hasAlpha === true)',
        rasterMinDpi: 300,
        rasterMinDimensionPx: 1000,
        rasterAspectRatios: 'Between 0.2 and 5.0',
        vectorBypass: 'SVG vector format is exempt from raster DPI check',
        maxFileSizeMb: 50,
      },
      defaultLicensingTiers: [
        {
          name: 'Standard Apparel License',
          scope: 'PER_GARMENT',
          defaultPriceThb: 40,
          description: 'Single production unit print license with creator attribution.',
        },
        {
          name: 'Commercial License',
          scope: 'COMMERCIAL_BATCH',
          defaultPriceThb: 90,
          description: 'Commercial production license for small batch releases up to 500 units.',
        },
        {
          name: 'Extended Merchandise License',
          scope: 'EXTENDED_MERCHANDISE',
          defaultPriceThb: 200,
          description: 'Unlimited commercial merchandise production license.',
        },
      ],
    },
    { status: 200 }
  );
}

/**
 * POST /api/artworks/upload
 *
 * Multipart/form-data endpoint that:
 * 1. Authenticates/validates creator account (creatorId or user session)
 * 2. Validates metadata payload with Zod
 * 3. Extracts and validates image buffer through assetValidation.ts and storage.ts:
 *    - Strict format validation (PNG transparency, 300 DPI raster, SVG vector bypass)
 *    - Generates watermarked public web preview
 *    - Securely saves print-ready master file
 * 4. Atomically creates Artwork, ArtworkFileSpec, and 3 default LicenseOption tiers in Prisma
 * 5. Records immutable AuditEvent (action: 'ARTWORK_UPLOADED')
 * 6. Returns HTTP 201 with created artwork, file spec, and licensing options
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse Multipart Form Data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Failed to parse multipart/form-data body. Ensure Content-Type is multipart/form-data.',
      },
      { status: 400 }
    );
  }

  // 2. Extract Creator Identifier (from form fields or headers)
  const creatorIdentifierRaw =
    formData.get('creatorId') ??
    formData.get('creator') ??
    request.headers.get('x-creator-id') ??
    request.headers.get('x-user-id');

  const creatorIdentifier =
    typeof creatorIdentifierRaw === 'string' ? creatorIdentifierRaw.trim() : '';

  if (!creatorIdentifier) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'creatorId is required. Provide it in form field "creatorId" or header "x-creator-id".',
      },
      { status: 400 }
    );
  }

  // 3. Resolve and Validate Creator Profile in Database
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      OR: [
        { id: creatorIdentifier },
        { slug: creatorIdentifier },
        { userId: creatorIdentifier },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!creator) {
    return NextResponse.json(
      {
        error: 'Not Found',
        message: `Creator profile not found for identifier "${creatorIdentifier}".`,
      },
      { status: 404 }
    );
  }

  // 4. Extract and Validate Uploaded File
  const fileEntry = formData.get('file');
  if (!fileEntry || typeof (fileEntry as any).arrayBuffer !== 'function') {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'A file must be uploaded under the form field "file".',
      },
      { status: 400 }
    );
  }

  const file = fileEntry as File;
  if (file.size === 0) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Uploaded file cannot be empty (0 bytes).',
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: `Uploaded file exceeds maximum allowed limit of 50MB (received ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      },
      { status: 400 }
    );
  }

  // 5. Extract and Validate Metadata via Zod
  const rawTitle = formData.get('title');
  const rawDescription = formData.get('description');
  const rawCategory = formData.get('category');
  const rawTags = formData.get('tags');
  const rawStandard = formData.get('standardPrice') ?? formData.get('standard');
  const rawCommercial = formData.get('commercialPrice') ?? formData.get('commercial');
  const rawExtended = formData.get('extendedPrice') ?? formData.get('extended');

  // Handle custom licensePrices JSON if provided
  let customPricesFromJson: { standard?: number; commercial?: number; extended?: number } = {};
  const rawLicensePrices = formData.get('licensePrices');
  if (typeof rawLicensePrices === 'string') {
    try {
      customPricesFromJson = JSON.parse(rawLicensePrices);
    } catch {
      // ignore JSON parse error, fall back to individual fields
    }
  }

  const metadataInput = {
    creatorId: creator.id,
    title: typeof rawTitle === 'string' ? rawTitle : '',
    description: typeof rawDescription === 'string' ? rawDescription : undefined,
    category: typeof rawCategory === 'string' && rawCategory ? rawCategory : undefined,
    tags: typeof rawTags === 'string' ? rawTags : undefined,
    standardPrice: extractIntegerPrice(
      rawStandard ?? customPricesFromJson.standard,
      40
    ),
    commercialPrice: extractIntegerPrice(
      rawCommercial ?? customPricesFromJson.commercial,
      90
    ),
    extendedPrice: extractIntegerPrice(
      rawExtended ?? customPricesFromJson.extended,
      200
    ),
  };

  const parseResult = artworkUploadMetadataSchema.safeParse(metadataInput);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'Invalid artwork metadata payload.',
        issues: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const validatedData = parseResult.data;

  // 6. Process File Buffer through Asset Validation Engine
  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch (bufferError: unknown) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to read uploaded file buffer.',
      },
      { status: 500 }
    );
  }

  const originalFilename = file.name || 'artwork.png';
  const fileMimeType = file.type || 'image/png';

  let validationResult;
  try {
    validationResult = await validateAndProcessArtwork(
      fileBuffer,
      originalFilename,
      fileMimeType
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Asset validation failed';
    return NextResponse.json(
      {
        error: 'Validation Error',
        message,
      },
      { status: 400 }
    );
  }

  if (!validationResult.isValid || !validationResult.metadata) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: validationResult.error || 'Graphic asset failed validation checks.',
      },
      { status: 400 }
    );
  }

  const metadata = validationResult.metadata;

  // 7. Persist Master and Watermarked Preview via Storage Service
  let masterStorageKey = validationResult.masterStorageKey;
  let previewStorageKey = validationResult.previewStorageKey;
  let originalUrl = validationResult.originalUrl;
  let previewUrl = validationResult.previewUrl;
  let storagePath: string;

  try {
    if (!masterStorageKey || !previewStorageKey) {
      // Save master and preview via StorageService abstraction
      const masterSaved = await storageService.saveMaster(
        fileBuffer,
        originalFilename,
        metadata.mimeType
      );
      const previewSaved = await storageService.savePreview(
        validationResult.previewBuffer || fileBuffer,
        `preview-${originalFilename}`,
        'image/webp'
      );

      masterStorageKey = masterSaved.storageKey;
      previewStorageKey = previewSaved.storageKey;
      originalUrl = masterSaved.relativeUrl;
      previewUrl = previewSaved.relativeUrl;
      storagePath = masterSaved.absolutePath;
    } else {
      if (!originalUrl) originalUrl = `/uploads/${masterStorageKey}`;
      if (!previewUrl) previewUrl = `/uploads/${previewStorageKey}`;
      storagePath = `public/uploads/${masterStorageKey}`;
    }
  } catch (storageError: unknown) {
    const message =
      storageError instanceof Error
        ? storageError.message
        : 'Failed to save asset files to storage.';
    return NextResponse.json(
      {
        error: 'Storage Error',
        message,
      },
      { status: 500 }
    );
  }

  // 8. Atomically Create Artwork, ArtworkFileSpec, LicenseOptions, and AuditEvent
  try {
    const created = await prisma.$transaction(async (tx) => {
      // A. Create Artwork Record
      const artwork = await tx.artwork.create({
        data: {
          creatorId: creator.id,
          title: validatedData.title,
          description: validatedData.description || null,
          category: validatedData.category,
          previewUrl: previewUrl!,
          originalUrl: originalUrl!,
          mimeType: metadata.mimeType,
          tags: validatedData.tags || null,
          status: 'PUBLISHED',
          moderationStatus: 'APPROVED',
        },
      });

      // B. Create ArtworkFileSpec Record
      const fileSpec = await tx.artworkFileSpec.create({
        data: {
          artworkId: artwork.id,
          storagePath,
          storageKey: masterStorageKey,
          mimeType: metadata.mimeType,
          width: metadata.width,
          height: metadata.height,
          dpi: metadata.dpi,
          colorSpace: metadata.colorSpace || 'sRGB',
          hasTransparency: metadata.hasTransparency,
          isVector: metadata.isVector,
          previewWatermarkedPath: previewUrl,
          fileSize: metadata.fileSize || fileBuffer.length,
        },
      });

      // C. Create Default LicenseOption Tiers
      // 1. Standard Apparel License (Per Garment)
      const standardLicense = await tx.licenseOption.create({
        data: {
          artworkId: artwork.id,
          name: 'Standard Apparel License',
          price: validatedData.standardPrice,
          commercialUse: true,
          scope: 'PER_GARMENT',
          terms: 'Single production unit print license with creator attribution.',
        },
      });

      // 2. Commercial License (Commercial Batch)
      const commercialLicense = await tx.licenseOption.create({
        data: {
          artworkId: artwork.id,
          name: 'Commercial License',
          price: validatedData.commercialPrice,
          commercialUse: true,
          scope: 'COMMERCIAL_BATCH',
          terms: 'Commercial production license for small batch releases up to 500 units.',
        },
      });

      // 3. Extended Merchandise License (Unlimited / Extended)
      const extendedLicense = await tx.licenseOption.create({
        data: {
          artworkId: artwork.id,
          name: 'Extended Merchandise License',
          price: validatedData.extendedPrice,
          commercialUse: true,
          scope: 'EXTENDED_MERCHANDISE',
          terms: 'Unlimited commercial merchandise production license.',
        },
      });

      const licenseOptions = [
        standardLicense,
        commercialLicense,
        extendedLicense,
      ];

      // D. Record Immutable AuditEvent
      await recordAuditEvent(
        {
          action: AuditAction.ARTWORK_UPLOADED,
          entityType: 'Artwork',
          entityId: artwork.id,
          actorId: creator.user?.id || creator.id,
          userId: creator.userId,
          payload: {
            artworkId: artwork.id,
            title: artwork.title,
            category: artwork.category,
            creatorId: creator.id,
            creatorSlug: creator.slug,
            mimeType: artwork.mimeType,
            fileSpecId: fileSpec.id,
            licenseOptions: licenseOptions.map((lic) => ({
              id: lic.id,
              name: lic.name,
              price: lic.price,
              scope: lic.scope,
            })),
          },
          metadata: {
            originalFilename,
            fileSize: metadata.fileSize,
            dpi: metadata.dpi,
            dimensions: `${metadata.width}x${metadata.height}`,
            hasTransparency: metadata.hasTransparency,
            isVector: metadata.isVector,
          },
        },
        tx
      );

      return {
        artwork,
        fileSpec,
        licenseOptions,
      };
    });

    // 9. Return HTTP 201 Created
    return NextResponse.json(
      {
        success: true,
        artwork: {
          ...created.artwork,
          fileSpec: created.fileSpec,
          licenseOptions: created.licenseOptions,
        },
        fileSpec: created.fileSpec,
        licenseOptions: created.licenseOptions,
      },
      { status: 201 }
    );
  } catch (txError: unknown) {
    const message =
      txError instanceof Error
        ? txError.message
        : 'Failed to create artwork records in database transaction.';
    return NextResponse.json(
      {
        error: 'Database Error',
        message,
      },
      { status: 500 }
    );
  }
}
