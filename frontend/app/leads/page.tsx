"use client";

import { ArrowRight, Eye, Filter, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getVerticalConfig, normalizeVertical } from "@/lib/verticals";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-white/10 bg-white/5 text-white/70",
  sent: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  replied: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  bounced: "border-rose-400/20 bg-rose-400/10 text-rose-200",
};

const SOURCE_LABELS: Record<string, string> = {
  google_maps: "Google Maps",
  linkedin_jobs: "LinkedIn Jobs",
  indeed: "Indeed",
  naukri: "Naukri",
  web_search: "Open Web",
  apollo: "Apollo",
  manual: "Manual",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewLeadId, setPreviewLeadId] = useState<number | null>(null);
  const { session } = useAuth();

  const vertical = getVerticalConfig(profile?.vertical);

  const [form, setForm] = useState({
    query: "",
    location: "",
    industry: "",
    audience: "",
    offer: "",
    goal: "",
    max: 40,
    campaign_id: "",
  });

  const load = async (nextPage = page, nextStatus = status) => {
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        per_page: "50",
      });
      if (nextStatus) {
        params.set("status", nextStatus);
      }

      const [leadData, campaignData, me] = await Promise.all([
        apiFetch(`/api/leads/?${params.toString()}`),
        apiFetch("/api/campaigns/"),
        apiFetch("/api/auth/me"),
      ]);

      setLeads(leadData.leads ?? []);
      setTotal(leadData.total ?? 0);
      setCampaigns(campaignData ?? []);
      setProfile(me);
      setError("");
    } catch (requestError: any) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    if (session) {
      load(1, status);
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateLeads = async () => {
    if (!form.query.trim()) {
      setError(`Enter ${vertical.leadInputs.queryLabel.toLowerCase()} before generating leads.`);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch("/api/leads/generate", {
        method: "POST",
        body: JSON.stringify({
          source: "auto",
          ...form,
          max: Number(form.max),
          campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
          vertical: normalizeVertical(profile?.vertical),
        }),
      });

      const nextMessage = [response.message, response.warning].filter(Boolean).join(" ");
      setMessage(nextMessage);
      if (response.status === "completed") {
        setPage(1);
        await load(1, status);
      }
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadCampaign = async (leadId: number, campaignId: string) => {
    try {
      await apiFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ campaign_id: campaignId ? Number(campaignId) : null }),
      });
      await load(page, status);
    } catch (requestError: any) {
      setError(requestError.message);
    }
  };

  const previewEmail = async (leadId: number) => {
    setPreviewLeadId(leadId);
    try {
      const data = await apiFetch("/api/emails/preview", {
        method: "POST",
        body: JSON.stringify({ lead_id: leadId }),
      });
      setPreview(data);
      setError("");
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setPreviewLeadId(null);
    }
  };

  const filteredStatusButtons = ["", "pending", "sent", "replied", "bounced"];

  const campaignOptions = useMemo(
    () => campaigns.map((campaign) => ({ value: String(campaign.id), label: campaign.name })),
    [campaigns]
  );

  return (
    <Shell>
      <div className="space-y-6">
        <Reveal>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="section-label">{vertical.label}</div>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">{vertical.leadTitle}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">{vertical.leadSummary}</p>
            </div>
            <div className="glass-card flex items-center gap-4 px-5 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Lead records</div>
                <div className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">{total}</div>
              </div>
              <Target className="h-8 w-8 text-[var(--accent)]" />
            </div>
          </div>
        </Reveal>

        {message && (
          <div className="rounded-[24px] border border-emerald-300/18 bg-emerald-300/10 px-5 py-4 text-sm leading-7 text-emerald-100">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-[24px] border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-5 py-4 text-sm leading-7 text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <Reveal>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,rgba(139,243,216,0.2),rgba(72,225,255,0.18))] text-[var(--accent)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-2xl font-semibold tracking-[-0.04em]">{vertical.label} intelligence</div>
                  <div className="text-sm text-white/60">{profile?.vertical_config?.generator_note || "ReachFlow chooses the right public sources for this workflow."}</div>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/70">
                One generate action. ReachFlow handles source selection, enrichment, and send-ready filtering behind the scenes for this vertical.
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">{vertical.leadInputs.queryLabel}</span>
                  <input
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, query: event.target.value })}
                    placeholder={vertical.leadInputs.queryPlaceholder}
                    value={form.query}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">{vertical.leadInputs.locationLabel}</span>
                  <input
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, location: event.target.value })}
                    placeholder={vertical.leadInputs.locationPlaceholder}
                    value={form.location}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">{vertical.leadInputs.industryLabel}</span>
                  <input
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, industry: event.target.value })}
                    placeholder={vertical.leadInputs.industryPlaceholder}
                    value={form.industry}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">{vertical.leadInputs.audienceLabel}</span>
                  <input
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, audience: event.target.value })}
                    placeholder={vertical.leadInputs.audiencePlaceholder}
                    value={form.audience}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">{vertical.leadInputs.offerLabel}</span>
                  <input
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, offer: event.target.value })}
                    placeholder={vertical.leadInputs.offerPlaceholder}
                    value={form.offer}
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">{vertical.leadInputs.goalLabel}</span>
                  <input
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, goal: event.target.value })}
                    placeholder={vertical.leadInputs.goalPlaceholder}
                    value={form.goal}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">Attach to campaign</span>
                  <select
                    className="field w-full"
                    onChange={(event) => setForm({ ...form, campaign_id: event.target.value })}
                    value={form.campaign_id}
                  >
                    <option value="">Keep unassigned for now</option>
                    {campaignOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/42">Result count</span>
                  <input
                    className="field w-full"
                    max={200}
                    min={1}
                    onChange={(event) => setForm({ ...form, max: Number(event.target.value) })}
                    type="number"
                    value={form.max}
                  />
                </label>
              </div>

              <button className="primary-button mt-6" disabled={loading} onClick={generateLeads} type="button">
                {loading ? "Generating..." : "Generate leads"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="glass-card p-6">
              <div className="section-label !px-3 !py-1.5 !text-[10px]">Lead quality rules</div>
              <div className="mt-5 space-y-4">
                {[
                  "The platform prioritizes records with usable public emails or credible team inboxes before they reach your table.",
                  "Campaign-ready leads can be attached immediately after generation so your next send does not require a cleanup step.",
                  "Email previews adapt to the vertical, so career outreach and commercial outreach no longer share the same writing style.",
                  "Use narrower goals and sharper offer language when you want higher-fit lead lists instead of broader volume.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/70"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <div className="glass-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {filteredStatusButtons.map((item) => (
                  <button
                    key={item || "all"}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      status === item
                        ? "border-[rgba(139,243,216,0.34)] bg-[rgba(139,243,216,0.14)] text-white"
                        : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
                    }`}
                    onClick={() => {
                      setStatus(item);
                      setPage(1);
                      load(1, item);
                    }}
                    type="button"
                  >
                    {item ? item[0].toUpperCase() + item.slice(1) : "All leads"}
                  </button>
                ))}
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-white/55">
                <Filter className="h-4 w-4" />
                Keep lists clean, segmented, and campaign-ready.
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.24em] text-white/45">
                    <tr>
                      {["Lead", "Company", "Campaign", "Status", "Origin", "Actions"].map((header) => (
                        <th key={header} className="px-4 py-4 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-t border-white/6 text-white/74">
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{lead.name || "Unknown contact"}</div>
                          <div className="mt-1 text-xs text-white/45">{lead.email || "No email found yet"}</div>
                          {lead.notes && <div className="mt-1 text-xs text-[var(--accent)]">{lead.notes}</div>}
                        </td>
                        <td className="px-4 py-4">
                          <div>{lead.company || "Unknown company"}</div>
                          <div className="mt-1 text-xs text-white/45">{lead.location || "No location"}</div>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            className="field !h-11 !min-w-[180px]"
                            onChange={(event) => updateLeadCampaign(lead.id, event.target.value)}
                            value={lead.campaign_id ? String(lead.campaign_id) : ""}
                          >
                            <option value="">Unassigned</option>
                            {campaignOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`status-pill ${STATUS_STYLES[lead.status] || STATUS_STYLES.pending}`}>{lead.status}</span>
                        </td>
                        <td className="px-4 py-4 text-white/55">{SOURCE_LABELS[lead.source] || String(lead.source).replace(/_/g, " ")}</td>
                        <td className="px-4 py-4">
                          <button className="secondary-button !px-4 !py-2" onClick={() => previewEmail(lead.id)} type="button">
                            <Eye className="h-4 w-4" />
                            {previewLeadId === lead.id ? "Loading..." : "Preview"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!leads.length && (
                <div className="px-6 py-16 text-center text-sm text-white/45">
                  No leads yet. Start with one focused generation run for this vertical and ReachFlow will return send-ready records here.
                </div>
              )}
            </div>

            {total > 50 && (
              <div className="mt-4 flex items-center justify-between text-sm text-white/55">
                <div>
                  Showing {(page - 1) * 50 + 1}-{Math.min(page * 50, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <button
                    className="secondary-button !px-4 !py-2"
                    disabled={page === 1}
                    onClick={() => {
                      const nextPage = page - 1;
                      setPage(nextPage);
                      load(nextPage, status);
                    }}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="secondary-button !px-4 !py-2"
                    disabled={page * 50 >= total}
                    onClick={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      load(nextPage, status);
                    }}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        {preview && (
          <Reveal>
            <div className="glass-card p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="section-label !px-3 !py-1.5 !text-[10px]">Draft preview</div>
                  <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">{preview.subject}</h2>
                  <p className="mt-3 text-sm text-white/55">
                    To: {preview.to || "No email"} {preview.company ? `- ${preview.company}` : ""}
                  </p>
                </div>
                <button className="secondary-button" onClick={() => setPreview(null)} type="button">
                  Close
                </button>
              </div>
              <pre className="mt-6 whitespace-pre-wrap rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-white/72">
                {preview.body}
              </pre>
            </div>
          </Reveal>
        )}
      </div>
    </Shell>
  );
}
