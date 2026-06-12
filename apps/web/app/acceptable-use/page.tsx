import type { Metadata } from "next";

import { LegalLayout, LegalSection } from "@/components/marketing/LegalLayout";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "What is and isn't allowed when sending outreach through ReachFlow.",
  alternates: { canonical: "/acceptable-use" },
};

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" updated="June 2026">
      <LegalSection heading="Purpose">
        <p>
          ReachFlow is for legitimate, relevant business outreach. This policy keeps the
          platform safe for senders and recipients alike.
        </p>
      </LegalSection>
      <LegalSection heading="You agree to">
        <p>
          Send relevant messages to a genuine business audience, honor opt-out requests promptly
          (the built-in unsubscribe handles this automatically), identify yourself truthfully,
          and respect sending limits and deliverability best practices.
        </p>
      </LegalSection>
      <LegalSection heading="You must not">
        <p>
          Send deceptive, harassing, or unlawful content; contact people in violation of
          applicable law; impersonate others; remove or tamper with unsubscribe links or sender
          identity; or use the platform to distribute malware, scams, or spam.
        </p>
      </LegalSection>
      <LegalSection heading="Enforcement">
        <p>
          We may rate-limit, suspend, or terminate accounts that violate this policy or generate
          excessive complaints or bounces.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
