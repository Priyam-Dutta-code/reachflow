"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { VERTICAL_LIST, getVerticalConfig, normalizeVertical, type VerticalId } from "@/lib/verticals";

type Step = "account" | "profile";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedVertical, setSelectedVertical] = useState<VerticalId>("business_growth");

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSelectedVertical(normalizeVertical(params.get("vertical")));
    }
  }, []);

  const vertical = getVerticalConfig(selectedVertical);

  const submitAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: { name: account.name, vertical: selectedVertical } },
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
        body: JSON.stringify({ name: account.name, vertical: selectedVertical, ...profile }),
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
      <div className="grid w-full max-w-7xl gap-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="glass-card hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="section-label">{vertical.tag} workflow</div>
            <h1 className="mt-5 font-display text-5xl font-semibold tracking-[-0.06em]">{vertical.landingHeadline}</h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/65">{vertical.landingSummary}</p>
          </div>

          <div className="space-y-3">
            {vertical.landingBullets.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72"
              >
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="shell-card mx-auto w-full max-w-3xl p-6 md:p-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8bf3d8,#48e1ff)] font-display text-lg font-bold text-slate-950">
              R
            </div>
            <div>
              <div className="font-display text-lg font-semibold">ReachFlow</div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/45">Vertical onboarding</div>
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
              {step === "account" ? "Create your account" : `Set up your ${vertical.label.toLowerCase()} profile`}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/65">
              {step === "account"
                ? "Choose the buyer motion first. ReachFlow will use it to shape your dashboard, pricing, lead generation, and email copy."
                : vertical.dashboardSummary}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-3xl border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
              {error}
            </div>
          )}

          {step === "account" ? (
            <form className="mt-6 space-y-5" onSubmit={submitAccount}>
              <div className="grid gap-3 md:grid-cols-2">
                {VERTICAL_LIST.map((item) => (
                  <button
                    key={item.id}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      selectedVertical === item.id
                        ? "border-[rgba(139,243,216,0.34)] bg-[rgba(139,243,216,0.12)]"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    }`}
                    onClick={() => setSelectedVertical(item.id)}
                    type="button"
                  >
                    <div className="text-xs uppercase tracking-[0.24em] text-white/42">{item.tag}</div>
                    <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">{item.label}</div>
                    <p className="mt-3 text-sm leading-7 text-white/64">{item.audience}</p>
                  </button>
                ))}
              </div>

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
                {loading ? "Creating account..." : `Continue with ${vertical.label}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submitProfile}>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/68">
                <span className="font-semibold text-white">Selected vertical:</span> {vertical.label}. You can change this later in Settings if you want a different workspace and pricing model.
              </div>

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
                placeholder="Role, offer, or positioning"
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
                placeholder="Describe your offer, background, outcomes, or the voice you want ReachFlow to reflect in outbound copy."
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
