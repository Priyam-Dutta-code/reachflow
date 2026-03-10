"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const PLANS = [
  {
    id: "free", name: "Free", amount: 0, per: "/mo",
    features: ["100 leads/month", "50 emails/month", "Google Maps scraping", "AI email writing", "Basic analytics"],
  },
  {
    id: "pro", name: "Pro", amount: 999, per: "/mo", popular: true,
    features: ["1,000 leads/month", "500 emails/month", "All lead sources", "Follow-up automation", "Reply detection", "Full analytics"],
  },
  {
    id: "agency", name: "Agency", amount: 2999, per: "/mo",
    features: ["Unlimited leads", "2,000 emails/month", "Everything in Pro", "Priority support", "API access"],
  },
  {
    id: "lifetime", name: "Lifetime", amount: 9999, per: " once", badge: "Best Value",
    features: ["Everything in Agency", "Pay once — use forever", "All future features included", "Founder badge"],
  },
];

const CREDIT_PACK = { id: "credits_100", name: "100 Email Credits", amount: 199 };

declare global {
  interface Window { Cashfree: any; }
}

export default function PricingPage() {
  const [loading,    setLoading]    = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === "success") {
      const orderId = url.searchParams.get("order_id") || "";
      const plan    = url.searchParams.get("plan")     || "";
      if (orderId && plan) {
        apiFetch("/api/payments/verify", { method: "POST", body: JSON.stringify({ order_id: orderId, plan }) })
          .then(() => setSuccessMsg(`Payment confirmed! Your ${plan} plan is now active.`))
          .catch(e => setSuccessMsg(`Payment received — refresh to see your updated plan.`));
      }
      window.history.replaceState({}, "", "/pricing");
    }
    // Load Cashfree SDK
    const s = document.createElement("script");
    s.src   = "https://sdk.cashfree.com/js/v3/cashfree.js";
    document.head.appendChild(s);
  }, []);

  const checkout = async (planId: string) => {
    const supabase = (await import("@/lib/supabase")).createClient(); const { data: { session } } = await supabase.auth.getSession(); if (!session) { router.push("/login"); return; }
    if (planId === "free") { router.push("/dashboard"); return; }
    setLoading(planId);
    try {
      const order = await apiFetch("/api/payments/create-order", { method: "POST", body: JSON.stringify({ plan: planId }) });
      const cf    = window.Cashfree({ mode: order.cashfree_env === "PROD" ? "production" : "sandbox" });
      await cf.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget:   "_self",
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ background: "#07070d", color: "#e8e8f0", minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "white" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 12 }}>R</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 15 }}>ReachFlow</span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Dashboard →</Link>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: "clamp(30px,5vw,48px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 14 }}>Simple, honest pricing</h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.4)", maxWidth: 440, margin: "0 auto" }}>All plans include AI email writing, lead scraping and analytics. Pay in INR via UPI, cards or net banking.</p>
        </div>

        {successMsg && (
          <div style={{ maxWidth: 600, margin: "0 auto 32px", padding: "16px 20px", borderRadius: 14, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontSize: 14, textAlign: "center" }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginBottom: 48 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              borderRadius: 22, padding: 28,
              border: plan.popular ? "1.5px solid #7c3aed" : "1px solid rgba(255,255,255,0.08)",
              background: plan.popular ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.025)",
              display: "flex", flexDirection: "column", position: "relative",
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 99, whiteSpace: "nowrap" }}>Most Popular</div>
              )}
              {plan.badge && (
                <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#000", fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 99, whiteSpace: "nowrap" }}>{plan.badge}</div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 10 }}>{plan.name}</div>
                <div>
                  <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 34 }}>
                    {plan.amount === 0 ? "Free" : `₹${plan.amount.toLocaleString()}`}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{plan.per}</span>
                </div>
              </div>
              <ul style={{ listStyle: "none", flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                    <span style={{ color: "#a78bfa", flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => checkout(plan.id)} disabled={loading === plan.id} style={{
                width: "100%", padding: "12px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                opacity: loading === plan.id ? 0.6 : 1,
                background: plan.popular ? "#7c3aed" : "rgba(255,255,255,0.08)",
                color: plan.popular ? "#fff" : "#e8e8f0",
              }}>
                {loading === plan.id ? "Opening checkout…" : plan.amount === 0 ? "Get started free" : `Pay ₹${plan.amount.toLocaleString()}`}
              </button>
            </div>
          ))}
        </div>

        {/* Credit top-up */}
        <div style={{ maxWidth: 500, margin: "0 auto", borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Email Credit Top-up</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>100 additional emails · Never expires</div>
            </div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 22 }}>₹199</span>
          </div>
          <button onClick={() => checkout(CREDIT_PACK.id)} disabled={loading === CREDIT_PACK.id} style={{
            width: "100%", padding: "12px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 500,
            cursor: "pointer", fontFamily: "DM Sans, sans-serif", background: "rgba(255,255,255,0.08)", color: "#e8e8f0",
            opacity: loading === CREDIT_PACK.id ? 0.6 : 1,
          }}>
            {loading === CREDIT_PACK.id ? "Opening checkout…" : "Buy 100 credits for ₹199"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.22)", marginTop: 36 }}>
          Payments processed via Cashfree · UPI, GPay, PhonePe, Paytm, all cards, net banking
        </p>
      </div>
    </div>
  );
}
