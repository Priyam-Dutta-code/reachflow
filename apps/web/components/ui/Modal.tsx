"use client";

/** Modal + ConfirmDialog on native <dialog>: focus trap, Esc, scroll-lock
 * (body lock lives in globals.css) all come from the platform. */
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
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
        // click on the backdrop (the dialog element itself) closes
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-lg rounded-card border border-line bg-surface p-0 shadow-pop",
        "backdrop:bg-transparent", // styled in globals.css
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-control p-1.5 text-muted transition-colors hover:bg-accent-tint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
    </dialog>
  );
}

/** Destructive-action confirmation (master plan Appendix D requirement). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-ink-soft">{description}</p>
    </Modal>
  );
}
