import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = {
    users: await prisma.user.count(),
    creators: await prisma.creatorProfile.count(),
    suppliers: await prisma.supplierProfile.count(),
    garments: await prisma.garmentProduct.count(),
    variants: await prisma.garmentVariant.count(),
    printingServices: await prisma.printingService.count(),
    artworks: await prisma.artwork.count(),
    licenses: await prisma.licenseOption.count(),
    designs: await prisma.designDocument.count(),
    orders: await prisma.order.count(),
    obligations: await prisma.royaltyObligation.count(),
    ledgerEntries: await prisma.royaltyLedgerEntry.count(),
    settlements: await prisma.creatorSettlement.count(),
    auditEvents: await prisma.auditEvent.count(),
  };

  console.log('DB Counts:', JSON.stringify(counts, null, 2));

  // Benchmark Garment check
  const benchmarkGarment = await prisma.garmentProduct.findUnique({
    where: { sku: 'APX-HVY-001' },
    include: {
      supplier: {
        include: { printingServices: true }
      }
    }
  });

  console.log('Benchmark Garment APX-HVY-001:', {
    name: benchmarkGarment?.name,
    basePrice: benchmarkGarment?.basePrice,
    packagingPrice: benchmarkGarment?.packagingPrice,
    shippingPrice: benchmarkGarment?.shippingPrice,
    dtgPricePerSurface: benchmarkGarment?.supplier?.printingServices?.find(s => s.code === 'DTG')?.pricePerSurface,
  });

  // Benchmark Licenses check
  const dashApeLicense = await prisma.licenseOption.findFirst({
    where: { artwork: { title: { contains: 'Dash Ape Classic Head Mark' } } },
    select: { name: true, price: true, artwork: { select: { title: true } } }
  });
  const cyberPrimateLicense = await prisma.licenseOption.findFirst({
    where: { artwork: { title: { contains: 'Cyber Primate Tokyo 2088' } } },
    select: { name: true, price: true, artwork: { select: { title: true } } }
  });
  const staticGlitchLicense = await prisma.licenseOption.findFirst({
    where: { artwork: { title: { contains: 'Static Glitch Protocol' } } },
    select: { name: true, price: true, artwork: { select: { title: true } } }
  });

  console.log('Benchmark Licenses:', {
    dashApe: dashApeLicense,
    cyberPrimate: cyberPrimateLicense,
    staticGlitch: staticGlitchLicense,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
