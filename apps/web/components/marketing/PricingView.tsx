"use client";

/** Vertical-aware pricing wired to the live plans payload + Cashfree
 * checkout (Phase 4 API). Disabled-safe when payments aren't configured. */
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { ApiError, apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";
import { VERTICAL_LIST, getVerticalConfig, normalizeVertical, type VerticalId } from "@/lib/verticals";

type Plan = {
  id: string;
  name: string;
  amount: number;
  per: string;
  leads_quota: number;
  credits: number;
  popular?: boolean;
  features: string[];
  entitlements: {
    campaign_slots: number;
    daily_send_cap: number;
    follow_up_automation: boolean;
    reply_checks: boolean;
  };
};

type PlansPayload = { vertical: string; plans: Plan[]; credits: { id: string; name: string; amount: number; credits: number } };

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => { checkout: (options: object) => Promise<void> };
  }
}

function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment provider."));
    document.head.appendChild(script);
  });
}

const PRICING_FAQ = [
  {
    q: "What happens when I hit my lead quota?",
    a: "Generation pauses until the next cycle or an upgrade — your existing leads, campaigns, and data stay untouched.",
  },
  {
    q: "What are credits?",
    a: "One credit = one email send (first touches and follow-ups alike). Top-ups add credits without changing your plan.",
  },
  {
    q: "Can I change or cancel anytime?",
    a: "Yes. Plans are monthly; switching workflows or dropping back to Free keeps your account and data.",
  },
];

export function PricingView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vertical, setVertical] = useState<VerticalId>(
    normalizeVertical(searchParams.get("vertical"))
  );
  const [payload, setPayload] = useState<PlansPayload | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    setPayload(null);
    fetch(`/api/proxy/api/payments/plans?vertical=${vertical}`, { cache: "no-store" })
      .then((response) => response.json())
      .then(setPayload)
      .catch(() => toast("Could not load plans. Refresh to try again.", "error"));
  }, [vertical, toast]);

  // returning from Cashfree: ?payment=success&order_id&plan
  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;
    const orderId = searchParams.get("order_id");
    const plan = searchParams.get("plan");
    if (!orderId || !plan) return;
    apiFetch("/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, plan }),
    })
      .then(() => toast("Payment confirmed — your workspace has been upgraded.", "success"))
      .catch(() => toast("Payment received. If your plan hasn't updated, refresh in a moment.", "info"));
    window.history.replaceState({}, "", `/pricing?vertical=${vertical}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choosePlan(plan: Plan) {
    if (!user) {
      router.push(`/signup?vertical=${vertical}`);
      return;
    }
    setBusyPlan(plan.id);
    try {
      if (plan.amount <= 0) {
        await apiFetch("/api/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({ vertical }),
        });
        toast(`You're on ${plan.name}.`, "success");
        router.push("/dashboard");
        return;
      }
      const order = await apiFetch<{ payment_session_id: string; cashfree_env: string }>(
        "/api/payments/create-order",
        { method: "POST", body: JSON.stringify({ plan: plan.id }) }
      );
      await loadCashfreeSdk();
      const cashfree = window.Cashfree!({
        mode: order.cashfree_env === "PROD" ? "production" : "sandbox",
      });
      await cashfree.checkout({ paymentSessionId: order.payment_session_id, redirectTarget: "_self" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        toast("Payments aren't configured on this deployment yet — the free plan has you covered for now.", "info");
      } else {
        toast(error instanceof Error ? error.message : "Checkout failed. Try again.", "error");
      }
    } finally {
      setBusyPlan(null);
    }
  }

  const verticalConfig = getVerticalConfig(vertical);

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {verticalConfig.pricingHeadline}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted">{verticalConfig.pricingSummary}</p>
      </div>

      {/* vertical switcher */}
      <div className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
        {VERTICAL_LIST.map((item) => (
          <button
            key={item.id}
            onClick={() => setVertical(item.id)}
            aria-pressed={item.id === vertical}
            className={cn(
              "min-h-11 shrink-0 rounded-control border px-3.5 py-2 text-sm font-medium transition-colors",
              item.id === vertical
                ? "border-accent/30 bg-accent-tint text-accent-strong"
                : "border-line bg-surface text-ink-soft hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* plans */}
      {!payload ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {payload.plans.map((plan) => {
            const isFree = plan.amount <= 0;
            return (
              <Card
                key={plan.id}
                className={cn("flex flex-col p-6", (plan.popular || isFree) && "border-accent/40")}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink">{plan.name}</h2>
                  {isFree ? (
                    <Badge tone="accent">Start here</Badge>
                  ) : plan.popular ? (
                    <Badge tone="accent">Popular</Badge>
                  ) : null}
                </div>
                <p className="mt-3 font-display text-3xl font-semibold text-ink">
                  {isFree ? "Free" : `₹${plan.amount.toLocaleString("en-IN")}`}
                  {!isFree && <span className="text-sm font-normal text-muted">{plan.per}</span>}
                </p>
                <dl className="mt-4 space-y-1.5 border-y border-line py-3 font-mono text-[13px] text-ink-soft">
                  <div className="flex justify-between"><dt>Leads / month</dt><dd>{plan.leads_quota.toLocaleString("en-IN")}</dd></div>
                  <div className="flex justify-between"><dt>Email credits</dt><dd>{plan.credits.toLocaleString("en-IN")}</dd></div>
                  <div className="flex justify-between"><dt>Campaign slots</dt><dd>{plan.entitlements.campaign_slots}</dd></div>
                  <div className="flex justify-between"><dt>Daily send cap</dt><dd>{plan.entitlements.daily_send_cap}</dd></div>
                  <div className="flex justify-between"><dt>Auto follow-ups</dt><dd>{plan.entitlements.follow_up_automation ? "yes" : "—"}</dd></div>
                </dl>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[13px] leading-5 text-ink-soft">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isFree || plan.popular ? "primary" : "secondary"}
                  className="mt-5 w-full"
                  loading={busyPlan === plan.id}
                  onClick={() => choosePlan(plan)}
                >
                  {isFree ? "Activate free plan" : `Choose ${plan.name}`}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* top-up */}
      {payload && (
        <Card className="mt-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">{payload.credits.name}</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Keep campaigns moving without changing plans — credits stack on whatever you have.
            </p>
          </div>
          <Button
            variant="secondary"
            loading={busyPlan === payload.credits.id}
            onClick={() =>
              choosePlan({
                id: payload.credits.id,
                name: payload.credits.name,
                amount: payload.credits.amount,
                per: "",
                leads_quota: 0,
                credits: payload.credits.credits,
                features: [],
                entitlements: { campaign_slots: 0, daily_send_cap: 0, follow_up_automation: false, reply_checks: false },
              })
            }
          >
            Buy for ₹{payload.credits.amount.toLocaleString("en-IN")}
          </Button>
        </Card>
      )}

      {/* pricing FAQ snippet */}
      <section className="mt-16 max-w-2xl">
        <h2 className="font-display text-2xl font-semibold text-ink">Pricing questions</h2>
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {PRICING_FAQ.map((item) => (
            <details key={item.q} className="group p-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                {item.q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
        <a href="/#faq-heading" className={cn(buttonClasses({ variant: "ghost", size: "sm" }), "mt-4")}>
          More questions answered on the home page
        </a>
      </section>
    </div>
  );
}
