import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Pillars A, B, and C initial data...');

  // 1. Seed Marketplace Banner if not exists
  const existingBanner = await prisma.marketplaceBanner.findFirst();
  if (!existingBanner) {
    await prisma.marketplaceBanner.create({
      data: {
        title: 'TOKYO STREETWEAR x BANGKOK GRAFFITI // 2026 DROP',
        subtitle: 'Authentic creator graphics licensed for 240 GSM heavyweight apparel. Direct creator royalties verified.',
        badgeText: 'SEASONAL HERO DROP',
        ctaText: 'Explore Collection',
        ctaLink: '/marketplace',
        bgColor: '#131718',
        textColor: '#FBF9F5',
        isActive: true,
        priority: 1,
      },
    });
    console.log('✓ Created default Hero Banner');
  }

  // 2. Seed Promo Codes
  const promoWelcome = await prisma.promoCode.findUnique({ where: { code: 'WELCOME50' } });
  if (!promoWelcome) {
    await prisma.promoCode.create({
      data: {
        code: 'WELCOME50',
        discountType: 'FIXED',
        discountValue: 50,
        minOrderAmount: 300,
        maxUses: 500,
        usedCount: 14,
        isActive: true,
        sponsoredBy: 'PLATFORM',
      },
    });
  }

  const promoStreet = await prisma.promoCode.findUnique({ where: { code: 'STREET15' } });
  if (!promoStreet) {
    await prisma.promoCode.create({
      data: {
        code: 'STREET15',
        discountType: 'PERCENT',
        discountValue: 15,
        minOrderAmount: 500,
        maxUses: 200,
        usedCount: 32,
        isActive: true,
        sponsoredBy: 'PLATFORM',
      },
    });
    console.log('✓ Created default Promo Codes');
  }

  // 3. Seed sample Payout Request for creator
  const creator = await prisma.creatorProfile.findFirst();
  if (creator) {
    const existingPayout = await prisma.payoutRequest.findFirst({
      where: { creatorId: creator.id },
    });

    if (!existingPayout) {
      await prisma.payoutRequest.create({
        data: {
          creatorId: creator.id,
          grossAmount: 1200,
          withholdingTaxRate: 0.03,
          withholdingTaxAmount: 36,
          netAmount: 1164,
          paymentMethod: 'PROMPTPAY',
          promptPayId: '081-999-8877',
          accountName: creator.displayName,
          status: 'PENDING',
          referenceNumber: `PO-${Date.now().toString().slice(-6)}`,
        },
      });
      console.log('✓ Created sample Payout Request');
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
