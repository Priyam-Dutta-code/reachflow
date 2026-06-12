import type { Metadata } from "next";
import { Suspense } from "react";

import { PricingView } from "@/components/marketing/PricingView";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every ReachFlow workflow has a free plan. Paid plans raise lead quotas, add campaign slots and daily send capacity, and unlock follow-up automation. No card to start.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="bg-bg text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <Suspense>
          <PricingView />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
