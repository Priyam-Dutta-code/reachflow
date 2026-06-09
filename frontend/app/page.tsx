"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  GraduationCap,
  Handshake,
  Mail,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { DEFAULT_VERTICAL, VERTICAL_LIST, getVerticalConfig, type VerticalId } from "@/lib/verticals";

const ICONS: Record<VerticalId, typeof GraduationCap> = {
  job_seeker: GraduationCap,
  recruiter: Users2,
  agency: BriefcaseBusiness,
  business_growth: Building2,
  partnerships: Handshake,
};

type Showcase = {
  title: string;
  summary: string;
  outputLabel: string;
  subject: string;
  contactName: string;
  contactRole: string;
  company: string;
  email: string;
  steps: string[];
  bestFor: string;
  output: string;
};

const SHOWCASE: Record<VerticalId, Showcase> = {
  job_seeker: {
    title: "A job search workspace built for direct outreach.",
    summary:
      "Find hiring companies, uncover usable contact routes, and send application emails that sound like a sharp candidate — not a template.",
    outputLabel: "Application-ready lead",
    subject: "Backend engineer interested in your current hiring",
    contactName: "Hiring Team",
    contactRole: "Talent acquisition",
    company: "Northline Systems",
    email: "careers@northlinesystems.com",
    steps: ["Track live hiring signals", "Enrich reachable inboxes", "Draft polished first-touch emails"],
    bestFor: "Students and professionals",
    output: "Hiring-company leads",
  },
  recruiter: {
    title: "Employer discovery and recruiter outreach in one flow.",
    summary:
      "Map real hiring demand, identify employer accounts, and generate outreach copy suited to search desks and staffing teams.",
    outputLabel: "Employer account",
    subject: "Recruiting support for your engineering hiring",
    contactName: "Nina Brooks",
    contactRole: "Talent director",
    company: "Summit Grid",
    email: "talent@summitgrid.io",
    steps: ["Spot active hiring patterns", "Prioritize reachable accounts", "Launch recruiter-ready campaigns"],
    bestFor: "Recruiters and staffing teams",
    output: "Employer accounts",
  },
  agency: {
    title: "Client acquisition that feels tailored to the market.",
    summary:
      "Generate client-fit companies, refine the list around your offer, and send agency outreach that reads like a real operator wrote it.",
    outputLabel: "Prospect account",
    subject: "A practical growth idea for Kinetic Studio",
    contactName: "Maya Patel",
    contactRole: "Founder",
    company: "Kinetic Studio",
    email: "hello@kineticstudio.co",
    steps: ["Filter by niche and geography", "Surface email-ready prospects", "Send offer-led cold outreach"],
    bestFor: "Agencies and consultants",
    output: "Client-fit leads",
  },
  business_growth: {
    title: "A cleaner outbound engine for revenue teams.",
    summary:
      "ReachFlow handles discovery, contact enrichment, and campaign setup so your team moves from target market to send-ready list without tool sprawl.",
    outputLabel: "Sales-ready lead",
    subject: "A faster outbound workflow for your next push",
    contactName: "Arjun Mehta",
    contactRole: "Growth lead",
    company: "Vectorlane",
    email: "growth@vectorlane.ai",
    steps: ["Define market and offer", "Generate usable contacts", "Move straight into campaigns"],
    bestFor: "Sales, growth, and founders",
    output: "Commercial leads",
  },
  partnerships: {
    title: "A partnership pipeline for warmer first touches.",
    summary:
      "Build a better list of integration, affiliate, and channel opportunities, then send relationship-first outreach that sounds credible from day one.",
    outputLabel: "Partner target",
    subject: "Partnership idea that could fit both teams",
    contactName: "Lena Fox",
    contactRole: "Partnerships manager",
    company: "Atlas Commerce",
    email: "partners@atlascommerce.com",
    steps: ["Map aligned partner profiles", "Find outreach routes", "Launch strategic first-touch campaigns"],
    bestFor: "BD and partnerships teams",
    output: "Partner opportunities",
  },
};

const CAPABILITIES = [
  {
    title: "One product, many motions",
    copy: "The workspace reshapes itself for job search, recruiting, agency growth, outbound sales, and partnerships — instead of forcing everyone into one generic dashboard.",
  },
  {
    title: "Lead generation without clutter",
    copy: "One generate action. ReachFlow decides how to pull, filter, and enrich records behind the scenes for the workflow you chose.",
  },
  {
    title: "Cold email that feels specific",
    copy: "Subjects, intros, and calls to action shift with the use case, so the output reads like a real operator wrote it.",
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
    copy: "Drafts, campaign structure, and reporting stay aligned with the chosen use case — never a generic sales template.",
  },
];

const FAQ = [
  {
    q: "Where do the leads come from?",
    a: "Public sources — open-web company pages, job boards, Google Maps, and optional Apollo — enriched with publicly available contact routes. ReachFlow surfaces what is already public; it does not invent contact data.",
  },
  {
    q: "Do I need my own Gmail or Groq keys?",
    a: "You can explore and generate leads without them. To send real email you connect a Gmail app password. AI drafting works out of the box and can use your own Groq key if you prefer.",
  },
  {
    q: "Who is responsible for compliant outreach?",
    a: "You are. You decide who to contact and when, and you connect your own sending inbox. ReachFlow is built around sender identity so your outreach stays accountable.",
  },
  {
    q: "How is my data handled?",
    a: "Your leads, campaigns, and stored credentials are scoped to your account. Sensitive secrets like Gmail app passwords and API keys are encrypted before they are stored.",
  },
  {
    q: "Can I switch between use cases?",
    a: "Yes. Change your vertical anytime in Settings and the workspace, pricing, and email copy adapt to the new motion.",
  },
];

