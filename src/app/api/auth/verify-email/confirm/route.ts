import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  return handleConfirmation(token);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;
    return handleConfirmation(token);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

async function handleConfirmation(token: string | null) {
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) {
    return NextResponse.json(
      { error: 'Invalid or expired verification token. Please request a new one.' },
      { status: 400 }
    );
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json(
      { error: 'Verification token has expired. Please request a new one.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
  });

  if (!user) {
    return NextResponse.json({ error: 'Associated user not found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await tx.verificationToken.delete({
      where: { token },
    });

    await tx.auditEvent.create({
      data: {
        action: 'USER_EMAIL_VERIFIED',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        actorId: user.id,
        payload: JSON.stringify({ email: user.email }),
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: 'Email address has been successfully verified',
    email: user.email,
  });
}
