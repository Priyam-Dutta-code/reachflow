"use client";

/** Lands from the email link (?token=). Verifies immediately; offers resend
 * for logged-in users when the link expired. */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/auth-client";
import { useAuth } from "@/lib/AuthProvider";

type State = "checking" | "verified" | "invalid" | "missing";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { user, reload } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<State>(token ? "checking" : "missing");
  const [resending, setResending] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    fetch("/api/proxy/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        setState(response.ok ? "verified" : "invalid");
        if (response.ok) await reload();
      })
      .catch(() => setState("invalid"));
  }, [token, reload]);

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Link href="/" className="font-display text-xl font-semibold text-ink">
          ReachFlow
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">Email verification</h1>

        {state === "checking" && (
          <p className="mt-6 text-sm leading-6 text-muted" role="status">
            Checking your verification link…
          </p>
        )}

        {state === "verified" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-card border border-success/25 bg-success-bg px-4 py-4 text-sm leading-6 text-success">
              Email verified — campaign sending is unlocked.
            </div>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-bg hover:bg-accent-strong"
            >
              {user ? "Back to your workspace" : "Log in"}
            </Link>
          </div>
        )}

        {(state === "invalid" || state === "missing") && (
          <div className="mt-6 space-y-4">
            <div className="rounded-card border border-danger/25 bg-danger-bg px-4 py-4 text-sm leading-6 text-danger">
              {state === "missing"
                ? "This verification link is missing its token. Open the link from your email again."
                : "This verification link is invalid or has expired (links work once, for 60 minutes)."}
            </div>
            {user ? (
              <Button
                className="w-full"
                loading={resending}
                onClick={async () => {
                  setResending(true);
                  try {
                    await apiFetch("/api/auth/resend-verification", { method: "POST" });
                    toast("Verification email sent. Check your inbox.", "success");
                  } catch (resendError) {
                    toast(
                      resendError instanceof Error ? resendError.message : "Could not resend.",
                      "error"
                    );
                  } finally {
                    setResending(false);
                  }
                }}
              >
                Send a fresh link
              </Button>
            ) : (
              <p className="text-sm leading-6 text-muted">
                <Link href="/login" className="font-medium text-accent hover:underline">
                  Log in
                </Link>{" "}
                to request a fresh verification link.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
