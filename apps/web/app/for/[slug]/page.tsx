/** Per-vertical SEO landers — generated from the verticals config (the free
 * acquisition engine). Unique title/description/H1/copy/CTA per page. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SignatureElement } from "@/components/marketing/SignatureElement";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SHOWCASE, VERTICAL_SLUGS } from "@/lib/marketing";
import { getVerticalConfig } from "@/lib/verticals";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return Object.keys(VERTICAL_SLUGS).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const verticalId = VERTICAL_SLUGS[slug];
  if (!verticalId) return {};
  const vertical = getVerticalConfig(verticalId);
  return {
    title: `Cold email tool for ${vertical.label.toLowerCase()} — ReachFlow`,
    description: vertical.landingSummary,
    alternates: { canonical: `/for/${slug}` },
  };
}

export default async function VerticalLanderPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const verticalId = VERTICAL_SLUGS[slug];
  if (!verticalId) notFound();

  const vertical = getVerticalConfig(verticalId);
  const showcase = SHOWCASE[verticalId];

  return (
    <div className="bg-bg text-ink">
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">
            For {vertical.audience.toLowerCase()}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            {vertical.landingHeadline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{vertical.landingSummary}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/signup?vertical=${verticalId}`} className={buttonClasses({ size: "lg" })}>
              Start free
            </Link>
            <Link
              href={`/pricing?vertical=${verticalId}`}
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              See {vertical.label.toLowerCase()} pricing
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
          <SignatureElement showcase={showcase} />
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="grid gap-4 md:grid-cols-3">
            {vertical.landingBullets.map((bullet, index) => (
              <Card key={bullet} className="p-6">
                <span className="font-mono text-sm font-medium text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-display text-lg font-semibold text-ink">{bullet}</h2>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <Card className="grid gap-6 p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {vertical.leadTitle}
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-ink-soft">{vertical.leadSummary}</p>
            </div>
            <div className="lg:justify-self-end">
              <Link href={`/signup?vertical=${verticalId}`} className={buttonClasses({ size: "lg" })}>
                Start free as {vertical.label.toLowerCase()}
              </Link>
            </div>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
