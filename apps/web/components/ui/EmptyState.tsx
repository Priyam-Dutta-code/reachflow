import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent-tint text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
