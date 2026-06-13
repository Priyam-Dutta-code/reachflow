# ReachFlow — first-customers playbook (for Priyam)

The point of this phase: **ReachFlow's own first acquisition campaign runs
through ReachFlow.** It's the best QA and the best proof — if it can win you
customers, the demo writes itself.

## The dogfood loop

1. **Pick the buyer.** Agencies and recruiters are the natural first buyers
   (they live in cold outreach and feel the pain daily). Set your workspace
   vertical to **Agencies** for round one.
2. **Set your sender identity** (Settings → Profile). You are the product's
   founder reaching out honestly — say exactly that. Two sentences:
   what ReachFlow does, and that you built it.
3. **Generate leads.** Lead Studio → query `cold email agency` / `lead gen
   agency`, location your market. ReachFlow pulls hiring + open-web signals
   and returns email-ready accounts.
4. **Preview a few drafts.** Confirm the tone reads like *you*, not a
   template. Tune your profile blurb until it does.
5. **Connect Gmail** (Settings → Integrations, app password) and **verify your
   email** so sending unlocks. Run the connection test.
6. **Create a campaign**, attach the best-fit leads, set a humane pace
   (20–30/day), and send. Follow-ups fire automatically after your gap.
7. **Watch Analytics.** Reply rate is the number that matters. Iterate the
   offer and subject, not the volume.

## Honest outreach template (adapt, don't copy blindly)

> Subject: built a cold-email tool, want your eye on it
>
> Hi {first name}, I built ReachFlow — a lead-discovery + cold-email tool that
> reshapes per workflow (agencies being one). You run outbound daily, so your
> read would be worth more than most. Free to try, and the demo needs no
> signup: {demo link}. Worth two minutes?

No fake urgency, no invented stats. The unsubscribe link and your identity are
already in every footer — that's the product being its own proof.

## Distribution (free channels)

- **The `/demo` link** is the hero asset — no signup, full UI on sample data.
  Drop it where each vertical lives: agency/recruiting communities, relevant
  subreddits and Discords, IndieHackers. Always as the builder, honestly.
- **The five `/for/*` landers** are the SEO engine — each targets "cold email
  tool for {X}". Keep them sharp; they compound.
- **Put the demo link in your job applications.** The product now sells itself
  *and* you — a working, self-hosted, ₹0 SaaS is a stronger artifact than any
  résumé line.

## Measuring it (Umami)

Once Umami is connected (see below), the funnel is visible end to end:
`signup → onboarding_step → first_generate → lead_preview → campaign_send →
checkout_start → upgrade_click`, plus `feedback_sent`, `newsletter_signup`,
`demo_interaction`. Watch where people drop and fix that step first.

## Testimonials

Collect every genuine reply into `/changelog` or a future testimonials section
— **only when real and permissioned.** One fabricated quote poisons a
credibility product. Real ones, with names, when people say yes.

---

### [HUMAN: Priyam] — connect Umami (5 min, ₹0)

Analytics are off until configured (the app no-ops cleanly without them):

1. Sign up at **cloud.umami.is** (free tier) — or deploy Umami to Vercel with
   its own Postgres if you'd rather self-host (D-001 keeps it off the API box).
2. Add a website; copy the **Website ID** and the script `src`.
3. Set on the Vercel project (web):
   `NEXT_PUBLIC_UMAMI_WEBSITE_ID=...` and (if self-hosted)
   `NEXT_PUBLIC_UMAMI_SRC=https://your-umami/script.js`. Redeploy.
4. Set `ALERT_EMAIL` on the API (Render) so in-app feedback reaches your inbox.
5. Confirm events appear in the Umami dashboard after a test signup.
