import type { Metadata } from "next";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { CHANGELOG } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in ReachFlow.",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  return (
    <div className="bg-bg text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-[68ch]">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Changelog</h1>
          <p className="mt-3 text-[15px] leading-7 text-muted">
            What shipped, when. No fluff.
          </p>
          <div className="mt-10 space-y-10 border-l border-line pl-6">
            {CHANGELOG.map((entry) => (
              <article key={entry.date} className="relative">
                <span
                  className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent"
                  aria-hidden="true"
                />
                <time dateTime={entry.date} className="font-mono text-xs text-muted">
                  {entry.date}
                </time>
                <h2 className="mt-1 font-display text-xl font-semibold text-ink">{entry.title}</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-ink-soft">
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
