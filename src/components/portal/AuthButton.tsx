'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="animate-pulse w-20 h-8 bg-paper-dark rounded" />;
  }

  if (session && session.user) {
    const isCreator = session.user.role === 'CREATOR' || session.user.role === 'ADMIN';

    return (
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Link
          href="/account/journal"
          className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold hover:bg-paper-dark rounded transition-colors"
        >
          My Journal
        </Link>
        {isCreator ? (
          <Link
            href="/creator/dashboard"
            className="hidden sm:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-warm text-ink font-bold hover:bg-warm-dark rounded transition-colors shadow-sm"
          >
            Creator Studio
          </Link>
        ) : (
          <Link
            href="/creator/onboarding"
            className="hidden sm:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-warm text-warm font-bold hover:bg-warm hover:text-ink rounded transition-colors shadow-sm"
          >
            Become a Creator
          </Link>
        )}
        <button
          onClick={() => signOut()}
          className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark rounded transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold border border-ink hover:bg-ink hover:text-paper rounded transition-colors"
    >
      Sign In
    </button>
  );
}
