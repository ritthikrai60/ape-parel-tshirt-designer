import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const counts = {
    garments: await prisma.garmentProduct.count(),
    variants: await prisma.garmentVariant.count(),
    creators: await prisma.creatorProfile.count(),
    artworks: await prisma.artwork.count(),
    licenseOptions: await prisma.licenseOption.count(),
    orders: await prisma.order.count(),
    obligations: await prisma.royaltyObligation.count(),
    ledgerEntries: await prisma.royaltyLedgerEntry.count(),
    auditEvents: await prisma.auditEvent.count(),
    suppliers: await prisma.supplierProfile.count(),
    users: await prisma.user.count(),
  };
  console.log('COUNTS:', JSON.stringify(counts, null, 2));

  const auditEvents = await prisma.auditEvent.findMany();
  console.log('AUDIT EVENTS COUNT:', auditEvents.length);
  if (auditEvents.length > 0) {
    console.log('AUDIT EVENTS:', JSON.stringify(auditEvents, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
