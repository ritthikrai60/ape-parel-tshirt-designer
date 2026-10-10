import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ape-parel | Creator-Powered Apparel Studio & Marketplace',
  description:
    'Creator-powered apparel design and production marketplace connecting Designers, Customers, and Suppliers with interactive 2D/3D customizer, server-authoritative pricing, and auditable royalty tracking.',
  keywords: [
    'ape-parel',
    'streetwear',
    'apparel design',
    '3d t-shirt customizer',
    'creator royalties',
    'dtg printing',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-paper text-ink">
      <body className="min-h-full flex flex-col font-sans antialiased bg-paper text-ink selection:bg-warm selection:text-ink">
        {/* Global Brand Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b border-borderCol bg-paper/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Tag */}
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="group flex items-center space-x-2 text-ink transition-colors hover:text-warm-dark"
              >
                <span className="font-mono text-lg font-black tracking-tighter uppercase px-2 py-0.5 bg-ink text-paper rounded group-hover:bg-warm group-hover:text-ink transition-colors">
                  APE
                </span>
                <span className="font-mono text-base font-bold tracking-tight uppercase">
                  PAREL
                </span>
              </Link>
              <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-widest text-mutedGray border border-borderCol px-1.5 py-0.5 rounded">
                STUDIO // MKT
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-1 sm:space-x-4">
              <Link
                href="/studio/new"
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold hover:bg-paper-dark rounded transition-colors"
              >
                Studio
              </Link>
              <Link
                href="/marketplace"
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink font-semibold hover:bg-paper-dark rounded transition-colors"
              >
                Marketplace
              </Link>
              <Link
                href="/creator/dashboard"
                className="hidden md:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark rounded transition-colors"
              >
                Creator
              </Link>
              <Link
                href="/supplier/dashboard"
                className="hidden lg:inline-block px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-mutedGray hover:text-ink hover:bg-paper-dark rounded transition-colors"
              >
                Supplier
              </Link>
            </nav>

            {/* Benchmark / Status Badge */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-1.5 font-mono text-[11px] text-ink bg-warm/30 border border-warm/50 px-2.5 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>ENGINE: THB LIVE</span>
              </div>
              <Link
                href="/studio/new"
                className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-ink text-paper font-bold hover:bg-ink-light rounded transition-colors shadow-sm"
              >
                Customize
              </Link>
            </div>
          </div>
        </header>

        {/* Primary Page Canvas */}
        <main className="flex-1 flex flex-col w-full">
          {children}
        </main>

        {/* Global Brand Footer */}
        <footer className="border-t border-borderCol bg-paper-dark/30 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-1 sm:space-y-0 sm:space-x-3 text-center sm:text-left">
              <span className="font-mono text-xs font-bold uppercase text-ink">
                ape-parel marketplace
              </span>
              <span className="hidden sm:inline text-mutedGray">•</span>
              <span className="font-mono text-xs text-mutedGray">
                Authoritative Pricing & Auditable Royalty Engine
              </span>
            </div>
            <div className="flex items-center space-x-4 font-mono text-[11px] text-mutedGray">
              <span>Benchmark: ฿410 / Unit</span>
              <span>•</span>
              <span>Kornit DTG</span>
              <span>•</span>
              <span>Combed Cotton 240 GSM</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