function VerticalShowcase({
  activeVertical,
  onChange,
}: {
  activeVertical: VerticalId;
  onChange: (vertical: VerticalId) => void;
}) {
  const reduce = useReducedMotion();
  const vertical = getVerticalConfig(activeVertical);
  const showcase = SHOWCASE[activeVertical];

  return (
    <div>
      <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {VERTICAL_LIST.map((item) => {
          const active = item.id === activeVertical;
          const Icon = ICONS[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-pressed={active}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-ember-weak-border bg-ember-weak text-ember-ink"
                  : "border-line bg-card text-ink-muted hover:bg-card-muted hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeVertical}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 grid gap-4 lg:grid-cols-2"
        >
          <Card className="p-6 sm:p-8">
            <Eyebrow>{vertical.tag}</Eyebrow>
            <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
              {showcase.title}
            </h3>
            <p className="mt-3 text-[15px] leading-7 text-ink-muted">{showcase.summary}</p>
            <ol className="mt-6 space-y-2.5">
              {showcase.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card-muted text-xs font-semibold text-ink-muted">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-ink">{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow>{showcase.outputLabel}</Eyebrow>
                  <div className="mt-3 font-display text-xl font-semibold tracking-[-0.01em] text-ink">
                    {showcase.contactName}
                  </div>
                  <div className="mt-1 text-sm text-ink-faint">
                    {showcase.contactRole} · {showcase.company}
                  </div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ember-weak text-ember">
                  <Mail className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 rounded-control border border-line bg-card-muted px-3.5 py-2.5 text-sm text-ink-muted">
                {showcase.email}
              </div>
              <div className="mt-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-ink-faint">Draft subject</div>
                <div className="mt-1.5 text-sm leading-6 text-ink">{showcase.subject}</div>
              </div>
            </Card>

            <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-ink-faint">Best for</div>
                <div className="mt-1 text-sm font-medium text-ink">{showcase.bestFor}</div>
              </div>
              <div className="h-8 w-px bg-line" />
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-ink-faint">Primary output</div>
                <div className="mt-1 text-sm font-medium text-ink">{showcase.output}</div>
              </div>
              <Link
                href={`/signup?vertical=${activeVertical}`}
                className={buttonClasses({ size: "sm", className: "ml-auto" })}
              >
                Start {vertical.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  const [activeVertical, setActiveVertical] = useState<VerticalId>(DEFAULT_VERTICAL);
  const vertical = getVerticalConfig(activeVertical);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader signupVertical={activeVertical} />

      <main>
        {/* Hero */}
        <Container as="section" className="pt-16 sm:pt-24">
          <Reveal>
            <div className="max-w-3xl">
              <Eyebrow>Outbound, end to end</Eyebrow>
              <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.03em] text-ink sm:text-6xl">
                One clean system for every outreach motion.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-ink-muted">
                ReachFlow gives each buyer a dedicated workflow — discover leads, draft vertical-aware emails, and run
                focused campaigns from one calm workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={`/signup?vertical=${activeVertical}`} className={buttonClasses({ size: "lg" })}>
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  View pricing
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {VERTICAL_LIST.map((item) => (
                  <Badge key={item.id} tone="neutral">
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>

        {/* Workflow showcase */}
        <Container as="section" className="pt-20 sm:pt-28">
          <Reveal>
            <div className="max-w-2xl">
              <Eyebrow>Choose your workflow</Eyebrow>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                One workspace that adapts to how you sell.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-ink-muted">
                Pick a motion to preview the workspace, the kind of lead it returns, and the tone of the outreach it
                drafts.
              </p>
            </div>
          </Reveal>
          <div className="mt-8">
            <VerticalShowcase activeVertical={activeVertical} onChange={setActiveVertical} />
          </div>
        </Container>

        {/* Capabilities */}
        <Container as="section" className="pt-20 sm:pt-28">
          <Reveal>
            <Eyebrow>Why ReachFlow</Eyebrow>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
              Built to do the whole loop, not just one step.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CAPABILITIES.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <Card className="h-full p-6">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-muted">{item.copy}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>

        {/* How it works */}
        <Container as="section" className="pt-20 sm:pt-28">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <div className="max-w-md">
                <Eyebrow>How it works</Eyebrow>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                  Simple for the user, even when the system does more.
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-ink-muted">
                  One chosen workflow, one lead generation action, one polished campaign path.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="space-y-3">
                {PROCESS.map((item) => (
                  <Card key={item.step} className="flex gap-5 p-6">
                    <span className="font-display text-2xl font-semibold text-ember">{item.step}</span>
                    <div>
                      <h3 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-ink-muted">{item.copy}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>

        {/* FAQ */}
        <Container as="section" className="pt-20 sm:pt-28">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <div className="max-w-md">
                <Eyebrow>FAQ</Eyebrow>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                  Honest answers, before you sign up.
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
                {FAQ.map((item) => (
                  <details key={item.q} className="group p-5 sm:p-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                      {item.q}
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink-faint transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-ink-muted">{item.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>

        {/* Final CTA */}
        <Container as="section" className="pt-20 sm:pt-28">
          <Reveal>
            <Card className="flex flex-col gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
                  Pick a workflow and start generating cleaner leads.
                </h2>
                <p className="mt-3 text-[15px] leading-7 text-ink-muted">
                  Free to start. No credit card. Switch motions anytime.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={`/signup?vertical=${activeVertical}`} className={buttonClasses({ size: "lg" })}>
                  Start {vertical.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  See pricing
                </Link>
              </div>
            </Card>
          </Reveal>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
