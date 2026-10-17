import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const alertSubscriberSchema = z.object({
  email: z.string().email('กรุณาระบุอีเมลที่ถูกต้อง'),
  name: z.string().optional(),
  alertTypes: z.array(z.string()).min(1, 'ต้องเลือกการแจ้งเตือนอย่างน้อย 1 ประเภท'),
  isActive: z.boolean().optional().default(true),
});

/**
 * GET /api/subscribers/alerts
 * List all admin alert subscribers
 */
export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
  }

  try {
    const list = await prisma.adminAlertSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ subscribers: list });
  } catch (err: any) {
    console.error('[GET /api/subscribers/alerts] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch alert subscribers' }, { status: 500 });
  }
}

/**
 * POST /api/subscribers/alerts
 * Add or update an admin alert subscriber
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = alertSubscriberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const { email, name, alertTypes, isActive } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const record = await prisma.adminAlertSubscriber.upsert({
      where: { email: normalizedEmail },
      update: {
        name,
        alertTypes: JSON.stringify(alertTypes),
        isActive,
      },
      create: {
        email: normalizedEmail,
        name,
        alertTypes: JSON.stringify(alertTypes),
        isActive,
      },
    });

    return NextResponse.json({ success: true, subscriber: record });
  } catch (err: any) {
    console.error('[POST /api/subscribers/alerts] Error:', err);
    return NextResponse.json({ error: 'Failed to save alert subscriber' }, { status: 500 });
  }
}

/**
 * PATCH /api/subscribers/alerts
 * Toggle active status
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updated = await prisma.adminAlertSubscriber.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json({ success: true, subscriber: updated });
  } catch (err: any) {
    console.error('[PATCH /api/subscribers/alerts] Error:', err);
    return NextResponse.json({ error: 'Failed to update alert subscriber' }, { status: 500 });
  }
}

/**
 * DELETE /api/subscribers/alerts
 * Delete an alert subscriber
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    await prisma.adminAlertSubscriber.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    console.error('[DELETE /api/subscribers/alerts] Error:', err);
    return NextResponse.json({ error: 'Failed to delete alert subscriber' }, { status: 500 });
  }
}
