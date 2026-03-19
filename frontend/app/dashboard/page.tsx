"use client";

import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Handshake,
  Mail,
  Settings2,
  Sparkles,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getVerticalConfig, type VerticalId } from "@/lib/verticals";

const SETUP_LABELS: Record<string, string> = {
  sender_profile: "Add your sender identity",
  sender_email: "Confirm the sender email",
  gmail_connection: "Connect Gmail app password",
  ai_personalization: "Add sender context or Groq key",
};

const DASHBOARD_ICONS: Record<VerticalId, typeof GraduationCap> = {
  job_seeker: GraduationCap,
  recruiter: Users2,
  agency: BriefcaseBusiness,
  business_growth: Building2,
  partnerships: Handshake,
};

function MetricTile({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-white/42">{label}</div>
      <div className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">{value}</div>
      <div className="mt-3 text-sm text-white/58">{detail}</div>
    </div>
  );
}

function SourceRows({ stats }: { stats: any }) {
  const rows = stats?.sources?.length ? stats.sources : [{ source: "none", count: 0 }];
  return (
    <div className="space-y-3">
      {rows.map((item: any) => (
        <div key={item.source} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm capitalize text-white/72">{String(item.source).replace(/_/g, " ")}</span>
            <span className="text-sm text-white/52">{item.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SetupList({ profile }: { profile: any }) {
  const items = (profile?.missing_setup ?? []).map((item: string) => SETUP_LABELS[item] ?? item);
  const list = items.length
    ? items
    : ["Sender profile is ready", "Outreach drafting is available", "Campaign workflows can be launched"];

  return (
    <div className="space-y-3">
      {list.map((item: string) => (
        <div key={item} className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
          <div className={`h-2.5 w-2.5 rounded-full ${items.length ? "bg-[var(--accent-strong)]" : "bg-[var(--success)]"}`} />
          {item}
        </div>
      ))}
    </div>
  );
}

function VerticalHero({
  profile,
  stats,
}: {
  profile: any;
  stats: any;
}) {
  const verticalId = (profile?.vertical || "business_growth") as VerticalId;
  const vertical = getVerticalConfig(verticalId);
  const Icon = DASHBOARD_ICONS[verticalId];

  return (
    <Reveal>
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="glass-card p-6 md:p-8">
          <div className="section-label">
            <Icon className="h-3.5 w-3.5" />
            {vertical.dashboardAccent}
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-[-0.06em] md:text-5xl">
            {vertical.dashboardTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/66 md:text-base">{vertical.dashboardSummary}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/leads" className="primary-button">
              Generate leads
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/campaigns" className="secondary-button">
              Campaigns
            </Link>
            <Link href="/pricing" className="secondary-button">
              {profile?.plan_name || "View plans"}
            </Link>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-white/42">Workspace summary</div>
              <div className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">{profile?.sender_name || profile?.email}</div>
            </div>
            <Link href="/settings" className="secondary-button !px-4 !py-2">
              <Settings2 className="h-4 w-4" />
              Settings
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MetricTile label="Plan" value={profile?.plan_name || "Starter"} detail={`${stats?.credits_left ?? 0} credits available`} />
            <MetricTile label="Lead quota" value={`${stats?.leads_used ?? 0}/${stats?.leads_quota ?? 0}`} detail={`${stats?.ready_to_send ?? 0} ready to send`} />
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function JobSeekerDashboard({ stats, profile }: { stats: any; profile: any }) {
  return (
    <div className="space-y-6">
      <VerticalHero profile={profile} stats={stats} />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricTile label="Hiring companies" value={stats?.total_leads ?? 0} detail={`${stats?.with_email ?? 0} with email routes`} />
        <MetricTile label="Ready applications" value={stats?.ready_to_send ?? 0} detail="Companies you can reach today" />
        <MetricTile label="Emails sent" value={stats?.sent ?? 0} detail={`${stats?.reply_rate ?? 0}% reply rate`} />
        <MetricTile label="Follow-ups" value={stats?.follow_ups ?? 0} detail={`${stats?.replied ?? 0} replies tracked`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Application checklist</div>
          <div className="mt-5 font-display text-3xl font-semibold tracking-[-0.04em]">Keep the profile sharp before the next send.</div>
          <div className="mt-5">
            <SetupList profile={profile} />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Interview pipeline</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <MetricTile label="Generated" value={stats?.total_leads ?? 0} detail="Relevant hiring companies sourced" />
            <MetricTile label="Reached" value={stats?.sent ?? 0} detail="Application emails already sent" />
            <MetricTile label="Followed up" value={stats?.follow_ups ?? 0} detail="Second-touch outreach delivered" />
            <MetricTile label="Responses" value={stats?.replied ?? 0} detail="Replies to your outreach" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecruiterDashboard({ stats, profile }: { stats: any; profile: any }) {
  return (
    <div className="space-y-6">
      <VerticalHero profile={profile} stats={stats} />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Talent demand</div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MetricTile label="Hiring accounts" value={stats?.total_leads ?? 0} detail="Employer records in desk" />
            <MetricTile label="Ready to reach" value={stats?.ready_to_send ?? 0} detail="Accounts with valid contact routes" />
            <MetricTile label="Active campaigns" value={stats?.active_campaigns ?? 0} detail={`${stats?.campaigns_count ?? 0} total campaigns`} />
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="font-display text-2xl font-semibold tracking-[-0.04em]">Search desk focus</div>
            <p className="mt-3 text-sm leading-7 text-white/66">
              Use the recruiter workspace to map employer demand, prioritize accounts with reachable hiring inboxes, and
              sequence outreach by market or role family.
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Hiring account mix</div>
          <div className="mt-5">
            <SourceRows stats={stats} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-6">
          <div className="font-display text-3xl font-semibold tracking-[-0.04em]">Desk readiness</div>
          <div className="mt-5">
            <SetupList profile={profile} />
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="font-display text-3xl font-semibold tracking-[-0.04em]">Response movement</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <MetricTile label="Emails sent" value={stats?.sent ?? 0} detail="Employer conversations opened" />
            <MetricTile label="Replies" value={stats?.replied ?? 0} detail={`${stats?.reply_rate ?? 0}% reply rate`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencyDashboard({ stats, profile }: { stats: any; profile: any }) {
  return (
    <div className="space-y-6">
      <VerticalHero profile={profile} stats={stats} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card p-6">
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(242,163,107,0.14),rgba(255,255,255,0.03))] p-6">
              <div className="section-label !px-3 !py-1.5 !text-[10px]">Pipeline signal</div>
              <div className="mt-5 font-display text-4xl font-semibold tracking-[-0.05em]">{stats?.ready_to_send ?? 0}</div>
              <p className="mt-3 text-sm leading-7 text-white/68">Client-fit accounts ready for outbound this week.</p>
            </div>
            <div className="space-y-4">
              <MetricTile label="Accounts sourced" value={stats?.total_leads ?? 0} detail="Prospects across your target markets" />
              <MetricTile label="Campaigns live" value={stats?.active_campaigns ?? 0} detail={`${stats?.campaigns_count ?? 0} total campaign builds`} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="font-display text-2xl font-semibold tracking-[-0.04em]">Operator notes</div>
          <div className="mt-5 space-y-3">
            {[
              "Use one lead run per offer-market pair so outreach copy stays specific.",
              "Assign high-fit accounts into separate campaigns for each service line.",
              "Keep sender positioning crisp in Settings to make drafts feel bespoke.",
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/68">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricTile label="Emails sent" value={stats?.sent ?? 0} detail="Client-acquisition touches sent" />
        <MetricTile label="Replies" value={stats?.replied ?? 0} detail={`${stats?.reply_rate ?? 0}% reply rate`} />
        <MetricTile label="Credits left" value={stats?.credits_left ?? 0} detail="Available outreach capacity" />
      </div>
    </div>
  );
}

function GrowthDashboard({ stats, profile }: { stats: any; profile: any }) {
  return (
    <div className="space-y-6">
      <VerticalHero profile={profile} stats={stats} />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricTile label="Market coverage" value={stats?.total_leads ?? 0} detail="Accounts generated across target segments" />
        <MetricTile label="Send ready" value={stats?.ready_to_send ?? 0} detail="Records enriched with usable contact routes" />
        <MetricTile label="Live campaigns" value={stats?.active_campaigns ?? 0} detail={`${stats?.draft_campaigns ?? 0} drafts waiting`} />
        <MetricTile label="Reply rate" value={`${stats?.reply_rate ?? 0}%`} detail={`${stats?.replied ?? 0} total replies`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Outbound engine</div>
          <div className="mt-5 space-y-4">
            <SetupList profile={profile} />
          </div>
          <Link href="/leads" className="secondary-button mt-6">
            Open lead generation
          </Link>
        </div>
        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Source performance</div>
          <div className="mt-5">
            <SourceRows stats={stats} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnershipsDashboard({ stats, profile }: { stats: any; profile: any }) {
  return (
    <div className="space-y-6">
      <VerticalHero profile={profile} stats={stats} />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Alliance board</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <MetricTile label="Targets found" value={stats?.total_leads ?? 0} detail="Partner accounts surfaced" />
            <MetricTile label="Ready to pitch" value={stats?.ready_to_send ?? 0} detail="Accounts with usable contact routes" />
            <MetricTile label="Relationship notes sent" value={stats?.sent ?? 0} detail="Strategic outreach launched" />
            <MetricTile label="Replies" value={stats?.replied ?? 0} detail="Partnership conversations opened" />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="section-label !px-3 !py-1.5 !text-[10px]">Partner-fit signals</div>
          <div className="mt-5 space-y-3">
            {[
              "Prioritize companies with strong audience overlap or integration potential.",
              "Keep outreach relationship-first and avoid pushing a hard sell on the first message.",
              "Use a separate campaign for each partner thesis so reporting stays clean.",
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/68">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      return;
    }

    Promise.all([apiFetch("/api/analytics/overview"), apiFetch("/api/auth/me")])
      .then(([analytics, me]) => {
        setStats(analytics);
        setProfile(me);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [session]);

  const content = useMemo(() => {
    const vertical = (profile?.vertical || "business_growth") as VerticalId;
    if (!stats || !profile) {
      return (
        <div className="glass-card p-10 text-sm text-white/60">
          Loading workspace…
        </div>
      );
    }

    if (vertical === "job_seeker") {
      return <JobSeekerDashboard profile={profile} stats={stats} />;
    }
    if (vertical === "recruiter") {
      return <RecruiterDashboard profile={profile} stats={stats} />;
    }
    if (vertical === "agency") {
      return <AgencyDashboard profile={profile} stats={stats} />;
    }
    if (vertical === "partnerships") {
      return <PartnershipsDashboard profile={profile} stats={stats} />;
    }
    return <GrowthDashboard profile={profile} stats={stats} />;
  }, [profile, stats]);

  return (
    <Shell>
      <div className="space-y-6">
        {error && (
          <div className="rounded-[24px] border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-5 py-4 text-sm leading-7 text-[var(--danger)]">
            {error}
          </div>
        )}
        {content}
      </div>
    </Shell>
  );
}
