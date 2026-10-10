import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING APE-PAREL DATABASE ---');

  // Clean existing records in sequence
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

  // 6. Artworks & Licenses
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

  // 7. Supplier 1: Bangkok Garment Craft Co.
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

  // 8. Supplier 2: Siam Textile Mill
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

  // 9. Sample Saved Design (Combining Benchmark Artworks 1, 2, and 3)
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

  // 10. Sample Order & Exact Benchmark Royalty Allocation
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

  // 11. Create Individual Traceable Royalty Obligations
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

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
  console.log(`Admin User: ${adminUser.email}`);
  console.log(`Creators: 3 seeded (Dash Ape, Cyber Monk, Soma Botanica)`);
  console.log(`Suppliers: 2 seeded (Bangkok Garment Craft, Siam Textile Mill)`);
  console.log(`Artworks: 5 seeded with active license options`);
  console.log(`Sample Order: ${sampleOrder.orderNumber} (Total: THB ${sampleOrder.totalAmount})`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
