"use client";

import { ArrowRight, BarChart3, Mail, Settings2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SETUP_LABELS: Record<string, string> = {
  sender_profile: "Add your sender identity",
  sender_email: "Confirm the sender email",
  gmail_connection: "Connect Gmail app password",
  ai_personalization: "Add sender context or Groq key",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const { session, user } = useAuth();

  useEffect(() => {
    if (!session) {
      return;
    }

    Promise.all([apiFetch("/api/analytics/overview"), apiFetch("/api/auth/me")])
      .then(([analytics, me]) => {
        setStats(analytics);
        setProfile(me);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [session]);

  const actionCards = [
    {
      href: "/leads",
      icon: Target,
      title: "Generate leads",
      description: "Choose a source, attach the results to a campaign, and build the next batch.",
    },
    {
      href: "/campaigns",
      icon: Sparkles,
      title: "Launch campaigns",
      description: "Review eligible leads, trigger sending, and keep follow-up timing under control.",
    },
    {
      href: "/analytics",
      icon: BarChart3,
      title: "Read the funnel",
      description: "See lead volume, email coverage, sent volume, and reply performance in one view.",
    },
  ];

  const setupItems = (profile?.missing_setup ?? []).map((item: string) => SETUP_LABELS[item] ?? item);
  const cards = [
    {
      label: "Total leads",
      value: stats?.total_leads?.toLocaleString() ?? "0",
      detail: `${stats?.with_email ?? 0} with email`,
    },
    {
      label: "Emails sent",
      value: stats?.sent?.toLocaleString() ?? "0",
      detail: `${stats?.reply_rate ?? 0}% reply rate`,
    },
    {
      label: "Replies",
      value: stats?.replied?.toLocaleString() ?? "0",
      detail: `${stats?.follow_ups ?? 0} follow-ups sent`,
    },
    {
      label: "Credits left",
      value: stats?.credits_left?.toLocaleString() ?? "0",
      detail: `${stats?.leads_used ?? 0} / ${stats?.leads_quota ?? 0} leads used`,
    },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        <Reveal>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="section-label">Overview</div>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Welcome back, {profile?.sender_name || user?.email?.split("@")[0] || "operator"}.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                The dashboard now centers the actual work: configure the sender, generate leads into campaigns, preview
                the AI output, and monitor results without leaving the workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/settings" className="secondary-button">
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
              <Link href="/pricing" className="primary-button">
                Upgrade plan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        {error && (
          <div className="rounded-[24px] border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-5 py-4 text-sm leading-7 text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, index) => (
            <Reveal key={card.label} delay={index * 0.06}>
              <div className="metric-card h-full">
                <div className="metric-label">{card.label}</div>
                <div className="metric-value">{card.value}</div>
                <div className="mt-3 text-sm text-white/55">{card.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="glass-card h-full p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Setup checklist</div>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
                    {setupItems.length ? "A few things still need attention." : "Workspace is ready to run."}
                  </h2>
                </div>
                <Mail className="hidden h-8 w-8 text-[var(--accent)] md:block" />
              </div>

              <div className="mt-6 space-y-3">
                {(setupItems.length ? setupItems : ["Sender profile is configured", "AI personalization is ready", "Campaign workflows can be launched"]).map(
                  (item: string) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72"
                    >
                      <div className={`h-2.5 w-2.5 rounded-full ${setupItems.length ? "bg-[var(--accent-warm)]" : "bg-[var(--success)]"}`} />
                      {item}
                    </div>
                  )
                )}
              </div>

              <Link href="/settings" className="secondary-button mt-6">
                Manage sender setup
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="glass-card h-full p-6">
              <div className="section-label !px-3 !py-1.5 !text-[10px]">Quick actions</div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {actionCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="glow-border rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(139,243,216,0.2),rgba(72,225,255,0.18))] text-[var(--accent)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-5 font-display text-xl font-semibold tracking-[-0.04em]">{card.title}</div>
                      <p className="mt-3 text-sm leading-7 text-white/65">{card.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>

        {stats?.funnel?.length > 0 && (
          <Reveal>
            <div className="glass-card p-6">
              <div className="section-label !px-3 !py-1.5 !text-[10px]">Outreach funnel</div>
              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                {stats.funnel.map((item: any) => {
                  const total = Math.max(stats.total_leads || 0, 1);
                  const ratio = Math.min(Math.round((item.count / total) * 100), 100);
                  return (
                    <div key={item.stage} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                      <div className="text-xs uppercase tracking-[0.24em] text-white/45">{item.stage}</div>
                      <div className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">{item.count}</div>
                      <div className="mt-4 h-2 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)]"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </Shell>
  );
}
