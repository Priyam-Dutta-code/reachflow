"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const PLAN_BADGE: Record<string, string> = {
  free: "rgba(255,255,255,0.12)", pro: "rgba(124,58,237,0.35)",
  agency: "rgba(245,158,11,0.35)", lifetime: "rgba(16,185,129,0.35)",
};

export default function DashboardPage() {
  const [stats,    setStats]    = useState<any>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [apiError, setApiError] = useState("");
  const { session, user } = useAuth();

  useEffect(() => {
    if (!session) return;
    setApiError("");
    Promise.all([
      apiFetch("/api/analytics/overview"),
      apiFetch("/api/auth/me"),
    ])
      .then(([s, p]) => { setStats(s); setProfile(p); })
      .catch(e => setApiError(e.message));
  }, [session]);

  const CARDS = stats ? [
    { label: "Total Leads",  value: stats.total_leads?.toLocaleString() ?? "0", sub: `${stats.with_email ?? 0} have email` },
    { label: "Emails Sent",  value: stats.sent?.toLocaleString()         ?? "0", sub: `${stats.reply_rate ?? 0}% reply rate` },
    { label: "Replies",      value: stats.replied                        ?? "0", sub: `${stats.follow_ups ?? 0} follow-ups sent` },
    { label: "Credits Left", value: stats.credits_left                   ?? "0", sub: `${stats.leads_used ?? 0} / ${stats.leads_quota ?? 0} leads used` },
  ] : [];

  const ACTIONS = [
    { href: "/leads",     icon: "◎", label: "Generate Leads",  desc: "Scrape from Maps, LinkedIn, Naukri" },
    { href: "/campaigns", icon: "◈", label: "Launch Campaign", desc: "Send AI emails to your leads" },
    { href: "/analytics", icon: "◉", label: "View Analytics",  desc: "Stats, funnel, reply rates" },
  ];

  return (
    <Shell>
      {/* Backend config error — shown prominently but doesn't break the page */}
      {apiError && (
        <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>⚠ Backend API error</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>{apiError}</div>
          <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.7 }}>
            Most likely cause: <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>SUPABASE_JWT_SECRET</code> in your backend <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>.env</code> is missing or wrong.<br />
            Get it from: <strong>supabase.com → your project → Settings → API → JWT Settings → JWT Secret</strong>
          </div>
        </div>
      )}

      {/* Header — always show using Supabase user email as fallback */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
            Good to see you, {profile?.sender_name || user?.email?.split("@")[0] || "there"} 👋
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: PLAN_BADGE[profile?.plan ?? "free"], letterSpacing: "0.06em" }}>
            {(profile?.plan ?? "FREE").toUpperCase()}
          </span>
          <Link href="/pricing" style={{ padding: "7px 14px", borderRadius: 10, background: "#7c3aed", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>Upgrade</Link>
        </div>
      </div>

      {/* Stat cards — show zeros if backend is down */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        {(CARDS.length ? CARDS : [
          { label: "Total Leads",  value: "—", sub: "Generate leads to get started" },
          { label: "Emails Sent",  value: "—", sub: "" },
          { label: "Replies",      value: "—", sub: "" },
          { label: "Credits Left", value: "—", sub: "" },
        ]).map(c => (
          <div key={c.label} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", padding: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{c.label}</div>
            <div style={{ fontFamily: "Syne,sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Funnel — only show if we have data */}
      {stats?.funnel?.length > 0 && (
        <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: 24, marginBottom: 18 }}>
          <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Outreach Funnel</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {stats.funnel.map((f: any) => {
              const pct = stats.total_leads > 0 ? Math.round(f.count / stats.total_leads * 100) : 0;
              return (
                <div key={f.stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{f.stage}</span>
                    <span style={{ fontWeight: 500 }}>{f.count?.toLocaleString()} <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 11 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7c3aed,#4f46e5)", width: `${pct}%`, transition: "width 0.7s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions — always show */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {ACTIONS.map(a => (
          <Link key={a.href} href={a.href} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: 22, textDecoration: "none", color: "white", display: "block" }}>
            <div style={{ fontSize: 22, color: "#a78bfa", marginBottom: 12 }}>{a.icon}</div>
            <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 5 }}>{a.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.33)" }}>{a.desc}</div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
