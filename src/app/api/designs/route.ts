import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const designElementSchema = z.object({
  id: z.string(),
  artworkId: z.string().min(1),
  licenseOptionId: z.string().min(1),
  title: z.string(),
  previewUrl: z.string(),
  creatorName: z.string(),
  creatorId: z.string(),
  surface: z.enum(['FRONT', 'BACK', 'SIDE']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  zIndex: z.number(),
  price: z.number(),
});

const saveDesignSchema = z.object({
  title: z.string().optional().default('Custom Studio Tee'),
  garmentProductId: z.string().min(1, 'garmentProductId is required'),
  garmentVariantId: z.string().optional().nullable(),
  garmentColorHex: z.string().optional().default('#131718'),
  garmentSize: z.string().optional().default('L'),
  garmentFit: z.string().optional().default('oversized'),
  frontElements: z.array(designElementSchema).optional().default([]),
  backElements: z.array(designElementSchema).optional().default([]),
  sideElements: z.array(designElementSchema).optional().default([]),
  previewFrontUrl: z.string().optional().nullable(),
  previewBackUrl: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

/**
 * POST /api/designs
 * Saves a design document to the database. Associates with logged-in user if authenticated.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const parse = saveDesignSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Validation Error', issues: parse.error.format() },
        { status: 400 }
      );
    }

    const data = parse.data;
    let userId: string | null = data.userId ?? null;

    // Dynamically retrieve session if in Next.js server runtime
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // In standalone test environments, fallback to payload userId
    }

    const design = await prisma.designDocument.create({
      data: {
        userId,
        title: data.title,
        garmentProductId: data.garmentProductId,
        garmentVariantId: data.garmentVariantId ?? null,
        garmentColorHex: data.garmentColorHex,
        garmentSize: data.garmentSize,
        garmentFit: data.garmentFit,
        frontElements: JSON.stringify(data.frontElements),
        backElements: JSON.stringify(data.backElements),
        sideElements: JSON.stringify(data.sideElements),
        previewFrontUrl: data.previewFrontUrl ?? null,
        previewBackUrl: data.previewBackUrl ?? null,
        status: 'SAVED',
      },
    });

    return NextResponse.json({ success: true, design }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save design';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/designs
 * Retrieves saved designs for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // Fallback
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Sign in to access saved designs' }, { status: 401 });
    }

    const designs = await prisma.designDocument.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ success: true, designs }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve designs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
