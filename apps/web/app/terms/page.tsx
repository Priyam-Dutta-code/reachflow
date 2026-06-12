import type { Metadata } from "next";

import { LegalLayout, LegalSection } from "@/components/marketing/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of ReachFlow.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 2026">
      <LegalSection heading="Using ReachFlow">
        <p>
          By creating an account you agree to use ReachFlow lawfully and in line with these
          terms and the Acceptable Use Policy.
        </p>
      </LegalSection>
      <LegalSection heading="Your responsibilities">
        <p>
          You are responsible for the outreach you send: the contacts you choose to email, the
          content of your messages, and compliance with the cold-email, anti-spam, and
          data-protection rules that apply in your region and your recipients&apos; regions.
          Sending runs through your own connected inbox under your identity.
        </p>
      </LegalSection>
      <LegalSection heading="Compliance features">
        <p>
          ReachFlow adds your sender identity and a working unsubscribe link to every outbound
          email, automatically suppresses unsubscribed and bounced addresses, and enforces daily
          sending caps. These features must not be circumvented.
        </p>
      </LegalSection>
      <LegalSection heading="Plans and billing">
        <p>
          Paid plans and credit top-ups are billed through our payment provider. Free plans
          remain available with reduced quotas. Plan entitlements are described on the pricing
          page. Fees already paid are non-refundable except where required by law.
        </p>
      </LegalSection>
      <LegalSection heading="Suspension">
        <p>
          We may rate-limit or suspend accounts that violate these terms, generate excessive
          complaints or bounces, or put the platform&apos;s deliverability at risk.
        </p>
      </LegalSection>
      <LegalSection heading="Changes">
        <p>Material changes to these terms will be reflected by the “last updated” date above.</p>
      </LegalSection>
    </LegalLayout>
  );
}
