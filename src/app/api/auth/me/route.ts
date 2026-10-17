import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserRoleProfiles } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const roleProfiles = await getUserRoleProfiles(session.user.id);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          ...roleProfiles,
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role || roleProfiles?.role,
          activeRole: session.user.role || roleProfiles?.role,
          baseRole: roleProfiles?.role,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/auth/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message || 'Failed to retrieve user status' },
      { status: 500 }
    );
  }
}
