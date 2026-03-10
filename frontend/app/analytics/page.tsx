"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AnalyticsPage() {
  const [data,     setData]     = useState<any>(null);
  const [apiError, setApiError] = useState("");
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    apiFetch("/api/analytics/overview")
      .then(d => { setData(d); setApiError(""); })
      .catch(e => setApiError(e.message));
  }, [session]);

  const maxSend = Math.max(...(data?.daily_sends?.map((d: any) => d.count) ?? [1]), 1);

  const STATS = data ? [
    { label: "Total Leads", value: data.total_leads?.toLocaleString() ?? "0" },
    { label: "Emails Sent", value: data.sent?.toLocaleString()         ?? "0" },
    { label: "Replied",     value: data.replied ?? "0",   sub: `${data.reply_rate ?? 0}% rate` },
    { label: "Follow-ups",  value: data.follow_ups ?? "0" },
  ] : [];

  return (
    <Shell>
      <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 28 }}>Analytics</h1>

      {apiError && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: 13 }}>
          ⚠ {apiError} — Check <code>SUPABASE_JWT_SECRET</code> in backend <code>.env</code>
        </div>
      )}

      {!data && !apiError ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "rgba(255,255,255,0.18)", fontSize: 14 }}>Loading…</div>
      ) : data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 20 }}>
            {STATS.map(c => (
              <div key={c.label} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{c.label}</div>
                <div style={{ fontFamily: "Syne,sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{c.value}</div>
                {c.sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.33)" }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[
              { title: "Lead Sources", key: "sources",    nameKey: "source",   color: "linear-gradient(90deg,#7c3aed,#4f46e5)" },
              { title: "Industries",   key: "industries", nameKey: "industry", color: "linear-gradient(90deg,#4f46e5,#3b82f6)" },
            ].map(panel => (
              <div key={panel.key} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: 22 }}>
                <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 18 }}>{panel.title}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {data[panel.key]?.map((item: any) => {
                    const name = item[panel.nameKey] ?? "Unknown";
                    const pct  = data.total_leads > 0 ? Math.round(item.count / data.total_leads * 100) : 0;
                    return (
                      <div key={name}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{name.replace(/_/g, " ")}</span>
                          <span style={{ fontWeight: 500 }}>{item.count} <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 11 }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                          <div style={{ height: "100%", borderRadius: 99, background: panel.color, width: `${pct}%`, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                  {!data[panel.key]?.length && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>No data yet.</p>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 15 }}>Daily Sends — Last 30 Days</h2>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>Peak: {maxSend}/day</span>
            </div>
            {data.daily_sends?.length ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                  {data.daily_sends.map((d: any, i: number) => (
                    <div key={i} title={`${d.date}: ${d.count}`} style={{ flex: 1, height: Math.max(Math.round(d.count / maxSend * 80), 3), borderRadius: 3, background: `rgba(124,58,237,${0.25 + d.count / maxSend * 0.65})` }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
                  <span>{data.daily_sends[0]?.date}</span>
                  <span>{data.daily_sends[data.daily_sends.length - 1]?.date}</span>
                </div>
              </>
            ) : (
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14, padding: "40px 0" }}>No sends yet. Launch a campaign to see data here.</p>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
