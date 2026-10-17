import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { submitArtworkReview, getArtworkReviewsAndRating } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  orderId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const artworkId = params.id;
  try {
    const data = await getArtworkReviewsAndRating(artworkId);
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

  const artworkId = params.id;
  try {
    const body = await request.json();
    const parsed = reviewSchema.parse(body);

    const review = await submitArtworkReview({
      userId,
      artworkId,
      rating: parsed.rating,
      comment: parsed.comment,
      orderId: parsed.orderId,
    });

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: 'ส่งรีวิวและให้คะแนนผลงานเรียบร้อยแล้ว',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[POST /api/artworks/[id]/reviews] Error:', error);
    return NextResponse.json(
      { error: 'Bad Request', message: error.message },
      { status: 400 }
    );
  }
}
