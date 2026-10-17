import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { email } = body || {};
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true },
    });

    if (user && user.email) {
      // Generate secure 32-byte token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL

      // Clear previous reset tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: cleanEmail },
      });

      await prisma.passwordResetToken.create({
        data: {
          email: cleanEmail,
          token,
          expires,
        },
      });

      // Dispatch reset email
      await sendPasswordResetEmail(cleanEmail, token);
    }

    // Always respond with success to prevent user email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('[POST /api/auth/forgot-password] Error:', error);
    return NextResponse.json({ error: 'Failed to process password reset request', details: error.message }, { status: 500 });
  }
}
