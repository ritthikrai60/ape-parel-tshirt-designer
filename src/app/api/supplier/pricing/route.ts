import { NextRequest, NextResponse } from 'next/server';
import { GET as catalogGet, PATCH as catalogPatch } from '../catalog/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return catalogGet(request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return catalogPatch(request);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return catalogPatch(request);
}
