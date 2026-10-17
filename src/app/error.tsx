'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-ink mb-2">Something went wrong!</h2>
      <p className="text-ink/60 mb-6">{error.message || 'An unexpected error occurred.'}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-2.5 bg-ink text-paper rounded font-medium hover:bg-ink/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
