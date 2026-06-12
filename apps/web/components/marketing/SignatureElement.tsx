/**
 * THE signature element (master plan Part III): a real-shaped lead record
 * flowing into a mono-typeset drafted email. Server-renderable; the hero
 * morphs it per vertical, Lead Studio reuses the email half.
 */
import { ArrowDown, ArrowRight } from "lucide-react";

import type { Showcase } from "@/lib/marketing";

export function LeadRecordCard({ lead }: { lead: Showcase["lead"] }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">
          Lead record
        </span>
        <span className="rounded-badge border border-line bg-bg px-2 py-0.5 font-mono text-[11px] text-muted">
          {lead.source}
        </span>
      </div>
      <p className="mt-3 font-display text-lg font-semibold text-ink">{lead.name}</p>
      <p className="text-[13px] text-muted">
        {lead.role} · {lead.company} · {lead.location}
      </p>
      <p className="mt-2 inline-block rounded-control border border-line bg-bg px-2.5 py-1 font-mono text-[13px] text-ink-soft">
        {lead.email}
      </p>
    </div>
  );
}

export function MonoEmail({ draft, sender }: { draft: Showcase["draft"]; sender?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 font-mono text-[13px] leading-6 text-ink-soft">
      <p className="border-b border-line pb-2 text-muted">
        Subject: <span className="text-ink">{draft.subject}</span>
      </p>
      <p className="mt-3">{draft.opening}</p>
      <p className="mt-3">{draft.body}</p>
      <p className="mt-3">{draft.cta}</p>
      <p className="mt-3 text-muted">
        Best regards,
        <br />
        {sender ?? "You"}
      </p>
    </div>
  );
}

export function SignatureElement({ showcase }: { showcase: Showcase }) {
  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.2fr]">
      <LeadRecordCard lead={showcase.lead} />
      <div className="grid place-items-center text-accent" aria-hidden="true">
        <ArrowRight className="hidden h-5 w-5 lg:block" />
        <ArrowDown className="h-5 w-5 lg:hidden" />
      </div>
      <MonoEmail draft={showcase.draft} />
    </div>
  );
}
