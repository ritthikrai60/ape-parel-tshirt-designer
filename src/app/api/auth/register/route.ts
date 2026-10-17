import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { registerUser } from '@/lib/authUtils';
import { prisma } from '@/lib/prisma';
import { sendEmailVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, confirmPassword, role, phone } = body || {};

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Full name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Full name cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Password cannot exceed 128 characters' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Password confirmation does not match password' },
        { status: 400 }
      );
    }

    const validRoles = ['CUSTOMER', 'CREATOR', 'SUPPLIER'];
    const selectedRole = role && validRoles.includes(role) ? role : 'CUSTOMER';

    const user = await registerUser({
      email,
      name,
      password,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      role: selectedRole,
    });

    // Auto-dispatch verification email for seamless onboarding
    try {
      const cleanEmail = email.trim().toLowerCase();
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: cleanEmail,
          token,
          expires,
        },
      });

      await sendEmailVerificationEmail(cleanEmail, token);
    } catch (emailErr) {
      console.warn('[Register] Non-blocking email verification dispatch warning:', emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const message = error?.message || 'Failed to register account';
    const isConflict = message.includes('already exists') || error?.code === 'P2002';

    return NextResponse.json(
      {
        error: isConflict ? 'Conflict' : 'Bad Request',
        message: isConflict ? 'An account with this email address already exists' : message,
      },
      { status: isConflict ? 409 : 400 }
    );
  }
}
