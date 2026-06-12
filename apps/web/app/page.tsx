import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { VerticalHero } from "@/components/marketing/VerticalHero";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CAPABILITIES, FAQ, HOW_IT_WORKS } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "ReachFlow — find the right inboxes. Send emails that get answered.",
  description:
    "Lead discovery from named public sources, vertical-aware AI drafting, and compliant campaigns — one workspace that reshapes itself for job seekers, recruiters, agencies, growth teams, and partnerships.",
  alternates: { canonical: "/" },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "ReachFlow",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Lead discovery, AI-drafted cold email, and compliant campaigns for five outreach workflows.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR", description: "Free plan available" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

export default function LandingPage() {
  return (
    <div className="bg-bg text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <SiteHeader />

      <main>
        {/* hero */}
        <section className="hero-backdrop mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-[3.4rem]">
              Find the right inboxes.
              <br />
              Send emails that <span className="text-gradient-accent">get answered.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              One workspace for the whole outreach loop — discover leads from public sources, draft
              emails that sound like you, and run focused campaigns. Built for five workflows: job
              search, recruiting, agencies, business growth, and partnerships.
            </p>
          </div>
          <div className="mt-10">
            <VerticalHero />
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <Card key={item.step} className="card-hover p-6">
                <span className="font-mono text-sm font-medium text-accent">{item.step}</span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-ink-soft">{item.copy}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* why reachflow — honest capabilities */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32" aria-labelledby="why-heading">
          <div className="max-w-2xl">
            <h2 id="why-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
              Why ReachFlow
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-muted">
              No invented numbers, no fake logos — just what the product actually does.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <Card key={item.title} className="card-hover p-6">
                <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-ink-soft">{item.copy}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32" aria-labelledby="faq-heading">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="faq-heading" className="font-display text-3xl font-semibold tracking-tight text-ink">
                Honest answers, before you sign up
              </h2>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {FAQ.map((item) => (
                <details key={item.q} className="group p-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                    {item.q}
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-32">
          <Card className="flex flex-col items-start gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                Pick a workflow and run your first outreach today.
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-muted">
                Free to start. No card. Switch workflows anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses({ size: "lg" })}>
                Start free
              </Link>
              <Link href="/pricing" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                See pricing
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
