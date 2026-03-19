"use client";

import { LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { VERTICAL_LIST, getVerticalConfig, normalizeVertical } from "@/lib/verticals";

export default function SettingsPage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    vertical: "business_growth",
    sender_name: "",
    sender_email: "",
    sender_phone: "",
    sender_linkedin: "",
    sender_role: "",
    sender_profile: "",
    gmail_password: "",
    groq_api_key: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    apiFetch("/api/auth/me")
      .then((data) => {
        setProfile(data);
        setForm({
          name: data.name || "",
          vertical: normalizeVertical(data.vertical),
          sender_name: data.sender_name || "",
          sender_email: data.sender_email || data.email || "",
          sender_phone: data.sender_phone || "",
          sender_linkedin: data.sender_linkedin || "",
          sender_role: data.sender_role || "",
          sender_profile: data.sender_profile || "",
          gmail_password: "",
          groq_api_key: "",
        });
        setError("");
      })
      .catch((requestError: any) => setError(requestError.message));
  }, [session]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        vertical: normalizeVertical(form.vertical),
        ...(form.gmail_password ? { gmail_password: form.gmail_password } : {}),
        ...(form.groq_api_key ? { groq_api_key: form.groq_api_key } : {}),
      };
      if (!form.gmail_password) {
        delete (payload as Record<string, string>).gmail_password;
      }
      if (!form.groq_api_key) {
        delete (payload as Record<string, string>).groq_api_key;
      }

      const data = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setProfile(data.user);
      setForm((current) => ({ ...current, gmail_password: "", groq_api_key: "" }));
      setMessage("Settings updated. ReachFlow will now use this vertical and sender profile for new lead runs and draft generation.");
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const vertical = getVerticalConfig(form.vertical);

  return (
    <Shell>
      <div className="space-y-6">
        <Reveal>
          <div>
            <div className="section-label">Settings</div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              Configure the workspace behind every lead run and outbound send.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              Switch verticals, tune your sender identity, and keep optional credentials in one secure place. Sensitive
              values stay encrypted after save.
            </p>
          </div>
        </Reveal>

        {(message || error) && (
          <div
            className={`rounded-[24px] px-5 py-4 text-sm leading-7 ${
              error
                ? "border border-[rgba(255,140,140,0.24)] bg-[rgba(255,140,140,0.08)] text-[var(--danger)]"
                : "border border-white/10 bg-white/[0.04] text-white/75"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <form className="glass-card grid gap-4 p-6 md:grid-cols-2" onSubmit={saveProfile}>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs uppercase tracking-[0.22em] text-white/42">Workspace vertical</span>
                <div className="grid gap-3 md:grid-cols-2">
                  {VERTICAL_LIST.map((item) => (
                    <button
                      key={item.id}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        form.vertical === item.id
                          ? "border-[rgba(139,243,216,0.34)] bg-[rgba(139,243,216,0.12)]"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                      onClick={() => setForm({ ...form, vertical: item.id })}
                      type="button"
                    >
                      <div className="text-xs uppercase tracking-[0.22em] text-white/42">{item.tag}</div>
                      <div className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">{item.label}</div>
                      <p className="mt-3 text-sm leading-7 text-white/64">{item.audience}</p>
                    </button>
                  ))}
                </div>
              </label>

              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Full name"
                value={form.name}
              />
              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, sender_name: event.target.value })}
                placeholder="Sender name"
                value={form.sender_name}
              />
              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, sender_email: event.target.value })}
                placeholder="Sender email"
                type="email"
                value={form.sender_email}
              />
              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, sender_phone: event.target.value })}
                placeholder="Phone number"
                value={form.sender_phone}
              />
              <input
                className="field w-full md:col-span-2"
                onChange={(event) => setForm({ ...form, sender_role: event.target.value })}
                placeholder="Role or offer"
                value={form.sender_role}
              />
              <input
                className="field w-full md:col-span-2"
                onChange={(event) => setForm({ ...form, sender_linkedin: event.target.value })}
                placeholder="LinkedIn URL"
                value={form.sender_linkedin}
              />
              <textarea
                className="textarea-field min-h-[160px] w-full md:col-span-2"
                onChange={(event) => setForm({ ...form, sender_profile: event.target.value })}
                placeholder="Describe your offer, experience, outcomes, or the tone you want ReachFlow to reflect."
                value={form.sender_profile}
              />
              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, gmail_password: event.target.value })}
                placeholder="New Gmail app password"
                type="password"
                value={form.gmail_password}
              />
              <input
                className="field w-full"
                onChange={(event) => setForm({ ...form, groq_api_key: event.target.value })}
                placeholder="New Groq API key"
                value={form.groq_api_key}
              />

              <button className="primary-button md:col-span-2" disabled={saving} type="submit">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save settings"}
              </button>
            </form>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-4">
              <div className="glass-card p-6">
                <div className="section-label !px-3 !py-1.5 !text-[10px]">Current workspace</div>
                <div className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">{vertical.label}</div>
                <p className="mt-3 text-sm leading-7 text-white/66">{vertical.dashboardSummary}</p>
                <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/66">
                  Current plan: <span className="font-semibold text-white">{profile?.plan_name || "Starter"}</span>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="section-label !px-3 !py-1.5 !text-[10px]">Connection status</div>
                <div className="mt-5 space-y-3">
                  {[
                    {
                      label: "Sender profile",
                      active: Boolean(profile?.sender_name && profile?.sender_email),
                    },
                    {
                      label: "Gmail app password",
                      active: Boolean(profile?.has_gmail_password),
                    },
                    {
                      label: "Groq API key",
                      active: Boolean(profile?.has_groq_api_key),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4"
                    >
                      <span className="text-sm text-white/72">{item.label}</span>
                      <span
                        className={`status-pill ${
                          item.active
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/55"
                        }`}
                      >
                        {item.active ? "Connected" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-5 w-5 text-[var(--accent)]" />
                  <div className="font-display text-2xl font-semibold tracking-[-0.04em]">Security posture</div>
                </div>
                <div className="mt-5 space-y-3 text-sm leading-7 text-white/68">
                  <p>Stored Gmail app passwords and Groq keys are encrypted on the backend before persistence.</p>
                  <p>Plan upgrades require a verified Cashfree signature before billing changes are applied.</p>
                  <p>Rate limits and origin protections cover lead generation, profile updates, email preview, and checkout flows.</p>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <ShieldCheck className="h-4 w-4" />
                  Production-minded foundation
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}
