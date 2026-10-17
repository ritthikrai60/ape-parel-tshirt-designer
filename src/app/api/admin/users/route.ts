import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['CUSTOMER', 'CREATOR', 'SUPPLIER', 'ADMIN']),
});

/**
 * GET /api/admin/users
 * Returns list of users with their profiles.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q')?.toLowerCase() || '';

  try {
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        creatorProfile: {
          select: { id: true, slug: true, displayName: true },
        },
        supplierProfile: {
          select: { id: true, slug: true, companyName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[API /admin/users GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Admin role override for any user.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const callerRole = (session?.user as any)?.role as string | undefined;
  const adminId = (session?.user as any)?.id as string;

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (callerRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const rawBody = await req.json();
    const parsed = updateRoleSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: parsed.error.errors[0]?.message,
          issues: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousRole = existingUser.role;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Record Audit Event
    await recordAuditEvent({
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: userId,
      actorId: adminId,
      payload: {
        email: existingUser.email,
        name: existingUser.name,
        previousRole,
        newRole: role,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Role for ${existingUser.email} updated to ${role}`,
    });
  } catch (err: any) {
    console.error('[API /admin/users PATCH] Error:', err);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
