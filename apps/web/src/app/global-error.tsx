'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-secondary text-foreground flex items-center justify-center p-6 antialiased font-sans">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 shadow-sm text-center">
          <h2 className="text-base font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-muted-foreground mb-6">{error.message || 'System error'}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-secondary"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
