import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/audit';
import { sendSupplierApprovedEmail, sendSupplierRejectedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const adminId = session?.user?.id;

    if (!session?.user || role !== 'ADMIN' || !adminId) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, reason } = body || {};

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Action must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    if (action === 'REJECT' && (!reason || typeof reason !== 'string' || reason.trim().length < 5)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'A rejection reason of at least 5 characters is required' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Not Found', message: 'Supplier profile not found' }, { status: 404 });
    }

    const isApproved = action === 'APPROVE';
    const cleanReason = action === 'REJECT' ? reason.trim() : null;

    const updated = await prisma.supplierProfile.update({
      where: { id },
      data: {
        verified: isApproved,
        verificationStatus: isApproved ? 'APPROVED' : 'REJECTED',
        rejectionReason: cleanReason,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    });

    // Record Immutable Audit Event
    await recordAuditEvent({
      userId: adminId,
      actorId: adminId,
      action: isApproved ? 'SUPPLIER_VERIFICATION_APPROVED' : 'SUPPLIER_VERIFICATION_REJECTED',
      entityType: 'SupplierProfile',
      entityId: supplier.id,
      payload: {
        supplierId: supplier.id,
        companyName: supplier.companyName,
        action,
        reason: cleanReason,
      },
    });

    // Send notification email to supplier
    try {
      if (isApproved) {
        await sendSupplierApprovedEmail({
          companyName: supplier.companyName,
          contactEmail: supplier.contactEmail,
          slug: supplier.slug,
        });
      } else if (cleanReason) {
        await sendSupplierRejectedEmail(
          {
            companyName: supplier.companyName,
            contactEmail: supplier.contactEmail,
            slug: supplier.slug,
          },
          cleanReason
        );
      }
    } catch (emailErr) {
      console.warn('[SupplierReview] Notification email failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: isApproved
        ? `Supplier "${supplier.companyName}" successfully approved`
        : `Supplier "${supplier.companyName}" rejected with reason recorded`,
      supplier: updated,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/suppliers/verifications/[id]/review] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to process supplier review' },
      { status: 500 }
    );
  }
}
