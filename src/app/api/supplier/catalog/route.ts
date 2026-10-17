import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  resolveSupplierProfile,
  updateSupplierPricing,
  calculateTransparentCostBreakdown,
} from '@/lib/supplier';

export const dynamic = 'force-dynamic';

const updatePricingSchema = z.object({
  supplierId: z.string().min(1),
  garmentProductId: z.string().min(1),
  basePrice: z.number().int().min(0).optional(),
  packagingPrice: z.number().int().min(0).optional(),
  shippingPrice: z.number().int().min(0).optional(),
  printingServiceId: z.string().optional(),
  pricePerSurface: z.number().int().min(0).optional(),
  supportedSurfaces: z.enum(['FRONT', 'BACK', 'BOTH']).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const supplierQuery = searchParams.get('supplier') || 'bangkok-garment-craft';

  try {
    const supplier = await resolveSupplierProfile(supplierQuery);
    if (!supplier) {
      return NextResponse.json(
        { error: 'Not Found', message: `Supplier "${supplierQuery}" not found` },
        { status: 404 }
      );
    }

    const defaultProduct = supplier.products[0];
    const defaultDtg =
      supplier.printingServices.find((s) => s.code === 'DTG') ||
      supplier.printingServices[0];

    const breakdown = defaultProduct
      ? calculateTransparentCostBreakdown({
          basePrice: defaultProduct.basePrice,
          printPricePerSurface: defaultDtg?.pricePerSurface ?? 80,
          surfacesCount: 1,
          packagingPrice: defaultProduct.packagingPrice,
          shippingPrice: defaultProduct.shippingPrice,
          quantity: 1,
        })
      : null;

    return NextResponse.json({
      success: true,
      supplier: {
        id: supplier.id,
        slug: supplier.slug,
        companyName: supplier.companyName,
        location: supplier.location,
        leadTimeDays: supplier.leadTimeDays,
      },
      products: supplier.products,
      printingServices: supplier.printingServices,
      transparentBreakdown: breakdown,
    });
  } catch (error: unknown) {
    console.error('[GET /api/supplier/catalog] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const parsed = updatePricingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation Error', issues: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await updateSupplierPricing(parsed.data);
    return NextResponse.json({
      success: true,
      message: 'Pricing updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('[PATCH /api/supplier/catalog] Error:', error);
    const isNotFound =
      error?.name === 'NotFoundError' ||
      error?.code === 'P2025' ||
      error?.message?.toLowerCase().includes('not found');

    return NextResponse.json(
      { error: isNotFound ? 'Not Found' : 'Internal Server Error', message: error?.message || 'Failed to update pricing' },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
