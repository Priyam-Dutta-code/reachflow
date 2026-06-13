"use client";

/** Analytics — KPI row, funnel, hand-rolled SVG trend, proportion bars,
 * range filter, CSV export (leads + email log). Reconciles with dashboard:
 * same /analytics/overview payload. */
import { BarChart3, Download } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Bars } from "@/components/charts/Bars";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";
import { downloadCsv, toCsv } from "@/lib/csv";

type Overview = {
  total_leads: number;
  with_email: number;
  ready_to_send: number;
  sent: number;
  replied: number;
  bounced: number;
  follow_ups: number;
  reply_rate: number;
  credits_left: number;
  leads_quota: number;
  leads_used: number;
  daily_sends: { date: string; count: number }[];
  sources: { source: string; count: number }[];
  industries: { industry: string; count: number }[];
  funnel: { stage: string; count: number }[];
};

const RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

async function fetchAllPages<T>(path: string, key: string, cap = 1000): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const data = await apiFetch<{ total: number } & Record<string, unknown>>(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&per_page=100`
    );
    const batch = data[key] as T[];
    rows.push(...batch);
    if (rows.length >= Math.min(data.total, cap) || batch.length === 0) break;
    page += 1;
  }
  return rows.slice(0, cap);
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["days"]>(14);
  const [exporting, setExporting] = useState<"leads" | "log" | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<Overview>("/api/analytics/overview")
      .then(setData)
      .catch((error: Error) => toast(error.message, "error"));
  }, [user, toast]);

  async function exportLeads() {
    setExporting("leads");
    try {
      const rows = await fetchAllPages<Record<string, unknown>>("/api/leads/", "leads");
      downloadCsv(
        "reachflow-leads.csv",
        toCsv(rows, ["id", "name", "email", "company", "title", "location", "industry", "source", "status", "campaign_id", "created_at"])
      );
      toast(`Exported ${rows.length} leads.`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Export failed.", "error");
    } finally {
      setExporting(null);
    }
  }

  async function exportLog() {
    setExporting("log");
    try {
      const rows = await fetchAllPages<Record<string, unknown>>("/api/emails/log", "logs");
      downloadCsv(
        "reachflow-email-log.csv",
        toCsv(rows, ["id", "to_email", "subject", "status", "is_followup", "campaign_id", "lead_id", "sent_at"])
      );
      toast(`Exported ${rows.length} log entries.`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Export failed.", "error");
    } finally {
      setExporting(null);
    }
  }

  if (loading || !user || !data) {
    return (
      <AppShell>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  const hasAnyData = data.total_leads > 0 || data.sent > 0;
  const trend = data.daily_sends.slice(-range).map((d) => ({ label: d.date.slice(5), value: d.count }));
  const funnelMax = Math.max(...data.funnel.map((f) => f.count), 1);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Analytics"
          title="Read what's working"
          description="Lead coverage, send performance, and reply movement — the same numbers your dashboard shows."
          actions={
            <>
              <Button variant="secondary" size="sm" loading={exporting === "leads"} onClick={() => void exportLeads()}>
                <Download className="h-4 w-4" /> Leads CSV
              </Button>
              <Button variant="secondary" size="sm" loading={exporting === "log"} onClick={() => void exportLog()}>
                <Download className="h-4 w-4" /> Email log CSV
              </Button>
            </>
          }
        />

        {!hasAnyData ? (
          <EmptyState
            icon={BarChart3}
            title="No data to chart yet"
            description="Generate leads and run a campaign — every number here updates from real activity."
          />
        ) : (
          <>
            {/* KPI row */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Leads" value={data.total_leads} detail={`${data.with_email} with email`} />
              <Stat label="Sent" value={data.sent} detail={`${data.follow_ups} follow-ups`} />
              <Stat label="Reply rate" value={`${data.reply_rate}%`} detail={`${data.replied} replies`} />
              <Stat label="Bounced" value={data.bounced} detail={`${data.credits_left} credits left`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* funnel */}
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-ink">Funnel</h2>
                <div className="mt-4 space-y-4">
                  {data.funnel.map((stage) => (
                    <div key={stage.stage}>
                      <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                        <span className="font-medium text-ink-soft">{stage.stage}</span>
                        <span className="font-mono text-xs text-muted">{stage.count}</span>
                      </div>
                      <div className="h-5 overflow-hidden rounded-control bg-line/50">
                        <div
                          className="h-full rounded-control bg-accent transition-[width] duration-300"
                          style={{ width: `${Math.max((stage.count / funnelMax) * 100, stage.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* daily sends trend */}
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-ink">Daily sends</h2>
                  <div className="flex gap-1" role="group" aria-label="Date range">
                    {RANGES.map((option) => (
                      <button
                        key={option.days}
                        onClick={() => setRange(option.days)}
                        aria-pressed={range === option.days}
                        className={cn(
                          "rounded-control px-2.5 py-1.5 font-mono text-xs font-medium transition-colors",
                          range === option.days ? "bg-accent-tint text-accent-strong" : "text-muted hover:text-ink"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {trend.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-muted">No sends in this range yet.</p>
                ) : (
                  <div className="mt-4">
                    <Bars ariaLabel={`Daily emails sent, last ${range} days`} data={trend} />
                  </div>
                )}
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* source mix */}
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-ink">Source mix</h2>
                <div className="mt-4 space-y-3">
                  {data.sources.length === 0 ? (
                    <p className="text-sm text-muted">No sources yet.</p>
                  ) : (
                    data.sources.map((item) => (
                      <ProgressMeter
                        key={item.source}
                        label={item.source.replace(/_/g, " ")}
                        value={item.count}
                        max={data.total_leads}
                      />
                    ))
                  )}
                </div>
              </Card>

              {/* industries */}
              <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-ink">Top industries</h2>
                <div className="mt-4 space-y-3">
                  {data.industries.length === 0 ? (
                    <p className="text-sm text-muted">No industry data yet.</p>
                  ) : (
                    data.industries.map((item) => (
                      <ProgressMeter
                        key={item.industry}
                        label={item.industry}
                        value={item.count}
                        max={data.total_leads}
                      />
                    ))
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
