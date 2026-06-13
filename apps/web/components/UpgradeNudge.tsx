"use client";

/** Contextual upgrade moment (Phase 9). Honest, specific, one-click to
 * pricing — never dark-patterned. Shown at quota/slot/cap walls. */
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

export function UpgradeNudge({
  vertical,
  reason,
  className,
}: {
  vertical: string;
  reason: string;
  className?: string;
}) {
  return (
    <Card className={`flex flex-wrap items-center justify-between gap-3 border-accent/30 bg-accent-tint p-4 ${className ?? ""}`}>
      <p className="text-sm text-accent-strong">{reason}</p>
      <Link
        href={`/pricing?vertical=${vertical}`}
        onClick={() => track("upgrade_click", { reason })}
        className={buttonClasses({ size: "sm" })}
      >
        See plans <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
