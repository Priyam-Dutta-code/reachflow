export type VerticalId =
  | "job_seeker"
  | "recruiter"
  | "agency"
  | "business_growth"
  | "partnerships";

export type VerticalConfig = {
  id: VerticalId;
  label: string;
  audience: string;
  tag: string;
  landingHeadline: string;
  landingSummary: string;
  landingBullets: string[];
  dashboardTitle: string;
  dashboardSummary: string;
  dashboardAccent: string;
  leadTitle: string;
  leadSummary: string;
  leadInputs: {
    queryLabel: string;
    queryPlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    industryLabel: string;
    industryPlaceholder: string;
    audienceLabel: string;
    audiencePlaceholder: string;
    offerLabel: string;
    offerPlaceholder: string;
    goalLabel: string;
    goalPlaceholder: string;
  };
  pricingHeadline: string;
  pricingSummary: string;
};

export const DEFAULT_VERTICAL: VerticalId = "business_growth";

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  job_seeker: {
    id: "job_seeker",
    label: "Job Seekers",
    audience: "Students and professionals",
    tag: "Career",
    landingHeadline: "Find hiring companies, real inboxes, and better first-touch application emails.",
    landingSummary:
      "Built for students and professionals who want targeted hiring signals, contact routes, and polished outreach instead of another crowded job board.",
    landingBullets: ["Hiring-company discovery", "Career inbox enrichment", "Application email drafting"],
    dashboardTitle: "Your job search control room",
    dashboardSummary:
      "Track hiring-company coverage, ready-to-send application leads, and the outreach actions most likely to move you toward interviews.",
    dashboardAccent: "Interview pipeline",
    leadTitle: "Generate hiring-company leads",
    leadSummary:
      "ReachFlow searches live hiring signals and public company pages to return application-ready company contacts for the roles you want.",
    leadInputs: {
      queryLabel: "Role or target title",
      queryPlaceholder: "Software Engineer, Product Designer, Data Analyst",
      locationLabel: "Preferred market",
      locationPlaceholder: "Bengaluru, Remote, Mumbai",
      industryLabel: "Target domain",
      industryPlaceholder: "Fintech, SaaS, Healthtech",
      audienceLabel: "Target company type",
      audiencePlaceholder: "Startups, enterprise teams, product companies",
      offerLabel: "Profile angle",
      offerPlaceholder: "Backend engineering, product-led growth, brand strategy",
      goalLabel: "Search goal",
      goalPlaceholder: "Find teams actively hiring for backend roles",
    },
    pricingHeadline: "Plans for faster interview pipelines",
    pricingSummary:
      "Choose the level that matches how aggressively you want to source hiring companies, run outreach, and follow up on opportunities.",
  },
  recruiter: {
    id: "recruiter",
    label: "Recruiters",
    audience: "Recruiters and staffing teams",
    tag: "Recruiting",
    landingHeadline: "Map hiring demand faster and reach employer accounts with sharper recruiter outreach.",
    landingSummary:
      "Designed for recruiters and staffing firms that need hiring-company discovery, employer contact routes, and clean outreach sequences.",
    landingBullets: ["Hiring-market radar", "Employer account discovery", "Recruiter outreach drafts"],
    dashboardTitle: "Your hiring-market desk",
    dashboardSummary:
      "Monitor employer demand, send-ready hiring accounts, and active search campaigns from a workspace built around recruiter outcomes.",
    dashboardAccent: "Talent demand",
    leadTitle: "Generate hiring accounts",
    leadSummary:
      "ReachFlow combines hiring signals and public company discovery to surface employer accounts relevant to your search desk or staffing niche.",
    leadInputs: {
      queryLabel: "Role family or hiring focus",
      queryPlaceholder: "Sales hires, engineering leaders, customer success",
      locationLabel: "Hiring market",
      locationPlaceholder: "India, APAC, Bengaluru",
      industryLabel: "Placement niche",
      industryPlaceholder: "B2B SaaS, healthcare, consumer internet",
      audienceLabel: "Target employer type",
      audiencePlaceholder: "Seed startups, enterprise, GCCs",
      offerLabel: "Search angle",
      offerPlaceholder: "Permanent hiring, contract staffing, executive search",
      goalLabel: "Search objective",
      goalPlaceholder: "Find employer accounts hiring product managers",
    },
    pricingHeadline: "Plans for search desks and staffing teams",
    pricingSummary:
      "Scale from a lean recruiting desk to a multi-search operation with higher lead pools, campaign capacity, and reply automation.",
  },
  agency: {
    id: "agency",
    label: "Agencies",
    audience: "Agencies and consultants",
    tag: "Agency",
    landingHeadline: "Build cleaner client pipelines with account discovery and outbound that feels bespoke.",
    landingSummary:
      "Made for agencies, freelancers, and consultants selling services into defined markets and wanting a better client-acquisition system.",
    landingBullets: ["Client prospecting", "Local and web discovery", "Agency-style outreach copy"],
    dashboardTitle: "Your client pipeline studio",
    dashboardSummary:
      "See target markets, active prospecting campaigns, and send-ready accounts in a layout designed for service-led growth.",
    dashboardAccent: "Client acquisition",
    leadTitle: "Generate client-fit accounts",
    leadSummary:
      "ReachFlow looks across the open web and local business listings to find accounts that match your niche, geography, and service offer.",
    leadInputs: {
      queryLabel: "Service or specialty",
      queryPlaceholder: "SEO agency, design studio, paid ads, RevOps consulting",
      locationLabel: "Target market",
      locationPlaceholder: "Kolkata, India, UAE, Remote",
      industryLabel: "Ideal client niche",
      industryPlaceholder: "D2C, SaaS, healthcare, local businesses",
      audienceLabel: "Decision-maker target",
      audiencePlaceholder: "Founders, CMOs, growth heads",
      offerLabel: "Offer angle",
      offerPlaceholder: "Lead generation, brand redesign, paid acquisition",
      goalLabel: "Prospecting objective",
      goalPlaceholder: "Find e-commerce brands that need paid growth support",
    },
    pricingHeadline: "Plans for agencies and consultants",
    pricingSummary:
      "Match your plan to the number of markets, campaigns, and clients you need to run at the same time.",
  },
  business_growth: {
    id: "business_growth",
    label: "Business Growth",
    audience: "Growth, sales, and marketing teams",
    tag: "Growth",
    landingHeadline: "Turn target markets into email-ready outbound lists without stacking five different tools.",
    landingSummary:
      "Built for growth, sales, and marketing teams that want smarter account discovery, contact enrichment, and campaign control.",
    landingBullets: ["Market discovery", "Email-ready accounts", "Growth outreach workflows"],
    dashboardTitle: "Your revenue workflow desk",
    dashboardSummary:
      "Measure lead coverage, send readiness, and campaign momentum across the markets you are actively trying to win.",
    dashboardAccent: "Revenue motion",
    leadTitle: "Generate market-fit leads",
    leadSummary:
      "ReachFlow searches the open web, public company signals, and local business data to return sales-ready accounts for the market you want to win.",
    leadInputs: {
      queryLabel: "Offer or campaign theme",
      queryPlaceholder: "Performance marketing, AI automation, CRM migration",
      locationLabel: "Target geography",
      locationPlaceholder: "India, US, Middle East, Remote",
      industryLabel: "Ideal customer segment",
      industryPlaceholder: "B2B SaaS, clinics, e-commerce brands",
      audienceLabel: "Buyer profile",
      audiencePlaceholder: "Founders, marketing heads, operations leaders",
      offerLabel: "Core value proposition",
      offerPlaceholder: "Lower CAC, faster inbound handling, outbound SDR support",
      goalLabel: "Growth objective",
      goalPlaceholder: "Find B2B SaaS teams likely to need outbound automation",
    },
    pricingHeadline: "Plans for outbound and growth teams",
    pricingSummary:
      "Choose a plan based on the lead volume, campaign count, and send capacity your revenue motion needs each month.",
  },
  partnerships: {
    id: "partnerships",
    label: "Partnerships",
    audience: "Founders and partnership teams",
    tag: "Partnerships",
    landingHeadline: "Build partner pipelines with better-fit accounts and more credible relationship outreach.",
    landingSummary:
      "Created for founders, partnerships leads, and business development teams sourcing affiliates, integrations, and strategic relationships.",
    landingBullets: ["Partner discovery", "Strategic account mapping", "Partnership outreach drafts"],
    dashboardTitle: "Your alliance pipeline board",
    dashboardSummary:
      "Track partner discovery, relationship-ready accounts, and the outreach motions most likely to open strategic conversations.",
    dashboardAccent: "Alliance motion",
    leadTitle: "Generate partnership targets",
    leadSummary:
      "ReachFlow scans public company and ecosystem signals to surface organizations that fit your channel, integration, or strategic thesis.",
    leadInputs: {
      queryLabel: "Partner type",
      queryPlaceholder: "Affiliate partners, channel partners, SaaS integrations",
      locationLabel: "Target region",
      locationPlaceholder: "India, SEA, Europe, Global",
      industryLabel: "Ecosystem segment",
      industryPlaceholder: "HR tech, fintech, agency networks",
      audienceLabel: "Strategic angle",
      audiencePlaceholder: "Co-selling, integrations, audience exchange",
      offerLabel: "Mutual value",
      offerPlaceholder: "Lead sharing, integration, reseller motion",
      goalLabel: "Partnership objective",
      goalPlaceholder: "Find HR tech tools for integration partnerships",
    },
    pricingHeadline: "Plans for channel and strategic partnerships",
    pricingSummary:
      "Pick the plan that matches how many partner accounts you want to source, sequence, and nurture at one time.",
  },
};

export const VERTICAL_LIST = Object.values(VERTICALS);

export function normalizeVertical(value?: string | null): VerticalId {
  const candidate = (value || "").trim().toLowerCase() as VerticalId;
  return candidate in VERTICALS ? candidate : DEFAULT_VERTICAL;
}

export function getVerticalConfig(value?: string | null): VerticalConfig {
  return VERTICALS[normalizeVertical(value)];
}
