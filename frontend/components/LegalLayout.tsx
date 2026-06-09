import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/ui/Container";

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
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <Container as="main" className="py-16 sm:py-24">
        <div className="max-w-prose">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          <p className="mt-3 text-sm text-ink-faint">Last updated {updated}</p>
          <div className="mt-6 rounded-card border border-ember-weak-border bg-ember-weak px-4 py-3 text-sm leading-6 text-ember-ink">
            This is a plain-language template, not legal advice. Have it reviewed before relying on it.
          </div>
          <div className="legal-prose mt-10 space-y-8">{children}</div>
        </div>
      </Container>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink-muted">{children}</div>
    </section>
  );
}
