import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateProductionPackage } from '@/lib/production';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/production
 *
 * Exports complete manufacturing specification package (ProductionJobPackage)
 * as a downloadable JSON document with Content-Disposition attachment header.
 *
 * Access Rules:
 * - Must be authenticated.
 * - ADMIN: Full access.
 * - SUPPLIER: Only assigned orders that are paid/confirmed.
 * - CUSTOMER: Only their own order AND paymentStatus === 'PAID'.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json(
      {
        error: 'Bad Request',
        message: 'Order ID parameter is required.',
      },
      { status: 400 }
    );
  }

  // 1. Authentication Check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required to access production blueprints and print guides.',
      },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const userRole = (session.user as any).role || 'CUSTOMER';

  // 2. Query Order Metadata to Verify Permissions
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        supplier: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: `Order not found: ${id}`,
        },
        { status: 404 }
      );
    }

    // 3. Authorization & Payment Enforcement
    const isSupplier =
      userRole === 'SUPPLIER' &&
      (order.supplier.userId === userId || order.supplierId === userId);
    const isAdmin = userRole === 'ADMIN';
    const isCustomerOwner = order.customerId === userId;

    if (!isAdmin && !isSupplier && !isCustomerOwner) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have authorization to export this manufacturing print guide.',
        },
        { status: 403 }
      );
    }

    // Unpaid order gate: Customer and Supplier can only access after payment is confirmed
    const isPaid =
      order.paymentStatus === 'PAID' ||
      ['PAYMENT_CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'].includes(order.status);

    if (!isPaid && !isAdmin) {
      return NextResponse.json(
        {
          error: 'Payment Required',
          message:
            'Exporting factory print guides and ruler blueprints requires completed payment.',
        },
        { status: 403 }
      );
    }

    // 4. Generate Manufacturing Package
    const productionPackage = await generateProductionPackage(id);

    const filename = `JOB-${productionPackage.orderNumber}.json`;
    const jsonBody = JSON.stringify(productionPackage, null, 2);

    return new NextResponse(jsonBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown production package error occurred';

    console.error(`[GET /api/orders/${id}/production] Unhandled error:`, error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to generate production specification package.',
      },
      { status: 500 }
    );
  }
}
