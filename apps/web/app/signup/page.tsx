"use client";

/** Functional signup (minimal). Phase 7 brings the vertical picker cards +
 * full onboarding flow. */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/AuthProvider";
import { VERTICAL_LIST, normalizeVertical } from "@/lib/verticals";

function SignupForm() {
  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vertical, setVertical] = useState(normalizeVertical(searchParams.get("vertical")));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          ReachFlow
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Create your account</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await register({ name, email, password, vertical });
              toast("Account created. Check your inbox to verify your email.", "success");
              router.replace("/dashboard");
            } catch (registerError) {
              setError(registerError instanceof Error ? registerError.message : "Signup failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Workflow" htmlFor="vertical" hint="Reshapes your whole workspace. Change anytime in Settings.">
            <Select
              id="vertical"
              value={vertical}
              onChange={(event) => setVertical(normalizeVertical(event.target.value))}
            >
              {VERTICAL_LIST.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.audience}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Full name" htmlFor="name">
            <Input id="name" autoComplete="name" required minLength={2} value={name}
                   onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email}
                   onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters." error={error || undefined}>
            <Input id="password" type="password" autoComplete="new-password" required minLength={8}
                   value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
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
