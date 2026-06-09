import type { ReactNode } from "react";

import { cn } from "./cn";

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}
