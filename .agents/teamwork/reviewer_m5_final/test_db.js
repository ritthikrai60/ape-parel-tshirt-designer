const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Prisma...');
  const start = Date.now();
  const g = await prisma.garmentProduct.findUnique({
    where: { sku: 'APX-HVY-001' },
    include: {
      variants: true,
      supplier: {
        include: {
          printingServices: true,
        },
      },
    },
  });
  console.log(`Query finished in ${Date.now() - start}ms. Garment SKU:`, g?.sku);

  const art1 = await prisma.artwork.findFirst({
    where: { title: { contains: 'Dash Ape Classic' } },
    include: { licenseOptions: true },
  });
  console.log('Artwork 1:', art1?.title);
}

main()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
