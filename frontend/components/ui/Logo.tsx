import Link from "next/link";

import { cn } from "./cn";

export function Logo({
  href = "/",
  subtitle,
  className,
}: {
  href?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="ReachFlow home">
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ember font-display text-base font-semibold text-white">
        R
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold tracking-[-0.01em] text-ink">ReachFlow</span>
        {subtitle && (
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
