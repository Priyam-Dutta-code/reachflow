import type { Metadata } from "next";

import { LegalLayout, LegalSection } from "@/components/marketing/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReachFlow collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 2026">
      <LegalSection heading="Overview">
        <p>
          ReachFlow helps you discover publicly available business leads and run outreach
          campaigns. This policy explains what we store and how it is handled.
        </p>
      </LegalSection>
      <LegalSection heading="What we store">
        <p>
          Your account profile and sender identity, the leads and campaigns you generate, email
          activity logs (including what was sent and to whom), and any credentials you choose to
          connect. Sensitive secrets — Gmail app passwords and API keys — are encrypted before
          they are stored and are never displayed back, even to you. Passwords are hashed with a
          modern algorithm (argon2id) and cannot be recovered, only reset.
        </p>
      </LegalSection>
      <LegalSection heading="Lead data">
        <p>
          Leads are assembled from public sources — company websites, job boards, business
          listings, and optional third-party enrichment. ReachFlow surfaces information that is
          already publicly available and does not fabricate contact details. Recipients of your
          emails can unsubscribe with one click; suppressed addresses are never emailed again
          from your account.
        </p>
      </LegalSection>
      <LegalSection heading="Cookies & sessions">
        <p>
          We use a single, strictly necessary session cookie to keep you signed in. No
          third-party advertising trackers run on this site.
        </p>
      </LegalSection>
      <LegalSection heading="Your choices">
        <p>
          Your data is scoped to your account. You can update your profile, disconnect
          integrations at any time, sign out of all sessions, or request deletion of your
          account and associated records via the contact address below.
        </p>
      </LegalSection>
      <LegalSection heading="Contact">
        <p>
          Questions about this policy: <a className="text-accent underline" href="mailto:hello@reachflow.app">hello@reachflow.app</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
