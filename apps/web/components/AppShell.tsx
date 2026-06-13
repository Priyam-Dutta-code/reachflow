"use client";

/** App shell: light top-bar + left sidebar (desktop), top-bar + slide-over
 * drawer (mobile). Quiet, dense, fast. */
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { cn } from "@/components/ui/cn";
import { useAuth } from "@/lib/AuthProvider";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/leads", label: "Lead Studio", icon: Target },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="ReachFlow home">
      <span className="grid h-8 w-8 place-items-center rounded-control bg-accent font-display text-sm font-bold text-white">
        R
      </span>
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">ReachFlow</span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors",
              active
                ? "bg-accent-tint text-accent-strong"
                : "text-ink-soft hover:bg-bg hover:text-ink"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PlanChip() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="rounded-card border border-line bg-bg p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
          {user.plan_name}
        </span>
        <Link href="/pricing" className="text-xs font-medium text-accent hover:underline">
          Upgrade
        </Link>
      </div>
      <ProgressMeter
        className="mt-2.5"
        label="Lead quota"
        value={user.leads_used}
        max={user.leads_quota}
      />
      <p className="mt-2 font-mono text-xs text-muted">{user.credits} credits left</p>
    </div>
  );
}

function AccountRow() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2.5 border-t border-line pt-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-tint text-sm font-semibold text-accent-strong">
        {(user.name || user.email).slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{user.name || user.email}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <button
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
        aria-label="Sign out"
        title="Sign out"
        className="rounded-control p-2 text-muted transition-colors hover:bg-danger-bg hover:text-danger"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-bg">
      {/* top bar (mobile + desktop) */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-sm lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Wordmark />
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            className="grid h-11 w-11 place-items-center rounded-control text-ink-soft transition-colors hover:bg-bg"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* mobile slide-over drawer */}
      <dialog
        ref={drawerRef}
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === drawerRef.current) setMenuOpen(false);
        }}
        className="fixed inset-y-0 left-0 m-0 mr-auto h-dvh max-h-dvh w-[min(86vw,300px)] border-r border-line bg-surface p-0 lg:hidden"
        aria-label="Navigation"
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <Wordmark />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
              className="grid h-11 w-11 place-items-center rounded-control text-ink-soft hover:bg-bg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          <div className="mt-auto space-y-3">
            <PlanChip />
            <AccountRow />
          </div>
        </div>
      </dialog>

      <div className="mx-auto flex w-full max-w-screen-2xl">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 border-r border-line bg-surface p-4 lg:flex">
          <div className="px-1 py-1.5">
            <Wordmark />
          </div>
          <NavLinks pathname={pathname} />
          <div className="mt-auto space-y-3">
            <PlanChip />
            <AccountRow />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <FeedbackWidget />
    </div>
  );
}
