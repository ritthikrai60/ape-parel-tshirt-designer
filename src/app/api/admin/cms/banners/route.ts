import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const bannerSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  subtitle: z.string().max(250).optional(),
  badgeText: z.string().max(50).optional(),
  ctaText: z.string().default('Explore Collection'),
  ctaLink: z.string().default('/marketplace'),
  imageUrl: z.string().optional(),
  bgColor: z.string().default('#131718'),
  textColor: z.string().default('#FBF9F5'),
  isActive: z.boolean().default(true),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  priority: z.number().int().default(1),
});

/**
 * GET /api/admin/cms/banners
 * Lists all banners.
 */
export async function GET() {
  try {
    const banners = await prisma.marketplaceBanner.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ banners });
  } catch (err: any) {
    console.error('[API /admin/cms/banners GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch banners', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cms/banners
 * Creates a new hero campaign banner.
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
    const parseResult = bannerSchema.safeParse(body);
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

    const banner = await prisma.marketplaceBanner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle || null,
        badgeText: data.badgeText || null,
        ctaText: data.ctaText,
        ctaLink: data.ctaLink,
        imageUrl: data.imageUrl || null,
        bgColor: data.bgColor,
        textColor: data.textColor,
        isActive: data.isActive,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        priority: data.priority,
      },
    });

    await recordAuditEvent({
      action: 'CMS_BANNER_CREATED',
      entityType: 'MarketplaceBanner',
      entityId: banner.id,
      actorId: adminId,
      payload: { title: banner.title, isActive: banner.isActive },
    });

    return NextResponse.json({
      success: true,
      message: 'Marketplace banner created successfully',
      banner,
    });
  } catch (err: any) {
    console.error('[API /admin/cms/banners POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create banner', details: err?.message },
      { status: 500 }
    );
  }
}
