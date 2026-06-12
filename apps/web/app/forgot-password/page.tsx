"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          ReachFlow
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Reset your password</h1>

        {sent ? (
          <div className="mt-6 rounded-card border border-success/25 bg-success-bg px-4 py-4 text-sm leading-6 text-success">
            If that email has an account, a reset link is on its way. It works once and expires in
            30 minutes — check your inbox.
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enter your account email and we&apos;ll send a single-use reset link.
            </p>
            <form
              className="mt-6 space-y-4"
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const response = await fetch("/api/proxy/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email.trim() }),
                  });
                  if (response.status === 429) {
                    setError("Too many reset requests. Wait a bit and try again.");
                    return;
                  }
                  setSent(true);
                } catch {
                  setError("Could not reach the server. Check your connection and try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Email" htmlFor="email" error={error || undefined}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Button type="submit" loading={busy} className="w-full">
                Send reset link
              </Button>
            </form>
          </>
        )}

        <p className="mt-5 text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  );
}
