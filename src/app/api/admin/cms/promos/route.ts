import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const promoSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, and dashes'),
  discountType: z.enum(['FIXED', 'PERCENT']).default('FIXED'),
  discountValue: z.number().int().positive('Discount value must be positive'),
  minOrderAmount: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().default(100),
  isActive: z.boolean().default(true),
  sponsoredBy: z.enum(['PLATFORM', 'CREATOR_COSHARE']).default('PLATFORM'),
  expiresAt: z.string().optional().nullable(),
});

/**
 * GET /api/admin/cms/promos
 * Lists all promo codes.
 */
export async function GET() {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ promos });
  } catch (err: any) {
    console.error('[API /admin/cms/promos GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch promo codes', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cms/promos
 * Creates a new promotional coupon code.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const adminId = (session?.user as any)?.id as string;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parseResult = promoSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: parseResult.error.errors[0]?.message,
          issues: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const cleanCode = data.code.toUpperCase().trim();

    const existing = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Promo code "${cleanCode}" already exists` },
        { status: 400 }
      );
    }

    const promo = await prisma.promoCode.create({
      data: {
        code: cleanCode,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount,
        maxUses: data.maxUses,
        isActive: data.isActive,
        sponsoredBy: data.sponsoredBy,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    await recordAuditEvent({
      action: 'PROMO_CODE_CREATED',
      entityType: 'PromoCode',
      entityId: promo.id,
      actorId: adminId,
      payload: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Promo code ${promo.code} created successfully`,
      promo,
    });
  } catch (err: any) {
    console.error('[API /admin/cms/promos POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create promo code', details: err?.message },
      { status: 500 }
    );
  }
}
