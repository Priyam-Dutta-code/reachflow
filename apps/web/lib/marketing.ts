/**
 * Marketing content. Honesty rule (master plan): every claim describes a real
 * capability; the showcase lead/email pairs are illustrative product output
 * with clearly fictional companies — never presented as customers or results.
 */
import type { VerticalId } from "@/lib/verticals";

export type Showcase = {
  /** the lead record half of the signature element */
  lead: {
    name: string;
    role: string;
    company: string;
    email: string;
    source: string;
    location: string;
  };
  /** the mono drafted-email half */
  draft: {
    subject: string;
    opening: string;
    body: string;
    cta: string;
  };
  /** three real steps shown under the switcher */
  steps: [string, string, string];
};

export const SHOWCASE: Record<VerticalId, Showcase> = {
  job_seeker: {
    lead: {
      name: "Hiring Team",
      role: "Talent acquisition",
      company: "Northline Systems",
      email: "careers@northlinesystems.com",
      source: "LinkedIn Jobs",
      location: "Bengaluru",
    },
    draft: {
      subject: "Backend engineer for your current hiring",
      opening: "Dear Hiring Team,",
      body: "Northline's open backend roles look aligned with the systems work I do best — I wanted to reach you directly rather than wait in an application queue.",
      cta: "Would you be open to pointing me to the right next step?",
    },
    steps: ["Track live hiring signals", "Surface reachable career inboxes", "Send a sharper first touch"],
  },
  recruiter: {
    lead: {
      name: "Nina Brooks",
      role: "Talent director",
      company: "Summit Grid",
      email: "talent@summitgrid.io",
      source: "Hiring signals",
      location: "Mumbai",
    },
    draft: {
      subject: "Recruiting support for your engineering hiring",
      opening: "Dear Nina,",
      body: "Summit Grid's hiring pattern over the last quarter suggests priority engineering roles. My desk closes searches like these with a tight, well-managed process.",
      cta: "Would a brief conversation make sense?",
    },
    steps: ["Map employer demand", "Prioritize reachable accounts", "Run recruiter-grade outreach"],
  },
  agency: {
    lead: {
      name: "Maya Patel",
      role: "Founder",
      company: "Kinetic Studio",
      email: "hello@kineticstudio.co",
      source: "Open Web",
      location: "Pune",
    },
    draft: {
      subject: "A practical growth idea for Kinetic Studio",
      opening: "Dear Maya,",
      body: "Kinetic's portfolio suggests you win on craft — the gap I usually see at this stage is a repeatable client pipeline that doesn't depend on referrals.",
      cta: "Open to a short note on the angle I have in mind?",
    },
    steps: ["Filter accounts by niche and market", "Enrich usable inboxes", "Send offer-led outreach"],
  },
  business_growth: {
    lead: {
      name: "Arjun Mehta",
      role: "Growth lead",
      company: "Vectorlane",
      email: "growth@vectorlane.ai",
      source: "Open Web",
      location: "Remote",
    },
    draft: {
      subject: "A faster outbound loop for Vectorlane",
      opening: "Dear Arjun,",
      body: "Teams at Vectorlane's stage usually lose a week per campaign to list building and tool glue. The whole discover-to-send loop can run in one place.",
      cta: "Worth a quick look at how that works?",
    },
    steps: ["Define market and offer", "Generate send-ready contacts", "Launch and track campaigns"],
  },
  partnerships: {
    lead: {
      name: "Lena Fox",
      role: "Partnerships manager",
      company: "Atlas Commerce",
      email: "partners@atlascommerce.com",
      source: "Ecosystem signals",
      location: "Gurugram",
    },
    draft: {
      subject: "Partnership idea that could fit both teams",
      opening: "Dear Lena,",
      body: "Atlas and the product I work on serve overlapping audiences without competing — the kind of fit that usually makes a co-selling or integration motion work.",
      cta: "Open to exchanging a short outline?",
    },
    steps: ["Map aligned partner profiles", "Find the right contact route", "Open relationship-first conversations"],
  },
};

export const CAPABILITIES = [
  {
    title: "One product, five motions",
    copy: "The workspace reshapes itself for job search, recruiting, agency growth, outbound sales, and partnerships — dashboards, lead generation, and email tone all follow the workflow you pick.",
  },
  {
    title: "Leads from named public sources",
    copy: "One generate action searches job boards, the open web, business listings, and optional Apollo, then enriches records with publicly available contact routes. Nothing is invented.",
  },
  {
    title: "Drafts that read like you wrote them",
    copy: "Vertical-aware AI drafting uses your sender profile and each lead's context. Plain text, specific subjects, no spam-bait vocabulary.",
  },
  {
    title: "Your Gmail, your deliverability",
    copy: "Sending runs through your own Gmail with an app password — your identity in every footer, your reputation under your control, working unsubscribe links built in.",
  },
  {
    title: "The full loop in one place",
    copy: "Discover, draft, assign, send, follow up, and track replies without stitching five tools together.",
  },
  {
    title: "Compliance as a feature",
    copy: "Every email carries sender identity and a working unsubscribe link. Suppression lists and bounce handling run before every send, automatically.",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Pick your workflow",
    copy: "Choose one of five motions at signup. Everything — copy, sources, drafting tone, pricing — adapts to it.",
  },
  {
    step: "02",
    title: "Generate focused leads",
    copy: "ReachFlow pulls from the right public signals for that workflow and returns records with usable contact routes.",
  },
  {
    step: "03",
    title: "Send and track",
    copy: "Preview vertical-aware drafts, attach leads to a campaign, and watch sends, follow-ups, and replies in one view.",
  },
] as const;

export const FAQ = [
  {
    q: "Where do the leads come from?",
    a: "Public sources — job boards (LinkedIn Jobs, Indeed, Naukri), open-web company pages, Google Maps listings, and optional Apollo — enriched with publicly available contact routes. ReachFlow surfaces what is already public; it never invents contact data.",
  },
  {
    q: "Do I need my own API keys or Gmail?",
    a: "You can explore and generate a sample without any setup. To send real email you connect a Gmail app password; AI drafting works out of the box and can use your own Groq key if you prefer.",
  },
  {
    q: "How does ReachFlow handle compliance?",
    a: "Every outbound email carries your sender identity and a working unsubscribe link. Unsubscribes and bounces are suppressed automatically before every future send, and daily sending caps apply per plan. You decide who to contact — the platform makes the compliant path the default.",
  },
  {
    q: "How is my data handled?",
    a: "Your leads, campaigns, and logs are scoped to your account. Sensitive credentials like Gmail app passwords and API keys are encrypted before storage and never shown back, even to you.",
  },
  {
    q: "Can I switch workflows later?",
    a: "Yes — change your vertical anytime in Settings. The dashboard, lead generation, drafting tone, and pricing reshape to the new motion.",
  },
  {
    q: "What does it cost?",
    a: "Every workflow has a free plan with a monthly lead quota and email credits. Paid plans raise quotas, add campaign slots, and unlock follow-up automation. No card needed to start.",
  },
] as const;

/** /for/* lander slugs ↔ vertical ids */
export const VERTICAL_SLUGS: Record<string, VerticalId> = {
  "job-seekers": "job_seeker",
  recruiters: "recruiter",
  agencies: "agency",
  "business-growth": "business_growth",
  partnerships: "partnerships",
};

export const SLUG_BY_VERTICAL: Record<VerticalId, string> = {
  job_seeker: "job-seekers",
  recruiter: "recruiters",
  agency: "agencies",
  business_growth: "business-growth",
  partnerships: "partnerships",
};
