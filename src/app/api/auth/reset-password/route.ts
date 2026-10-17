import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { token, newPassword } = body || {};

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    // Lookup token
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ error: 'Password reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: record.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      await tx.passwordResetToken.delete({
        where: { token },
      });

      await tx.auditEvent.create({
        data: {
          action: 'USER_PASSWORD_RESET',
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
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('[POST /api/auth/reset-password] Error:', error);
    return NextResponse.json({ error: 'Failed to reset password', details: error.message }, { status: 500 });
  }
}
