import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  ShieldAlert,
  LayoutDashboard,
  CheckSquare,
  ShoppingBag,
  FileText,
  Home,
  LogOut,
  Sliders,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Backoffice Management & Moderation | ape-parel',
  description: 'Enterprise governance, artwork moderation queue, orders dispatch, and financial audit logs.',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin');
  }

  if (role !== 'ADMIN') {
    redirect('/403');
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Backoffice Industrial Top Command Bar */}
      <header className="sticky top-0 z-40 bg-ink text-paper border-b border-borderCol/40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Brand & Portal Badge */}
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="flex items-center space-x-2 text-paper hover:text-warm transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-warm/20 border border-warm/40 flex items-center justify-center text-warm">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="font-mono text-sm font-black uppercase tracking-widest">
                APE-PAREL // BACKOFFICE
              </span>
            </Link>
            <span className="hidden sm:inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-warm/20 text-warm border border-warm/40 font-bold">
              ADMIN_GOVERNANCE
            </span>
          </div>

          {/* Sub Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-3 text-xs font-mono">
            <Link
              href="/admin"
              className="px-2.5 py-1.5 rounded-md hover:bg-white/10 text-paper/80 hover:text-paper transition-colors flex items-center space-x-1"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            <Link
              href="/admin/moderation"
              className="px-2.5 py-1.5 rounded-md hover:bg-white/10 text-paper/80 hover:text-paper transition-colors flex items-center space-x-1"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Moderation</span>
            </Link>
            <Link
              href="/"
              className="px-2.5 py-1.5 rounded-md hover:bg-white/10 text-paper/60 hover:text-paper transition-colors flex items-center space-x-1"
              title="Return to Public Storefront"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Storefront</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Backoffice Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
