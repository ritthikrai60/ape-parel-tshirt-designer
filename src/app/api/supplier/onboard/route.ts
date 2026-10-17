import { NextRequest, NextResponse } from 'next/server';
import { onboardSupplier } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let sessionUserId: string | undefined;
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      sessionUserId = session?.user?.id;
    } catch {
      // In headless test environments
    }

    // If an authenticated session is present, ensure identity cannot be forged
    if (sessionUserId && body?.userId && body.userId !== sessionUserId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You cannot create a supplier profile on behalf of another user.' },
        { status: 403 }
      );
    }

    // Authoritative identity: session user takes absolute precedence; allow body fallback only in test environment
    const isTest = process.env.NODE_ENV === 'test';
    const userId = sessionUserId || (isTest ? body?.userId : undefined);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to set up a Supplier profile.' },
        { status: 401 }
      );
    }

    const {
      companyName,
      slug,
      description,
      location,
      contactEmail,
      contactPhone,
      taxId,
      dbdDocUrl,
      vatDocUrl,
      bankBookDocUrl,
      machineryPhotos,
      leadTimeDays,
      minOrderQuantity,
    } = body || {};

    const supplier = await onboardSupplier({
      userId,
      companyName,
      slug,
      description,
      location,
      contactEmail,
      contactPhone,
      taxId,
      dbdDocUrl,
      vatDocUrl,
      bankBookDocUrl,
      machineryPhotos: typeof machineryPhotos === 'string' ? machineryPhotos : Array.isArray(machineryPhotos) ? JSON.stringify(machineryPhotos) : undefined,
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      minOrderQuantity: minOrderQuantity ? Number(minOrderQuantity) : undefined,
    });

    // Send acknowledgment email in background
    try {
      const { sendSupplierApplicationReceivedEmail } = await import('@/lib/email');
      await sendSupplierApplicationReceivedEmail({
        companyName: supplier.companyName,
        contactEmail: supplier.contactEmail,
      });
    } catch (emailErr) {
      console.warn('[SupplierOnboard] Email acknowledgment failed:', emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Supplier profile submitted successfully and is pending verification',
        supplier,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const message = error?.message || 'Failed to complete supplier onboarding';
    const isConflict =
      message.includes('already taken') ||
      message.includes('already has an active Supplier profile') ||
      error?.code === 'P2002';

    return NextResponse.json(
      {
        error: isConflict ? 'Conflict' : 'Bad Request',
        message,
      },
      { status: isConflict ? 409 : 400 }
    );
  }
}
