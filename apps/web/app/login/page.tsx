"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/AuthProvider";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          ReachFlow
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Log in</h1>
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await login(email.trim(), password);
              router.replace(searchParams.get("next") || "/dashboard");
            } catch (loginError) {
              setError(loginError instanceof Error ? loginError.message : "Login failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password" error={error || undefined}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              aria-invalid={Boolean(error)}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <Link href="/forgot-password" className="text-sm font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={busy} className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create a free account
          </Link>
        </p>
      </Card>
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
