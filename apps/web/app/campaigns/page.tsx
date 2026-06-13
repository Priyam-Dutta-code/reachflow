"use client";

/** Campaigns — list with status/progress, plan-cap-aware create/edit modal,
 * send-now with explicit confirm, pause/resume, designed edge states. */
import { Megaphone, Pause, Pencil, Play, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";

export type Campaign = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  emails_per_day: number;
  send_time: string;
  follow_up_days: number;
  total_leads: number;
  total_sent: number;
  total_replied: number;
  total_bounced: number;
  eligible_leads: number;
};

type CampaignForm = {
  name: string;
  description: string;
  emails_per_day: number;
  send_time: string;
  follow_up_days: number;
};

const EMPTY_FORM: CampaignForm = { name: "", description: "", emails_per_day: 25, send_time: "09:00", follow_up_days: 5 };

export default function CampaignsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmSend, setConfirmSend] = useState<Campaign | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);

  async function load() {
    try {
      setCampaigns(await apiFetch<Campaign[]>("/api/campaigns/"));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not load campaigns.", "error");
    }
  }

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard /> <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  const dailyCap = Number(user.entitlements?.daily_send_cap ?? 25);
  const slots = Number(user.entitlements?.campaign_slots ?? 1);
  const slotsUsed = campaigns?.length ?? 0;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, emails_per_day: Math.min(25, dailyCap) });
    setModalOpen(true);
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description || "",
      emails_per_day: campaign.emails_per_day,
      send_time: campaign.send_time,
      follow_up_days: campaign.follow_up_days,
    });
    setModalOpen(true);
  }

  async function save() {
    if (form.name.trim().length < 2) {
      toast("Give the campaign a name (at least 2 characters).", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), emails_per_day: Math.min(form.emails_per_day, dailyCap) };
      if (editing) {
        await apiFetch(`/api/campaigns/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast("Campaign updated.", "success");
      } else {
        await apiFetch("/api/campaigns/", { method: "POST", body: JSON.stringify(payload) });
        toast("Campaign created.", "success");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        toast(error.message, "error");
      } else {
        toast(error instanceof Error ? error.message : "Save failed.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendNow(campaign: Campaign) {
    try {
      const result = await apiFetch<{ eligible_leads: number }>(`/api/campaigns/${campaign.id}/send-now`, {
        method: "POST",
      });
      toast(`Batch started — ${result.eligible_leads} eligible lead${result.eligible_leads === 1 ? "" : "s"}.`, "success");
      await load();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast("Verify your email first — check your inbox for the link.", "error");
      } else if (error instanceof ApiError && error.status === 400 && /gmail|sender/i.test(error.message)) {
        toast("Connect Gmail in Settings before sending.", "error");
      } else {
        toast(error instanceof Error ? error.message : "Send failed.", "error");
      }
    }
  }

  async function toggleStatus(campaign: Campaign) {
    const next = campaign.status === "active" ? "paused" : "active";
    try {
      await apiFetch(`/api/campaigns/${campaign.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast(next === "paused" ? "Campaign paused." : "Campaign resumed.", "success");
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Update failed.", "error");
    }
  }

  const gmailMissing = !user.has_gmail_password;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Campaigns"
          title="Run focused sends, not blasts"
          description={`Pace, schedule, and follow-up per audience. Your plan: ${slots} slot${slots === 1 ? "" : "s"}, up to ${dailyCap} sends/day each.`}
          actions={
            <Button onClick={openCreate} disabled={slotsUsed >= slots}>
              <Plus className="h-4 w-4" /> New campaign
            </Button>
          }
        />

        {slotsUsed >= slots && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-warning/25 bg-warning-bg p-4">
            <p className="text-sm text-warning">
              All {slots} campaign slot{slots === 1 ? "" : "s"} on your plan are in use.
            </p>
            <Link href={`/pricing?vertical=${user.vertical}`} className={buttonClasses({ size: "sm", variant: "secondary" })}>
              See bigger plans
            </Link>
          </Card>
        )}

        {gmailMissing && (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">Sending is locked:</span> connect a Gmail app password so
              campaigns go out through your own inbox.
            </p>
            <Link href="/settings" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Connect Gmail
            </Link>
          </Card>
        )}

        {campaigns === null ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SkeletonCard /> <SkeletonCard />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="A campaign defines the audience, daily pace, send time, and follow-up gap. Create one, attach leads, send."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Create your first campaign
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {campaigns.map((campaign) => {
              const progress = campaign.total_leads
                ? Math.min(Math.round((campaign.total_sent / campaign.total_leads) * 100), 100)
                : 0;
              return (
                <Card key={campaign.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/campaigns/${campaign.id}`} className="font-display text-lg font-semibold text-ink hover:text-accent-strong">
                        {campaign.name}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {campaign.emails_per_day}/day at {campaign.send_time} · follow-up after {campaign.follow_up_days}d
                      </p>
                    </div>
                    <StatusPill status={campaign.status} />
                  </div>

                  {campaign.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft">{campaign.description}</p>
                  )}

                  <div className="mt-4 grid grid-cols-4 gap-2 border-y border-line py-3 text-center">
                    {[
                      ["Leads", campaign.total_leads],
                      ["Eligible", campaign.eligible_leads],
                      ["Sent", campaign.total_sent],
                      ["Replied", campaign.total_replied],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <div className="font-display text-xl font-semibold text-ink">{value}</div>
                        <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <ProgressMeter label="Sent" value={campaign.total_sent} max={Math.max(campaign.total_leads, 1)} />
                  </div>

                  {campaign.eligible_leads === 0 && campaign.total_leads === 0 && (
                    <p className="mt-3 rounded-card border border-line bg-bg px-3 py-2 text-[13px] leading-5 text-muted">
                      No leads attached yet —{" "}
                      <Link href="/leads" className="font-medium text-accent hover:underline">
                        generate and assign some
                      </Link>
                      .
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setConfirmSend(campaign)}
                            disabled={campaign.eligible_leads === 0 || gmailMissing || !user.email_verified}>
                      <Send className="h-4 w-4" /> Send now
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void toggleStatus(campaign)}>
                      {campaign.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {campaign.status === "active" ? "Pause" : "Resume"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(campaign)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(campaign)} aria-label={`Delete ${campaign.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* create / edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit campaign" : "New campaign"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => void save()}>
              {editing ? "Save changes" : "Create campaign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="c_name">
            <Input id="c_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Brief" htmlFor="c_desc" hint="Audience, angle, or outcome — keeps execution aligned.">
            <Textarea id="c_desc" value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Emails/day" htmlFor="c_per_day" hint={`Plan cap: ${dailyCap}`}>
              <Input id="c_per_day" type="number" min={1} max={dailyCap} value={form.emails_per_day}
                     onChange={(e) => setForm({ ...form, emails_per_day: Number(e.target.value) })} />
            </Field>
            <Field label="Send time" htmlFor="c_time">
              <Input id="c_time" type="time" value={form.send_time}
                     onChange={(e) => setForm({ ...form, send_time: e.target.value })} />
            </Field>
            <Field label="Follow-up (days)" htmlFor="c_fu">
              <Input id="c_fu" type="number" min={1} max={30} value={form.follow_up_days}
                     onChange={(e) => setForm({ ...form, follow_up_days: Number(e.target.value) })} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmSend !== null}
        onClose={() => setConfirmSend(null)}
        onConfirm={async () => {
          if (confirmSend) await sendNow(confirmSend);
        }}
        title={`Send "${confirmSend?.name}" now?`}
        description={`Up to ${Math.min(confirmSend?.emails_per_day ?? 0, dailyCap)} emails go out today to eligible leads (${confirmSend?.eligible_leads ?? 0} ready), each with your sender identity and an unsubscribe link.`}
        confirmLabel="Send now"
        destructive={false}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await apiFetch(`/api/campaigns/${confirmDelete.id}`, { method: "DELETE" });
            toast("Campaign deleted. Its leads stay in your workspace.", "success");
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : "Delete failed.", "error");
          }
        }}
        title={`Delete "${confirmDelete?.name}"?`}
        description="The campaign and its schedule are removed. Attached leads stay in your workspace, unassigned."
      />
    </AppShell>
  );
}
