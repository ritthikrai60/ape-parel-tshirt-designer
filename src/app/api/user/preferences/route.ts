import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    if (!user || !user.preferences) {
      return NextResponse.json(null);
    }

    const parsed = JSON.parse(user.preferences);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[GET /api/user/preferences] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences payload' }, { status: 400 });
    }

    // Retrieve existing to merge
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    let current = {};
    if (existing?.preferences) {
      try {
        current = JSON.parse(existing.preferences);
      } catch {
        // use empty
      }
    }

    const merged = { ...current, ...body };
    const serialized = JSON.stringify(merged);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: serialized },
    });

    return NextResponse.json({ success: true, preferences: merged });
  } catch (err) {
    console.error('[PATCH /api/user/preferences] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
