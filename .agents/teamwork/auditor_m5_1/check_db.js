const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DATABASE INTEGRITY CHECK ---');
  const counts = {
    users: await prisma.user.count(),
    creatorProfiles: await prisma.creatorProfile.count(),
    supplierProfiles: await prisma.supplierProfile.count(),
    garmentProducts: await prisma.garmentProduct.count(),
    garmentVariants: await prisma.garmentVariant.count(),
    printingServices: await prisma.printingService.count(),
    artworks: await prisma.artwork.count(),
    licenseOptions: await prisma.licenseOption.count(),
    designDocuments: await prisma.designDocument.count(),
    orders: await prisma.order.count(),
    royaltyObligations: await prisma.royaltyObligation.count(),
    royaltyLedgerEntries: await prisma.royaltyLedgerEntry.count(),
    creatorSettlements: await prisma.creatorSettlement.count(),
    auditEvents: await prisma.auditEvent.count(),
  };
  console.log(JSON.stringify(counts, null, 2));

  // Check canonical seeded records
  console.log('--- CANONICAL SEED AUDIT ---');
  const canonicalGarment = await prisma.garmentProduct.findUnique({
    where: { sku: 'APX-HVY-001' },
    include: { variants: true, supplier: { include: { printingServices: true } } },
  });
  console.log('APX-HVY-001 Garment:', canonicalGarment?.name, '| basePrice:', canonicalGarment?.basePrice, '| packaging:', canonicalGarment?.packagingPrice, '| shipping:', canonicalGarment?.shippingPrice);

  const creators = await prisma.creatorProfile.findMany({ select: { id: true, slug: true, displayName: true } });
  console.log('Creators:', creators);

  const artworks = await prisma.artwork.findMany({
    select: { id: true, title: true, licenseOptions: { select: { id: true, price: true, name: true } } },
  });
  console.log('Artworks & Licenses:', JSON.stringify(artworks, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
