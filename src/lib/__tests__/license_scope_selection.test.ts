import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { calculateLivePricing } from '@/lib/pricing';
import { createOrderAtomic } from '@/lib/orders';
import { getUserVaultData } from '@/lib/vault';

describe('Dual License Scope Selection & Checkout Execution Suite', () => {
  const testRunId = Date.now().toString().slice(-6);

  let customerUser: any;
  let creatorUser: any;
  let creatorProfile: any;
  let supplierUser: any;
  let supplierProfile: any;
  let garmentProduct: any;
  let garmentVariant: any;
  let artwork: any;
  let perGarmentLicense: any;
  let lifetimeLicense: any;

  beforeEach(async () => {
    // 1. Customer User
    customerUser = await prisma.user.create({
      data: {
        email: `buyer_${testRunId}_${Math.random().toString(36).substring(7)}@ape-parel.test`,
        name: 'Dual License Test Buyer',
        role: 'CUSTOMER',
      },
    });

    // 2. Creator User & Profile
    creatorUser = await prisma.user.create({
      data: {
        email: `creator_${testRunId}_${Math.random().toString(36).substring(7)}@ape-parel.test`,
        name: 'Studio Vector Master',
        role: 'CREATOR',
      },
    });

    creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId: creatorUser.id,
        displayName: 'Vector Master Studio',
        slug: `vector-master-${testRunId}-${Math.random().toString(36).substring(7)}`,
      },
    });

    // 3. Supplier User & Profile
    supplierUser = await prisma.user.create({
      data: {
        email: `supplier_${testRunId}_${Math.random().toString(36).substring(7)}@ape-parel.test`,
        name: 'Precision Mill Craft',
        role: 'SUPPLIER',
      },
    });

    supplierProfile = await prisma.supplierProfile.create({
      data: {
        userId: supplierUser.id,
        companyName: 'Precision DTG Mill Co.',
        slug: `precision-mill-${testRunId}-${Math.random().toString(36).substring(7)}`,
        location: 'Bangkok, Thailand',
        contactEmail: supplierUser.email,
        verified: true,
        printingServices: {
          create: {
            name: 'DTG Print High Density',
            code: 'DTG',
            pricePerSurface: 80,
            supportedSurfaces: 'BOTH',
          },
        },
      },
      include: {
        printingServices: true,
      },
    });

    // 4. Blank Garment
    const sku = `TEE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    garmentProduct = await prisma.garmentProduct.create({
      data: {
        sku,
        name: 'Heavyweight Drop Shoulder Tee',
        fabric: '100% Combed Cotton',
        weightGsm: 240,
        fit: 'OVERSIZED',
        neckline: 'CREW',
        basePrice: 160,
        packagingPrice: 15,
        shippingPrice: 40,
        supplierId: supplierProfile.id,
        variants: {
          create: {
            sku: `${sku}-BLK-L`,
            colorName: 'Pitch Black',
            colorHex: '#101010',
            size: 'L',
            stock: 100,
          },
        },
      },
      include: {
        variants: true,
      },
    });
    garmentVariant = garmentProduct.variants[0];

    // 5. Artwork with Dual Licenses: PER_GARMENT (40 THB) & UNLIMITED (120 THB)
    artwork = await prisma.artwork.create({
      data: {
        creatorId: creatorProfile.id,
        title: 'Cyber Ronin Dual Scope',
        category: 'ILLUSTRATION',
        previewUrl: '/uploads/artworks/cyber-ronin.png',
        mimeType: 'image/png',
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        licenseOptions: {
          create: [
            {
              name: 'Standard Apparel License (Per Garment)',
              price: 40,
              scope: 'PER_GARMENT',
              commercialUse: true,
              terms: 'Valid for 1 printed apparel unit.',
            },
            {
              name: 'Permanent IP Buyout License (Lifetime)',
              price: 120,
              scope: 'UNLIMITED',
              commercialUse: true,
              terms: 'Permanent IP buyout with certificate recorded in vault.',
            },
          ],
        },
      },
      include: {
        licenseOptions: true,
      },
    });

    perGarmentLicense = artwork.licenseOptions.find((l: any) => l.scope === 'PER_GARMENT');
    lifetimeLicense = artwork.licenseOptions.find((l: any) => l.scope === 'UNLIMITED');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. calculates Per-Garment license proportional to garment quantity', async () => {
    const qty = 5;
    const pricing = await calculateLivePricing({
      garmentProductId: garmentProduct.id,
      garmentVariantId: garmentVariant.id,
      quantity: qty,
      userId: customerUser.id,
      frontArtworkLicenses: [
        {
          artworkId: artwork.id,
          licenseOptionId: perGarmentLicense.id,
        },
      ],
    });

    // 40 THB * 5 = 200 THB
    expect(pricing.licensingCost).toBe(200);
    expect(pricing.breakdown.artworkLicenses[0].unitPrice).toBe(40);
    expect(pricing.breakdown.artworkLicenses[0].totalPrice).toBe(200);
    expect(pricing.breakdown.artworkLicenses[0].isPermanentIp).toBe(false);
  });

  it('2. calculates Lifetime Buyout license as a one-time flat fee regardless of quantity', async () => {
    const qty = 10;
    const pricing = await calculateLivePricing({
      garmentProductId: garmentProduct.id,
      garmentVariantId: garmentVariant.id,
      quantity: qty,
      userId: customerUser.id,
      frontArtworkLicenses: [
        {
          artworkId: artwork.id,
          licenseOptionId: lifetimeLicense.id,
        },
      ],
    });

    // Lifetime Buyout is flat 120 THB once, not 120 * 10
    expect(pricing.licensingCost).toBe(120);
    expect(pricing.breakdown.artworkLicenses[0].totalPrice).toBe(120);
    expect(pricing.breakdown.artworkLicenses[0].notes).toBe('LIFETIME BUYOUT');
  });

  it('3. places order with Lifetime Buyout license and mints certificate into user vault', async () => {
    const qty = 3;
    const orderResult = await createOrderAtomic({
      garmentProductId: garmentProduct.id,
      garmentVariantId: garmentVariant.id,
      garmentColorHex: '#101010',
      garmentSize: 'L',
      garmentFit: 'OVERSIZED',
      quantity: qty,
      customerId: customerUser.id,
      shippingName: 'Dual Scope Tester',
      shippingAddress: '999 Sukhumvit Road',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      frontArtworkLicenses: [
        {
          artworkId: artwork.id,
          licenseOptionId: lifetimeLicense.id,
        },
      ],
      frontElements: [
        {
          id: 'elem-1',
          artworkId: artwork.id,
          licenseOptionId: lifetimeLicense.id,
          title: artwork.title,
          previewUrl: artwork.previewUrl,
          creatorName: creatorProfile.displayName,
          creatorId: creatorProfile.id,
          surface: 'FRONT',
          x: 50,
          y: 45,
          width: 35,
          height: 35,
          rotation: 0,
          zIndex: 1,
          price: 120,
        },
      ],
    });

    expect(orderResult.order.id).toBeDefined();
    expect(orderResult.order.licensingCost).toBe(120);

    // Verify RoyaltyObligation
    const obligations = await prisma.royaltyObligation.findMany({
      where: { orderId: orderResult.order.id },
    });
    expect(obligations).toHaveLength(1);
    expect(obligations[0].totalAmount).toBe(120);
    expect(obligations[0].unitRoyalty).toBe(120);
    expect(obligations[0].quantity).toBe(1);

    // Verify User Vault has minted permanent license
    const vault = await getUserVaultData(customerUser.id);
    expect(vault.permanentIps).toHaveLength(1);
    expect(vault.permanentIps[0].artworkId).toBe(artwork.id);
    expect(vault.permanentIps[0].certificateNumber).toMatch(/^LIC-PIP-/);
    expect(vault.permanentIps[0].sha256Hash).toHaveLength(64);
  });

  it('4. automatically grants 0 THB royalty on all future orders once Lifetime Buyout is owned in Vault', async () => {
    // 1. Initial order purchasing Lifetime Buyout
    await createOrderAtomic({
      garmentProductId: garmentProduct.id,
      garmentVariantId: garmentVariant.id,
      garmentColorHex: '#101010',
      garmentSize: 'L',
      quantity: 1,
      customerId: customerUser.id,
      shippingName: 'Dual Scope Tester',
      shippingAddress: '999 Sukhumvit Road',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      frontArtworkLicenses: [
        {
          artworkId: artwork.id,
          licenseOptionId: lifetimeLicense.id,
        },
      ],
      frontElements: [],
    });

    // 2. Future order with large quantity (20 units)
    const futureQty = 20;
    const futurePricing = await calculateLivePricing({
      garmentProductId: garmentProduct.id,
      garmentVariantId: garmentVariant.id,
      quantity: futureQty,
      userId: customerUser.id,
      frontArtworkLicenses: [
        {
          artworkId: artwork.id,
          licenseOptionId: perGarmentLicense.id, // Even if per-garment option was passed
        },
      ],
    });

    // Must be 0 THB licensing cost forever
    expect(futurePricing.licensingCost).toBe(0);
    expect(futurePricing.breakdown.artworkLicenses[0].totalPrice).toBe(0);
    expect(futurePricing.breakdown.artworkLicenses[0].isPermanentIp).toBe(true);
    expect(futurePricing.breakdown.artworkLicenses[0].notes).toBe('PERMANENT IP (FREE)');
  });
});
