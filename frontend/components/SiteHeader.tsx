import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

export function SiteHeader({ signupVertical }: { signupVertical?: string }) {
  const signupHref = signupVertical ? `/signup?vertical=${signupVertical}` : "/signup";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className="hidden rounded-control px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline-flex">
            Pricing
          </Link>
          <Link href="/login" className="rounded-control px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
            Log in
          </Link>
          <Link href={signupHref} className={buttonClasses({ size: "sm" })}>
            Start free
          </Link>
        </nav>
      </Container>
    </header>
  );
}
