"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The page hit an unexpected error. Your data is safe — try again, and if it keeps
          happening, contact support.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted">Error ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-bg transition-colors hover:bg-accent-strong"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
