"use client";

import { LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
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
      setMessage("Settings updated successfully. Sensitive fields remain encrypted on the backend.");
    } catch (requestError: any) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <Reveal>
          <div>
            <div className="section-label">Settings</div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
              Configure the identity behind every campaign.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              Keep your sender profile, personalization context, and optional credentials in one secure place. Gmail
              and Groq values are never shown back in plain text after save.
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
                placeholder="Describe your work, offer, experience, or the tone you want AI to reflect."
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
                  <p>Webhook-based upgrades now require a verified Cashfree signature before plan changes are applied.</p>
                  <p>Rate limits and stricter origin controls reduce abuse across lead generation, email preview, and checkout.</p>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                  <ShieldCheck className="h-4 w-4" />
                  Enterprise-minded foundation
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Shell>
  );
}
