"use client";

import { useId, type ReactNode } from "react";

import { cn } from "./cn";

/** CSS-only tooltip (hover + keyboard focus). Shadows allowed: popover. */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <span className={cn("group relative inline-flex", className)}>
      <span aria-describedby={id} tabIndex={0} className="inline-flex rounded-control outline-offset-2">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-56 -translate-x-1/2",
          "rounded-control border border-line bg-ink px-2.5 py-1.5 text-xs leading-5 text-white shadow-pop",
          "opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 group-focus-within:opacity-100"
        )}
      >
        {content}
      </span>
    </span>
  );
}
