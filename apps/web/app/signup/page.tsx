"use client";

/** Signup: vertical picker cards (preselected from ?vertical=), inline
 * validation, password toggle, friendly errors. Lands on /onboarding. */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PasswordInput } from "@/components/PasswordInput";
import { VerticalPicker } from "@/components/VerticalPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/AuthProvider";
import { normalizeVertical, type VerticalId } from "@/lib/verticals";

type FieldErrors = { name?: string; email?: string; password?: string; form?: string };

function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters).";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
}

function SignupForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vertical, setVertical] = useState<VerticalId>(
    normalizeVertical(searchParams.get("vertical"))
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const fieldErrors = validate(name, email, password);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setBusy(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, vertical });
      router.replace("/onboarding");
    } catch (registerError) {
      const message = registerError instanceof Error ? registerError.message : "Signup failed.";
      if (/email/i.test(message) && /exist/i.test(message)) {
        setErrors({ email: message });
      } else if (/password/i.test(message)) {
        setErrors({ password: message });
      } else {
        setErrors({ form: message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          ReachFlow
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Pick the workflow first — it shapes your dashboard, lead sources, email tone, and pricing.
          You can change it anytime.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <VerticalPicker value={vertical} onChange={setVertical} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Password"
            htmlFor="password"
            hint={errors.password ? undefined : "At least 8 characters. Avoid the obvious ones."}
            error={errors.password}
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              aria-invalid={Boolean(errors.password)}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {errors.form && (
            <p className="rounded-card border border-danger/25 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">
              {errors.form}
            </p>
          )}

          <Button type="submit" loading={busy} className="w-full">
            Start free
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
