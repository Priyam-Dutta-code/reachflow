"use client";

/** The five-workflow picker cards (signup + onboarding step 1). */
import { BarChart3, Briefcase, GraduationCap, Handshake, Users } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { VERTICAL_LIST, type VerticalId } from "@/lib/verticals";

const ICONS: Record<VerticalId, typeof GraduationCap> = {
  job_seeker: GraduationCap,
  recruiter: Users,
  agency: Briefcase,
  business_growth: BarChart3,
  partnerships: Handshake,
};

export function VerticalPicker({
  value,
  onChange,
  compact = false,
}: {
  value: VerticalId;
  onChange: (vertical: VerticalId) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose your workflow"
      className={cn("grid gap-2.5", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}
    >
      {VERTICAL_LIST.map((item) => {
        const selected = item.id === value;
        const Icon = ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-card border p-3.5 text-left transition-colors",
              selected
                ? "border-accent/40 bg-accent-tint"
                : "border-line bg-surface hover:border-accent/20"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-control",
                  selected ? "bg-accent text-bg" : "bg-bg text-ink-soft"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-medium text-ink">{item.label}</span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-muted">{item.audience}</p>
          </button>
        );
      })}
    </div>
  );
}
