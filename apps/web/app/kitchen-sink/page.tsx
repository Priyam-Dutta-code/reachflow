"use client";

/** Dev-only visual QA — every component, every state (master plan Phase 5).
 * Hidden in production builds. */
import { Inbox, Info, Search } from "lucide-react";
import { notFound } from "next/navigation";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  ProgressMeter,
  Select,
  SkeletonCard,
  SkeletonRow,
  SkeletonText,
  Stat,
  StatusPill,
  Table,
  Tabs,
  Textarea,
  Tooltip,
  useToast,
  type Column,
} from "@/components/ui";

type DemoLead = { id: number; name: string; company: string; status: string; source: string };

const DEMO_ROWS: DemoLead[] = [
  { id: 1, name: "Maya Patel", company: "Kinetic Studio", status: "pending", source: "Open Web" },
  { id: 2, name: "Arjun Mehta", company: "Vectorlane", status: "sent", source: "LinkedIn Jobs" },
  { id: 3, name: "Lena Fox", company: "Atlas Commerce", status: "replied", source: "Google Maps" },
  { id: 4, name: "Hiring Team", company: "Northline", status: "bounced", source: "Naukri" },
];

const COLUMNS: Column<DemoLead>[] = [
  { key: "name", header: "Lead", render: (row) => <span className="font-medium text-ink">{row.name}</span> },
  { key: "company", header: "Company", render: (row) => row.company },
  { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
  { key: "source", header: "Source", render: (row) => <span className="text-muted">{row.source}</span>, hideOnCards: true },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-line pb-2 font-display text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Design system"
        title="Kitchen sink"
        description="Every component and state on the V2 token system. Dev-only."
        actions={<Button size="sm" onClick={() => toast("Toast check.", "info")}>Fire a toast</Button>}
      />

      <Section title="Type & color">
        <Card className="space-y-3 p-5">
          <p className="font-display text-4xl font-semibold tracking-tight text-ink">Bricolage display</p>
          <p className="text-base text-ink">Inter body — the quick brown fox jumps over the lazy dog.</p>
          <p className="font-mono text-sm text-ink-soft">JetBrains Mono — drafted@northline.com</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {["bg-accent", "bg-accent-strong", "bg-accent-tint", "bg-success", "bg-warning", "bg-danger", "bg-line", "bg-ink"].map(
              (swatch) => (
                <span key={swatch} className={`h-9 w-20 rounded-control border border-line ${swatch}`} title={swatch} />
              )
            )}
          </div>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Saving…</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button variant="secondary" size="sm">
            <Search className="h-4 w-4" /> With icon
          </Button>
        </div>
      </Section>

      <Section title="Form controls">
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Input" htmlFor="ks-input" hint="A helpful hint sits here.">
            <Input id="ks-input" placeholder="Software Engineer, Product Designer" />
          </Field>
          <Field label="With error" htmlFor="ks-error" error="Enter a valid email address.">
            <Input id="ks-error" defaultValue="not-an-email" aria-invalid />
          </Field>
          <Field label="Select" htmlFor="ks-select">
            <Select id="ks-select" defaultValue="agency">
              <option value="job_seeker">Job Seekers</option>
              <option value="agency">Agencies</option>
              <option value="recruiter">Recruiters</option>
            </Select>
          </Field>
          <Field label="Textarea" htmlFor="ks-textarea" className="sm:col-span-2">
            <Textarea id="ks-textarea" placeholder="Describe your offer, experience, and tone…" />
          </Field>
        </Card>
      </Section>

      <Section title="Badges & status pills">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["pending", "sent", "replied", "bounced", "unsubscribed", "draft", "active", "paused", "complete"].map(
            (status) => (
              <StatusPill key={status} status={status} />
            )
          )}
        </div>
      </Section>

      <Section title="Stats, progress & tooltip">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Leads generated" value={148} detail="92 with email routes" />
          <Stat label="Reply rate" value="6.4%" detail="9 replies" />
          <Card className="space-y-4 p-5">
            <ProgressMeter label="Quota (ok)" value={40} max={160} />
            <ProgressMeter label="Quota (80%+)" value={135} max={160} />
            <ProgressMeter label="Quota (full)" value={160} max={160} />
            <Tooltip content="Tooltips reserve shadows for popovers only.">
              <span className="inline-flex items-center gap-1.5 text-sm text-accent">
                <Info className="h-4 w-4" /> Hover or focus me
              </span>
            </Tooltip>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Card className="p-5">
          <Tabs
            items={[
              { id: "one", label: "Overview", content: <p className="text-sm text-ink-soft">First panel content.</p> },
              { id: "two", label: "Activity", content: <p className="text-sm text-ink-soft">Second panel content.</p> },
              { id: "three", label: "Settings", content: <p className="text-sm text-ink-soft">Third panel content.</p> },
            ]}
          />
        </Card>
      </Section>

      <Section title="Table → cards on mobile (resize to check)">
        <Table columns={COLUMNS} rows={DEMO_ROWS} getRowKey={(row) => row.id} />
      </Section>

      <Section title="Loading & empty states">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <SkeletonText />
            <div className="mt-4 divide-y divide-line">
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </Card>
          <SkeletonCard />
        </div>
        <EmptyState
          icon={Inbox}
          title="No leads yet"
          description="Run one focused generation and send-ready records will land here."
          action={<Button size="sm">Generate leads</Button>}
        />
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete something…</Button>
          <Button variant="secondary" onClick={() => toast("Lead list updated.", "success")}>Success toast</Button>
          <Button variant="secondary" onClick={() => toast("Could not reach the API.", "error")}>Error toast</Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Edit campaign"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { setModalOpen(false); toast("Saved.", "success"); }}>Save changes</Button>
            </>
          }
        >
          <Field label="Campaign name" htmlFor="ks-modal-input">
            <Input id="ks-modal-input" defaultValue="Q3 agencies push" />
          </Field>
        </Modal>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => toast("Deleted.", "success")}
          title="Delete this campaign?"
          description="Leads stay in your workspace; the campaign and its schedule are removed. This can't be undone."
        />
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Lead preview">
          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">Maya Patel · Kinetic Studio</p>
            <div className="rounded-card border border-line bg-bg p-4 font-mono text-[13px] leading-6 text-ink-soft">
              Subject: A practical growth idea for Kinetic Studio
              <br />
              <br />
              Dear Maya,
              <br />
              <br />
              The mono-typeset email preview — the signature element — lives in surfaces like this.
            </div>
          </div>
        </Drawer>
      </Section>
    </div>
  );
}
