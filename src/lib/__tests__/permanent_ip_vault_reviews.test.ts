import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  issuePermanentLicenseAtomic,
  verifyLicenseCertificate,
  generateCertificateNumber,
  calculateAgreementHash,
} from '@/lib/licenseAgreement';
import { calculateLivePricing } from '@/lib/pricing';
import {
  submitArtworkReview,
  getArtworkReviewsAndRating,
  getArtworksRatingBatch,
  submitSupplierReview,
  getSupplierReviewsAndRating,
  getSuppliersRatingBatch,
} from '@/lib/reviews';
import {
  toggleArtworkFavorite,
  getUserVaultData,
  getUserFavoriteArtworkIds,
  getUserPermanentIpArtworkIds,
  getArtworksFavoriteCountBatch,
} from '@/lib/vault';

describe('Permanent IP, User Vault, Wishlist & Review System Tests', () => {
  const testRunId = Date.now().toString().slice(-6);

  let testUser: any;
  let testCreatorUser: any;
  let testSupplierUser: any;
  let testCreatorProfile: any;
  let testSupplierProfile: any;
  let testGarment: any;
  let testVariant: any;
  let testArtwork: any;
  let testStandardLicense: any;
  let testUnlimitedLicense: any;

  beforeEach(async () => {
    // 1. Create clean test user
    testUser = await prisma.user.create({
      data: {
        email: `vault_user_${testRunId}_${Math.random().toString(36).substring(7)}@test.com`,
        name: 'Somchai Vault Explorer',
        role: 'CUSTOMER',
      },
    });

    // 2. Create test creator
    testCreatorUser = await prisma.user.create({
      data: {
        email: `creator_${testRunId}_${Math.random().toString(36).substring(7)}@test.com`,
        name: 'Artist Anek',
        role: 'CREATOR',
      },
    });

    testCreatorProfile = await prisma.creatorProfile.create({
      data: {
        userId: testCreatorUser.id,
        displayName: 'Anek Graphic Art',
        slug: `anek-art-${testRunId}-${Math.random().toString(36).substring(7)}`,
      },
    });

    // 3. Create test supplier
    testSupplierUser = await prisma.user.create({
      data: {
        email: `supplier_${testRunId}_${Math.random().toString(36).substring(7)}@test.com`,
        name: 'BKK Craft Admin',
        role: 'SUPPLIER',
      },
    });

    testSupplierProfile = await prisma.supplierProfile.create({
      data: {
        userId: testSupplierUser.id,
        companyName: 'BKK Garment Studio Co.',
        slug: `bkk-garment-${testRunId}-${Math.random().toString(36).substring(7)}`,
        location: 'Phra Khanong, Bangkok, Thailand',
        contactEmail: testSupplierUser.email,
        verified: true,
        printingServices: {
          create: {
            name: 'DTG Precision Printing',
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

    // 4. Create Garment blank
    const randomSku = `GAR-${Math.random().toString(36).substring(2, 9)}`;
    testGarment = await prisma.garmentProduct.create({
      data: {
        sku: randomSku,
        name: 'Apex Streetwear Heavyweight Tee',
        fabric: '100% Combed Cotton',
        weightGsm: 240,
        fit: 'OVERSIZED',
        neckline: 'CREW',
        basePrice: 150,
        packagingPrice: 15,
        shippingPrice: 40,
        supplierId: testSupplierProfile.id,
        variants: {
          create: {
            sku: `${randomSku}-BLK-L`,
            colorName: 'Ink Black',
            colorHex: '#131718',
            size: 'L',
            stock: 50,
          },
        },
      },
      include: {
        variants: true,
      },
    });
    testVariant = testGarment.variants[0];

    // 5. Create Artwork with Standard and Unlimited license options
    testArtwork = await prisma.artwork.create({
      data: {
        creatorId: testCreatorProfile.id,
        title: 'Golden Cyber Gorilla',
        category: 'MASCOT',
        previewUrl: '/uploads/artworks/gorilla.png',
        mimeType: 'image/png',
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        licenseOptions: {
          create: [
            {
              name: 'Standard Apparel License',
              price: 50,
              scope: 'PER_GARMENT',
              commercialUse: true,
            },
            {
              name: 'Permanent IP Buyout License',
              price: 500,
              scope: 'UNLIMITED',
              commercialUse: true,
            },
          ],
        },
      },
      include: {
        licenseOptions: true,
      },
    });

    testStandardLicense = testArtwork.licenseOptions.find((l: any) => l.scope === 'PER_GARMENT');
    testUnlimitedLicense = testArtwork.licenseOptions.find((l: any) => l.scope === 'UNLIMITED');
  });

  afterAll(async () => {
    // Cleanup records safely
    await prisma.$disconnect();
  });

  describe('1. Authoritative Zero-Pricing for Permanent IP Holders', () => {
    it('charges standard license price when customer does not hold Permanent IP', async () => {
      const pricing = await calculateLivePricing({
        garmentProductId: testGarment.id,
        garmentVariantId: testVariant.id,
        quantity: 2,
        userId: testUser.id,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testStandardLicense.id,
          },
        ],
      });

      // 50 * 2 = 100 THB for licensing
      expect(pricing.licensingCost).toBe(100);
      expect(pricing.breakdown.artworkLicenses[0].totalPrice).toBe(100);
      expect(pricing.breakdown.artworkLicenses[0].isPermanentIp).toBeFalsy();
    });

    it('waives licensing fee to 0 THB when customer owns Permanent IP license', async () => {
      // Issue Permanent IP
      await issuePermanentLicenseAtomic({
        userId: testUser.id,
        artworkId: testArtwork.id,
        licenseOptionId: testUnlimitedLicense.id,
      });

      const pricing = await calculateLivePricing({
        garmentProductId: testGarment.id,
        garmentVariantId: testVariant.id,
        quantity: 5,
        userId: testUser.id,
        frontArtworkLicenses: [
          {
            artworkId: testArtwork.id,
            licenseOptionId: testStandardLicense.id,
          },
        ],
      });

      // Licensing cost MUST be 0 THB regardless of quantity
      expect(pricing.licensingCost).toBe(0);
      expect(pricing.breakdown.artworkLicenses[0].unitPrice).toBe(0);
      expect(pricing.breakdown.artworkLicenses[0].totalPrice).toBe(0);
      expect(pricing.breakdown.artworkLicenses[0].isPermanentIp).toBe(true);
      expect(pricing.breakdown.artworkLicenses[0].notes).toBe('PERMANENT IP (FREE)');

      // Other costs remain accurate
      expect(pricing.garmentCost).toBe(150 * 5); // 750
      expect(pricing.printingCost).toBe(80 * 1 * 5); // 400
      expect(pricing.packagingCost).toBe(15 * 5); // 75
      expect(pricing.shippingCost).toBe(40);
      expect(pricing.totalAmount).toBe(750 + 400 + 75 + 40); // 1265 THB
    });
  });

  describe('2. Permanent IP License Issuance & Cryptographic Certificate Verification', () => {
    it('issues an immutable legal certificate with SHA-256 fingerprint', async () => {
      const result = await issuePermanentLicenseAtomic({
        userId: testUser.id,
        artworkId: testArtwork.id,
        licenseOptionId: testUnlimitedLicense.id,
      });

      expect(result.certificateNumber).toMatch(/^LIC-PIP-\d{4}-[A-Z0-9]{8}-[A-Z0-9]{8}$/);
      expect(result.license.status).toBe('ACTIVE');
      expect(result.license.sha256Hash).toHaveLength(64);

      // Verify certificate
      const verifyResult = await verifyLicenseCertificate(result.certificateNumber);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.isHashAuthentic).toBe(true);
      expect(verifyResult.snapshot?.licensedAsset.title).toBe('Golden Cyber Gorilla');
      expect(verifyResult.snapshot?.licensee.name).toBe('Somchai Vault Explorer');
      expect(verifyResult.snapshot?.licensor.displayName).toBe('Anek Graphic Art');
    });

    it('detects tampering if snapshot data does not match SHA-256 fingerprint', async () => {
      const result = await issuePermanentLicenseAtomic({
        userId: testUser.id,
        artworkId: testArtwork.id,
        licenseOptionId: testUnlimitedLicense.id,
      });

      // Artificially tamper snapshot data in database
      const tamperedSnapshot = JSON.stringify({
        artworkTitle: 'Falsified Title',
        tampered: true,
      });
      await prisma.userArtworkLicense.update({
        where: { id: result.license.id },
        data: { agreementSnapshot: tamperedSnapshot },
      });

      const verifyResult = await verifyLicenseCertificate(result.certificateNumber);
      expect(verifyResult.isValid).toBe(false);
      expect(verifyResult.isHashAuthentic).toBe(false);
    });
  });

  describe('3. User Vault & Wishlist Sector Services', () => {
    it('toggles wishlist favorite and retrieves structured user vault data', async () => {
      // 1. Initial vault is empty
      const initialVault = await getUserVaultData(testUser.id);
      expect(initialVault.permanentIps.length).toBe(0);
      expect(initialVault.wishlist.length).toBe(0);

      // 2. Add to wishlist
      const favResult = await toggleArtworkFavorite(testUser.id, testArtwork.id);
      expect(favResult.isFavorited).toBe(true);

      const favIds = await getUserFavoriteArtworkIds(testUser.id);
      expect(favIds).toContain(testArtwork.id);

      // 3. Issue Permanent IP
      await issuePermanentLicenseAtomic({
        userId: testUser.id,
        artworkId: testArtwork.id,
        licenseOptionId: testUnlimitedLicense.id,
      });

      const permIds = await getUserPermanentIpArtworkIds(testUser.id);
      expect(permIds).toContain(testArtwork.id);

      // 4. Retrieve vault sectors
      const vault = await getUserVaultData(testUser.id);
      expect(vault.permanentIps.length).toBe(1);
      expect(vault.permanentIps[0].title).toBe('Golden Cyber Gorilla');
      expect(vault.permanentIps[0].certificateNumber).toMatch(/^LIC-PIP-/);

      expect(vault.wishlist.length).toBe(1);
      expect(vault.wishlist[0].artworkId).toBe(testArtwork.id);

      // 5. Batch favorite counts
      const counts = await getArtworksFavoriteCountBatch([testArtwork.id]);
      expect(counts[testArtwork.id]).toBe(1);

      // 6. Untoggle wishlist
      const unfavResult = await toggleArtworkFavorite(testUser.id, testArtwork.id);
      expect(unfavResult.isFavorited).toBe(false);
    });
  });

  describe('4. Post-Delivery Supplier & Artwork Reviews', () => {
    it('prevents non-buyers / non-licensees from reviewing artworks', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `random_${testRunId}_${Math.random().toString(36).substring(7)}@test.com`,
          name: 'Random Visitor',
        },
      });

      await expect(
        submitArtworkReview({
          userId: otherUser.id,
          artworkId: testArtwork.id,
          rating: 5,
          comment: 'Never bought it but looks nice',
        })
      ).rejects.toThrow('เฉพาะผู้ที่เคยสั่งซื้อผลงานนี้หรือถือครองลิขสิทธิ์ถาวร');
    });

    it('allows Permanent IP owners to submit reviews and aggregates ratings', async () => {
      // Grant Permanent IP
      await issuePermanentLicenseAtomic({
        userId: testUser.id,
        artworkId: testArtwork.id,
        licenseOptionId: testUnlimitedLicense.id,
      });

      const review = await submitArtworkReview({
        userId: testUser.id,
        artworkId: testArtwork.id,
        rating: 5,
        comment: 'ลายละเอียด คมชัด สกรีนออกมาสวยงามมาก!',
      });

      expect(review.rating).toBe(5);
      expect(review.comment).toBe('ลายละเอียด คมชัด สกรีนออกมาสวยงามมาก!');

      const agg = await getArtworkReviewsAndRating(testArtwork.id);
      expect(agg.averageRating).toBe(5);
      expect(agg.reviewCount).toBe(1);

      const batch = await getArtworksRatingBatch([testArtwork.id]);
      expect(batch[testArtwork.id].averageRating).toBe(5);
      expect(batch[testArtwork.id].reviewCount).toBe(1);
    });

    it('enforces DELIVERED status for supplier reviews', async () => {
      // Create an order in PAYMENT_CONFIRMED status
      const design = await prisma.designDocument.create({
        data: {
          garmentProductId: testGarment.id,
          garmentColorHex: '#131718',
          garmentSize: 'L',
          frontElements: '[]',
          backElements: '[]',
        },
      });

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-${testRunId}-REV`,
          customerId: testUser.id,
          supplierId: testSupplierProfile.id,
          designId: design.id,
          quantity: 1,
          garmentCost: 150,
          printingCost: 80,
          licensingCost: 50,
          packagingCost: 15,
          shippingCost: 40,
          totalAmount: 335,
          status: 'IN_PRODUCTION', // Not DELIVERED yet!
          paymentStatus: 'PAID',
          shippingName: 'Somchai',
          shippingAddress: '123 Sukhumvit',
          shippingCity: 'Bangkok',
          shippingPostal: '10110',
        },
      });

      // Attempt to review before delivery must throw
      await expect(
        submitSupplierReview({
          userId: testUser.id,
          orderId: order.id,
          rating: 4,
          comment: 'Still waiting...',
        })
      ).rejects.toThrow('สามารถให้คะแนนและรีวิวโรงงานผู้ผลิตได้หลังจากสินค้าจัดส่งสำเร็จ');

      // Update order to DELIVERED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'DELIVERED' },
      });

      // Submit review after delivery
      const supReview = await submitSupplierReview({
        userId: testUser.id,
        orderId: order.id,
        rating: 5,
        comment: 'จัดส่งรวดเร็ว ตัดเย็บเนี๊ยบ ผ้าหนานุ่ม 240 GSM ตามสเปก',
      });

      expect(supReview.rating).toBe(5);
      expect(supReview.supplierId).toBe(testSupplierProfile.id);

      // Verify supplier aggregate
      const supAgg = await getSupplierReviewsAndRating(testSupplierProfile.id);
      expect(supAgg.averageRating).toBe(5);
      expect(supAgg.reviewCount).toBe(1);

      const supBatch = await getSuppliersRatingBatch([testSupplierProfile.id]);
      expect(supBatch[testSupplierProfile.id].averageRating).toBe(5);
    });
  });

  afterAll(async () => {
    await prisma.userArtworkLicense.deleteMany({
      where: { artwork: { title: 'Golden Cyber Gorilla' } },
    });
    await prisma.artworkReview.deleteMany({
      where: { artwork: { title: 'Golden Cyber Gorilla' } },
    });
    await prisma.artworkFavorite.deleteMany({
      where: { artwork: { title: 'Golden Cyber Gorilla' } },
    });
    await prisma.licenseOption.deleteMany({
      where: { artwork: { title: 'Golden Cyber Gorilla' } },
    });
    await prisma.artwork.deleteMany({
      where: { title: 'Golden Cyber Gorilla' },
    });
  });
});
