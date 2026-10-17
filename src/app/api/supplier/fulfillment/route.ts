import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  SUPPORTED_COURIERS,
  fulfillSupplierOrder,
  generatePackingSlipData,
  resolveSupplierProfile,
} from '@/lib/supplier';

export const dynamic = 'force-dynamic';

const fulfillOrderSchema = z.object({
  orderId: z.string().min(1),
  courier: z.string().min(1),
  trackingNumber: z.string().min(5).max(40),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const supplierQuery = searchParams.get('supplier') || 'bangkok-garment-craft';
  const orderId = searchParams.get('orderId');

  try {
    // If specific orderId requested, return its packing slip
    if (orderId) {
      const packingSlip = await generatePackingSlipData(orderId);
      return NextResponse.json({
        success: true,
        packingSlip,
      });
    }

    const supplier = await resolveSupplierProfile(supplierQuery);
    if (!supplier) {
      return NextResponse.json(
        { error: 'Not Found', message: `Supplier "${supplierQuery}" not found` },
        { status: 404 }
      );
    }

    // Fetch orders ready to pack or ready to ship
    const orders = await prisma.order.findMany({
      where: {
        supplierId: supplier.id,
        status: { in: ['QA_PASSED', 'READY_TO_PACK', 'SHIPPED', 'DELIVERED'] },
      },
      include: {
        design: {
          include: {
            garmentProduct: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      couriers: SUPPORTED_COURIERS,
      orders,
    });
  } catch (error: any) {
    console.error('[GET /api/supplier/fulfillment] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to fetch fulfillment data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const parsed = fulfillOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation Error', issues: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const updatedOrder = await fulfillSupplierOrder(parsed.data);
    const packingSlip = await generatePackingSlipData(updatedOrder.id);

    return NextResponse.json({
      success: true,
      message: `Order ${updatedOrder.orderNumber} successfully fulfilled and dispatched.`,
      order: updatedOrder,
      packingSlip,
    });
  } catch (error: any) {
    console.error('[POST /api/supplier/fulfillment] Error:', error);
    const msg = error?.message || 'Failed to fulfill order';
    const isNotFound = msg.toLowerCase().includes('not found');
    const isValidation =
      msg.includes('Tracking number') ||
      msg.includes('Unsupported courier') ||
      msg.includes('Cannot fulfill') ||
      msg.includes('empty');

    const status = isNotFound ? 404 : isValidation ? 400 : 500;
    const errorType = isNotFound ? 'Not Found' : isValidation ? 'Validation Error' : 'Internal Server Error';

    return NextResponse.json(
      { error: errorType, message: msg },
      { status }
    );
  }
}
