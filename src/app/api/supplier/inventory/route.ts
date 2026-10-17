import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  getSupplierInventoryMatrix,
  updateVariantStock,
  batchUpdateVariantStock,
  addColorwayToGarmentProduct,
  createGarmentProduct,
} from '@/lib/supplier';

export const dynamic = 'force-dynamic';

const updateSingleStockSchema = z.object({
  variantId: z.string().min(1),
  stock: z.number().int().min(0).max(1_000_000),
});

const updateBatchStockSchema = z.object({
  updates: z.array(
    z.object({
      variantId: z.string().min(1),
      stock: z.number().int().min(0).max(1_000_000),
    })
  ).min(1),
});

const addColorwaySchema = z.object({
  action: z.literal('ADD_COLORWAY'),
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  colorName: z.string().trim().min(1, 'Color name is required').max(50),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  initialStock: z.number().int().min(0).max(1_000_000).optional().default(0),
});

const createProductSchema = z.object({
  action: z.literal('CREATE_PRODUCT'),
  supplierId: z.string().min(1),
  name: z.string().trim().min(1, 'Product name is required').max(100),
  sku: z.string().trim().min(1, 'SKU is required').max(50),
  description: z.string().trim().optional(),
  fabric: z.string().trim().optional(),
  weightGsm: z.number().int().min(50).max(1000).optional(),
  fit: z.string().optional(),
  neckline: z.string().optional(),
  basePrice: z.number().int().min(0),
  packagingPrice: z.number().int().min(0).optional(),
  shippingPrice: z.number().int().min(0).optional(),
  availableSizes: z.array(z.string()).min(1, 'Select at least one size'),
  initialColorName: z.string().trim().min(1, 'Initial color name is required'),
  initialColorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  initialStock: z.number().int().min(0).max(1_000_000).optional().default(0),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const supplierQuery = searchParams.get('supplier') || 'bangkok-garment-craft';
  const productId = searchParams.get('productId') || undefined;

  try {
    const matrix = await getSupplierInventoryMatrix(supplierQuery, productId);
    return NextResponse.json({
      success: true,
      matrix,
    });
  } catch (error: any) {
    console.error('[GET /api/supplier/inventory] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to fetch inventory' },
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

  // Try batch update first
  const batchResult = updateBatchStockSchema.safeParse(body);
  if (batchResult.success) {
    try {
      const results = await batchUpdateVariantStock(batchResult.data.updates);
      return NextResponse.json({
        success: true,
        message: `Updated ${results.length} variants successfully`,
        updatedCount: results.length,
      });
    } catch (error: any) {
      const isNotFound = error?.code === 'P2025' || error?.message?.includes('Record to update not found');
      return NextResponse.json(
        { error: isNotFound ? 'Not Found' : 'Internal Server Error', message: error?.message || 'Failed to update variants' },
        { status: isNotFound ? 404 : 500 }
      );
    }
  }

  // Fall back to single variant update
  const singleResult = updateSingleStockSchema.safeParse(body);
  if (singleResult.success) {
    try {
      const updated = await updateVariantStock(
        singleResult.data.variantId,
        singleResult.data.stock
      );
      return NextResponse.json({
        success: true,
        message: 'Stock updated successfully',
        variant: updated,
      });
    } catch (error: any) {
      const isNotFound = error?.code === 'P2025' || error?.message?.includes('Record to update not found');
      return NextResponse.json(
        { error: isNotFound ? 'Not Found' : 'Internal Server Error', message: error?.message || 'Failed to update stock' },
        { status: isNotFound ? 404 : 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error: 'Validation Error',
      message: 'Payload must provide either { variantId, stock } or { updates: [{ variantId, stock }] }',
      issues: singleResult.error.format(),
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  const role = (session.user as any)?.role as string | undefined;
  if (role !== 'SUPPLIER' && role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Supplier or Admin role required' },
      { status: 403 }
    );
  }

  const userId = (session.user as any).id as string;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const action = body?.action;

  // Verify supplier ownership if not ADMIN
  if (role !== 'ADMIN') {
    const userSupplier = await prisma.supplierProfile.findUnique({
      where: { userId },
    });
    if (!userSupplier || userSupplier.id !== body?.supplierId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You cannot modify products for another supplier' },
        { status: 403 }
      );
    }
  }

  if (action === 'ADD_COLORWAY') {
    const parsed = addColorwaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    try {
      const result = await addColorwayToGarmentProduct(parsed.data);
      return NextResponse.json({
        success: true,
        message: `Colorway "${parsed.data.colorName}" added with ${result.createdVariants.length} size variants`,
        data: result,
      });
    } catch (error: any) {
      console.error('[POST /api/supplier/inventory - ADD_COLORWAY] Error:', error);
      return NextResponse.json(
        { error: 'Error', message: error?.message || 'Failed to add colorway' },
        { status: 400 }
      );
    }
  }

  if (action === 'CREATE_PRODUCT') {
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', issues: parsed.error.format() },
        { status: 400 }
      );
    }

    try {
      const result = await createGarmentProduct(parsed.data);
      return NextResponse.json({
        success: true,
        message: `Garment product "${result.product.name}" created with initial colorway and ${result.createdVariants.length} size variants`,
        data: result,
      });
    } catch (error: any) {
      console.error('[POST /api/supplier/inventory - CREATE_PRODUCT] Error:', error);
      return NextResponse.json(
        { error: 'Error', message: error?.message || 'Failed to create garment product' },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(
    {
      error: 'Bad Request',
      message: 'Invalid action. Must be ADD_COLORWAY or CREATE_PRODUCT',
    },
    { status: 400 }
  );
}
