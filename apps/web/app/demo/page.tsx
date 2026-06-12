"use client";

/** Public demo — the real app UI on clearly-labeled sample data. No signup.
 * Every mutation toasts "Demo data" + CTA. The link for recruiters,
 * customers, and the portfolio. */
import { ArrowRight, Eye, Inbox, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MonoEmail } from "@/components/marketing/SignatureElement";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { Stat } from "@/components/ui/Stat";
import { StatusPill } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { DEMO, type DemoLead } from "@/lib/demo-fixtures";
import { VERTICAL_LIST, getVerticalConfig, type VerticalId } from "@/lib/verticals";

export default function DemoPage() {
  const { toast } = useToast();
  const [vertical, setVertical] = useState<VerticalId>("agency");
  const [previewOpen, setPreviewOpen] = useState(false);

  const workspace = DEMO[vertical];
  const config = getVerticalConfig(vertical);
  const sent = workspace.leads.filter((lead) => lead.status === "sent" || lead.status === "replied").length;
  const replied = workspace.leads.filter((lead) => lead.status === "replied").length;
  const ready = workspace.leads.filter((lead) => lead.status === "pending").length;

  function demoToast() {
    toast("Demo data — start free to run this live.", "info");
  }

  const columns: Column<DemoLead>[] = [
    {
      key: "lead",
      header: "Lead",
      render: (row) => (
        <span>
          <span className="block font-medium text-ink">{row.name}</span>
          <span className="block font-mono text-xs text-muted">{row.email}</span>
        </span>
      ),
    },
    { key: "company", header: "Company", render: (row) => row.company },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
    { key: "source", header: "Source", render: (row) => <span className="text-muted">{row.source}</span>, hideOnCards: true },
    {
      key: "actions",
      header: "",
      render: () => (
        <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" /> Preview
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {/* demo banner */}
      <div className="border-b border-accent/20 bg-accent-tint">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <p className="text-sm text-accent-strong">
            <Sparkles className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            You&apos;re exploring sample data — nothing here is real or sent.
          </p>
          <Link href={`/signup?vertical=${vertical}`} className="text-sm font-semibold text-accent-strong underline">
            Start free to run it live
          </Link>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="Live demo"
          title={config.dashboardTitle}
          description={config.dashboardSummary}
          actions={
            <Link href={`/signup?vertical=${vertical}`} className={buttonClasses()}>
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {/* vertical switcher */}
        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
          {VERTICAL_LIST.map((item) => (
            <button
              key={item.id}
              onClick={() => setVertical(item.id)}
              aria-pressed={item.id === vertical}
              className={cn(
                "min-h-11 shrink-0 rounded-control border px-3.5 py-2 text-sm font-medium transition-colors",
                item.id === vertical
                  ? "border-accent/30 bg-accent-tint text-accent-strong"
                  : "border-line bg-surface text-ink-soft hover:text-ink"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <Tabs
            key={vertical}
            items={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Stat label="Leads" value={workspace.leads.length} detail={`${ready} ready to send`} />
                      <Stat label="Emails sent" value={sent} detail="via your own Gmail" />
                      <Stat label="Replies" value={replied} detail={`${Math.round((replied / Math.max(sent, 1)) * 100)}% reply rate`} />
                      <Stat label="Active campaigns" value={1} detail={workspace.campaign.name} />
                    </div>
                    <Card className="p-5">
                      <ProgressMeter label="Monthly lead quota (sample)" value={workspace.leads.length} max={60} />
                    </Card>
                  </div>
                ),
              },
              {
                id: "leads",
                label: "Lead Studio",
                content: (
                  <div className="space-y-4">
                    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-ink">{config.leadTitle}</h3>
                        <p className="mt-1 text-sm text-muted">{config.leadInputs.queryLabel}: “{config.leadInputs.queryPlaceholder.split(",")[0]}”</p>
                      </div>
                      <Button onClick={demoToast}>
                        <Play className="h-4 w-4" /> Generate leads
                      </Button>
                    </Card>
                    <Table
                      columns={columns}
                      rows={workspace.leads}
                      getRowKey={(row) => row.id}
                      emptyState={<EmptyState icon={Inbox} title="No leads yet" />}
                    />
                  </div>
                ),
              },
              {
                id: "campaign",
                label: "Campaign",
                content: (
                  <Card className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-ink">{workspace.campaign.name}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {workspace.campaign.emails_per_day}/day at {workspace.campaign.send_time} · follow-up after{" "}
                          {workspace.campaign.follow_up_days} days
                        </p>
                      </div>
                      <StatusPill status="active" />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <Stat label="Attached" value={workspace.campaign.total_leads} />
                      <Stat label="Sent" value={workspace.campaign.total_sent} />
                      <Stat label="Replied" value={workspace.campaign.total_replied} />
                    </div>
                    <div className="mt-4">
                      <ProgressMeter
                        label="Campaign progress"
                        value={workspace.campaign.total_sent}
                        max={workspace.campaign.total_leads}
                      />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button onClick={demoToast}>Send now</Button>
                      <Button variant="secondary" onClick={demoToast}>
                        Pause
                      </Button>
                    </div>
                  </Card>
                ),
              },
              {
                id: "analytics",
                label: "Analytics",
                content: (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="p-5">
                      <h3 className="font-display text-lg font-semibold text-ink">Funnel</h3>
                      <div className="mt-4 space-y-3">
                        {[
                          ["Leads generated", workspace.leads.length],
                          ["Ready to send", ready],
                          ["Emails sent", sent],
                          ["Replied", replied],
                        ].map(([stage, count]) => (
                          <ProgressMeter
                            key={String(stage)}
                            label={String(stage)}
                            value={Number(count)}
                            max={workspace.leads.length}
                          />
                        ))}
                      </div>
                    </Card>
                    <Card className="p-5">
                      <h3 className="font-display text-lg font-semibold text-ink">Source mix</h3>
                      <div className="mt-4 space-y-3">
                        {Object.entries(
                          workspace.leads.reduce<Record<string, number>>((acc, lead) => {
                            acc[lead.source] = (acc[lead.source] ?? 0) + 1;
                            return acc;
                          }, {})
                        ).map(([source, count]) => (
                          <ProgressMeter key={source} label={source} value={count} max={workspace.leads.length} />
                        ))}
                      </div>
                    </Card>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* final CTA */}
        <Card className="mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[15px] leading-7 text-ink-soft">
            This is the real interface on sample data. Your version generates live leads from
            public sources and sends through your own Gmail.
          </p>
          <Link href={`/signup?vertical=${vertical}`} className={buttonClasses({ size: "lg" })}>
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </main>

      <Drawer open={previewOpen} onClose={() => setPreviewOpen(false)} title="Draft preview (sample)">
        <MonoEmail
          draft={{
            subject: workspace.draft.subject,
            opening: workspace.draft.body[0],
            body: workspace.draft.body.slice(1, -1).join(" "),
            cta: workspace.draft.body[workspace.draft.body.length - 1],
          }}
          sender="You"
        />
        <Button className="mt-4 w-full" onClick={() => { setPreviewOpen(false); demoToast(); }}>
          Send this draft
        </Button>
      </Drawer>
    </div>
  );
}
