"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "./cn";

export type TabItem = { id: string; label: string; content: ReactNode };

export function Tabs({
  items,
  defaultTab,
  className,
  onChange,
}: {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
  onChange?: (id: string) => void;
}) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const baseId = useId();

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 border-b border-line" aria-label="Tabs">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              onClick={() => {
                setActive(item.id);
                onChange?.(item.id);
              }}
              className={cn(
                "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "border-accent text-accent-strong"
                  : "border-transparent text-muted hover:text-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          className="pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
