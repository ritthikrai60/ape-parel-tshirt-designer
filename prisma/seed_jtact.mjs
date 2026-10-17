import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding JTACT DEV...');

  // 1. Ensure user
  let user = await prisma.user.findUnique({ where: { email: 'jtact@ape-parel.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'jtact@ape-parel.com',
        name: 'JTACT DEV',
        role: 'CREATOR',
      }
    });
    console.log('Created user:', user.id);
  }

  // 2. Creator profile
  let creator = await prisma.creatorProfile.findUnique({ where: { slug: 'jtact-dev' } });
  if (!creator) {
    creator = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        slug: 'jtact-dev',
        displayName: 'JTACT DEV',
        bio: 'Tactical Norse & Modern Military Streetwear Graphics. Specialized in high-threat apparel art.',
        avatarUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
        website: 'https://jtact.dev',
      }
    });
    console.log('Created creator profile:', creator.id);
  } else {
    creator = await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        avatarUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
        bio: 'Tactical Norse & Modern Military Streetwear Graphics. Specialized in high-threat apparel art.',
      }
    });
  }

  // 3. Financial account
  let finAcc = await prisma.financialAccount.findUnique({
    where: { accountNumber: 'ACC-CREATOR-jtact-dev' }
  });
  if (!finAcc) {
    finAcc = await prisma.financialAccount.create({
      data: {
        accountNumber: 'ACC-CREATOR-jtact-dev',
        accountType: 'CREATOR',
        currency: 'THB',
        creatorId: creator.id,
        balance: 0,
      }
    });
    console.log('Created financial account:', finAcc.id);
  }

  // 4. Storefront settings
  let sf = await prisma.creatorStorefrontSettings.findUnique({
    where: { creatorId: creator.id }
  });
  if (!sf) {
    sf = await prisma.creatorStorefrontSettings.create({
      data: {
        creatorId: creator.id,
        customSlug: 'jtact-dev',
        bio: creator.bio,
        bannerUrl: '/uploads/artworks/jtact_valkyrie_poster_black.jpg',
        avatarUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
        badgeVerified: true,
        themePreferences: JSON.stringify({ primaryColor: '#22c55e', accentColor: '#16a34a' }),
        socialLinks: JSON.stringify({ instagram: '@jtact_dev', website: 'https://jtact.dev' })
      }
    });
    console.log('Created storefront settings:', sf.id);
  } else {
    sf = await prisma.creatorStorefrontSettings.update({
      where: { id: sf.id },
      data: {
        bannerUrl: '/uploads/artworks/jtact_valkyrie_poster_black.jpg',
        avatarUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
        badgeVerified: true,
      }
    });
  }

  // 5. Artworks
  const artworksData = [
    {
      title: 'JTAC Dev Group - Viking NVG Badge (Dark)',
      description: 'Tactical operator insignia featuring skull with quad-tube NVG and dual axes. Premium dark military aesthetic.',
      previewUrl: '/uploads/artworks/jtact_viking_nvg_dark.png',
      tags: JSON.stringify(['tactical', 'military', 'viking', 'nvg', 'operator', 'jtac']),
      category: 'LOGO',
      price: 50,
      width: 1024,
      height: 1024,
      fileSize: 423328,
      mimeType: 'image/png'
    },
    {
      title: 'JTAC Dev Group - Viking NVG Badge (Line Art)',
      description: 'Clean high-contrast vector line art insignia of the JTAC Dev Group operator crest.',
      previewUrl: '/uploads/artworks/jtact_viking_nvg_light.png',
      tags: JSON.stringify(['tactical', 'minimal', 'line-art', 'operator', 'jtac']),
      category: 'LOGO',
      price: 40,
      width: 500,
      height: 500,
      fileSize: 278203,
      mimeType: 'image/png'
    },
    {
      title: 'Tactical Valkyrie - Modern Warfare Stance',
      description: 'Tactical operator valkyrie armed with suppressed PDW, tactical communications headset, and battle equipment.',
      previewUrl: '/uploads/artworks/jtact_tactical_valkyrie_full.png',
      tags: JSON.stringify(['valkyrie', 'tactical', 'operator', 'anime', 'gun', 'streetwear']),
      category: 'ILLUSTRATION',
      price: 65,
      width: 949,
      height: 1024,
      fileSize: 924541,
      mimeType: 'image/png'
    },
    {
      title: 'JTACT DEV - Tactical Valkyrie Banner & Poster',
      description: 'Full artwork poster featuring the iconic tactical valkyrie with bold typography and stencil accents.',
      previewUrl: '/uploads/artworks/jtact_valkyrie_poster_black.jpg',
      tags: JSON.stringify(['poster', 'banner', 'tactical', 'valkyrie', 'streetwear']),
      category: 'TYPOGRAPHY',
      price: 60,
      width: 1024,
      height: 1024,
      fileSize: 395511,
      mimeType: 'image/jpeg'
    },
    {
      title: 'Tactical Valkyrie - Camo Beach Readiness',
      description: 'Relaxed deployment theme: tactical valkyrie in camouflage gear with NVG helmet, suppressed rifle, and hydration.',
      previewUrl: '/uploads/artworks/jtact_valkyrie_camo_bikini.png',
      tags: JSON.stringify(['valkyrie', 'camo', 'tactical', 'streetwear', 'morale-patch']),
      category: 'ILLUSTRATION',
      price: 70,
      width: 949,
      height: 1024,
      fileSize: 923175,
      mimeType: 'image/png'
    }
  ];

  for (const art of artworksData) {
    const existing = await prisma.artwork.findFirst({
      where: { creatorId: creator.id, previewUrl: art.previewUrl }
    });
    if (!existing) {
      const created = await prisma.artwork.create({
        data: {
          creatorId: creator.id,
          title: art.title,
          description: art.description,
          previewUrl: art.previewUrl,
          originalUrl: art.previewUrl,
          category: art.category,
          mimeType: art.mimeType,
          tags: art.tags,
          status: 'PUBLISHED',
          moderationStatus: 'APPROVED',
          licenseOptions: {
            create: [
              {
                name: 'Standard Garment License',
                price: art.price,
                commercialUse: true,
                scope: 'PER_GARMENT',
                terms: 'Valid for 1 printed custom apparel unit.'
              },
              {
                name: 'Commercial Merch License',
                price: art.price * 2,
                commercialUse: true,
                scope: 'UNLIMITED',
                terms: 'Valid for multi-run production distribution.'
              }
            ]
          },
          fileSpec: {
            create: {
              storagePath: art.previewUrl.replace('/uploads/', 'public/uploads/'),
              storageKey: art.previewUrl.replace('/uploads/', ''),
              mimeType: art.mimeType,
              width: art.width,
              height: art.height,
              fileSize: art.fileSize,
              dpi: 300,
              hasTransparency: art.mimeType === 'image/png'
            }
          }
        }
      });
      console.log('Created artwork:', created.title);
    } else {
      console.log('Artwork already exists:', existing.title);
    }
  }

  console.log('Successfully completed seeding for JTACT DEV!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
