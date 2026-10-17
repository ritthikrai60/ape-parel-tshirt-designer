import { NextRequest, NextResponse } from 'next/server';
import { POST as financePost } from '../route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return financePost(request);
}
