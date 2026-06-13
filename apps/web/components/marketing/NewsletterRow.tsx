"use client";

/** Email capture on marketing (Phase 9) — own table, no third-party ESP. */
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";

export function NewsletterRow() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/proxy/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "landing" }),
      });
      if (!response.ok && response.status !== 200) throw new Error();
      track("newsletter_signup");
      setDone(true);
    } catch {
      setError("Couldn't sign you up — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Follow the build</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Occasional notes on new features and what's working in cold outreach. No spam — the
            irony isn't lost on us.
          </p>
        </div>
        {done ? (
          <p className="rounded-card border border-success/25 bg-success-bg px-4 py-3 text-sm text-success">
            You&apos;re on the list — we&apos;ll only send things worth reading.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" noValidate>
            <Input
              type="email"
              aria-label="Email address"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={busy}>
              Subscribe
            </Button>
          </form>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </Card>
  );
}
