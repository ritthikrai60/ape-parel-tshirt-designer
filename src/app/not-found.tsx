import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h2 className="text-4xl font-bold tracking-tight text-ink mb-2">404 - Page Not Found</h2>
      <p className="text-ink/60 mb-6">The page you are looking for does not exist or has been moved.</p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-ink text-paper rounded font-medium hover:bg-ink/90 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
