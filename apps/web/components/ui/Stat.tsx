import type { ReactNode } from "react";

import { cn } from "./cn";

export function Stat({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-5", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">{value}</div>
      {detail && <div className="mt-1.5 text-[13px] text-muted">{detail}</div>}
    </div>
  );
}
