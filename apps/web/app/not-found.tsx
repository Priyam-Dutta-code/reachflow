import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-muted">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-control border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:bg-accent-tint"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
