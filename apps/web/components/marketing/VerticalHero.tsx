"use client";

/** The morphing five-vertical switcher (V1's genuinely good interaction,
 * fully restyled). Client island — everything around it stays server-rendered. */
import Link from "next/link";
import { useRef, useState } from "react";

import { SignatureElement } from "@/components/marketing/SignatureElement";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { SHOWCASE } from "@/lib/marketing";
import { DEFAULT_VERTICAL, VERTICAL_LIST, getVerticalConfig, type VerticalId } from "@/lib/verticals";

export function VerticalHero() {
  const [active, setActive] = useState<VerticalId>(DEFAULT_VERTICAL);
  // animate only on switches — the first server-rendered paint must be
  // instant (it's the LCP element)
  const interacted = useRef(false);
  const vertical = getVerticalConfig(active);
  const showcase = SHOWCASE[active];

  return (
    <div>
      {/* switcher chips */}
      <div
        role="tablist"
        aria-label="Choose your workflow"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
      >
        {VERTICAL_LIST.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                interacted.current = true;
                setActive(item.id);
              }}
              className={cn(
                "shrink-0 rounded-control border px-3.5 py-2 text-sm font-medium transition-colors min-h-11",
                selected
                  ? "border-accent/30 bg-accent-tint text-accent-strong"
                  : "border-line bg-surface text-ink-soft hover:border-accent/20 hover:text-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* morphing panel */}
      <div
        key={active}
        className={cn("mt-6", interacted.current && "motion-safe:animate-[hero-in_240ms_ease-out]")}
      >
        <p className="max-w-2xl text-[15px] leading-7 text-ink-soft">{vertical.landingSummary}</p>

        <div className="mt-5">
          <SignatureElement showcase={showcase} />
        </div>

        <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-6">
          {showcase.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2.5 text-sm text-ink-soft">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-tint font-mono text-xs font-semibold text-accent-strong">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <Link href={`/signup?vertical=${active}`} className={buttonClasses()}>
            Start free as {vertical.label.toLowerCase()}
          </Link>
        </div>
      </div>
    </div>
  );
}
