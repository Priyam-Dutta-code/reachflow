import type { ReactNode } from "react";

import { cn } from "./cn";

export type BadgeTone = "neutral" | "accent" | "ok" | "bad";

// Literal class names so Tailwind keeps these @layer component rules.
const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "badge--neutral",
  accent: "badge--accent",
  ok: "badge--ok",
  bad: "badge--bad",
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
  return <span className={cn("badge", TONE_CLASS[tone], className)}>{children}</span>;
}
