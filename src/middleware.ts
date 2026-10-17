import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Route guard rules evaluated in order.
 * - roles: [] means "any authenticated user" (no role restriction beyond being logged in)
 * - roles: ['ADMIN'] means only users whose role === 'ADMIN' may pass
 */
const ROUTE_GUARDS: {
  pattern: RegExp;
  roles: string[];
  redirectIfWrongRole?: string;
}[] = [
  // ── ADMIN only ────────────────────────────────────────────────────────────
  { pattern: /^\/admin(\/.*)?$/, roles: ['ADMIN'] },

  // ── CREATOR or ADMIN ──────────────────────────────────────────────────────
  { pattern: /^\/creator\/dashboard(\/.*)?$/, roles: ['CREATOR', 'ADMIN'] },
  { pattern: /^\/creator\/upload(\/.*)?$/, roles: ['CREATOR', 'ADMIN'] },
  { pattern: /^\/creator\/journal(\/.*)?$/, roles: ['CREATOR', 'ADMIN'] },

  // ── SUPPLIER or ADMIN ─────────────────────────────────────────────────────
  { pattern: /^\/supplier\/dashboard(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/orders(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/jobs(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/inventory(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/catalog(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/pricing(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/finance(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },
  { pattern: /^\/supplier\/fulfillment(\/.*)?$/, roles: ['SUPPLIER', 'ADMIN'] },

  // ── Any authenticated user (login required, no role restriction) ──────────
  { pattern: /^\/creator\/onboarding(\/.*)?$/, roles: [] },
  { pattern: /^\/supplier\/onboarding(\/.*)?$/, roles: [] },
  { pattern: /^\/account(\/.*)?$/, roles: [] },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole = (session?.user as any)?.role as string | undefined;

  for (const guard of ROUTE_GUARDS) {
    if (!guard.pattern.test(pathname)) continue;

    // Not logged in → redirect to /login with callbackUrl
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged in but wrong role → 403
    if (guard.roles.length > 0 && (!userRole || !guard.roles.includes(userRole))) {
      return NextResponse.redirect(new URL('/403', req.url));
    }

    break; // guard matched and passed — stop checking
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/creator/:path*',
    '/supplier/:path*',
    '/account/:path*',
  ],
};
