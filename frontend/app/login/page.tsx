"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { createClient } from "@/lib/supabase";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const nextPath = searchParams.get("next") ?? "/dashboard";
    router.replace(nextPath);
  };

  return (
    <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card hidden flex-col justify-between p-10 lg:flex">
          <div>
            <div className="section-label">Welcome back</div>
            <h1 className="mt-5 font-display text-5xl font-semibold tracking-[-0.05em]">
              Pick up your pipeline where you left it.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/65">
              Manage lead discovery, campaigns, and follow-up from one polished workspace built for real outreach.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-3 text-sm text-white/75">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              Protected routes, verified payments, encrypted stored secrets.
            </div>
          </div>
        </div>

        <div className="shell-card mx-auto w-full max-w-xl p-6 md:p-8">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-lg font-bold text-slate-950">
                R
              </div>
              <div>
                <div className="font-display text-lg font-semibold">ReachFlow</div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/45">Lead discovery and cold email</div>
              </div>
            </Link>
            <h2 className="mt-8 font-display text-4xl font-semibold tracking-[-0.05em]">Log in</h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              Access your live pipeline, active campaigns, and sending controls in seconds.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              autoComplete="email"
              className="field w-full"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              required
              type="email"
              value={email}
            />
            <input
              autoComplete="current-password"
              className="field w-full"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              type="password"
              value={password}
            />

            {error && (
              <div className="rounded-3xl border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
                {error === "Email not confirmed"
                  ? "Please confirm your email from the Supabase email before logging in."
                  : error}
              </div>
            )}

            <button className="primary-button w-full !justify-center !py-3.5" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Enter dashboard"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-sm text-white/55">
            New here?{" "}
            <Link className="text-[var(--accent)] transition hover:text-white" href="/signup">
              Create a free account
            </Link>
          </p>
        </div>
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
