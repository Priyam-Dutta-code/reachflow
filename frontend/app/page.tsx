"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  GraduationCap,
  Handshake,
  Mail,
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

const SHOWCASE: Record<
  VerticalId,
  {
    title: string;
    summary: string;
    outputLabel: string;
    subject: string;
    contactName: string;
    contactRole: string;
    company: string;
    email: string;
    steps: string[];
    stats: { label: string; value: string }[];
    accent: string;
  }
> = {
  job_seeker: {
    title: "A job search workspace built for direct outreach.",
    summary:
      "Find hiring companies, uncover usable contact routes, and send application emails that sound like a sharp candidate, not a template.",
    outputLabel: "Application-ready lead",
    subject: "Backend engineer interested in your current hiring needs",
    contactName: "Hiring Team",
    contactRole: "Talent acquisition",
    company: "Northline Systems",
    email: "careers@northlinesystems.com",
    steps: ["Track live hiring signals", "Enrich reachable inboxes", "Draft polished first-touch emails"],
    stats: [
      { label: "Best for", value: "Students and professionals" },
      { label: "Primary output", value: "Hiring-company leads" },
    ],
    accent: "from-[#7fe2cb]/22 via-[#8db3ff]/10 to-transparent",
  },
  recruiter: {
    title: "Employer discovery and recruiter outreach in one flow.",
    summary:
      "Map real hiring demand, identify employer accounts, and generate outreach copy suited to search desks and staffing teams.",
    outputLabel: "Employer account",
    subject: "Recruiting support for your product and engineering hiring",
    contactName: "Nina Brooks",
    contactRole: "Talent director",
    company: "Summit Grid",
    email: "talent@summitgrid.io",
    steps: ["Spot active hiring patterns", "Prioritize reachable accounts", "Launch recruiter-ready campaigns"],
    stats: [
      { label: "Best for", value: "Recruiters and staffing teams" },
      { label: "Primary output", value: "Employer accounts" },
    ],
    accent: "from-[#f3ca88]/24 via-[#8db3ff]/10 to-transparent",
  },
  agency: {
    title: "Client acquisition that feels tailored to the market.",
    summary:
      "Generate client-fit companies, refine the prospect list around your offer, and send agency outreach that reads like a real operator wrote it.",
    outputLabel: "Prospect account",
    subject: "A practical growth idea for Kinetic Studio's next launch cycle",
    contactName: "Maya Patel",
    contactRole: "Founder",
    company: "Kinetic Studio",
    email: "hello@kineticstudio.co",
    steps: ["Filter by niche and geography", "Surface email-ready prospects", "Send offer-led cold outreach"],
    stats: [
      { label: "Best for", value: "Agencies and consultants" },
      { label: "Primary output", value: "Client-fit leads" },
    ],
    accent: "from-[#f2a36b]/24 via-[#f7d9ac]/10 to-transparent",
  },
  business_growth: {
    title: "A cleaner outbound engine for revenue and growth teams.",
    summary:
      "ReachFlow handles discovery, contact enrichment, and campaign setup so your team can move from target market to send-ready list without tool sprawl.",
    outputLabel: "Sales-ready lead",
    subject: "A faster outbound workflow for your next growth push",
    contactName: "Arjun Mehta",
    contactRole: "Growth lead",
    company: "Vectorlane",
    email: "growth@vectorlane.ai",
    steps: ["Define market and offer", "Generate usable contacts", "Move straight into campaigns"],
    stats: [
      { label: "Best for", value: "Sales, growth, and founders" },
      { label: "Primary output", value: "Commercial leads" },
    ],
    accent: "from-[#76d2c3]/24 via-[#8db3ff]/12 to-transparent",
  },
  partnerships: {
    title: "A partnership pipeline designed for warmer first touches.",
    summary:
      "Build a better list of integration, affiliate, and channel opportunities, then send relationship-first outreach that sounds credible from day one.",
    outputLabel: "Partner target",
    subject: "Partnership idea that could fit both teams this quarter",
    contactName: "Lena Fox",
    contactRole: "Partnerships manager",
    company: "Atlas Commerce",
    email: "partners@atlascommerce.com",
    steps: ["Map aligned partner profiles", "Find outreach routes", "Launch strategic first-touch campaigns"],
    stats: [
      { label: "Best for", value: "BD and partnerships teams" },
      { label: "Primary output", value: "Partner opportunities" },
    ],
    accent: "from-[#8db3ff]/24 via-[#c5b8ff]/10 to-transparent",
  },
};

const BENEFITS = [
  {
    title: "One product, multiple commercial motions",
    copy: "The app reshapes itself for job search, recruiting, agency growth, outbound sales, and partnerships instead of forcing everyone into one generic dashboard.",
  },
  {
    title: "Lead generation without tool clutter",
    copy: "Customers click one generate action. ReachFlow decides how to pull, filter, and enrich records behind the scenes for the selected vertical.",
  },
  {
    title: "Cold email that feels specific",
    copy: "Subjects, intros, and calls to action shift with the use case so the output reads more like a real operator and less like automation.",
  },
];

const PROCESS = [
  {
    step: "01",
    title: "Choose the workflow",
    copy: "Start with the buyer type. The landing, pricing, dashboard, and lead generation logic all follow that decision.",
  },
  {
    step: "02",
    title: "Generate focused leads",
    copy: "ReachFlow pulls from the right public signals for that workflow and returns cleaner records with contact routes where available.",
  },
  {
    step: "03",
    title: "Launch polished outreach",
    copy: "Drafts, campaign structure, and reporting stay aligned with the chosen use case instead of dropping users into a generic sales template.",
  },
];

