import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-bg text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-[68ch]">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
          <div className="mt-6 rounded-card border border-warning/25 bg-warning-bg px-4 py-3 text-sm leading-6 text-warning">
            Plain-language template, not legal advice. Have it reviewed before relying on it.
          </div>
          <div className="mt-10 space-y-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink-soft">{children}</div>
    </section>
  );
}
