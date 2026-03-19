"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";

type Step = "account" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [account, setAccount] = useState({ name: "", email: "", password: "" });
  const [profile, setProfile] = useState({
    sender_name: "",
    sender_email: "",
    sender_phone: "",
    sender_linkedin: "",
    sender_role: "Founder / Operator",
    sender_profile: "",
    gmail_password: "",
    groq_api_key: "",
  });

  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: { name: account.name } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (signInError || !signInData.session) {
        setError("Check your email and confirm your account, then log in to continue.");
        setLoading(false);
        return;
      }
    }

    setProfile((current) => ({
      ...current,
      sender_name: account.name,
      sender_email: account.email,
    }));
    setStep("profile");
    setLoading(false);
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiFetch("/api/auth/onboard", {
        method: "POST",
        body: JSON.stringify({ name: account.name, ...profile }),
      });
      router.replace("/dashboard");
    } catch (submissionError: any) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-card hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="section-label">Start strong</div>
            <h1 className="mt-5 font-display text-5xl font-semibold tracking-[-0.05em]">
              Create your workspace and start with a cleaner outbound foundation.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/65">
              Your profile shapes how ReachFlow writes, personalizes, and signs every outbound message. You can refine
              it any time from Settings.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Free plan with lead generation and analytics",
              "Optional Gmail app password for live sending",
              "Optional Groq key for dedicated AI usage",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="shell-card mx-auto w-full max-w-2xl p-6 md:p-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-lg font-bold text-slate-950">
              R
            </div>
              <div>
                <div className="font-display text-lg font-semibold">ReachFlow</div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/45">Lead discovery and cold email</div>
              </div>
            </Link>

          <div className="mt-8 flex items-center gap-3">
            {(["account", "profile"] as Step[]).map((current, index) => (
              <div key={current} className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-semibold ${
                    step === current
                      ? "border-[rgba(139,243,216,0.4)] bg-[rgba(139,243,216,0.16)] text-white"
                      : "border-white/10 bg-white/[0.04] text-white/40"
                  }`}
                >
                  {index + 1}
                </div>
                {index === 0 && <div className="h-px w-10 bg-white/10" />}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-4xl font-semibold tracking-[-0.05em]">
              {step === "account" ? "Create your account" : "Set your sender profile"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              {step === "account"
                ? "Start with the essentials. You can add sending credentials and message context in the next step."
                : "These details help every email sound sharper, more credible, and more consistent with your positioning."}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-3xl border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {error}
            </div>
          )}

          {step === "account" ? (
            <form className="mt-6 space-y-4" onSubmit={submitAccount}>
              <input
                autoComplete="name"
                className="field w-full"
                onChange={(event) => setAccount({ ...account, name: event.target.value })}
                placeholder="Full name"
                required
                value={account.name}
              />
              <input
                autoComplete="email"
                className="field w-full"
                onChange={(event) => setAccount({ ...account, email: event.target.value })}
                placeholder="Email address"
                required
                type="email"
                value={account.email}
              />
              <input
                autoComplete="new-password"
                className="field w-full"
                minLength={6}
                onChange={(event) => setAccount({ ...account, password: event.target.value })}
                placeholder="Password"
                required
                type="password"
                value={account.password}
              />

              <button className="primary-button w-full !justify-center !py-3.5" disabled={loading} type="submit">
                {loading ? "Creating account..." : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submitProfile}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field w-full"
                  onChange={(event) => setProfile({ ...profile, sender_name: event.target.value })}
                  placeholder="Sender name"
                  required
                  value={profile.sender_name}
                />
                <input
                  className="field w-full"
                  onChange={(event) => setProfile({ ...profile, sender_phone: event.target.value })}
                  placeholder="Phone number"
                  value={profile.sender_phone}
                />
              </div>
              <input
                className="field w-full"
                onChange={(event) => setProfile({ ...profile, sender_role: event.target.value })}
                placeholder="Your role or positioning"
                value={profile.sender_role}
              />
              <input
                className="field w-full"
                onChange={(event) => setProfile({ ...profile, sender_linkedin: event.target.value })}
                placeholder="LinkedIn URL"
                value={profile.sender_linkedin}
              />
              <textarea
                className="textarea-field min-h-[130px] w-full"
                onChange={(event) => setProfile({ ...profile, sender_profile: event.target.value })}
                placeholder="Describe your offer, background, or the kind of outreach you want AI to help write."
                value={profile.sender_profile}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field w-full"
                  onChange={(event) => setProfile({ ...profile, gmail_password: event.target.value })}
                  placeholder="Gmail app password (optional)"
                  type="password"
                  value={profile.gmail_password}
                />
                <input
                  className="field w-full"
                  onChange={(event) => setProfile({ ...profile, groq_api_key: event.target.value })}
                  placeholder="Groq API key (optional)"
                  value={profile.groq_api_key}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="primary-button flex-1 !justify-center !py-3.5" disabled={loading} type="submit">
                  {loading ? "Saving profile..." : "Launch workspace"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  className="secondary-button flex-1 !justify-center !py-3.5"
                  onClick={() => router.replace("/dashboard")}
                  type="button"
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-sm text-white/55">
            Already have an account?{" "}
            <Link className="text-[var(--accent)] transition hover:text-white" href="/login">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
