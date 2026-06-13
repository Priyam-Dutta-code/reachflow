# Launch playbook — first customers (Appendix F)

For Priyam, post-launch. The product is built; this is how it finds its first
real users. The honesty rule still governs everything here: share as the
builder, never as a fake crowd. Collect testimonials only when real and
permissioned.

## The one-line strategy

**Dogfood, then distribute.** Run ReachFlow's own outreach *through* ReachFlow —
you are your own first case study — then put the `/demo` link everywhere the
five verticals already gather.

## 1. Dogfood (week 1)

Agencies and recruiters are the natural first buyers, so target them with the
product itself:

- Switch your own workspace to the **agency** (or **recruiter**) vertical.
- Generate real leads (agencies that do outreach, recruiters hiring now).
- Use the AI drafts, connect your Gmail, send a small, compliant batch (real
  sender identity, working unsubscribe — the compliance layer is the point).
- Track opens/replies in Analytics. Every reply is a real conversation **and**
  a screenshot you can honestly show ("here's ReachFlow finding and contacting
  its own first users").

This proves the loop end-to-end and gives you authentic material — no invention
required.

## 2. Distribute the `/demo` (weeks 1–3)

The public `/demo` needs no signup and shows labeled sample data — safe to post
anywhere. Share it, **as the builder**, where each vertical lives:

- **Recruiters / agencies:** relevant subreddits, Discords, Slack communities,
  LinkedIn. Lead with the problem you solve, not a pitch.
- **Job seekers:** the `/for/job-seekers` lander + the demo in communities where
  people share job-hunt tooling. (This vertical doubles as *your* story.)
- **Business growth / partnerships:** founder/indie-hacker communities.

One honest message per community, tailored, not copy-pasted spam. You built a
compliance-first outreach tool — act like it.

## 3. The `/for/*` SEO engine (ongoing)

The five vertical landers (`/for/job-seekers`, `/for/recruiters`,
`/for/agencies`, `/for/business-growth`, `/for/partnerships`) are static,
fast, and indexable — they're the compounding channel. Keep them sharp:

- Real, specific copy per vertical (already vertical-reshaped).
- Add an FAQ / use-case section as you learn what each audience asks.
- A custom domain (Appendix E #1, deferred) materially helps SEO + credibility
  once you're actively selling — `vercel.app` is fine to start.

## 4. The job-application angle (unique to you)

Put the demo link in your job applications and portfolio. The product sells
itself *and* demonstrates your engineering — a live, self-hosted, ₹0,
compliance-correct, multi-tenant SaaS with tests, CI, backups, and a runbook.
The README is written as a hiring artifact for exactly this; point recruiters at
the repo.

## 5. Convert + collect (ongoing)

- Watch the funnel in **Umami** (set `NEXT_PUBLIC_UMAMI_*` first) and the
  in-app **feedback** widget (→ your `ALERT_EMAIL`).
- The **upgrade nudges** appear at the quota wall — that's your monetization
  surface; Cashfree goes live when you add credentials.
- Add real, permissioned wins to the changelog/testimonials **only when true**.
  One fabricated metric poisons a credibility product — never do it.

## Pre-launch checklist (depends on `CUTOVER.md` being done)

- [ ] V2 is the canonical URL; auth emails + Cashfree return URLs point at it.
- [ ] `/demo` works with no signup; signup → first leads < 2 min.
- [ ] Umami connected; feedback widget reaches your inbox.
- [ ] The five `/for/*` landers are live and indexable (sitemap/robots OK).
- [ ] Honesty pass: no fabricated numbers, logos, or testimonials anywhere.
