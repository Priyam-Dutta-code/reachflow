import type { Metadata } from "next";

import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of ReachFlow.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 2026">
      <LegalSection heading="Using ReachFlow">
        <p>
          By creating an account you agree to use ReachFlow lawfully and in line with these terms. This document is a
          template and should be reviewed by counsel before you rely on it.
        </p>
      </LegalSection>
      <LegalSection heading="Your responsibilities">
        <p>
          You are responsible for the outreach you send, the contacts you choose to email, and complying with the
          cold-email, anti-spam, and data-protection rules that apply in your region and your recipients&apos; regions.
        </p>
      </LegalSection>
      <LegalSection heading="Plans and billing">
        <p>
          Paid plans and credit top-ups are billed through our payment provider. Free plans remain available with
          reduced quotas. Plan entitlements are described on the pricing page.
        </p>
      </LegalSection>
      <LegalSection heading="Acceptable use">
        <p>
          Your use must also follow our Acceptable Use Policy. We may suspend accounts that send abusive, deceptive, or
          unlawful messages.
        </p>
      </LegalSection>
      <LegalSection heading="Changes">
        <p>We may update these terms; material changes will be reflected by the “last updated” date above.</p>
      </LegalSection>
    </LegalLayout>
  );
}
