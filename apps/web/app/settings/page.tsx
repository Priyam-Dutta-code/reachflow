"use client";

/** Settings — profile/sender identity, vertical switch (confirmed),
 * integrations with live test, plan & history, security. */
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { PasswordInput } from "@/components/PasswordInput";
import { VerticalPicker } from "@/components/VerticalPicker";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, clearAccessToken } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";
import { getVerticalConfig, normalizeVertical, type VerticalId } from "@/lib/verticals";

type PaymentRow = {
  id: number;
  amount: number;
  plan: string;
  payment_type: string;
  status: string;
  credits_added: number;
  created_at: string | null;
};

type IntegrationResult = {
  gmail: { connected: boolean; ok: boolean; error: string | null };
  groq: { connected: boolean; ok: boolean; error: string | null };
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, loading, reload, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: "", sender_name: "", sender_email: "", sender_phone: "", sender_linkedin: "",
    sender_role: "", sender_profile: "",
  });
  const [secrets, setSecrets] = useState({ gmail_password: "", groq_api_key: "" });
  const [pendingVertical, setPendingVertical] = useState<VerticalId | null>(null);
  const [verticalConfirm, setVerticalConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecrets, setSavingSecrets] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<IntegrationResult | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!user || seeded) return;
    setSeeded(true);
    setProfile({
      name: user.name || "",
      sender_name: user.sender_name || "",
      sender_email: user.sender_email || user.email,
      sender_phone: user.sender_phone || "",
      sender_linkedin: user.sender_linkedin || "",
      sender_role: user.sender_role || "",
      sender_profile: user.sender_profile || "",
    });
    apiFetch<PaymentRow[]>("/api/payments/history").then(setPayments).catch(() => setPayments([]));
  }, [user, seeded]);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="space-y-4">
          <SkeletonCard /> <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  const vertical = getVerticalConfig(user.vertical);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const payload: Record<string, string> = {};
      for (const [key, value] of Object.entries(profile)) {
        if (value.trim()) payload[key] = value.trim();
      }
      await apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify(payload) });
      await reload();
      toast("Profile saved — new drafts use this identity.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Save failed.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveSecrets() {
    const payload: Record<string, string> = {};
    if (secrets.gmail_password.trim()) payload.gmail_password = secrets.gmail_password.trim();
    if (secrets.groq_api_key.trim()) payload.groq_api_key = secrets.groq_api_key.trim();
    if (Object.keys(payload).length === 0) {
      toast("Nothing to save — both fields are empty.", "info");
      return;
    }
    setSavingSecrets(true);
    try {
      await apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify(payload) });
      setSecrets({ gmail_password: "", groq_api_key: "" });
      setTestResult(null);
      await reload();
      toast("Saved and encrypted. Run a test to confirm the connection.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Save failed.", "error");
    } finally {
      setSavingSecrets(false);
    }
  }

  async function testIntegrations() {
    setTesting(true);
    try {
      setTestResult(await apiFetch<IntegrationResult>("/api/auth/test-integrations", { method: "POST" }));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Test failed.", "error");
    } finally {
      setTesting(false);
    }
  }

  async function changePassword() {
    if (passwords.next.length < 8) {
      toast("New password must be at least 8 characters.", "error");
      return;
    }
    setChangingPassword(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next }),
      });
      setPasswords({ current: "", next: "" });
      toast("Password changed. Other sessions were signed out.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Change failed.", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  function IntegrationStatus({ label, connected, result }: { label: string; connected: boolean; result?: { ok: boolean; error: string | null } }) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-bg px-3.5 py-2.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="flex items-center gap-2">
          {result && connected && (
            result.ok ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> working
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                <XCircle className="h-3.5 w-3.5" /> {result.error || "failed"}
              </span>
            )
          )}
          <Badge tone={connected ? "success" : "neutral"}>{connected ? "Connected" : "Not set"}</Badge>
        </span>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          eyebrow="Settings"
          title="Your workspace, your rules"
          description="Identity, workflow, integrations, plan, and security in one place. Secrets are encrypted and never shown back."
        />

        {/* profile & sender identity */}
        <Section title="Profile & sender identity" description="Powers every draft — emails are written as this person.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="s_name">
              <Input id="s_name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </Field>
            <Field label="Sender name" htmlFor="s_sender">
              <Input id="s_sender" value={profile.sender_name} onChange={(e) => setProfile({ ...profile, sender_name: e.target.value })} />
            </Field>
            <Field label="Sender email" htmlFor="s_email">
              <Input id="s_email" type="email" value={profile.sender_email} onChange={(e) => setProfile({ ...profile, sender_email: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="s_phone">
              <Input id="s_phone" value={profile.sender_phone} onChange={(e) => setProfile({ ...profile, sender_phone: e.target.value })} />
            </Field>
            <Field label="Role or offer" htmlFor="s_role">
              <Input id="s_role" value={profile.sender_role} onChange={(e) => setProfile({ ...profile, sender_role: e.target.value })} />
            </Field>
            <Field label="LinkedIn URL" htmlFor="s_li">
              <Input id="s_li" value={profile.sender_linkedin} onChange={(e) => setProfile({ ...profile, sender_linkedin: e.target.value })} />
            </Field>
            <Field label="Profile blurb" htmlFor="s_blurb" className="sm:col-span-2"
                   hint="What you do, proof, and tone — the single biggest lever on draft quality.">
              <Textarea id="s_blurb" maxLength={800} value={profile.sender_profile}
                        onChange={(e) => setProfile({ ...profile, sender_profile: e.target.value })} />
            </Field>
          </div>
          <Button className="mt-4" loading={savingProfile} onClick={() => void saveProfile()}>
            Save changes
          </Button>
        </Section>

        {/* workflow */}
        <Section title="Workflow" description="Switching reshapes your dashboard, lead sources, drafting tone, plan, and quota.">
          <VerticalPicker
            value={pendingVertical ?? normalizeVertical(user.vertical)}
            onChange={(next) => {
              if (next !== user.vertical) {
                setPendingVertical(next);
                setVerticalConfirm(true);
              }
            }}
          />
          <p className="mt-3 text-sm text-muted">
            Current: <span className="font-medium text-ink">{vertical.label}</span> · {user.plan_name}
          </p>
        </Section>

        {/* integrations */}
        <Section title="Integrations" description="Stored encrypted with your account key. Never displayed back — not even to you.">
          <div className="space-y-2.5">
            <IntegrationStatus label="Gmail app password" connected={user.has_gmail_password} result={testResult?.gmail} />
            <IntegrationStatus label="Groq API key" connected={user.has_groq_api_key} result={testResult?.groq} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="New Gmail app password" htmlFor="s_gmail" hint="Google Account → Security → App passwords">
              <PasswordInput id="s_gmail" autoComplete="off" value={secrets.gmail_password}
                             onChange={(e) => setSecrets({ ...secrets, gmail_password: e.target.value })} />
            </Field>
            <Field label="New Groq API key" htmlFor="s_groq" hint="console.groq.com — free tier">
              <PasswordInput id="s_groq" autoComplete="off" value={secrets.groq_api_key}
                             onChange={(e) => setSecrets({ ...secrets, groq_api_key: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={savingSecrets} onClick={() => void saveSecrets()}>Save credentials</Button>
            <Button variant="secondary" loading={testing} onClick={() => void testIntegrations()}
                    disabled={!user.has_gmail_password && !user.has_groq_api_key}>
              Test connections
            </Button>
          </div>
        </Section>

        {/* plan & usage */}
        <Section title="Plan & usage">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                <span className="font-semibold">{user.plan_name}</span>
                <span className="text-muted"> · {user.credits} email credits</span>
              </p>
              <ProgressMeter className="mt-3" label="Monthly lead quota" value={user.leads_used} max={user.leads_quota} />
            </div>
            <Link href={`/pricing?vertical=${user.vertical}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Manage plan
            </Link>
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-medium text-ink">Payment history</h3>
            {payments === null ? (
              <p className="mt-2 text-sm text-muted">Loading…</p>
            ) : payments.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No payments yet — you&apos;re on the free plan.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{payment.plan}</span>
                      <span className="block font-mono text-xs text-muted">{payment.created_at?.slice(0, 10)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-ink">₹{payment.amount?.toLocaleString("en-IN")}</span>
                      <Badge tone={payment.status === "completed" ? "success" : payment.status === "pending" ? "warning" : "neutral"}>
                        {payment.status}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* security */}
        <Section title="Security">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password" htmlFor="s_cur">
              <PasswordInput id="s_cur" autoComplete="current-password" value={passwords.current}
                             onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            </Field>
            <Field label="New password" htmlFor="s_new" hint="At least 8 characters.">
              <PasswordInput id="s_new" autoComplete="new-password" value={passwords.next}
                             onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={changingPassword} onClick={() => void changePassword()}
                    disabled={!passwords.current || !passwords.next}>
              Change password
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await apiFetch("/api/auth/logout-all", { method: "POST" }).catch(() => {});
                clearAccessToken();
                await logout();
                router.replace("/login");
              }}
            >
              Sign out everywhere
            </Button>
          </div>

          <div className="mt-6 rounded-card border border-danger/25 bg-danger-bg p-4">
            <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              Deleting your account removes every lead, campaign, log, and stored credential. There is no undo.
            </p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>
              Delete account…
            </Button>
          </div>
        </Section>

        <p className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ReachFlow V2 · secrets encrypted at rest · unsubscribe + suppression on every send
        </p>
      </div>

      {/* vertical switch confirm */}
      <ConfirmDialog
        open={verticalConfirm}
        onClose={() => {
          setVerticalConfirm(false);
          setPendingVertical(null);
        }}
        onConfirm={async () => {
          if (!pendingVertical) return;
          try {
            await apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ vertical: pendingVertical }) });
            await reload();
            toast(`Workspace reshaped for ${getVerticalConfig(pendingVertical).label}.`, "success");
          } catch (error) {
            toast(error instanceof Error ? error.message : "Switch failed.", "error");
          } finally {
            setPendingVertical(null);
          }
        }}
        title={`Switch to ${pendingVertical ? getVerticalConfig(pendingVertical).label : ""}?`}
        description="This reshapes your whole workspace — dashboard, lead generation, drafting tone, and pricing move to the new workflow, and your plan/quota remap to its equivalent tier."
        confirmLabel="Switch workflow"
        destructive={false}
      />

      {/* delete account */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={!deletePassword}
              onClick={async () => {
                setDeleting(true);
                try {
                  await apiFetch("/api/auth/account", {
                    method: "DELETE",
                    body: JSON.stringify({ password: deletePassword }),
                  });
                  clearAccessToken();
                  router.replace("/");
                } catch (error) {
                  toast(error instanceof Error ? error.message : "Deletion failed.", "error");
                  setDeleting(false);
                }
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-ink-soft">
          Every lead, campaign, email log, payment record, and stored credential is permanently removed.
          Type your password to confirm.
        </p>
        <Field label="Password" htmlFor="del_pw" className="mt-4">
          <PasswordInput id="del_pw" autoComplete="current-password" value={deletePassword}
                         onChange={(e) => setDeletePassword(e.target.value)} />
        </Field>
      </Modal>
    </AppShell>
  );
}
