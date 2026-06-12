/**
 * /demo sample data — static, clearly labeled, obviously fictional companies.
 * Never presented as real customers or results (honesty rule).
 */
import type { VerticalId } from "@/lib/verticals";

export type DemoLead = {
  id: number;
  name: string;
  company: string;
  email: string;
  source: string;
  status: "pending" | "sent" | "replied" | "bounced";
  location: string;
};

export type DemoCampaign = {
  name: string;
  status: "active";
  total_leads: number;
  total_sent: number;
  total_replied: number;
  emails_per_day: number;
  send_time: string;
  follow_up_days: number;
};

export type DemoWorkspace = {
  leads: DemoLead[];
  campaign: DemoCampaign;
  draft: { subject: string; body: string[] };
};

function leads(rows: Array<[string, string, string, string, DemoLead["status"], string]>): DemoLead[] {
  return rows.map(([name, company, email, source, status, location], index) => ({
    id: index + 1,
    name, company, email, source, status, location,
  }));
}

export const DEMO: Record<VerticalId, DemoWorkspace> = {
  job_seeker: {
    leads: leads([
      ["Hiring Team", "Northline Systems", "careers@northlinesystems.com", "LinkedIn Jobs", "sent", "Bengaluru"],
      ["Recruiting", "Parkfield Labs", "jobs@parkfieldlabs.io", "Indeed", "replied", "Remote"],
      ["Hiring Team", "Cobalt Works", "talent@cobaltworks.in", "Naukri", "sent", "Pune"],
      ["People Ops", "Driftline", "hiring@driftline.app", "Open Web", "pending", "Hyderabad"],
      ["Hiring Team", "Quartz Metrics", "careers@quartzmetrics.com", "LinkedIn Jobs", "pending", "Bengaluru"],
      ["Talent Team", "Mosaic Grid", "talent@mosaicgrid.dev", "Open Web", "bounced", "Remote"],
    ]),
    campaign: { name: "Backend roles — June push", status: "active", total_leads: 6, total_sent: 3, total_replied: 1, emails_per_day: 25, send_time: "09:30", follow_up_days: 5 },
    draft: {
      subject: "Backend engineer for your current hiring",
      body: [
        "Dear Hiring Team,",
        "Northline's open backend roles look aligned with the systems work I do best — I wanted to reach you directly rather than wait in an application queue.",
        "Most recently I shipped a payments service handling steady production load; I ramp fast and own things end to end.",
        "Would you be open to pointing me to the right next step?",
      ],
    },
  },
  recruiter: {
    leads: leads([
      ["Nina Brooks", "Summit Grid", "talent@summitgrid.io", "Hiring signals", "replied", "Mumbai"],
      ["HR Team", "Veldt Analytics", "hr@veldtanalytics.com", "LinkedIn Jobs", "sent", "Bengaluru"],
      ["Hiring Team", "Corridor Pay", "talent@corridorpay.in", "Naukri", "sent", "Gurugram"],
      ["People Team", "Bluetape", "people@bluetape.dev", "Open Web", "pending", "Remote"],
      ["Talent Lead", "Hexant", "recruiting@hexant.co", "Indeed", "pending", "Pune"],
      ["HR", "Lumen Forge", "hr@lumenforge.io", "Open Web", "pending", "Chennai"],
    ]),
    campaign: { name: "Engineering desks — Q2", status: "active", total_leads: 6, total_sent: 3, total_replied: 1, emails_per_day: 35, send_time: "10:00", follow_up_days: 4 },
    draft: {
      subject: "Recruiting support for your engineering hiring",
      body: [
        "Dear Nina,",
        "Summit Grid's hiring pattern over the last quarter suggests priority engineering roles. My desk closes searches like these with a tight, well-managed process.",
        "If useful, I can share how I'd approach this market this week.",
        "Would a brief conversation make sense?",
      ],
    },
  },
  agency: {
    leads: leads([
      ["Maya Patel", "Kinetic Studio", "hello@kineticstudio.co", "Open Web", "replied", "Pune"],
      ["Growth Team", "Solstice D2C", "growth@solsticed2c.com", "Open Web", "sent", "Mumbai"],
      ["Rohan Iyer", "Cartfuel", "rohan@cartfuel.in", "Google Maps", "sent", "Bengaluru"],
      ["Founder", "Brightloom Café Co", "hello@brightloom.cafe", "Google Maps", "pending", "Delhi"],
      ["Marketing", "Juniper Skincare", "marketing@juniperskin.in", "Open Web", "pending", "Mumbai"],
      ["Team", "Atlas Interiors", "info@atlasinteriors.in", "Google Maps", "pending", "Jaipur"],
    ]),
    campaign: { name: "D2C brands — paid growth offer", status: "active", total_leads: 6, total_sent: 3, total_replied: 1, emails_per_day: 35, send_time: "09:00", follow_up_days: 5 },
    draft: {
      subject: "A practical growth idea for Kinetic Studio",
      body: [
        "Dear Maya,",
        "Kinetic's portfolio suggests you win on craft — the gap I usually see at this stage is a repeatable client pipeline that doesn't depend on referrals.",
        "We run exactly that motion for studios like yours: tight targeting, honest outreach, booked calls.",
        "Open to a short note on the angle I have in mind?",
      ],
    },
  },
  business_growth: {
    leads: leads([
      ["Arjun Mehta", "Vectorlane", "growth@vectorlane.ai", "Open Web", "replied", "Remote"],
      ["Sales Team", "Patio CRM", "sales@patiocrm.com", "Open Web", "sent", "Bengaluru"],
      ["Ops Lead", "Fernwheel Logistics", "ops@fernwheel.in", "Google Maps", "sent", "Chennai"],
      ["Growth", "Maple Billing", "growth@maplebilling.io", "Open Web", "pending", "Pune"],
      ["Team", "Signal Harbor", "hello@signalharbor.dev", "Open Web", "pending", "Remote"],
      ["Marketing", "Crestpath", "marketing@crestpath.co", "Open Web", "bounced", "Mumbai"],
    ]),
    campaign: { name: "SaaS outbound — automation offer", status: "active", total_leads: 6, total_sent: 3, total_replied: 1, emails_per_day: 30, send_time: "09:30", follow_up_days: 6 },
    draft: {
      subject: "A faster outbound loop for Vectorlane",
      body: [
        "Dear Arjun,",
        "Teams at Vectorlane's stage usually lose a week per campaign to list building and tool glue. The whole discover-to-send loop can run in one place.",
        "Happy to show the exact workflow on your own market — fifteen minutes, no deck.",
        "Worth a quick look at how that works?",
      ],
    },
  },
  partnerships: {
    leads: leads([
      ["Lena Fox", "Atlas Commerce", "partners@atlascommerce.com", "Ecosystem signals", "replied", "Gurugram"],
      ["BD Team", "Loop HR", "bd@loophr.io", "Open Web", "sent", "Bengaluru"],
      ["Alliances", "Paystack Bridge", "alliances@paystackbridge.com", "Open Web", "sent", "Remote"],
      ["Partnerships", "Nimbus Books", "partnerships@nimbusbooks.in", "Open Web", "pending", "Mumbai"],
      ["Channel Team", "Forma Payroll", "channel@formapayroll.com", "Open Web", "pending", "Pune"],
      ["BD", "Crating API", "bd@crating.dev", "Open Web", "pending", "Remote"],
    ]),
    campaign: { name: "HR-tech integrations — H2 thesis", status: "active", total_leads: 6, total_sent: 3, total_replied: 1, emails_per_day: 30, send_time: "11:00", follow_up_days: 7 },
    draft: {
      subject: "Partnership idea that could fit both teams",
      body: [
        "Dear Lena,",
        "Atlas and the product I work on serve overlapping audiences without competing — the kind of fit that usually makes a co-selling or integration motion work.",
        "I have a one-page outline of what the first sixty days could look like.",
        "Open to exchanging a short outline?",
      ],
    },
  },
};
