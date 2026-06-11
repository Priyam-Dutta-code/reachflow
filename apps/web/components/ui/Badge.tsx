import type { ReactNode } from "react";

import { cn } from "./cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONE: Record<BadgeTone, string> = {
  neutral: "border-line bg-bg text-ink-soft",
  accent: "border-accent/20 bg-accent-tint text-accent-strong",
  success: "border-success/20 bg-success-bg text-success",
  warning: "border-warning/20 bg-warning-bg text-warning",
  danger: "border-danger/20 bg-danger-bg text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-badge border px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** ONE status→style map for lead + campaign states (master plan Phase 5). */
export const STATUS_TONE: Record<string, BadgeTone> = {
  // leads
  pending: "neutral",
  sent: "accent",
  replied: "success",
  bounced: "danger",
  unsubscribed: "warning",
  // campaigns
  draft: "neutral",
  active: "success",
  paused: "warning",
  complete: "accent",
  // jobs
  queued: "neutral",
  running: "accent",
  completed: "success",
  failed: "danger",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Badge tone={tone} className={cn("capitalize", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
