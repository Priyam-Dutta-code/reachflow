"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Handshake,
  Layers3,
  MoveRight,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { DEFAULT_VERTICAL, VERTICAL_LIST, getVerticalConfig, type VerticalId } from "@/lib/verticals";

const ICONS: Record<VerticalId, typeof GraduationCap> = {
  job_seeker: GraduationCap,
  recruiter: Users2,
  agency: BriefcaseBusiness,
  business_growth: Building2,
  partnerships: Handshake,
};

const PRESENTATION: Record<
  VerticalId,
  {
    eyebrow: string;
    proof: string;
    detailTitle: string;
    detailCopy: string;
    workflow: string[];
    metrics: { label: string; value: string }[];
    accent: string;
  }
> = {
  job_seeker: {
    eyebrow: "Career motion",
    proof: "Prioritizes hiring companies, recruiter routes, and application-ready email drafts.",
    detailTitle: "A job search workspace built around outreach, not job-board noise.",
    detailCopy:
      "Students and professionals get company discovery, verified inbox routes, and tailored application drafts that feel direct and credible.",
    workflow: ["Hiring signals", "Inbox enrichment", "Application copy", "Follow-up cadence"],
    metrics: [
      { label: "Best for", value: "Students, early-career, switchers" },
      { label: "Lead type", value: "Hiring companies and recruiter inboxes" },
    ],
    accent: "from-[#93f4df]/28 via-[#6ec4ff]/12 to-transparent",
  },
  recruiter: {
    eyebrow: "Recruiting motion",
    proof: "Surfaces employer accounts, contact paths, and recruiter-specific outreach flows.",
    detailTitle: "Built for search desks that need employer demand before everyone else sees it.",
    detailCopy:
      "Recruiters and staffing teams can map live hiring demand, reach the right employer accounts, and launch tighter outreach by role family or market.",
    workflow: ["Employer discovery", "Hiring demand scan", "Recruiter messaging", "Desk reporting"],
    metrics: [
      { label: "Best for", value: "Recruiters and staffing teams" },
      { label: "Lead type", value: "Employer accounts and hiring contacts" },
    ],
    accent: "from-[#f2c587]/26 via-[#8db3ff]/10 to-transparent",
  },
  agency: {
    eyebrow: "Agency motion",
    proof: "Shapes the workspace around client acquisition and service-led outbound.",
    detailTitle: "A cleaner client pipeline for agencies, consultants, and independent operators.",
    detailCopy:
      "Source target accounts by market, niche, and offer, then generate outreach that sounds like a real service business instead of a generic sales bot.",
    workflow: ["Market scan", "Client-fit scoring", "Offer-led drafts", "Campaign handoff"],
    metrics: [
      { label: "Best for", value: "Agencies, consultants, freelancers" },
      { label: "Lead type", value: "Prospects matched to niche and geography" },
    ],
    accent: "from-[#f2a36b]/26 via-[#f6d6a2]/10 to-transparent",
  },
  business_growth: {
    eyebrow: "Growth motion",
    proof: "Combines lead discovery, enrichment, and cold email into one commercial workflow.",
    detailTitle: "For teams that need pipeline without juggling five disconnected tools.",
    detailCopy:
      "Growth, sales, and marketing teams can target segments, generate email-ready leads, and move directly into outbound campaigns with one consistent system.",
    workflow: ["Segment discovery", "Contact enrichment", "Cold email drafts", "Performance reporting"],
    metrics: [
      { label: "Best for", value: "Founders, sales, growth, marketing" },
      { label: "Lead type", value: "Commercial accounts and buyer routes" },
    ],
    accent: "from-[#76d2c3]/28 via-[#8db3ff]/12 to-transparent",
  },
  partnerships: {
    eyebrow: "Partnership motion",
    proof: "Turns ecosystem research into partner-ready lists and relationship-first outreach.",
    detailTitle: "A partnership workflow that feels strategic, not mass outbound.",
    detailCopy:
      "Founders and alliance teams can source aligned organizations, segment opportunities, and send credible first-touch partnership emails.",
    workflow: ["Partner mapping", "Fit signals", "Strategic outreach", "Pipeline tracking"],
    metrics: [
      { label: "Best for", value: "Partnership and BD teams" },
      { label: "Lead type", value: "Potential affiliates, channels, integrations" },
    ],
    accent: "from-[#8db3ff]/24 via-[#c6b7ff]/10 to-transparent",
  },
};

