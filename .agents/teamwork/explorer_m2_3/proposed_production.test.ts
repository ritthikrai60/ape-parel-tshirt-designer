import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { generateProductionPackage } from '@/lib/production';

describe('Production Specification Package Generator (src/lib/production.ts)', () => {
  let benchmarkOrder: { id: string; orderNumber: string };

  beforeAll(async () => {
    // Look up pre-seeded benchmark order APX-ORD-9021
    const order = await prisma.order.findUnique({
      where: { orderNumber: 'APX-ORD-9021' },
      include: {
        design: true,
        supplier: true,
      },
    });

    if (!order) {
      throw new Error(
        'Seed data missing: Order APX-ORD-9021 not found. Run "npm run db:seed" first.'
      );
    }

    benchmarkOrder = order;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Benchmark Production Package Generation', () => {
    it('generates complete supplier production package for APX-ORD-9021 by orderNumber', async () => {
      const pkg = await generateProductionPackage('APX-ORD-9021');

      // Job and Order Identifiers
      expect(pkg.jobId).toBe('JOB-APX-ORD-9021');
      expect(pkg.orderId).toBe(benchmarkOrder.id);
      expect(pkg.orderNumber).toBe('APX-ORD-9021');
      expect(pkg.status).toBe('PAYMENT_CONFIRMED');

      // Supplier Details
      expect(pkg.supplier.companyName).toBe('Bangkok Garment Craft Co., Ltd.');
      expect(pkg.supplier.slug).toBe('bangkok-garment-craft');
      expect(pkg.supplier.location).toBe('Phra Khanong, Bangkok, Thailand');
      expect(pkg.supplier.leadTimeDays).toBe(4);

      // Garment Blank & Variant Details
      expect(pkg.garment.blankSku).toBe('APX-HVY-001');
      expect(pkg.garment.productName).toBe('Apex Heavyweight Oversized Tee');
      expect(pkg.garment.variantSku).toBe('APX-HVY-001-BLK-L');
      expect(pkg.garment.colorName).toBe('Ink Black');
      expect(pkg.garment.colorHex).toBe('#131718');
      expect(pkg.garment.size).toBe('L');
      expect(pkg.garment.fit).toBe('oversized');
      expect(pkg.garment.fabric).toContain('Combed Cotton');
      expect(pkg.garment.weightGsm).toBe(240);
      expect(pkg.garment.quantity).toBe(1);

      // Printing Technique
      expect(pkg.printingTechnique.code).toBe('DTG');
      expect(pkg.printingTechnique.maxPrintWidthCm).toBe(35.0);
      expect(pkg.printingTechnique.maxPrintHeightCm).toBe(45.0);

      // Surfaces Configuration (FRONT and SIDE)
      expect(pkg.surfaces).toHaveLength(2);
      expect(pkg.summary.surfacesCount).toBe(2);
      expect(pkg.summary.printedSurfaces).toEqual(['FRONT', 'SIDE']);
      expect(pkg.summary.totalArtworksCount).toBe(3);

      // FRONT Surface Layer Verification
      const frontSurface = pkg.surfaces.find((s) => s.surface === 'FRONT');
      expect(frontSurface).toBeDefined();
      expect(frontSurface!.printableAreaCm).toEqual({ width: 35.0, height: 45.0 });
      expect(frontSurface!.artworks).toHaveLength(2);

      // Element 1: Dash Ape Classic (x: 50%, y: 35%, w: 32%, h: 32%)
      const el1 = frontSurface!.artworks[0];
      expect(el1.title).toContain('Dash Ape Classic');
      expect(el1.creatorName).toBe('Dash Ape Studio');
      expect(el1.highResAssetUrl).toBeDefined();
      expect(el1.placement.calculatedWidthCm).toBe(11.20); // 32% of 35.0 cm
      expect(el1.placement.calculatedHeightCm).toBe(14.40); // 32% of 45.0 cm
      expect(el1.placement.xCenterCm).toBe(17.50); // 50% of 35.0 cm
      expect(el1.placement.yCenterCm).toBe(15.75); // 35% of 45.0 cm
      expect(el1.placement.xLeftCm).toBe(11.90); // 17.50 - 5.60
      expect(el1.placement.yTopCm).toBe(8.55); // 15.75 - 7.20
      expect(el1.placement.rotationDeg).toBe(0);
      expect(el1.placement.zIndex).toBe(1);

      // Element 2: Cyber Primate (x: 50%, y: 62%, w: 28%, h: 28%)
      const el2 = frontSurface!.artworks[1];
      expect(el2.title).toContain('Cyber Primate');
      expect(el2.placement.calculatedWidthCm).toBe(9.80); // 28% of 35.0 cm
      expect(el2.placement.calculatedHeightCm).toBe(12.60); // 28% of 45.0 cm
      expect(el2.placement.xCenterCm).toBe(17.50); // 50% of 35.0 cm
      expect(el2.placement.yCenterCm).toBe(27.90); // 62% of 45.0 cm
      expect(el2.placement.xLeftCm).toBe(12.60); // 17.50 - 4.90
      expect(el2.placement.yTopCm).toBe(21.60); // 27.90 - 6.30

      // SIDE Surface Layer Verification (Static Glitch)
      const sideSurface = pkg.surfaces.find((s) => s.surface === 'SIDE');
      expect(sideSurface).toBeDefined();
      expect(sideSurface!.artworks).toHaveLength(1);
      const elSide = sideSurface!.artworks[0];
      expect(elSide.title).toContain('Static Glitch');
      expect(elSide.placement.calculatedWidthCm).toBe(7.70); // 22% of 35.0 cm
      expect(elSide.placement.calculatedHeightCm).toBe(9.90); // 22% of 45.0 cm
      expect(elSide.placement.xCenterCm).toBe(17.50); // 50% of 35.0 cm
      expect(elSide.placement.yCenterCm).toBe(18.00); // 40% of 45.0 cm
      expect(elSide.placement.xLeftCm).toBe(13.65); // 17.50 - 3.85
      expect(elSide.placement.yTopCm).toBe(13.05); // 18.00 - 4.95

      // Shipping & Recipient Information
      expect(pkg.shipping.name).toBe('Streetwear Collector');
      expect(pkg.shipping.city).toBe('Bangkok');
      expect(pkg.shipping.postalCode).toBe('10110');
      expect(pkg.shipping.address).toBe('88 Thonglor Soi 10, Sukhumvit 55');
    });

    it('generates identical production package when querying by internal cuid id', async () => {
      const pkgById = await generateProductionPackage(benchmarkOrder.id);
      expect(pkgById.jobId).toBe('JOB-APX-ORD-9021');
      expect(pkgById.orderNumber).toBe('APX-ORD-9021');
      expect(pkgById.garment.blankSku).toBe('APX-HVY-001');
    });
  });

  describe('2. Error Handling & Edge Cases', () => {
    it('throws error when orderId is empty or whitespace', async () => {
      await expect(generateProductionPackage('')).rejects.toThrow(/order id is required/i);
      await expect(generateProductionPackage('   ')).rejects.toThrow(/order id is required/i);
    });

    it('throws error when order does not exist in database', async () => {
      await expect(generateProductionPackage('non-existent-order-999')).rejects.toThrow(
        /order not found/i
      );
    });
  });
});
