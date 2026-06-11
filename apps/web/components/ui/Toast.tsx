"use client";

/** Toast system — replaces V1's inline error strings everywhere. */
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "./cn";

export type ToastVariant = "success" | "error" | "info";

type Toast = { id: number; variant: ToastVariant; message: string };

type ToastContextType = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

const VARIANT_STYLE: Record<ToastVariant, string> = {
  success: "border-success/25 bg-success-bg text-success",
  error: "border-danger/25 bg-danger-bg text-danger",
  info: "border-accent/25 bg-accent-tint text-accent-strong",
};

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-3), { id, variant, message }]);
      window.setTimeout(() => dismiss(id), 5500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {toasts.map((item) => {
          const Icon = VARIANT_ICON[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card border bg-surface p-3.5 shadow-pop",
                VARIANT_STYLE[item.variant]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm leading-5 text-ink">{item.message}</p>
              <button
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="rounded-badge p-0.5 text-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
