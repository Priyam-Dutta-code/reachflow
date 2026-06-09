import type { Metadata } from "next";

import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReachFlow collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 2026">
      <LegalSection heading="Overview">
        <p>
          ReachFlow helps you discover publicly available business leads and run outreach campaigns. This policy
          explains what we store and how it is handled. It is a template and should be reviewed by counsel before use.
        </p>
      </LegalSection>
      <LegalSection heading="What we store">
        <p>
          Your account profile, the leads and campaigns you generate, email activity logs, and any credentials you
          choose to connect. Sensitive secrets — such as Gmail app passwords and API keys — are encrypted before they
          are stored.
        </p>
      </LegalSection>
      <LegalSection heading="Lead data">
        <p>
          Leads are assembled from public sources (company websites, job boards, mapping data, and optional third-party
          enrichment). ReachFlow surfaces information that is already publicly available and does not fabricate contact
          details.
        </p>
      </LegalSection>
      <LegalSection heading="Your choices">
        <p>
          Your data is scoped to your account. You can update your profile, disconnect integrations, or request
          deletion of your account and associated records.
        </p>
      </LegalSection>
      <LegalSection heading="Contact">
        <p>Questions about this policy can be sent to the address listed on your account workspace.</p>
      </LegalSection>
    </LegalLayout>
  );
}
