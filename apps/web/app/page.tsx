import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";

/** Placeholder home — the real marketing site lands in Phase 6. */
export default function HomePage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <main className="max-w-xl text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-accent font-display text-lg font-bold text-white">
          R
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Find the right inboxes. Send emails that get answered.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Lead discovery, AI-drafted cold email, and focused campaigns for job seekers,
          recruiters, agencies, growth teams, and partnerships.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className={buttonClasses({ size: "lg" })}>
            Start free
          </Link>
          <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Log in
          </Link>
        </div>
        <p className="mt-10 font-mono text-xs text-muted">
          V2 in progress — marketing site lands in Phase 6.
        </p>
      </main>
    </div>
  );
}
