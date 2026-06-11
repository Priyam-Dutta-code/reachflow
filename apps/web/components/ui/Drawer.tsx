"use client";

/** Right-side drawer on native <dialog> (focus trap + Esc + scroll-lock). */
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "./cn";

export function Drawer({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-md p-0",
        "border-l border-line bg-surface shadow-pop",
        "data-[state=open]:translate-x-0",
        className
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-control p-1.5 text-muted transition-colors hover:bg-accent-tint hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
