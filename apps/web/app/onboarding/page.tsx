"use client";

/** Post-signup onboarding — resumable (?step=), skippable, ending in a
 * guided first lead run. Target: signup → first leads in under 2 minutes. */
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { VerticalPicker } from "@/components/VerticalPicker";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { PasswordInput } from "@/components/PasswordInput";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { StatusPill } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { track } from "@/lib/analytics";
import { apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";
import { getVerticalConfig, normalizeVertical, type VerticalId } from "@/lib/verticals";

const STEPS = ["Workflow", "Sender identity", "Integrations", "First lead run"] as const;

/** Prefilled first-run queries per vertical — believable, broad enough to hit. */
const FIRST_RUN_PREFILL: Record<VerticalId, { query: string; location: string }> = {
  job_seeker: { query: "Software Engineer", location: "Bengaluru" },
  recruiter: { query: "engineering hiring", location: "India" },
  agency: { query: "design studio", location: "Mumbai" },
  business_growth: { query: "B2B SaaS", location: "India" },
  partnerships: { query: "SaaS integration partners", location: "India" },
};

type GeneratedLead = { id: number; name: string; company: string; email: string; source: string; status: string };

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Onboarding progress">
      {STEPS.map((label, index) => {
        const stepState = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold " +
                (stepState === "done"
                  ? "bg-accent text-bg"
                  : stepState === "active"
                    ? "bg-accent-tint text-accent-strong"
                    : "bg-bg text-muted")
              }
              aria-current={stepState === "active" ? "step" : undefined}
            >
              {stepState === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={"text-[13px] " + (stepState === "active" ? "font-medium text-ink" : "text-muted")}>
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="h-px w-5 bg-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function OnboardingInner() {
  const { user, loading, reload } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(() => {
    const fromUrl = Number(searchParams.get("step"));
    return Number.isInteger(fromUrl) && fromUrl >= 0 && fromUrl <= 3 ? fromUrl : 0;
  });
  const [vertical, setVertical] = useState<VerticalId>("business_growth");
  const [senderName, setSenderName] = useState("");
  const [senderRole, setSenderRole] = useState("");
  const [senderProfile, setSenderProfile] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [busy, setBusy] = useState(false);

  // first-run state
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobMessage, setJobMessage] = useState("");
  const [jobFailed, setJobFailed] = useState(false);
  const [results, setResults] = useState<GeneratedLead[] | null>(null);
  const seeded = useRef(false);

  // seed form state from the profile once
  useEffect(() => {
    if (!user || seeded.current) return;
    seeded.current = true;
    const v = normalizeVertical(user.vertical);
    setVertical(v);
    setSenderName(user.sender_name || user.name || "");
    setSenderRole(user.sender_role || "");
    setSenderProfile(user.sender_profile || "");
    setQuery(FIRST_RUN_PREFILL[v].query);
    setLocation(FIRST_RUN_PREFILL[v].location);
  }, [user]);

  // keep the step in the URL (resumable)
  useEffect(() => {
    window.history.replaceState({}, "", `/onboarding?step=${step}`);
  }, [step]);

  // poll the generation job
  useEffect(() => {
    if (!jobId) return;
    const interval = window.setInterval(async () => {
      try {
        const status = await apiFetch<{
          status: string;
          progress: number;
          message?: string;
          warning?: string;
          added?: number;
        }>(`/api/leads/generate/${jobId}`);
        setJobProgress(status.progress ?? 0);
        if (status.status === "completed") {
          window.clearInterval(interval);
          setJobMessage([status.message, status.warning].filter(Boolean).join(" "));
          const listed = await apiFetch<{ leads: GeneratedLead[] }>("/api/leads/?per_page=8");
          setResults(listed.leads);
          await reload();
        } else if (status.status === "failed") {
          window.clearInterval(interval);
          setJobFailed(true);
          setJobMessage(status.message || "Generation failed — try a broader query.");
          setJobId(null);
        }
      } catch {
        /* transient poll error — keep trying */
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [jobId, reload]);

  if (loading) return null;
  if (!user) {
    router.replace("/login?next=/onboarding");
    return null;
  }

  const verticalConfig = getVerticalConfig(vertical);
  const inputs = verticalConfig.leadInputs;

  async function saveStep(payload: Record<string, string>, nextStep: number) {
    setBusy(true);
    try {
      await apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify(payload) });
      await reload();
      track("onboarding_step", { step: nextStep });
      setStep(nextStep);
    } catch (saveError) {
      toast(saveError instanceof Error ? saveError.message : "Could not save.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function startFirstRun() {
    if (query.trim().length < 2) {
      toast(`Add ${inputs.queryLabel.toLowerCase()} first.`, "error");
      return;
    }
    setBusy(true);
    setJobFailed(false);
    setResults(null);
    try {
      const started = await apiFetch<{ job_id: string }>("/api/leads/generate", {
        method: "POST",
        body: JSON.stringify({ source: "auto", query: query.trim(), location: location.trim(), max: 15 }),
      });
      setJobId(started.job_id);
      setJobProgress(5);
      setJobMessage("");
      track("first_generate", { vertical });
    } catch (startError) {
      toast(startError instanceof Error ? startError.message : "Could not start.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl font-semibold text-ink">
            ReachFlow
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">
            Skip for now
          </Link>
        </div>

        <Card className="mt-6 p-6 sm:p-8">
          <Stepper current={step} />

          {step === 0 && (
            <div className="mt-6">
              <h1 className="font-display text-2xl font-semibold text-ink">Confirm your workflow</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                This shapes your dashboard, lead sources, and email tone. Change it anytime in Settings.
              </p>
              <div className="mt-5">
                <VerticalPicker value={vertical} onChange={setVertical} compact />
              </div>
              <Button
                className="mt-6 w-full"
                loading={busy}
                onClick={() => {
                  const prefill = FIRST_RUN_PREFILL[vertical];
                  setQuery(prefill.query);
                  setLocation(prefill.location);
                  void saveStep({ vertical }, 1);
                }}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6">
              <h1 className="font-display text-2xl font-semibold text-ink">Your sender identity</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                This powers every draft — who you are and what you bring. Two sentences beat two paragraphs.
              </p>
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sender name" htmlFor="sender_name">
                    <Input id="sender_name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                  </Field>
                  <Field label="Role or offer" htmlFor="sender_role" hint='e.g. "Backend engineer" or "Founder, Kinetic Studio"'>
                    <Input id="sender_role" value={senderRole} onChange={(e) => setSenderRole(e.target.value)} />
                  </Field>
                </div>
                <Field
                  label="Profile blurb"
                  htmlFor="sender_profile"
                  hint="What you do, proof you do it well, and the tone you want."
                >
                  <Textarea
                    id="sender_profile"
                    value={senderProfile}
                    onChange={(e) => setSenderProfile(e.target.value)}
                    maxLength={800}
                  />
                </Field>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  loading={busy}
                  onClick={() => {
                    if (senderName.trim().length < 2) {
                      toast("Add your sender name first.", "error");
                      return;
                    }
                    void saveStep(
                      {
                        sender_name: senderName.trim(),
                        sender_email: user.sender_email || user.email,
                        ...(senderRole.trim() ? { sender_role: senderRole.trim() } : {}),
                        ...(senderProfile.trim() ? { sender_profile: senderProfile.trim() } : {}),
                      },
                      2
                    );
                  }}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6">
              <h1 className="font-display text-2xl font-semibold text-ink">Optional connections</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Both are optional today. Gmail unlocks real sending; your own Groq key gives drafting
                its own quota. Stored encrypted, never shown back.
              </p>
              <div className="mt-5 space-y-4">
                <Field
                  label="Gmail app password"
                  htmlFor="gmail_password"
                  hint="Google Account → Security → App passwords. Needed only when you start sending."
                >
                  <PasswordInput
                    id="gmail_password"
                    value={gmailPassword}
                    onChange={(e) => setGmailPassword(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Groq API key" htmlFor="groq_key" hint="console.groq.com — free tier. Drafting works without it.">
                  <PasswordInput
                    id="groq_key"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    autoComplete="off"
                  />
                </Field>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  loading={busy}
                  onClick={() => {
                    const payload: Record<string, string> = {};
                    if (gmailPassword.trim()) payload.gmail_password = gmailPassword.trim();
                    if (groqKey.trim()) payload.groq_api_key = groqKey.trim();
                    if (Object.keys(payload).length === 0) {
                      setStep(3);
                      return;
                    }
                    void saveStep(payload, 3);
                  }}
                >
                  {gmailPassword || groqKey ? "Save and continue" : "Do this later"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6">
              <h1 className="font-display text-2xl font-semibold text-ink">{verticalConfig.leadTitle}</h1>
              <p className="mt-2 text-sm leading-6 text-muted">{verticalConfig.leadSummary}</p>

              {!jobId && !results && (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label={inputs.queryLabel} htmlFor="fr_query">
                      <Input id="fr_query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={inputs.queryPlaceholder} />
                    </Field>
                    <Field label={inputs.locationLabel} htmlFor="fr_location">
                      <Input id="fr_location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={inputs.locationPlaceholder} />
                    </Field>
                  </div>
                  {jobFailed && (
                    <p className="mt-4 rounded-card border border-warning/25 bg-warning-bg px-4 py-3 text-sm leading-6 text-warning" role="alert">
                      {jobMessage}
                    </p>
                  )}
                  <div className="mt-6 flex gap-3">
                    <Button variant="secondary" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button className="flex-1" loading={busy} onClick={() => void startFirstRun()}>
                      Generate my first leads (uses up to 15 of your quota)
                    </Button>
                  </div>
                </>
              )}

              {jobId && !results && (
                <div className="mt-6 space-y-4" role="status" aria-live="polite">
                  <ProgressMeter label="Searching public sources…" value={jobProgress} max={100} />
                  <p className="text-sm leading-6 text-muted">
                    ReachFlow is checking job boards, the open web, and public company pages.
                    This usually takes under a minute.
                  </p>
                </div>
              )}

              {results && (
                <div className="mt-6">
                  <p className="rounded-card border border-success/25 bg-success-bg px-4 py-3 text-sm leading-6 text-success">
                    {jobMessage || "Your first leads are in."}
                  </p>
                  {results.length > 0 ? (
                    <ul className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                      {results.map((lead) => (
                        <li key={lead.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{lead.name || lead.company}</p>
                            <p className="truncate font-mono text-xs text-muted">{lead.email}</p>
                          </div>
                          <StatusPill status={lead.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-muted">
                      No email-ready leads this run — try a broader query from the dashboard.
                    </p>
                  )}
                  <Link href="/dashboard" className={buttonClasses({ className: "mt-6 w-full" })}>
                    Open my workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
