"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Handshake,
  MailSearch,
  Megaphone,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/Reveal";

const HERO_METRICS = [
  { label: "Lead discovery", value: "Web + job signals" },
  { label: "Email enrichment", value: "Public + team inboxes" },
  { label: "Cold email output", value: "Career or business mode" },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    audience: "Students and job seekers",
    outcome: "Find hiring companies, recover usable contact emails, and send polished outreach instead of waiting in crowded job portals.",
    needs: ["Job signals", "Hiring inboxes", "Application-ready cold emails"],
  },
  {
    icon: BriefcaseBusiness,
    audience: "Agencies and freelancers",
    outcome: "Build prospect lists for new clients, uncover company websites and contact inboxes, and start outreach without buying multiple tools.",
    needs: ["Local business leads", "Client prospecting", "Fast outbound setup"],
  },
  {
    icon: Users,
    audience: "Recruiters and staffing teams",
    outcome: "Track active hiring demand, map company contacts, and send tailored outreach to open conversations faster.",
    needs: ["Hiring-company discovery", "Recruiter workflows", "Follow-up cadence"],
  },
  {
    icon: Megaphone,
    audience: "Sales and marketing teams",
    outcome: "Source niche accounts from the open web, segment them quickly, and launch personalized outbound for pipeline creation.",
    needs: ["ICP search", "Email-ready contacts", "Campaign analytics"],
  },
  {
    icon: Handshake,
    audience: "Founders and partnership teams",
    outcome: "Build lists for partnerships, channel outreach, investor introductions, and strategic conversations from one operating layer.",
    needs: ["Partner discovery", "Relationship outreach", "Professional positioning"],
  },
  {
    icon: Radar,
    audience: "Consultants and local service teams",
    outcome: "Find companies in the markets you want to win, recover contact routes, and send stronger first-touch outreach without adding more tools.",
    needs: ["Local business discovery", "Service-led outreach", "Email-ready contact routes"],
  },
];

const PLATFORM_SECTIONS = [
  {
    title: "Lead discovery from the open web",
    description:
      "Search company sites, job demand, and public business pages so you are not limited to a single network.",
  },
  {
    title: "Email-ready enrichment",
    description:
      "Convert company names into official websites, public emails, and team inboxes that can actually be used in campaigns.",
  },
  {
    title: "Cold emails that fit the use case",
    description:
      "Generate job-seeking outreach, client prospecting emails, and business development notes with the right tone for each motion.",
  },
  {
    title: "Campaign control and follow-up",
    description:
      "Review, assign, preview, send, and measure outreach from one workspace instead of stitching five tools together.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Choose the motion",
    description: "Switch between job search, client prospecting, recruiting, or business development without rebuilding your workflow from scratch.",
  },
  {
    step: "02",
    title: "Generate email-ready leads",
    description: "Pull leads from job signals and the open web, then enrich them with websites and usable contact emails.",
  },
  {
    step: "03",
    title: "Launch premium outreach",
    description: "Preview professional subject lines and body copy, then send focused campaigns with follow-up control.",
  },
];

