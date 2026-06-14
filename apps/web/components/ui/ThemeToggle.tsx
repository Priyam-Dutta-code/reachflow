"use client";

/** Futuristic dark/light toggle.
 * Flips `data-theme` on <html> (token vars cascade → whole app re-skins).
 * Uses the View Transitions API for a circular reveal wiping out from the
 * click point; falls back to a CSS color-fade when VT/​reduced-motion. */
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "./cn";

type Theme = "dark" | "light";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
  }, []);

  function applyTheme(next: Theme) {
    const el = document.documentElement;
    el.setAttribute("data-theme", next);
    el.style.colorScheme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode — fine, just don't persist */
    }
    setTheme(next);
  }

  function onToggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (reduce || typeof doc.startViewTransition !== "function") {
      applyTheme(next);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const transition = doc.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-line",
        "bg-surface-2 transition-colors duration-300 hover:border-accent/40",
        className
      )}
    >
      {/* faint track icons */}
      <Sun
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted transition-opacity duration-300",
          isDark ? "opacity-40" : "opacity-0"
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted transition-opacity duration-300",
          isDark ? "opacity-0" : "opacity-40"
        )}
      />
      {/* sliding knob — glowing mint orb that morphs sun↔moon */}
      <span
        suppressHydrationWarning
        className={cn(
          "absolute left-1 grid h-7 w-7 place-items-center rounded-full bg-accent text-bg",
          "shadow-[0_0_14px_-2px_var(--color-accent)] transition-transform duration-300",
          "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
          isDark ? "translate-x-7" : "translate-x-0"
        )}
      >
        {isDark ? <Moon aria-hidden className="h-4 w-4" /> : <Sun aria-hidden className="h-4 w-4" />}
      </span>
    </button>
  );
}
