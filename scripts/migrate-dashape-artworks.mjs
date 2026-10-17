import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding Dash Ape creator profile...');
  const creator = await prisma.creatorProfile.findFirst({
    where: { slug: 'dash-ape' },
    include: {
      artworks: {
        include: {
          licenseOptions: true,
          obligations: true,
          fileSpec: true,
        },
      },
      storefrontSettings: true,
    },
  });

  if (!creator) {
    throw new Error('Creator profile "dash-ape" not found!');
  }

  console.log(`Found creator: ${creator.displayName} (${creator.id})`);
  console.log(`Existing artworks count: ${creator.artworks.length}`);

  // 1. Update Avatar
  const avatarPath = '/uploads/avatars/dash_ape_avatar.png';
  await prisma.creatorProfile.update({
    where: { id: creator.id },
    data: { avatarUrl: avatarPath },
  });
  console.log(`Updated CreatorProfile avatarUrl to: ${avatarPath}`);

  if (creator.storefrontSettings) {
    await prisma.creatorStorefrontSettings.update({
      where: { creatorId: creator.id },
      data: { avatarUrl: avatarPath },
    });
    console.log(`Updated CreatorStorefrontSettings avatarUrl to: ${avatarPath}`);
  }

  // 2. Insert new artworks first so we have replacement IDs if needed
  const newArtworksData = [
    {
      title: 'Dash Ape Running (Black)',
      description: 'Dynamic sprinting Dash Ape mascot in solid bold black silhouette.',
      category: 'MASCOT',
      filename: 'APE RUNNING BLK.png',
      tags: 'mascot,dashape,running,black,streetwear,athletic',
      price: 40,
    },
    {
      title: 'Dash Ape Running (White)',
      description: 'Dynamic sprinting Dash Ape mascot in crisp white outline silhouette.',
      category: 'MASCOT',
      filename: 'APE RUNNING WHT.png',
      tags: 'mascot,dashape,running,white,streetwear,athletic',
      price: 40,
    },
    {
      title: 'Dash Ape DA Monogram',
      description: 'Interlocking DA monogram insignia representing Dash Ape Streetwear.',
      category: 'LOGO',
      filename: 'DASH APE DA.png',
      tags: 'logo,monogram,da,dashape,streetwear,minimal',
      price: 35,
    },
    {
      title: 'Dash Ape Signature Logo (Full Color)',
      description: 'Official full-color Dash Ape emblem with vibrant street branding.',
      category: 'LOGO',
      filename: 'DASH APE LOGO COLORED.png',
      tags: 'logo,dashape,full-color,signature,streetwear,badge',
      price: 50,
    },
    {
      title: 'Dash Ape Profile Icon (Black)',
      description: 'Side profile of the signature Dash Ape ape face in minimalist black line art.',
      category: 'MASCOT',
      filename: 'DASH APE SIDEFACE NO TEXT BLK.png',
      tags: 'mascot,dashape,sideface,profile,black,streetwear',
      price: 45,
    },
    {
      title: 'Dash Ape Profile Icon (White)',
      description: 'Side profile of the signature Dash Ape ape face in minimalist white line art.',
      category: 'MASCOT',
      filename: 'DASH APE SIDEFACE NO TEXT WHT.png',
      tags: 'mascot,dashape,sideface,profile,white,streetwear',
      price: 45,
    },
    {
      title: 'Dash Ape Profile with Typography (Black)',
      description: 'Side profile Dash Ape mascot with bold brand lettering in black ink.',
      category: 'MASCOT',
      filename: 'DASH APE SIDEFACE W TEXT BLK.png',
      tags: 'mascot,typography,dashape,black,streetwear,graphic',
      price: 50,
    },
    {
      title: 'Dash Ape Profile with Typography (White)',
      description: 'Side profile Dash Ape mascot with bold brand lettering in white ink.',
      category: 'MASCOT',
      filename: 'DASH APE SIDEFACE W TEXT WHT.png',
      tags: 'mascot,typography,dashape,white,streetwear,graphic',
      price: 50,
    },
  ];

  const createdArtworks = [];
  for (const item of newArtworksData) {
    const filePath = `/uploads/artworks/dashape/${item.filename}`;
    const created = await prisma.artwork.create({
      data: {
        creatorId: creator.id,
        title: item.title,
        description: item.description,
        category: item.category,
        previewUrl: filePath,
        originalUrl: filePath,
        mimeType: 'image/png',
        tags: item.tags,
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        licenseOptions: {
          create: [
            {
              name: 'Standard Apparel License (Per Garment)',
              price: item.price,
              commercialUse: true,
              scope: 'PER_GARMENT',
              terms: 'Direct to garment apparel print license with creator attribution.',
            },
            {
              name: 'Limited Commercial Run',
              price: item.price * 2,
              commercialUse: true,
              scope: 'PER_GARMENT',
              terms: 'Commercial production license for small batch releases up to 50 units.',
            },
          ],
        },
      },
      include: {
        licenseOptions: true,
      },
    });
    console.log(`Created new artwork: "${created.title}" (ID: ${created.id})`);
    createdArtworks.push(created);
  }

  // 3. Handle old artworks & obligations
  const fallbackArtwork = createdArtworks[0];
  const fallbackLicense = fallbackArtwork.licenseOptions[0];

  for (const oldArt of creator.artworks) {
    console.log(`Processing old artwork: "${oldArt.title}" (${oldArt.id})`);

    // If there are obligations referencing this old artwork, point them to the new artwork to avoid foreign key errors
    if (oldArt.obligations && oldArt.obligations.length > 0) {
      console.log(`Re-linking ${oldArt.obligations.length} obligations from old artwork to "${fallbackArtwork.title}"...`);
      for (const ob of oldArt.obligations) {
        await prisma.royaltyObligation.update({
          where: { id: ob.id },
          data: {
            artworkId: fallbackArtwork.id,
            licenseOptionId: fallbackLicense.id,
          },
        });
      }
    }

    // Delete fileSpec if present
    if (oldArt.fileSpec) {
      await prisma.artworkFileSpec.delete({
        where: { id: oldArt.fileSpec.id },
      });
    }

    // Delete license options
    await prisma.licenseOption.deleteMany({
      where: { artworkId: oldArt.id },
    });

    // Delete the artwork itself
    await prisma.artwork.delete({
      where: { id: oldArt.id },
    });
    console.log(`Deleted old artwork: "${oldArt.title}" (${oldArt.id})`);
  }

  // Update featured artwork IDs in storefront settings if present
  if (creator.storefrontSettings) {
    const featuredIds = createdArtworks.slice(0, 4).map((a) => a.id);
    await prisma.creatorStorefrontSettings.update({
      where: { creatorId: creator.id },
      data: {
        featuredArtworkIds: JSON.stringify(featuredIds),
      },
    });
    console.log(`Updated featuredArtworkIds: ${JSON.stringify(featuredIds)}`);
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
