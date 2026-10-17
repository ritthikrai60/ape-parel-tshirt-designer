import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING APE-PAREL DATABASE ---');

  // Clean existing records in sequence (child tables before parent tables to respect SQLite foreign keys)
  await prisma.reconciliationReport.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.financialAccount.deleteMany();
  await prisma.commissionRule.deleteMany();
  await prisma.artworkFileSpec.deleteMany();
  await prisma.creatorStorefrontSettings.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.creatorSettlement.deleteMany();
  await prisma.royaltyLedgerEntry.deleteMany();
  await prisma.royaltyObligation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.designDocument.deleteMany();
  await prisma.printingService.deleteMany();
  await prisma.garmentVariant.deleteMany();
  await prisma.garmentProduct.deleteMany();
  await prisma.licenseOption.deleteMany();
  await prisma.artwork.deleteMany();
  await prisma.supplierProfile.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.user.deleteMany();

  // 0. Commission Rules (R4 & Milestone M1)
  const standardCommissionRule = await prisma.commissionRule.create({
    data: {
      name: 'STANDARD_15_85',
      platformRate: 0.15,
      creatorRate: 0.85,
      isActive: true,
      description: 'Standard ape-parel marketplace commission split (15% platform, 85% creator).',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  // 1. Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ape-parel.com',
      name: 'Ape-Parel Platform Admin',
      role: 'ADMIN',
    },
  });

  // 2. Customer User
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@ape-parel.com',
      name: 'Streetwear Collector',
      role: 'CUSTOMER',
    },
  });

  // 3. Creator 1: Dash Ape (Mascot & Streetwear)
  const creatorUser1 = await prisma.user.create({
    data: {
      email: 'dashape@ape-parel.com',
      name: 'Dash Ape Studio',
      role: 'CREATOR',
    },
  });

  const creator1 = await prisma.creatorProfile.create({
    data: {
      userId: creatorUser1.id,
      slug: 'dash-ape',
      displayName: 'Dash Ape Studio',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics.',
      website: 'https://dashape.design',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      payoutDetails: 'PromptPay ID: 081-992-4411 (Bangkok Bank)',
    },
  });

  // 4. Creator 2: Cyber Monk (Typography & Tech-wear)
  const creatorUser2 = await prisma.user.create({
    data: {
      email: 'cybermonk@ape-parel.com',
      name: 'Cyber Monk',
      role: 'CREATOR',
    },
  });

  const creator2 = await prisma.creatorProfile.create({
    data: {
      userId: creatorUser2.id,
      slug: 'cyber-monk',
      displayName: 'Cyber Monk',
      bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions.',
      website: 'https://cybermonk.art',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      payoutDetails: 'KBank Acc: XXX-2-11940-9',
    },
  });

  // 5. Creator 3: Soma Botanica (Organic Brutalism)
  const creatorUser3 = await prisma.user.create({
    data: {
      email: 'soma@ape-parel.com',
      name: 'Soma Botanica',
      role: 'CREATOR',
    },
  });

  const creator3 = await prisma.creatorProfile.create({
    data: {
      userId: creatorUser3.id,
      slug: 'soma-botanica',
      displayName: 'Soma Botanica',
      bio: 'Experimental botanical drawings meets modern industrial streetwear framing.',
      website: 'https://somabotanica.art',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      payoutDetails: 'SCB Acc: XXX-4-88210-4',
    },
  });

  // 6. Double-Entry Financial Accounts (Platform, Escrow, Creators)
  const platformAccount = await prisma.financialAccount.create({
    data: {
      accountType: 'PLATFORM',
      accountNumber: 'ACC-PLATFORM-REVENUE',
      balance: 19, // Benchmark order commission accrued
      currency: 'THB',
      status: 'ACTIVE',
    },
  });

  const escrowAccount = await prisma.financialAccount.create({
    data: {
      accountType: 'ESCROW',
      accountNumber: 'ACC-ESCROW-HOLDING',
      balance: 0, // Cleared on settlement
      currency: 'THB',
      status: 'ACTIVE',
    },
  });

  const creatorAccount1 = await prisma.financialAccount.create({
    data: {
      accountType: 'CREATOR',
      accountNumber: 'ACC-CREATOR-dash-ape',
      balance: 85, // 85% of THB 100 for Dash Ape
      currency: 'THB',
      creatorId: creator1.id,
      status: 'ACTIVE',
    },
  });

  const creatorAccount2 = await prisma.financialAccount.create({
    data: {
      accountType: 'CREATOR',
      accountNumber: 'ACC-CREATOR-cyber-monk',
      balance: 21, // 85% of THB 25 for Cyber Monk
      currency: 'THB',
      creatorId: creator2.id,
      status: 'ACTIVE',
    },
  });

  const creatorAccount3 = await prisma.financialAccount.create({
    data: {
      accountType: 'CREATOR',
      accountNumber: 'ACC-CREATOR-soma-botanica',
      balance: 0,
      currency: 'THB',
      creatorId: creator3.id,
      status: 'ACTIVE',
    },
  });

  // 7. Artworks & Licenses
  // Artwork 1 (Dash Ape Classic - Benchmark THB 40)
  const art1 = await prisma.artwork.create({
    data: {
      creatorId: creator1.id,
      title: 'Dash Ape Classic Head Mark',
      description: 'Signature circular badge featuring the confident Dash Ape mascot face in bold ink contrast.',
      category: 'MASCOT',
      previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=dash-ape-alpha&backgroundColor=131718',
      mimeType: 'image/svg+xml',
      tags: 'mascot,ape,streetwear,badge,logo',
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      licenseOptions: {
        create: [
          {
            name: 'Standard Apparel License (Per Garment)',
            price: 40, // Matches benchmark THB 40
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Single production unit print license with creator attribution.',
          },
          {
            name: 'Limited Commercial Run',
            price: 90,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Commercial production license for small batch releases up to 50 units.',
          },
        ],
      },
    },
  });

  // Artwork 2 (Cyber Primate - Benchmark THB 60)
  const art2 = await prisma.artwork.create({
    data: {
      creatorId: creator1.id,
      title: 'Cyber Primate Tokyo 2088',
      description: 'Futuristic mechanized simian cyberpunk illustration with holographic accents.',
      category: 'ILLUSTRATION',
      previewUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=cyber-primate-2088&backgroundColor=DABA98',
      mimeType: 'image/svg+xml',
      tags: 'cyberpunk,tokyo,primate,illustration',
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      licenseOptions: {
        create: [
          {
            name: 'Standard Apparel License',
            price: 60, // Matches benchmark THB 60
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Direct to garment apparel print license.',
          },
        ],
      },
    },
  });

  // Artwork 3 (Static Glitch - Benchmark THB 25)
  const art3 = await prisma.artwork.create({
    data: {
      creatorId: creator2.id,
      title: 'Static Glitch Protocol',
      description: 'Monochrome digital noise and scanline pattern suited for sleeve and chest prints.',
      category: 'PATTERN',
      previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=static-glitch-pattern&backgroundColor=222729',
      mimeType: 'image/svg+xml',
      tags: 'glitch,pattern,monochrome,abstract',
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      licenseOptions: {
        create: [
          {
            name: 'Standard Apparel License',
            price: 25, // Matches benchmark THB 25
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Standard per-unit apparel print authorization.',
          },
        ],
      },
    },
  });

  // Artwork 4 (Neo Shibuya Typography - THB 50)
  const art4 = await prisma.artwork.create({
    data: {
      creatorId: creator2.id,
      title: 'Neo Shibuya Heavy Kanji',
      description: 'Distressed brutalist typography composition with vertical Japanese script.',
      category: 'TYPOGRAPHY',
      previewUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=neo-shibuya-kanji&backgroundColor=131718',
      mimeType: 'image/svg+xml',
      tags: 'kanji,typography,brutalism,shibuya',
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      licenseOptions: {
        create: [
          {
            name: 'Standard Apparel License',
            price: 50,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Per unit typography print license.',
          },
        ],
      },
    },
  });

  // Artwork 5 (Bonsai Core - THB 45)
  const art5 = await prisma.artwork.create({
    data: {
      creatorId: creator3.id,
      title: 'Bonsai Core Brutalism',
      description: 'Hand-drawn ancient bonsai tree encased in industrial geometry.',
      category: 'ILLUSTRATION',
      previewUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=bonsai-core&backgroundColor=F5F0E8',
      mimeType: 'image/svg+xml',
      tags: 'bonsai,nature,botanical,illustration',
      status: 'PUBLISHED',
      moderationStatus: 'APPROVED',
      licenseOptions: {
        create: [
          {
            name: 'Standard Apparel License',
            price: 45,
            commercialUse: true,
            scope: 'PER_GARMENT',
            terms: 'Single garment unit print rights.',
          },
        ],
      },
    },
  });

  // 8. Creator Storefront Settings (R1 & R4)
  await prisma.creatorStorefrontSettings.create({
    data: {
      creatorId: creator1.id,
      customSlug: 'dash-ape',
      bio: 'Tokyo-Bangkok underground street culture, expressive simian marks and bold mascot aesthetics. Official Apex Resident Artist.',
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
      avatarUrl: creator1.avatarUrl,
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/dashapestudio',
        twitter: 'https://x.com/dashape_art',
        behance: 'https://behance.net/dashape',
        website: creator1.website,
      }),
      themePreferences: JSON.stringify({
        primaryColor: '#131718', // Ink Black
        accentColor: '#DABA98',  // Warm Kraft
        secondaryColor: '#F5F0E8', // Paper Beige
        font: 'Space Grotesk',
        mode: 'dark',
        layout: 'grid-featured',
      }),
      featuredArtworkIds: JSON.stringify([art1.id, art2.id]),
      badgeVerified: true,
    },
  });

  await prisma.creatorStorefrontSettings.create({
    data: {
      creatorId: creator2.id,
      customSlug: 'cyber-monk',
      bio: 'Brutalist typography, glitch art, kanji subversions and dystopian aesthetic compositions. Pushing the boundaries of neo-industrial apparel.',
      bannerUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80',
      avatarUrl: creator2.avatarUrl,
      socialLinks: JSON.stringify({
        twitter: 'https://x.com/cybermonk_x',
        instagram: 'https://instagram.com/cybermonk.art',
        behance: 'https://behance.net/cybermonk',
        website: creator2.website,
      }),
      themePreferences: JSON.stringify({
        primaryColor: '#131718', // Ink Black
        accentColor: '#DABA98',  // Warm Kraft
        secondaryColor: '#222729',
        font: 'JetBrains Mono',
        mode: 'dark',
        layout: 'editorial',
      }),
      featuredArtworkIds: JSON.stringify([art3.id, art4.id]),
      badgeVerified: true,
    },
  });

  await prisma.creatorStorefrontSettings.create({
    data: {
      creatorId: creator3.id,
      customSlug: 'soma-botanica',
      bio: 'Experimental botanical drawings meets modern industrial streetwear framing. Organic textures intertwined with architectural lines.',
      bannerUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&q=80',
      avatarUrl: creator3.avatarUrl,
      socialLinks: JSON.stringify({
        instagram: 'https://instagram.com/somabotanica',
        behance: 'https://behance.net/somabotanica',
        website: creator3.website,
      }),
      themePreferences: JSON.stringify({
        primaryColor: '#F5F0E8', // Paper Beige
        accentColor: '#DABA98',  // Warm Kraft
        secondaryColor: '#131718', // Ink Black
        font: 'Cinzel',
        mode: 'light',
        layout: 'minimal-curated',
      }),
      featuredArtworkIds: JSON.stringify([art5.id]),
      badgeVerified: true,
    },
  });

  // 9. Artwork File Specifications (R2 & R4)
  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art1.id,
      storagePath: 'public/uploads/masters/art1_dash_ape_classic.png',
      storageKey: 'masters/art1_dash_ape_classic.png',
      mimeType: 'image/png',
      width: 3600,
      height: 3600,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: 'public/uploads/previews/art1_dash_ape_classic_watermarked.png',
      fileSize: 2840500,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art2.id,
      storagePath: 'public/uploads/masters/art2_cyber_primate_2088.png',
      storageKey: 'masters/art2_cyber_primate_2088.png',
      mimeType: 'image/png',
      width: 4200,
      height: 4200,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: 'public/uploads/previews/art2_cyber_primate_2088_watermarked.png',
      fileSize: 3920100,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art3.id,
      storagePath: 'public/uploads/masters/art3_static_glitch_protocol.svg',
      storageKey: 'masters/art3_static_glitch_protocol.svg',
      mimeType: 'image/svg+xml',
      width: 3000,
      height: 3000,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: true,
      previewWatermarkedPath: 'public/uploads/previews/art3_static_glitch_protocol_watermarked.png',
      fileSize: 185400,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art4.id,
      storagePath: 'public/uploads/masters/art4_neo_shibuya_kanji.svg',
      storageKey: 'masters/art4_neo_shibuya_kanji.svg',
      mimeType: 'image/svg+xml',
      width: 3200,
      height: 4000,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: true,
      previewWatermarkedPath: 'public/uploads/previews/art4_neo_shibuya_kanji_watermarked.png',
      fileSize: 245900,
    },
  });

  await prisma.artworkFileSpec.create({
    data: {
      artworkId: art5.id,
      storagePath: 'public/uploads/masters/art5_bonsai_core.png',
      storageKey: 'masters/art5_bonsai_core.png',
      mimeType: 'image/png',
      width: 3800,
      height: 3800,
      dpi: 300,
      colorSpace: 'sRGB',
      hasTransparency: true,
      isVector: false,
      previewWatermarkedPath: 'public/uploads/previews/art5_bonsai_core_watermarked.png',
      fileSize: 3154800,
    },
  });

  // 10. Supplier 1: Bangkok Garment Craft Co.
  const supplierUser1 = await prisma.user.create({
    data: {
      email: 'production@bangkokgarment.co.th',
      name: 'Bangkok Garment Craft',
      role: 'SUPPLIER',
    },
  });

  const supplier1 = await prisma.supplierProfile.create({
    data: {
      userId: supplierUser1.id,
      slug: 'bangkok-garment-craft',
      companyName: 'Bangkok Garment Craft Co., Ltd.',
      description: 'Specialty streetwear garment manufacturer offering heavyweight combed cotton blanks and precision Kornit DTG digital printing.',
      location: 'Phra Khanong, Bangkok, Thailand',
      contactEmail: 'production@bangkokgarment.co.th',
      contactPhone: '+66 2 712 9940',
      leadTimeDays: 4,
      minOrderQuantity: 1,
      verified: true,
    },
  });

  // Printing Service for Supplier 1 (Benchmark THB 80)
  await prisma.printingService.create({
    data: {
      supplierId: supplier1.id,
      name: 'High-Definition Kornit Digital DTG',
      code: 'DTG',
      description: 'Water-based pigment direct-to-garment print with vibrant saturation and soft hand-feel.',
      pricePerSurface: 80, // Matches benchmark THB 80!
      maxPrintWidthCm: 35.0,
      maxPrintHeightCm: 45.0,
      supportedSurfaces: 'BOTH',
      minOrderQty: 1,
    },
  });

  // Garment 1: Apex Heavyweight Oversized Tee (Benchmark: ฿150 base, ฿15 pack, ฿40 ship)
  const garment1 = await prisma.garmentProduct.create({
    data: {
      supplierId: supplier1.id,
      sku: 'APX-HVY-001',
      name: 'Apex Heavyweight Oversized Tee',
      description: 'Heavy 240 GSM combed cotton featuring a drop-shoulder cut, tight rib collar, and pre-shrunk finish.',
      fabric: '100% Combed Cotton, 240 GSM',
      weightGsm: 240,
      fit: 'oversized',
      neckline: 'crew',
      basePrice: 150, // Matches benchmark THB 150!
      packagingPrice: 15, // Matches benchmark THB 15!
      shippingPrice: 40, // Matches benchmark THB 40!
    },
  });

  // Garment Variants for Garment 1
  await prisma.garmentVariant.createMany({
    data: [
      {
        productId: garment1.id,
        sku: 'APX-HVY-001-BLK-L',
        colorName: 'Ink Black',
        colorHex: '#131718',
        size: 'L',
        stock: 120,
        priceAdjustment: 0,
      },
      {
        productId: garment1.id,
        sku: 'APX-HVY-001-BLK-XL',
        colorName: 'Ink Black',
        colorHex: '#131718',
        size: 'XL',
        stock: 80,
        priceAdjustment: 0,
      },
      {
        productId: garment1.id,
        sku: 'APX-HVY-001-WHT-L',
        colorName: 'Optic White',
        colorHex: '#FFFFFF',
        size: 'L',
        stock: 90,
        priceAdjustment: 0,
      },
      {
        productId: garment1.id,
        sku: 'APX-HVY-001-BGE-L',
        colorName: 'Paper Beige',
        colorHex: '#F5F0E8',
        size: 'L',
        stock: 65,
        priceAdjustment: 0,
      },
      {
        productId: garment1.id,
        sku: 'APX-HVY-001-WRM-L',
        colorName: 'Warm Kraft',
        colorHex: '#DABA98',
        size: 'L',
        stock: 55,
        priceAdjustment: 0,
      },
    ],
  });

  // 11. Supplier 2: Siam Textile Mill
  const supplierUser2 = await prisma.user.create({
    data: {
      email: 'contact@siamtextile.th',
      name: 'Siam Textile Mill',
      role: 'SUPPLIER',
    },
  });

  const supplier2 = await prisma.supplierProfile.create({
    data: {
      userId: supplierUser2.id,
      slug: 'siam-textile-mill',
      companyName: 'Siam Textile & Screen Mill',
      description: 'Vintage boxy cut blanks with pigment dye finishing, heavy screen printing, and DTG capabilities.',
      location: 'Samut Prakan, Thailand',
      contactEmail: 'contact@siamtextile.th',
      contactPhone: '+66 2 388 1200',
      leadTimeDays: 5,
      minOrderQuantity: 1,
      verified: true,
    },
  });

  await prisma.printingService.create({
    data: {
      supplierId: supplier2.id,
      name: 'Heavy Industrial DTG Print',
      code: 'DTG',
      pricePerSurface: 85,
      maxPrintWidthCm: 35.0,
      maxPrintHeightCm: 45.0,
      supportedSurfaces: 'BOTH',
      minOrderQty: 1,
    },
  });

  const garment2 = await prisma.garmentProduct.create({
    data: {
      supplierId: supplier2.id,
      sku: 'RTR-BOX-002',
      name: 'Retro 90s Boxy Tee',
      description: 'Heavyweight 220 GSM ring-spun cotton with authentic 90s vintage boxy proportions and reinforced double stitching.',
      fabric: '100% Ring-spun Cotton, 220 GSM',
      weightGsm: 220,
      fit: 'boxy',
      neckline: 'crew',
      basePrice: 160,
      packagingPrice: 15,
      shippingPrice: 45,
    },
  });

  await prisma.garmentVariant.createMany({
    data: [
      {
        productId: garment2.id,
        sku: 'RTR-BOX-002-BLK-L',
        colorName: 'Ink Black',
        colorHex: '#131718',
        size: 'L',
        stock: 70,
        priceAdjustment: 0,
      },
      {
        productId: garment2.id,
        sku: 'RTR-BOX-002-WHT-L',
        colorName: 'Optic White',
        colorHex: '#FFFFFF',
        size: 'L',
        stock: 60,
        priceAdjustment: 0,
      },
    ],
  });

  // 12. Sample Saved Design (Combining Benchmark Artworks 1, 2, and 3)
  const lic1 = await prisma.licenseOption.findFirst({ where: { artworkId: art1.id, price: 40 } });
  const lic2 = await prisma.licenseOption.findFirst({ where: { artworkId: art2.id, price: 60 } });
  const lic3 = await prisma.licenseOption.findFirst({ where: { artworkId: art3.id, price: 25 } });

  const sampleFrontElements = [
    {
      id: 'elem-front-1',
      artworkId: art1.id,
      licenseOptionId: lic1.id,
      title: art1.title,
      previewUrl: art1.previewUrl,
      creatorName: creator1.displayName,
      creatorId: creator1.id,
      surface: 'FRONT',
      x: 50,
      y: 35,
      width: 32,
      height: 32,
      rotation: 0,
      zIndex: 1,
      price: 40,
    },
    {
      id: 'elem-front-2',
      artworkId: art2.id,
      licenseOptionId: lic2.id,
      title: art2.title,
      previewUrl: art2.previewUrl,
      creatorName: creator1.displayName,
      creatorId: creator1.id,
      surface: 'FRONT',
      x: 50,
      y: 62,
      width: 28,
      height: 28,
      rotation: 0,
      zIndex: 2,
      price: 60,
    },
  ];

  const sampleSideElements = [
    {
      id: 'elem-side-1',
      artworkId: art3.id,
      licenseOptionId: lic3.id,
      title: art3.title,
      previewUrl: art3.previewUrl,
      creatorName: creator2.displayName,
      creatorId: creator2.id,
      surface: 'SIDE',
      x: 50,
      y: 40,
      width: 22,
      height: 22,
      rotation: 0,
      zIndex: 1,
      price: 25,
    },
  ];

  const savedDesign = await prisma.designDocument.create({
    data: {
      userId: customerUser.id,
      title: 'Ape-Parel Cyber Protocol Oversized Tee',
      garmentProductId: garment1.id,
      garmentColorHex: '#131718',
      garmentSize: 'L',
      garmentFit: 'oversized',
      frontElements: JSON.stringify(sampleFrontElements),
      backElements: JSON.stringify([]),
      sideElements: JSON.stringify(sampleSideElements),
      previewFrontUrl: art1.previewUrl,
      status: 'READY_FOR_QUOTE',
    },
  });

  // 13. Sample Order & Exact Benchmark Royalty Allocation
  // Order: 1 unit of Apex Heavyweight Tee
  // Garment (150) + DTG (80) + Pack (15) + Ship (40) + Licenses (40 + 60 + 25 = 125) = THB 410!
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'APX-ORD-9021',
      customerId: customerUser.id,
      designId: savedDesign.id,
      supplierId: supplier1.id,
      quantity: 1,
      status: 'PAYMENT_CONFIRMED',
      paymentMode: 'DEV_MOCK',
      paymentStatus: 'PAID',
      garmentCost: 150,
      printingCost: 80,
      licensingCost: 125,
      packagingCost: 15,
      shippingCost: 40,
      totalAmount: 410, // Exact Benchmark THB 410!
      shippingName: 'Streetwear Collector',
      shippingAddress: '88 Thonglor Soi 10, Sukhumvit 55',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      shippingPhone: '+66 81 234 5678',
      snapshotData: JSON.stringify({
        garmentSku: garment1.sku,
        garmentName: garment1.name,
        colorHex: '#131718',
        size: 'L',
        surfaces: ['FRONT', 'SIDE'],
        artworks: [
          { artworkId: art1.id, title: art1.title, creatorId: creator1.id, royalty: 40 },
          { artworkId: art2.id, title: art2.title, creatorId: creator1.id, royalty: 60 },
          { artworkId: art3.id, title: art3.title, creatorId: creator2.id, royalty: 25 },
        ],
      }),
    },
  });

  // 14. Individual Traceable Royalty Obligations (Layer 1 Legacy)
  // Obligation 1: Creator 1 (Artwork 1) -> THB 40
  const ob1 = await prisma.royaltyObligation.create({
    data: {
      orderId: sampleOrder.id,
      creatorId: creator1.id,
      artworkId: art1.id,
      licenseOptionId: lic1.id,
      unitRoyalty: 40,
      quantity: 1,
      totalAmount: 40,
      status: 'ELIGIBLE',
    },
  });

  await prisma.royaltyLedgerEntry.create({
    data: {
      creatorId: creator1.id,
      obligationId: ob1.id,
      entryType: 'EARNING',
      amount: 40,
      balanceAfter: 40,
      reference: sampleOrder.orderNumber,
      notes: `Order ${sampleOrder.orderNumber}: License for ${art1.title}`,
    },
  });

  // Obligation 2: Creator 1 (Artwork 2) -> THB 60
  const ob2 = await prisma.royaltyObligation.create({
    data: {
      orderId: sampleOrder.id,
      creatorId: creator1.id,
      artworkId: art2.id,
      licenseOptionId: lic2.id,
      unitRoyalty: 60,
      quantity: 1,
      totalAmount: 60,
      status: 'ELIGIBLE',
    },
  });

  await prisma.royaltyLedgerEntry.create({
    data: {
      creatorId: creator1.id,
      obligationId: ob2.id,
      entryType: 'EARNING',
      amount: 60,
      balanceAfter: 100, // 40 + 60
      reference: sampleOrder.orderNumber,
      notes: `Order ${sampleOrder.orderNumber}: License for ${art2.title}`,
    },
  });

  // Obligation 3: Creator 2 (Artwork 3) -> THB 25
  const ob3 = await prisma.royaltyObligation.create({
    data: {
      orderId: sampleOrder.id,
      creatorId: creator2.id,
      artworkId: art3.id,
      licenseOptionId: lic3.id,
      unitRoyalty: 25,
      quantity: 1,
      totalAmount: 25,
      status: 'ELIGIBLE',
    },
  });

  await prisma.royaltyLedgerEntry.create({
    data: {
      creatorId: creator2.id,
      obligationId: ob3.id,
      entryType: 'EARNING',
      amount: 25,
      balanceAfter: 25,
      reference: sampleOrder.orderNumber,
      notes: `Order ${sampleOrder.orderNumber}: License for ${art3.title}`,
    },
  });

  // 15. Double-Entry General Ledger Entries (Layer 2 Enterprise Bookkeeping)
  // Step 1: Customer payment received in Escrow account (125 THB total artwork GMV)
  await prisma.journalEntry.create({
    data: {
      accountId: escrowAccount.id,
      entryType: 'CREDIT',
      amount: 125,
      balanceAfter: 125,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Customer payment received in escrow for order ${sampleOrder.orderNumber}`,
    },
  });

  // Step 2: Escrow released upon order fulfillment / royalty allocation
  await prisma.journalEntry.create({
    data: {
      accountId: escrowAccount.id,
      entryType: 'DEBIT',
      amount: 125,
      balanceAfter: 0,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Escrow released for order ${sampleOrder.orderNumber} royalty settlement`,
    },
  });

  // Step 3: Platform 15% commission fee recognized (15% of 125 THB = 19 THB rounded)
  await prisma.journalEntry.create({
    data: {
      accountId: platformAccount.id,
      entryType: 'CREDIT',
      amount: 19,
      balanceAfter: 19,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Platform 15% commission fee for order ${sampleOrder.orderNumber}`,
    },
  });

  // Step 4: Dash Ape Creator Accrual (85% of THB 100 = 85 THB)
  await prisma.journalEntry.create({
    data: {
      accountId: creatorAccount1.id,
      entryType: 'CREDIT',
      amount: 85,
      balanceAfter: 85,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Creator royalty accrual (85%) for order ${sampleOrder.orderNumber}: Artworks 1 & 2`,
    },
  });

  // Step 5: Cyber Monk Creator Accrual (85% of THB 25 = 21 THB)
  await prisma.journalEntry.create({
    data: {
      accountId: creatorAccount2.id,
      entryType: 'CREDIT',
      amount: 21,
      balanceAfter: 21,
      orderId: sampleOrder.id,
      reference: sampleOrder.orderNumber,
      description: `Creator royalty accrual (85%) for order ${sampleOrder.orderNumber}: Artwork 3`,
    },
  });

  // 16. Financial Reconciliation Report (October 2026 Audit)
  await prisma.reconciliationReport.create({
    data: {
      period: '2026-10',
      periodStart: new Date('2026-10-01T00:00:00.000Z'),
      periodEnd: new Date('2026-10-31T23:59:59.000Z'),
      totalGmv: 125,
      totalCommission: 19,
      totalCreatorRoyalties: 106,
      matchedItemsCount: 3,
      discrepancyCount: 0,
      status: 'BALANCED',
      balanceConservationVerified: true,
      generatedBy: 'SYSTEM',
    },
  });

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  console.log(`Admin User: ${adminUser.email}`);
  console.log(`Creators: 3 seeded (Dash Ape, Cyber Monk, Soma Botanica) with Storefront Settings & Accounts`);
  console.log(`Suppliers: 2 seeded (Bangkok Garment Craft, Siam Textile Mill)`);
  console.log(`Artworks: 5 seeded with active license options & file specifications`);
  console.log(`Financial Accounts: Platform (19 THB), Escrow (0 THB), 3 Creators (106 THB total accrual)`);
  console.log(`Sample Order: ${sampleOrder.orderNumber} (Total: THB ${sampleOrder.totalAmount})`);
  console.log(`Double-Entry Journal: 5 entries recorded, 1 reconciliation report generated`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
