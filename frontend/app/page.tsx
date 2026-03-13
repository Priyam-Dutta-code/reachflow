"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Mail, ShieldCheck, Sparkles, Target, WandSparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Reveal } from "@/components/Reveal";

const HeroScene = dynamic(() => import("@/components/HeroScene"), {
  ssr: false,
});

const FEATURE_CARDS = [
  {
    title: "Prospect across multiple sources",
    description:
      "Pull fresh leads from Google Maps, Apollo, LinkedIn workflows, and job portals without juggling five browser tabs.",
    icon: Target,
  },
  {
    title: "Generate outreach that sounds human",
    description:
      "ReachFlow uses your profile, target company context, and campaign intent to produce personalized cold emails instead of generic spam.",
    icon: WandSparkles,
  },
  {
    title: "Launch campaigns with control",
    description:
      "Set volume caps, follow-up timing, and campaign grouping so outreach remains organized, safe, and easy to iterate.",
    icon: Mail,
  },
  {
    title: "Track funnel health in one place",
    description:
      "See which sources convert, how many leads have valid emails, and where reply rates are rising or stalling.",
    icon: BarChart3,
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Capture leads into a campaign",
    description:
      "Generate leads straight into a campaign so your sales or hiring workflow stays aligned from the first search.",
  },
  {
    step: "02",
    title: "Preview AI email quality before launch",
    description:
      "Review the exact message for any lead, adjust your sender profile, and only then push the campaign live.",
  },
  {
    step: "03",
    title: "Automate follow-up without losing oversight",
    description:
      "Credits, reply checks, and follow-up timing stay visible inside the app, not buried in background jobs.",
  },
];

const STATS = [
  { label: "Campaign-ready workspace", value: "1" },
  { label: "Core steps unified", value: "3" },
  { label: "Channels supported", value: "4+" },
];

export default function LandingPage() {
  return (
    <div className="app-shell overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(4,8,20,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-lg font-bold text-slate-950">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">AI outreach SaaS</div>
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
              Hardened workflows, sharper UX
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="headline text-balance">
              Your outreach engine,
              <span className="block bg-[linear-gradient(135deg,#8bf3d8,#48e1ff,#ffbb8b)] bg-clip-text text-transparent">
                now built to sell.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="subheadline">
              ReachFlow is a full-stack outreach workspace for finding prospects, drafting tailored emails,
              assigning them to campaigns, automating follow-ups, and monitoring the funnel from one responsive
              interface.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="primary-button">
                Launch the free plan
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="secondary-button">
                Explore pricing
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.26}>
            <div className="grid gap-4 sm:grid-cols-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="metric-card">
                  <div className="metric-label">{stat.label}</div>
                  <div className="metric-value">{stat.value}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.16} className="relative">
          <HeroScene />
          <motion.div
            className="glass-card absolute -bottom-6 left-6 right-6 p-5 md:left-10 md:right-10"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7 }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="section-label !px-3 !py-1.5 !text-[10px]">New product flow</div>
                <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
                  Generate leads into campaigns, then preview before sending.
                </div>
              </div>
              <Sparkles className="hidden h-9 w-9 text-[var(--accent)] md:block" />
            </div>
            <div className="mt-5 grid gap-3 text-sm text-white/65 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Lead source presets</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Campaign assignment</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Email preview drawer</div>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <section className="section-wrap">
        <Reveal>
          <div className="section-label">What the SaaS does well</div>
          <div className="mt-5 max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              ReachFlow is strongest when the workflow stays connected end to end.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              That means source selection, lead generation, campaign grouping, personalized email creation, and
              performance tracking have to feel like one product instead of six forms.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {FEATURE_CARDS.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={index * 0.08}>
                <div className="glass-card glow-border h-full p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(139,243,216,0.24),rgba(72,225,255,0.2))] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold tracking-[-0.04em]">{feature.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/65">{feature.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="section-wrap">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <Reveal>
            <div className="section-label">Workflow</div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              A clearer path from search to send.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/65">
              The app now emphasizes the actual work your buyers care about: sourcing better leads, assigning them
              cleanly, and launching campaigns without ambiguity.
            </p>
          </Reveal>

          <div className="space-y-4">
            {WORKFLOW.map((item, index) => (
              <Reveal key={item.step} delay={index * 0.08}>
                <div className="glass-card flex flex-col gap-4 p-6 md:flex-row md:items-start md:gap-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-xl font-bold text-slate-950">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/65">{item.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrap pt-0">
        <Reveal>
          <div className="glass-card flex flex-col items-start justify-between gap-8 p-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="section-label">Ready for launch</div>
              <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Ship the polished version, not the prototype.
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/65">
                Secure backend behavior, tighter payment verification, a stronger campaign workflow, and a far more
                premium interface make ReachFlow feel closer to a product people can trust with money.
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
