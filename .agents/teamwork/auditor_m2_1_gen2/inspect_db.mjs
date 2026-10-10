import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('--- INSPECTING PRISMA / DEV.DB ---');
  const garments = await prisma.garmentProduct.count();
  const artworks = await prisma.artwork.count();
  const licenses = await prisma.licenseOption.count();
  const orders = await prisma.order.count();
  const obligations = await prisma.royaltyObligation.count();
  const ledgers = await prisma.royaltyLedgerEntry.count();
  const settlements = await prisma.creatorSettlement.count();
  const creators = await prisma.creatorProfile.findMany({ select: { id: true, slug: true, displayName: true } });
  console.log('--- CREATORS ---', creators);

  console.log(JSON.stringify({
    garments,
    artworks,
    licenses,
    orders,
    obligations,
    ledgers,
    settlements,
    auditEvents,
  }, null, 2));

  // Inspect benchmark order APX-ORD-9021
  const benchmarkOrder = await prisma.order.findUnique({
    where: { orderNumber: 'APX-ORD-9021' },
    include: {
      obligations: {
        include: {
          artwork: true,
          licenseOption: true,
        },
      },
      supplier: true,
      design: true,
    },
  });

  console.log('--- BENCHMARK ORDER APX-ORD-9021 ---');
  if (benchmarkOrder) {
    console.log({
      id: benchmarkOrder.id,
      orderNumber: benchmarkOrder.orderNumber,
      totalAmount: benchmarkOrder.totalAmount,
      status: benchmarkOrder.status,
      obligationsCount: benchmarkOrder.obligations.length,
      obligations: benchmarkOrder.obligations.map(o => ({
        artwork: o.artwork?.title,
        unitRoyalty: o.unitRoyalty,
        totalAmount: o.totalAmount,
        status: o.status,
      })),
    });
  } else {
    console.log('APX-ORD-9021 not found!');
  }

  // Inspect latest ledger entries
  const latestEntries = await prisma.royaltyLedgerEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  console.log('--- LATEST LEDGER ENTRIES ---');
  console.log(latestEntries);
}

inspect()
  .catch((e) => {
    console.error('Inspection failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
