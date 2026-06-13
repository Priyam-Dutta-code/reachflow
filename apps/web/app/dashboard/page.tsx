"use client";

/** Dashboard — real /analytics/overview data, quota meter with contextual
 * upgrade CTA, recent activity, per-vertical quick actions, mini trend. */
import { ArrowRight, BarChart3, Inbox, Megaphone, RefreshCw, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { FirstRunChecklist } from "@/components/FirstRunChecklist";
import { Bars } from "@/components/charts/Bars";
import { StatusPill } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";
import { getVerticalConfig, type VerticalId } from "@/lib/verticals";

type Overview = {
  total_leads: number;
  with_email: number;
  ready_to_send: number;
  sent: number;
  replied: number;
  reply_rate: number;
  follow_ups: number;
  credits_left: number;
  leads_quota: number;
  leads_used: number;
  active_campaigns: number;
  campaigns_count: number;
  daily_sends: { date: string; count: number }[];
};

type RecentLead = { id: number; name: string; company: string; email: string; status: string; created_at: string };
type RecentSend = { id: number; to_email: string; subject: string; status: string; is_followup: boolean; sent_at: string };

/** Per-vertical quick actions — the five flavors, unified visually. */
const QUICK_ACTIONS: Record<VerticalId, { label: string; href: string; icon: typeof Target }[]> = {
  job_seeker: [
    { label: "Find hiring companies", href: "/leads", icon: Target },
    { label: "Application campaign", href: "/campaigns", icon: Megaphone },
  ],
  recruiter: [
    { label: "Map employer demand", href: "/leads", icon: Target },
    { label: "Run a search campaign", href: "/campaigns", icon: Megaphone },
  ],
  agency: [
    { label: "Prospect client accounts", href: "/leads", icon: Target },
    { label: "Pitch campaign", href: "/campaigns", icon: Megaphone },
  ],
  business_growth: [
    { label: "Generate market leads", href: "/leads", icon: Target },
    { label: "Outbound campaign", href: "/campaigns", icon: Megaphone },
  ],
  partnerships: [
    { label: "Find partner accounts", href: "/leads", icon: Target },
    { label: "Relationship campaign", href: "/campaigns", icon: Megaphone },
  ],
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[] | null>(null);
  const [recentSends, setRecentSends] = useState<RecentSend[] | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<Overview>("/api/analytics/overview"),
      apiFetch<{ leads: RecentLead[] }>("/api/leads/?per_page=5"),
      apiFetch<{ logs: RecentSend[] }>("/api/emails/log?per_page=5"),
    ])
      .then(([data, leads, log]) => {
        setOverview(data);
        setRecentLeads(leads.leads);
        setRecentSends(log.logs);
      })
      .catch((error: Error) => toast(error.message, "error"));
  }, [user, toast]);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  const vertical = getVerticalConfig(user.vertical);
  const quotaRatio = user.leads_quota ? user.leads_used / user.leads_quota : 0;
  const actions = QUICK_ACTIONS[vertical.id];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={vertical.label}
          title={vertical.dashboardTitle}
          description={vertical.dashboardSummary}
          actions={
            <Link href="/leads" className={buttonClasses()}>
              Generate leads <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <FirstRunChecklist user={user} />

        {/* stats from the real overview payload */}
        {!overview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Leads" value={overview.total_leads} detail={`${overview.with_email} with email routes`} />
              <Stat label="Ready to send" value={overview.ready_to_send} detail="pending with an inbox" />
              <Stat label="Emails sent" value={overview.sent} detail={`${overview.follow_ups} follow-ups`} />
              <Stat label="Reply rate" value={`${overview.reply_rate}%`} detail={`${overview.replied} replies`} />
            </div>

            {/* quota + upgrade moment */}
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <ProgressMeter
                  className="min-w-0 flex-1"
                  label="Monthly lead quota"
                  value={overview.leads_used}
                  max={overview.leads_quota}
                />
                {quotaRatio >= 0.8 && (
                  <Link href={`/pricing?vertical=${user.vertical}`} className={buttonClasses({ size: "sm" })}>
                    {quotaRatio >= 1 ? "Quota reached — see plans" : "Running low — see plans"}
                  </Link>
                )}
              </div>
              <p className="mt-2 font-mono text-xs text-muted">
                {overview.credits_left} email credits · {overview.active_campaigns} active of {overview.campaigns_count} campaigns
              </p>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* recent activity */}
              <Card className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-ink">Recent leads</h2>
                  <Link href="/leads" className="text-sm font-medium text-accent hover:underline">
                    Lead Studio
                  </Link>
                </div>
                {recentLeads === null ? (
                  <div className="mt-3 divide-y divide-line">
                    <SkeletonRow /> <SkeletonRow /> <SkeletonRow />
                  </div>
                ) : recentLeads.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    className="mt-4"
                    title="No leads yet"
                    description="Run one focused generation to fill this feed."
                    action={
                      <Link href="/leads" className={buttonClasses({ size: "sm" })}>
                        Generate leads
                      </Link>
                    }
                  />
                ) : (
                  <ul className="mt-2 divide-y divide-line">
                    {recentLeads.map((lead) => (
                      <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{lead.name || lead.company}</p>
                          <p className="truncate font-mono text-xs text-muted">{lead.email || "no email"}</p>
                        </div>
                        <StatusPill status={lead.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* sends + trend */}
              <div className="flex flex-col gap-4">
                <Card className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold text-ink">Send trend</h2>
                    <Link href="/analytics" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                      <BarChart3 className="h-4 w-4" /> Analytics
                    </Link>
                  </div>
                  {overview.daily_sends.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Launch a campaign and daily sends will chart here.
                    </p>
                  ) : (
                    <div className="mt-3">
                      <Bars
                        ariaLabel="Daily emails sent"
                        data={overview.daily_sends.slice(-14).map((d) => ({ label: d.date.slice(5), value: d.count }))}
                      />
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h2 className="font-display text-lg font-semibold text-ink">Latest sends</h2>
                  {recentSends === null ? (
                    <div className="mt-3 divide-y divide-line">
                      <SkeletonRow /> <SkeletonRow />
                    </div>
                  ) : recentSends.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-muted">Nothing sent yet — your log starts with the first campaign.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line">
                      {recentSends.map((send) => (
                        <li key={send.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-ink">{send.subject}</p>
                            <p className="truncate font-mono text-xs text-muted">
                              {send.to_email} {send.is_followup ? "· follow-up" : ""}
                            </p>
                          </div>
                          <StatusPill status={send.status === "sent" ? "sent" : "bounced"} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>

            {/* per-vertical quick actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="card-hover flex items-center gap-3 rounded-card border border-line bg-surface p-4"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-accent-tint text-accent-strong">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink">{action.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {overview && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh data
          </button>
        )}
      </div>
    </AppShell>
  );
}
