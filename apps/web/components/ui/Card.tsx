import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-card border border-line bg-surface", className)} {...props}>
      {children}
    </div>
  );
}
