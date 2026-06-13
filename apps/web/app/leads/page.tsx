"use client";

/** Lead Studio — generation panel, async job progress, filterable results
 * with bulk actions, and the mono draft preview drawer. */
import { Check, Copy, Inbox, Play, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import { cn } from "@/components/ui/cn";
import { track } from "@/lib/analytics";
import { apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";
import { getVerticalConfig } from "@/lib/verticals";

type Lead = {
  id: number;
  name: string | null;
  email: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  source: string;
  status: string;
  notes: string | null;
  campaign_id: number | null;
  created_at: string;
};

type CampaignOption = { id: number; name: string };

const SOURCE_LABELS: Record<string, string> = {
  google_maps: "Google Maps",
  linkedin_selenium: "LinkedIn",
  apollo: "Apollo",
  naukri: "Naukri",
  indeed: "Indeed",
  linkedin_jobs: "LinkedIn Jobs",
  web_search: "Open Web",
  manual: "Manual",
};

const STATUS_FILTERS = ["", "pending", "sent", "replied", "bounced", "unsubscribed"] as const;

export default function LeadStudioPage() {
  const { user, loading, reload } = useAuth();
  const { toast } = useToast();

  // results state
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // generation state
  const [form, setForm] = useState({ query: "", location: "", industry: "", audience: "", offer: "", goal: "", max: 25, campaign_id: "" });
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [starting, setStarting] = useState(false);

  // drawer state
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // bulk state
  const [confirmDelete, setConfirmDelete] = useState(false);

  const searchDebounce = useRef<number | undefined>(undefined);

  const load = useCallback(
    async (nextPage = 1) => {
      try {
        const params = new URLSearchParams({ page: String(nextPage), per_page: "50" });
        if (status) params.set("status", status);
        if (source) params.set("source", source);
        if (query.trim()) params.set("q", query.trim());
        const data = await apiFetch<{ leads: Lead[]; total: number }>(`/api/leads/?${params}`);
        setLeads(data.leads);
        setTotal(data.total);
        setPage(nextPage);
        setSelected(new Set());
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not load leads.", "error");
      }
    },
    [status, source, query, toast]
  );

  useEffect(() => {
    if (!user) return;
    void load(1);
    apiFetch<CampaignOption[]>("/api/campaigns/").then(setCampaigns).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status, source]);

  // debounced search
  useEffect(() => {
    if (!user) return;
    window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => void load(1), 350);
    return () => window.clearTimeout(searchDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // job polling
  useEffect(() => {
    if (!jobId) return;
    const interval = window.setInterval(async () => {
      try {
        const job = await apiFetch<{ status: string; progress: number; message?: string; warning?: string }>(
          `/api/leads/generate/${jobId}`
        );
        setJobProgress(job.progress ?? 0);
        if (job.status === "completed") {
          window.clearInterval(interval);
          setJobId(null);
          toast([job.message, job.warning].filter(Boolean).join(" "), job.warning ? "info" : "success");
          await load(1);
          await reload();
        } else if (job.status === "failed") {
          window.clearInterval(interval);
          setJobId(null);
          toast(job.message || "Generation failed — try a broader query.", "error");
          await reload();
        }
      } catch {
        /* transient; keep polling */
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [jobId, load, reload, toast]);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="divide-y divide-line rounded-card border border-line bg-surface p-4">
          <SkeletonRow /> <SkeletonRow /> <SkeletonRow />
        </div>
      </AppShell>
    );
  }

  const vertical = getVerticalConfig(user.vertical);
  const inputs = vertical.leadInputs;
  const remainingQuota = Math.max(user.leads_quota - user.leads_used, 0);
  const effectiveMax = Math.min(form.max, user.email_verified ? 200 : 15, remainingQuota);

  async function startGeneration() {
    if (form.query.trim().length < 2) {
      toast(`Add ${inputs.queryLabel.toLowerCase()} before generating.`, "error");
      return;
    }
    setStarting(true);
    try {
      const started = await apiFetch<{ job_id: string }>("/api/leads/generate", {
        method: "POST",
        body: JSON.stringify({
          source: "auto",
          query: form.query.trim(),
          location: form.location.trim(),
          industry: form.industry.trim(),
          audience: form.audience.trim(),
          offer: form.offer.trim(),
          goal: form.goal.trim(),
          max: Number(form.max) || 25,
          campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
        }),
      });
      setJobId(started.job_id);
      setJobProgress(5);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not start generation.", "error");
    } finally {
      setStarting(false);
    }
  }

  async function openPreview(lead: Lead) {
    setDrawerLead(lead);
    setPreview(null);
    setCopied(false);
    if (!lead.email) return;
    setPreviewLoading(true);
    try {
      const draft = await apiFetch<{ subject: string; body: string }>("/api/emails/preview", {
        method: "POST",
        body: JSON.stringify({ lead_id: lead.id }),
      });
      setPreview(draft);
      track("lead_preview");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Preview failed.", "error");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function bulkAssign(campaignId: string) {
    const ids = [...selected];
    try {
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/api/leads/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ campaign_id: campaignId ? Number(campaignId) : null }),
          })
        )
      );
      toast(`${ids.length} lead${ids.length === 1 ? "" : "s"} ${campaignId ? "assigned" : "unassigned"}.`, "success");
      await load(page);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Bulk assign failed.", "error");
    }
  }

  async function bulkStatus(newStatus: string) {
    const ids = [...selected];
    try {
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) })
        )
      );
      toast(`${ids.length} lead${ids.length === 1 ? "" : "s"} marked ${newStatus}.`, "success");
      await load(page);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Bulk update failed.", "error");
    }
  }

  async function bulkDelete() {
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => apiFetch(`/api/leads/${id}`, { method: "DELETE" })));
      toast(`${ids.length} lead${ids.length === 1 ? "" : "s"} deleted.`, "success");
      await load(1);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Delete failed.", "error");
    }
  }

  function toggleSelect(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sortedLeads = [...(leads ?? [])].sort((a, b) => {
    if (sort === "name") return (a.name || a.company || "").localeCompare(b.name || b.company || "");
    if (sort === "company") return (a.company || "").localeCompare(b.company || "");
    if (sort === "status") return a.status.localeCompare(b.status);
    return 0; // newest = server order
  });

  const allOnPageSelected = sortedLeads.length > 0 && sortedLeads.every((lead) => selected.has(lead.id));

  const columns: Column<Lead>[] = [
    {
      key: "select",
      header: "",
      hideOnCards: true,
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.name || row.company || "lead"}`}
          checked={selected.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="h-4 w-4 accent-(--color-accent)"
          onClick={(event) => event.stopPropagation()}
        />
      ),
    },
    {
      key: "lead",
      header: "Lead",
      render: (row) => (
        <button onClick={() => void openPreview(row)} className="block min-w-0 text-left">
          <span className="block truncate font-medium text-ink">{row.name || "Unknown contact"}</span>
          <span className="block truncate font-mono text-xs text-muted">{row.email || "no email found"}</span>
        </button>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (row) => (
        <span>
          <span className="block truncate">{row.company || "—"}</span>
          <span className="block truncate text-xs text-muted">{row.location || ""}</span>
        </span>
      ),
    },
    { key: "title", header: "Title", hideOnCards: true, render: (row) => <span className="text-muted">{row.title || "—"}</span> },
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <span className="rounded-badge border border-line bg-bg px-2 py-0.5 font-mono text-[11px] text-muted">
          {SOURCE_LABELS[row.source] || row.source}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow={vertical.label}
          title={vertical.leadTitle}
          description={vertical.leadSummary}
        />

        {remainingQuota <= 0 && (
          <UpgradeNudge
            vertical={user.vertical}
            reason="You've used your full lead quota for this cycle. Upgrade to keep generating."
          />
        )}

        {/* generation panel */}
        <Card className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={inputs.queryLabel} htmlFor="g_query" className="md:col-span-2">
              <Input id="g_query" placeholder={inputs.queryPlaceholder} value={form.query}
                     onChange={(e) => setForm({ ...form, query: e.target.value })} />
            </Field>
            <Field label={inputs.locationLabel} htmlFor="g_location">
              <Input id="g_location" placeholder={inputs.locationPlaceholder} value={form.location}
                     onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label={inputs.industryLabel} htmlFor="g_industry">
              <Input id="g_industry" placeholder={inputs.industryPlaceholder} value={form.industry}
                     onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label={inputs.audienceLabel} htmlFor="g_audience">
              <Input id="g_audience" placeholder={inputs.audiencePlaceholder} value={form.audience}
                     onChange={(e) => setForm({ ...form, audience: e.target.value })} />
            </Field>
            <Field label={inputs.offerLabel} htmlFor="g_offer">
              <Input id="g_offer" placeholder={inputs.offerPlaceholder} value={form.offer}
                     onChange={(e) => setForm({ ...form, offer: e.target.value })} />
            </Field>
            <Field label={inputs.goalLabel} htmlFor="g_goal" className="md:col-span-2">
              <Input id="g_goal" placeholder={inputs.goalPlaceholder} value={form.goal}
                     onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </Field>
            <Field label="Attach to campaign" htmlFor="g_campaign">
              <Select id="g_campaign" value={form.campaign_id}
                      onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
                <option value="">Keep unassigned</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="How many leads" htmlFor="g_max"
                   hint={`Uses up to ${effectiveMax} of your ${remainingQuota} remaining quota${user.email_verified ? "" : " (verify email for bigger runs)"}.`}>
              <Input id="g_max" type="number" min={1} max={200} value={form.max}
                     onChange={(e) => setForm({ ...form, max: Number(e.target.value) })} />
            </Field>
          </div>

          {jobId ? (
            <div className="mt-5" role="status" aria-live="polite">
              <ProgressMeter label="Searching public sources…" value={jobProgress} max={100} />
            </div>
          ) : (
            <Button className="mt-5" loading={starting} onClick={() => void startGeneration()}>
              <Play className="h-4 w-4" /> Generate leads
            </Button>
          )}
        </Card>

        {/* filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 [scrollbar-width:none]">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item || "all"}
                onClick={() => setStatus(item)}
                aria-pressed={status === item}
                className={cn(
                  "min-h-11 shrink-0 rounded-control border px-3.5 text-sm font-medium capitalize transition-colors",
                  status === item
                    ? "border-accent/30 bg-accent-tint text-accent-strong"
                    : "border-line bg-surface text-ink-soft hover:text-ink"
                )}
              >
                {item || "All"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                aria-label="Search leads"
                placeholder="Search name, company, email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-56 pl-9"
              />
            </div>
            <Select aria-label="Filter by source" value={source} onChange={(e) => setSource(e.target.value)} className="w-40">
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-36">
              <option value="newest">Newest</option>
              <option value="name">Name</option>
              <option value="company">Company</option>
              <option value="status">Status</option>
            </Select>
          </div>
        </div>

        {/* bulk actions bar */}
        {selected.size > 0 && (
          <Card className="flex flex-wrap items-center gap-3 border-accent/30 bg-accent-tint p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-accent-strong">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={() =>
                  setSelected(allOnPageSelected ? new Set() : new Set(sortedLeads.map((lead) => lead.id)))
                }
                className="h-4 w-4 accent-(--color-accent)"
                aria-label="Select all on page"
              />
              {selected.size} selected
            </label>
            <Select aria-label="Assign selected to campaign" className="w-48" defaultValue=""
                    onChange={(e) => { if (e.target.value !== "") void bulkAssign(e.target.value === "none" ? "" : e.target.value); e.target.value = ""; }}>
              <option value="" disabled>Assign to campaign…</option>
              <option value="none">Unassign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </Select>
            <Select aria-label="Mark selected as" className="w-40" defaultValue=""
                    onChange={(e) => { if (e.target.value) void bulkStatus(e.target.value); e.target.value = ""; }}>
              <option value="" disabled>Mark as…</option>
              <option value="pending">Pending</option>
              <option value="replied">Replied</option>
              <option value="unsubscribed">Unsubscribed</option>
            </Select>
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </Card>
        )}

        {/* results */}
        {leads === null ? (
          <div className="divide-y divide-line rounded-card border border-line bg-surface p-4">
            <SkeletonRow /> <SkeletonRow /> <SkeletonRow /> <SkeletonRow />
          </div>
        ) : (
          <Table
            columns={columns}
            rows={sortedLeads}
            getRowKey={(row) => row.id}
            emptyState={
              <EmptyState
                icon={Inbox}
                title={total === 0 && !status && !source && !query ? "Your first run starts here" : "No leads match these filters"}
                description={
                  total === 0 && !status && !source && !query
                    ? `Fill in ${inputs.queryLabel.toLowerCase()} above and generate — ReachFlow searches the right public sources for ${vertical.label.toLowerCase()}.`
                    : "Try clearing the search or filters."
                }
              />
            }
          />
        )}

        {/* pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => void load(page - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page * 50 >= total} onClick={() => void load(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* lead drawer with mono preview */}
      <Drawer open={drawerLead !== null} onClose={() => setDrawerLead(null)} title={drawerLead?.name || drawerLead?.company || "Lead"}>
        {drawerLead && (
          <div className="space-y-4">
            <dl className="space-y-1.5 text-sm">
              {[
                ["Company", drawerLead.company],
                ["Title", drawerLead.title],
                ["Email", drawerLead.email],
                ["Location", drawerLead.location],
                ["Source", SOURCE_LABELS[drawerLead.source] || drawerLead.source],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className={cn("text-right text-ink", label === "Email" && "font-mono text-[13px]")}>
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            {drawerLead.notes && (
              <p className="rounded-card border border-line bg-bg px-3 py-2 text-[13px] leading-5 text-muted">
                {drawerLead.notes}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <StatusPill status={drawerLead.status} />
              {preview && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`Subject: ${preview.subject}\n\n${preview.body}`);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy draft"}
                </Button>
              )}
            </div>

            {!drawerLead.email ? (
              <p className="text-sm leading-6 text-muted">No email route found for this lead yet.</p>
            ) : previewLoading ? (
              <div className="rounded-card border border-line bg-bg p-4 font-mono text-[13px] text-muted" role="status">
                Drafting…
              </div>
            ) : preview ? (
              <div className="relative rounded-card border border-line bg-surface p-4 font-mono text-[13px] leading-6 text-ink-soft">
                <span className="absolute right-3 top-3 rounded-badge border border-accent/25 bg-accent-tint px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-strong">
                  draft
                </span>
                <p className="border-b border-line pb-2 text-muted">
                  Subject: <span className="text-ink">{preview.subject}</span>
                </p>
                <p className="mt-3 whitespace-pre-wrap">{preview.body}</p>
              </div>
            ) : null}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await bulkDelete();
        }}
        title={`Delete ${selected.size} lead${selected.size === 1 ? "" : "s"}?`}
        description="They're removed from your workspace and any campaigns. This can't be undone."
      />
    </AppShell>
  );
}
