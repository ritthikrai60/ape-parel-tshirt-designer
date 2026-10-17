import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserVaultData } from '@/lib/vault';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'User authentication required.' },
      { status: 401 }
    );
  }

  try {
    const data = await getUserVaultData(userId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/user/vault] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
