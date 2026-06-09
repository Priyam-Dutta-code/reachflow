import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Log in", href: "/login" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Acceptable use", href: "/acceptable-use" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <Container className="flex flex-col gap-10 py-12 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            One calm workspace to discover leads, draft vertical-aware emails, and run focused outreach.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">{column.heading}</div>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ReachFlow. All rights reserved.</span>
          <span>Built for focused, compliant outbound.</span>
        </Container>
      </div>
    </footer>
  );
}
