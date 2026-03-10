"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard",  label: "Dashboard", icon: "⬛" },
  { href: "/leads",      label: "Leads",      icon: "◎"  },
  { href: "/campaigns",  label: "Campaigns",  icon: "◈"  },
  { href: "/analytics",  label: "Analytics",  icon: "◉"  },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    // Only redirect after loading is done and we know there's no session
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  // Show blank dark screen while auth state loads (prevents any flash)
  if (loading) {
    return (
      <div style={{ background: "#07070d", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>Loading…</div>
      </div>
    );
  }

  // Don't render any protected content until auth is confirmed
  if (!user) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#07070d", color: "#e8e8f0" }}>
      <aside style={{
        width: 212, borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", padding: "20px 12px",
        position: "sticky", top: 0, height: "100vh", flexShrink: 0,
        fontFamily: "DM Sans, sans-serif",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", marginBottom: 28, textDecoration: "none", color: "white" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "Syne,sans-serif" }}>R</div>
          <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>ReachFlow</span>
        </Link>

        {/* Nav links */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(n => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                borderRadius: 10, textDecoration: "none", fontSize: 13.5,
                fontWeight: active ? 500 : 400,
                background: active ? "rgba(124,58,237,0.18)" : "transparent",
                color: active ? "#c4b5fd" : "rgba(255,255,255,0.45)",
                transition: "background 0.15s, color 0.15s",
              }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginBottom: 6 }}>
          <div style={{ padding: "4px 10px 6px", fontSize: 11, color: "rgba(255,255,255,0.2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
        </div>

        {/* Upgrade + logout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/pricing" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, textDecoration: "none", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            <span>💳</span> Upgrade
          </Link>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
            borderRadius: 10, border: "none", background: "transparent",
            fontSize: 13, color: "rgba(255,255,255,0.2)", cursor: "pointer",
            fontFamily: "DM Sans, sans-serif", width: "100%", textAlign: "left",
          }}>
            <span>→</span> Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto", maxHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
