"use client";

import { Activity, BarChart3, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      return;
    }

    apiFetch("/api/analytics/overview")
      .then((analytics) => {
        setData(analytics);
        setError("");
      })
      .catch((requestError: any) => setError(requestError.message));
  }, [session]);

  const maxDailySends = useMemo(
    () => Math.max(1, ...(data?.daily_sends?.map((item: any) => item.count) ?? [1])),
    [data]
  );

  const metrics = [
    { label: "Leads", value: data?.total_leads ?? 0, icon: Activity },
    { label: "Sent", value: data?.sent ?? 0, icon: Sparkles },
    { label: "Reply rate", value: `${data?.reply_rate ?? 0}%`, icon: TrendingUp },
    { label: "Credits", value: data?.credits_left ?? 0, icon: BarChart3 },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        <Reveal>
          <div>
            <div className="section-label">Analytics</div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              Read what is working across the pipeline.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              Track lead volume, sourcing quality, send performance, and reply movement so every next campaign is
              shaped by evidence instead of guesswork.
            </p>
          </div>
        </Reveal>

        {error && (
          <div className="rounded-[24px] border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-5 py-4 text-sm leading-7 text-[var(--danger)]">
            {error}
          </div>
        )}

        {!data && !error ? (
          <div className="glass-card p-10 text-sm text-white/60">Loading analytics...</div>
        ) : null}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Reveal key={metric.label} delay={index * 0.06}>
                    <div className="metric-card h-full">
                      <div className="flex items-center justify-between">
                        <div className="metric-label">{metric.label}</div>
                        <Icon className="h-4 w-4 text-[var(--accent)]" />
                      </div>
                      <div className="metric-value">{metric.value}</div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Reveal>
                <div className="glass-card p-6">
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Daily sends</div>
                  <div className="mt-5 flex flex-col gap-4">
                    <div className="flex h-60 items-end gap-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      {data.daily_sends?.length ? (
                        data.daily_sends.map((item: any) => (
                          <div key={item.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                            <div
                              className="w-full rounded-full bg-[linear-gradient(180deg,rgba(139,243,216,0.95),rgba(72,225,255,0.45))]"
                              style={{ height: `${Math.max(14, (item.count / maxDailySends) * 180)}px` }}
                              title={`${item.date}: ${item.count}`}
                            />
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                              {String(item.date).slice(5)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="m-auto text-sm text-white/45">Launch a campaign to start building performance data.</div>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="glass-card p-6">
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Source mix</div>
                  <div className="mt-5 space-y-4">
                    {(data.sources?.length ? data.sources : [{ source: "none", count: 0 }]).map((item: any) => {
                      const ratio = data.total_leads ? Math.min(Math.round((item.count / data.total_leads) * 100), 100) : 0;
                      return (
                        <div key={item.source} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm capitalize text-white/70">{item.source.replace(/_/g, " ")}</span>
                            <span className="text-sm text-white/55">{item.count}</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white/6">
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
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Reveal>
                <div className="glass-card p-6">
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Industries</div>
                  <div className="mt-5 space-y-4">
                    {(data.industries?.length ? data.industries : [{ industry: "No data yet", count: 0 }]).map(
                      (item: any) => (
                        <div key={item.industry} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-white/70">{item.industry}</span>
                            <span className="text-sm text-white/55">{item.count}</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="glass-card p-6">
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Funnel health</div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {data.funnel?.map((item: any) => {
                      const total = Math.max(data.total_leads || 0, 1);
                      const ratio = Math.min(Math.round((item.count / total) * 100), 100);
                      return (
                        <div key={item.stage} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <div className="text-xs uppercase tracking-[0.24em] text-white/45">{item.stage}</div>
                          <div className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">{item.count}</div>
                          <div className="mt-3 h-2 rounded-full bg-white/6">
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
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
