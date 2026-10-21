'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-2xl bg-negative/10 text-negative flex items-center justify-center mb-4 border border-negative/20 shadow-xs">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-1">
        Ledger Synchronization Interrupted
      </h2>
      <p className="text-xs text-muted-foreground max-w-md mb-6">
        {error.message || 'An unexpected error occurred while loading this view. Your ledger data remains safe.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reload View</span>
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-secondary text-foreground transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