const PLATFORM_POINTS = [
  {
    title: "One lead action, multiple source layers",
    copy: "Customers do not choose scraping tools. ReachFlow chooses the right public sources for the selected motion and returns the best usable records.",
  },
  {
    title: "Each workspace changes with the vertical",
    copy: "Job seekers, recruiters, agencies, growth teams, and partnership operators each land in a dashboard shaped for their work.",
  },
  {
    title: "Cold email that matches the use case",
    copy: "Subjects, message structure, and call-to-action all adapt to the workflow so the copy feels specific and commercially credible.",
  },
];

function VerticalSelector({
  activeVertical,
  onChange,
}: {
  activeVertical: VerticalId;
  onChange: (vertical: VerticalId) => void;
}) {
  return (
    <div className="space-y-3">
      {VERTICAL_LIST.map((item, index) => {
        const active = activeVertical === item.id;
        const Icon = ICONS[item.id];

        return (
          <motion.button
            key={item.id}
            className={`group w-full rounded-[26px] border p-4 text-left transition duration-300 md:p-5 ${
              active
                ? "border-white/16 bg-white/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.22)]"
                : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"
            }`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index, duration: 0.45 }}
            onClick={() => onChange(item.id)}
            onFocus={() => onChange(item.id)}
            onMouseEnter={() => onChange(item.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-white transition ${
                    active
                      ? "border-white/16 bg-[rgba(255,255,255,0.08)]"
                      : "border-white/10 bg-[rgba(255,255,255,0.04)] text-white/72"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">{item.tag}</div>
                  <div className="mt-2 font-display text-[1.65rem] font-semibold tracking-[-0.045em] text-white">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm text-white/54">{item.audience}</div>
                </div>
              </div>

              <span
                className={`hidden h-9 shrink-0 items-center rounded-full border px-3 text-[11px] uppercase tracking-[0.18em] md:inline-flex ${
                  active ? "border-white/14 bg-white/[0.06] text-white/74" : "border-white/10 text-white/40"
                }`}
              >
                Explore
              </span>
            </div>

            <AnimatePresence initial={false}>
              {active && (
                <motion.div
                  className="overflow-hidden md:hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="mt-4 text-sm leading-7 text-white/68">{item.landingSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.landingBullets.map((bullet) => (
                      <span
                        key={bullet}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/62"
                      >
                        {bullet}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const [activeVertical, setActiveVertical] = useState<VerticalId>(DEFAULT_VERTICAL);

  const vertical = getVerticalConfig(activeVertical);
  const detail = PRESENTATION[activeVertical];

  return (
    <div className="app-shell overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(12,17,26,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] font-display text-lg font-semibold text-white">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Multi-vertical outreach</div>
            </div>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Link href="/pricing" className="nav-chip">
              Pricing
            </Link>
            <Link href="/login" className="nav-chip">
              Log in
            </Link>
            <Link href={`/signup?vertical=${activeVertical}`} className="primary-button !px-5 !py-2.5">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-grid gap-8 pb-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
        <Reveal>
          <div className="max-w-3xl">
            <div className="section-label">
              <ShieldCheck className="h-3.5 w-3.5" />
              Outbound software designed around the buyer
            </div>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-[-0.065em] text-white md:text-6xl lg:text-[5rem]">
              One product.
              <br />
              Five distinct ways to use it well.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              ReachFlow changes its lead generation, dashboard, and cold email workflow based on who is buying. That keeps the experience focused, credible, and easier to sell.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/signup?vertical=${activeVertical}`} className="primary-button">
                Launch {vertical.label}
                <MoveRight className="h-4 w-4" />
              </Link>
              <Link href={`/pricing?vertical=${activeVertical}`} className="secondary-button">
                View plans
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {detail.metrics.map((metric) => (
                <div key={metric.label} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{metric.label}</div>
                  <div className="mt-2 text-sm leading-7 text-white/76">{metric.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="glass-card relative overflow-hidden p-6 md:p-8">
            <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-br ${detail.accent}`} />
            <div className="relative">
              <div className="section-label !px-3 !py-1.5 !text-[10px]">{detail.eyebrow}</div>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--accent)]">
                  {(() => {
                    const Icon = ICONS[activeVertical];
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <div className="font-display text-3xl font-semibold tracking-[-0.05em]">{vertical.label}</div>
                  <div className="text-sm text-white/52">{vertical.audience}</div>
                </div>
              </div>

              <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.05em] text-white md:text-[2.75rem]">
                {detail.detailTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
                {detail.detailCopy}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {vertical.landingBullets.map((bullet) => (
                  <span
                    key={bullet}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/64"
                  >
                    {bullet}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {detail.workflow.map((item) => (
                  <div key={item} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-[var(--accent-strong)]" />
                      <div className="text-sm text-white/74">{item}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">What changes by vertical</div>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-white/68">{detail.proof}</p>
                  </div>
                  <Link href={`/signup?vertical=${activeVertical}`} className="secondary-button !px-5 !py-2.5">
                    Choose {vertical.label}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section-wrap pt-6">
        <Reveal>
          <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
            <div className="max-w-xl">
              <div className="section-label">Choose your workflow</div>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.055em] md:text-5xl">
                Pick the motion first. The product adapts from there.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/66 md:text-base">
                Hover on desktop or tap on mobile to preview how ReachFlow will reshape the workspace for that customer type.
              </p>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,28,42,0.92),rgba(14,20,31,0.96))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-5">
              <div className="grid gap-4 xl:grid-cols-[0.68fr_1.32fr]">
                <div className="xl:pr-2">
                  <VerticalSelector activeVertical={activeVertical} onChange={setActiveVertical} />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeVertical}
                    className="glass-card min-h-full p-6 md:p-8"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Preview</div>
                        <div className="mt-3 font-display text-4xl font-semibold tracking-[-0.055em] text-white">
                          {vertical.landingHeadline}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/64">
                        <Layers3 className="h-4 w-4 text-[var(--accent)]" />
                        {vertical.tag}
                      </div>
                    </div>

                    <p className="mt-5 max-w-3xl text-sm leading-7 text-white/67 md:text-base">
                      {vertical.landingSummary}
                    </p>

                    <div className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Workspace shape</div>
                        <div className="mt-4 space-y-3">
                          {vertical.landingBullets.map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-[18px] bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/74">
                              <div className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Best used when</div>
                        <div className="mt-4 font-display text-2xl font-semibold tracking-[-0.045em] text-white">
                          {detail.metrics[0].value}
                        </div>
                        <p className="mt-4 text-sm leading-7 text-white/66">{detail.proof}</p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                          <Link href={`/signup?vertical=${activeVertical}`} className="primary-button !justify-center !px-5 !py-2.5">
                            Start {vertical.label}
                          </Link>
                          <Link href={`/pricing?vertical=${activeVertical}`} className="secondary-button !justify-center !px-5 !py-2.5">
                            Pricing
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section-wrap pt-2">
        <Reveal>
          <div className="max-w-3xl">
            <div className="section-label">Why it feels better</div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              The product stops looking generic the moment the customer arrives.
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLATFORM_POINTS.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="glass-card h-full p-6">
                <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</div>
                <p className="mt-4 text-sm leading-7 text-white/67">{item.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
