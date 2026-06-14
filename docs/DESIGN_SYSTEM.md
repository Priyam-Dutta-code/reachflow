# ReachFlow V2 design system

**Dual-theme, premium, confident.** The default is a premium **dark** theme
("Midnight Mint" — CRED-*inspired*, original) with a one-tap **light** theme
(the original warm "paper" system) preserved as the alternate. Everything
visible is built from `apps/web/components/ui` + the tokens below — no ad-hoc
colors, radii, or shadows in pages. Visual QA: `/kitchen-sink` (dev builds only).

## Theming (how the two modes work)

- Themes are CSS-variable swaps. `@theme` in `globals.css` holds the **dark
  defaults**; `html[data-theme="light"]` overrides the same `--color-*` vars
  with the light palette. Because every utility reads the var, flipping the one
  `data-theme` attribute on `<html>` re-skins the entire app.
- **`<html data-theme="dark">`** is the SSR default. An inline no-flash script
  in `layout.tsx` applies the saved theme (localStorage `theme`) before paint.
- **`ThemeToggle`** (`components/ui/ThemeToggle.tsx`, in the header) flips it
  with a **View Transitions API** circular reveal from the click point; falls
  back to a CSS color-fade, and to an instant swap under `prefers-reduced-motion`.
- **Accent fills use `text-bg`, never `text-white`.** `--color-bg` flips with
  the theme, so dark-on-mint (dark mode) and paper-on-teal (light mode) are both
  high-contrast. This keeps a11y intact in both themes — don't hardcode white.

## Tokens (`apps/web/app/globals.css`, Tailwind v4 `@theme`)

| Token | Dark (default) | Light (`[data-theme="light"]`) | Use |
|---|---|---|---|
| `--color-bg` | `#0A0B0E` | `#FAFAF7` | page background |
| `--color-surface` | `#14171C` | `#FFFFFF` | cards, panels, inputs |
| `--color-surface-2` | `#1B1F26` | `#F4F4EF` | nested surface / hover / toggle track |
| `--color-ink` | `#F2F5F3` | `#121915` | headings, primary text |
| `--color-ink-soft` | `#AAB3AE` | `#3E4A45` | body text, labels |
| `--color-muted` | `#767E79` | `#6B7672` | secondary text, hints |
| `--color-line` | `#262B31` | `#E6E4DD` | hairline borders |
| `--color-accent` | `#1FCB9F` (mint) | `#0E6F5C` (teal) | THE accent: fills (with `text-bg`), links, active |
| `--color-accent-strong` | `#4DE6C0` | `#0A5747` | hover + accent text on tint |
| `--color-accent-tint` | `#0E2823` | `#E9F3EF` | tinted backgrounds, active nav, pills |
| `--color-success/-bg` | `#34D399` / `#0E2A20` | `#067647` / `#ECFDF3` | status only |
| `--color-warning/-bg` | `#FBBF24` / `#2A2207` | `#B54708` / `#FFFAEB` | status only |
| `--color-danger/-bg` | `#F87171` / `#2A1414` | `#B42318` / `#FEF3F2` | status + destructive |

Radii: `rounded-badge` 8px · `rounded-control` 12px (buttons/inputs) ·
`rounded-card` 20px (premium = rounder).
Shadows/glows: `shadow-pop` (popovers/modals/toasts) · `shadow-glow` (mint glow
for hovered marketing cards + primary buttons). Borders still do the structural
work on dense surfaces.

## Type

- Display: **Bricolage Grotesque** 600/700 (`font-display`) — headings only,
  tight tracking on large sizes (hero uses `-0.02em`).
- Body/UI: **Inter** 400/500/600 (default) — line-height 1.6.
- Mono: **JetBrains Mono** (`font-mono`) — email previews, lead data, counts,
  the `.eyebrow` section labels.
- Scale: 13 / 14 / 16 / 18 / 22 / 28 / 36 / hero up to ~4.6rem (`text-[4.6rem]`).
- All via `next/font` — zero external font requests.

## Rules (do / don't)

- ONE accent. If the accent appears more than ~3 times in a viewport, simplify.
- Accent fills pair with `text-bg` (see Theming) — never `text-white`.
- Tinted backgrounds communicate status or active state — never decoration.
- Borders + the aurora/glow do the structural and depth work; reserve hard
  shadows for popovers.
- 4px spacing base. Marketing max-width `max-w-6xl`; app full-width + padding.
- Motion: 150–250ms ease-out micro-interactions; the theme swap is a View
  Transition. Always respect `prefers-reduced-motion` (global CSS + the toggle
  both handle it).
- Copy: plain verbs, sentence case. Buttons say what they do ("Save changes").
  Errors say what happened and what to do next.
- Tap targets ≥ 44px (`h-11` controls, `min-h-11` nav).
- Every list: skeleton while loading + designed `EmptyState` when empty.
- Every error surfaces via `useToast()` — never an inline bare string, never a
  blank screen.
- Destructive actions go through `ConfirmDialog`.

## Components (`components/ui`)

Button (primary/secondary/ghost/danger · sm/md/lg · loading) · **ThemeToggle** ·
Input / Textarea / Select · Field + Label (+hint/error) · Card · Badge +
**StatusPill** (single status→tone map for lead/campaign/job states — never
restyle locally) · Tabs · Modal + ConfirmDialog · Drawer (native `<dialog>`:
focus trap, Esc, scroll-lock for free) · Toast (`useToast`) · Tooltip · Skeleton
(text/card/row) · EmptyState · **Table** (collapses to definition cards below
`md`) · Stat · ProgressMeter (warns at 80%, alerts at 100%) · PageHeader.

App chrome: `components/AppShell.tsx` — sidebar ≥1024px, top-bar + slide-over
drawer below; includes plan/quota chip and account row.

## Marketing polish

- `.hero-backdrop` — layered aurora (mint + cyan wash over a faint dot grid) in
  dark; warm teal wash + dot grid in light.
- `.eyebrow` — mono, uppercase, accent-colored label above section headings.
- `.text-gradient-accent` — the single gradient phrase per page.
- `.card-hover` — lift + mint glow on interactive marketing cards.

## The signature element

Marketing and product share one motif: a real-shaped lead record flowing into a
**mono-typeset drafted email** (JetBrains Mono, hairline border, plain-text
letter look). The morphing five-vertical hero is built on it; Lead Studio
previews reuse it.

## Breakpoint QA matrix

360 · 390 · 768 · 1024 · 1280 · 1536 — every page, both themes, before it counts
as done (Appendix D). Tables must be cards below 768. No horizontal scroll ever.
