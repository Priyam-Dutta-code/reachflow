import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}
