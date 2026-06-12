/** Changelog entries — newest first. Honest, shippable facts only. */
export type ChangelogEntry = {
  date: string; // YYYY-MM-DD
  title: string;
  items: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-06-12",
    title: "V2 rebuild underway",
    items: [
      "New light design system — one accent, hairline borders, mono email previews.",
      "Self-owned authentication with rotating sessions (Supabase removed).",
      "Lead generation now runs as background jobs with live progress.",
      "Compliance built in: unsubscribe links, suppression lists, and bounce handling on every send.",
      "Campaign sends are idempotent — a lead can never receive the same email twice.",
    ],
  },
  {
    date: "2025-12-01",
    title: "ReachFlow V1",
    items: [
      "Five-vertical workspace: job seekers, recruiters, agencies, business growth, partnerships.",
      "Multi-source lead generation with public-email enrichment.",
      "Vertical-aware AI email drafting and campaign sending via your own Gmail.",
    ],
  },
];
