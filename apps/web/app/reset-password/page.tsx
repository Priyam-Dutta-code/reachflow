"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          ReachFlow
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Set a new password</h1>

        {!token ? (
          <div className="mt-6 rounded-card border border-danger/25 bg-danger-bg px-4 py-4 text-sm leading-6 text-danger">
            This reset link is missing its token. Open the link from your email again, or{" "}
            <Link href="/forgot-password" className="font-medium underline">
              request a new one
            </Link>
            .
          </div>
        ) : done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-card border border-success/25 bg-success-bg px-4 py-4 text-sm leading-6 text-success">
              Password updated and all sessions signed out. Log in with your new password.
            </div>
            <Link href="/login" className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong">
              Go to login
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              if (password.length < 8) {
                setError("Password must be at least 8 characters.");
                return;
              }
              if (password !== confirm) {
                setError("Passwords don't match.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                const response = await fetch("/api/proxy/api/auth/reset-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token, new_password: password }),
                });
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                  setError(
                    typeof body?.detail === "string"
                      ? body.detail
                      : "This reset link is invalid or has expired. Request a new one."
                  );
                  return;
                }
                setDone(true);
              } catch {
                setError("Could not reach the server. Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="New password" htmlFor="password" hint="At least 8 characters.">
              <PasswordInput
                id="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm" error={error || undefined}>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                required
                value={confirm}
                aria-invalid={Boolean(error)}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              Update password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
