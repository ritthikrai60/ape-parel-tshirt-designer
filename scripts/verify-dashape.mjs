import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const creator = await prisma.creatorProfile.findFirst({
    where: { slug: 'dash-ape' },
    include: {
      artworks: {
        select: { id: true, title: true, previewUrl: true, category: true, status: true },
      },
    },
  });
  console.log('Creator:', creator.displayName);
  console.log('Avatar:', creator.avatarUrl);
  console.log('Artworks count:', creator.artworks.length);
  console.table(creator.artworks);
}

main().finally(() => prisma.$disconnect());
