import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  addColorwayToGarmentProduct,
  createGarmentProduct,
  getSupplierInventoryMatrix,
  STANDARD_GARMENT_PALETTE,
} from '@/lib/supplier';

describe('Supplier Blank Garment & Colorway Matrix Operations', () => {
  let supplier: any;
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    supplier = await prisma.supplierProfile.findFirst({
      where: { slug: 'bangkok-garment-craft' },
      include: { products: { include: { variants: true } } },
    });
    if (!supplier) {
      throw new Error('Test supplier "bangkok-garment-craft" missing');
    }
  });

  afterAll(async () => {
    // Clean up created products and variants
    for (const pid of createdProductIds) {
      try {
        await prisma.garmentVariant.deleteMany({ where: { productId: pid } });
        await prisma.garmentProduct.delete({ where: { id: pid } });
      } catch (e) {
        // ignore cleanup error
      }
    }
  });

  it('exposes standard garment color palette presets', () => {
    expect(STANDARD_GARMENT_PALETTE).toBeDefined();
    expect(STANDARD_GARMENT_PALETTE.length).toBeGreaterThan(5);
    expect(STANDARD_GARMENT_PALETTE.some((c) => c.name === 'Pitch Black')).toBe(true);
    expect(STANDARD_GARMENT_PALETTE.some((c) => c.name === 'Optical White')).toBe(true);
  });

  it('successfully adds a new colorway and auto-generates size variants', async () => {
    const testSku = `TEST-PROD-${Date.now().toString().slice(-5)}`;
    const productResult = await createGarmentProduct({
      supplierId: supplier.id,
      name: 'Test Heavyweight T-Shirt',
      sku: testSku,
      fabric: '100% Organic Cotton',
      weightGsm: 250,
      fit: 'boxy',
      neckline: 'crew',
      basePrice: 180,
      packagingPrice: 15,
      shippingPrice: 40,
      availableSizes: ['S', 'M', 'L', 'XL'],
      initialColorName: 'Pitch Black',
      initialColorHex: '#131718',
      initialStock: 100,
    });

    createdProductIds.push(productResult.product.id);

    expect(productResult.product.id).toBeDefined();
    expect(productResult.createdVariants).toHaveLength(4);
    expect(productResult.createdVariants.every((v) => v.stock === 100)).toBe(true);

    // Now add a second colorway to this product
    const colorResult = await addColorwayToGarmentProduct({
      supplierId: supplier.id,
      productId: productResult.product.id,
      colorName: 'Vintage Sand',
      colorHex: '#DED6C9',
      initialStock: 50,
    });

    expect(colorResult.colorName).toBe('Vintage Sand');
    expect(colorResult.colorHex).toBe('#DED6C9');
    expect(colorResult.createdVariants).toHaveLength(4); // All 4 sizes generated
    expect(colorResult.createdVariants.every((v) => v.stock === 50)).toBe(true);

    // Verify matrix reflects both colorways
    const matrix = await getSupplierInventoryMatrix(supplier.slug, productResult.product.id);
    expect(matrix.colorRows).toHaveLength(2);
    expect(matrix.totalVariants).toBe(8);
    expect(matrix.totalUnitsInStock).toBe(100 * 4 + 50 * 4); // 400 + 200 = 600
  });

  it('rejects adding duplicate colorway for the same product', async () => {
    const testSku = `TEST-DUP-${Date.now().toString().slice(-5)}`;
    const productResult = await createGarmentProduct({
      supplierId: supplier.id,
      name: 'Duplicate Test Tee',
      sku: testSku,
      basePrice: 150,
      availableSizes: ['M', 'L'],
      initialColorName: 'Forest Green',
      initialColorHex: '#213326',
      initialStock: 20,
    });

    createdProductIds.push(productResult.product.id);

    await expect(
      addColorwayToGarmentProduct({
        supplierId: supplier.id,
        productId: productResult.product.id,
        colorName: 'Forest Green',
        colorHex: '#213326',
        initialStock: 30,
      })
    ).rejects.toThrow(/already exists/i);
  });
});
