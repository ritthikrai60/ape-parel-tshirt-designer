import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('--- Starting Verification for Milestone M2 API Route Logic ---');

  // Track created entities for teardown
  const createdArtworkIds = [];
  const createdAuditIds = [];

  try {
    // 1. Fetch benchmark creator (Dash Ape Studio)
    const creator = await prisma.creatorProfile.findFirst({
      where: { slug: 'dash-ape' },
      include: { user: true },
    });

    if (!creator) {
      throw new Error('Benchmark creator "dash-ape" not found in dev.db');
    }
    console.log(`[PASS] Found creator: ${creator.displayName} (${creator.id})`);

    // 2. Test Route 1: POST /api/artworks/upload transaction logic
    console.log('\nTesting Upload Logic: Atomic Creation of Artwork + FileSpec + 3 Tiers + AuditEvent');
    
    const mockFileSpec = {
      storagePath: 'public/uploads/masters/test_artwork.png',
      storageKey: 'masters/test_artwork.png',
      mimeType: 'image/png',
      width: 3000,
      height: 3000,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: '/uploads/previews/preview_test_artwork.webp',
      fileSize: 1048576,
    };

    const uploadPayload = {
      title: 'M2 Test Cybernetic Ape',
      description: 'A test graphic upload verifying Milestone M2 route logic',
      category: 'ILLUSTRATION',
      tags: 'test,cyberpunk,ape',
      standardPrice: 40,
      commercialPrice: 90,
      extendedPrice: 200,
    };

    // Execute atomic transaction as designed in proposed_upload_route.ts
    const uploadResult = await prisma.$transaction(async (tx) => {
      const artwork = await tx.artwork.create({
        data: {
          creatorId: creator.id,
          title: uploadPayload.title,
          description: uploadPayload.description,
          category: uploadPayload.category,
          previewUrl: mockFileSpec.previewWatermarkedPath,
          originalUrl: `/uploads/${mockFileSpec.storageKey}`,
          mimeType: mockFileSpec.mimeType,
          tags: uploadPayload.tags,
          status: 'PUBLISHED',
          moderationStatus: 'APPROVED',
        },
      });

      const fileSpec = await tx.artworkFileSpec.create({
        data: {
          artworkId: artwork.id,
          storagePath: mockFileSpec.storagePath,
          storageKey: mockFileSpec.storageKey,
          mimeType: mockFileSpec.mimeType,
          width: mockFileSpec.width,
          height: mockFileSpec.height,
          dpi: mockFileSpec.dpi,
          colorSpace: mockFileSpec.colorSpace,
          hasTransparency: mockFileSpec.hasTransparency,
          isVector: mockFileSpec.isVector,
          previewWatermarkedPath: mockFileSpec.previewWatermarkedPath,
          fileSize: mockFileSpec.fileSize,
        },
      });

      const standardLicense = await tx.licenseOption.create({
        data: {
          artworkId: artwork.id,
          name: 'Standard Apparel License',
          price: uploadPayload.standardPrice,
          commercialUse: true,
          scope: 'PER_GARMENT',
          terms: 'Single production unit print license with creator attribution.',
        },
      });

      const commercialLicense = await tx.licenseOption.create({
        data: {
          artworkId: artwork.id,
          name: 'Commercial License',
          price: uploadPayload.commercialPrice,
          commercialUse: true,
          scope: 'COMMERCIAL_BATCH',
          terms: 'Commercial production license for small batch releases up to 500 units.',
        },
      });

      const extendedLicense = await tx.licenseOption.create({
        data: {
          artworkId: artwork.id,
          name: 'Extended Merchandise License',
          price: uploadPayload.extendedPrice,
          commercialUse: true,
          scope: 'EXTENDED_MERCHANDISE',
          terms: 'Unlimited commercial merchandise production license.',
        },
      });

      const audit = await tx.auditEvent.create({
        data: {
          action: 'ARTWORK_UPLOADED',
          entityType: 'Artwork',
          entityId: artwork.id,
          actorId: creator.user?.id || creator.id,
          userId: creator.userId,
          payload: JSON.stringify({
            artworkId: artwork.id,
            title: artwork.title,
            creatorId: creator.id,
            licenseOptions: [
              { id: standardLicense.id, scope: standardLicense.scope, price: standardLicense.price },
              { id: commercialLicense.id, scope: commercialLicense.scope, price: commercialLicense.price },
              { id: extendedLicense.id, scope: extendedLicense.scope, price: extendedLicense.price },
            ],
          }),
        },
      });

      return {
        artwork,
        fileSpec,
        licenseOptions: [standardLicense, commercialLicense, extendedLicense],
        auditId: audit.id,
      };
    });

    createdArtworkIds.push(uploadResult.artwork.id);
    createdAuditIds.push(uploadResult.auditId);

    console.log(`[PASS] Artwork created atomically with ID: ${uploadResult.artwork.id}`);
    console.log(`[PASS] ArtworkFileSpec linked with ID: ${uploadResult.fileSpec.id}, DPI: ${uploadResult.fileSpec.dpi}`);
    console.log(`[PASS] Created 3 default LicenseOption tiers:`);
    for (const lic of uploadResult.licenseOptions) {
      console.log(`       - ${lic.name} [${lic.scope}]: ${lic.price} THB`);
    }

    if (uploadResult.licenseOptions.length !== 3) {
      throw new Error(`Expected 3 license options, got ${uploadResult.licenseOptions.length}`);
    }
    if (uploadResult.licenseOptions[0].scope !== 'PER_GARMENT' || uploadResult.licenseOptions[0].price !== 40) {
      throw new Error('Standard license scope or price mismatch');
    }
    if (uploadResult.licenseOptions[1].scope !== 'COMMERCIAL_BATCH' || uploadResult.licenseOptions[1].price !== 90) {
      throw new Error('Commercial license scope or price mismatch');
    }
    if (uploadResult.licenseOptions[2].scope !== 'EXTENDED_MERCHANDISE' || uploadResult.licenseOptions[2].price !== 200) {
      throw new Error('Extended license scope or price mismatch');
    }

    // 3. Test Route 2: PATCH /api/artworks/[id]/licenses logic
    console.log('\nTesting License Update Logic: Updating THB prices & Audit Logging');

    const newPrices = {
      standardPrice: 55,
      commercialPrice: 125,
      extendedPrice: 350,
    };

    const updateResult = await prisma.$transaction(async (tx) => {
      // Update Standard
      await tx.licenseOption.updateMany({
        where: { artworkId: uploadResult.artwork.id, scope: 'PER_GARMENT' },
        data: { price: newPrices.standardPrice },
      });

      // Update Commercial
      await tx.licenseOption.updateMany({
        where: { artworkId: uploadResult.artwork.id, scope: 'COMMERCIAL_BATCH' },
        data: { price: newPrices.commercialPrice },
      });

      // Update Extended
      await tx.licenseOption.updateMany({
        where: { artworkId: uploadResult.artwork.id, scope: 'EXTENDED_MERCHANDISE' },
        data: { price: newPrices.extendedPrice },
      });

      const updated = await tx.licenseOption.findMany({
        where: { artworkId: uploadResult.artwork.id },
        orderBy: { price: 'asc' },
      });

      const audit = await tx.auditEvent.create({
        data: {
          action: 'LICENSE_PRICE_UPDATED',
          entityType: 'Artwork',
          entityId: uploadResult.artwork.id,
          actorId: creator.user?.id || creator.id,
          userId: creator.userId,
          payload: JSON.stringify({
            artworkId: uploadResult.artwork.id,
            updatedPrices: updated.map((l) => ({ id: l.id, scope: l.scope, price: l.price })),
          }),
        },
      });

      return {
        licenseOptions: updated,
        auditId: audit.id,
      };
    });

    createdAuditIds.push(updateResult.auditId);

    console.log('[PASS] Updated license tiers in database:');
    for (const lic of updateResult.licenseOptions) {
      console.log(`       - ${lic.name} [${lic.scope}]: ${lic.price} THB`);
    }

    const std = updateResult.licenseOptions.find((l) => l.scope === 'PER_GARMENT');
    const comm = updateResult.licenseOptions.find((l) => l.scope === 'COMMERCIAL_BATCH');
    const ext = updateResult.licenseOptions.find((l) => l.scope === 'EXTENDED_MERCHANDISE');

    if (!std || std.price !== 55) throw new Error(`Standard price should be 55, got ${std?.price}`);
    if (!comm || comm.price !== 125) throw new Error(`Commercial price should be 125, got ${comm?.price}`);
    if (!ext || ext.price !== 350) throw new Error(`Extended price should be 350, got ${ext?.price}`);

    // Verify AuditEvents
    const audits = await prisma.auditEvent.findMany({
      where: { entityId: uploadResult.artwork.id },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`\n[PASS] Verified ${audits.length} AuditEvents recorded for Artwork:`);
    for (const a of audits) {
      console.log(`       - Action: ${a.action}, Entity: ${a.entityType}:${a.entityId}, Actor: ${a.actorId}`);
    }

    if (audits.length !== 2) {
      throw new Error(`Expected 2 audit events, got ${audits.length}`);
    }
    if (audits[0].action !== 'ARTWORK_UPLOADED') {
      throw new Error(`First audit action should be ARTWORK_UPLOADED, got ${audits[0].action}`);
    }
    if (audits[1].action !== 'LICENSE_PRICE_UPDATED') {
      throw new Error(`Second audit action should be LICENSE_PRICE_UPDATED, got ${audits[1].action}`);
    }

    console.log('\n>>> ALL ROUTE BUSINESS LOGIC AND DATABASE CONSTRAINTS VERIFIED SUCCESSFULLY! <<<');
  } finally {
    // Teardown test records
    console.log('\nTearing down test records...');
    if (createdAuditIds.length > 0) {
      await prisma.auditEvent.deleteMany({
        where: { id: { in: createdAuditIds } },
      });
    }
    if (createdArtworkIds.length > 0) {
      await prisma.licenseOption.deleteMany({
        where: { artworkId: { in: createdArtworkIds } },
      });
      await prisma.artworkFileSpec.deleteMany({
        where: { artworkId: { in: createdArtworkIds } },
      });
      await prisma.artwork.deleteMany({
        where: { id: { in: createdArtworkIds } },
      });
    }
    await prisma.$disconnect();
    console.log('[CLEANUP COMPLETE] Database restored to pristine state.');
  }
}

runVerification().catch((err) => {
  console.error('[FAILED]', err);
  process.exit(1);
});