export default function LandingPage() {
  return (
    <div className="app-shell overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(12,17,26,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] font-display text-lg font-semibold text-white">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Lead discovery and cold email</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/pricing" className="nav-chip">
              Pricing
            </Link>
            <Link href="/login" className="nav-chip">
              Log in
            </Link>
            <Link href="/signup" className="primary-button">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-grid">
        <div className="space-y-8">
          <Reveal>
            <div className="section-label">
              <ShieldCheck className="h-3.5 w-3.5" />
              Built for job search, prospecting, recruiting, and outreach
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="headline text-balance">
              Find better leads,
              <span className="block text-[var(--accent-strong)]">recover real emails,</span>
              and send outreach that sounds human.
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="subheadline">
              ReachFlow is a multi-use-case outreach workspace for students, recruiters, agencies, consultants,
              founders, and sales teams who need lead discovery, email-ready contacts, professional cold emails, and
              campaign control in one place.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="primary-button">
                Launch the workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="secondary-button">
                View plans
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="grid gap-4 sm:grid-cols-3">
              {HERO_METRICS.map((item) => (
                <div key={item.label} className="metric-card">
                  <div className="metric-label">{item.label}</div>
                  <div className="mt-4 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="relative">
          <div className="glass-card relative overflow-hidden p-6 md:p-8">
            <motion.div
              className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[rgba(242,163,107,0.16)] blur-3xl"
              animate={{ x: [0, -8, 0], y: [0, 12, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute left-0 top-24 h-36 w-36 rounded-full bg-[rgba(118,210,195,0.12)] blur-3xl"
              animate={{ x: [0, 10, 0], y: [0, -10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative space-y-4">
              <div className="section-label !px-3 !py-1.5 !text-[10px]">Operations canvas</div>
              <div className="font-display text-3xl font-semibold tracking-[-0.04em]">
                One product, multiple outreach motions.
              </div>
              <p className="max-w-xl text-sm leading-7 text-white/68">
                Move from raw search to email-ready leads, then review and launch outreach that fits the audience you
                are targeting.
              </p>

              <div className="grid gap-4 pt-2">
                {[
                  { label: "Discover", value: "Web search, job portals, Google Maps, Apollo" },
                  { label: "Enrich", value: "Official websites, public emails, team inbox fallbacks" },
                  { label: "Launch", value: "Professional subjects, stronger copy, campaign controls" },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.08, duration: 0.55 }}
                  >
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</div>
                    <div className="mt-3 text-base leading-7 text-white/82">{item.value}</div>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-[24px] border border-[rgba(118,210,195,0.18)] bg-[rgba(118,210,195,0.08)] px-5 py-4 text-sm leading-7 text-white/74">
                Built for teams who need actual contact data and credible cold emails, not just a pretty dashboard.
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section-wrap pt-10">
        <Reveal>
          <div className="section-label">Who buys ReachFlow</div>
          <div className="mt-5 max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              Different buyers, one shared need: email-ready outreach.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              The product is positioned for multiple customer groups so you can widen the market instead of selling to
              only one narrow persona.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {USE_CASES.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.audience} delay={index * 0.06}>
                <div className="glass-card h-full p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.04em]">{item.audience}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/68">{item.outcome}</p>
                  <div className="mt-5 space-y-2">
                    {item.needs.map((need) => (
                      <div key={need} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/74">
                        {need}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="section-wrap pt-4">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div className="section-label">Platform sections</div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              The product is structured around what buyers actually need.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/65">
              Instead of one generic promise, ReachFlow now speaks to lead generation, enrichment, copy generation,
              campaign control, and multi-segment outreach.
            </p>
          </Reveal>

          <div className="space-y-4">
            {PLATFORM_SECTIONS.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.07}>
                <div className="glass-card flex items-start gap-4 p-6">
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--accent-ink)]">
                    <MailSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/68">{item.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrap pt-4">
        <Reveal>
          <div className="section-label">Workflow</div>
          <div className="mt-5 max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              A cleaner path from discovery to delivery.
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {WORKFLOW.map((item, index) => (
            <Reveal key={item.step} delay={index * 0.06}>
              <div className="glass-card h-full p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] font-display text-xl font-semibold text-[var(--accent-strong)]">
                  {item.step}
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/68">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-wrap pt-0">
        <Reveal>
          <div className="glass-card flex flex-col items-start justify-between gap-8 p-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="section-label">
                <Radar className="h-3.5 w-3.5" />
                Ready to convert more buyer types
              </div>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Present a product that feels custom, credible, and functional.
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/65">
                ReachFlow now positions itself as a practical lead discovery and cold-email platform for multiple
                customer groups, not a one-note SaaS with template copy.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="primary-button">
                Create account
              </Link>
              <Link href="/login" className="secondary-button">
                Access dashboard
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
