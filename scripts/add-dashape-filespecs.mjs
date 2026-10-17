import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const dashApeArtworks = await prisma.artwork.findMany({
    where: {
      creator: { slug: 'dash-ape' },
    },
    include: {
      fileSpec: true,
    },
  });

  for (const art of dashApeArtworks) {
    const filename = path.basename(art.previewUrl);
    const storagePath = `public/uploads/artworks/dashape/${filename}`;
    let fileSize = 350000;
    try {
      const stats = fs.statSync(storagePath);
      fileSize = stats.size;
    } catch {}

    if (art.fileSpec) {
      await prisma.artworkFileSpec.update({
        where: { id: art.fileSpec.id },
        data: {
          fileSize,
          storagePath,
          previewWatermarkedPath: storagePath,
        },
      });
      console.log(`Updated ArtworkFileSpec for: ${art.title} (size: ${fileSize})`);
    } else {
      await prisma.artworkFileSpec.create({
        data: {
          artworkId: art.id,
          storagePath,
          storageKey: `artworks/dashape/${filename}`,
          mimeType: 'image/png',
          width: 3600,
          height: 3600,
          dpi: 300,
          colorSpace: 'sRGB',
          hasTransparency: true,
          isVector: false,
          previewWatermarkedPath: storagePath,
          fileSize,
        },
      });
      console.log(`Created ArtworkFileSpec for: ${art.title}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
