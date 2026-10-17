import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNewsletterWelcomeEmail } from '@/lib/email';
import { auth } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  email: z.string().email('กรุณาระบุที่อยู่อีเมลที่ถูกต้อง'),
  source: z.string().optional().default('FOOTER'),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: 'กรุณาให้ความยินยอมรับข่าวสารตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
  }),
});

/**
 * POST /api/subscribers/newsletter
 * Public endpoint to subscribe to marketing newsletter
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const { email, source, consentGiven } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing && existing.status === 'ACTIVE') {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message: 'อีเมลนี้ได้ทำการสมัครรับข่าวสารเรียบร้อยแล้ว',
      });
    }

    let subscriber;
    if (existing) {
      subscriber = await prisma.newsletterSubscriber.update({
        where: { email: normalizedEmail },
        data: {
          status: 'ACTIVE',
          consentGiven: true,
          consentTimestamp: new Date(),
          source: source || existing.source,
        },
      });
    } else {
      subscriber = await prisma.newsletterSubscriber.create({
        data: {
          email: normalizedEmail,
          status: 'ACTIVE',
          source,
          consentGiven,
          consentTimestamp: new Date(),
        },
      });
    }

    // Send Welcome Email asynchronously
    sendNewsletterWelcomeEmail(subscriber.email, subscriber.unsubscribeToken).catch((err) => {
      console.warn('[Newsletter] Failed to dispatch welcome email:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'สมัครรับข่าวสารสำเร็จ! ระบบได้ส่งอีเมลต้อนรับไปยังกล่องข้อความของคุณแล้ว',
      subscriberId: subscriber.id,
    });
  } catch (err: any) {
    console.error('[POST /api/subscribers/newsletter] Error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครรับข่าวสาร', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscribers/newsletter
 * Admin endpoint to list all newsletter subscribers
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin)' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.trim().toLowerCase();

  try {
    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (search) {
      whereClause.email = { contains: search };
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const activeCount = await prisma.newsletterSubscriber.count({
      where: { status: 'ACTIVE' },
    });
    const unsubscribedCount = await prisma.newsletterSubscriber.count({
      where: { status: 'UNSUBSCRIBED' },
    });

    return NextResponse.json({
      subscribers,
      counts: {
        total: activeCount + unsubscribedCount,
        active: activeCount,
        unsubscribed: unsubscribedCount,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/subscribers/newsletter] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscribers/newsletter
 * Unsubscribe via token or email
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token && !email) {
    return NextResponse.json({ error: 'Token or email is required' }, { status: 400 });
  }

  try {
    const whereClause: any = token ? { unsubscribeToken: token } : { email };
    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: whereClause,
    });

    if (!subscriber) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้รับข่าวสาร' }, { status: 404 });
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED' },
    });

    return NextResponse.json({
      success: true,
      message: 'ยกเลิกการรับข่าวสารเรียบร้อยแล้ว',
    });
  } catch (err: any) {
    console.error('[DELETE /api/subscribers/newsletter] Error:', err);
    return NextResponse.json(
      { error: 'Failed to unsubscribe', details: err?.message },
      { status: 500 }
    );
  }
}
