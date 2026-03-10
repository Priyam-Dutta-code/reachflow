"use client";
import Link from "next/link";

const S = {
  bg:       "#07070d",
  fg:       "#e8e8f0",
  muted:    "rgba(255,255,255,0.4)",
  dim:      "rgba(255,255,255,0.22)",
  border:   "1px solid rgba(255,255,255,0.08)",
  violet:   "#7c3aed",
  violetLt: "#a78bfa",
  card:     "rgba(255,255,255,0.028)",
};

const FEATURES = [
  { icon: "◎", title: "Multi-Source Lead Gen",   desc: "Scrape leads from Google Maps, LinkedIn, Naukri, Indeed and Apollo.io automatically." },
  { icon: "◈", title: "AI Email Writing",         desc: "Groq LLaMA writes hyper-personalised cold emails in your voice — never generic, never spammy." },
  { icon: "◉", title: "Follow-Up Automation",     desc: "Auto-sends follow-ups after 5 days. Detects replies via IMAP and stops the sequence." },
  { icon: "●", title: "Campaign Scheduling",      desc: "Set daily send limits and send times. Runs unattended in the background via Celery." },
  { icon: "◆", title: "Full Analytics",           desc: "Reply rates, funnel breakdown, daily send chart and industry heatmaps in one dashboard." },
  { icon: "◇", title: "INR Pricing with Cashfree", desc: "Accept payments via UPI, GPay, cards and net banking. No Stripe account needed." },
];

const STEPS = [
  { n: "1", title: "Generate Leads",   desc: "Pick a source, enter a search query — Google Maps, LinkedIn, Naukri. Leads scraped in minutes." },
  { n: "2", title: "Write with AI",    desc: "Groq LLaMA reads each lead's company and your profile, writes a tailored email for every lead." },
  { n: "3", title: "Launch Campaign",  desc: "Set emails/day, send time. ReachFlow sends, follows up, detects replies — all automatic." },
];

const TESTIMONIALS = [
  { name: "Priya S.",  role: "Frontend Engineer",  text: "Got 3 interviews in week 1. The emails felt personal — no one guessed they were AI-written." },
  { name: "Karan M.",  role: "DevOps Engineer",     text: "11% reply rate from cold outreach. Better than anything I tried before." },
  { name: "Arjun R.",  role: "Full Stack Engineer", text: "Set it up in 20 mins. The follow-up automation alone is worth the subscription." },
];

export default function LandingPage() {
  return (
    <div style={{ background: S.bg, color: S.fg, fontFamily: "DM Sans, sans-serif", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: S.border, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13 }}>R</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15 }}>ReachFlow</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/login"  style={{ padding: "8px 16px", borderRadius: 10, textDecoration: "none", color: S.muted, fontSize: 14 }}>Log in</Link>
          <Link href="/signup" style={{ padding: "8px 18px", borderRadius: 10, background: S.violet, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-60%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: S.violetLt, fontSize: 12, fontWeight: 500, marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.violetLt, display: "inline-block" }} />
          AI-powered cold outreach for Indian job seekers
        </div>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(36px,6vw,68px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 24, maxWidth: 800, margin: "0 auto 24px" }}>
          Land interviews on{" "}
          <span style={{ background: "linear-gradient(90deg,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            autopilot
          </span>
        </h1>
        <p style={{ fontSize: 18, color: S.muted, maxWidth: 520, margin: "0 auto 44px", lineHeight: 1.65 }}>
          ReachFlow scrapes leads, writes AI cold emails in your voice, sends them and follows up — all while you sleep.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{ padding: "16px 36px", borderRadius: 12, background: S.violet, color: "#fff", textDecoration: "none", fontSize: 16, fontWeight: 600, boxShadow: "0 8px 32px rgba(124,58,237,0.3)" }}>Start free →</Link>
          <Link href="/pricing" style={{ padding: "16px 36px", borderRadius: 12, border: S.border, color: S.fg, textDecoration: "none", fontSize: 16 }}>See pricing</Link>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: S.dim }}>Free plan — no credit card needed</p>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 48 }}>Everything you need to get hired</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: 28, borderRadius: 18, border: S.border, background: S.card, transition: "border-color 0.2s" }}>
              <div style={{ fontSize: 24, color: S.violetLt, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: S.muted, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 100px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 32, fontWeight: 700, marginBottom: 52 }}>How it works</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ display: "flex", gap: 20, textAlign: "left", alignItems: "flex-start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 17, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: S.muted, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px" }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 48 }}>What users say</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ padding: 28, borderRadius: 18, border: S.border, background: S.card }}>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: S.fg, marginBottom: 20 }}>"{t.text}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: S.violet, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: S.dim }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "80px 24px 100px" }}>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 16 }}>Start reaching out today</h2>
        <p style={{ color: S.muted, fontSize: 16, marginBottom: 36 }}>Free plan · No card needed · Setup in 15 minutes</p>
        <Link href="/signup" style={{ padding: "16px 44px", borderRadius: 12, background: S.violet, color: "#fff", textDecoration: "none", fontSize: 16, fontWeight: 600, boxShadow: "0 8px 32px rgba(124,58,237,0.3)" }}>
          Get started free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: S.border, padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: S.dim, fontSize: 13 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>R</div>
          ReachFlow — AI outreach for engineers
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Pricing", "Login"].map(l => (
            <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: 13, color: S.dim, textDecoration: "none" }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