export default function LandingPage() {
  const [activeVertical, setActiveVertical] = useState<VerticalId>(DEFAULT_VERTICAL);

  const vertical = getVerticalConfig(activeVertical);
  const showcase = SHOWCASE[activeVertical];

  return (
    <div className="app-shell overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(9,14,24,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] font-display text-lg font-semibold text-white">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Outbound system</div>
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

      <section className="section-wrap pb-10 pt-8 md:pt-10 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <Reveal>
            <div className="max-w-3xl">
              <div className="section-label">
                <ShieldCheck className="h-3.5 w-3.5" />
                Built for focused lead generation and outbound
              </div>
              <h1 className="mt-6 font-display text-5xl font-semibold tracking-[-0.065em] text-white md:text-6xl lg:text-[5.2rem]">
                One clean system
                <br />
                for every outreach motion.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                ReachFlow gives each buyer a dedicated workflow, a cleaner dashboard, and outreach that matches what they are actually trying to achieve.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/signup?vertical=${activeVertical}`} className="primary-button">
                  Launch {vertical.label}
                  <MoveRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="secondary-button">
                  View pricing
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {showcase.stats.map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{item.label}</div>
                    <div className="mt-2 text-sm leading-7 text-white/76">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative">
              <motion.div
                aria-hidden="true"
                className={`absolute -right-16 top-2 h-44 w-44 rounded-full bg-gradient-to-br ${showcase.accent} blur-3xl`}
                animate={{ scale: [1, 1.07, 1], opacity: [0.55, 0.9, 0.55] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute -left-10 bottom-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_68%)] blur-2xl"
                animate={{ y: [0, -12, 0], opacity: [0.25, 0.45, 0.25] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="glass-card relative overflow-hidden p-4 md:p-6">
                <div className="absolute inset-x-0 top-0 h-px ambient-line opacity-70" />

                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max gap-2">
                    {VERTICAL_LIST.map((item) => {
                      const active = item.id === activeVertical;
                      const Icon = ICONS[item.id];
                      return (
                        <button
                          key={item.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${
                            active
                              ? "border-white/16 bg-white/[0.08] text-white"
                              : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.05]"
                          }`}
                          onClick={() => setActiveVertical(item.id)}
                          onFocus={() => setActiveVertical(item.id)}
                          onMouseEnter={() => setActiveVertical(item.id)}
                          type="button"
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeVertical}
                    className="mt-6"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">{vertical.tag}</div>
                        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-[-0.055em] text-white md:text-[2.75rem]">
                          {showcase.title}
                        </h2>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/64">
                        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                        {vertical.audience}
                      </div>
                    </div>

                    <p className="mt-5 max-w-3xl text-sm leading-7 text-white/67 md:text-base">{showcase.summary}</p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {vertical.landingBullets.map((bullet) => (
                        <span
                          key={bullet}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/62"
                        >
                          {bullet}
                        </span>
                      ))}
                    </div>

                    <div className="mt-8 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Workflow preview</div>
                        <div className="mt-4 space-y-3">
                          {showcase.steps.map((step, index) => (
                            <div key={step} className="flex items-start gap-3 rounded-[18px] bg-white/[0.03] px-4 py-4">
                              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-[11px] text-white/62">
                                0{index + 1}
                              </div>
                              <div className="text-sm leading-7 text-white/74">{step}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{showcase.outputLabel}</div>
                              <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.045em] text-white">
                                {showcase.contactName}
                              </div>
                              <div className="mt-1 text-sm text-white/55">
                                {showcase.contactRole} · {showcase.company}
                              </div>
                            </div>
                            <Mail className="h-5 w-5 text-[var(--accent-strong)]" />
                          </div>
                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
                            {showcase.email}
                          </div>
                        </div>

                        <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Draft subject line</div>
                          <div className="mt-3 text-sm leading-7 text-white/78">{showcase.subject}</div>
                          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <Link href={`/signup?vertical=${activeVertical}`} className="primary-button !justify-center !px-5 !py-2.5">
                              Start {vertical.label}
                            </Link>
                            <Link href={`/pricing?vertical=${activeVertical}`} className="secondary-button !justify-center !px-5 !py-2.5">
                              Pricing
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-wrap pt-4">
        <div className="grid gap-5 lg:grid-cols-3">
          {BENEFITS.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="glass-card h-full p-6">
                <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</div>
                <p className="mt-4 text-sm leading-7 text-white/67">{item.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-wrap pt-2">
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div className="max-w-xl">
              <div className="section-label">How it works</div>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.055em] md:text-5xl">
                Keep the product simple for the customer, even when the system underneath is doing more.
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/66 md:text-base">
                The goal is clarity: one chosen workflow, one lead generation action, one polished campaign path.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="glass-card p-5 md:p-6">
              <div className="space-y-4">
                {PROCESS.map((item) => (
                  <div key={item.step} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{item.step}</div>
                    <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] text-white">{item.title}</div>
                    <p className="mt-3 text-sm leading-7 text-white/67">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-wrap pt-2">
        <Reveal>
          <div className="glass-card flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="section-label">
                <Check className="h-3.5 w-3.5" />
                Ready to launch
              </div>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Pick the vertical, open the workspace, and start generating cleaner leads.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/signup?vertical=${activeVertical}`} className="primary-button">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="secondary-button">
                See pricing
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
