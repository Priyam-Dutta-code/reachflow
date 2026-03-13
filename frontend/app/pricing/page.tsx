"use client";

import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Reveal } from "@/components/Reveal";
import { apiFetch } from "@/lib/api";

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [creditPack, setCreditPack] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/api/payments/plans")
      .then((data) => {
        setPlans(data.plans ?? []);
        setCreditPack(data.credits ?? null);
      })
      .catch(() => {
        setPlans([]);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const orderId = params.get("order_id") || "";
      const plan = params.get("plan") || "";
      if (orderId && plan) {
        apiFetch("/api/payments/verify", {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, plan }),
        })
          .then(() => setMessage(`Payment confirmed. ${plan} is now active.`))
          .catch(() => setMessage("Payment received. Refresh in a moment if your plan has not updated yet."));
      }
      window.history.replaceState({}, "", "/pricing");
    }
  }, []);

  const startCheckout = async (planId: string) => {
    const supabase = (await import("@/lib/supabase")).createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login?next=/pricing");
      return;
    }

    if (planId === "free") {
      router.push("/dashboard");
      return;
    }

    setLoading(planId);
    try {
      const order = await apiFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });

      const cashfree = window.Cashfree({
        mode: order.cashfree_env === "PROD" ? "production" : "sandbox",
      });

      await cashfree.checkout({
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_self",
      });
    } catch (checkoutError: any) {
      setMessage(checkoutError.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="app-shell">
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />

      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(4,8,20,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-lg font-bold text-slate-950">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Pricing</div>
            </div>
          </Link>
          <Link href="/dashboard" className="secondary-button">
            Return to app
          </Link>
        </div>
      </header>

      <section className="section-wrap">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="section-label justify-center">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cashfree-verified checkout
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold tracking-[-0.05em] md:text-6xl">
              Price the product like it deserves to ship.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/65 md:text-lg">
              Every paid plan keeps the lead engine, AI outreach workflow, analytics, and campaign controls in one
              polished workspace.
            </p>
          </div>
        </Reveal>

        {message && (
          <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm text-white/75">
            {message}
          </div>
        )}

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 0.05}>
              <div
                className={`glass-card h-full p-6 ${plan.popular ? "border-[rgba(139,243,216,0.3)]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{plan.name}</div>
                    <div className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
                      {plan.amount ? `₹${plan.amount}` : "Free"}
                    </div>
                    <div className="text-sm text-white/55">{plan.per}</div>
                  </div>
                  {plan.popular && (
                    <span className="rounded-full border border-[rgba(139,243,216,0.3)] bg-[rgba(139,243,216,0.14)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  {plan.features.map((feature: string) => (
                    <div key={feature} className="flex items-start gap-3 text-sm leading-7 text-white/72">
                      <CheckCircle2 className="mt-1 h-4 w-4 text-[var(--accent)]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  className={`mt-8 w-full ${plan.popular ? "primary-button" : "secondary-button"} !justify-center !py-3.5`}
                  disabled={loading === plan.id}
                  onClick={() => startCheckout(plan.id)}
                  type="button"
                >
                  {loading === plan.id ? "Opening..." : plan.amount ? `Choose ${plan.name}` : "Start free"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        {creditPack && (
          <Reveal>
            <div className="glass-card mt-8 flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="section-label !px-3 !py-1.5 !text-[10px]">Top-up</div>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
                  {creditPack.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Ideal when you want to keep sending without changing plans.
                </p>
              </div>
              <button className="primary-button" disabled={loading === creditPack.id} onClick={() => startCheckout(creditPack.id)} type="button">
                {loading === creditPack.id ? "Opening..." : `Buy for ₹${creditPack.amount}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Reveal>
        )}
      </section>
    </div>
  );
}
