import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!session?.user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const suppliers = await prisma.supplierProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        printingServices: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    const counts = {
      pending: suppliers.filter((s) => s.verificationStatus === 'PENDING').length,
      approved: suppliers.filter((s) => s.verificationStatus === 'APPROVED').length,
      rejected: suppliers.filter((s) => s.verificationStatus === 'REJECTED').length,
      total: suppliers.length,
    };

    return NextResponse.json({
      success: true,
      counts,
      suppliers,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/suppliers/verifications] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}
