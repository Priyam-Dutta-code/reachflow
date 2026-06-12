"use client";

/** First-run checklist — driven by the API's missing_setup[] (V1 contract).
 * Shows on the dashboard until setup is complete. */
import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import type { ApiUser } from "@/lib/auth-client";

const ITEMS: { key: string; label: string; detail: string; href: string }[] = [
  {
    key: "verified_email",
    label: "Verify your email",
    detail: "Unlocks campaign sending. Check your inbox for the link.",
    href: "/verify-email",
  },
  {
    key: "sender_profile",
    label: "Add your sender identity",
    detail: "Name and role — every draft is written as you.",
    href: "/onboarding?step=1",
  },
  {
    key: "ai_personalization",
    label: "Add sender context",
    detail: "A short profile blurb (or your Groq key) sharpens drafting.",
    href: "/onboarding?step=1",
  },
  {
    key: "gmail_connection",
    label: "Connect Gmail",
    detail: "An app password lets ReachFlow send through your own inbox.",
    href: "/onboarding?step=2",
  },
];

export function FirstRunChecklist({ user }: { user: ApiUser }) {
  const missing = new Set<string>(user.missing_setup);
  if (!user.email_verified) missing.add("verified_email");
  // sender_email is covered by the sender_profile step here
  missing.delete("sender_email");

  if (missing.size === 0) return null;

  const done = ITEMS.filter((item) => !missing.has(item.key)).length;

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Finish setting up</h2>
        <span className="font-mono text-xs text-muted">
          {done}/{ITEMS.length} done
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {ITEMS.map((item) => {
          const complete = !missing.has(item.key);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-disabled={complete}
                className={cn(
                  "flex items-center gap-3 rounded-control border px-3.5 py-3 transition-colors",
                  complete
                    ? "pointer-events-none border-line bg-bg opacity-60"
                    : "border-line bg-surface hover:border-accent/30"
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                    complete ? "bg-success text-white" : "border border-line text-transparent"
                  )}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", complete ? "text-muted line-through" : "text-ink")}>
                    {item.label}
                  </span>
                  {!complete && <span className="block text-[13px] text-muted">{item.detail}</span>}
                </span>
                {!complete && <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
