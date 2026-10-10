import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center">
      <div className="inline-flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-warm-dark bg-warm/20 border border-warm/40 px-3 py-1 rounded-full mb-6">
        <span>Creator-Powered Apparel Studio</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-black font-sans tracking-tight text-ink max-w-3xl mb-6">
        Wear Authenticity. Support Creators.
      </h1>
      <p className="text-lg text-ink-muted max-w-xl mb-8 font-sans">
        Design in real-time 2D/3D with server-authoritative live pricing and immutable royalty tracking.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/studio/new"
          className="px-6 py-3 bg-ink text-paper font-mono text-sm uppercase tracking-wider font-bold rounded hover:bg-ink-light transition-colors shadow-md"
        >
          Launch 3D Studio
        </Link>
        <Link
          href="/marketplace"
          className="px-6 py-3 border border-borderCol bg-paper-light text-ink font-mono text-sm uppercase tracking-wider font-semibold rounded hover:bg-paper-dark transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    </div>
  );
}
