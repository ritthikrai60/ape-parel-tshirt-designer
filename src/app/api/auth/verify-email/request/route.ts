import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendEmailVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    let email: string | undefined = session?.user?.email || undefined;

    if (!email) {
      try {
        const body = await req.json();
        email = body.email;
      } catch {
        // Body was empty or invalid JSON
      }
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User with this email was not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'This email is already verified',
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Remove any previous token for this email and save new one
    await prisma.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: cleanEmail,
        token,
        expires,
      },
    });

    // Dispatch verification email
    await sendEmailVerificationEmail(cleanEmail, token);

    return NextResponse.json({
      success: true,
      message: 'Verification email has been sent successfully',
    });
  } catch (error: any) {
    console.error('[POST /api/auth/verify-email/request] Error:', error);
    return NextResponse.json({ error: 'Failed to send verification email', details: error.message }, { status: 500 });
  }
}
