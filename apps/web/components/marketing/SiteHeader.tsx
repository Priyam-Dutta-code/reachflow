import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="ReachFlow home">
          <span className="grid h-8 w-8 place-items-center rounded-control bg-accent font-display text-sm font-bold text-white">
            R
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">ReachFlow</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
          <Link
            href="/pricing"
            className="hidden rounded-control px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:inline-flex"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="rounded-control px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Log in
          </Link>
          <Link href="/signup" className={buttonClasses({ size: "sm" })}>
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
