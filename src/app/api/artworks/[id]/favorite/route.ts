import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { toggleArtworkFavorite } from '@/lib/vault';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'กรุณาเข้าสู่ระบบก่อนบันทึกลายลงใน Wishlist' },
      { status: 401 }
    );
  }

  const artworkId = params.id;
  if (!artworkId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Artwork ID is required' },
      { status: 400 }
    );
  }

  try {
    const result = await toggleArtworkFavorite(userId, artworkId);
    return NextResponse.json(
      {
        success: true,
        isFavorited: result.isFavorited,
        message: result.isFavorited
          ? 'บันทึกลงใน Wishlist เรียบร้อยแล้ว'
          : 'นำออกจาก Wishlist เรียบร้อยแล้ว',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[POST /api/artworks/[id]/favorite] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
