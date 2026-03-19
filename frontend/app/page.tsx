"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Handshake,
  Radar,
  ShieldCheck,
  Users2,
} from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/Reveal";
import { VERTICAL_LIST, type VerticalId } from "@/lib/verticals";

const ICONS: Record<VerticalId, typeof GraduationCap> = {
  job_seeker: GraduationCap,
  recruiter: Users2,
  agency: BriefcaseBusiness,
  business_growth: Building2,
  partnerships: Handshake,
};

const PLATFORM_POINTS = [
  {
    title: "One button, multi-source lead generation",
    description: "ReachFlow decides which public sources to use based on the vertical you choose, then returns send-ready records instead of raw scraping noise.",
  },
  {
    title: "Vertical-specific dashboards",
    description: "Job seekers see interview-focused workflows. Recruiters, agencies, growth teams, and partnership leads each get their own operating view.",
  },
  {
    title: "Outreach that matches the motion",
    description: "Cold emails, subjects, and follow-ups adapt to whether the user is applying for roles, recruiting talent, closing clients, or opening partnerships.",
  },
];

export default function LandingPage() {
  return (
    <div className="app-shell overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(12,17,26,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] font-display text-lg font-semibold text-white">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Vertical outbound OS</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/pricing" className="nav-chip">
              Pricing
            </Link>
            <Link href="/login" className="nav-chip">
              Log in
            </Link>
            <Link href={`/signup?vertical=business_growth`} className="primary-button">
              Start workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-grid !grid-cols-1 !gap-8 pb-10">
        <Reveal>
          <div className="mx-auto max-w-4xl text-center">
            <div className="section-label justify-center">
              <ShieldCheck className="h-3.5 w-3.5" />
              Lead generation and cold email, adapted to the customer
            </div>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
              Different buyers.
              <span className="block text-[var(--accent-strong)]">Different dashboards.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              ReachFlow is a vertical-aware outbound platform. Choose the motion first, then let the product generate the
              right leads, the right copy, and the right workflow for that customer.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-card overflow-hidden p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-2">
                {VERTICAL_LIST.map((vertical, index) => {
                  const Icon = ICONS[vertical.id];
                  return (
                    <motion.div
                      key={vertical.id}
                      className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, duration: 0.45 }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--accent)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                          {vertical.tag}
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{vertical.label}</div>
                        <div className="mt-2 text-sm uppercase tracking-[0.22em] text-white/40">{vertical.audience}</div>
                        <p className="mt-4 text-sm leading-7 text-white/67">{vertical.landingSummary}</p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {vertical.landingBullets.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/62"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link href={`/signup?vertical=${vertical.id}`} className="primary-button !px-5 !py-2.5">
                          Choose {vertical.label}
                        </Link>
                        <Link href={`/pricing?vertical=${vertical.id}`} className="secondary-button !px-5 !py-2.5">
                          View plans
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="glass-card p-6 md:p-8">
                <div className="section-label !px-3 !py-1.5 !text-[10px]">How it works</div>
                <div className="mt-5 space-y-4">
                  {[
                    { step: "01", title: "Choose the vertical", copy: "The product reshapes itself around the customer motion before any dashboard loads." },
                    { step: "02", title: "Generate leads", copy: "A single workflow pulls from the right public sources for that use case and returns send-ready contacts." },
                    { step: "03", title: "Launch outreach", copy: "Campaigns, copy, pacing, and analytics follow the chosen vertical instead of using a generic template." },
                  ].map((item) => (
                    <div key={item.step} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                      <div className="text-xs uppercase tracking-[0.24em] text-white/42">{item.step}</div>
                      <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</div>
                      <p className="mt-3 text-sm leading-7 text-white/66">{item.copy}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-3">
                  <Radar className="h-5 w-5 text-[var(--accent)]" />
                  <div className="font-display text-2xl font-semibold tracking-[-0.04em]">Built to sell by outcome</div>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/66">
                  Instead of one generic SaaS promise, ReachFlow can be sold as a job-search engine, a recruiter desk,
                  a client-acquisition tool, a growth workflow, or a partnership platform.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section-wrap pt-6">
        <Reveal>
          <div className="max-w-3xl">
            <div className="section-label">Why it converts</div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              The product feels like it was built for the buyer in front of it.
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLATFORM_POINTS.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="glass-card h-full p-6">
                <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{item.title}</div>
                <p className="mt-4 text-sm leading-7 text-white/67">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
