import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { submitSupplierReview, getSupplierReviewsAndRating } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

const supplierReviewSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supplierId = params.id;
  try {
    const data = await getSupplierReviewsAndRating(supplierId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'กรุณาเข้าสู่ระบบก่อนส่งรีวิว' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = supplierReviewSchema.parse(body);

    const review = await submitSupplierReview({
      userId,
      orderId: parsed.orderId,
      rating: parsed.rating,
      comment: parsed.comment,
    });

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: 'ส่งรีวิวและให้คะแนนโรงงานผู้ผลิตเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นของคุณ',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[POST /api/suppliers/[id]/reviews] Error:', error);
    return NextResponse.json(
      { error: 'Bad Request', message: error.message },
      { status: 400 }
    );
  }
}
