/**
 * Umami event tracking (Phase 9, D-001: Umami Cloud free or Umami-on-Vercel).
 * No-ops cleanly when Umami isn't configured — funnel calls stay in the code
 * unconditionally and simply do nothing until the script is present.
 */

/** Canonical funnel events (master plan Phase 9). */
export type FunnelEvent =
  | "signup"
  | "onboarding_step"
  | "first_generate"
  | "lead_preview"
  | "campaign_send"
  | "checkout_start"
  | "upgrade_click"
  | "feedback_sent"
  | "newsletter_signup"
  | "demo_interaction";

type UmamiWindow = Window & {
  umami?: { track: (event: string, data?: Record<string, unknown>) => void };
};

export function track(event: FunnelEvent, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const umami = (window as UmamiWindow).umami;
  if (umami?.track) {
    try {
      umami.track(event, data);
    } catch {
      /* analytics must never break the app */
    }
  }
}

export const umamiConfigured = Boolean(process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID);
