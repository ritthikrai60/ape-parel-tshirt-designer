import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
  phone: z.string().trim().regex(/^[0-9+() -]{8,20}$/, 'Invalid phone number format').optional().nullable(),
  shippingName: z.string().trim().max(100).optional().nullable(),
  shippingPhone: z.string().trim().regex(/^[0-9+() -]{8,20}$/, 'Invalid shipping phone number format').optional().nullable(),
  shippingAddress: z.string().trim().max(300).optional().nullable(),
  shippingCity: z.string().trim().max(100).optional().nullable(),
  shippingProvince: z.string().trim().max(100).optional().nullable(),
  shippingPostal: z.string().trim().regex(/^[0-9]{5}$/, 'Postal code must be 5 digits').optional().nullable(),
  shippingCountry: z.string().trim().max(10).optional().default('TH'),
  taxId: z.string().trim().regex(/^[0-9]{13}$/, 'Tax ID must be 13 digits').optional().nullable(),
  billingName: z.string().trim().max(150).optional().nullable(),
  billingAddress: z.string().trim().max(300).optional().nullable(),
});

/**
 * GET /api/user/profile
 * Retrieves authenticated user's profile and default shipping/billing info.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        phone: true,
        role: true,
        shippingName: true,
        shippingPhone: true,
        shippingAddress: true,
        shippingCity: true,
        shippingProvince: true,
        shippingPostal: true,
        shippingCountry: true,
        taxId: true,
        billingName: true,
        billingAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: user });
  } catch (error: any) {
    console.error('[GET /api/user/profile] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile', details: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Updates authenticated user's profile and default shipping/billing info.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parseResult = updateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation Error', issues: parseResult.error.format() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.shippingName !== undefined && { shippingName: data.shippingName || null }),
          ...(data.shippingPhone !== undefined && { shippingPhone: data.shippingPhone || null }),
          ...(data.shippingAddress !== undefined && { shippingAddress: data.shippingAddress || null }),
          ...(data.shippingCity !== undefined && { shippingCity: data.shippingCity || null }),
          ...(data.shippingProvince !== undefined && { shippingProvince: data.shippingProvince || null }),
          ...(data.shippingPostal !== undefined && { shippingPostal: data.shippingPostal || null }),
          ...(data.shippingCountry !== undefined && { shippingCountry: data.shippingCountry || 'TH' }),
          ...(data.taxId !== undefined && { taxId: data.taxId || null }),
          ...(data.billingName !== undefined && { billingName: data.billingName || null }),
          ...(data.billingAddress !== undefined && { billingAddress: data.billingAddress || null }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          shippingName: true,
          shippingPhone: true,
          shippingAddress: true,
          shippingCity: true,
          shippingProvince: true,
          shippingPostal: true,
          shippingCountry: true,
          taxId: true,
          billingName: true,
          billingAddress: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          action: 'USER_PROFILE_UPDATED',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          actorId: user.id,
          payload: JSON.stringify({
            updatedFields: Object.keys(data),
            shippingPostal: data.shippingPostal,
            hasShippingAddress: !!data.shippingAddress,
          }),
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedUser,
    });
  } catch (error: any) {
    console.error('[PUT /api/user/profile] Error:', error);
    return NextResponse.json({ error: 'Failed to update user profile', details: error.message }, { status: 500 });
  }
}
