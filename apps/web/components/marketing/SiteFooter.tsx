import Link from "next/link";

import { SLUG_BY_VERTICAL } from "@/lib/marketing";
import { VERTICAL_LIST } from "@/lib/verticals";

const PRODUCT_LINKS = [
  { label: "Live demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Log in", href: "/login" },
  { label: "Start free", href: "/signup" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Acceptable use", href: "/acceptable-use" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-control bg-accent font-display text-sm font-bold text-bg">
              R
            </span>
            <span className="font-display text-lg font-semibold text-ink">ReachFlow</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Find the right inboxes. Send emails that get answered.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Product</h3>
          <ul className="mt-4 space-y-2.5">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-soft transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Workflows</h3>
          <ul className="mt-4 space-y-2.5">
            {VERTICAL_LIST.map((vertical) => (
              <li key={vertical.id}>
                <Link
                  href={`/for/${SLUG_BY_VERTICAL[vertical.id]}`}
                  className="text-sm text-ink-soft transition-colors hover:text-ink"
                >
                  For {vertical.label.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Legal & contact</h3>
          <ul className="mt-4 space-y-2.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-soft transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="mailto:hello@reachflow.app"
                className="text-sm text-ink-soft transition-colors hover:text-ink"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} ReachFlow. All rights reserved.</span>
          <span>Built for focused, compliant outbound.</span>
        </div>
      </div>
    </footer>
  );
}
