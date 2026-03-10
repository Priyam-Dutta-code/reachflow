"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
  padding: "12px 16px", fontSize: 14, color: "#e8e8f0",
  outline: "none", fontFamily: "DM Sans, sans-serif",
};

function LoginForm() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      // Show the exact Supabase error (e.g. "Email not confirmed", "Invalid login credentials")
      setError(err.message);
      setLoading(false);
      return;
    }

    // Session is now in localStorage. onAuthStateChange in AuthProvider
    // will pick it up and update context. Navigate to dashboard.
    const next = searchParams.get("next") ?? "/dashboard";
    router.replace(next); // replace so back-button doesn't go to /login
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070d", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "white", marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14 }}>R</div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16 }}>ReachFlow</span>
          </Link>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 6, color: "#e8e8f0" }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)" }}>Log in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={inp} autoComplete="email"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            style={inp} autoComplete="current-password"
          />

          {error && (
            <div style={{ padding: "10px 13px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13, lineHeight: 1.5 }}>
              {error === "Email not confirmed"
                ? "Please check your inbox and confirm your email before logging in."
                : error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
              padding: "13px", fontSize: 14, fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "DM Sans, sans-serif", opacity: loading ? 0.65 : 1,
              marginTop: 4,
            }}
          >
            {loading ? "Logging in…" : "Log in →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "#a78bfa", textDecoration: "none" }}>Sign up free</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
