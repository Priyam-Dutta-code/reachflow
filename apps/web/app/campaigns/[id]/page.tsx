"use client";

/** Campaign detail — assigned leads with per-lead status + mono previews. */
import { ArrowLeft, Inbox } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { Table, type Column } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";

type DetailLead = {
  id: number;
  name: string | null;
  company: string | null;
  email: string | null;
  status: string;
  follow_up_sent: boolean;
  sent_date: string | null;
};

type Detail = {
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
  leads: DetailLead[];
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [previewLead, setPreviewLead] = useState<DetailLead | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

  useEffect(() => {
    if (!user || !params.id) return;
    apiFetch<Detail>(`/api/campaigns/${params.id}`)
      .then(setDetail)
      .catch(() => setNotFound(true));
  }, [user, params.id]);

  async function openPreview(lead: DetailLead) {
    setPreviewLead(lead);
    setPreview(null);
    if (!lead.email) return;
    try {
      setPreview(
        await apiFetch<{ subject: string; body: string }>("/api/emails/preview", {
          method: "POST",
          body: JSON.stringify({ lead_id: lead.id }),
        })
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Preview failed.", "error");
    }
  }

  if (loading || !user || (!detail && !notFound)) {
    return (
      <AppShell>
        <SkeletonCard />
        <div className="mt-4 divide-y divide-line rounded-card border border-line bg-surface p-4">
          <SkeletonRow /> <SkeletonRow />
        </div>
      </AppShell>
    );
  }

  if (notFound || !detail) {
    return (
      <AppShell>
        <EmptyState
          title="Campaign not found"
          description="It may have been deleted."
          action={
            <Link href="/campaigns" className={buttonClasses({ size: "sm" })}>
              Back to campaigns
            </Link>
          }
        />
      </AppShell>
    );
  }

  const columns: Column<DetailLead>[] = [
    {
      key: "lead",
      header: "Lead",
      render: (row) => (
        <button onClick={() => void openPreview(row)} className="block min-w-0 text-left">
          <span className="block truncate font-medium text-ink">{row.name || row.company || "Unknown"}</span>
          <span className="block truncate font-mono text-xs text-muted">{row.email || "no email"}</span>
        </button>
      ),
    },
    { key: "company", header: "Company", hideOnCards: true, render: (row) => row.company || "—" },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
    {
      key: "followup",
      header: "Follow-up",
      render: (row) => (
        <span className="text-muted">{row.follow_up_sent ? "sent" : row.status === "sent" ? `due +${detail.follow_up_days}d` : "—"}</span>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All campaigns
        </Link>

        <PageHeader
          eyebrow="Campaign"
          title={detail.name}
          description={detail.description || undefined}
          actions={<StatusPill status={detail.status} />}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Leads" value={detail.total_leads} detail={`${detail.eligible_leads} eligible`} />
          <Stat label="Sent" value={detail.total_sent} detail={`${detail.emails_per_day}/day at ${detail.send_time}`} />
          <Stat label="Replied" value={detail.total_replied} />
          <Stat label="Bounced" value={detail.total_bounced} detail={`follow-up after ${detail.follow_up_days}d`} />
        </div>

        <ProgressMeter label="Campaign progress" value={detail.total_sent} max={Math.max(detail.total_leads, 1)} />

        <Table
          columns={columns}
          rows={detail.leads}
          getRowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={Inbox}
              title="No leads attached"
              description="Assign leads from Lead Studio and they'll appear here with per-lead send status."
              action={
                <Link href="/leads" className={buttonClasses({ size: "sm" })}>
                  Open Lead Studio
                </Link>
              }
            />
          }
        />
      </div>

      <Drawer open={previewLead !== null} onClose={() => setPreviewLead(null)} title={previewLead?.name || "Preview"}>
        {previewLead && (
          <div className="space-y-4">
            <StatusPill status={previewLead.status} />
            {!previewLead.email ? (
              <p className="text-sm text-muted">No email route for this lead.</p>
            ) : preview ? (
              <div className="rounded-card border border-line bg-surface p-4 font-mono text-[13px] leading-6 text-ink-soft">
                <p className="border-b border-line pb-2 text-muted">
                  Subject: <span className="text-ink">{preview.subject}</span>
                </p>
                <p className="mt-3 whitespace-pre-wrap">{preview.body}</p>
              </div>
            ) : (
              <div className="rounded-card border border-line bg-bg p-4 font-mono text-[13px] text-muted" role="status">
                Drafting…
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={() => setPreviewLead(null)}>
              Close
            </Button>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
