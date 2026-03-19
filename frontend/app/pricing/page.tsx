"use client";

import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { apiFetch } from "@/lib/api";
import { DEFAULT_VERTICAL, VERTICAL_LIST, getVerticalConfig, normalizeVertical, type VerticalId } from "@/lib/verticals";

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function PricingPage() {
  const router = useRouter();
  const [selectedVertical, setSelectedVertical] = useState<VerticalId>(DEFAULT_VERTICAL);
  const [plans, setPlans] = useState<any[]>([]);
  const [creditPack, setCreditPack] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const vertical = getVerticalConfig(selectedVertical);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSelectedVertical(normalizeVertical(params.get("vertical")));
    }
  }, []);

  useEffect(() => {
    apiFetch(`/api/payments/plans?vertical=${selectedVertical}`)
      .then((data) => {
        setPlans(data.plans ?? []);
        setCreditPack(data.credits ?? null);
      })
      .catch(() => {
        setPlans([]);
        setCreditPack(null);
      });
  }, [selectedVertical]);

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
          .then(() => setMessage("Payment confirmed. Your workspace has been upgraded."))
          .catch(() => setMessage("Payment received. Refresh in a moment if your plan has not updated yet."));
      }
      window.history.replaceState({}, "", `/pricing?vertical=${selectedVertical}`);
    }
  }, [selectedVertical]);

  const activateFreePlan = async () => {
    const supabase = (await import("@/lib/supabase")).createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/signup?vertical=${selectedVertical}`);
      return;
    }

    setLoading("free");
    try {
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ vertical: selectedVertical }),
      });
      router.push("/dashboard");
    } catch (checkoutError: any) {
      setMessage(checkoutError.message);
    } finally {
      setLoading(null);
    }
  };

  const startCheckout = async (planId: string, amount: number) => {
    const supabase = (await import("@/lib/supabase")).createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/signup?vertical=${selectedVertical}`);
      return;
    }

    if (amount <= 0) {
      await activateFreePlan();
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
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-lg font-bold text-slate-950">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Pricing</div>
            </div>
          </Link>
          <Link href="/dashboard" className="secondary-button !px-5 !py-2.5">
            Return to app
          </Link>
        </div>
      </header>

      <section className="section-wrap">
        <Reveal>
          <div className="mx-auto max-w-4xl text-center">
            <div className="section-label justify-center">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cashfree-verified checkout
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
              {vertical.pricingHeadline}
            </h1>
            <p className="mt-5 text-base leading-8 text-white/65 md:text-lg">{vertical.pricingSummary}</p>
          </div>
        </Reveal>

        <div className="mt-10 overflow-x-auto pb-2">
          <div className="mx-auto flex min-w-max gap-3 md:min-w-0 md:flex-wrap md:justify-center">
            {VERTICAL_LIST.map((item) => (
              <button
                key={item.id}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selectedVertical === item.id
                    ? "border-[rgba(139,243,216,0.34)] bg-[rgba(139,243,216,0.14)] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                }`}
                onClick={() => setSelectedVertical(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm text-white/75">
            {message}
          </div>
        )}

        <div className="mt-12 grid gap-5 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 0.05}>
              <div className={`glass-card h-full p-6 ${plan.popular ? "border-[rgba(139,243,216,0.3)]" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{plan.name}</div>
                    <div className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
                      {plan.amount ? `Rs ${plan.amount}` : "Free"}
                    </div>
                    <div className="text-sm text-white/55">{plan.per}</div>
                  </div>
                  {plan.popular && (
                    <span className="rounded-full border border-[rgba(139,243,216,0.3)] bg-[rgba(139,243,216,0.14)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
                      Popular
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
                    {plan.leads_quota} leads / month
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
                    {plan.credits} email credits
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {plan.features.map((feature: string) => (
                    <div key={feature} className="flex items-start gap-3 text-sm leading-7 text-white/72">
                      <CheckCircle2 className="mt-1 h-4 w-4 text-[var(--accent)]" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/66">
                  Up to {plan.entitlements?.campaign_slots ?? 1} active campaigns, {plan.entitlements?.daily_send_cap ?? 25} sends per day
                  {plan.entitlements?.follow_up_automation ? ", automated follow-ups included." : ", manual follow-up workflow."}
                </div>

                <button
                  className={`mt-8 w-full ${plan.popular ? "primary-button" : "secondary-button"} !justify-center !py-3.5`}
                  disabled={loading === plan.id || loading === "free"}
                  onClick={() => startCheckout(plan.id, Number(plan.amount || 0))}
                  type="button"
                >
                  {loading === plan.id || (loading === "free" && Number(plan.amount || 0) <= 0)
                    ? "Opening..."
                    : Number(plan.amount || 0) > 0
                      ? `Choose ${plan.name}`
                      : "Activate starter"}
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
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">{creditPack.name}</h2>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Keep campaigns moving without changing plans when your team needs more sending capacity.
                </p>
              </div>
              <button
                className="primary-button w-full !justify-center sm:w-auto"
                disabled={loading === creditPack.id}
                onClick={() => startCheckout(creditPack.id, Number(creditPack.amount || 0))}
                type="button"
              >
                {loading === creditPack.id ? "Opening..." : `Buy for Rs ${creditPack.amount}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Reveal>
        )}
      </section>
    </div>
  );
}
