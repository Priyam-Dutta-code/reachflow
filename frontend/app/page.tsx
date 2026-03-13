"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Mail, ShieldCheck, Sparkles, Target, WandSparkles } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/Reveal";

const FEATURE_CARDS = [
  {
    title: "Source prospects from live intent channels",
    description:
      "Pull fresh leads from Google Maps, Apollo, LinkedIn workflows, and job portals without juggling multiple disconnected tools.",
    icon: Target,
  },
  {
    title: "Send outreach that sounds credible",
    description:
      "ReachFlow uses your sender profile, target context, and campaign angle to produce personalized outreach that feels deliberate instead of generic.",
    icon: WandSparkles,
  },
  {
    title: "Launch campaigns with guardrails",
    description:
      "Set volume caps, follow-up timing, and campaign grouping so every send stays organized, safe, and measurable.",
    icon: Mail,
  },
  {
    title: "Track performance from one dashboard",
    description:
      "See which sources convert, how many leads have valid emails, and where reply rates are accelerating or stalling.",
    icon: BarChart3,
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Capture leads into the right campaign",
    description:
      "Import leads straight into a campaign so sales, recruiting, or outbound teams stay aligned from the first search.",
  },
  {
    step: "02",
    title: "Approve the message before launch",
    description:
      "Preview the exact message for any lead, refine the sender profile, and launch only when the copy is ready.",
  },
  {
    step: "03",
    title: "Scale follow-up without losing oversight",
    description:
      "Credits, reply checks, and follow-up timing stay visible inside the product so operators stay in control.",
  },
];

const STATS = [
  { label: "Campaign-ready workspace", value: "1" },
  { label: "Core steps unified", value: "3" },
  { label: "Channels supported", value: "4+" },
];

const HERO_PIPELINE = [
  { label: "Sources", value: "Maps, Apollo, LinkedIn" },
  { label: "Scoring", value: "Fit + enrichment checks" },
  { label: "Launch", value: "Preview before every send" },
];

const HERO_SIGNALS = [
  { label: "Reply rate", value: "+18%" },
  { label: "Valid emails", value: "91%" },
  { label: "Launch time", value: "12 min" },
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
              Secure, polished, client-ready
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="headline text-balance">
              Grow outbound with one
              <span className="block bg-[linear-gradient(135deg,#8bf3d8,#48e1ff,#ffbb8b)] bg-clip-text text-transparent">
                premium operating system.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="subheadline">
              ReachFlow gives teams a single place to source prospects, personalize outreach, launch campaigns,
              automate follow-up, and monitor pipeline performance from a responsive, production-ready interface.
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
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(8,14,26,0.78))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.4)] md:min-h-[520px] md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,243,216,0.22),transparent_26%),radial-gradient(circle_at_78%_20%,rgba(72,225,255,0.18),transparent_30%),radial-gradient(circle_at_55%_75%,rgba(255,187,139,0.16),transparent_24%)]" />
            <motion.div
              className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-[rgba(139,243,216,0.22)] blur-3xl md:h-44 md:w-44"
              animate={{ x: [0, 16, -10, 0], y: [0, -10, 12, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute right-0 top-8 h-36 w-36 rounded-full bg-[rgba(72,225,255,0.18)] blur-3xl md:h-52 md:w-52"
              animate={{ x: [0, -14, 8, 0], y: [0, 12, -8, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-4 right-10 h-32 w-32 rounded-full bg-[rgba(255,187,139,0.18)] blur-3xl md:h-44 md:w-44"
              animate={{ x: [0, 10, -12, 0], y: [0, -8, 10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex flex-col gap-5">
              <div className="glass-card flex items-center justify-between gap-4 p-5">
                <div>
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Live workflow map</div>
                  <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] md:text-[2rem]">
                    Move from lead discovery to launch without losing context.
                  </div>
                </div>
                <Sparkles className="hidden h-9 w-9 text-[var(--accent)] md:block" />
              </div>

              <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <motion.div
                  className="glass-card relative overflow-hidden p-5 md:p-6"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.7 }}
                >
                  <div className="absolute inset-x-6 top-[78px] hidden h-px ambient-line md:block" />
                  <div className="space-y-4">
                    {HERO_PIPELINE.map((item, index) => (
                      <motion.div
                        key={item.label}
                        className="relative grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[72px_1fr]"
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + index * 0.08, duration: 0.6 }}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(139,243,216,0.95),rgba(72,225,255,0.95))] font-display text-lg font-semibold text-slate-950">
                          0{index + 1}
                        </div>
                        <div>
                    <div className="text-xs uppercase tracking-[0.26em] text-white/45">{item.label}</div>
                    <div className="mt-2 text-sm leading-6 text-white/78 md:text-base">{item.value}</div>
                  </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <div className="grid gap-4">
                  <motion.div
                    className="glass-card p-5"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.42, duration: 0.65 }}
                  >
                    <div className="text-xs uppercase tracking-[0.28em] text-white/45">Signal snapshot</div>
                    <div className="mt-4 grid gap-3">
                      {HERO_SIGNALS.map((signal, index) => (
                        <motion.div
                          key={signal.label}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.07, duration: 0.5 }}
                        >
                          <span className="text-sm text-white/65">{signal.label}</span>
                          <span className="font-display text-2xl font-semibold tracking-[-0.04em]">{signal.value}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    className="glass-card p-5"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.58, duration: 0.6 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.28em] text-white/45">Quality gate</div>
                        <div className="mt-2 font-display text-xl font-semibold tracking-[-0.04em]">
                          Review every message before it goes live
                        </div>
                      </div>
                      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                        Safe send
                      </div>
                    </div>
                    <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[rgba(4,8,20,0.64)] p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/40">
                        <span>Draft preview</span>
                        <span>Lead-fit checked</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="h-2.5 w-4/5 rounded-full bg-white/10" />
                        <div className="h-2.5 w-full rounded-full bg-white/10" />
                        <div className="h-2.5 w-3/4 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section-wrap">
        <Reveal>
          <div className="section-label">Built for revenue teams</div>
          <div className="mt-5 max-w-3xl">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              Everything important happens inside one connected workflow.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/65">
              Prospect sourcing, lead qualification, campaign creation, personalized messaging, and performance tracking
              should feel like one product instead of five disconnected systems.
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
              A faster path from search to send.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/65">
              Give your team a cleaner operating rhythm: find better leads, assign them cleanly, and launch campaigns
              with confidence.
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
                Present a product that feels ready on day one.
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/65">
                ReachFlow combines a premium interface, secure backend behavior, controlled campaign workflows, and a
                clear operator experience buyers can trust.
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
