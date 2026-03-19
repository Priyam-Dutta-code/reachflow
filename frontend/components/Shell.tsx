"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  UserCog,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/leads", label: "Lead Studio", icon: Target },
  { href: "/campaigns", label: "Campaigns", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: UserCog },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center px-6">
        <div className="glass-card flex items-center gap-3 px-6 py-4 text-sm text-white/70">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
          Securing your workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const activeItem = NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const currentSection = activeItem?.label ?? "Workspace";

  return (
    <div className="app-shell">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 px-4 py-4 md:px-6 md:py-6">
        <AnimatePresence>
          {menuOpen && (
            <motion.button
              aria-label="Close navigation"
              className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.aside
          className={`shell-card fixed inset-y-4 left-4 z-40 flex w-[280px] flex-col overflow-hidden p-4 md:sticky md:top-6 md:z-10 md:h-[calc(100vh-3rem)] md:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-[120%]"
          } transition-transform duration-300`}
          initial={false}
        >
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] text-lg font-bold text-slate-950">
                R
              </div>
              <div>
                <div className="font-display text-lg font-semibold">ReachFlow</div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/45">
                  Outreach Workspace
                </div>
              </div>
            </Link>
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 md:hidden"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="section-label !px-3 !py-1.5 !text-[10px]">Built for real outreach</div>
            <div className="mt-4 text-2xl font-display font-semibold tracking-[-0.04em]">
              Run prospecting, hiring outreach, and campaigns from one focused workspace.
            </div>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Discover companies, recover contact emails, shape the message, and launch with more confidence.
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`glow-border flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                    active
                      ? "border-[rgba(139,243,216,0.34)] bg-[linear-gradient(135deg,rgba(139,243,216,0.14),rgba(72,225,255,0.08))] text-white"
                      : "border-white/5 bg-white/[0.03] text-white/68 hover:border-white/10 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {active && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-sm font-semibold">
                {user.email?.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{user.email}</div>
                <div className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  authenticated
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/pricing" className="secondary-button flex-1 !justify-center !px-4 !py-2.5">
                Upgrade
              </Link>
              <button
                className="secondary-button flex-1 !justify-center !px-4 !py-2.5 text-white/70"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="shell-card flex items-center justify-between gap-3 px-4 py-3 md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="flex items-center gap-3 md:hidden">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-bold text-slate-950">
                  R
                </div>
                <div className="font-display text-lg font-semibold">ReachFlow</div>
              </Link>

              <div className="hidden min-w-0 md:block">
                <div className="text-xs uppercase tracking-[0.28em] text-white/40">Workspace</div>
                <div className="mt-1 font-display text-2xl font-semibold tracking-[-0.04em] text-white">
                  {currentSection}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden max-w-[260px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65 lg:flex">
                <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                <span className="truncate">{user.email}</span>
              </div>

              <button
                className="secondary-button !justify-center !px-4 !py-2.5"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>

              <button
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
                onClick={() => setMenuOpen(true)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          <main className="shell-card relative min-h-[calc(100vh-2rem)] flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
            <div className="absolute inset-x-6 top-0 h-px ambient-line opacity-60" />
            <div className="relative">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
