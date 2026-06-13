# Cutover — V1 → V2, fresh start (Phase 12)

How V2 becomes the only public ReachFlow. Reflects **D-001** (stay on
Vercel + Render + Supabase) and **D-003** (fresh start — no V1 data import).
Setup mechanics live in [`SETUP_RENDER_VERCEL.md`](SETUP_RENDER_VERCEL.md);
day-2 ops in [`RUNBOOK.md`](RUNBOOK.md). Live steps are `[HUMAN: Priyam]`.

## The shape of this cutover

V1 and V2 run on the *same kind* of infra (Vercel + Render + Supabase), so this
is not a "move to a new stack" — it's **stand up clean V2 projects beside V1,
prove them, flip the canonical URL, then retire V1.** Fresh start means the V2
database is empty by construction (Alembic builds the schema on a new Supabase);
there are no import scripts and nothing destructive runs against V1 during the
flip.

```
 [V1: reachflow-indol.vercel.app]  ── stays live, untouched ──┐
                                                              │  flip canonical URL
 [V2: new Vercel + Render + Supabase]  ── prove, then ────────┘  keep V1 14 days
                                                                 final export → retire V1
```

Why no data migration: V1's real user count is in the fresh-start range
(Appendix E #6 → D-003). Existing users re-register on V2. We still take a
**final encrypted export of V1** before retiring it — fresh start ≠ discarding
data.

---

## Pre-cutover gate (all green before flipping)

- [ ] Phases 0–11 pushed to GitHub `main` (still pending — needs your approval).
- [ ] CI green on `main` (`ci.yml`: ruff+pytest+migrations, web typecheck+build).
- [ ] V2 deployed per `SETUP_RENDER_VERCEL.md`: Render `/health` →
      `{"status":"ok","db":"ok"}`, Vercel landing + `/demo` load.
- [ ] Real secrets set on Render (`JWT_SECRET`, `APP_ENCRYPTION_KEY`,
      `CRON_SECRET`, SMTP, `GROQ_API_KEY`, Cashfree if going live).
- [ ] GitHub Actions secrets set; `cron-tick` manual run → `HTTP 200`;
      `backup` manual run → encrypted dump in the rclone remote.
- [ ] UptimeRobot monitors green on the V2 API `/health` and the V2 web root.
- [ ] **Restore drill done once** (`restore.sh --drill` into a scratch DB) and
      its date recorded in `RUNBOOK.md`.

## Step 1 — Production sweep on V2 (Appendix D, on the live V2 URLs)

Run the full per-screen checklist against the deployed V2, not localhost. Every
authed surface and every marketing page:

- [ ] No console errors, no layout shift; skeleton + designed empty states.
- [ ] Correct at 360 / 390 / 768 / 1024 / 1280 / 1536.
- [ ] Keyboard navigable, visible focus, modal focus-trap; ≥44px taps.
- [ ] Zero fabricated data; every action hits real API; tenant-scoped.
- [ ] **End-to-end on production:** sign up → verify email (real inbox) →
      onboarding → generate real leads → create campaign → AI draft → send is
      correctly gated behind a connected Gmail → unsubscribe link works →
      analytics reflect it.
- [ ] Payments: if Cashfree is live, one real ₹ checkout + webhook → plan
      upgrade reflected. If still TEST, confirm checkout is disabled-safe.
- [ ] `cron-tick` has fired in production and processed due work (check a
      scheduled send actually went out).

Record evidence the same way Phase 10 did (`docs/QUALITY.md` style).

## Step 2 — Flip the canonical URL `[HUMAN: Priyam]`

Pick the case that matches what you have:

**A. No custom domain yet (current state — `*.vercel.app`):**
1. Treat the **V2 Vercel project's domain** as the new canonical URL.
2. Update everywhere that points at the old V1 URL: README, GitHub repo "About"
   link, `/demo` links, social profiles, any vertical-lander backlinks.
3. Make the **old V1 Vercel project redirect to V2**: either add a
   `redirect` in the old project (simplest: a `next.config` redirect or a
   Vercel "Redirect" rule) sending all paths to the V2 URL, or replace the V1
   deployment with a one-page "We've moved → <V2 URL>" notice. Don't delete V1
   yet (see Step 4).
4. Set Render `APP_URL` + Vercel `NEXT_PUBLIC_APP_URL` to the V2 canonical URL
   and redeploy, so auth-email links and Cashfree return URLs are correct.

**B. You own a custom domain (e.g. reachflow.in):**
1. In the **V2 Vercel project** add the domain (and `app.` / `www.` as desired);
   set Vercel's DNS records or point your registrar's nameservers as Vercel
   instructs. TLS is automatic.
2. Repoint the apex/`app` record from V1 to V2. Keep the V1 Vercel project on
   its `*.vercel.app` URL as the fallback during the parallel window.
3. Set `APP_URL` / `NEXT_PUBLIC_APP_URL` to the custom domain on Render/Vercel
   and redeploy.
4. Update the Cashfree webhook URL to the custom-domain proxy path
   (`https://<domain>/api/proxy/api/payments/webhook`).

After the flip, re-verify: load the canonical URL fresh (incognito), sign up,
confirm the verification email link points at the new URL.

## Step 3 — Parallel window (2 weeks)

- [ ] V1 stays reachable (redirecting or notice page) for **14 days** — covers
      bookmarks, in-flight email links, and a fast fallback if V2 surfaces a
      regression.
- [ ] Watch V2: UptimeRobot, Render logs, `ALERT_EMAIL` inbox, Umami funnel.
- [ ] Nightly `backup` Action runs against the **V2** Supabase (confirm dumps
      land in the remote).
- [ ] If a serious regression appears, the fallback is: repoint the URL back to
      V1 (Step 2 in reverse) while you fix forward — V1 data is untouched.

## Step 4 — Final V1 export + decommission `[HUMAN: Priyam]`

Only after 14 days of stable V2:

1. **Final encrypted export of V1** (the safety net, reusing the Phase 11
   tooling — no V1-specific script needed):
   ```bash
   # one-off, against V1's Supabase connection string:
   DATABASE_URL="<V1 supabase session-pooler URI>" \
   BACKUP_PASSPHRASE="<your archive passphrase>" \
   BACKUP_DIR=./v1-final-archive \
     ./infra/backup-now.sh
   ```
   Store the resulting `reachflow-*.sql.gz.enc` **and its passphrase** offline
   (password manager + a copy off the laptop). This is the permanent V1 archive.
2. Verify it restores (`restore.sh <file> --drill` into a scratch DB) so the
   archive isn't a wish.
3. Decommission V1: pause/delete the **old** Render service, pause/delete the
   **old** Supabase project, and either keep the old Vercel project as a
   permanent redirect or delete it. Leave V2's projects running.
4. Record the cutover date and the archive location in `RUNBOOK.md`.

**Done when:** V2 is the only public ReachFlow, V1 is exported + archived +
retired, and the portability drill below has been run and recorded.

---

## Portability drill (Phase 12 acceptance)

Proves the "₹0, runs anywhere, self-hostable in 30 minutes" claim is real and
not marketing — the ultimate disaster fallback if a free tier ever changes
terms. Uses the maintained compose path (`compose.prod.yml`), independent of
Render/Vercel.

**Target: from nothing to a working ReachFlow with restored data in < 30 min.**

On a throwaway machine or VM with Docker:

```bash
# 1. code
git clone https://github.com/Priyam-Dutta-code/reachflow.git
cd reachflow

# 2. config — fill real secrets (or test values for a pure boot drill)
cp .env.example .env
#   set JWT_SECRET, APP_ENCRYPTION_KEY, POSTGRES_PASSWORD, BACKUP_PASSPHRASE…

# 3. bring the stack up (Postgres + Redis + api + worker + web)
docker compose -f compose.prod.yml up -d --build
docker compose -f compose.prod.yml exec api alembic upgrade head

# 4. restore the latest encrypted dump into the compose Postgres
#    (point TARGET at the in-compose DB; pull the dump from the rclone remote first)
TARGET_DATABASE_URL="postgresql://reachflow:<POSTGRES_PASSWORD>@localhost:5432/reachflow" \
BACKUP_PASSPHRASE="<passphrase>" \
  ./infra/restore.sh ./reachflow-<stamp>.sql.gz.enc

# 5. prove it
curl -s http://localhost:8000/health        # {"status":"ok","db":"ok"}
#    open http://localhost:3000 → log in → data is present
```

Stop the clock at step 5. Record the result below.

> **Portability drill log**
> - _(not yet run — blocked locally: this Windows machine has Docker Desktop but
>   WSL is not installed, so compose cannot boot. Run `wsl --install` (admin) +
>   reboot, or run the drill on any Linux VM / the eventual server. The
>   encrypt→decrypt→gunzip half of restore is already verified byte-for-byte;
>   what remains to time is the `pg_dump`/`psql` + `compose up` round-trip.)_
> - Drill date: ____  ·  elapsed: ____  ·  machine: ____  ·  result: ____

This is the one Phase 12 acceptance item that needs a real Docker host, so it's
deferred — not skipped. Everything else in this playbook is ready to execute the
moment the V2 projects exist and `main` is pushed.
