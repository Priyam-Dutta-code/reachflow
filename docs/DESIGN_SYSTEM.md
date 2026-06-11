# ReachFlow V2 design system

Light, precise, quiet, confident (master plan Part III). Everything visible is
built from `apps/web/components/ui` + the tokens below — no ad-hoc colors,
radii, or shadows in pages. Visual QA: `/kitchen-sink` (dev builds only).

## Tokens (`apps/web/app/globals.css`, Tailwind v4 `@theme`)

| Token | Value | Utility | Use |
|---|---|---|---|
| `--color-bg` | `#FAFAF7` | `bg-bg` | page background (warm paper) |
| `--color-surface` | `#FFFFFF` | `bg-surface` | cards, panels, inputs |
| `--color-ink` | `#121915` | `text-ink` | headings, primary text |
| `--color-ink-soft` | `#3E4A45` | `text-ink-soft` | body text, labels |
| `--color-muted` | `#6B7672` | `text-muted` | secondary text, hints |
| `--color-line` | `#E6E4DD` | `border-line` | hairline borders (the structure) |
| `--color-accent` | `#0E6F5C` | `bg-accent` | THE accent: primary buttons, links, active states |
| `--color-accent-strong` | `#0A5747` | hover states |
| `--color-accent-tint` | `#E9F3EF` | tinted backgrounds, active nav |
| `--color-success/-bg` | `#067647` / `#ECFDF3` | status only |
| `--color-warning/-bg` | `#B54708` / `#FFFAEB` | status only |
| `--color-danger/-bg` | `#B42318` / `#FEF3F2` | status + destructive |

Radii: `rounded-badge` 6px · `rounded-control` 10px (buttons/inputs) ·
`rounded-card` 14px. **Nothing rounder than 16px.**
Shadows: `shadow-pop` for popovers/modals/toasts ONLY — borders do the
structural work everywhere else.

## Type

- Display: **Bricolage Grotesque** 600/700 (`font-display`) — headings only,
  tight tracking on large sizes.
- Body/UI: **Inter** 400/500/600 (default) — line-height 1.6.
- Mono: **JetBrains Mono** (`font-mono`) — email previews, lead data, counts.
- Scale: 13 / 14 / 16 / 18 / 22 / 28 / 36 / 48–56 (hero only).
- All via `next/font` — zero external font requests.

## Rules (do / don't)

- ONE accent. If teal appears more than ~3 times in a viewport, simplify.
- Tinted backgrounds only communicate status — never decoration.
- Borders over shadows; `border-line` hairlines structure every surface.
- 4px spacing base. Marketing max-width `max-w-6xl`; app full-width + padding.
- Motion: 150–200ms ease-out micro-interactions; respect
  `prefers-reduced-motion` (global CSS handles it). When in doubt, less.
- Copy: plain verbs, sentence case. Buttons say what they do ("Save changes").
  Errors say what happened and what to do next.
- Tap targets ≥ 44px (`h-11` controls, `min-h-11` nav).
- Every list: skeleton while loading + designed `EmptyState` when empty.
- Every error surfaces via `useToast()` — never an inline bare string, never
  a blank screen.
- Destructive actions go through `ConfirmDialog`.

## Components (`components/ui`)

Button (primary/secondary/ghost/danger · sm/md/lg · loading) · Input /
Textarea / Select · Field + Label (+hint/error) · Card · Badge + **StatusPill**
(single status→tone map for lead/campaign/job states — never restyle locally)
· Tabs · Modal + ConfirmDialog · Drawer (native `<dialog>`: focus trap, Esc,
scroll-lock for free) · Toast (`useToast`) · Tooltip · Skeleton (text/card/row)
· EmptyState · **Table** (collapses to definition cards below `md`) · Stat ·
ProgressMeter (warns at 80%, alerts at 100%) · PageHeader.

App chrome: `components/AppShell.tsx` — sidebar ≥1024px, top-bar + slide-over
drawer below; includes plan/quota chip and account row.

## The signature element

Marketing and product share one motif: a real-shaped lead record flowing into
a **mono-typeset drafted email** (JetBrains Mono, hairline border, plain-text
letter look). See the Drawer demo in `/kitchen-sink`. Phase 6 builds the
morphing hero on it; Lead Studio previews reuse it.

## Breakpoint QA matrix

360 · 390 · 768 · 1024 · 1280 · 1536 — every page, before it counts as done
(Appendix D). Tables must be cards below 768. No horizontal scroll ever.
