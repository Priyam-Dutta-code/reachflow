"use client";

import { ArrowRight, PauseCircle, PlayCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STATUS_STYLE: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-white/70",
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  paused: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  complete: "border-sky-400/20 bg-sky-400/10 text-sky-200",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { session } = useAuth();

  const [form, setForm] = useState({
    name: "",
    description: "",
    emails_per_day: 40,
    send_time: "09:00",
    follow_up_days: 5,
  });

  const load = async () => {
    try {
      const data = await apiFetch("/api/campaigns/");
      setCampaigns(data ?? []);
      setError("");
    } catch (requestError: any) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    if (session) {
      load();
    }
  }, [session]);

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiFetch("/api/campaigns/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowNew(false);
      setForm({
        name: "",
        description: "",
        emails_per_day: 40,
        send_time: "09:00",
        follow_up_days: 5,
      });
      await load();
    } catch (requestError: any) {
      setError(requestError.message);
    }
  };

  const triggerSend = async (campaignId: number) => {
    setLaunchingId(campaignId);
    try {
      await apiFetch(`/api/campaigns/${campaignId}/send-now`, { method: "POST" });
      await load();
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setLaunchingId(null);
    }
  };

  const toggleStatus = async (campaign: any) => {
    const status = campaign.status === "active" ? "paused" : "active";
    try {
      await apiFetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (requestError: any) {
      setError(requestError.message);
    }
  };

  const deleteCampaign = async (campaignId: number) => {
    try {
      await apiFetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      await load();
    } catch (requestError: any) {
      setError(requestError.message);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <Reveal>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="section-label">Campaign control</div>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Launch polished outbound campaigns with clear sending control.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                Organize lead segments, manage send volume, and keep every campaign accountable from first draft to
                reply.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/leads" className="secondary-button">
                Attach leads
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="primary-button" onClick={() => setShowNew(true)} type="button">
                <Plus className="h-4 w-4" />
                New campaign
              </button>
            </div>
          </div>
        </Reveal>

        {error && (
          <div className="rounded-[24px] border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-5 py-4 text-sm leading-7 text-[var(--danger)]">
            {error}
          </div>
        )}

        {showNew && (
          <Reveal>
            <form className="glass-card grid gap-4 p-6 md:grid-cols-2" onSubmit={createCampaign}>
              <input
                className="field w-full md:col-span-2"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Campaign name"
                required
                value={form.name}
              />
              <textarea
                className="textarea-field min-h-[130px] w-full md:col-span-2"
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Define the offer, audience, or angle for this campaign."
                value={form.description}
              />
              <input
                className="field w-full"
                min={1}
                onChange={(event) => setForm({ ...form, emails_per_day: Number(event.target.value) })}
                type="number"
                value={form.emails_per_day}
              />
              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, send_time: event.target.value })}
                type="time"
                value={form.send_time}
              />
              <input
                className="field w-full"
                min={1}
                onChange={(event) => setForm({ ...form, follow_up_days: Number(event.target.value) })}
                type="number"
                value={form.follow_up_days}
              />

              <div className="flex gap-3 md:col-span-2">
                <button className="primary-button" type="submit">
                  Create campaign
                </button>
                <button className="secondary-button" onClick={() => setShowNew(false)} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </Reveal>
        )}

        <div className="space-y-4">
          {campaigns.map((campaign, index) => {
            const statusClass = STATUS_STYLE[campaign.status] || STATUS_STYLE.draft;
            const progress = campaign.total_leads
              ? Math.min(Math.round((campaign.total_sent / campaign.total_leads) * 100), 100)
              : 0;

            return (
              <Reveal key={campaign.id} delay={index * 0.05}>
                <div className="glass-card p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">{campaign.name}</h2>
                        <span className={`status-pill ${statusClass}`}>{campaign.status}</span>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
                        {campaign.description || "No campaign brief yet. Add the audience, offer, or outreach angle to keep execution aligned."}
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-4">
                        {[
                          { label: "Total leads", value: campaign.total_leads },
                          { label: "Eligible to send", value: campaign.eligible_leads },
                          { label: "Sent", value: campaign.total_sent },
                          { label: "Replies", value: campaign.total_replied },
                        ].map((item) => (
                          <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-white/45">{item.label}</div>
                            <div className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">{item.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5">
                        <div className="flex items-center justify-between text-sm text-white/55">
                          <span>
                            {campaign.emails_per_day}/day at {campaign.send_time} • Follow-up after {campaign.follow_up_days} days
                          </span>
                          <span>{progress}% sent</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/6">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 xl:w-[290px] xl:justify-end">
                      <button
                        className="primary-button"
                        disabled={launchingId === campaign.id}
                        onClick={() => triggerSend(campaign.id)}
                        type="button"
                      >
                        <PlayCircle className="h-4 w-4" />
                        {launchingId === campaign.id ? "Launching..." : "Send now"}
                      </button>
                      <button className="secondary-button" onClick={() => toggleStatus(campaign)} type="button">
                        <PauseCircle className="h-4 w-4" />
                        {campaign.status === "active" ? "Pause" : "Resume"}
                      </button>
                      <button className="secondary-button text-rose-200" onClick={() => deleteCampaign(campaign.id)} type="button">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {campaign.eligible_leads === 0 && (
                    <div className="mt-5 rounded-[22px] border border-amber-400/15 bg-amber-400/10 px-4 py-4 text-sm leading-7 text-amber-100">
                      This campaign does not have any send-ready leads yet. Head to Lead Studio and attach qualified
                      prospects before you launch.
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {!campaigns.length && !error && (
          <Reveal>
            <div className="glass-card p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(139,243,216,0.2),rgba(72,225,255,0.18))] text-[var(--accent)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.04em]">No campaigns yet</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/65">
                Create your first campaign to define the message, audience, and sending pace before you activate
                outbound.
              </p>
              <button className="primary-button mt-6" onClick={() => setShowNew(true)} type="button">
                <Plus className="h-4 w-4" />
                Create first campaign
              </button>
            </div>
          </Reveal>
        )}
      </div>
    </Shell>
  );
}
